import type { Validator, ValidationRequest, ValidationResult, ValidationIssue } from '../types/index.js';

export abstract class BaseValidator implements Validator {
  abstract readonly id: string;
  abstract readonly description: string;
  abstract readonly issueType: ValidationIssue;

  /**
   * Performs the validation check.
   * Returns a Partial<ValidationResult> representing the issue if found,
   * or null if the request passes this validation check.
   */
  abstract check(request: ValidationRequest): Promise<Partial<ValidationResult> | null>;

  /**
   * Helper to construct a standard failure result payload from this validator.
   */
  protected createFailure(
    score: number,
    feedback: string,
    extra: Partial<ValidationResult> = {}
  ): Partial<ValidationResult> {
    return {
      valid: false,
      score,
      issue: this.issueType,
      feedback,
      provider: 'local',
      ...extra,
    };
  }
}
