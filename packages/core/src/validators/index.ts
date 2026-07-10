/**
 * Individual validators for @normy/validation-core
 *
 * Each Validator is a focused, single-responsibility check that runs
 * BEFORE the AI provider call to short-circuit obvious failures cheaply.
 *
 * A validator returns:
 *   - null        → this check passed, continue to the next validator
 *   - Partial<ValidationResult> → issue detected, short-circuit pipeline
 *
 * Validators are composable and run in order within a Pipeline.
 */



export { BaseValidator } from './base.js';
export { EmptyValidator } from './empty.validator.js';
export { TooShortValidator } from './too-short.validator.js';
export { RandomTextValidator } from './random-text.validator.js';
export { SpamValidator } from './spam.validator.js';
