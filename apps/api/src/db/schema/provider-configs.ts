/**
 * Provider Configurations table
 *
 * Per-project AI provider overrides. Projects can use their own API keys
 * and model preferences instead of the platform defaults.
 *
 * Security: apiKeyEncrypted uses AES-256-GCM encryption at the application
 * layer (key from API_SECRET). Never stored in plaintext.
 *
 * Only one configuration row per (projectId, provider) pair is allowed —
 * enforced by unique index. The `isDefault` flag marks which provider the
 * project uses when none is explicitly specified in the SDK request.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';
import { aiProviderEnum } from './enums';

export const providerConfigs = pgTable(
  'provider_configs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    provider: aiProviderEnum('provider').notNull(),

    /**
     * Model identifier string as accepted by the provider.
     * Examples: "gpt-4o", "gpt-4o-mini", "gemini-1.5-pro", "claude-3-5-sonnet-20241022"
     * NULL = use the platform default model for this provider.
     */
    model: text('model'),

    /**
     * AES-256-GCM encrypted API key — format: `iv:authTag:ciphertext` (base64).
     * NULL = use the platform-level key from environment variables.
     */
    apiKeyEncrypted: text('api_key_encrypted'),

    /** Whether this provider is the default for this project */
    isDefault: boolean('is_default').notNull().default(false),

    // ── Model Parameters ────────────────────────────────────────────────────────

    /** Sampling temperature (0.0–2.0). Lower = more deterministic. Default: 0.2 */
    temperature: numeric('temperature', { precision: 3, scale: 2 })
      .default('0.20'),

    /** Max output tokens for the AI response. Default: 512 */
    maxTokens: integer('max_tokens').default(512),

    /** Per-request timeout in milliseconds. Default: 10 000 */
    timeoutMs: integer('timeout_ms').notNull().default(10000),

    /** Max retry attempts on transient failures (429, 5xx). Default: 2 */
    maxRetries: integer('max_retries').notNull().default(2),

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // One config row per (project, provider) pair
    uniqueIndex('provider_configs_project_provider_unique_idx').on(
      table.projectId,
      table.provider,
    ),
    index('provider_configs_project_id_idx').on(table.projectId),
    index('provider_configs_is_default_idx').on(table.isDefault),

    // Temperature must be a valid range
    check(
      'provider_configs_temperature_range',
      sql`${table.temperature} IS NULL OR (${table.temperature} >= 0 AND ${table.temperature} <= 2)`,
    ),
    check(
      'provider_configs_timeout_positive',
      sql`${table.timeoutMs} > 0`,
    ),
    check(
      'provider_configs_retries_range',
      sql`${table.maxRetries} >= 0 AND ${table.maxRetries} <= 10`,
    ),
  ],
);

export type ProviderConfig = typeof providerConfigs.$inferSelect;
export type NewProviderConfig = typeof providerConfigs.$inferInsert;
