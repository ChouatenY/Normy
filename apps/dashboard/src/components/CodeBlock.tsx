'use client';

import React, { useState } from 'react';

interface CodeBlockProps {
  title: string;
  code: string;
  lang?: string;
}

export function CodeBlock({ title, code, lang: _lang = 'tsx' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div style={{
      background: 'rgba(0,0,0,0.4)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      marginBottom: 20,
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.02)'
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sec)', fontFamily: 'var(--mono)' }}>
          {title}
        </span>

        {/* Premium Copy Button with Liquid Glass design */}
        <button
          onClick={handleCopy}
          style={{
            position: 'relative',
            background: copied ? 'rgba(76, 175, 145, 0.15)' : 'var(--glass-bg)',
            border: `1px solid ${copied ? 'var(--teal)' : 'var(--glass-border)'}`,
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: '0.75rem',
            color: copied ? 'var(--teal)' : 'var(--text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font)',
            fontWeight: 600,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'var(--glass-shadow)',
          }}
          className="copy-btn"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <pre style={{
        padding: 16,
        overflowX: 'auto',
        margin: 0,
        background: 'var(--near-black)',
      }}>
        <code style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.8125rem',
          color: 'var(--text)',
          lineHeight: 1.5,
          whiteSpace: 'pre'
        }}>
          {code}
        </code>
      </pre>
    </div>
  );
}
