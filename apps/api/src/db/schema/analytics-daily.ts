/**
 * Analytics Daily table
 *
 * Pre-aggregated daily rollup per project. Written by a background cron job
 * that processes the raw `validations` table once per day.
 *
 * Design rationale: Dashboard queries hit THIS table, not the raw validations
 * table. This keeps dashboard response times sub-100ms regardless of raw
 * validation volume. The raw table is the source of truth for recomputation.
 *
 * UNIQUE constraint on (project_id, date) — the cron job does an UPSERT.
 */

import {
  pgTable,
  uuid,
  date,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects.js';

/** Issue breakdown stored inside JSONB — keyed by ValidationIssue enum value */
export interface IssueBreakdown {
  RANDOM_TEXT: number;
  TOO_SHORT: number;
  EMPTY: number;
  IRRELEVANT_RESPONSE: number;
  CONTRADICTORY_RESPONSE: number;
  SPAM: number;
  LOW_QUALITY: number;
  VALID: number;
}

/** Provider breakdown — keyed by AI provider name */
export interface ProviderBreakdown {
  openai: number;
  gemini: number;
  anthropic: number;
  local: number;
}

/** Top fields by validation volume — for field-level analytics */
export interface TopField {
  fieldName: string;
  validationCount: number;
  avgScore: number;
  invalidRate: number;
}

export const analyticsDaily = pgTable(
  'analytics_daily',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    /** Calendar date this row covers (UTC) */
    date: date('date').notNull(),

    // ── Volume ─────────────────────────────────────────────────────────────────
    totalValidations: integer('total_validations').notNull().default(0),
    validCount: integer('valid_count').notNull().default(0),
    invalidCount: integer('invalid_count').notNull().default(0),

    /** Short-circuit count — validations resolved by local validators (no AI cost) */
    localShortCircuitCount: integer('local_short_circuit_count')
      .notNull()
      .default(0),

    // ── Quality ────────────────────────────────────────────────────────────────
    /** Average quality score across all validations that day */
    avgScore: numeric('avg_score', { precision: 5, scale: 2 }),

    /** Median quality score (p50) */
    p50Score: numeric('p50_score', { precision: 5, scale: 2 }),

    // ── Latency ────────────────────────────────────────────────────────────────
    avgLatencyMs: integer('avg_latency_ms'),
    p50LatencyMs: integer('p50_latency_ms'),
    p95LatencyMs: integer('p95_latency_ms'),

    // ── Tokens ────────────────────────────────────────────────────────────────
    totalTokensConsumed: integer('total_tokens_consumed').notNull().default(0),

    // ── Breakdowns (JSONB for flexible querying without schema changes) ────────
    issueBreakdown: jsonb('issue_breakdown')
      .$type<IssueBreakdown>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    providerBreakdown: jsonb('provider_breakdown')
      .$type<ProviderBreakdown>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    /** Top 10 fields by validation volume */
    topFields: jsonb('top_fields')
      .$type<TopField[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // ── Toast Analytics ────────────────────────────────────────────────────────
    toastShownCount: integer('toast_shown_count').notNull().default(0),
    toastDismissedByUserCount: integer('toast_dismissed_by_user_count')
      .notNull()
      .default(0),
    toastAutoDismissedCount: integer('toast_auto_dismissed_count')
      .notNull()
      .default(0),
    formSubmitBlockedCount: integer('form_submit_blocked_count')
      .notNull()
      .default(0),

    // ── Timestamps ─────────────────────────────────────────────────────────────
    /** When this rollup row was last computed by the cron job */
    computedAt: timestamp('computed_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Guarantees only one row per project per day — cron does UPSERT on conflict
    uniqueIndex('analytics_daily_project_date_unique_idx').on(
      table.projectId,
      table.date,
    ),
    // Dashboard: fetch last N days for a project
    index('analytics_daily_project_date_idx').on(table.projectId, table.date),
    // Cross-project aggregations (admin / platform analytics)
    index('analytics_daily_date_idx').on(table.date),

    // Sanity constraints
    check(
      'analytics_daily_valid_lte_total',
      sql`${table.validCount} <= ${table.totalValidations}`,
    ),
    check(
      'analytics_daily_invalid_lte_total',
      sql`${table.invalidCount} <= ${table.totalValidations}`,
    ),
  ],
);

export type AnalyticsDaily = typeof analyticsDaily.$inferSelect;
export type NewAnalyticsDaily = typeof analyticsDaily.$inferInsert;
