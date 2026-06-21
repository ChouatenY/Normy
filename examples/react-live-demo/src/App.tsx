import { useState } from 'react';
import './index.css';
import { CancellationForm } from './components/CancellationForm';
import { JobApplicationForm } from './components/JobApplicationForm';
import { FeedbackForm } from './components/FeedbackForm';

const TABS = [
  {
    id: 'cancellation',
    num: '01',
    label: 'Subscription Cancellation',
    tag: 'onPause + rate limiting',
    title: 'Cancellation UX Flow',
    description: 'Debounced validation triggers 1.2s after user pauses typing. Features simulated rate-limit protection.',
    component: CancellationForm,
  },
  {
    id: 'job',
    num: '02',
    label: 'Job Application',
    tag: 'Multi-field + network handling',
    title: 'Job Application Flow',
    description: 'Combines multiple validation behaviors (onPause for long-form, onBlur for inputs). Cover letter triggers a transient network error on the 3rd key-up.',
    component: JobApplicationForm,
  },
  {
    id: 'feedback',
    num: '03',
    label: 'Customer Feedback',
    tag: 'All 4 severity tiers',
    title: 'Customer Feedback Flow',
    description: 'Demonstrates the full range of semantic classification feedback: Success (≥80), Info (50-79), Warning (30-49), Error (<30).',
    component: FeedbackForm,
  },
] as const;

type TabId = typeof TABS[number]['id'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('cancellation');
  const tab = TABS.find(t => t.id === activeTab)!;
  const Component = tab.component;

  return (
    <div className="app-shell">
      {/* ── Top Navigation Bar ── */}
      <nav className="top-nav">
        <div className="nav-logo">
          <div className="nav-logo-mark">N</div>
          <span>Normy Validation Platform</span>
        </div>
        <div className="nav-badge">
          Live SDK Sandbox
        </div>
      </nav>

      {/* ── Main Workspace ── */}
      <main className="main-wrapper">
        <header className="hero">
          <div className="hero-eyebrow">
            <span className="hero-tag">React SDK</span>
            <div className="hero-divider" />
            <span className="hero-tag">Phase 3A Live Demo</span>
          </div>
          <h1>
            AI-driven form validation, <em>reimagined.</em>
          </h1>
          <p className="hero-desc">
            Analyze form inputs in real-time using structured LLM classification.
            Provide detailed, contextual guidance to users without arbitrary blockades.
          </p>
        </header>

        {/* ── Tab Bar ── */}
        <div className="tab-nav" role="tablist" aria-label="Demo scenarios">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="tab-num">{t.num}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content Area ── */}
        <div className="content-grid">
          {/* Active Sandbox Card */}
          <div className="card" role="tabpanel" key={activeTab}>
            <div className="card-header">
              <div className="card-label">{tab.tag}</div>
              <h2 className="card-title">{tab.title}</h2>
              <p className="card-desc">{tab.description}</p>
            </div>
            <div className="card-body">
              <Component />
            </div>
          </div>

          {/* Info Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-block">
              <div className="sidebar-label">SDK Characteristics</div>
              <div className="feature-list">
                <div className="feature-row">
                  <div className="feature-icon">⏱</div>
                  <div>
                    <strong className="feature-name">Debounced onPause</strong>
                    Fires only after the user stops typing to preserve API limit quotas.
                  </div>
                </div>
                <div className="feature-row">
                  <div className="feature-icon">👁</div>
                  <div>
                    <strong className="feature-name">Dynamic onBlur</strong>
                    Runs validation as the focus leaves the input, preventing premature alerts.
                  </div>
                </div>
                <div className="feature-row">
                  <div className="feature-icon">🚀</div>
                  <div>
                    <strong className="feature-name">Gated Submission</strong>
                    Guarantees all fields pass validation before triggering form submission.
                  </div>
                </div>
                <div className="feature-row">
                  <div className="feature-icon">⚡</div>
                  <div>
                    <strong className="feature-name">Adaptive UI feedback</strong>
                    Returns dynamic suggestions instead of simple, unhelpful error blocks.
                  </div>
                </div>
              </div>
            </div>

            <div className="sidebar-block">
              <div className="api-key-block">
                <div className="sidebar-label">AI Engine Configuration</div>
                <div className="api-key-label">Gemini API Key</div>
                <p className="api-key-desc">
                  Provide your Gemini key to use real-time LLM validation instead of the default local mock.
                </p>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  className="field-input"
                  style={{ fontSize: '0.75rem', padding: '8px 12px', fontFamily: 'var(--mono)' }}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val) {
                      localStorage.setItem('GEMINI_API_KEY', val);
                    } else {
                      localStorage.removeItem('GEMINI_API_KEY');
                    }
                  }}
                  defaultValue={typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') || '' : ''}
                />
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <div>
          Released under MIT License. Powered by <a href="https://github.com/normy" target="_blank" rel="noreferrer">@normy/react</a>.
        </div>
        <div>
          <a href="#" onClick={(e) => e.preventDefault()}>Developer Console</a> · <a href="#" onClick={(e) => e.preventDefault()}>Documentation</a>
        </div>
      </footer>
    </div>
  );
}
