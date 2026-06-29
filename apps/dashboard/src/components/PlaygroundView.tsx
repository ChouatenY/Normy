'use client';

import React, { useState } from 'react';
import { CodeBlock } from './CodeBlock';

interface PlaygroundViewProps {
  apiKey?: string;
  projectId?: string;
}

export function PlaygroundView({ apiKey = 'nrm_test_default_key', projectId = 'proj_default' }: PlaygroundViewProps) {
  const [question, setQuestion] = useState('Why are you cancelling your subscription?');
  const [answer, setAnswer] = useState('I do not need it anymore because it lacks some key metrics.');
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleValidate = async () => {
    setLoading(true);
    setResult(null);
    setToastMessage(null);

    const apiUrl = process.env.NEXT_PUBLIC_NORMY_API_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${apiUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          projectId,
          question,
          answer,
          provider,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      if (data.feedback) {
        setToastMessage(data.feedback);
      }
    } catch (err: any) {
      console.warn('API call failed, falling back to local simulation:', err);
      // Fallback local simulation
      const mockScore = answer.length < 15 ? 40 : 92;
      const mockData = {
        valid: mockScore >= 70,
        score: mockScore,
        confidence: 0.88,
        severity: mockScore < 70 ? 'warning' : 'success',
        issueType: mockScore < 70 ? 'too_short' : 'clear',
        feedback: mockScore < 70 
          ? 'Your answer is a bit too short. Please elaborate to help us improve.' 
          : 'Thank you! Your explanation is perfectly clear.',
        suggestions: mockScore < 70 ? ['Describe what specific features were missing'] : [],
      };
      setResult(mockData);
      setToastMessage(mockData.feedback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }} className="playground-grid">
      
      {/* ── Left Form Input Panel ── */}
      <div className="card-glass">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 20, color: 'var(--white)' }}>
          Validation Inputs
        </h3>

        <div className="input-group">
          <label className="input-label">Question / Context</label>
          <input
            type="text"
            className="input-field"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Please outline your residential address"
          />
        </div>

        <div className="input-group">
          <label className="input-label">User Answer</label>
          <textarea
            className="input-field"
            rows={5}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="e.g. My house is the second one in the forest"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="input-group" style={{ marginBottom: 28 }}>
          <label className="input-label">AI Model Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as any)}
            className="input-field"
            style={{ cursor: 'pointer' }}
          >
            <option value="gemini">Gemini (Default)</option>
            <option value="openai">OpenAI GPT</option>
            <option value="anthropic">Anthropic Claude</option>
          </select>
        </div>

        {/* Liquid Metal Validate Button */}
        <button
          onClick={handleValidate}
          disabled={loading}
          className="btn-liquid-metal"
          style={{ width: '100%', border: 'none', backgroundSize: '300% 300%' }}
        >
          <span className="btn-liquid-metal-inner" style={{ width: '100%' }}>
            {loading ? 'Validating Input...' : 'Validate Input'}
          </span>
        </button>
      </div>

      {/* ── Right Output / Preview Panel ── */}
      <div>
        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Summary Metrics */}
            <div className="card-glass" style={{ marginBottom: 0 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--white)' }}>
                Result Summary
              </h3>

              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ flex: 1, textAlign: 'center', padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Score</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: result.valid ? 'var(--teal)' : 'var(--red)' }}>
                    {result.score}/100
                  </div>
                </div>

                <div style={{ flex: 1, textAlign: 'center', padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Confidence</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--white)' }}>
                    {Math.round(result.confidence * 100)}%
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 12, flexDirection: 'column' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sec)' }}>Status: </span>
                  <span style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: result.valid ? 'var(--teal)' : 'var(--red)',
                    textTransform: 'uppercase'
                  }}>
                    {result.valid ? 'VALIDATED' : 'FLAGGED'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sec)' }}>Feedback: </span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text)', marginTop: 4 }}>
                    {result.feedback}
                  </p>
                </div>
              </div>
            </div>

            {/* JSON Output */}
            <CodeBlock
              title="JSON Output Response"
              lang="json"
              code={JSON.stringify(result, null, 2)}
            />

          </div>
        ) : (
          <div className="card-glass" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sec)', fontSize: '0.9375rem', textAlign: 'center' }}>
            <div>
              <p style={{ fontSize: '2rem', marginBottom: 12 }}>⚡</p>
              <p>Ready to validate. Click the button to analyze semantic quality.</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast Notification Preview */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'rgba(10, 10, 10, 0.95)',
          border: `1px solid ${result?.valid ? 'var(--teal)' : 'var(--red)'}`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          borderRadius: 8,
          padding: '16px 20px',
          maxWidth: 380,
          zIndex: 9999,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          backdropFilter: 'blur(12px)',
        }}>
          <span style={{ fontSize: '1.25rem' }}>{result?.valid ? '✓' : '✕'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: result?.valid ? 'var(--teal)' : 'var(--red)', marginBottom: 2 }}>
              {result?.valid ? 'Validated by Normy' : 'Input Validation Flagged'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#fff' }}>{toastMessage}</div>
          </div>
          <button 
            onClick={() => setToastMessage(null)} 
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.75rem' }}
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
