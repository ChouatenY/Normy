import type { ValidationSeverity, ScoringConfig, ValidationResult, ValidationIssue, AIProviderName } from '../types/index.js';
import { DEFAULT_SCORING_CONFIG } from '../types/index.js';

export class ScoringEngine {
  private config: ScoringConfig;

  constructor(config: ScoringConfig = DEFAULT_SCORING_CONFIG) {
    this.config = config;
  }

  /**
   * Evaluates a score and maps it to a severity level.
   */
  public determineSeverity(score: number): ValidationSeverity {
    if (score < this.config.errorThreshold) {
      return 'error';
    }
    if (score < this.config.warningThreshold) {
      return 'warning';
    }
    // High quality scores are either success or info
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
   * Finalizes a validation output by calculating severity, validity status, and timestamp.
   */
  public finalizeResult(params: {
    score: number;
    issue: ValidationIssue;
    feedback: string;
    provider: AIProviderName;
    latencyMs: number;
    minScore?: number;
    confidence?: number;
  }): ValidationResult {
    const valid = this.isValid(params.score, params.minScore);
    const severity = this.determineSeverity(params.score);
    const confidence = params.confidence !== undefined ? params.confidence : 1.0;

    return {
      valid,
      score: params.score,
      issue: params.issue,
      feedback: params.feedback,
      severity,
      validatedAt: new Date().toISOString(),
      provider: params.provider,
      latencyMs: params.latencyMs,
      confidence,
    };
  }
}
