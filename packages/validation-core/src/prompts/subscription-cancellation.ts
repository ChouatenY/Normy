import { BasePrompt } from './base.js';
import type { ValidationRequest } from '../types/index.js';

export class SubscriptionCancellationPrompt extends BasePrompt {
  readonly id = 'subscription-cancellation';
  readonly version = '1.0.0';

  getInstructions(_request: ValidationRequest): string {
    return `Evaluate subscription cancellation reasons.
We need to know the why. Valid answers should state reasons like pricing, switching to another tool, missing features, etc.
If the user answer is extremely vague (e.g. "yes", "no", "bye"), mark it as LOW_QUALITY and ask them to briefly explain if it's pricing, features, switching, or another reason.`;
  }
}
