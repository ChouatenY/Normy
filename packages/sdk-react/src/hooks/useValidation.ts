import { useState, useRef, useCallback, useEffect } from 'react';
import { useNormy } from './useNormy.js';
import type { ValidateResponse, ValidationMode } from '../types.js';

// ─── State shape ─────────────────────────────────────────────────────────────

export type ValidationStatus = 'idle' | 'validating' | 'success' | 'error' | 'rate_limited' | 'network_error';

export interface UseValidationState {
  /** Current input value */
  value: string;
  /** Validation pipeline status */
  status: ValidationStatus;
  /** Latest validation result from the API (null until first validation) */
  result: ValidateResponse | null;
  /** True while a validation request is in-flight */
  isValidating: boolean;
  /** True if the last validation passed */
  isValid: boolean;
  /** Human-readable error if the API call itself failed (not a validation failure) */
  apiError: string | null;
}

export interface UseValidationOptions {
  /** Optional unique identifier for tracking global form validity */
  id?: string | undefined;
  /** The form question / field label sent to the API */
  question: string;
  /** Optional context about the field (e.g. "cancellation reason field"). */
  fieldContext?: string;
  /** Optional version of prompt template to use. */
  promptVersion?: string;
  /** When to trigger validation */
  mode?: ValidationMode | undefined;
  /** Debounce delay in ms for onPause mode. Overrides provider default. */
  pauseMs?: number | undefined;
  /** Callback fired every time a new ValidationResult arrives */
  onResult?: ((result: ValidateResponse) => void) | undefined;
  /** Callback fired only when result.valid === true */
  onValid?: ((result: ValidateResponse) => void) | undefined;
  /** Callback fired only when result.valid === false */
  onInvalid?: ((result: ValidateResponse) => void) | undefined;
}

export interface UseValidationReturn extends UseValidationState {
  /** Bind to <input onChange> */
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** Bind to <input onBlur> */
  handleBlur: () => void;
  /** Call programmatically (e.g. from form onSubmit) */
  triggerValidation: () => Promise<void>;
  /** Reset state back to idle */
  reset: () => void;
  /** Programmatically set the field value */
  setValue: (value: string) => void;
}

const IDLE_STATE: UseValidationState = {
  value: '',
  status: 'idle',
  result: null,
  isValidating: false,
  isValid: false,
  apiError: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useValidation(options: UseValidationOptions): UseValidationReturn {
  const {
    client,
    projectId,
    defaultMode,
    pauseMs: contextPauseMs,
    registerField,
    updateField,
    unregisterField,
  } = useNormy();

  const mode    = options.mode    ?? defaultMode;
  const pauseMs = options.pauseMs ?? contextPauseMs;

  const [state, setState] = useState<UseValidationState>(IDLE_STATE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef<string>('');

  const fieldId = options.id || options.question;

  // Register/unregister with form validation registry
  useEffect(() => {
    registerField(fieldId, { isValid: false, score: 0 });
    return () => {
      unregisterField(fieldId);
    };
  }, [fieldId, registerField, unregisterField]);

  // Synchronize validation success/score changes to global registry
  useEffect(() => {
    updateField(fieldId, {
      isValid: state.isValid,
      score: state.result?.score ?? 0,
    });
  }, [fieldId, state.isValid, state.result?.score, updateField]);

  // Track latest value without re-subscribing to stale closures
  useEffect(() => {
    latestValueRef.current = state.value;
  }, [state.value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runValidation = useCallback(async (value: string) => {
    if (!value.trim()) {
      setState(prev => ({ ...prev, status: 'idle', result: null, apiError: null, isValidating: false }));
      return;
    }

    setState(prev => ({ ...prev, isValidating: true, status: 'validating', apiError: null }));

    const req: any = {
      projectId,
      question: options.question,
      answer: value,
    };
    if (options.fieldContext !== undefined) req.fieldContext = options.fieldContext;
    if (options.promptVersion !== undefined) req.promptVersion = options.promptVersion;

    const result = await client.validate(req);

    if (!result.ok) {
      const isRateLimit = result.error.status === 429;
      setState(prev => ({
        ...prev,
        isValidating: false,
        status: isRateLimit ? 'rate_limited' : 'network_error',
        apiError: result.error.error,
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isValidating: false,
      status: result.data.valid ? 'success' : 'error',
      result: result.data,
      isValid: result.data.valid,
      apiError: null,
    }));

    options.onResult?.(result.data);
    if (result.data.valid) {
      options.onValid?.(result.data);
    } else {
      options.onInvalid?.(result.data);
    }
  }, [client, projectId, options.question, options.fieldContext, options.promptVersion, options.onResult, options.onValid, options.onInvalid]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setState(prev => ({ ...prev, value }));

    if (mode === 'onPause') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void runValidation(value);
      }, pauseMs);
    }
  }, [mode, pauseMs, runValidation]);

  const handleBlur = useCallback(() => {
    if (mode === 'onBlur') {
      void runValidation(latestValueRef.current);
    }
  }, [mode, runValidation]);

  const triggerValidation = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await runValidation(latestValueRef.current);
  }, [runValidation]);

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setState(IDLE_STATE);
  }, []);

  const setValue = useCallback((val: string) => {
    setState(prev => ({ ...prev, value: val }));
  }, []);

  return {
    ...state,
    handleChange,
    handleBlur,
    triggerValidation,
    reset,
    setValue,
  };
}
