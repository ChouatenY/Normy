import React, { useState } from 'react';
import { useValidation } from '@normy/react';

export function GovernmentForm() {
  const [submitted, setSubmitted] = useState(false);

  const address = useValidation({
    mode: 'onPause',
    pauseMs: 1200,
    question: 'What is your primary residential address?',
  });

  const canSubmit = !submitted && address.value.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    void address.triggerValidation().then(() => {
      if (address.isValid || address.result?.valid) {
        setSubmitted(true);
      }
    });
  }

  function quickFill(value: string) {
    address.setValue(value);
    address.handleChange({ target: { value } } as any);
  }

  if (submitted) {
    return (
      <div className="success-screen">
        <div className="success-mark">✓</div>
        <h3>Address Submitted</h3>
        <p>Your official residential details have been updated in the records.</p>
        <button className="btn btn-glass" onClick={() => {
          setSubmitted(false);
          address.reset();
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
        <label htmlFor="gov-address" className="field-label">
          <span>Primary Residential Address <span style={{ color: 'var(--red)' }}>*</span></span>
          <span className="mode-tag">onPause</span>
        </label>
        <textarea
          id="gov-address"
          className={[
            'field-textarea',
            address.status === 'error' ? 'has-error' : address.status === 'success' ? 'has-success' : '',
            address.status === 'validating' ? 'is-validating' : '',
          ].join(' ')}
          rows={4}
          placeholder="Please type your full official mailing and physical address."
          value={address.value}
          onChange={address.handleChange}
          onBlur={address.handleBlur}
        />

        {address.status !== 'idle' && (
          <div
            role={address.status === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`v-feedback ${
              address.status === 'validating' ? 'validating'
              : address.status === 'rate_limited' ? 'rate-limit'
              : address.status === 'network_error' ? 'network-error'
              : address.result?.severity ?? 'error'
            }`}
          >
            {address.status === 'validating' ? (
              <span className="v-feedback-spinner" />
            ) : (
              <span className="v-feedback-icon">
                {address.status === 'rate_limited' ? '⚡'
                 : address.status === 'network_error' ? '⚠'
                 : address.result?.severity === 'success' ? '✓'
                 : address.result?.severity === 'warning' ? '⚠'
                 : address.result?.severity === 'info' ? 'ℹ' : '✕'}
              </span>
            )}
            <div style={{ flex: 1 }}>
              <div>
                {address.status === 'validating' ? 'Analyzing address format…'
                 : address.apiError ?? address.result?.feedback ?? ''}
              </div>
              {address.result && address.result.score !== undefined && (
                <div className="score-row">
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{
                        transform: `scaleX(${address.result.score / 100})`,
                        background: address.result.severity === 'success' ? '#fff'
                                  : address.result.severity === 'info' ? '#aaa'
                                  : address.result.severity === 'warning' ? '#666'
                                  : '#333',
                      }}
                    />
                  </div>
                  <span className="score-label">{address.result.score}/100</span>
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
            { label: 'Too short', desc: 'LOW_QUALITY', value: 'abc' },
            { label: 'Vague Address', desc: 'Score 30-79', value: 'I live in the forest near the lake.' },
            { label: 'Valid Address', desc: 'Score 80-100', value: '123 Main Street, Springfield, OR 97477' },
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
          Save Address Details
        </button>
        <button type="button" className="btn btn-glass" onClick={() => {
          address.reset();
        }}>
          Reset
        </button>
      </div>
    </form>
  );
}
