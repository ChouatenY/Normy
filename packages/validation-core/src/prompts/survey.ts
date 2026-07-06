import { BasePrompt } from './base.js';
import type { ValidationRequest } from '@normy-validation/core';

export class SurveyPrompt extends BasePrompt {
  readonly id = 'survey';
  readonly version = '1.0.0';

  getInstructions(_request: ValidationRequest): string {
    return `Evaluate general survey answers.
The response should directly address the question without generic filler. Encouraging helpful and direct descriptions.
If the survey answer is too short or lazy, request they provide specific examples or elaborate slightly.`;
  }
}
