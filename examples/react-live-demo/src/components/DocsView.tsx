import { useState } from 'react';
import { LiquidMetalButton } from './ui/liquid-metal-button';

/* ── Normy Skill / AI Integration Prompt ── */
const NORMY_SKILL_MD = `# Normy AI Integration Skill

## What is Normy?
Normy is an open-source, AI-powered form validation and guidance SDK.
It evaluates the **semantic quality** of user text inputs in real-time,
returning structured feedback (score, severity, issue type, suggestions)
instead of simple regex error messages.

## Installation

\`\`\`bash
npm install @normy-validation/react    # React SDK
npm install @normy/js        # Vanilla JS SDK
\`\`\`

## Quick Integration Pattern

### React (Recommended)

\`\`\`tsx
import { NormyProvider, useValidation } from '@normy-validation/react';

// 1. Wrap your app
function App() {
  return (
    <NormyProvider
      apiKey="nrm_live_..."
      projectId="your-project-id"
      apiUrl="https://your-normy-api.example.com"
      showBadge={false} // Option to remove the "Validated by Normy" badge (default: true)
    >
      <MyForm />
    </NormyProvider>
  );
}

// 2. Use the hook in any form field
function MyForm() {
  const field = useValidation({
    mode: 'onPause',     // validate after user stops typing
    pauseMs: 1200,       // debounce delay in ms
    question: 'Why are you cancelling?',
  });

  return (
    <textarea
      value={field.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
    />
  );
}
\`\`\`

### REST API (Any Language)

\`\`\`bash
curl -X POST https://your-normy-api.example.com/validate \\
  -H "Authorization: Bearer nrm_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "your-project-id",
    "question": "Describe your experience",
    "answer": "it was fine"
  }'
\`\`\`

## Response Shape

\`\`\`json
{
  "valid": false,
  "score": 42,
  "confidence": 0.91,
  "issue": "LOW_QUALITY",
  "severity": "warning",
  "feedback": "Could you share more specifics about what worked or didn't?",
  "feedbackCategory": "elaboration_needed",
  "exampleAnswer": "The onboarding was smooth but I found the reporting dashboard..."
}
\`\`\`

## Key Concepts
- **score**: 0-100 quality rating
- **severity**: success | info | warning | error
- **issue**: EMPTY | TOO_SHORT | RANDOM_TEXT | SPAM | LOW_QUALITY | ACCEPTABLE
- **feedback**: Human-readable suggestion for improvement
- **exampleAnswer**: AI-generated example of a better response

## Validation Modes
| Mode | Trigger | Best For |
|------|---------|----------|
| onPause | User stops typing for N ms | Long text fields |
| onBlur | Field loses focus | Short inputs |
| onSubmit | Form submission | Final gate check |

## Environment Variables
\`\`\`env
NORMY_API_KEY=nrm_live_...
NORMY_PROJECT_ID=your-project-id
NORMY_API_URL=https://your-normy-api.example.com
\`\`\`
`;

function CopyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownloadIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/* ── Reusable code block with copy button ── */
function CodeBlock({ code, lang, title }: { code: string; lang?: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };
  return (
    <div style={{ position: 'relative', marginBottom: 20 }}>
      {title && (
        <div style={{
          fontSize: '0.6875rem', fontWeight: 700, color: '#555', fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>{title}</div>
      )}
      <div style={{
        background: 'var(--near-black)', border: '1px solid var(--border)', borderRadius: 6,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.6875rem', color: '#555', fontFamily: "'JetBrains Mono', monospace" }}>{lang ?? ''}</span>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4,
              fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
              background: copied ? 'rgba(76,175,145,0.12)' : 'var(--glass-bg)',
              border: `1px solid ${copied ? 'rgba(76,175,145,0.3)' : 'var(--border)'}`,
              color: copied ? '#4caf91' : '#888',
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre style={{ padding: '14px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem', lineHeight: 1.65, overflowX: 'auto', margin: 0, color: 'var(--text)' }}>
          {code}
        </pre>
      </div>
    </div>
  );
}

/* ── Glass action button (consistent with app theme) ── */
function GlassButton({ children, onClick, icon }: { children: React.ReactNode; onClick?: () => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-glass"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 20px', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export function DocsView() {
  const [copiedSkill, setCopiedSkill] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    sdk: false,
    api: false,
    modes: false,
    fields: false,
    skill: false,
    faqs: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCopySkill = () => {
    navigator.clipboard.writeText(NORMY_SKILL_MD).then(() => {
      setCopiedSkill(true);
      setTimeout(() => setCopiedSkill(false), 3000);
    }).catch(() => {});
  };

  const handleDownloadSkill = () => {
    const blob = new Blob([NORMY_SKILL_MD], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'normy-skill.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ color: '#fff', lineHeight: 1.6, animation: 'fade-in 0.4s ease both' }}>

      {/* ═══ Header Title: Liquid Glass Metal Style ═══ */}
      <div className="docs-header-container">
        <h2 className="docs-header-title">API & SDK Docs</h2>
      </div>

      {/* ═══ Two-Column Layout ═══ */}
      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', position: 'relative' }}>
        
        {/* Left Sticky Sidebar */}
        <aside
          className="docs-sidebar"
          style={{
            width: '260px',
            flexShrink: 0,
            position: 'sticky',
            top: '24px',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            padding: '24px 8px 24px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', fontFamily: "'JetBrains Mono', monospace" }}>
            Documentation Sections
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Installation */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button
                onClick={() => scrollToSection('installation')}
                style={{
                  background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                  fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '6px 0',
                  textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>01.</span> Installation
              </button>
            </div>

            {/* 2. React SDK */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => scrollToSection('react-sdk')}
                  style={{
                    background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '6px 0',
                    textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>02.</span> React SDK
                </button>
                <button
                  onClick={() => toggleSection('sdk')}
                  style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.7rem', padding: 4 }}
                >
                  {expandedSections.sdk ? '▼' : '▶'}
                </button>
              </div>
              {expandedSections.sdk && (
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.06)', gap: 4, marginTop: 4 }}>
                  <button onClick={() => scrollToSection('react-provider')} style={{ background: 'none', border: 'none', color: '#888', textAlign: 'left', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 0', transition: 'color 0.15s' }}>• Provider Setup</button>
                  <button onClick={() => scrollToSection('react-hook')} style={{ background: 'none', border: 'none', color: '#888', textAlign: 'left', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 0', transition: 'color 0.15s' }}>• useValidation Hook</button>
                </div>
              )}
            </div>

            {/* 3. REST API */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => scrollToSection('rest-api')}
                  style={{
                    background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '6px 0',
                    textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>03.</span> REST API
                </button>
                <button
                  onClick={() => toggleSection('api')}
                  style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.7rem', padding: 4 }}
                >
                  {expandedSections.api ? '▼' : '▶'}
                </button>
              </div>
              {expandedSections.api && (
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.06)', gap: 4, marginTop: 4 }}>
                  <button onClick={() => scrollToSection('rest-curl')} style={{ background: 'none', border: 'none', color: '#888', textAlign: 'left', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 0' }}>• cURL Integration</button>
                  <button onClick={() => scrollToSection('rest-schema')} style={{ background: 'none', border: 'none', color: '#888', textAlign: 'left', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 0' }}>• Request & Response</button>
                </div>
              )}
            </div>

            {/* 4. Trigger Modes */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => scrollToSection('validation-modes')}
                  style={{
                    background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '6px 0',
                    textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>04.</span> Trigger Modes
                </button>
                <button
                  onClick={() => toggleSection('modes')}
                  style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.7rem', padding: 4 }}
                >
                  {expandedSections.modes ? '▼' : '▶'}
                </button>
              </div>
              {expandedSections.modes && (
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.06)', gap: 4, marginTop: 4 }}>
                  <button onClick={() => scrollToSection('validation-modes')} style={{ background: 'none', border: 'none', color: '#888', textAlign: 'left', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 0' }}>• Execution Events</button>
                </div>
              )}
            </div>

            {/* 5. Response Fields */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => scrollToSection('response-fields')}
                  style={{
                    background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '6px 0',
                    textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>05.</span> Response Fields
                </button>
                <button
                  onClick={() => toggleSection('fields')}
                  style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.7rem', padding: 4 }}
                >
                  {expandedSections.fields ? '▼' : '▶'}
                </button>
              </div>
              {expandedSections.fields && (
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.06)', gap: 4, marginTop: 4 }}>
                  <button onClick={() => scrollToSection('response-fields')} style={{ background: 'none', border: 'none', color: '#888', textAlign: 'left', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 0' }}>• Schema Reference</button>
                </div>
              )}
            </div>

            {/* 6. AI Skill */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => scrollToSection('ai-skill')}
                  style={{
                    background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '6px 0',
                    textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>06.</span> AI Skill File
                </button>
                <button
                  onClick={() => toggleSection('skill')}
                  style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.7rem', padding: 4 }}
                >
                  {expandedSections.skill ? '▼' : '▶'}
                </button>
              </div>
              {expandedSections.skill && (
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.06)', gap: 4, marginTop: 4 }}>
                  <button onClick={() => scrollToSection('ai-skill')} style={{ background: 'none', border: 'none', color: '#888', textAlign: 'left', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 0' }}>• normy-skill.md</button>
                </div>
              )}
            </div>

            {/* 7. FAQs */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => scrollToSection('faqs')}
                  style={{
                    background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '6px 0',
                    textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>07.</span> FAQ Section
                </button>
                <button
                  onClick={() => toggleSection('faqs')}
                  style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.7rem', padding: 4 }}
                >
                  {expandedSections.faqs ? '▼' : '▶'}
                </button>
              </div>
              {expandedSections.faqs && (
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.06)', gap: 4, marginTop: 4 }}>
                  <button onClick={() => scrollToSection('faq-contradiction')} style={{ background: 'none', border: 'none', color: '#888', textAlign: 'left', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 0' }}>• Dynamic Correlation</button>
                  <button onClick={() => scrollToSection('faq-languages')} style={{ background: 'none', border: 'none', color: '#888', textAlign: 'left', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 0' }}>• Multilingual Setup</button>
                </div>
              )}
            </div>

            {/* 8. Showcase */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button
                onClick={() => scrollToSection('showcase')}
                style={{
                  background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                  fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '6px 0',
                  textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>08.</span> Showcase UI
              </button>
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
          
          {/* ═══ 1. Installation ═══ */}
          <section id="installation" style={{ marginBottom: 56, scrollMarginTop: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>
              1. Installation
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <CodeBlock
                title="React Project"
                lang="bash"
                code="npm install @normy-validation/react"
              />
              <CodeBlock
                title="Vanilla JS / Node"
                lang="bash"
                code="npm install @normy/js"
              />
            </div>
          </section>

          {/* ═══ 2. React SDK Setup ═══ */}
          <section id="react-sdk" style={{ marginBottom: 56, scrollMarginTop: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
              2. React SDK — Quick Start
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.9375rem', marginBottom: 20 }}>
              Wrap your app with <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, fontSize: '0.8125rem' }}>NormyProvider</code> and
              use the <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, fontSize: '0.8125rem' }}>useValidation</code> hook on any form field.
            </p>

            <div id="react-provider">
              <CodeBlock
                title="App Entry — Provider Setup"
                lang="tsx"
                code={`import { NormyProvider } from '@normy-validation/react';
 
function App() {
  return (
    <NormyProvider
      apiKey="nrm_live_YOUR_API_KEY"
      projectId="your-project-id"
      apiUrl="https://your-normy-api.example.com"
      showBadge={false} // Optional: Pass false to remove the "Validated by Normy" badge (default: true)
    >
      <MyForm />
    </NormyProvider>
  );
}`}
              />
            </div>

            <div id="react-hook">
              <CodeBlock
                title="Form Field — useValidation Hook"
                lang="tsx"
                code={`import { useValidation } from '@normy-validation/react';

function CancellationField() {
  const field = useValidation({
    mode: 'onPause',       // validates after user stops typing
    pauseMs: 1200,         // debounce delay (ms)
    question: 'Why are you cancelling your subscription?',
  });

  return (
    <div>
      <textarea
        value={field.value}
        onChange={field.handleChange}
        onBlur={field.handleBlur}
        placeholder="Tell us why you're leaving..."
      />

      {field.status === 'validating' && <span>Analyzing...</span>}

      {field.result && (
        <div className={\`feedback \${field.result.severity}\`}>
          <strong>Score: {field.result.score}/100</strong>
          <p>{field.result.feedback}</p>
        </div>
      )}
    </div>
  );
}`}
              />
            </div>
          </section>

          {/* ═══ 3. REST API Reference ═══ */}
          <section id="rest-api" style={{ marginBottom: 56, scrollMarginTop: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
              3. REST API — Direct Integration
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.9375rem', marginBottom: 20 }}>
              For backend, mobile, or non-React frontends, call the <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, fontSize: '0.8125rem' }}>POST /validate</code> endpoint directly.
            </p>

            <div id="rest-curl">
              <CodeBlock
                title="cURL Example"
                lang="bash"
                code={`curl -X POST https://your-normy-api.example.com/validate \\
  -H "Authorization: Bearer nrm_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "your-project-id",
    "question": "What is the primary reason for cancelling?",
    "answer": "i dont care"
  }'`}
              />
            </div>

            <div id="rest-schema" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <CodeBlock
                title="Request Headers"
                lang="http"
                code={`Authorization: Bearer nrm_live_YOUR_API_KEY
Content-Type: application/json
X-Session-Id: optional-session-tracking-id`}
              />
              <CodeBlock
                title="Response Body"
                lang="json"
                code={`{
  "valid": false,
  "score": 42,
  "confidence": 0.91,
  "issue": "LOW_QUALITY",
  "severity": "warning",
  "feedback": "Could you share more specifics?",
  "feedbackCategory": "elaboration_needed",
  "exampleAnswer": "The pricing was out of..."
}`}
              />
            </div>
          </section>

          {/* ═══ 4. Validation Modes ═══ */}
          <section id="validation-modes" style={{ marginBottom: 56, scrollMarginTop: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>
              4. Validation Modes
            </h3>
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {['Mode', 'Trigger', 'Best For'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.6875rem', background: 'rgba(255,255,255,0.02)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['onPause', 'User stops typing for N ms', 'Long text fields, elaborate answers'],
                    ['onBlur', 'Field loses focus', 'Short inputs, emails, names'],
                    ['onSubmit', 'Form submission', 'Final validation gate before send'],
                  ].map(([mode, trigger, bestFor]) => (
                    <tr key={mode} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '10px 16px', fontFamily: "'JetBrains Mono', monospace", color: '#fff', fontWeight: 600 }}>{mode}</td>
                      <td style={{ padding: '10px 16px', color: '#aaa' }}>{trigger}</td>
                      <td style={{ padding: '10px 16px', color: '#888' }}>{bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 5. Response Fields Reference ═══ */}
          <section id="response-fields" style={{ marginBottom: 56, scrollMarginTop: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>
              5. Response Fields
            </h3>
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {['Field', 'Type', 'Description'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.6875rem', background: 'rgba(255,255,255,0.02)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['valid', 'boolean', 'Whether the input passed the minimum quality threshold'],
                    ['score', 'number', 'Quality rating from 0 (worst) to 100 (best)'],
                    ['confidence', 'number', 'AI confidence in its assessment (0.0 – 1.0)'],
                    ['issue', 'string', 'Issue type: EMPTY, TOO_SHORT, RANDOM_TEXT, SPAM, LOW_QUALITY, ACCEPTABLE'],
                    ['severity', 'string', 'Feedback severity: success, info, warning, error'],
                    ['feedback', 'string', 'Human-readable suggestion for the user'],
                    ['exampleAnswer', 'string?', 'AI-generated example of a better response'],
                    ['feedbackCategory', 'string?', 'Categorization of the feedback type'],
                  ].map(([field, type, desc]) => (
                    <tr key={field} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '10px 16px', fontFamily: "'JetBrains Mono', monospace", color: '#fff', fontWeight: 600 }}>{field}</td>
                      <td style={{ padding: '10px 16px', fontFamily: "'JetBrains Mono', monospace", color: '#666' }}>{type}</td>
                      <td style={{ padding: '10px 16px', color: '#aaa' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 6. AI Integration — Skill File ═══ */}
          <section id="ai-skill" style={{ marginBottom: 56, scrollMarginTop: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
              6. AI Integration — Skill File
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.9375rem', marginBottom: 20 }}>
              Copy the AI integration prompt below or download the <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, fontSize: '0.8125rem' }}>normy-skill.md</code> file. 
              Feed it to your AI coding assistant (Cursor, Copilot, Claude, etc.) so it can help you integrate Normy into your codebase.
            </p>

            <div style={{
              background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              overflow: 'hidden', marginBottom: 20,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>normy-skill.md</span>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(76,175,145,0.12)', border: '1px solid rgba(76,175,145,0.25)', color: '#4caf91',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>AI Ready</span>
                </div>
                <span style={{ fontSize: '0.6875rem', color: '#555', fontFamily: "'JetBrains Mono', monospace" }}>
                  {(NORMY_SKILL_MD.length / 1024).toFixed(1)} KB
                </span>
              </div>
              <pre style={{
                padding: '16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem',
                lineHeight: 1.6, overflowX: 'auto', margin: 0, color: '#888',
                maxHeight: 280, overflowY: 'auto',
              }}>
                {NORMY_SKILL_MD}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <LiquidMetalButton
                label={copiedSkill ? "✓ Copied!" : "Copy AI Prompt"}
                onClick={handleCopySkill}
              />
              <GlassButton onClick={handleDownloadSkill} icon={<DownloadIcon />}>
                Download normy-skill.md
              </GlassButton>
            </div>
          </section>

          {/* ═══ 7. Frequently Asked Questions ═══ */}
          <section id="faqs" style={{ marginBottom: 56, scrollMarginTop: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 20 }}>
              7. Frequently Asked Questions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div id="faq-contradiction">
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                  • Can Normy detect contradictions between multiple form fields?
                </h4>
                <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0, paddingLeft: 12, lineHeight: 1.6 }}>
                  Yes! You can pass state from other form elements (like ratings, select values, or toggle buttons) into the <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, fontSize: '0.8125rem' }}>fieldContext</code> property of <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, fontSize: '0.8125rem' }}>useValidation</code>. The AI validator will use this context to detect inconsistencies — such as flagging when a user gives a 1-star rating but writes "the service was great".
                </p>
              </div>
              <div id="faq-languages">
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                  • Which languages are supported by the validation engine?
                </h4>
                <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0, paddingLeft: 12, lineHeight: 1.6 }}>
                  Normy supports <strong>virtually all modern languages</strong> natively. Since it is powered by Gemini and other advanced LLMs, it can understand, grade, and respond with contextual hints in English, Spanish, French, Chinese, Japanese, Arabic, and over 100+ other languages automatically.
                </p>
              </div>
            </div>
          </section>

          {/* ═══ 8. Liquid Metal Button Showcase ═══ */}
          <section id="showcase" style={{ marginBottom: 20, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.08)', scrollMarginTop: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Interactive UI Elements
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.9375rem', marginBottom: 20 }}>
              Normy ships premium glassmorphic UI components. Hover and click to interact:
            </p>
            <div style={{
              padding: 32, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              background: 'rgba(255,255,255,0.01)',
            }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <LiquidMetalButton label="Submit Query" onClick={() => alert('Query Submitted')} />
                <LiquidMetalButton viewMode="icon" onClick={() => alert('Sparkles Clicked')} />
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#444', fontFamily: "'JetBrains Mono', monospace" }}>
                Pure CSS — No WebGL required
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
