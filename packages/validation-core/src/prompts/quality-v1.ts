import { BasePrompt } from './base.js';
import type { ValidationRequest } from '@normy-validation/core';

export class QualityV1Prompt extends BasePrompt {
  readonly id = 'quality-v1';
  readonly version = '1.0.0';

  getInstructions(_request: ValidationRequest): string {
    return `Evaluate the quality, detail level, and relevance of the answer.
If the answer is too generic or short (e.g. one word like "yes" or "ok" when detail is expected), mark it as LOW_QUALITY.
Provide a natural and constructive suggestion pointing out what specific details would make the answer better.`;
  }
}
