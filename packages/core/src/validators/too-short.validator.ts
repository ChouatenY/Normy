import { BaseValidator } from './base.js';
import type { ValidationRequest, ValidationResult, ValidationIssue } from '../types/index.js';

export class TooShortValidator extends BaseValidator {
  readonly id = 'too-short-validator';
  readonly description = 'Checks if the user input length is extremely short (less than 4 characters).';
  readonly issueType: ValidationIssue = 'TOO_SHORT';

  async check(request: ValidationRequest): Promise<Partial<ValidationResult> | null> {
    const trimmed = request.answer.trim();
    if (trimmed.length > 0 && trimmed.length < 4) {
      // Deterministic score based on length
      const score = trimmed.length * 10;
      return this.createFailure(
        score,
        'Your response is too short. Please provide a bit more detail to explain your answer.',
        {
          confidence: 1.0,
        }
      );
    }
    return null;
  }
}
