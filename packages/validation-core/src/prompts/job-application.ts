import { BasePrompt } from './base.js';
import type { ValidationRequest } from '../types/index.js';

export class JobApplicationPrompt extends BasePrompt {
  readonly id = 'job-application';
  readonly version = '1.0.0';

  getInstructions(_request: ValidationRequest): string {
    return `Evaluate job application responses (e.g. experience descriptions, projects, summaries).
Check if they have mentioned relevant skills, technologies, years of experience, or responsibilities.
If they just say "I worked", mark it as LOW_QUALITY and guide them to mention projects, technologies, and achievements.`;
  }
}
