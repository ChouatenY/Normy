import { useState, useRef, useCallback, useEffect } from 'react';
import { useNormy } from './useNormy.js';
import type { ValidateResponse, ValidationMode } from '../types.js';
import { EmptyValidator, TooShortValidator, RandomTextValidator, SpamValidator } from '@normy-validation/core';

const localValidators = [
  new EmptyValidator(),
  new TooShortValidator(),
  new RandomTextValidator(),
  new SpamValidator()
];

const PATIENCE_MS = {
  low: 300,
  medium: 800,
  high: 1500,
};

// Global in-memory cache for exact-match strings
const browserMemoryCache = new Map<string, ValidateResponse>();

// ─── State shape ─────────────────────────────────────────────────────────────

export type ValidationStatus = 'idle' | 'typing' | 'debouncing' | 'checking_local' | 'checking_ai' | 'cache_hit' | 'success' | 'warning' | 'error' | 'offline' | 'rate_limited' | 'network_error';

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
  /** High-level source of the validation result (e.g., local, gemini, cache) */
  source?: string | undefined;
  /** The specific entity that resolved the validation */
  resolvedBy?: string | undefined;
  /** Whether the result was served from cache */
  cached?: boolean | undefined;
  /** AI provider used (if any) */
  provider?: string | undefined;
  /** Duration of the validation check in milliseconds */
  latency?: number | undefined;
  /** Confidence score (0.0 to 1.0) */
  confidence?: number | undefined;
  /** Quality score (0 to 100) */
  score?: number | undefined;
  /** Structured explanation object */
  explanation?: {
    problem?: string;
    suggestion?: string;
    detail?: string;
  } | undefined;
}

export type PatienceLevel = 'low' | 'medium' | 'high';

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
  /** Patience level for Smart Mode. Dictates debounce timing. @default 'medium' */
  patience?: PatienceLevel | undefined;
  /** Debounce delay in ms for onPause mode. Overrides provider default. */
  pauseMs?: number | undefined;
  /** Callback fired every time a new ValidationResult arrives */
  onResult?: ((result: ValidateResponse) => void) | undefined;
  /** Callback fired only when result.valid === true */
  onValid?: ((result: ValidateResponse) => void) | undefined;
  /** Callback fired only when result.valid === false */
  onInvalid?: ((result: ValidateResponse) => void) | undefined;
  
  // Lifecycle Events
  onValidationStart?: (() => void) | undefined;
  onLocalValidation?: ((result: ValidateResponse) => void) | undefined;
  onAIValidation?: ((result: ValidateResponse) => void) | undefined;
  onCacheHit?: ((result: ValidateResponse) => void) | undefined;
  onValidationComplete?: ((result: ValidateResponse) => void) | undefined;
  onValidationFailure?: ((error: string) => void) | undefined;
  onOfflineValidation?: ((result: ValidateResponse) => void) | undefined;
}

export interface UseValidationReturn extends UseValidationState {
  /** Bind to <input onChange> */
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** Bind to <input onBlur> */
  handleBlur: () => void;
  /** Bind to <input onFocus> */
  handleFocus: () => void;
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
  source: undefined,
  resolvedBy: undefined,
  cached: undefined,
  provider: undefined,
  latency: undefined,
  confidence: undefined,
  score: undefined,
  explanation: undefined,
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
    trackEvent,
    debug,
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

  const runValidation = useCallback(async (value: string, skipAi: boolean = false) => {
    if (!value.trim() && mode === 'smart') {
      // Smart mode ignores empty fields until submit
      return;
    }
    if (!value.trim()) {
      setState(prev => ({ ...prev, status: 'idle', result: null, apiError: null, isValidating: false }));
      return;
    }

    setState(prev => ({ ...prev, status: 'checking_local', apiError: null }));

    trackEvent({
      type: 'validation_triggered',
      fieldName: options.id || options.question,
      payload: { mode, skipAi }
    });

    options.onValidationStart?.();
    if (debug) console.log('[Normy] Validation Started ↓');

    const req: any = {
      projectId,
      question: options.question,
      answer: value,
    };
    if (options.fieldContext !== undefined) req.fieldContext = options.fieldContext;
    if (options.promptVersion !== undefined) req.promptVersion = options.promptVersion;

    // 1. Run local validators
    for (const validator of localValidators) {
      const localRes = await validator.check(req);
      if (localRes) {
        const fullRes: ValidateResponse = {
          valid: localRes.valid ?? false,
          score: localRes.score ?? 0,
          confidence: localRes.confidence ?? 100,
          issue: (localRes.issue as any) ?? 'LOCAL_ERROR',
          severity: localRes.severity ?? 'error',
          feedback: localRes.feedback ?? 'Invalid input',
          source: 'local',
          resolvedBy: localRes.resolvedBy ?? validator.constructor.name,
          metadata: { latencyMs: 0 }
        };
        setState(prev => ({
          ...prev,
          isValidating: false,
          status: fullRes.valid ? 'success' : 'error',
          result: fullRes,
          isValid: fullRes.valid,
          source: fullRes.source,
          resolvedBy: fullRes.resolvedBy,
          cached: fullRes.metadata?.cached,
          provider: fullRes.metadata?.provider,
          latency: fullRes.metadata?.latencyMs,
          confidence: fullRes.confidence,
          score: fullRes.score,
          explanation: fullRes.explanation,
        }));
        options.onResult?.(fullRes);
        if (fullRes.valid) options.onValid?.(fullRes);
        else options.onInvalid?.(fullRes);

        trackEvent({
          type: 'validation_completed',
          fieldName: options.id || options.question,
          payload: { source: 'local', valid: fullRes.valid, issue: fullRes.issue }
        });

        options.onLocalValidation?.(fullRes);
        options.onValidationComplete?.(fullRes);
        if (debug) {
          console.log('[Normy] Local Validators Passed ↓');
          console.log(`[Normy] Validation Completed (Latency 0ms)`);
        }

        return;
      }
    }

    if (skipAi) {
      setState(prev => ({ ...prev, isValidating: false, status: 'idle' }));
      return;
    }

    const cacheKey = `${projectId}:${options.question}:${value}:${options.promptVersion || 'default'}`;
    const memCachedRes = browserMemoryCache.get(cacheKey);

    if (memCachedRes) {
      if (debug) console.log('[Normy] Browser Memory Cache Hit ↓');
      setState(prev => ({
        ...prev,
        isValidating: false,
        status: 'cache_hit',
        result: memCachedRes,
        isValid: memCachedRes.valid,
        apiError: null,
        source: 'local_cache',
        resolvedBy: memCachedRes.resolvedBy,
        cached: true,
        provider: memCachedRes.metadata?.provider,
        latency: 0,
        confidence: memCachedRes.confidence,
        score: memCachedRes.score,
        explanation: memCachedRes.explanation,
      }));

      setTimeout(() => {
        setState(prev => ({ ...prev, status: memCachedRes.valid ? 'success' : 'error' }));
      }, 50);

      options.onResult?.(memCachedRes);
      if (memCachedRes.valid) options.onValid?.(memCachedRes);
      else options.onInvalid?.(memCachedRes);
      options.onCacheHit?.(memCachedRes);
      options.onValidationComplete?.(memCachedRes);

      trackEvent({
        type: 'validation_completed',
        fieldName: options.id || options.question,
        payload: { source: 'local_cache', valid: memCachedRes.valid, issue: memCachedRes.issue, cached: true }
      });
      return;
    }

    setState(prev => ({ ...prev, isValidating: true, status: 'checking_ai' }));
    if (debug) console.log(`[Normy] AI Request (${req.provider || 'gemini'}) ↓`);

    const result = await client.validate(req);

    if (!result.ok) {
      const isRateLimit = result.error.status === 429;
      setState(prev => ({
        ...prev,
        isValidating: false,
        status: isRateLimit ? 'rate_limited' : 'network_error',
        apiError: result.error.error,
      }));
      options.onValidationFailure?.(result.error.error);
      return;
    }

    // Populate browser memory cache
    browserMemoryCache.set(cacheKey, result.data);

    setState(prev => ({
      ...prev,
      isValidating: false,
      status: result.data.metadata?.cached ? 'cache_hit' : (result.data.valid ? 'success' : 'error'),
      result: result.data,
      isValid: result.data.valid,
      apiError: null,
      source: result.data.source,
      resolvedBy: result.data.metadata?.resolvedBy || result.data.resolvedBy,
      cached: result.data.metadata?.cached,
      provider: result.data.metadata?.provider,
      latency: result.data.metadata?.latencyMs,
      confidence: result.data.confidence,
      score: result.data.score,
      explanation: result.data.explanation,
    }));

    // If cache_hit, transition to success/error after a tick to satisfy the state machine requirement
    if (result.data.metadata?.cached) {
      trackEvent({
        type: 'cache_hit',
        fieldName: options.id || options.question,
        payload: { valid: result.data.valid, issue: result.data.issue }
      });
      setTimeout(() => {
        setState(prev => ({ ...prev, status: result.data.valid ? 'success' : 'error' }));
      }, 50);
    }

    trackEvent({
      type: 'validation_completed',
      fieldName: options.id || options.question,
      payload: { 
        source: result.data.source || 'gemini', 
        valid: result.data.valid, 
        issue: result.data.issue, 
        cached: result.data.metadata?.cached 
      }
    });

    options.onResult?.(result.data);
    if (result.data.valid) {
      options.onValid?.(result.data);
    } else {
      options.onInvalid?.(result.data);
    }

    if (result.data.metadata?.cached) {
      options.onCacheHit?.(result.data);
      if (debug) console.log('[Normy] Cache Hit ↓');
    } else if (result.data.source === 'offline') {
      options.onOfflineValidation?.(result.data);
      if (debug) console.log('[Normy] Offline Mode ↓');
    } else {
      options.onAIValidation?.(result.data);
      if (debug) console.log('[Normy] Cache Miss ↓');
    }
    options.onValidationComplete?.(result.data);
    if (debug) console.log(`[Normy] Validation Completed (Latency ${result.data.metadata?.latencyMs ?? 0}ms)`);
  }, [client, projectId, options, mode, trackEvent, debug]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setState(prev => ({ 
      ...prev, 
      value, 
      status: 'typing',
      result: null,
      apiError: null,
      isValidating: false
    }));

    if (mode === 'onPause' || mode === 'smart') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      
      const delay = mode === 'smart' 
        ? PATIENCE_MS[options.patience ?? 'medium'] 
        : (pauseMs ?? 2000);

      debounceRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, status: 'debouncing' }));
        void runValidation(value, mode === 'smart'); // smart mode skips AI on pause
      }, delay);
    }
  }, [mode, pauseMs, runValidation, options.patience]);

  const handleBlur = useCallback(() => {
    trackEvent({ type: 'field_blurred', fieldName: options.id || options.question });
    if (mode === 'onBlur' || mode === 'smart') {
      void runValidation(latestValueRef.current, false); // always run AI on blur
    }
  }, [mode, runValidation, options.id, options.question, trackEvent]);

  const handleFocus = useCallback(() => {
    trackEvent({ type: 'field_focused', fieldName: options.id || options.question });
  }, [options.id, options.question, trackEvent]);

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
    handleFocus,
    triggerValidation,
    reset,
    setValue,
  };
}
