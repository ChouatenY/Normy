/**
 * Structured prompt templates for @normy/validation-core
 *
 * Prompts are versioned and immutable. When a prompt changes, a new version
 * is created — old versions are never mutated, ensuring reproducibility.
 *
 * All prompts use structured output (JSON) — never free-form text.
 */

export type { PromptTemplate } from '../types/index.js';

// Future prompt implementations:
// export { NormyV1Prompt } from './normy-v1.prompt.js';
// export { buildSystemPrompt } from './system.prompt.js';
// export { buildUserPrompt } from './user.prompt.js';
