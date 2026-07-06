/**
 * Scoring utilities for @normy/validation-core
 *
 * The scoring module converts raw AI model output and local validator signals
 * into a normalized 0–100 quality score and a human-readable severity level.
 *
 * Scoring must be deterministic given the same inputs — no randomness.
 */

export type { ScoringConfig, ValidationSeverity } from '@normy-validation/core';
export { DEFAULT_SCORING_CONFIG } from '@normy-validation/core';

export { ScoringEngine } from './engine.js';
