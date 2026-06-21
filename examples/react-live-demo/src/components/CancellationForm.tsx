/**
 * Form 1: Subscription Cancellation
 *
 * Demonstrates:
 *  - onPause (debounced) validation on "reason" textarea
 *  - onBlur validation on the "feedback" textarea
 *  - Rate-limiting simulation after 3 validation calls
 *  - Scenario quick-fill buttons for common bad inputs
 */

import React, { useState } from 'react';
import { useMockValidation, type ValidationStatus } from '../hooks/useMockValidation';
import { ValidationField, ValidationIndicator } from './ValidationField';

const CANCEL_REASONS = [
  { value: '', label: 'Choose a reason…' },
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'found_alternative', label: 'Found a better alternative' },
  { value: 'technical_issues', label: 'Technical issues' },
  { value: 'no_longer_needed', label: 'No longer needed' },
  { value: 'other', label: 'Other' },
];

export function CancellationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [reasonStatus, setReasonStatus] = useState<ValidationStatus>('idle');
  const [feedbackStatus, setFeedbackStatus] = useState<ValidationStatus>('idle');

  // Additional onSubmit validation for the elaboration field
  const elaboration = useMockValidation({ mode: 'onPause', pauseMs: 1200, rateLimitAfter: 4 });

  const canSubmit = !submitted && elaboration.value.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    void elaboration.triggerValidation().then(() => {
      if (elaboration.isValid || elaboration.result?.valid) setSubmitted(true);
    });
  }

  function quickFill(value: string) {
    elaboration.setValue(value);
    // Manually run
    const el = document.getElementById('cancel-elaboration') as HTMLTextAreaElement;
    if (el) { el.value = value; }
    void elaboration.triggerValidation();
  }

  if (submitted) {
    return (
      <div className="success-state">
        <span className="success-icon">💙</span>
        <h3>Subscription cancelled</h3>
        <p>We're sorry to see you go. Your feedback helps us improve Normy for everyone.</p>
        <button className="btn-ghost" onClick={() => setSubmitted(false)}>
          ← Try again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* ── Feature chips ── */}
      <div className="mode-chips">
        <span className="mode-chip pause">⏱ onPause (1.2s)</span>
        <span className="mode-chip blur">👁 onBlur</span>
        <span className="mode-chip submit">🚀 onSubmit gate</span>
      </div>

      {/* ── Rate limit banner ── */}
      <div className="demo-banner warning">
        <span>⚡</span>
        <span>Rate limiting is active on the elaboration field — after 4 validations it returns a 429 so you can see graceful handling.</span>
      </div>

      {/* ── Reason select (no validation, just UX) ── */}
      <div className="form-group">
        <label htmlFor="cancel-reason" className="form-label">
          Primary reason for cancelling <span className="required">*</span>
        </label>
        <select id="cancel-reason" className="field-select" defaultValue="">
          {CANCEL_REASONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* ── Elaboration — onPause + rate-limiting ── */}
      <div className="form-group">
        <label htmlFor="cancel-elaboration" className="form-label">
          Tell us more <span className="required">*</span>
          <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-dim)', fontSize: '0.75rem' }}>
            — AI checks as you pause typing
          </span>
        </label>
        <textarea
          id="cancel-elaboration"
          className={[
            'field-textarea',
            elaboration.status === 'error' ? 'has-error' : elaboration.status === 'success' ? 'has-success' : '',
          ].join(' ')}
          rows={4}
          placeholder="What was the main thing that led to you cancelling today?"
          value={elaboration.value}
          aria-invalid={elaboration.status === 'error'}
          onChange={elaboration.handleChange}
          onBlur={elaboration.handleBlur}
        />
        {/* Inline feedback */}
        {elaboration.status !== 'idle' && (
          <div role={elaboration.status === 'error' ? 'alert' : 'status'} aria-live="polite"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              padding: '9px 14px', borderRadius: '8px', marginTop: '6px',
              fontSize: '0.8125rem', lineHeight: '1.5',
              animation: 'normy-slide-in 150ms ease-out',
              ...(elaboration.status === 'validating'
                ? { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' }
                : elaboration.status === 'rate_limited'
                ? { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }
                : elaboration.status === 'network_error'
                ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }
                : elaboration.result?.severity === 'success'
                ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }
                : elaboration.result?.severity === 'warning'
                ? { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }
                : elaboration.result?.severity === 'info'
                ? { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' }
                : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' })
            }}
          >
            <span style={{
              fontWeight: 700, flexShrink: 0,
              display: 'inline-block',
              animation: elaboration.status === 'validating' ? 'normy-spin 1s linear infinite' : undefined,
            }}>
              {elaboration.status === 'validating' ? '⟳'
               : elaboration.status === 'rate_limited' ? '⚡'
               : elaboration.status === 'network_error' ? '⚠'
               : elaboration.result?.severity === 'success' ? '✓'
               : elaboration.result?.severity === 'warning' ? '⚠'
               : elaboration.result?.severity === 'info' ? 'ℹ' : '✕'}
            </span>
            <span>
              {elaboration.status === 'validating' ? 'Checking your response…'
               : elaboration.apiError ?? elaboration.result?.feedback ?? ''}
            </span>
          </div>
        )}

        {/* Validation status indicator */}
        <div className="validation-indicators" style={{ marginTop: 8 }}>
          <ValidationIndicator status={elaboration.status} />
        </div>
      </div>

      {/* ── Scenario quick-fill ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🎮 Test scenarios
        </p>
        <div className="scenario-grid">
          {[
            { label: 'Empty', desc: 'Triggers EMPTY', value: '' },
            { label: 'Too short', desc: 'Triggers TOO_SHORT', value: 'idk' },
            { label: 'Random text', desc: 'Triggers RANDOM_TEXT', value: 'asdfjkl;qwerty' },
            { label: 'Spam', desc: 'Triggers SPAM', value: 'bad bad bad bad bad bad' },
            { label: 'Low quality', desc: 'Triggers LOW_QUALITY', value: 'It was okay I guess' },
            { label: 'Good answer', desc: 'Scores 90+', value: 'The pricing model does not align with our current budget constraints after the recent restructuring. We\'ve had a great experience with the product quality but cannot justify the renewal at this time.' },
          ].map(s => (
            <button key={s.label} type="button" className="scenario-btn" onClick={() => quickFill(s.value)}>
              <span className="sb-label">{s.label}</span>
              <span className="sb-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Would return field — onBlur ── */}
      <ValidationField
        id="cancel-return"
        label="What would bring you back?"
        hint="Optional — validated when you click away"
        as="textarea"
        rows={3}
        placeholder="e.g. Lower pricing, a specific feature, better onboarding…"
        mode="onBlur"
        onStatusChange={setFeedbackStatus}
      />
      <div className="validation-indicators" style={{ marginTop: -10, marginBottom: 16 }}>
        <ValidationIndicator status={feedbackStatus} />
        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: 4 }}>onBlur mode — fires when you leave the field</span>
      </div>

      <div className="form-divider" />

      <div className="form-actions">
        <button type="submit" className="btn-danger" disabled={!canSubmit}>
          Cancel Subscription
        </button>
        <button type="button" className="btn-ghost" onClick={() => {
          elaboration.reset();
          setReasonStatus('idle');
          setFeedbackStatus('idle');
        }}>
          Reset Demo
        </button>
        {reasonStatus}
      </div>
    </form>
  );
}
