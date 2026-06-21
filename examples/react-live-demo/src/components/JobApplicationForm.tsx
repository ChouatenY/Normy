/**
 * Form 2: Job Application
 *
 * Demonstrates:
 *  - Multiple fields with different modes
 *  - onBlur validation for short fields (company name)
 *  - onPause validation for long-form answers (cover letter, skills)
 *  - Network error simulation on the cover letter field
 *  - Full validation gate: must pass all fields to submit
 */

import React, { useState } from 'react';
import { useMockValidation } from '../hooks/useMockValidation';
import { ValidationIndicator } from './ValidationField';

export function JobApplicationForm() {
  const [submitted, setSubmitted] = useState(false);

  // Each field has independent validation state
  const coverLetter  = useMockValidation({ mode: 'onPause', pauseMs: 1200, networkErrorOn: 3 });
  const whyUs        = useMockValidation({ mode: 'onPause', pauseMs: 1000 });
  const skills       = useMockValidation({ mode: 'onBlur' });
  const availability = useMockValidation({ mode: 'onBlur' });

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
    if (allValid) setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="success-state">
        <span className="success-icon">🎉</span>
        <h3>Application submitted!</h3>
        <p>We'll review your answers and get back to you within 3 business days.</p>
        <button className="btn-ghost" onClick={() => setSubmitted(false)}>← Apply again</button>
      </div>
    );
  }

  // Reusable inline feedback
  function FeedbackToast({ validation }: { validation: ReturnType<typeof useMockValidation> }) {
    const { status, result, apiError } = validation;
    if (status === 'idle') return null;

    const isLoading = status === 'validating';
    const isApiErr  = status === 'rate_limited' || status === 'network_error';

    const styleMap: Record<string, React.CSSProperties> = {
      validating:    { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' },
      rate_limited:  { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' },
      network_error: { background: 'rgba(239,68,68,0.08)',  border: '1px solid rgba(239,68,68,0.25)',  color: '#fca5a5' },
      success:       { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' },
      info:          { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' },
      warning:       { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' },
      error:         { background: 'rgba(239,68,68,0.08)',  border: '1px solid rgba(239,68,68,0.25)',  color: '#fca5a5' },
    };

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

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mode-chips">
        <span className="mode-chip pause">⏱ onPause (1.2s)</span>
        <span className="mode-chip blur">👁 onBlur</span>
        <span className="mode-chip submit">🚀 onSubmit gate</span>
      </div>

      <div className="demo-banner info">
        <span>ℹ</span>
        <span>The cover letter simulates a <strong>network error</strong> on the 3rd validation call. Try typing three distinct answers.</span>
      </div>

      {/* Name + Role (no validation — static fields) */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="app-name" className="form-label">Full name <span className="required">*</span></label>
          <input id="app-name" type="text" className="field-input" placeholder="Ada Lovelace" />
        </div>
        <div className="form-group">
          <label htmlFor="app-role" className="form-label">Applying for</label>
          <select id="app-role" className="field-select">
            <option value="swe">Software Engineer</option>
            <option value="pm">Product Manager</option>
            <option value="design">Product Designer</option>
            <option value="data">Data Scientist</option>
          </select>
        </div>
      </div>

      {/* Cover letter — onPause + network error sim */}
      <div className="form-group">
        <label htmlFor="app-cover" className="form-label">
          Cover letter <span className="required">*</span>
          <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-dim)', fontSize: '0.75rem' }}>
            — AI validates after 1.2s pause · 3rd call simulates network error
          </span>
        </label>
        <textarea
          id="app-cover"
          className={`field-textarea ${coverLetter.status === 'error' ? 'has-error' : coverLetter.status === 'success' ? 'has-success' : ''}`}
          rows={5}
          placeholder="Tell us about yourself and why you'd be a great fit for this role…"
          value={coverLetter.value}
          onChange={coverLetter.handleChange}
          onBlur={coverLetter.handleBlur}
        />
        <FeedbackToast validation={coverLetter} />
        <div className="validation-indicators" style={{ marginTop: 6 }}>
          <ValidationIndicator status={coverLetter.status} />
        </div>
      </div>

      {/* Why us — onPause */}
      <div className="form-group">
        <label htmlFor="app-whyus" className="form-label">
          Why do you want to join us? <span className="required">*</span>
          <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-dim)', fontSize: '0.75rem' }}>— onPause</span>
        </label>
        <textarea
          id="app-whyus"
          className={`field-textarea ${whyUs.status === 'error' ? 'has-error' : whyUs.status === 'success' ? 'has-success' : ''}`}
          rows={3}
          placeholder="What excites you about this opportunity?"
          value={whyUs.value}
          onChange={whyUs.handleChange}
          onBlur={whyUs.handleBlur}
        />
        <FeedbackToast validation={whyUs} />
      </div>

      {/* Two columns: skills + availability */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="app-skills" className="form-label">
            Key skills <span className="required">*</span>
            <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-dim)', fontSize: '0.75rem' }}>— onBlur</span>
          </label>
          <input
            id="app-skills" type="text"
            className={`field-input ${skills.status === 'error' ? 'has-error' : skills.status === 'success' ? 'has-success' : ''}`}
            placeholder="TypeScript, React, distributed systems…"
            value={skills.value}
            onChange={skills.handleChange}
            onBlur={skills.handleBlur}
          />
          <FeedbackToast validation={skills} />
        </div>
        <div className="form-group">
          <label htmlFor="app-avail" className="form-label">
            Availability <span className="required">*</span>
            <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-dim)', fontSize: '0.75rem' }}>— onBlur</span>
          </label>
          <input
            id="app-avail" type="text"
            className={`field-input ${availability.status === 'error' ? 'has-error' : availability.status === 'success' ? 'has-success' : ''}`}
            placeholder="e.g. 2 weeks notice, immediate"
            value={availability.value}
            onChange={availability.handleChange}
            onBlur={availability.handleBlur}
          />
          <FeedbackToast validation={availability} />
        </div>
      </div>

      {/* Scenario fill buttons */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🎮 Quick-fill cover letter
        </p>
        <div className="scenario-grid">
          {[
            { label: 'Gibberish', desc: 'RANDOM_TEXT', value: 'asdf jkl qwerty zxcv' },
            { label: 'Spam', desc: 'Repetition', value: 'I want the job I want the job I want the job' },
            { label: 'Too vague', desc: 'LOW_QUALITY', value: 'I think I would do good work here' },
            { label: 'Strong letter', desc: 'Score 90+', value: "I've spent the last 4 years building distributed systems at scale, and I'm genuinely excited about Normy's mission to make AI-powered validation accessible. The combination of TypeScript, Hono, and a thoughtful API design is exactly the kind of craftsmanship I want to contribute to." },
          ].map(s => (
            <button key={s.label} type="button" className="scenario-btn"
              onClick={() => { coverLetter.setValue(s.value); void coverLetter.triggerValidation(); }}>
              <span className="sb-label">{s.label}</span>
              <span className="sb-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-divider" />
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          Submit Application
        </button>
        <button type="button" className="btn-ghost" onClick={() => {
          coverLetter.reset(); whyUs.reset(); skills.reset(); availability.reset();
        }}>
          Reset
        </button>
        {!allValid && (coverLetter.value || whyUs.value) && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: 4 }}>
            All fields must pass validation to submit
          </span>
        )}
      </div>
    </form>
  );
}
