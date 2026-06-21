import type { z } from 'zod';

// ─── Validation Issue Categories ─────────────────────────────────────────────

/**
 * The canonical set of issue types Normy can detect.
 * Extending this enum is the ONLY way to add a new category — do not use
 * raw strings elsewhere in the codebase.
 */
export type ValidationIssue =
  | 'RANDOM_TEXT'
  | 'TOO_SHORT'
  | 'EMPTY'
  | 'IRRELEVANT_RESPONSE'
  | 'CONTRADICTORY_RESPONSE'
  | 'SPAM'
  | 'LOW_QUALITY'
  | 'VALID';

// ─── Severity Levels ─────────────────────────────────────────────────────────

export type ValidationSeverity = 'info' | 'warning' | 'error' | 'success';

// ─── Validation Modes ────────────────────────────────────────────────────────

export type ValidationMode = 'onBlur' | 'onPause' | 'onSubmit';

// ─── AI Provider Names ────────────────────────────────────────────────────────

export type AIProviderName = 'openai' | 'gemini' | 'anthropic' | 'local';

// ─── Core Validation Request / Response ──────────────────────────────────────

export interface ValidationRequest {
  /** The form question or label shown to the user. */
  readonly question: string;
  /** The raw user-supplied answer to validate. */
  readonly answer: string;
  /** Optional context about the field (e.g. "cancellation reason field"). */
  readonly fieldContext?: string;
  /** Minimum acceptable quality score (0–100). Defaults to 50. */
  readonly minScore?: number;
}

export interface ValidationResult {
  /** Whether the answer meets the quality threshold. */
  readonly valid: boolean;
  /** Quality score in the range 0–100. */
  readonly score: number;
  /** The primary detected issue (or "none" if valid). */
  readonly issue: ValidationIssue;
  /**
   * Human-readable, AI-generated feedback to guide the user toward a better
   * response. Should always be constructive, never dismissive.
   */
  readonly feedback: string;
  /** Computed severity level derived from score and issue. */
  readonly severity: ValidationSeverity;
  /** ISO timestamp when this result was produced. */
  readonly validatedAt: string;
  /** Which AI provider produced this result. */
  readonly provider: AIProviderName;
  /** Duration of the AI call in milliseconds. */
  readonly latencyMs: number;
  /** Confidence score of the validation (0-1). */
  readonly confidence: number;
}

// ─── AI Provider Interface ────────────────────────────────────────────────────

/**
 * Every AI provider adapter MUST implement this interface.
 * The validation engine calls only this contract — it never talks to provider
 * SDKs directly.
 */
export interface AIProvider {
  readonly name: AIProviderName;
  validate(request: ValidationRequest): Promise<ValidationResult>;
}

// ─── Provider Configuration ───────────────────────────────────────────────────

export interface ProviderConfig {
  readonly provider: AIProviderName;
  readonly apiKey: string;
  /** Model override. When omitted the adapter uses its sensible default. */
  readonly model?: string;
  /** Per-request timeout in milliseconds. Defaults to 10 000. */
  readonly timeoutMs?: number;
  /** Maximum retries on transient failure. Defaults to 2. */
  readonly maxRetries?: number;
}

// ─── Scoring Configuration ────────────────────────────────────────────────────

export interface ScoringConfig {
  /** Score at or above which a response is considered valid. Defaults to 50. */
  readonly passThreshold: number;
  /** Score below which a response triggers an error-severity toast. */
  readonly errorThreshold: number;
  /** Score between errorThreshold and passThreshold triggers warning. */
  readonly warningThreshold: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  passThreshold: 50,
  errorThreshold: 30,
  warningThreshold: 50,
} as const;

// ─── Prompt Template ──────────────────────────────────────────────────────────

export interface PromptTemplate {
  readonly id: string;
  readonly version: string;
  build(request: ValidationRequest): string;
}

// ─── Validator Interface ──────────────────────────────────────────────────────

/**
 * A Validator is a single, focused check (e.g. random-text detector).
 * Multiple validators are composed into a Pipeline.
 */
export interface Validator {
  readonly id: string;
  readonly description: string;
  /**
   * Returns an early ValidationResult if this validator detects a problem,
   * or null to pass control to the next validator in the pipeline.
   */
  check(request: ValidationRequest): Promise<Partial<ValidationResult> | null>;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export interface ValidationPipeline {
  readonly id: string;
  /** Ordered list of validators to run before hitting the AI provider. */
  readonly validators: ReadonlyArray<Validator>;
  /** The AI provider to fall back to after all local validators pass. */
  readonly provider: AIProvider;
  run(request: ValidationRequest): Promise<ValidationResult>;
}

// ─── Zod schema exports ───────────────────────────────────────────────────────

export type { z };
