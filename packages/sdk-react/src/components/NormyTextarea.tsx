import React, { forwardRef } from 'react';
import { useValidation } from '../hooks/useValidation.js';
import { NormyToast } from './NormyToast.js';
import type { ValidationMode } from '../types.js';

export interface NormyTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'onBlur' | 'value'> {
  /** The form question sent to the Normy API */
  question: string;
  /** When to trigger validation */
  validationMode?: ValidationMode | undefined;
  /** Debounce delay in ms (overrides provider default for this field) */
  pauseMs?: number | undefined;
  /** Label text rendered above the textarea */
  label?: string | undefined;
  /** Hint text rendered below the textarea */
  hint?: string | undefined;
  /** Auto-dismiss success toast after N ms (0 = never) */
  successDismissMs?: number | undefined;
  /** Called with the raw input value on every change */
  onValueChange?: ((value: string) => void) | undefined;
}

export const NormyTextarea = forwardRef<HTMLTextAreaElement, NormyTextareaProps>(
  function NormyTextarea(
    { question, validationMode, pauseMs, label, hint, successDismissMs, onValueChange, style, ...rest },
    ref
  ) {
    const { value, status, result, isValidating, apiError, handleChange, handleBlur } =
      useValidation({ question, mode: validationMode, pauseMs });

    const hasProblem = status === 'error';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
        {label && (
          <label
            htmlFor={rest.id}
            style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', fontFamily: 'inherit' }}
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          value={value}
          aria-invalid={hasProblem}
          aria-describedby={result ? `${rest.id ?? 'normy'}-toast` : undefined}
          onChange={(e) => {
            handleChange(e);
            onValueChange?.(e.target.value);
          }}
          onBlur={handleBlur}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '0.625rem 0.75rem',
            borderRadius: '0.5rem',
            border: hasProblem ? '1.5px solid #dc2626' : '1.5px solid #d1d5db',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: '0.9375rem',
            lineHeight: '1.6',
            resize: 'vertical',
            transition: 'border-color 150ms ease',
            ...style,
          }}
          {...rest}
        />

        {hint && !result && !isValidating && (
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>{hint}</p>
        )}

        <NormyToast
          id={`${rest.id ?? 'normy'}-toast`}
          result={result}
          isValidating={isValidating}
          apiError={apiError}
          successDismissMs={successDismissMs}
        />
      </div>
    );
  }
);
