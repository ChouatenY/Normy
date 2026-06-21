/**
 * @normy/react
 *
 * React SDK for Normy — real-time AI form validation components and hooks.
 *
 * Usage:
 * ```tsx
 * import { NormyProvider, NormyTextarea } from '@normy/react';
 *
 * function App() {
 *   return (
 *     <NormyProvider apiKey="nrm_live_..." projectId="your-project-id">
 *       <NormyTextarea
 *         id="cancel-reason"
 *         question="Why are you cancelling?"
 *         label="Reason for cancellation"
 *         validationMode="onPause"
 *         rows={4}
 *       />
 *     </NormyProvider>
 *   );
 * }
 * ```
 */

// ─── Components ───────────────────────────────────────────────────────────────
export { NormyProvider }    from './components/NormyProvider.js';
export { NormyToast }       from './components/NormyToast.js';
export { NormyTextarea }    from './components/NormyTextarea.js';
export { NormyInput }       from './components/NormyInput.js';
export { NormySelect }      from './components/NormySelect.js';

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useNormy }         from './hooks/useNormy.js';
export { useValidation }    from './hooks/useValidation.js';

// ─── Client ───────────────────────────────────────────────────────────────────
export { NormyClient }      from './client/api.js';
export { ISSUE_TO_CATEGORY } from './client/api.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export type { NormyProviderProps }    from './components/NormyProvider.js';
export type { NormyToastProps }       from './components/NormyToast.js';
export type { NormyTextareaProps }    from './components/NormyTextarea.js';
export type { NormyInputProps }       from './components/NormyInput.js';
export type { NormySelectProps, NormySelectOption } from './components/NormySelect.js';
export type { NormyContextValue }     from './context/NormyContext.js';
export type { UseValidationOptions, UseValidationReturn, UseValidationState, ValidationStatus } from './hooks/useValidation.js';
export type {
  ValidationMode,
  ValidateRequest,
  ValidateResponse,
  ValidationIssue,
  ValidationSeverity,
  FeedbackCategory,
  NormyApiError,
  NormyApiResult,
}                                     from './types.js';
