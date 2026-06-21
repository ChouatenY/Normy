/**
 * Form 3: Customer Feedback
 *
 * Demonstrates:
 *  - Star rating UI
 *  - onPause validation for the main feedback textarea
 *  - onBlur for the improvement suggestion field
 *  - All four severity levels: success, info, warning, error
 *  - Full submission gating
 */

import React, { useState } from 'react';
import { useMockValidation } from '../hooks/useMockValidation';
import { ValidationIndicator } from './ValidationField';

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px',
            fontSize: '1.75rem', lineHeight: 1,
            color: star <= (hovered || value) ? '#f59e0b' : 'var(--border-light)',
            transition: 'color 100ms ease, transform 100ms ease',
            transform: star <= (hovered || value) ? 'scale(1.1)' : 'scale(1)',
          }}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 6 }}>
          {['', 'Terrible', 'Poor', 'OK', 'Good', 'Excellent'][value]}
        </span>
      )}
    </div>
  );
}

export function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const mainFeedback   = useMockValidation({ mode: 'onPause', pauseMs: 1000 });
  const improvement    = useMockValidation({ mode: 'onBlur' });
  const recommendation = useMockValidation({ mode: 'onPause', pauseMs: 800 });

  const canSubmit = rating > 0 && mainFeedback.value.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await mainFeedback.triggerValidation();
    if (mainFeedback.isValid || (mainFeedback.result?.score ?? 0) > 40) {
      setSubmitted(true);
    }
  }

  // Reusable minimal toast
  function MiniToast({ validation }: { validation: ReturnType<typeof useMockValidation> }) {
    const { status, result, apiError } = validation;
    if (status === 'idle') return null;

    const styleMap: Record<string, React.CSSProperties> = {
      validating:    { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' },
      rate_limited:  { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' },
      network_error: { background: 'rgba(239,68,68,0.08)',  border: '1px solid rgba(239,68,68,0.25)',  color: '#fca5a5' },
      success:       { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' },
      info:          { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' },
      warning:       { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' },
      error:         { background: 'rgba(239,68,68,0.08)',  border: '1px solid rgba(239,68,68,0.25)',  color: '#fca5a5' },
    };

    const isLoading = status === 'validating';
    const isApiErr  = status === 'rate_limited' || status === 'network_error';
    const key = isLoading ? 'validating' : isApiErr ? status : (result?.severity ?? 'error');
    const icon = isLoading ? '⟳' : isApiErr ? '⚡' : result?.severity === 'success' ? '✓' : result?.severity === 'info' ? 'ℹ' : result?.severity === 'warning' ? '⚠' : '✕';
    const msg  = isLoading ? 'Checking your response…' : (apiError ?? result?.feedback ?? '');

    return (
      <div role={status === 'error' ? 'alert' : 'status'} aria-live="polite" style={{
        display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '9px 14px',
        borderRadius: '8px', marginTop: '6px', fontSize: '0.8125rem', lineHeight: '1.5',
        animation: 'normy-slide-in 150ms ease-out', ...styleMap[key],
      }}>
        <span style={{ fontWeight: 700, flexShrink: 0, display: 'inline-block',
          animation: isLoading ? 'normy-spin 1s linear infinite' : undefined }}>{icon}</span>
        <span>{msg}</span>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="success-state">
        <span className="success-icon">🌟</span>
        <h3>Thanks for your feedback!</h3>
        <p>Your input helps us make Normy better for everyone. We really appreciate it.</p>
        <button className="btn-ghost" onClick={() => {
          setSubmitted(false); setRating(0);
          mainFeedback.reset(); improvement.reset(); recommendation.reset();
        }}>
          ← Submit another
        </button>
      </div>
    );
  }

  // Score display for debugging
  const score = mainFeedback.result?.score;
  const severity = mainFeedback.result?.severity;
  const severityColors: Record<string, string> = { success: '#6ee7b7', info: '#93c5fd', warning: '#fcd34d', error: '#fca5a5' };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mode-chips">
        <span className="mode-chip pause">⏱ onPause (1s)</span>
        <span className="mode-chip blur">👁 onBlur</span>
        <span className="mode-chip submit">🚀 gated submit</span>
      </div>

      <div className="demo-banner info">
        <span>ℹ</span>
        <span>This form shows all <strong>four severity levels</strong> in action. Try different answer lengths and quality levels to trigger success, info, warning, and error toasts.</span>
      </div>

      {/* Star rating */}
      <div className="form-group">
        <label className="form-label">Overall rating <span className="required">*</span></label>
        <StarRating value={rating} onChange={setRating} />
        {rating === 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 5 }}>
            Click to rate your experience
          </p>
        )}
      </div>

      {/* Main feedback — onPause */}
      <div className="form-group">
        <label htmlFor="fb-main" className="form-label">
          Your feedback <span className="required">*</span>
          <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-dim)', fontSize: '0.75rem' }}>
            — AI validates after 1s pause
          </span>
        </label>
        <textarea
          id="fb-main"
          className={`field-textarea ${mainFeedback.status === 'error' ? 'has-error' : mainFeedback.status === 'success' ? 'has-success' : mainFeedback.status === 'network_error' ? 'has-error' : ''}`}
          rows={4}
          placeholder="What did you think about our product? What worked well, what didn't?"
          value={mainFeedback.value}
          onChange={mainFeedback.handleChange}
          onBlur={mainFeedback.handleBlur}
        />
        <MiniToast validation={mainFeedback} />

        {/* Score display */}
        {score !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${score}%`, borderRadius: 4,
                background: severity ? severityColors[severity] : 'var(--accent)',
                transition: 'width 400ms ease',
              }} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: severity ? severityColors[severity] : 'var(--text-muted)' }}>
              {score}/100
            </span>
          </div>
        )}

        <div className="validation-indicators" style={{ marginTop: 6 }}>
          <ValidationIndicator status={mainFeedback.status} />
          {mainFeedback.result?.feedbackCategory && mainFeedback.result.feedbackCategory !== 'valid' && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              category: {mainFeedback.result.feedbackCategory}
            </span>
          )}
        </div>
      </div>

      {/* Improvement — onBlur */}
      <div className="form-group">
        <label htmlFor="fb-improve" className="form-label">
          What could we improve?
          <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-dim)', fontSize: '0.75rem' }}>— onBlur</span>
        </label>
        <textarea
          id="fb-improve"
          className={`field-textarea ${improvement.status === 'error' ? 'has-error' : improvement.status === 'success' ? 'has-success' : ''}`}
          rows={3}
          placeholder="Any features, UX improvements, or pain points you'd like to highlight?"
          value={improvement.value}
          onChange={improvement.handleChange}
          onBlur={improvement.handleBlur}
        />
        <MiniToast validation={improvement} />
      </div>

      {/* Recommendation — onPause */}
      <div className="form-group">
        <label htmlFor="fb-recommend" className="form-label">
          Would you recommend us to a colleague?
          <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-dim)', fontSize: '0.75rem' }}>— onPause (0.8s)</span>
        </label>
        <input
          id="fb-recommend" type="text"
          className={`field-input ${recommendation.status === 'error' ? 'has-error' : recommendation.status === 'success' ? 'has-success' : ''}`}
          placeholder="Yes, because… / No, because…"
          value={recommendation.value}
          onChange={recommendation.handleChange}
          onBlur={recommendation.handleBlur}
        />
        <MiniToast validation={recommendation} />
      </div>

      {/* Scenario buttons */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🎮 All 4 severity levels — quick fill feedback
        </p>
        <div className="scenario-grid">
          {[
            {
              label: '✕ Error',
              desc: 'score 0 — empty/gibberish',
              value: 'asdf', color: 'rgba(239,68,68,0.15)',
            },
            {
              label: '⚠ Warning',
              desc: 'score 30–49 — too vague',
              value: 'It was fine I think',
              color: 'rgba(245,158,11,0.12)',
            },
            {
              label: 'ℹ Info',
              desc: 'score 50–79 — decent',
              value: 'The product works well for most of my daily tasks.',
              color: 'rgba(59,130,246,0.12)',
            },
            {
              label: '✓ Success',
              desc: 'score 80+ — excellent',
              value: "Normy's real-time validation has dramatically improved our form completion rates. The AI feedback is contextual and helpful — users feel guided rather than blocked. The toast system is elegant and unobtrusive.",
              color: 'rgba(16,185,129,0.12)',
            },
          ].map(s => (
            <button
              key={s.label}
              type="button"
              className="scenario-btn"
              style={{ background: s.color }}
              onClick={() => { mainFeedback.setValue(s.value); void mainFeedback.triggerValidation(); }}
            >
              <span className="sb-label">{s.label}</span>
              <span className="sb-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-divider" />
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          Submit Feedback
        </button>
        <button type="button" className="btn-ghost" onClick={() => {
          setRating(0); mainFeedback.reset(); improvement.reset(); recommendation.reset();
        }}>
          Reset
        </button>
        {!canSubmit && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {rating === 0 ? 'Please select a star rating' : 'Add your feedback to submit'}
          </span>
        )}
      </div>
    </form>
  );
}
