import type { ValidationSeverity, ScoringConfig, ValidationResult, ValidationIssue, AIProviderName } from '@normy-validation/core';
import { DEFAULT_SCORING_CONFIG, ISSUE_TO_CATEGORY } from '@normy-validation/core';

export class ScoringEngine {
  private config: ScoringConfig;

  constructor(config: ScoringConfig = DEFAULT_SCORING_CONFIG) {
    this.config = config;
  }

  /**
   * Evaluates a score and maps it to a severity level.
   *
   * Bands (default config):
   *   score  0–29  → error
   *   score 30–49  → warning
   *   score 50–79  → info
   *   score 80–100 → success
   */
  public determineSeverity(score: number): ValidationSeverity {
    if (score < this.config.errorThreshold) {
      return 'error';
    }
    if (score < this.config.warningThreshold) {
      return 'warning';
    }
    if (score >= this.config.passThreshold) {
      return 'success';
    }
    return 'info';
  }

  /**
   * Determines if a score is valid based on the passing threshold.
   */
  public isValid(score: number, minScore?: number): boolean {
    const threshold = minScore !== undefined ? minScore : this.config.passThreshold;
    return score >= threshold;
  }

  /**
   * Finalizes a validation output by calculating severity, validity status,
   * feedbackCategory, and timestamp.
   */
  public finalizeResult(params: {
    score: number;
    issue: ValidationIssue;
    feedback: string;
    provider: AIProviderName;
    latencyMs: number;
    minScore?: number;
    confidence?: number;
    tokenUsage?: {
      readonly inputTokens: number;
      readonly outputTokens: number;
    };
    exampleAnswer?: string | null;
  }): ValidationResult {
    const valid = this.isValid(params.score, params.minScore);
    const severity = this.determineSeverity(params.score);
    const confidence = params.confidence !== undefined ? params.confidence : 1.0;
    const feedbackCategory = ISSUE_TO_CATEGORY[params.issue];

    const result: ValidationResult = {
      valid,
      score: params.score,
      issue: params.issue,
      feedback: params.feedback,
      severity,
      feedbackCategory,
      validatedAt: new Date().toISOString(),
      provider: params.provider,
      latencyMs: params.latencyMs,
      confidence,
      exampleAnswer: params.exampleAnswer ?? null,
      ...(params.tokenUsage ? {
        tokenUsage: {
          inputTokens: params.tokenUsage.inputTokens,
          outputTokens: params.tokenUsage.outputTokens
        }
      } : {}),
    };

    return result;
  }
}

