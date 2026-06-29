'use client';

import React, { useState } from 'react';
import { LiquidMetalButton } from './LiquidMetalButton.js';

interface InteractiveDocsProps {
  projectId?: string;
  apiKey?: string;
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
          fontSize: '0.6875rem', fontWeight: 700, color: '#666', fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>{title}</div>
      )}
      <div style={{
        background: 'var(--near-black, #070707)', border: '1px solid var(--border, rgba(255,255,255,0.1))', borderRadius: 6,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))' }}>
          <span style={{ fontSize: '0.6875rem', color: '#555', fontFamily: "'JetBrains Mono', monospace" }}>{lang ?? ''}</span>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4,
              fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
              background: copied ? 'rgba(76,175,145,0.12)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${copied ? 'rgba(76,175,145,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: copied ? '#4caf91' : '#888',
            }}
          >
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre style={{ padding: '14px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem', lineHeight: 1.65, overflowX: 'auto', margin: 0, color: 'var(--text, #fff)' }}>
          {code}
        </pre>
      </div>
    </div>
  );
}

/* ── Glass action button ── */
function GlassButton({ children, onClick, icon }: { children: React.ReactNode; onClick?: () => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        borderRadius: 6,
        fontSize: '0.8125rem',
        fontWeight: 600,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export function InteractiveDocs({
  projectId = 'proj_example_123',
  apiKey = 'nrm_live_example_key_abc',
}: InteractiveDocsProps) {
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [framework, setFramework] = useState<'react' | 'nextjs' | 'vanillajs'>('react');
  const [copiedSkill, setCopiedSkill] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const providerValue = provider === 'gemini' ? 'gemini' : provider === 'openai' ? 'openai' : 'anthropic';
  const apiHostUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';

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
      apiKey="${apiKey}"
      projectId="${projectId}"
      apiUrl="${apiHostUrl}"
      showBadge={true}
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
curl -X POST ${apiHostUrl}/validate \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "${projectId}",
    "question": "Describe your experience",
    "answer": "it was fine",
    "provider": "${providerValue}"
  }'
\`\`\`

## Key Concepts
- **score**: 0-100 quality rating
- **severity**: success | info | warning | error
- **issue**: EMPTY | TOO_SHORT | RANDOM_TEXT | SPAM | LOW_QUALITY | ACCEPTABLE
- **feedback**: Human-readable suggestion for improvement

## Validation Modes
| Mode | Trigger | Best For |
|------|---------|----------|
| onPause | User stops typing for N ms | Long text fields |
| onBlur | Field loses focus | Short inputs |
| onSubmit | Form submission | Final gate check |
`;

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
    <div style={{ color: '#fff', lineHeight: 1.6 }}>

      {/* ═══ Header Sticky Controls Panel ═══ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '16px 24px',
        marginBottom: 36,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* AI Provider Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Provider:</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              style={{
                background: '#070707',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="gemini">Gemini (Default)</option>
              <option value="openai">OpenAI GPT</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>

          {/* Framework Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Framework:</span>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value as any)}
              style={{
                background: '#070707',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="react">React SDK</option>
              <option value="nextjs">Next.js</option>
              <option value="vanillajs">Vanilla JS</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.6875rem', color: '#666', fontFamily: 'monospace' }}>
          Active Project: {projectId}
        </div>
      </div>

      {/* ═══ Two-Column Layout ═══ */}
      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', position: 'relative' }}>
        
        {/* Left Sticky Sidebar */}
        <aside
          style={{
            width: '240px',
            flexShrink: 0,
            position: 'sticky',
            top: '100px',
            maxHeight: 'calc(100vh - 160px)',
            overflowY: 'auto',
            padding: '12px 8px 24px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', fontFamily: "'JetBrains Mono', monospace" }}>
            Sections
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              onClick={() => scrollToSection('installation')}
              style={{
                background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '4px 0',
                textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>01.</span> Installation
            </button>

            <button
              onClick={() => scrollToSection('react-sdk')}
              style={{
                background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '4px 0',
                textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>02.</span> React Setup
            </button>

            <button
              onClick={() => scrollToSection('rest-api')}
              style={{
                background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '4px 0',
                textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>03.</span> REST API
            </button>

            <button
              onClick={() => scrollToSection('validation-modes')}
              style={{
                background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '4px 0',
                textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>04.</span> Modes
            </button>

            <button
              onClick={() => scrollToSection('response-fields')}
              style={{
                background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '4px 0',
                textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>05.</span> Response Fields
            </button>

            <button
              onClick={() => scrollToSection('ai-skill')}
              style={{
                background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '4px 0',
                textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>06.</span> AI Skill File
            </button>

            <button
              onClick={() => scrollToSection('faqs')}
              style={{
                background: 'none', border: 'none', color: '#fff', textAlign: 'left',
                fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: '4px 0',
                textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>07.</span> FAQ Section
            </button>
          </div>
        </aside>

        {/* Right Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          
          {/* ═══ 1. Installation ═══ */}
          <section id="installation" style={{ marginBottom: 56, scrollMarginTop: '100px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>
              1. Installation
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <CodeBlock
                title="React Project"
                lang="bash"
                code={framework === 'vanillajs' ? "npm install @normy/js" : "npm install @normy-validation/react"}
              />
              <CodeBlock
                title="Alternative Framework"
                lang="bash"
                code={framework === 'vanillajs' ? "npm install @normy-validation/react" : "npm install @normy/js"}
              />
            </div>
          </section>

          {/* ═══ 2. React SDK Setup ═══ */}
          <section id="react-sdk" style={{ marginBottom: 56, scrollMarginTop: '100px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
              2. {framework === 'vanillajs' ? 'Vanilla JS Integration' : 'React SDK Setup'}
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.9375rem', marginBottom: 20 }}>
              {framework === 'vanillajs' 
                ? 'Initialize the NormyClient in vanilla JS and invoke the validate function directly.'
                : 'Wrap your app with NormyProvider and use the useValidation hook on your inputs.'}
            </p>

            {framework === 'vanillajs' ? (
              <CodeBlock
                title="Vanilla JS Integration example"
                lang="javascript"
                code={`import { NormyClient } from '@normy/js';

const normy = new NormyClient({
  apiKey: "${apiKey}",
  projectId: "${projectId}",
  apiUrl: "${apiHostUrl}"
});

const result = await normy.validate({
  question: "Primary address?",
  answer: "123 Main St",
  provider: "${providerValue}"
});`}
              />
            ) : framework === 'nextjs' ? (
              <>
                <CodeBlock
                  title="Next.js Layout Setup"
                  lang="tsx"
                  code={`'use client';
import { NormyProvider } from '@normy-validation/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NormyProvider
          apiKey="${apiKey}"
          projectId="${projectId}"
          apiUrl="${apiHostUrl}"
        >
          {children}
        </NormyProvider>
      </body>
    </html>
  );
}`}
                />
              </>
            ) : (
              <>
                <CodeBlock
                  title="App Entry — Provider Setup"
                  lang="tsx"
                  code={`import { NormyProvider } from '@normy-validation/react';
 
function App() {
  return (
    <NormyProvider
      apiKey="${apiKey}"
      projectId="${projectId}"
      apiUrl="${apiHostUrl}"
      showBadge={true}
    >
      <MyForm />
    </NormyProvider>
  );
}`}
                />
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
              </>
            )}
          </section>

          {/* ═══ 3. REST API Reference ═══ */}
          <section id="rest-api" style={{ marginBottom: 56, scrollMarginTop: '100px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
              3. REST API — Direct Integration
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.9375rem', marginBottom: 20 }}>
              Use direct HTTP requests to call the validation API pipeline from backend routers or mobile platforms.
            </p>

            <div id="rest-curl">
              <CodeBlock
                title="cURL Example"
                lang="bash"
                code={`curl -X POST ${apiHostUrl}/validate \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "${projectId}",
    "question": "What is the primary reason for cancelling?",
    "answer": "i dont care",
    "provider": "${providerValue}"
  }'`}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <CodeBlock
                title="Request Headers"
                lang="http"
                code={`Authorization: Bearer ${apiKey}
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
  "exampleAnswer": "The pricing was out of my range..."
}`}
              />
            </div>
          </section>

          {/* ═══ 4. Validation Modes ═══ */}
          <section id="validation-modes" style={{ marginBottom: 56, scrollMarginTop: '100px' }}>
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
          <section id="response-fields" style={{ marginBottom: 56, scrollMarginTop: '100px' }}>
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
          <section id="ai-skill" style={{ marginBottom: 56, scrollMarginTop: '100px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
              6. AI Integration — Skill File
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.9375rem', marginBottom: 20 }}>
              Inject the prompt below or download the <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, fontSize: '0.8125rem' }}>normy-skill.md</code> file into your coding LLM.
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
              <GlassButton onClick={handleDownloadSkill} icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }>
                Download normy-skill.md
              </GlassButton>
            </div>
          </section>

          {/* ═══ 7. Frequently Asked Questions ═══ */}
          <section id="faqs" style={{ marginBottom: 56, scrollMarginTop: '100px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 20 }}>
              7. Frequently Asked Questions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div id="faq-contradiction">
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                  • Can Normy detect contradictions between multiple form fields?
                </h4>
                <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0, paddingLeft: 12, lineHeight: 1.6 }}>
                  Yes! You can pass state from other form elements (like ratings, select values, or toggle buttons) into the field context. The AI validator will use this to flag contradictions in real-time.
                </p>
              </div>
              <div id="faq-languages">
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                  • Which languages are supported by the validation engine?
                </h4>
                <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0, paddingLeft: 12, lineHeight: 1.6 }}>
                  Since it uses Gemini and LLM backends, Normy natively supports English, French, Spanish, German, Japanese, Arabic, and 100+ other languages automatically.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
