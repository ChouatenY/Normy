/**
 * API Keys table
 *
 * Project-scoped authentication credentials.
 * Design principles:
 *   - Raw key is shown ONCE on creation, then discarded — we store only the hash
 *   - Key prefix (first 8 chars, e.g. "nrm_live_") shown in dashboard for identification
 *   - Keys are environment-scoped (development vs. production)
 *   - Keys can be revoked without deleting the row (audit trail preserved)
 *   - Rate limits are enforced at the Redis layer, not here
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';
import { keyEnvironmentEnum } from './enums';

export const apiKeys = pgTable(
  'api_keys',
  {
    // ── Identity ───────────────────────────────────────────────────────────────
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    /** Human-readable label, e.g. "Production frontend" */
    name: text('name').notNull(),

    // ── Key Material ───────────────────────────────────────────────────────────

    /**
     * SHA-256 hash of the full API key.
     * Used for constant-time lookup.  Never log this value.
     */
    keyHash: text('key_hash').notNull(),

    /**
     * Display-safe prefix shown in the dashboard.
     * Format: "nrm_live_Ab3dEf12" (first 16 chars of the key).
     * Not a secret — safe to store and display.
     */
    keyPrefix: text('key_prefix').notNull(),

    // ── Scoping ────────────────────────────────────────────────────────────────
    environment: keyEnvironmentEnum('environment')
      .notNull()
      .default('development'),

    // ── Rate Limiting (stored here for reference; enforced in Redis) ───────────

    /** Requests per minute allowed for this key. null = project default */
    rateLimit: integer('rate_limit').default(60),

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    /** Null = no expiry. When set, the key is rejected after this time. */
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    /**
     * Set when the key is revoked.  Revoked keys are rejected immediately.
     * Row is NOT deleted — the audit trail of historical requests is preserved.
     */
    revokedAt: timestamp('revoked_at', { withTimezone: true }),

    /** Reason recorded when revoking (optional, for audit log) */
    revokeReason: text('revoke_reason'),

    /** Updated on every successful request (rate-limited update in prod) */
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),

    /** Running total of all-time requests made with this key */
    totalRequestCount: integer('total_request_count').notNull().default(0),

    // ── Timestamps ─────────────────────────────────────────────────────────────
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Primary auth lookup — this is the hot path, must be O(1)
    uniqueIndex('api_keys_hash_unique_idx').on(table.keyHash),
    // Dashboard: list keys by project
    index('api_keys_project_id_idx').on(table.projectId),
    // Filter active (non-revoked) keys
    index('api_keys_revoked_at_idx').on(table.revokedAt),
    // Expiry checks
    index('api_keys_expires_at_idx').on(table.expiresAt),
  ],
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
