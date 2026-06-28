import type { PromptTemplate } from '../types/index.js';
import { QualityV1Prompt } from './quality-v1.js';
import { QualityV2Prompt } from './quality-v2.js';
import { GovernmentPrompt } from './government.js';
import { CustomerFeedbackPrompt } from './customer-feedback.js';
import { JobApplicationPrompt } from './job-application.js';
import { SurveyPrompt } from './survey.js';
import { SubscriptionCancellationPrompt } from './subscription-cancellation.js';

export type { PromptTemplate } from '../types/index.js';
export { BasePrompt } from './base.js';
export { QualityV1Prompt } from './quality-v1.js';
export { QualityV2Prompt } from './quality-v2.js';
export { GovernmentPrompt } from './government.js';
export { CustomerFeedbackPrompt } from './customer-feedback.js';
export { JobApplicationPrompt } from './job-application.js';
export { SurveyPrompt } from './survey.js';
export { SubscriptionCancellationPrompt } from './subscription-cancellation.js';

export const PROMPT_REGISTRY: Record<string, PromptTemplate> = {
  'quality-v1': new QualityV1Prompt(),
  'quality-v2': new QualityV2Prompt(),
  'government': new GovernmentPrompt(),
  'customer-feedback': new CustomerFeedbackPrompt(),
  'job-application': new JobApplicationPrompt(),
  'survey': new SurveyPrompt(),
  'subscription-cancellation': new SubscriptionCancellationPrompt(),
};

export function getPromptTemplate(id?: string): PromptTemplate {
  if (!id || !PROMPT_REGISTRY[id]) {
    return PROMPT_REGISTRY['quality-v1']!;
  }
  return PROMPT_REGISTRY[id]!;
}
