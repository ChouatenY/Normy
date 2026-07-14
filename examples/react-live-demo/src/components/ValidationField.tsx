/**
 * ValidationField — a premium editorial-themed field wrapper that uses useMockValidation
 * and renders an inline feedback toast, styled for the studio live demo.
 */

import React from 'react';
import { useValidation, type ValidationStatus, type ValidateResponse } from '@normy-validation/react';

export type ValidationFieldMode = 'onPause' | 'onBlur' | 'onSubmit';

// ── Status indicator ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ValidationStatus, string> = {
  idle:          'Ready',
  checking_ai: 'Analyzing…',
  success:       'Verified',
  error:         'Attention required',
  rate_limited:  'Rate limited',
  network_error: 'Connection issue',
};

export function ValidationIndicator({ status }: { status: ValidationStatus }) {
  return (
    <span className={`mode-badge ${status === 'checking_ai' ? 'pause' : status === 'success' ? 'blur' : status === 'idle' ? 'submit' : 'pause'}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Inline toast ───────────────────────────────────────────────────────────────

const SEVERITY_ICON: Record<string, string> = {
  success: '✓', info: 'ℹ', warning: '⚠', error: '✕',
};

function InlineToast({
  result, status, apiError,
}: {
  result: ValidateResponse | null;
  status: ValidationStatus;
  apiError: string | null;
}) {
  const isVisible = status !== 'idle';
  if (!isVisible) return null;

  let message = '';
  let styleClass = status as string;

  if (status === 'checking_ai') {
    message = 'Analyzing input…';
    styleClass = 'validating';
  } else if (status === 'rate_limited') {
    message = apiError ?? 'Too many requests (429 Rate Limit).';
    styleClass = 'rate-limit';
  } else if (status === 'network_error') {
    message = apiError ?? 'Connection error. Please try again.';
    styleClass = 'network-error';
  } else if (result) {
    styleClass = result.severity;
    message  = result.feedback;
  }

  if (!message) return null;

  return (
    <div
      role={status === 'error' || status === 'network_error' || status === 'rate_limited' ? 'alert' : 'status'}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      className={`v-feedback ${styleClass}`}
    >
      {status === 'checking_ai' ? (
        <span className="v-feedback-spinner" aria-hidden="true" />
      ) : (
        <span className="v-feedback-icon" aria-hidden="true">
          {status === 'rate_limited' ? '⚡'
           : status === 'network_error' ? '⚠'
           : result ? SEVERITY_ICON[result.severity] ?? '!'
           : '!'}
        </span>
      )}
      <div style={{ flex: 1 }}>
        <div>{message}</div>
        {result && result.score !== undefined && (
          <div className="score-row">
            <div className="score-bar">
              <div
                className="score-fill"
                style={{
                  transform: `scaleX(${result.score / 100})`,
                  background: result.severity === 'success' ? 'var(--teal)'
                            : result.severity === 'info' ? 'var(--blue)'
                            : result.severity === 'warning' ? 'var(--amber)'
                            : 'var(--red)',
                }}
              />
            </div>
            <span className="score-label">{result.score}/100</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main field component ────────────────────────────────────────────────────────

interface ValidationFieldProps {
  id: string;
  label: string;
  question?: string;
  required?: boolean;
  hint?: string;
  as: 'input' | 'textarea' | 'select';
  type?: string;
  rows?: number;
  placeholder?: string;
  mode?: ValidationFieldMode;
  pauseMs?: number;
  options?: Array<{ value: string; label: string }>;
  onStatusChange?: (status: ValidationStatus) => void;
  onValueChange?: (value: string) => void;
  extraContent?: React.ReactNode;
}

export function ValidationField({
  id, label, question, required, hint, as, type = 'text', rows = 4, placeholder, mode = 'onPause',
  pauseMs = 1200, options, onStatusChange, onValueChange, extraContent,
}: ValidationFieldProps) {
  const { value, status, result, isValidating, apiError, handleChange, handleBlur } =
    useValidation({ question: question || label, mode, pauseMs });

  const hasProblem = status === 'error';
  const hasSuccess = status === 'success' && result?.valid;

  const inputClass = [
    as === 'textarea' ? 'field-textarea' : as === 'select' ? 'field-select' : 'field-input',
    hasProblem ? 'has-error' : hasSuccess ? 'has-success' : '',
    isValidating ? 'is-validating' : '',
  ].join(' ');

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    handleChange(e);
    onValueChange?.(e.target.value);
  };

  // Notify parent on status changes
  React.useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const sharedProps = {
    id,
    value,
    className: inputClass,
    placeholder,
    'aria-invalid': hasProblem,
    'aria-describedby': result || isValidating ? `${id}-feedback` : undefined,
    onChange,
    onBlur: handleBlur,
    'data-normy-question': question || label,
    'data-normy-label': label,
    'data-normy-hint': hint,
  };

  return (
    <div className="field-group">
      <label htmlFor={id} className="field-label">
        <span>
          {label}
          {required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
        </span>
        <span className="mode-tag">{mode}</span>
      </label>

      {as === 'textarea' ? (
        <textarea {...sharedProps} rows={rows} />
      ) : as === 'select' ? (
        <select {...sharedProps}>
          {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input {...sharedProps} type={type} />
      )}

      {extraContent}

      {hint && status === 'idle' && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>{hint}</p>
      )}

      <div id={`${id}-feedback`}>
        <InlineToast result={result} status={status} apiError={apiError} />
      </div>
    </div>
  );
}
