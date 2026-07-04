import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { NormyContext, type FieldValidationState } from '../context/NormyContext.js';
import { NormyClient } from '../client/api.js';
import { NormyBadge } from './NormyBadge.js';
import { AssistantContext, type ActiveFieldContext } from './NormyAssistant.js';
import type { ValidationMode } from '../types.js';

export interface NormyProviderProps {
  /** Your Normy API key (nrm_live_... or nrm_test_...) */
  apiKey: string;
  /** The Normy project ID */
  projectId: string;
  /**
   * Default validation mode for all fields.
   * Can be overridden per-field via the validationMode prop.
   * @default 'onPause'
   */
  defaultMode?: ValidationMode | undefined;
  /**
   * Debounce delay for onPause mode in milliseconds.
   * @default 2000
   */
  pauseMs?: number | undefined;
  /** Override the API base URL. Useful for self-hosted instances. */
  apiUrl?: string | undefined;
  /**
   * Automatically show the "Validated by Normy" liquid glass badge at the bottom of the form container.
   * @default true
   */
  showBadge?: boolean | undefined;
  /**
   * Keyboard shortcut to open/close the assistant textbox.
   * @default 'Ctrl+/'
   */
  assistantShortcut?: string | undefined;
  children: React.ReactNode;
}

export function NormyProvider({
  apiKey,
  projectId,
  defaultMode = 'onPause',
  pauseMs = 2000,
  apiUrl,
  showBadge = true,
  assistantShortcut = 'Ctrl+/',
  children,
}: NormyProviderProps) {
  const client = useMemo(
    () => new NormyClient({ apiKey, baseUrl: apiUrl }),
    [apiKey, apiUrl]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [activeField, setActiveField] = useState<ActiveFieldContext | null>(null);

  const [fields, setFields] = useState<Record<string, FieldValidationState>>({});

  const registerField = useCallback((id: string, initial: FieldValidationState) => {
    setFields((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: initial };
    });
  }, []);

  const updateField = useCallback((id: string, update: FieldValidationState) => {
    setFields((prev) => {
      const current = prev[id];
      if (current && current.isValid === update.isValid && current.score === update.score) {
        return prev;
      }
      return { ...prev, [id]: update };
    });
  }, []);

  const unregisterField = useCallback((id: string) => {
    setFields((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // 1. Listen for custom keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const parts = assistantShortcut.toLowerCase().split('+');
      const needsCtrl = parts.includes('ctrl') || parts.includes('control') || parts.includes('cmd') || parts.includes('meta');
      const needsAlt = parts.includes('alt');
      const needsShift = parts.includes('shift');
      const keyChar = parts[parts.length - 1];

      const isCtrlMatched = needsCtrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const isAltMatched = needsAlt ? e.altKey : !e.altKey;
      const isShiftMatched = needsShift ? e.shiftKey : !e.shiftKey;
      
      const isKeyMatched = 
        e.key.toLowerCase() === keyChar || 
        e.code.toLowerCase() === `key${keyChar}` ||
        (keyChar === '/' && e.key === '/');

      if (isCtrlMatched && isAltMatched && isShiftMatched && isKeyMatched) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assistantShortcut]);

  // 2. Automatically capture focus changes on form fields
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        // Exclude assistant's own widgets to prevent self-focus overriding placeholders
        if (
          target.closest('.normy-floating-assistant') ||
          target.closest('.normy-help-button') ||
          target.closest('.normy-assist')
        ) {
          return;
        }

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

  const normyValue = useMemo(
    () => ({
      client,
      projectId,
      defaultMode,
      pauseMs,
      fields,
      registerField,
      updateField,
      unregisterField,
    }),
    [client, projectId, defaultMode, pauseMs, fields, registerField, updateField, unregisterField]
  );

  const assistantValue = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((prev) => !prev),
      activeField,
      setActiveField,
      shortcut: assistantShortcut,
    }),
    [isOpen, activeField, assistantShortcut]
  );

  return (
    <NormyContext.Provider value={normyValue}>
      <AssistantContext.Provider value={assistantValue}>
        {children}
        {showBadge && <NormyBadge />}
      </AssistantContext.Provider>
    </NormyContext.Provider>
  );
}
