import { BasePrompt } from './base.js';
import type { ValidationRequest } from '../types/index.js';

export class GovernmentPrompt extends BasePrompt {
  readonly id = 'government';
  readonly version = '1.0.0';

  getInstructions(_request: ValidationRequest): string {
    return `Evaluate for a formal government/official application.
The answer must be precise, professional, contain no colloquialisms, and address the official details requested.
If name, address, or official explanation is requested, ensure proper spelling and complete naming. No placeholders.`;
  }
}
