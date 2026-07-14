/**
 * Form 2: Job Application
 *
 * Demonstrates:
 *  - Multiple fields with different modes
 *  - onBlur validation for short fields (skills, availability)
 *  - onPause validation for long-form answers (cover letter, why us)
 *  - Network error simulation on the cover letter field
 *  - Full validation gate: must pass all fields to submit
 */

import React, { useState } from 'react';
import { useValidation } from '@normy-validation/react';

export function JobApplicationForm() {
  const [submitted, setSubmitted] = useState(false);

  // Validation configurations
  const coverLetter  = useValidation({ mode: 'onPause', pauseMs: 1200, question: 'Please share your cover letter describing your fit.' });
  const whyUs        = useValidation({ mode: 'onPause', pauseMs: 1000, question: 'Why do you want to join our engineering organization?' });
  const skills       = useValidation({ mode: 'onBlur', question: 'List your core professional skills.' });
  const availability = useValidation({ mode: 'onBlur', question: 'What is your start date or notice period?' });

  const allValid =
    coverLetter.isValid &&
    whyUs.isValid &&
    skills.value.trim().length > 0 &&
    availability.value.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Run onSubmit validation on fields that haven't been touched yet
    await Promise.all([
      coverLetter.triggerValidation(),
      whyUs.triggerValidation(),
      skills.triggerValidation(),
      availability.triggerValidation(),
    ]);

    if (allValid) {
      setSubmitted(true);
    }
  }

  function quickFillCover(value: string) {
    coverLetter.setValue(value);
    coverLetter.handleChange({ target: { value } } as any);
  }

  // Reusable inline feedback
  function FeedbackToast({ validation }: { validation: any }) {
    const { status, result, apiError } = validation;
    if (status === 'idle') return null;

    const isLoading = status === 'checking_ai';
    const isApiErr  = status === 'rate_limited' || status === 'network_error';
    const styleClass = isLoading ? 'validating' : isApiErr ? status : (result?.severity ?? 'error');
    const icon = isLoading ? '⟳' : isApiErr ? '⚡' : result?.severity === 'success' ? '✓' : result?.severity === 'info' ? 'ℹ' : result?.severity === 'warning' ? '⚠' : '✕';
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
        <h3>Application Filed</h3>
        <p>Your materials have been received. We will contact you regarding next steps shortly.</p>
        <button className="btn btn-glass" onClick={() => {
          setSubmitted(false);
          coverLetter.reset();
          whyUs.reset();
          skills.reset();
          availability.reset();
        }}>
          ← Apply Again
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

      <div className="v-feedback info" style={{ marginBottom: 24 }}>
        <span className="v-feedback-icon">📡</span>
        <div>
          The cover letter input simulates a mock network communication error on the 3rd attempt to show how Normy handles transient outages without blocking inputs.
        </div>
      </div>

      {/* Name + Role */}
      <div className="form-row">
        <div className="field-group">
          <label htmlFor="app-name" className="field-label">Full Name <span style={{ color: 'var(--red)' }}>*</span></label>
          <input id="app-name" type="text" className="field-input" placeholder="e.g. Marie Curie" required />
        </div>
        <div className="field-group">
          <label htmlFor="app-role" className="field-label">Target Role</label>
          <select id="app-role" className="field-select">
            <option value="swe">Principal Engineer</option>
            <option value="pm">Product Lead</option>
            <option value="design">Design Director</option>
            <option value="data">Principal Data Scientist</option>
          </select>
        </div>
      </div>

      {/* Cover Letter (onPause + network error) */}
      <div className="field-group">
        <label htmlFor="app-cover" className="field-label">
          <span>Cover Letter <span style={{ color: 'var(--red)' }}>*</span></span>
          <span className="mode-tag">onPause</span>
        </label>
        <textarea
          id="app-cover"
          className={[
            'field-textarea',
            coverLetter.status === 'error' ? 'has-error' : coverLetter.status === 'success' ? 'has-success' : '',
            coverLetter.status === 'checking_ai' ? 'is-validating' : '',
          ].join(' ')}
          rows={5}
          placeholder="Briefly describe your fit and relevant experiences."
          value={coverLetter.value}
          onChange={coverLetter.handleChange}
          onBlur={coverLetter.handleBlur}
        />
        <FeedbackToast validation={coverLetter} />
      </div>

      {/* Scenario Buttons */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
          Test Cover Letter Scenarios (Quick-fill)
        </div>
        <div className="scenario-strip">
          {[
            { label: 'Gibberish', desc: 'RANDOM_TEXT', value: 'qwertyuiopasdfghjklzxcvbnm' },
            { label: 'Repetitive', desc: 'SPAM', value: 'Please hire me. Please hire me. Please hire me. Please hire me. Please hire me.' },
            { label: 'Vague text', desc: 'LOW_QUALITY', value: 'I want this role.' },
            { label: 'Strong input', desc: 'Score 90+', value: 'I have over six years of experience building secure React SDKs and Node.js backend infrastructure. I appreciate Normy\'s emphasis on form accessibility and real-time semantic analysis to guide users.' },
          ].map(s => (
            <button
              key={s.label}
              type="button"
              className="scenario-btn"
              onClick={() => quickFillCover(s.value)}
            >
              <span className="sb-label">{s.label}</span>
              <span className="sb-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Why Us (onPause) */}
      <div className="field-group">
        <label htmlFor="app-whyus" className="field-label">
          <span>Why are you interested in our organization? <span style={{ color: 'var(--red)' }}>*</span></span>
          <span className="mode-tag">onPause</span>
        </label>
        <textarea
          id="app-whyus"
          className={[
            'field-textarea',
            whyUs.status === 'error' ? 'has-error' : whyUs.status === 'success' ? 'has-success' : '',
            whyUs.status === 'checking_ai' ? 'is-validating' : '',
          ].join(' ')}
          rows={3}
          placeholder="What draws you to this role?"
          value={whyUs.value}
          onChange={whyUs.handleChange}
          onBlur={whyUs.handleBlur}
        />
        <FeedbackToast validation={whyUs} />
      </div>

      {/* Two columns: skills + availability */}
      <div className="form-row">
        <div className="field-group">
          <label htmlFor="app-skills" className="field-label">
            <span>Key Skills <span style={{ color: 'var(--red)' }}>*</span></span>
            <span className="mode-tag">onBlur</span>
          </label>
          <input
            id="app-skills"
            type="text"
            className={[
              'field-input',
              skills.status === 'error' ? 'has-error' : skills.status === 'success' ? 'has-success' : '',
              skills.status === 'checking_ai' ? 'is-validating' : '',
            ].join(' ')}
            placeholder="TypeScript, React, Hono, OpenAPI…"
            value={skills.value}
            onChange={skills.handleChange}
            onBlur={skills.handleBlur}
          />
          <FeedbackToast validation={skills} />
        </div>
        <div className="field-group">
          <label htmlFor="app-avail" className="field-label">
            <span>Notice Period / Start Date <span style={{ color: 'var(--red)' }}>*</span></span>
            <span className="mode-tag">onBlur</span>
          </label>
          <input
            id="app-avail"
            type="text"
            className={[
              'field-input',
              availability.status === 'error' ? 'has-error' : availability.status === 'success' ? 'has-success' : '',
              availability.status === 'checking_ai' ? 'is-validating' : '',
            ].join(' ')}
            placeholder="e.g. Immediate / 2 weeks notice"
            value={availability.value}
            onChange={availability.handleChange}
            onBlur={availability.handleBlur}
          />
          <FeedbackToast validation={availability} />
        </div>
      </div>

      <div className="form-divider" />
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Submit Application
        </button>
        <button type="button" className="btn btn-glass" onClick={() => {
          coverLetter.reset();
          whyUs.reset();
          skills.reset();
          availability.reset();
        }}>
          Reset Form
        </button>
        {!allValid && (coverLetter.value || whyUs.value) && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
            Please resolve any validation notices to submit.
          </span>
        )}
      </div>
    </form>
  );
}
