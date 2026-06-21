import { BaseValidator } from './base.js';
import type { ValidationRequest, ValidationResult, ValidationIssue } from '../types/index.js';

export class EmptyValidator extends BaseValidator {
  readonly id = 'empty-validator';
  readonly description = 'Checks if the user input is empty or contains only whitespace.';
  readonly issueType: ValidationIssue = 'EMPTY';

  async check(request: ValidationRequest): Promise<Partial<ValidationResult> | null> {
    const trimmed = request.answer.trim();
    if (trimmed === '') {
      return this.createFailure(0, 'Your response cannot be empty. Please write a reply.', {
        confidence: 1.0,
      });
    }
    return null;
  }
}
