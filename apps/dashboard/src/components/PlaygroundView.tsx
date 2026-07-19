'use client';

import React, { useState, useEffect } from 'react';
import { CodeBlock } from './CodeBlock.js';
import { validateInputAction } from '../app/actions.js';

interface PlaygroundViewProps {
  apiKey?: string;
  projectId?: string;
  apiHostUrl?: string;
}

export function PlaygroundView({ apiKey = '', projectId = '' }: PlaygroundViewProps) {
  const [localProjectId, setLocalProjectId] = useState(projectId);
  const [localApiKey, setLocalApiKey] = useState('');
  const [question, setQuestion] = useState('Why are you cancelling your subscription?');
  const [answer, setAnswer] = useState('I do not need it anymore because it lacks some key metrics.');
  const [provider, setProvider] = useState<'' | 'gemini' | 'openai' | 'anthropic'>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load API Key from localStorage if available
  useEffect(() => {
    const savedKey = localStorage.getItem('playground_api_key');
    if (savedKey) {
      setLocalApiKey(savedKey);
    } else if (apiKey && !apiKey.endsWith('...')) {
      setLocalApiKey(apiKey);
    }
  }, [apiKey]);

  const handleApiKeyChange = (val: string) => {
    setLocalApiKey(val);
    localStorage.setItem('playground_api_key', val);
  };

  const handleValidate = async () => {
    setLoading(true);
    setResult(null);
    setToastMessage(null);

    const trimmedKey = localApiKey.trim();
    if (!trimmedKey) {
      setToastMessage('API Key is required to run live validation.');
      setResult({
        valid: false,
        error: 'API KEY REQUIRED',
        feedback: 'Please enter your Normy API Key (e.g. nrm_test_...) to validate against your project settings.'
      });
      setLoading(false);
      return;
    }

    try {
      const data = await validateInputAction({
        projectId: localProjectId,
        question,
        answer,
        provider,
        apiKey: trimmedKey
      });

      setResult(data);
      if (data.feedback) {
        setToastMessage(data.feedback);
      }
    } catch (err: any) {
      console.warn('API call failed:', err);
      setResult({
        valid: false,
        error: 'VALIDATION FAILED',
        feedback: err.message || 'Validation request failed. Please check your credentials and try again.'
      });
      setToastMessage(err.message || 'Validation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* ── Notification & Explanation Banner ── */}
      <div className="card-glass" style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}>
        <div style={{ fontSize: '2rem', padding: '0 8px' }}>
          🧪
        </div>
        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--white)', marginBottom: 4 }}>Normy API Key Validation & Testing Playground</h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-sec)', lineHeight: '1.4' }}>
            Test your project validation configurations before deploying them. Input your <strong>Project ID</strong> and paste a <strong>Normy API Key</strong> (Development or Production) below. This sends real validation requests using your configured BYOK keys, active LLM models, and minimum score settings.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }} className="playground-grid">
        
        {/* ── Left Form Input Panel ── */}
        <div className="card-glass">
          
          {/* API Credentials */}
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 20 }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--white)', marginBottom: 12 }}>
              API Credentials
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: '0.75rem' }}>Project ID</label>
                <input
                  type="text"
                  className="input-field"
                  style={{ fontSize: '0.8125rem', height: '38px' }}
                  value={localProjectId}
                  onChange={(e) => setLocalProjectId(e.target.value)}
                  placeholder="e.g. 5d3478a9-ce43-45d7-9a75-ee2ed8737ac7"
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: '0.75rem' }}>
                  Normy API Key
                </label>
                <input
                  type="password"
                  className="input-field"
                  style={{ fontSize: '0.8125rem', height: '38px' }}
                  value={localApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="Paste nrm_test_... or nrm_live_... key"
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-sec)', marginTop: 4 }}>
                  Your raw API key is never stored on the server. Saved locally in your browser.
                </span>
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--white)', marginBottom: 12 }}>
            Validation Parameters
          </h4>

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
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="e.g. My house is the second one in the forest"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 28 }}>
            <label className="input-label">AI Model Provider Override</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="input-field"
              style={{ cursor: 'pointer' }}
            >
              <option value="">Project Default (Dynamic Resolution)</option>
              <option value="gemini">Force Google Gemini</option>
              <option value="openai">Force OpenAI GPT</option>
              <option value="anthropic">Force Anthropic Claude</option>
            </select>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-sec)', marginTop: 4 }}>
              Leave as Project Default to use the provider configured in your project settings.
            </span>
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
                      {result.score !== undefined ? `${result.score}/100` : 'N/A'}
                    </div>
                  </div>

                  <div style={{ flex: 1, textAlign: 'center', padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Confidence</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--white)' }}>
                      {result.confidence !== undefined ? `${Math.round(result.confidence * 100)}%` : 'N/A'}
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
                      {result.error ? result.error : result.valid ? 'VALIDATED' : 'FLAGGED'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sec)' }}>Feedback / Reason: </span>
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
            <div className="card-glass" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sec)', fontSize: '0.9375rem', textAlign: 'center', minHeight: '350px' }}>
              <div>
                <p style={{ fontSize: '2rem', marginBottom: 12 }}>⚡</p>
                <p>Ready to validate. Click the button to analyze semantic quality.</p>
              </div>
            </div>
          )}
        </div>
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
