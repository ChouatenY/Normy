import React, { useEffect, useRef, useState } from 'react';
import type { ValidateResponse, ValidationSeverity, FeedbackCategory } from '../types.js';

// ─── Icons ────────────────────────────────────────────────────────────────────

const ICONS: Record<ValidationSeverity, string> = {
  success: '✓',
  info:    'ℹ',
  warning: '⚠',
  error:   '✕',
};

// ─── Severity → CSS token ─────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<ValidationSeverity, string> = {
  success: '#16a34a',
  info:    '#2563eb',
  warning: '#d97706',
  error:   '#dc2626',
};

const SEVERITY_BG: Record<ValidationSeverity, string> = {
  success: '#f0fdf4',
  info:    '#eff6ff',
  warning: '#fffbeb',
  error:   '#fef2f2',
};

const SEVERITY_BORDER: Record<ValidationSeverity, string> = {
  success: '#bbf7d0',
  info:    '#bfdbfe',
  warning: '#fde68a',
  error:   '#fecaca',
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NormyToastProps {
  /** HTML id for accessibility (e.g. aria-describedby linkage) */
  id?: string | undefined;
  /** The validation result to display. Pass null/undefined to hide. */
  result: ValidateResponse | null | undefined;
  /** Whether a validation is in-flight */
  isValidating?: boolean | undefined;
  /** API-level error (rate limit, network) to display instead of validation result */
  apiError?: string | null | undefined;
  /** Auto-dismiss success toasts after this many ms. Set to 0 to disable. @default 3000 */
  successDismissMs?: number | undefined;
  /** Class applied to the toast wrapper */
  className?: string | undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NormyToast({
  id,
  result,
  isValidating = false,
  apiError,
  successDismissMs = 3000,
  className,
}: NormyToastProps) {
  const [visible, setVisible] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);

    if (isValidating || result || apiError) {
      setVisible(true);
    }

    // Auto-dismiss on success
    if (result?.valid && successDismissMs > 0) {
      dismissTimer.current = setTimeout(() => setVisible(false), successDismissMs);
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [result, isValidating, apiError, successDismissMs]);

  if (!visible) return null;

  // Loading state
  if (isValidating) {
    return (
      <div
        id={id}
        role="status"
        aria-live="polite"
        className={className}
        style={toastStyle({ severity: 'info' })}
      >
        <span style={spinnerStyle} aria-hidden="true">⟳</span>
        <span>Checking your response…</span>
      </div>
    );
  }

  // API-level error (rate limit / network)
  if (apiError) {
    return (
      <div
        id={id}
        role="alert"
        aria-live="assertive"
        className={className}
        style={toastStyle({ severity: 'warning' })}
      >
        <span aria-hidden="true">{ICONS.warning}</span>
        <span>{apiError}</span>
      </div>
    );
  }

  if (!result) return null;

  const { severity, feedback, feedbackCategory } = result;

  return (
    <div
      id={id}
      role={severity === 'error' ? 'alert' : 'status'}
      aria-live={severity === 'error' ? 'assertive' : 'polite'}
      data-severity={severity}
      data-category={feedbackCategory as FeedbackCategory | undefined}
      className={className}
      style={toastStyle({ severity })}
    >
      <span
        aria-hidden="true"
        style={{
          fontWeight: 700,
          fontSize: '1rem',
          color: SEVERITY_COLORS[severity],
          flexShrink: 0,
        }}
      >
        {ICONS[severity]}
      </span>
      <span style={{ flex: 1 }}>{feedback}</span>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toastStyle({ severity }: { severity: ValidationSeverity }): React.CSSProperties {
  return {
    display:        'flex',
    alignItems:     'flex-start',
    gap:            '0.5rem',
    padding:        '0.625rem 0.875rem',
    borderRadius:   '0.5rem',
    border:         `1px solid ${SEVERITY_BORDER[severity]}`,
    background:     SEVERITY_BG[severity],
    color:          SEVERITY_COLORS[severity],
    fontSize:       '0.875rem',
    lineHeight:     '1.5',
    marginTop:      '0.375rem',
    fontFamily:     'inherit',
    width:          '100%',
    boxSizing:      'border-box',
    animation:      'normy-slide-in 150ms ease-out',
  };
}

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  animation: 'normy-spin 1s linear infinite',
  flexShrink: 0,
};
