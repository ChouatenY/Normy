/**
 * Validations table
 *
 * The core immutable event log — every POST /validate call produces exactly one row.
 *
 * Design principles:
 *   - Rows are append-only. Never UPDATE or DELETE a validation record.
 *   - `question` and `answer` storage is governed by `project.settings.storeInputText`
 *     When false, both columns are set to NULL before insert (privacy mode).
 *   - Score and issue come from the pipeline result — they are FINAL.
 *   - `pipelineStage` distinguishes cheap local short-circuits from full AI calls.
 *   - Partitioning by `created_at` (monthly) is recommended for tables > 50M rows.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  check,
  real,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';
import { apiKeys } from './api-keys';
import {
  validationIssueEnum,
  severityEnum,
  aiProviderEnum,
  pipelineStageEnum,
} from './enums';

/** Arbitrary key-value metadata the SDK can attach to a validation request */
export interface ValidationMetadata {
  formId?: string;
  fieldName?: string;
  fieldType?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export const validations = pgTable(
  'validations',
  {
    // ── Identity ───────────────────────────────────────────────────────────────
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // ── Foreign Keys ───────────────────────────────────────────────────────────
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    /**
     * Which API key was used for this request.
     * Nullable because a project can delete a key while validations remain.
     */
    apiKeyId: uuid('api_key_id').references(() => apiKeys.id, {
      onDelete: 'set null',
    }),

    // ── Input (privacy-aware) ─────────────────────────────────────────────────

    /**
     * The form question/label as sent by the SDK.
     * NULL if project.settings.storeInputText = false.
     */
    question: text('question'),

    /**
     * The raw user-supplied answer.
     * NULL if project.settings.storeInputText = false.
     */
    answer: text('answer'),

    /** Optional field context provided by the SDK (e.g. "cancellation form") */
    fieldContext: text('field_context'),

    // ── Pipeline Result ────────────────────────────────────────────────────────

    /** The detected issue category from the fixed taxonomy */
    issue: validationIssueEnum('issue').notNull(),

    /**
     * Quality score 0–100.
     * Enforced by CHECK constraint — never outside this range.
     */
    score: integer('score').notNull(),

    /** Human-readable, AI-generated guidance for the user */
    feedback: text('feedback').notNull(),

    /** Computed from score using the scoring engine thresholds */
    severity: severityEnum('severity').notNull(),

    /** Whether the answer met the project's minScore threshold */
    valid: boolean('valid').notNull(),

    // ── Pipeline Metadata ─────────────────────────────────────────────────────

    /**
     * Where in the pipeline the final result was produced.
     * "local_validator" = short-circuited (cheap, no AI cost)
     * "ai_provider"     = reached the AI model
     */
    pipelineStage: pipelineStageEnum('pipeline_stage').notNull(),

    /** Which validator or provider produced this result */
    resolvedBy: text('resolved_by').notNull(),

    /** Which AI provider was called (null if local_validator short-circuit) */
    provider: aiProviderEnum('provider'),

    /** Specific model used (e.g. "gpt-4o", "gemini-1.5-pro") */
    model: text('model'),

    /** Total time from request receipt to response, in milliseconds */
    latencyMs: integer('latency_ms').notNull(),

    /** AI tokens consumed (input + output). NULL for local short-circuits. */
    tokenCount: integer('token_count'),

    /** Confidence score of the validation (0-1) */
    confidence: real('confidence').notNull().default(1.0),

    // ── Request Context ────────────────────────────────────────────────────────

    /** Hashed IP address (SHA-256, one-way) for rate-limit analytics */
    ipAddressHash: text('ip_address_hash'),

    /** Stripped User-Agent string (browser/SDK only, no personal data) */
    userAgent: text('user_agent'),

    /**
     * Arbitrary metadata from the SDK.
     * Useful for correlating with the consumer's own analytics (formId, fieldName, etc.)
     */
    metadata: jsonb('metadata').$type<ValidationMetadata>(),

    promptVersion: text('prompt_version').notNull().default('quality-v1'),
    scoreBefore: integer('score_before'),
    scoreAfter: integer('score_after'),
    improvementDelta: integer('improvement_delta'),

    // ── Timestamps ─────────────────────────────────────────────────────────────
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // ── Query indexes ──────────────────────────────────────────────────────────
    // Dashboard: list validations for a project, newest first
    index('validations_project_created_idx').on(
      table.projectId,
      table.createdAt,
    ),
    // Analytics: filter by issue type within a project
    index('validations_project_issue_idx').on(table.projectId, table.issue),
    // Analytics: filter by validity within a project
    index('validations_project_valid_idx').on(table.projectId, table.valid),
    // Analytics: filter by provider
    index('validations_project_provider_idx').on(
      table.projectId,
      table.provider,
    ),
    // API key attribution
    index('validations_api_key_id_idx').on(table.apiKeyId),
    // Time-range queries (for analytics aggregation jobs)
    index('validations_created_at_idx').on(table.createdAt),

    // ── Constraints ────────────────────────────────────────────────────────────
    check('validations_score_range', sql`${table.score} BETWEEN 0 AND 100`),
    check(
      'validations_latency_positive',
      sql`${table.latencyMs} >= 0`,
    ),
    check(
      'validations_token_count_positive',
      sql`${table.tokenCount} IS NULL OR ${table.tokenCount} >= 0`,
    ),
    check(
      'validations_confidence_range',
      sql`${table.confidence} BETWEEN 0 AND 1`
    ),
  ],
);

export type Validation = typeof validations.$inferSelect;
export type NewValidation = typeof validations.$inferInsert;
