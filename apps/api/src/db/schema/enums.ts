/**
 * @normy/api — Database Enums
 *
 * All Postgres-native enums used across the schema.
 * Source of truth: these values must stay in sync with
 * `@normy/validation-core` domain types.
 *
 * Rule: Never use raw strings in schema columns — always reference these enums.
 */

import { pgEnum } from 'drizzle-orm/pg-core';

// ─── Validation Issue Taxonomy ────────────────────────────────────────────────

/**
 * Fixed taxonomy of issues Normy can detect.
 * Expanding this enum requires a database migration.
 */
export const validationIssueEnum = pgEnum('validation_issue', [
  'RANDOM_TEXT',          // "asdfgh", "djdjdj", keyboard mashing
  'TOO_SHORT',            // "no", "ok", "idk"
  'EMPTY',                // Whitespace-only or empty string
  'IRRELEVANT_RESPONSE',  // "Why are you cancelling?" → "I like football"
  'CONTRADICTORY_RESPONSE', // "No experience but worked 10 years"
  'SPAM',                 // Repetitive, copy-pasted, or garbage
  'LOW_QUALITY',          // Catch-all for poor but not otherwise categorised
  'VALID',                // No issue — answer meets quality threshold
]);

export type ValidationIssue = (typeof validationIssueEnum.enumValues)[number];

// ─── Severity ─────────────────────────────────────────────────────────────────

export const severityEnum = pgEnum('severity', [
  'success',  // score 80–100
  'info',     // score 50–79
  'warning',  // score 30–49
  'error',    // score 0–29
]);

export type Severity = (typeof severityEnum.enumValues)[number];

// ─── AI Provider ──────────────────────────────────────────────────────────────

export const aiProviderEnum = pgEnum('ai_provider', [
  'openai',
  'gemini',
  'anthropic',
  'local',   // Local validators only — no AI call made (short-circuit)
]);

export type AIProvider = (typeof aiProviderEnum.enumValues)[number];

// ─── API Key Environment ──────────────────────────────────────────────────────

export const keyEnvironmentEnum = pgEnum('key_environment', [
  'development',
  'production',
]);

export type KeyEnvironment = (typeof keyEnvironmentEnum.enumValues)[number];

// ─── Validation Event Type ────────────────────────────────────────────────────

export const validationEventTypeEnum = pgEnum('validation_event_type', [
  'validation_triggered',   // SDK sent a validate request
  'validation_completed',   // Validation pipeline finished
  'feedback_shown',         // Toast appeared on screen
  'feedback_dismissed',     // User closed the toast manually
  'field_focused',          // User focused the field
  'field_blurred',          // User blurred the field
  'form_submitted',         // The parent form was submitted
  'form_submit_blocked',    // Normy blocked submission (valid: false)
]);

export type ValidationEventType = (typeof validationEventTypeEnum.enumValues)[number];

// ─── Project Plan (for future SaaS tier) ─────────────────────────────────────

export const projectPlanEnum = pgEnum('project_plan', [
  'free',
  'pro',
  'enterprise',
]);

export type ProjectPlan = (typeof projectPlanEnum.enumValues)[number];

// ─── Validation Pipeline Stage ────────────────────────────────────────────────

export const pipelineStageEnum = pgEnum('pipeline_stage', [
  'local_validator',   // Short-circuited by a local check
  'ai_provider',       // Reached the AI provider
]);

export type PipelineStage = (typeof pipelineStageEnum.enumValues)[number];
