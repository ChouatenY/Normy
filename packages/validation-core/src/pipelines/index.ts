/**
 * Validation pipelines for @normy/validation-core
 *
 * A Pipeline composes an ordered set of Validators with an AIProvider.
 *
 * Execution order:
 *   1. Run each Validator in sequence (cheap, local checks first)
 *   2. If any validator signals failure → short-circuit, return early result
 *   3. If all validators pass → delegate to the AIProvider for deep analysis
 *   4. Merge AI result with scoring config → final ValidationResult
 *
 * This two-tier approach minimises AI token spend while maintaining coverage.
 */

export type { ValidationPipeline } from '../types/index.js';

export { OrchestratorPipeline } from './orchestrator.js';
