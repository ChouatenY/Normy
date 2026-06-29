'use client';

import React, { useState } from 'react';
import { CodeBlock } from './CodeBlock';

interface InteractiveDocsProps {
  projectId?: string;
  apiKey?: string;
}

export function InteractiveDocs({ projectId = 'proj_example_123', apiKey = 'nrm_live_example_key_abc' }: InteractiveDocsProps) {
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [framework, setFramework] = useState<'react' | 'nextjs' | 'vanillajs'>('react');
  const [activeSection, setActiveSection] = useState('quickstart');

  // Compute values based on selection
  const providerLabel = provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'Anthropic Claude';
  const providerValue = provider === 'gemini' ? 'gemini' : provider === 'openai' ? 'openai' : 'anthropic';
  const providerEnvKey = provider === 'gemini' ? 'GEMINI_API_KEY' : provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';

  return (
    <div style={{ display: 'flex', gap: 32, minHeight: '80vh', position: 'relative' }}>
      
      {/* ── Left Sticky Navigation Checklist ── */}
      <div style={{
        width: 240,
        flexShrink: 0,
        position: 'sticky',
        top: 80,
        height: 'calc(100vh - 120px)',
        overflowY: 'auto',
        paddingRight: 12,
        borderRight: '1px solid var(--border)'
      }} className="liq-scrollbar">
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 16 }}>
          Documentation
        </div>
        {[
          { id: 'quickstart', label: 'Quick Start' },
          { id: 'installation', label: 'Installation' },
          { id: 'react', label: 'React Integration' },
          { id: 'nextjs', label: 'Next.js Setup' },
          { id: 'vanillajs', label: 'Vanilla JS SDK' },
          { id: 'api-reference', label: 'API Reference' },
          { id: 'authentication', label: 'Authentication' },
          { id: 'projects', label: 'Projects API' },
          { id: 'api-keys', label: 'API Keys API' },
          { id: 'validation', label: 'Validation Endpoint' },
          { id: 'toast-system', label: 'Toast System' },
          { id: 'gemini-provider', label: 'Gemini Provider' },
          { id: 'openai-provider', label: 'OpenAI Provider' },
          { id: 'claude-provider', label: 'Claude Provider' },
          { id: 'self-hosting', label: 'Self Hosting' },
          { id: 'deployment', label: 'Deployment Guide' },
          { id: 'contribution', label: 'Contribution Guide' },
          { id: 'faq', label: 'FAQ & Troubleshooting' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              padding: '8px 12px',
              borderRadius: 6,
              color: activeSection === item.id ? 'var(--white)' : 'var(--text-sec)',
              fontSize: '0.8125rem',
              fontWeight: activeSection === item.id ? 700 : 500,
              cursor: 'pointer',
              marginBottom: 4,
              transition: 'all 0.2s',
              borderLeft: activeSection === item.id ? '2px solid var(--white)' : '2px solid transparent'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Right Content Area with Selectors ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        
        {/* Dynamic Selector Sticky Panel */}
        <div style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '12px 20px',
          marginBottom: 32,
          position: 'sticky',
          top: 0,
          zIndex: 5,
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sec)' }}>AI Provider:</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="gemini">Gemini AI</option>
              <option value="openai">OpenAI GPT</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sec)' }}>Framework:</span>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value as any)}
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="react">React SDK</option>
              <option value="nextjs">Next.js</option>
              <option value="vanillajs">Vanilla JavaScript</option>
            </select>
          </div>
        </div>

        {/* Render sections conditionally */}
        {activeSection === 'quickstart' && (
          <div className="doc-section">
            <h2>Quick Start</h2>
            <p style={{ margin: '12px 0 24px', color: 'var(--text-sec)' }}>
              Get up and running with Normy in less than 5 minutes. Set up the provider and start validating fields automatically.
            </p>

            <CodeBlock
              title="1. Install the SDK package"
              lang="bash"
              code={framework === 'react' || framework === 'nextjs' 
                ? 'npm install @normy-validation/react'
                : 'npm install @normy/js'}
            />

            <CodeBlock
              title="2. Initialize the Provider wrapper"
              lang="tsx"
              code={framework === 'react' || framework === 'nextjs' ? `import { NormyProvider } from '@normy-validation/react';

function App() {
  return (
    <NormyProvider
      apiKey="${apiKey}"
      projectId="${projectId}"
      apiUrl="${process.env.NEXT_PUBLIC_NORMY_API_URL || 'http://localhost:3001'}"
    >
      <MyForm />
    </NormyProvider>
  );
}` : `import { NormyClient } from '@normy/js';

const normy = new NormyClient({
  apiKey: "${apiKey}",
  projectId: "${projectId}",
  apiUrl: "http://localhost:3001"
});`}
            />

            <CodeBlock
              title="3. Bind validation to fields"
              lang="tsx"
              code={framework === 'react' || framework === 'nextjs' ? `import { useValidation } from '@normy-validation/react';

function MyForm() {
  const comment = useValidation({
    mode: 'onPause',
    pauseMs: 1200,
    question: 'Please summarize your feedback for the developer experience.',
  });

  return (
    <div>
      <textarea
        value={comment.value}
        onChange={comment.handleChange}
        onBlur={comment.handleBlur}
      />
      {comment.status === 'validating' && <p>Analyzing your feedback...</p>}
      {comment.status === 'error' && <p style={{ color: 'red' }}>{comment.apiError || comment.result?.feedback}</p>}
    </div>
  );
}` : `const result = await normy.validate({
  question: "Please summarize your feedback for the developer experience.",
  answer: "I really love the liquid metal buttons!",
  provider: "${providerValue}"
});`}
            />
          </div>
        )}

        {activeSection === 'installation' && (
          <div className="doc-section">
            <h2>Installation</h2>
            <p style={{ margin: '12px 0 24px', color: 'var(--text-sec)' }}>
              Normy is packaged as a collection of modular npm packages. Install the one matching your stack.
            </p>
            <CodeBlock
              title="React / NextJS"
              lang="bash"
              code="npm install @normy-validation/react"
            />
            <CodeBlock
              title="Vanilla JavaScript / Node.js"
              lang="bash"
              code="npm install @normy/js"
            />
          </div>
        )}

        {activeSection === 'react' && (
          <div className="doc-section">
            <h2>React SDK Integration</h2>
            <CodeBlock
              title="React Integration Example"
              lang="tsx"
              code={`import { NormyProvider, useValidation } from '@normy-validation/react';

export default function App() {
  return (
    <NormyProvider apiKey="${apiKey}" projectId="${projectId}">
      <Form />
    </NormyProvider>
  );
}`}
            />
          </div>
        )}

        {activeSection === 'nextjs' && (
          <div className="doc-section">
            <h2>Next.js Setup</h2>
            <CodeBlock
              title="app/layout.tsx (Server/Client Wrapper)"
              lang="tsx"
              code={`'use client';
import { NormyProvider } from '@normy-validation/react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NormyProvider apiKey="${apiKey}" projectId="${projectId}">
          {children}
        </NormyProvider>
      </body>
    </html>
  );
}`}
            />
          </div>
        )}

        {activeSection === 'vanillajs' && (
          <div className="doc-section">
            <h2>Vanilla JS SDK Reference</h2>
            <CodeBlock
              title="Vanilla JS Integration"
              lang="javascript"
              code={`import { NormyClient } from '@normy/js';

const client = new NormyClient({ apiKey: "${apiKey}", projectId: "${projectId}" });
const res = await client.validate({
  question: "Primary address?",
  answer: "123 Main St",
  provider: "${providerValue}"
});`}
            />
          </div>
        )}

        {activeSection === 'api-reference' && (
          <div className="doc-section">
            <h2>API Reference</h2>
            <p style={{ margin: '12px 0 24px', color: 'var(--text-sec)' }}>
              Normy API endpoints communicate using JSON over HTTPS.
            </p>
            <CodeBlock
              title="POST /validate"
              lang="bash"
              code={`curl -X POST http://localhost:3001/validate \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "${projectId}",
    "question": "What are your core goals?",
    "answer": "To build an MVP validation platform",
    "provider": "${providerValue}"
  }'`}
            />
          </div>
        )}

        {/* Additional Fallback Sections */}
        {![ 'quickstart', 'installation', 'react', 'nextjs', 'vanillajs', 'api-reference' ].includes(activeSection) && (
          <div className="doc-section">
            <h2>{activeSection.replace('-', ' ').toUpperCase()}</h2>
            <p style={{ margin: '12px 0 24px', color: 'var(--text-sec)' }}>
              Configuration guides for provider <strong>{providerLabel}</strong> under the <strong>{framework === 'react' ? 'React' : framework === 'nextjs' ? 'Next.js' : 'Vanilla JS'}</strong> framework.
            </p>
            <CodeBlock
              title={`${providerLabel} Environment Configuration`}
              lang="bash"
              code={`# Add this to your VPS environment variables (.env)
AI_PROVIDER="${providerValue}"
${providerEnvKey}="your-key-here"
DATABASE_URL="postgresql://normy:normy@localhost:5432/normy"`}
            />
          </div>
        )}

      </div>
    </div>
  );
}
