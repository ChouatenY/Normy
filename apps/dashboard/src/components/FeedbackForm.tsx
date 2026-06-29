/**
 * Form 3: Customer Feedback
 *
 * Demonstrates:
 *  - Premium Star rating UI
 *  - onPause validation for the main feedback textarea
 *  - onBlur for the improvement suggestion field
 *  - All four severity levels: success, info, warning, error
 *  - Full submission gating
 */

import React, { useState } from 'react';
import { useValidation } from '@normy-validation/react';

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className={`star-btn ${star <= (hovered || value) ? 'active' : ''}`}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)', alignSelf: 'center', marginLeft: 8, fontFamily: 'var(--mono)' }}>
          {['', 'Terrible', 'Needs Work', 'Acceptable', 'Very Good', 'Exceptional'][value]}
        </span>
      )}
    </div>
  );
}

export function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const ratingLabel = rating > 0 ? ['', 'Terrible', 'Needs Work', 'Acceptable', 'Very Good', 'Exceptional'][rating] : 'none';

  const mainFeedback   = useValidation({
    mode: 'onPause',
    pauseMs: 1000,
    question: 'What is your honest feedback about our product interface?',
    fieldContext: `The user selected a star rating of ${rating}/5 (${ratingLabel}). Validate if their feedback matches this rating level or contradicts it.`
  });
  const improvement    = useValidation({ mode: 'onBlur', question: 'What specific feature or flow would you suggest we improve?' });
  const recommendation = useValidation({ mode: 'onPause', pauseMs: 800, question: 'Would you recommend this tool to your team?' });

  // Re-trigger text validation when star rating changes to keep rating/text correlation real-time!
  React.useEffect(() => {
    if (rating > 0 && mainFeedback.value.trim().length > 0) {
      mainFeedback.triggerValidation();
    }
  }, [rating]);

  const canSubmit = rating > 0 && mainFeedback.value.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await Promise.all([
      mainFeedback.triggerValidation(),
      improvement.triggerValidation(),
      recommendation.triggerValidation(),
    ]);

    if (mainFeedback.isValid) {
      setSubmitted(true);
    }
  }

  function quickFill(value: string) {
    mainFeedback.setValue(value);
    mainFeedback.handleChange({ target: { value } } as any);
  }

  // Reusable editorial toast
  function MiniToast({ validation }: { validation: any }) {
    const { status, result, apiError } = validation;
    if (status === 'idle') return null;

    const isLoading = status === 'validating';
    const styleClass = isLoading ? 'validating' : (result?.severity ?? 'error');
    const icon = isLoading ? '⟳' : result?.severity === 'success' ? '✓' : result?.severity === 'info' ? 'ℹ' : result?.severity === 'warning' ? '⚠' : '✕';
    const msg  = isLoading ? 'Analyzing response…' : (apiError ?? result?.feedback ?? '');

    return (
      <div
        role={status === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        className={`v-feedback ${styleClass}`}
      >
        {isLoading ? (
          <span className="v-feedback-spinner" />
        ) : (
          <span className="v-feedback-icon">{icon}</span>
        )}
        <div style={{ flex: 1 }}>
          <div>{msg}</div>
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

  if (submitted) {
    return (
      <div className="success-screen">
        <div className="success-mark">✓</div>
        <h3>Feedback Received</h3>
        <p>Thank you for submitting your evaluation. We review all entries in detail.</p>
        <button className="btn btn-glass" onClick={() => {
          setSubmitted(false);
          setRating(0);
          mainFeedback.reset();
          improvement.reset();
          recommendation.reset();
        }}>
          ← Submit Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mode-badges">
        <span className="mode-badge pause">⏱ onPause (1.0s)</span>
        <span className="mode-badge blur">👁 onBlur</span>
        <span className="mode-badge submit">🚀 Gated Submit</span>
      </div>

      <div className="v-feedback info" style={{ marginBottom: 24 }}>
        <span className="v-feedback-icon">ℹ</span>
        <div>
          This form shows all <strong>four severity levels</strong> (error, warning, info, success) dynamically calculated by the AI engine based on response depth and semantic value.
        </div>
      </div>

      {/* Star Rating */}
      <div className="field-group">
        <label className="field-label">Overall Experience <span style={{ color: 'var(--red)' }}>*</span></label>
        <StarRating value={rating} onChange={setRating} />
        {rating === 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
            Select a rating rating to begin
          </p>
        )}
      </div>

      {/* Main Feedback (onPause) */}
      <div className="field-group">
        <label htmlFor="fb-main" className="field-label">
          <span>Detailed feedback <span style={{ color: 'var(--red)' }}>*</span></span>
          <span className="mode-tag">onPause</span>
        </label>
        <textarea
          id="fb-main"
          className={[
            'field-textarea',
            mainFeedback.status === 'error' ? 'has-error' : mainFeedback.status === 'success' ? 'has-success' : '',
            mainFeedback.status === 'validating' ? 'is-validating' : '',
          ].join(' ')}
          rows={4}
          placeholder="Please describe your experience, highlighting any issues or standout features you observed."
          value={mainFeedback.value}
          onChange={mainFeedback.handleChange}
          onBlur={mainFeedback.handleBlur}
        />
        <MiniToast validation={mainFeedback} />
      </div>

      {/* Scenario Buttons */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
          Test Severity Thresholds (Quick-fill)
        </div>
        <div className="scenario-strip">
          {[
            {
              label: '✕ Error',
              desc: 'Score < 30',
              value: 'asdfqwertyuiop',
            },
            {
              label: '⚠ Warning',
              desc: 'Score 30–49',
              value: 'It was pretty good.',
            },
            {
              label: 'ℹ Info',
              desc: 'Score 50–79',
              value: 'The application loaded quickly, but I found the search button slightly hard to locate on smaller mobile viewports.',
            },
            {
              label: '✓ Success',
              desc: 'Score 80+',
              value: 'The transition animations between steps are incredibly smooth. I really appreciate the keyboard accessibility options and clear tab index configurations across all forms. Truly exceptional design quality.',
            },
          ].map(s => (
            <button
              key={s.label}
              type="button"
              className="scenario-btn"
              onClick={() => quickFill(s.value)}
            >
              <span className="sb-label">{s.label}</span>
              <span className="sb-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Improvement (onBlur) */}
      <div className="field-group">
        <label htmlFor="fb-improve" className="field-label">
          <span>Suggested improvements</span>
          <span className="mode-tag">onBlur</span>
        </label>
        <textarea
          id="fb-improve"
          className={[
            'field-textarea',
            improvement.status === 'error' ? 'has-error' : improvement.status === 'success' ? 'has-success' : '',
            improvement.status === 'validating' ? 'is-validating' : '',
          ].join(' ')}
          rows={3}
          placeholder="What specific changes would improve your experience?"
          value={improvement.value}
          onChange={improvement.handleChange}
          onBlur={improvement.handleBlur}
        />
        <MiniToast validation={improvement} />
      </div>

      {/* Recommendation (onPause) */}
      <div className="field-group">
        <label htmlFor="fb-recommend" className="field-label">
          <span>Would you recommend us to colleagues?</span>
          <span className="mode-tag">onPause</span>
        </label>
        <input
          id="fb-recommend"
          type="text"
          className={[
            'field-input',
            recommendation.status === 'error' ? 'has-error' : recommendation.status === 'success' ? 'has-success' : '',
            recommendation.status === 'validating' ? 'is-validating' : '',
          ].join(' ')}
          placeholder="Yes / No (and brief reasoning)"
          value={recommendation.value}
          onChange={recommendation.handleChange}
          onBlur={recommendation.handleBlur}
        />
        <MiniToast validation={recommendation} />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          Submit Feedback
        </button>
        <button type="button" className="btn btn-glass" onClick={() => {
          setRating(0);
          mainFeedback.reset();
          improvement.reset();
          recommendation.reset();
        }}>
          Reset Form
        </button>
        {!canSubmit && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
            {rating === 0 ? 'Select a rating to proceed' : 'Enter feedback text'}
          </span>
        )}
      </div>
    </form>
  );
}
