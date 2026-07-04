/**
 * Projects table
 *
 * A project is the top-level billing and configuration unit.
 * Each project gets its own API keys, validation settings, and analytics namespace.
 * One user can own many projects (multi-project support from day one).
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';
import { aiProviderEnum, projectPlanEnum } from './enums.js';

// ─── Project Settings JSONB structure ─────────────────────────────────────────
// Stored as jsonb for flexibility — avoids a separate project_settings table.
// TypeScript enforces the shape on read/write via ProjectSettings type.

export interface ProjectSettings {
  /** Default minimum quality score (0–100). Overridable per-field in SDK. */
  minScore: number;
  /** Which AI provider to use by default for this project */
  defaultProvider: 'openai' | 'gemini' | 'anthropic';
  /** Default validation mode for SDK components */
  defaultValidationMode: 'onBlur' | 'onPause' | 'onSubmit';
  /** Milliseconds of inactivity before onPause triggers. Default: 2000 */
  pauseDelayMs: number;
  /** Whether to store raw question/answer text in validations table */
  storeInputText: boolean;
  /** Whether to enable the Normy Shield behavioral scoring (future) */
  shieldEnabled: boolean;
  /** Webhook URL to receive validation events (optional) */
  webhookUrl?: string;
  /** Webhook secret for HMAC verification */
  webhookSecret?: string;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  minScore: 50,
  defaultProvider: 'gemini',
  defaultValidationMode: 'onPause',
  pauseDelayMs: 2000,
  storeInputText: true,
  shieldEnabled: false,
};

export const projects = pgTable(
  'projects',
  {
    // ── Identity ───────────────────────────────────────────────────────────────
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    /** Human-readable project name */
    name: text('name').notNull(),

    /**
     * URL-safe slug, unique per user.
     * Used in API paths and dashboard URLs.
     * Format: lowercase, hyphens only, no spaces.
     */
    slug: text('slug').notNull(),

    description: text('description'),

    // ── Ownership ──────────────────────────────────────────────────────────────
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // ── Plan & Limits ──────────────────────────────────────────────────────────
    plan: projectPlanEnum('plan').notNull().default('free'),

    /** Maximum validations per calendar month. null = unlimited */
    monthlyValidationLimit: integer('monthly_validation_limit').default(1000),

    /** Validations consumed in the current month (reset monthly by cron) */
    monthlyValidationCount: integer('monthly_validation_count')
      .notNull()
      .default(0),

    // ── AI Configuration ───────────────────────────────────────────────────────
    defaultProvider: aiProviderEnum('default_provider')
      .notNull()
      .default('gemini'),

    // Bring Your Own Key (BYOK)
    geminiApiKey: text('gemini_api_key'),
    openaiApiKey: text('openai_api_key'),
    anthropicApiKey: text('anthropic_api_key'),

    // ── Billing & Credits (Normy Hosted AI) ────────────────────────────────────
    /** Test/Sandbox credits (in USD). Starts at $5.00 for free dev testing */
    testCreditsBalance: numeric('test_credits_balance', { precision: 10, scale: 4 })
      .notNull()
      .default('5.0000'),

    /** Live production credits (in USD) */
    liveCreditsBalance: numeric('live_credits_balance', { precision: 10, scale: 4 })
      .notNull()
      .default('0.0000'),

    // ── Settings (flexible JSONB) ──────────────────────────────────────────────
    settings: jsonb('settings')
      .$type<ProjectSettings>()
      .notNull()
      .default(DEFAULT_PROJECT_SETTINGS),

    // ── State ──────────────────────────────────────────────────────────────────
    isActive: boolean('is_active').notNull().default(true),

    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    // ── Timestamps ─────────────────────────────────────────────────────────────
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Slug must be unique per user (two users can have a project named "my-app")
    uniqueIndex('projects_user_slug_unique_idx').on(table.userId, table.slug),
    // Fast user → projects list query
    index('projects_user_id_idx').on(table.userId),
    // Active projects filter
    index('projects_is_active_idx').on(table.isActive),
    // Soft-delete
    index('projects_deleted_at_idx').on(table.deletedAt),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
