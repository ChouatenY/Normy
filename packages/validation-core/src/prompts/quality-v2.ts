import { BasePrompt } from './base.js';
import type { ValidationRequest } from '../types/index.js';

export class QualityV2Prompt extends BasePrompt {
  readonly id = 'quality-v2';
  readonly version = '2.0.0';

  getInstructions(_request: ValidationRequest): string {
    return `Evaluate the quality of the answer with stricter guidelines.
Check if the answer is logical, matches typical sentence structures, and explains the 'why' if the question calls for reasoning.
Make sure the feedback is highly tailored and encourages rich descriptions.`;
  }
}
