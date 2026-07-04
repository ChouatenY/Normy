import React, { useState, useEffect, useRef } from 'react';
import { useNormy } from '../hooks/useNormy.js';
import type { AssistantMessage } from '../types.js';

export interface NormyAssistProps {
  /** Optional conversation ID to restore chat history */
  conversationId?: string;
  /** Callback triggered when a new conversation is started */
  onConversationIdChange?: (id: string) => void;
  /** Developer inline documentation context */
  knowledge?: string;
  /** Placement of the widget on screen */
  placement?: 'bottom-right' | 'bottom-left' | 'inline';
  /** Primary theme color for button and bubbles */
  themeColor?: string;
  /** Initial welcome message from the assistant */
  welcomeMessage?: string;
  /** Optional custom class for the floating trigger button */
  triggerButtonClass?: string;
  /** Optional custom class for the chat container window */
  windowClass?: string;
  /** Custom title for the chat widget header */
  title?: string;
  /** Session ID to tag analytical events */
  sessionId?: string;
}

export function NormyAssist({
  conversationId: propConversationId,
  onConversationIdChange,
  knowledge = '',
  placement = 'bottom-right',
  themeColor = '#4f46e5', // Sleek indigo
  welcomeMessage = "Hi! I'm Normy Assist. Ask me anything about this form.",
  triggerButtonClass = '',
  windowClass = '',
  title = 'Normy Assist',
  sessionId,
}: NormyAssistProps) {
  const { client, projectId } = useNormy();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(propConversationId);
  const [activeField, setActiveField] = useState<{
    id: string;
    question?: string | undefined;
    label?: string | undefined;
    hint?: string | undefined;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync conversation ID from props if changed
  useEffect(() => {
    if (propConversationId) {
      setConversationId(propConversationId);
      // Fetch messages for this conversation
      client.getMessages(propConversationId).then((res) => {
        if (res.ok) {
          // Messages come sorted DESC from API, reverse them for chat UI order
          setMessages([...res.data.messages].reverse());
        }
      });
    }
  }, [propConversationId, client]);

  // Load initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          conversationId: '',
          role: 'assistant',
          content: welcomeMessage,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }, [welcomeMessage, messages.length]);

  // Auto-scroll to bottom of chat window
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Track currently focused element in the document
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        const question = target.getAttribute('data-normy-question');
        const label = target.getAttribute('data-normy-label');
        const hint = target.getAttribute('data-normy-hint');
        const id = target.id || target.getAttribute('name') || 'unknown';

        setActiveField({
          id,
          question: question || undefined,
          label: label || undefined,
          hint: hint || undefined,
        });
      }
    };

    const handleFocusOut = () => {
      // Small timeout to allow next focusin to register before clearing
      setTimeout(() => {
        if (document.activeElement === document.body) {
          setActiveField(null);
        }
      }, 50);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const userText = inputText;
    setInputText('');
    setIsSending(true);

    const userMsgId = Math.random().toString();
    const newUserMsg: AssistantMessage = {
      id: userMsgId,
      conversationId: conversationId || '',
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMsg]);

    const chatReq = {
      projectId,
      message: userText,
      conversationId,
      fieldContext: activeField
        ? {
            fieldId: activeField.id,
            question: activeField.question,
            helpContext: activeField.hint,
          }
        : undefined,
      sessionId,
      knowledge,
    };

    const res = await client.chat(chatReq);
    setIsSending(false);

    if (res.ok) {
      const assistantMsg: AssistantMessage = {
        id: res.data.messageId,
        conversationId: res.data.conversationId,
        role: 'assistant',
        content: res.data.response,
        createdAt: res.data.createdAt,
      };

      if (!conversationId) {
        setConversationId(res.data.conversationId);
        onConversationIdChange?.(res.data.conversationId);
      }

      setMessages((prev) => [...prev, assistantMsg]);
    } else {
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        conversationId: conversationId || '',
        role: 'assistant',
        content: `Sorry, I encountered an error: ${res.error.error}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleRate = async (messageId: string, rating: 'helpful' | 'unhelpful') => {
    const res = await client.rateMessage(messageId, rating);
    if (res.ok) {
      // Local state feedback indicator
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, metadata: { ...msg.metadata, rated: rating } }
            : msg
        )
      );
    }
  };

  // Styles computed inline for maximum compatibility
  const triggerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: placement === 'bottom-right' ? '24px' : undefined,
    left: placement === 'bottom-left' ? '24px' : undefined,
    width: '60px',
    height: '60px',
    borderRadius: '30px',
    backgroundColor: themeColor,
    color: '#fff',
    border: 'none',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    display: placement === 'inline' ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    transition: 'transform 200ms ease, background-color 200ms ease',
  };

  const windowStyle: React.CSSProperties = {
    position: placement === 'inline' ? 'relative' : 'fixed',
    bottom: placement === 'inline' ? undefined : '96px',
    right: placement === 'bottom-right' ? '24px' : undefined,
    left: placement === 'bottom-left' ? '24px' : undefined,
    width: placement === 'inline' ? '100%' : '380px',
    height: placement === 'inline' ? '450px' : '520px',
    maxHeight: placement === 'inline' ? undefined : 'calc(100vh - 120px)',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: placement === 'inline' ? 'none' : '0 12px 40px rgba(0,0,0,0.15)',
    border: '1px solid #e5e7eb',
    display: placement === 'inline' || isOpen ? 'flex' : 'none',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9998,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  return (
    <>
      {placement !== 'inline' && (
        <button
          style={triggerStyle}
          onClick={() => setIsOpen(!isOpen)}
          className={triggerButtonClass}
          aria-label="Toggle assistant"
        >
          {isOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          )}
        </button>
      )}

      <div style={windowStyle} className={windowClass}>
        {/* Header */}
        <div style={{
          padding: '16px',
          backgroundColor: themeColor,
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h4>
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>AI Form Guide</span>
          </div>
          {placement !== 'inline' && (
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                opacity: 0.8,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Focused Context Indicator */}
        {activeField && (
          <div style={{
            padding: '10px 16px',
            backgroundColor: '#f3f4f6',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '0.8125rem',
            color: '#4b5563',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: '#10b981',
              display: 'inline-block',
            }} />
            <span>
              Explaining: <strong>{activeField.label || activeField.question || activeField.id}</strong>
            </span>
          </div>
        )}

        {/* Message Panel */}
        <div style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#fafafa',
        }}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isWelcome = msg.id === 'welcome';
            const rated = msg.metadata?.rated;

            return (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  borderTopRightRadius: isUser ? '2px' : '12px',
                  borderTopLeftRadius: !isUser ? '2px' : '12px',
                  backgroundColor: isUser ? themeColor : '#fff',
                  color: isUser ? '#fff' : '#1f2937',
                  border: isUser ? 'none' : '1px solid #e5e7eb',
                  fontSize: '0.875rem',
                  lineHeight: '1.45',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  {msg.content}
                </div>

                {/* Rating component under assistant replies */}
                {!isUser && !isWelcome && msg.id !== 'welcome' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '4px',
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    paddingLeft: '4px',
                  }}>
                    {rated ? (
                      <span style={{ color: '#10b981', fontWeight: 500 }}>
                        Thank you for your feedback!
                      </span>
                    ) : (
                      <>
                        <span>Was this helpful?</span>
                        <button
                          onClick={() => handleRate(msg.id, 'helpful')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Helpful"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRate(msg.id, 'unhelpful')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Unhelpful"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-5h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {isSending && (
            <div style={{
              alignSelf: 'flex-start',
              padding: '10px 14px',
              borderRadius: '12px',
              borderTopLeftRadius: '2px',
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '3px', backgroundColor: '#9ca3af', animation: 'bounce 1s infinite' }} />
              <span style={{ width: '6px', height: '6px', borderRadius: '3px', backgroundColor: '#9ca3af', animation: 'bounce 1s infinite 0.2s' }} />
              <span style={{ width: '6px', height: '6px', borderRadius: '3px', backgroundColor: '#9ca3af', animation: 'bounce 1s infinite 0.4s' }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            backgroundColor: '#fff',
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={activeField ? `Ask about "${activeField.label || activeField.id}"...` : "Ask a question about the form..."}
            disabled={isSending}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            style={{
              backgroundColor: inputText.trim() && !isSending ? themeColor : '#e5e7eb',
              color: inputText.trim() && !isSending ? '#fff' : '#9ca3af',
              border: 'none',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              cursor: inputText.trim() && !isSending ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 150ms ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}} />
    </>
  );
}
