import React, { useState } from 'react';
import { useValidation } from '@normy-validation/react';

export function SurveyForm() {
  const [submitted, setSubmitted] = useState(false);

  const goal = useValidation({
    mode: 'onPause',
    pauseMs: 1200,
    question: 'What is your main goal for using this software?',
  });

  const canSubmit = !submitted && goal.value.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    void goal.triggerValidation().then(() => {
      if (goal.isValid || goal.result?.valid) {
        setSubmitted(true);
      }
    });
  }

  function quickFill(value: string) {
    goal.setValue(value);
    goal.handleChange({ target: { value } } as any);
  }

  if (submitted) {
    return (
      <div className="success-screen">
        <div className="success-mark">✓</div>
        <h3>Goal Submitted</h3>
        <p>Thank you! Your feedback will help us improve our developer features.</p>
        <button className="btn btn-glass" onClick={() => {
          setSubmitted(false);
          goal.reset();
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

      <div className="field-group">
        <label htmlFor="survey-goal" className="field-label">
          <span>Main Goal <span style={{ color: 'var(--red)' }}>*</span></span>
          <span className="mode-tag">onPause</span>
        </label>
        <textarea
          id="survey-goal"
          className={[
            'field-textarea',
            goal.status === 'error' ? 'has-error' : goal.status === 'success' ? 'has-success' : '',
            goal.status === 'validating' ? 'is-validating' : '',
          ].join(' ')}
          rows={4}
          placeholder="Please explain what you hope to accomplish by integrating this tool."
          value={goal.value}
          onChange={goal.handleChange}
          onBlur={goal.handleBlur}
        />

        {goal.status !== 'idle' && (
          <div
            role={goal.status === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`v-feedback ${
              goal.status === 'validating' ? 'validating'
              : goal.status === 'rate_limited' ? 'rate-limit'
              : goal.status === 'network_error' ? 'network-error'
              : goal.result?.severity ?? 'error'
            }`}
          >
            {goal.status === 'validating' ? (
              <span className="v-feedback-spinner" />
            ) : (
              <span className="v-feedback-icon">
                {goal.status === 'rate_limited' ? '⚡'
                 : goal.status === 'network_error' ? '⚠'
                 : goal.result?.severity === 'success' ? '✓'
                 : goal.result?.severity === 'warning' ? '⚠'
                 : goal.result?.severity === 'info' ? 'ℹ' : '✕'}
              </span>
            )}
            <div style={{ flex: 1 }}>
              <div>
                {goal.status === 'validating' ? 'Analyzing your answer…'
                 : goal.apiError ?? goal.result?.feedback ?? ''}
              </div>
              {goal.result && goal.result.score !== undefined && (
                <div className="score-row">
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{
                        transform: `scaleX(${goal.result.score / 100})`,
                        background: goal.result.severity === 'success' ? '#fff'
                                  : goal.result.severity === 'info' ? '#aaa'
                                  : goal.result.severity === 'warning' ? '#666'
                                  : '#333',
                      }}
                    />
                  </div>
                  <span className="score-label">{goal.result.score}/100</span>
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
            { label: 'Vague Goal', desc: 'Score 30-49', value: 'none' },
            { label: 'Meaningful Goal', desc: 'Score 80-100', value: 'To automate real-time form validation and get detailed analytics on user input improvements.' },
          ].map(s => (
            <button key={s.label} type="button" className="scenario-btn" onClick={() => quickFill(s.value)}>
              <span className="sb-label">{s.label}</span>
              <span className="sb-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          Save Goal
        </button>
        <button type="button" className="btn btn-glass" onClick={() => {
          goal.reset();
        }}>
          Reset
        </button>
      </div>
    </form>
  );
}
