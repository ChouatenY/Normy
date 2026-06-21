/**
 * @normy/validation-core — Core AI validation engine
 *
 * Central hub for all validation logic, AI provider abstractions, scoring
 * algorithms, prompt templates, and validation pipelines.
 *
 * This package is the ONLY place business-logic lives.
 * Apps and SDKs consume this package; they never implement validation directly.
 */

// Types — all public-facing interfaces and enums
export * from './types/index.js';

// Providers — AI provider abstraction layer (OpenAI, Gemini, Anthropic)
export * from './providers/index.js';

// Prompts — structured prompt templates and builders
export * from './prompts/index.js';

// Scoring — quality score computation and thresholds
export * from './scoring/index.js';

// Validators — individual validation strategy implementations
export * from './validators/index.js';

// Pipelines — composable validation pipelines
export * from './pipelines/index.js';
