import { useState } from 'react'
import './index.css'
import { CancellationForm } from './components/CancellationForm'
import { JobApplicationForm } from './components/JobApplicationForm'
import { FeedbackForm } from './components/FeedbackForm'

const TABS = [
  {
    id: 'cancellation',
    icon: '💳',
    label: 'Cancellation',
    tag: 'onPause + rate limiting',
    title: 'Subscription Cancellation',
    description: 'Debounced validation fires 1.2s after you stop typing. After 4 calls the rate limiter kicks in to show graceful 429 handling.',
    component: CancellationForm,
  },
  {
    id: 'job',
    icon: '💼',
    label: 'Job Application',
    tag: 'Multi-field + network error',
    title: 'Job Application',
    description: 'Multiple fields with different modes: onPause for long-form text, onBlur for short fields. The cover letter simulates a network error on the 3rd call.',
    component: JobApplicationForm,
  },
  {
    id: 'feedback',
    icon: '⭐',
    label: 'Feedback',
    tag: 'All 4 severity levels',
    title: 'Customer Feedback',
    description: 'Use the quick-fill buttons to trigger all four severity levels — error, warning, info, and success — and watch the score bar animate in real time.',
    component: FeedbackForm,
  },
] as const

type TabId = typeof TABS[number]['id']

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('cancellation')
  const tab = TABS.find(t => t.id === activeTab)!
  const Component = tab.component

  return (
    <div className="demo-root">
      {/* ── Header ── */}
      <header className="demo-header">
        <div className="badge">
          <span className="badge-dot" />
          Live SDK Demo
        </div>
        <h1>Normy React SDK</h1>
        <p>
          Real-time AI-powered form validation in action. No backend required —
          the mock pipeline runs entirely in-browser.
        </p>
        <div className="api-status mock">
          Mock mode active — API calls are simulated client-side
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="demo-tabs" role="tablist" aria-label="Demo forms">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`demo-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Main layout ── */}
      <div className="demo-layout">
        {/* Card */}
        <div className="demo-card" role="tabpanel" key={activeTab}>
          <div className="demo-card-header">
            <div className="card-tag">
              <span>{tab.icon}</span>
              {tab.tag}
            </div>
            <h2>{tab.title}</h2>
            <p>{tab.description}</p>
          </div>
          <div className="demo-card-body">
            <Component />
          </div>
        </div>

        {/* Info sidebar */}
        <aside className="info-panel">
          <h4>SDK Features Shown</h4>

          <div className="info-feature">
            <span className="info-feature-icon">⏱</span>
            <div>
              <strong>onPause debounce</strong>
              Validates after typing stops — no API spam
            </div>
          </div>
          <div className="info-feature">
            <span className="info-feature-icon">👁</span>
            <div>
              <strong>onBlur validation</strong>
              Fires when focus leaves the field
            </div>
          </div>
          <div className="info-feature">
            <span className="info-feature-icon">🚀</span>
            <div>
              <strong>onSubmit gating</strong>
              Blocks submission until all fields pass
            </div>
          </div>
          <div className="info-feature">
            <span className="info-feature-icon">📊</span>
            <div>
              <strong>Severity levels</strong>
              success / info / warning / error with colour-coded toasts
            </div>
          </div>
          <div className="info-feature">
            <span className="info-feature-icon">⚡</span>
            <div>
              <strong>Rate limit (429)</strong>
              Graceful degradation with friendly message
            </div>
          </div>
          <div className="info-feature">
            <span className="info-feature-icon">📡</span>
            <div>
              <strong>Network errors</strong>
              Simulated on the 3rd call in Job Application
            </div>
          </div>
          <div className="info-feature">
            <span className="info-feature-icon">♿</span>
            <div>
              <strong>Accessible</strong>
              aria-invalid, aria-live, role="alert"
            </div>
          </div>

          <div style={{ marginTop: 20, padding: '14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '10px' }}>
              <strong style={{ color: 'var(--text)' }}>Live Gemini Integration</strong><br />
              Enter a Gemini API key to use real AI validation instead of local mocks.
            </p>
            <input 
              type="password" 
              placeholder="AIza..." 
              className="field-input"
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
              onChange={(e) => {
                if (e.target.value) localStorage.setItem('GEMINI_API_KEY', e.target.value);
                else localStorage.removeItem('GEMINI_API_KEY');
              }}
              defaultValue={typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') || '' : ''}
            />
          </div>
        </aside>
      </div>

      {/* ── Footer ── */}
      <footer className="demo-footer">
        <p>
          Built with <a href="https://github.com/normy">@normy/react</a> SDK ·{' '}
          <a href="#">View source</a> · Phase 3A Live Demo
        </p>
      </footer>
    </div>
  )
}
