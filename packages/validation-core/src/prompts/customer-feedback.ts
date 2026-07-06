import { BasePrompt } from './base.js';
import type { ValidationRequest } from '@normy-validation/core';

export class CustomerFeedbackPrompt extends BasePrompt {
  readonly id = 'customer-feedback';
  readonly version = '1.0.0';

  getInstructions(request: ValidationRequest): string {
    const contextInstruction = request.fieldContext
      ? `\nAdditionally, note the field context: "${request.fieldContext}". If the written feedback directly contradicts this context (e.g., leaving a 1-star rating but writing "good", or leaving a 5-star rating but writing "terrible service"), flag it as CONTRADICTORY or LOW_QUALITY and ask the user to clarify.`
      : '';

    return `Evaluate customer feedback / review input.
Look for constructive criticism, suggestions, or descriptions of user experiences.
If the feedback is extremely brief (e.g. "good", "bad", "okay"), flag it as LOW_QUALITY and request details on what exactly they liked or disliked.${contextInstruction}`;
  }
}
