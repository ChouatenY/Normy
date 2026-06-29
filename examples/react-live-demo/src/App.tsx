import { useState } from 'react';
import './index.css';
import { NormyProvider } from '@normy-validation/react';
import { CancellationForm } from './components/CancellationForm';
import { JobApplicationForm } from './components/JobApplicationForm';
import { FeedbackForm } from './components/FeedbackForm';
import { GovernmentForm } from './components/GovernmentForm';
import { SurveyForm } from './components/SurveyForm';
import { DocsView } from './components/DocsView';
import { LiquidMetalButton } from './components/ui/liquid-metal-button';

const env = (import.meta as any).env as Record<string, string | undefined>;

const apiUrl = env.VITE_NORMY_API_URL ?? 'http://localhost:3001';
const projectId = env.VITE_NORMY_PROJECT_ID ?? '';
const apiKey = env.VITE_NORMY_API_KEY ?? '';

/* ── Liquid-metal orb for pipeline step numbers ── */
function MetalOrb({ step }: { step: string }) {
  return (
    <div style={{
      width: 32,
      height: 32,
      borderRadius: '50%',
      position: 'relative',
      flexShrink: 0,
      zIndex: 2,
      /* Outer metallic ring */
      background: 'linear-gradient(135deg, #3a3a3a 0%, #888 30%, #ccc 50%, #888 70%, #3a3a3a 100%)',
      backgroundSize: '300% 300%',
      animation: 'lm-shimmer 4s linear infinite',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.6), 0 0 12px rgba(255,255,255,0.04)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Inner dark glass disc */}
      <div style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: 'linear-gradient(180deg, rgba(30,30,30,0.9) 0%, rgba(0,0,0,0.95) 100%)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.6875rem',
        fontWeight: 800,
        color: '#fff',
        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '-0.02em',
      }}>
        {step}
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'cancellation' | 'job' | 'feedback' | 'government' | 'survey' | 'docs'>('cancellation');
  const [showNormyBadge, setShowNormyBadge] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isConfigured = Boolean(apiKey && projectId);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  return (
    <div className="app-shell" style={{ background: 'var(--black)', color: 'var(--text)', minHeight: '100vh', padding: '40px 24px', transition: 'background 0.3s ease, color 0.3s ease' }}>
      
      {/* ── Top Header ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto 48px',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/logo.png" alt="Normy Logo" style={{ height: 36, width: 'auto', display: 'block', filter: 'invert(var(--logo-invert)) brightness(1.1)', transition: 'filter 0.3s ease' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>NORMY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {activeTab === 'docs' ? (
            <LiquidMetalButton label="← Back to Sandbox" onClick={() => setActiveTab('cancellation')} />
          ) : (
            <LiquidMetalButton label="API & SDK Docs" onClick={() => setActiveTab('docs')} />
          )}

          {/* Round Black Liquid Metal Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            style={{
              position: 'relative',
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2a2a2a 0%, #555 20%, #888 35%, #bbb 50%, #888 65%, #555 80%, #2a2a2a 100%)',
              backgroundSize: '400% 100%',
              animation: 'lm-shimmer-badge 4s linear infinite',
              border: 'none',
              cursor: 'pointer',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.5)',
              transform: 'scale(1)',
              transition: 'transform 0.15s ease, box-shadow 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.4), 0 8px 24px rgba(255,255,255,0.08), 0 2px 8px rgba(255,255,255,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.5)';
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {/* Inner dark overlay */}
            <span
              style={{
                position: 'absolute',
                inset: 2,
                borderRadius: '50%',
                background: 'linear-gradient(180deg, rgba(20,20,20,0.85) 0%, rgba(0,0,0,0.92) 100%)',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />
            {/* Shimmer highlight */}
            <span
              style={{
                position: 'absolute',
                inset: 2,
                borderRadius: '50%',
                background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)',
                backgroundSize: '300% 100%',
                animation: 'lm-shimmer-badge 3s ease-in-out infinite',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
            {/* Icon */}
            <span style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {activeTab !== 'docs' && (
          <>
            <div className="hero-wrapper">
              <svg className="hero-svg-backdrop" viewBox="0 0 1200 300" preserveAspectRatio="none">
                {/* Base grey/white lines */}
                <path d="M0,30 C300,10 600,70 1200,30" fill="none" stroke="var(--energy-bg-stroke)" strokeWidth="1" style={{ transition: 'stroke 0.3s ease' }} />
                <path d="M0,70 C300,50 600,110 1200,70" fill="none" stroke="var(--energy-bg-stroke)" strokeWidth="1" style={{ transition: 'stroke 0.3s ease' }} />
                <path d="M0,110 C300,90 600,150 1200,110" fill="none" stroke="var(--energy-bg-stroke)" strokeWidth="1" style={{ transition: 'stroke 0.3s ease' }} />
                <path d="M0,150 C300,130 600,190 1200,150" fill="none" stroke="var(--energy-bg-stroke)" strokeWidth="1" style={{ transition: 'stroke 0.3s ease' }} />
                <path d="M0,190 C300,170 600,230 1200,190" fill="none" stroke="var(--energy-bg-stroke)" strokeWidth="1" style={{ transition: 'stroke 0.3s ease' }} />
                <path d="M0,230 C300,210 600,270 1200,230" fill="none" stroke="var(--energy-bg-stroke)" strokeWidth="1" style={{ transition: 'stroke 0.3s ease' }} />
                <path d="M0,270 C300,250 600,310 1200,270" fill="none" stroke="var(--energy-bg-stroke)" strokeWidth="1" style={{ transition: 'stroke 0.3s ease' }} />

                {/* Glowing energy flow overlay paths */}
                <path d="M0,30 C300,10 600,70 1200,30" fill="none" stroke="var(--energy-stroke)" strokeWidth="1.5" className="energy-path" style={{ transition: 'stroke 0.3s ease' }} />
                <path d="M0,110 C300,90 600,150 1200,110" fill="none" stroke="var(--energy-stroke)" strokeWidth="1.5" className="energy-path-delayed" style={{ transition: 'stroke 0.3s ease' }} />
                <path d="M0,190 C300,170 600,230 1200,190" fill="none" stroke="var(--energy-stroke)" strokeWidth="1.5" className="energy-path-fast" style={{ transition: 'stroke 0.3s ease' }} />
                <path d="M0,270 C300,250 600,310 1200,270" fill="none" stroke="var(--energy-stroke)" strokeWidth="1.5" className="energy-path-delayed" style={{ transition: 'stroke 0.3s ease' }} />
              </svg>

              <div className="hero-content">
                <div className="hero-eyebrow">
                  <span className="hero-divider" />
                  <span className="hero-tag">React SDK Live Sandbox</span>
                </div>
                <h1 className="hero-title">
                  Real-time validation engine.
                </h1>
                <p className="hero-desc">
                  This workspace demonstrates the full semantic validation lifecycle. Select a form type to see @normy/react query the Hono backend and output AI ratings and Toast feedbacks.
                </p>
              </div>
            </div>

            {/* ── Tab Switcher ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '1px',
              background: 'rgba(255,255,255,0.1)',
              padding: '1px',
              borderRadius: 4,
              marginBottom: 32
            }}>
              {[
                { id: 'cancellation', label: 'Subscription Cancellation' },
                { id: 'job', label: 'Job Application' },
                { id: 'feedback', label: 'Customer Feedback' },
                { id: 'government', label: 'Government Forms' },
                { id: 'survey', label: 'User Survey' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '14px 8px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    background: activeTab === tab.id ? '#fff' : '#000',
                    color: activeTab === tab.id ? '#000' : '#888',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}

        {activeTab === 'docs' ? (
          <div style={{ width: '100%' }}>
            <DocsView />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, alignItems: 'start' }}>
            
            {/* ── Main Card ── */}
            <div className="card" style={{ background: 'var(--black)', border: '1px solid var(--border)', borderRadius: 4, transition: 'background 0.3s ease, border 0.3s ease' }}>
              <div className="card-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-bottom 0.3s ease' }}>
                <div>
                  <div className="card-label" style={{ fontSize: '0.6875rem', color: '#666', fontFamily: 'monospace' }}>
                    Pipeline Endpoint: /validate
                  </div>
                  <h2 className="card-title" style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 8 }}>
                    {activeTab === 'cancellation' && 'cancellation-reason'}
                    {activeTab === 'job' && 'job-application'}
                    {activeTab === 'feedback' && 'customer-feedback'}
                    {activeTab === 'government' && 'residential-address'}
                    {activeTab === 'survey' && 'software-goals'}
                  </h2>
                </div>
                {/* Badge toggle control */}
                <button
                  onClick={() => setShowNormyBadge(!showNormyBadge)}
                  style={{
                    background: showNormyBadge ? 'rgba(76, 175, 145, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: showNormyBadge ? '1px solid rgba(76, 175, 145, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    color: showNormyBadge ? '#4caf91' : '#888',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.25s ease',
                    boxShadow: showNormyBadge ? '0 0 12px rgba(76, 175, 145, 0.15)' : 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontFamily: 'monospace',
                  }}
                >
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: showNormyBadge ? '#4caf91' : '#666',
                    display: 'inline-block',
                    transition: 'all 0.25s ease',
                  }} />
                  {showNormyBadge ? 'Badge: On' : 'Badge: Off'}
                </button>
              </div>
              <div className="card-body" style={{ padding: '32px' }}>
                {isConfigured ? (
                  <NormyProvider apiKey={apiKey} projectId={projectId} apiUrl={apiUrl} pauseMs={1200} showBadge={showNormyBadge}>
                    {activeTab === 'cancellation' && <CancellationForm />}
                    {activeTab === 'job' && <JobApplicationForm />}
                    {activeTab === 'feedback' && <FeedbackForm />}
                    {activeTab === 'government' && <GovernmentForm />}
                    {activeTab === 'survey' && <SurveyForm />}
                  </NormyProvider>
                ) : (
                  <div className="v-feedback warning" style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)' }}>
                    <span className="v-feedback-icon">!</span>
                    <div>
                      Please set VITE_NORMY_API_KEY and VITE_NORMY_PROJECT_ID in examples/react-live-demo/.env
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Runtime Pipeline — Liquid Metal Glass ── */}
            <aside>
              <div style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid var(--glass-border)',
                borderRadius: 8,
                padding: '28px 24px',
                boxShadow: 'var(--glass-shadow)',
                transition: 'background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease',
              }}>
                <div style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#555',
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: 28,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #666, #ccc)',
                    boxShadow: '0 0 6px rgba(255,255,255,0.15)',
                  }} />
                  Runtime Pipeline
                </div>

                {/* Pipeline Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { step: '01', title: 'Input Change', desc: 'User types into form field' },
                    { step: '02', title: 'SDK Debounce', desc: 'onPause delay intercepts typing' },
                    { step: '03', title: 'API Gateway', desc: 'Secure hash checks at port 3001' },
                    { step: '04', title: 'Gemini Engine', desc: 'Structured JSON validation response' },
                    { step: '05', title: 'Inline UI Update', desc: 'Monochrome toasts & scores refresh' }
                  ].map((item, idx) => (
                    <div key={item.step} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                      
                      {/* Left: metal orb + connector */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <MetalOrb step={item.step} />
                        {idx < 4 && (
                          <div
                            className="flowchart-line"
                            style={{
                              ['--delay' as any]: `${idx * 0.4}s`,
                            }}
                          />
                        )}
                      </div>

                      {/* Right: details */}
                      <div style={{ paddingBottom: idx < 4 ? '28px' : '0', paddingTop: 4 }}>
                        <div style={{
                          fontSize: '0.8125rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#e0e0e0',
                        }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#555', marginTop: 4, lineHeight: 1.4 }}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </aside>

          </div>
        )}
      </main>
    </div>
  );
}
