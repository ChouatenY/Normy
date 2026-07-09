/**
 * Form 1: Subscription Cancellation
 *
 * Demonstrates:
 *  - onPause (debounced) validation on "reason" textarea
 *  - onBlur validation on the "feedback" textarea
 *  - Rate-limiting simulation after 4 validation calls
 *  - Scenario quick-fill buttons for common bad inputs
 */

import React, { useState } from 'react';
import { useValidation } from '@normy-validation/react';
import { ValidationField } from './ValidationField.js';

const CANCEL_REASONS = [
  { value: '', label: 'Select a reason…' },
  { value: 'too_expensive', label: 'Pricing constraints' },
  { value: 'missing_features', label: 'Feature requirements not met' },
  { value: 'found_alternative', label: 'Transitioned to alternative product' },
  { value: 'technical_issues', label: 'Technical / stability issues' },
  { value: 'no_longer_needed', label: 'Project deprecated / completed' },
  { value: 'other', label: 'Other reasons' },
];

export function CancellationForm() {
  const [submitted, setSubmitted] = useState(false);

  // Elaboration field (main interactive piece)
  const elaboration = useValidation({
    mode: 'onPause',
    pauseMs: 1200,
    question: 'What is the primary reason for cancelling your subscription today?',
  });

  const canSubmit = !submitted && elaboration.value.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    void elaboration.triggerValidation().then(() => {
      if (elaboration.isValid || elaboration.result?.valid) {
        setSubmitted(true);
      }
    });
  }

  function quickFill(value: string) {
    elaboration.setValue(value);
    elaboration.handleChange({ target: { value } } as any);
  }

  if (submitted) {
    return (
      <div className="success-screen">
        <div className="success-mark">✓</div>
        <h3>Cancellation Processed</h3>
        <p>Your subscription has been set to cancel at the end of the billing cycle. Thank you for your feedback.</p>
        <button className="btn btn-ghost" onClick={() => {
          setSubmitted(false);
          elaboration.reset();
        }}>
          ← Restart Demo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mode-badges">
        <span className="mode-badge pause">⏱ onPause (1.2s)</span>
        <span className="mode-badge blur">👁 onBlur</span>
        <span className="mode-badge submit">🚀 onSubmit Gate</span>
      </div>

      <div className="v-feedback warning" style={{ marginBottom: 24 }}>
        <span className="v-feedback-icon">⚡</span>
        <div>
          Rate limiting is simulated on the elaboration field. After 4 validations, the API returns a mock 429 error to demonstrate graceful error handling.
        </div>
      </div>

      {/* Reason Select */}
      <div className="field-group">
        <label htmlFor="cancel-reason" className="field-label">
          <span>Primary cancellation reason <span style={{ color: 'var(--red)' }}>*</span></span>
        </label>
        <select id="cancel-reason" className="field-select" defaultValue="">
          {CANCEL_REASONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Elaboration Input */}
      <div className="field-group">
        <label htmlFor="cancel-elaboration" className="field-label">
          <span>Elaborate on your decision <span style={{ color: 'var(--red)' }}>*</span></span>
          <span className="mode-tag">onPause</span>
        </label>
        <textarea
          id="cancel-elaboration"
          className={[
            'field-textarea',
            elaboration.status === 'error' ? 'has-error' : elaboration.status === 'success' ? 'has-success' : '',
            elaboration.isValidating ? 'is-validating' : '',
          ].join(' ')}
          rows={4}
          placeholder="Could you share details about your decision to cancel? Be as descriptive as you like."
          value={elaboration.value}
          onChange={elaboration.handleChange}
          onBlur={elaboration.handleBlur}
        />

        {/* Inline Feedback Toast */}
        {elaboration.status !== 'idle' && (
          <div
            role={elaboration.status === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`v-feedback ${
              elaboration.isValidating ? 'validating'
              : elaboration.status === 'rate_limited' ? 'rate-limit'
              : elaboration.status === 'network_error' ? 'network-error'
              : elaboration.result?.severity ?? 'error'
            }`}
          >
            {elaboration.isValidating ? (
              <span className="v-feedback-spinner" />
            ) : (
              <span className="v-feedback-icon">
                {elaboration.status === 'rate_limited' ? '⚡'
                 : elaboration.status === 'network_error' ? '⚠'
                 : elaboration.result?.severity === 'success' ? '✓'
                 : elaboration.result?.severity === 'warning' ? '⚠'
                 : elaboration.result?.severity === 'info' ? 'ℹ' : '✕'}
              </span>
            )}
            <div style={{ flex: 1 }}>
              <div>
                {elaboration.isValidating ? 'Analyzing response…'
                 : elaboration.apiError ?? elaboration.result?.feedback ?? ''}
              </div>
              {elaboration.result && elaboration.result.score !== undefined && (
                <div className="score-row">
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{
                        transform: `scaleX(${elaboration.result.score / 100})`,
                        background: elaboration.result.severity === 'success' ? 'var(--teal)'
                                  : elaboration.result.severity === 'info' ? 'var(--blue)'
                                  : elaboration.result.severity === 'warning' ? 'var(--amber)'
                                  : 'var(--red)',
                      }}
                    />
                  </div>
                  <span className="score-label">{elaboration.result.score}/100</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scenario buttons */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
          Test Scenarios (Quick-fill)
        </div>
        <div className="scenario-strip">
          {[
            { label: 'Empty', desc: 'EMPTY', value: '' },
            { label: 'Too short', desc: 'TOO_SHORT', value: 'idk' },
            { label: 'Random text', desc: 'RANDOM_TEXT', value: 'asdfjkl;qwerty' },
            { label: 'Spam pattern', desc: 'SPAM', value: 'cancel cancel cancel cancel cancel cancel' },
            { label: 'Low quality', desc: 'LOW_QUALITY', value: 'Too expensive.' },
            { label: 'Acceptable', desc: 'Score 75+', value: 'Our budget got reduced for Q3, so we need to consolidate our tool stack.' },
            { label: 'Excellent', desc: 'Score 90+', value: 'We are restructuring our entire support infrastructure. While we loved Normy\'s interface, we are switching back to our in-house custom tools to satisfy internal privacy audits.' },
          ].map(s => (
            <button key={s.label} type="button" className="scenario-btn" onClick={() => quickFill(s.value)}>
              <span className="sb-label">{s.label}</span>
              <span className="sb-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Would Return (onBlur validation field) */}
      <ValidationField
        id="cancel-return"
        label="What would convince you to return?"
        hint="Optional — this field is validated when you click outside or change focus"
        as="textarea"
        rows={3}
        placeholder="e.g. A specific missing integration, lower price tiers, etc."
        mode="onBlur"
      />

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          Process Cancellation
        </button>
        <button type="button" className="btn btn-glass" onClick={() => {
          elaboration.reset();
        }}>
          Reset Form
        </button>
      </div>
    </form>
  );
}
