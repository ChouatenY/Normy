/**
 * Users table
 *
 * Platform users who own projects and manage API keys.
 * Authentication is intentionally kept minimal in v1 — email + hashed password.
 * OAuth / SSO providers are a Phase N concern.
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    // ── Identity ───────────────────────────────────────────────────────────────
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    email: text('email').notNull(),

    name: text('name').notNull(),

    /** bcrypt hash — NEVER store raw passwords */
    passwordHash: text('password_hash').notNull(),

    // ── State ──────────────────────────────────────────────────────────────────
    emailVerified: boolean('email_verified').notNull().default(false),

    /** URL to avatar image. May be external (gravatar, etc.) */
    avatarUrl: text('avatar_url'),

    /** ISO 639-1 language code. Drives AI feedback language in future. */
    locale: text('locale').notNull().default('en'),

    /** Soft-delete — sets this timestamp instead of hard-deleting rows */
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
    // Fast login lookup
    uniqueIndex('users_email_unique_idx').on(table.email),
    // Soft-delete queries
    index('users_deleted_at_idx').on(table.deletedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
