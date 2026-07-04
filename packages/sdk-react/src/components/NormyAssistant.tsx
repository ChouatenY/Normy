import React, { useState, useEffect, useRef, useContext, createContext } from 'react';
import { useNormy } from '../hooks/useNormy.js';

// ─── Knowledge Context & Provider ───────────────────────────────────────────
export const KnowledgeContext = createContext<string>('');

export function useKnowledgeContext() {
  return useContext(KnowledgeContext);
}

export interface NormyKnowledgeProviderProps {
  knowledge?: string | undefined;
  knowledgeSources?: string[] | undefined;
  children: React.ReactNode;
}

export function NormyKnowledgeProvider({
  knowledge = '',
  knowledgeSources = [],
  children,
}: NormyKnowledgeProviderProps) {
  const [fetchedDocs, setFetchedDocs] = useState<string>('');

  useEffect(() => {
    if (knowledgeSources && knowledgeSources.length > 0) {
      Promise.all(
        knowledgeSources.map((url) =>
          fetch(url)
            .then((res) => (res.ok ? res.text() : ''))
            .catch(() => '')
        )
      )
        .then((texts) => {
          setFetchedDocs(texts.filter(Boolean).join('\n\n'));
        })
        .catch(() => {});
    }
  }, [knowledgeSources]);

  const combined = [knowledge, fetchedDocs].filter(Boolean).join('\n\n');

  return (
    <KnowledgeContext.Provider value={combined}>
      {children}
    </KnowledgeContext.Provider>
  );
}

// ─── Assistant Context ────────────────────────────────────────────────────────
export interface ActiveFieldContext {
  id: string;
  question?: string | undefined;
  label?: string | undefined;
  hint?: string | undefined;
}

export interface AssistantContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  activeField: ActiveFieldContext | null;
  setActiveField: (field: ActiveFieldContext | null) => void;
  shortcut: string;
}

export const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useNormyAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error('useNormyAssistant must be used within a NormyProvider (or AssistantContext.Provider)');
  }
  return ctx;
}

// ─── Normy Help Button ────────────────────────────────────────────────────────
export interface NormyHelpButtonProps {
  fieldId: string;
  question?: string | undefined;
  label?: string | undefined;
  hint?: string | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
  children?: React.ReactNode;
}

export function NormyHelpButton({
  fieldId,
  question,
  label,
  hint,
  className = '',
  style = {},
  children,
}: NormyHelpButtonProps) {
  const assistant = useNormyAssistant();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    assistant.setActiveField({
      id: fieldId,
      question: question || label || fieldId,
      label: label || question,
      hint: hint,
    });
    assistant.open();
  };

  return (
    <button
      onClick={handleClick}
      className={`normy-help-button ${className}`}
      style={{
        background: 'none',
        border: 'none',
        color: '#6366f1',
        cursor: 'pointer',
        padding: '2px 6px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.85rem',
        fontWeight: 500,
        borderRadius: '4px',
        transition: 'all 150ms ease',
        ...style,
      }}
      title={`Get help with ${label || fieldId}`}
    >
      {children || (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      )}
      {!children && 'Help'}
    </button>
  );
}

// ─── Normy Floating Assistant (Single Text Box View) ─────────────────────────
export interface NormyFloatingAssistantProps {
  welcomePlaceholder?: string | undefined;
  themeColor?: string | undefined;
  className?: string | undefined;
}

export function NormyFloatingAssistant({
  welcomePlaceholder = 'Need assistance with this form? Ask here...',
  className = '',
}: NormyFloatingAssistantProps) {
  const { client, projectId } = useNormy();
  const assistant = useNormyAssistant();
  const inlineKnowledge = useKnowledgeContext();

  const [inputText, setInputText] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSendHovered, setIsSendHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (assistant.isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [assistant.isOpen]);

  // Inject keyframes for liquid metal shimmer
  useEffect(() => {
    const styleId = "normy-liquid-metal-anims";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes lm-shimmer {
          0%   { background-position: 200% 50%; }
          100% { background-position: -200% 50%; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (!assistant.isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const query = inputText;
    setIsSending(true);
    setResponse(null);

    const res = await client.chat({
      projectId,
      message: query,
      fieldContext: assistant.activeField
        ? {
            fieldId: assistant.activeField.id,
            question: assistant.activeField.question,
            helpContext: assistant.activeField.hint,
          }
        : undefined,
      knowledge: inlineKnowledge,
    });

    setIsSending(false);
    if (res.ok) {
      setResponse(res.data.response);
      setInputText('');
    } else {
      setResponse(`Sorry, I couldn't process your request: ${res.error.error}`);
    }
  };

  const activeFieldName = assistant.activeField?.label || assistant.activeField?.question || assistant.activeField?.id;
  const placeholder = activeFieldName
    ? `Ask about "${activeFieldName}"...`
    : welcomePlaceholder;

  const sendButtonMetalGradient = isSendHovered
    ? 'linear-gradient(135deg, #5a5a5a 0%, #a0a0a0 20%, #e0e0e0 35%, #ffffff 50%, #e0e0e0 65%, #a0a0a0 80%, #5a5a5a 100%)'
    : 'linear-gradient(135deg, #2c2c2c 0%, #555555 20%, #8c8c8c 35%, #c0c0c0 50%, #8c8c8c 65%, #555555 80%, #2c2c2c 100%)';
  const sendButtonOuterGlow = isSendHovered
    ? '0 0 0 1px rgba(255,255,255,0.5), 0 4px 12px rgba(255,255,255,0.2)'
    : '0 0 0 1px rgba(255,255,255,0.25), 0 2px 6px rgba(0,0,0,0.5)';

  return (
    <div
      className={`normy-floating-assistant ${className}`}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        maxWidth: 'calc(100vw - 48px)',
        zIndex: 9999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Response Panel */}
      {(response || isSending) && (
        <div
          style={{
            backgroundColor: 'var(--normy-assistant-bg, rgba(17, 17, 17, 0.9))',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--normy-assistant-border, rgba(255, 255, 255, 0.12))',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: 'var(--normy-assistant-shadow, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05))',
            maxHeight: '260px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {isSending ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 0' }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #5a5a5a 0%, #a0a0a0 20%, #e0e0e0 35%, #ffffff 50%, #e0e0e0 65%, #a0a0a0 80%, #5a5a5a 100%)',
                backgroundSize: '400% 100%',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.45), 0 2px 4px rgba(0,0,0,0.5)',
                display: 'inline-block',
                animation: 'normy-bounce 1s infinite, lm-shimmer 4s linear infinite',
              }} />
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #5a5a5a 0%, #a0a0a0 20%, #e0e0e0 35%, #ffffff 50%, #e0e0e0 65%, #a0a0a0 80%, #5a5a5a 100%)',
                backgroundSize: '400% 100%',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.45), 0 2px 4px rgba(0,0,0,0.5)',
                display: 'inline-block',
                animation: 'normy-bounce 1s infinite 0.2s, lm-shimmer 4s linear infinite 0.2s',
              }} />
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #5a5a5a 0%, #a0a0a0 20%, #e0e0e0 35%, #ffffff 50%, #e0e0e0 65%, #a0a0a0 80%, #5a5a5a 100%)',
                backgroundSize: '400% 100%',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.45), 0 2px 4px rgba(0,0,0,0.5)',
                display: 'inline-block',
                animation: 'normy-bounce 1s infinite 0.4s, lm-shimmer 4s linear infinite 0.4s',
              }} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.9rem', color: 'var(--normy-assistant-text, #ffffff)', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                {response}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  onClick={() => setResponse(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--normy-assistant-accent, #ffffff)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    textDecoration: 'underline',
                  }}
                >
                  Got it
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          backgroundColor: 'var(--normy-assistant-input-bg, rgba(17, 17, 17, 0.85))',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--normy-assistant-border, rgba(255, 255, 255, 0.12))',
          borderRadius: '24px',
          padding: '8px 12px',
          boxShadow: 'var(--normy-assistant-shadow, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05))',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={placeholder}
          disabled={isSending}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: '0.9rem',
            color: 'var(--normy-assistant-text, #ffffff)',
            padding: '4px 8px',
            fontFamily: 'inherit',
          }}
        />

        {inputText.trim() && (
          <button
            type="submit"
            disabled={isSending}
            onMouseEnter={() => setIsSendHovered(true)}
            onMouseLeave={() => setIsSendHovered(false)}
            style={{
              position: 'relative',
              background: sendButtonMetalGradient,
              backgroundSize: '400% 100%',
              animation: 'lm-shimmer 4s linear infinite',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: sendButtonOuterGlow,
              transition: 'all 0.25s ease',
              overflow: 'hidden',
            }}
          >
            {/* Inner dark overlay for contrast */}
            <span
              style={{
                position: 'absolute',
                inset: 1.5,
                borderRadius: '50%',
                background: 'linear-gradient(180deg, rgba(20,20,20,0.85) 0%, rgba(0,0,0,0.92) 100%)',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />
            {/* Animated shimmer highlight */}
            <span
              style={{
                position: 'absolute',
                inset: 1.5,
                borderRadius: '50%',
                background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)',
                backgroundSize: '300% 100%',
                animation: 'lm-shimmer 3s ease-in-out infinite',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="3.5"
              style={{ position: 'relative', zIndex: 3, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={() => assistant.close()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--normy-assistant-muted, #9ca3af)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
          }}
          title="Close assistant"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </form>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes normy-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}} />
    </div>
  );
}

// ─── Normy Assistant (Unified Interface) ──────────────────────────────────────
export interface NormyAssistantProps {
  /** If true, renders the floating single text-field assistant at the bottom right. */
  floating?: boolean | undefined;
  welcomePlaceholder?: string | undefined;
  themeColor?: string | undefined;
  knowledge?: string | undefined;
  knowledgeSources?: string[] | undefined;
  shortcut?: string | undefined;
}

export function NormyAssistant({
  floating = true,
  welcomePlaceholder,
  themeColor,
  knowledge,
  knowledgeSources,
  shortcut: _shortcut,
}: NormyAssistantProps) {
  // If knowledge props are provided, we wrap with the knowledge provider.
  const content = floating ? (
    <NormyFloatingAssistant
      welcomePlaceholder={welcomePlaceholder}
      themeColor={themeColor}
    />
  ) : (
    // Inline implementation rendering in-place
    <div style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <NormyFloatingAssistant
        welcomePlaceholder={welcomePlaceholder}
        themeColor={themeColor}
      />
    </div>
  );

  if (knowledge || knowledgeSources) {
    return (
      <NormyKnowledgeProvider knowledge={knowledge} knowledgeSources={knowledgeSources}>
        {content}
      </NormyKnowledgeProvider>
    );
  }

  return content;
}
