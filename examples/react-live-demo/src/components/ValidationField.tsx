/**
 * ValidationField — a dark-themed field wrapper that uses useMockValidation
 * and renders an inline feedback toast, styled for the live demo.
 */

import React from 'react';
import type { ValidationMode } from '@normy/react';
import { useMockValidation, type ValidationStatus } from '../hooks/useMockValidation';
import type { ValidateResponse } from '@normy/react';

// ── Status indicator ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ValidationStatus, string> = {
  idle:          'Waiting',
  validating:    'Checking…',
  success:       'Valid',
  error:         'Issue found',
  rate_limited:  'Rate limited',
  network_error: 'Network error',
};

const STATUS_ICON: Record<ValidationStatus, string> = {
  idle:          '○',
  validating:    '⟳',
  success:       '✓',
  error:         '✕',
  rate_limited:  '⚡',
  network_error: '⚠',
};

export function ValidationIndicator({ status }: { status: ValidationStatus }) {
  return (
    <span className={`v-indicator ${status}`}>
      <span style={{ fontWeight: 700, fontSize: '0.75em' }}>{STATUS_ICON[status]}</span>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Inline toast ───────────────────────────────────────────────────────────────

const TOAST_STYLES: Record<string, React.CSSProperties> = {
  success:       { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' },
  info:          { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' },
  warning:       { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' },
  error:         { background: 'rgba(239,68,68,0.08)',  border: '1px solid rgba(239,68,68,0.25)',  color: '#fca5a5' },
  rate_limited:  { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' },
  network_error: { background: 'rgba(239,68,68,0.08)',  border: '1px solid rgba(239,68,68,0.25)',  color: '#fca5a5' },
  validating:    { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' },
};

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
  let styleKey = status as string;

  if (status === 'validating') {
    message = 'Checking your response…';
  } else if (status === 'rate_limited' || status === 'network_error') {
    message = apiError ?? 'Something went wrong.';
  } else if (result) {
    styleKey = result.severity;
    message  = result.feedback;
  }

  if (!message) return null;

  const style = TOAST_STYLES[styleKey] ?? TOAST_STYLES['error'];
  const icon  = status === 'validating' ? '⟳'
              : status === 'rate_limited' ? '⚡'
              : status === 'network_error' ? '⚠'
              : result ? SEVERITY_ICON[result.severity] ?? '!'
              : '!';

  return (
    <div
      role={status === 'error' || status === 'network_error' || status === 'rate_limited' ? 'alert' : 'status'}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      data-severity={result?.severity ?? status}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '8px',
        padding: '9px 14px', borderRadius: '8px', marginTop: '6px',
        fontSize: '0.8125rem', lineHeight: '1.5', fontFamily: 'inherit',
        animation: 'normy-slide-in 150ms ease-out',
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ fontWeight: 700, flexShrink: 0, marginTop: '1px',
        animation: status === 'validating' ? 'normy-spin 1s linear infinite' : undefined,
        display: 'inline-block',
      }}>
        {icon}
      </span>
      <span>{message}</span>
    </div>
  );
}

// ── Main field component ────────────────────────────────────────────────────────

interface ValidationFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  as: 'input' | 'textarea' | 'select';
  type?: string;
  rows?: number;
  placeholder?: string;
  mode?: ValidationMode;
  pauseMs?: number;
  rateLimitAfter?: number;
  networkErrorOn?: number;
  options?: Array<{ value: string; label: string }>;
  onStatusChange?: (status: ValidationStatus) => void;
  onValueChange?: (value: string) => void;
  extraContent?: React.ReactNode;
}

export function ValidationField({
  id, label, required, hint, as, type = 'text', rows = 4, placeholder, mode = 'onPause',
  pauseMs = 1500, rateLimitAfter = 0, networkErrorOn = 0, options,
  onStatusChange, onValueChange, extraContent,
}: ValidationFieldProps) {
  const { value, status, result, isValidating, apiError, handleChange, handleBlur } =
    useMockValidation({ mode, pauseMs, rateLimitAfter, networkErrorOn });

  const hasProblem = status === 'error';
  const hasSuccess = status === 'success' && result?.valid;

  const inputClass = [
    as === 'textarea' ? 'field-textarea' : as === 'select' ? 'field-select' : 'field-input',
    hasProblem ? 'has-error' : hasSuccess ? 'has-success' : '',
  ].join(' ');

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    handleChange(e);
    onStatusChange?.('validating');
    onValueChange?.(e.target.value);
  };

  // Notify parent on status changes
  React.useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  const sharedProps = {
    id, value, className: inputClass, placeholder,
    'aria-invalid': hasProblem,
    'aria-describedby': result || isValidating ? `${id}-feedback` : undefined,
    onChange, onBlur: handleBlur,
  };

  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required">*</span>}
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
        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '5px' }}>{hint}</p>
      )}

      <div id={`${id}-feedback`}>
        <InlineToast result={result} status={status} apiError={apiError} />
      </div>
    </div>
  );
}
