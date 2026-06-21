/**
 * useMockValidation — replaces @normy/react's useValidation with a
 * fully client-side mock that never hits a real API.
 *
 * This lets the demo run without a running Normy API server.
 */

import { useState, useRef, useCallback } from 'react';
import type { ValidateResponse, ValidationMode } from '@normy/react';

// ─── Mock pipeline ────────────────────────────────────────────────────────────

const MOCK_RESPONSES: Record<string, ValidateResponse> = {
  empty: {
    valid: false, score: 0, confidence: 1, issue: 'EMPTY',
    severity: 'error', feedback: 'Please provide a response — this field cannot be empty.',
    feedbackCategory: 'input_quality',
  },
  too_short: {
    valid: false, score: 30, confidence: 1, issue: 'TOO_SHORT',
    severity: 'error', feedback: 'Your response is too brief. Please elaborate with more detail.',
    feedbackCategory: 'input_quality',
  },
  random: {
    valid: false, score: 15, confidence: 0.92, issue: 'RANDOM_TEXT',
    severity: 'error', feedback: 'This looks like random characters. Please write a meaningful response.',
    feedbackCategory: 'input_format',
  },
  spam: {
    valid: false, score: 5, confidence: 0.98, issue: 'SPAM',
    severity: 'error', feedback: 'Repetitive text detected. Please write a genuine response.',
    feedbackCategory: 'input_format',
  },
  low_quality: {
    valid: false, score: 45, confidence: 0.78, issue: 'LOW_QUALITY',
    severity: 'warning', feedback: 'Your answer could be more detailed. Try adding specific examples.',
    feedbackCategory: 'content_quality',
  },
  valid_info: {
    valid: true, score: 65, confidence: 0.85, issue: 'VALID',
    severity: 'info', feedback: 'Good answer — consider adding a bit more context if you can.',
    feedbackCategory: 'valid',
  },
  valid_success: {
    valid: true, score: 92, confidence: 0.97, issue: 'VALID',
    severity: 'success', feedback: 'Excellent! Your response is clear, relevant, and detailed.',
    feedbackCategory: 'valid',
  },
};

import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

async function mockValidate(answer: string, context?: string): Promise<ValidateResponse> {
  const trimmed = answer.trim();
  if (!trimmed)                            return MOCK_RESPONSES['empty']!;
  if (trimmed.length < 5)                  return MOCK_RESPONSES['too_short']!;
  if (/^[^a-zA-Z\s]{4,}$/.test(trimmed))  return MOCK_RESPONSES['random']!;
  if (/(.)\1{5,}/.test(trimmed))           return MOCK_RESPONSES['random']!;
  
  const words = trimmed.toLowerCase().split(/\s+/);
  const unique = new Set(words);
  if (words.length > 4 && unique.size / words.length < 0.35) return MOCK_RESPONSES['spam']!;

  const dynamicKey = typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null;
  const activeKey = apiKey || dynamicKey;
  
  if (activeKey && (!ai || ai.apiKey !== activeKey)) {
    ai = new GoogleGenAI({ apiKey: activeKey });
  }

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `
You are Normy, an AI form validation engine.
Analyze the user's response based on the following criteria.

Context: ${context || 'None'}

User Response:
"""
${answer}
"""

Evaluate ONLY for: CONTRADICTORY_RESPONSE, IRRELEVANT_RESPONSE, LOW_QUALITY, VALID.
Return JSON: { "issue": "...", "score": number(0-100), "confidence": number, "feedbackCategory": "...", "feedback": "..." }
        `,
        config: { responseMimeType: 'application/json' }
      });
      const parsed = JSON.parse(response.text || '{}');
      const safeIssue = ['IRRELEVANT_RESPONSE', 'CONTRADICTORY_RESPONSE', 'LOW_QUALITY', 'VALID'].includes(parsed.issue) ? parsed.issue : 'LOW_QUALITY';
      const score = parsed.score ?? 50;
      
      const map: any = {
        EMPTY: 'input_quality', TOO_SHORT: 'input_quality', RANDOM_TEXT: 'input_format', SPAM: 'input_format',
        LOW_QUALITY: 'content_quality', IRRELEVANT_RESPONSE: 'content_quality', CONTRADICTORY_RESPONSE: 'content_logic', VALID: 'valid'
      };

      return {
        valid: score >= 50,
        score,
        issue: safeIssue as any,
        feedbackCategory: map[safeIssue] || 'content_quality',
        feedback: parsed.feedback || 'Please refine your answer.',
        severity: score >= 80 ? 'success' : score >= 50 ? 'info' : score >= 30 ? 'warning' : 'error',
        validatedAt: new Date().toISOString(),
        provider: 'gemini',
        latencyMs: 500,
        confidence: parsed.confidence ?? 0.8
      };
    } catch (e) {
      console.error('Gemini error:', e);
      // fallback
    }
  }

  return new Promise((resolve) => {
    // Simulate network latency 200–600ms
    const latency = 200 + Math.random() * 400;
    setTimeout(() => {
      if (trimmed.length < 20)                  return resolve(MOCK_RESPONSES['low_quality']!);
      if (trimmed.length < 60)                  return resolve(MOCK_RESPONSES['valid_info']!);
      return resolve(MOCK_RESPONSES['valid_success']!);
    }, latency);
  });
}

// ─── State types (mirrors @normy/react's UseValidationReturn) ─────────────────

export type ValidationStatus =
  | 'idle' | 'validating' | 'success' | 'error' | 'rate_limited' | 'network_error';

export interface MockValidationState {
  value: string;
  status: ValidationStatus;
  result: ValidateResponse | null;
  isValidating: boolean;
  isValid: boolean;
  apiError: string | null;
}

export interface MockValidationReturn extends MockValidationState {
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: () => void;
  triggerValidation: () => Promise<void>;
  setValue: (v: string) => void;
  reset: () => void;
}

const IDLE: MockValidationState = {
  value: '', status: 'idle', result: null, isValidating: false, isValid: false, apiError: null,
};

interface UseMockValidationOptions {
  mode?: ValidationMode;
  pauseMs?: number;
  /** Simulate a 429 after this many calls (0 = never) */
  rateLimitAfter?: number;
  /** Simulate a network error on the Nth call */
  networkErrorOn?: number;
}

export function useMockValidation(opts: UseMockValidationOptions = {}): MockValidationReturn {
  const { mode = 'onPause', pauseMs = 1500, rateLimitAfter = 0, networkErrorOn = 0 } = opts;

  const [state, setState] = useState<MockValidationState>(IDLE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef    = useRef('');
  const callCount   = useRef(0);

  const run = useCallback(async (value: string) => {
    if (!value.trim()) {
      setState(s => ({ ...s, status: 'idle', result: null, apiError: null, isValidating: false }));
      return;
    }
    callCount.current++;
    setState(s => ({ ...s, isValidating: true, status: 'validating', apiError: null }));

    // Simulate rate limit
    if (rateLimitAfter > 0 && callCount.current > rateLimitAfter) {
      await new Promise(r => setTimeout(r, 250));
      setState(s => ({
        ...s, isValidating: false, status: 'rate_limited',
        apiError: 'Rate limit exceeded. Please wait a moment before trying again.',
      }));
      return;
    }
    // Simulate network error
    if (networkErrorOn > 0 && callCount.current === networkErrorOn) {
      await new Promise(r => setTimeout(r, 300));
      setState(s => ({
        ...s, isValidating: false, status: 'network_error',
        apiError: 'Network error — please check your connection.',
      }));
      return;
    }

    const result = await mockValidate(value);
    setState(s => ({
      ...s, isValidating: false,
      status: result.valid ? 'success' : 'error',
      result, isValid: result.valid, apiError: null,
    }));
  }, [rateLimitAfter, networkErrorOn]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    valueRef.current = value;
    setState(s => ({ ...s, value }));
    if (mode === 'onPause') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void run(value), pauseMs);
    }
  }, [mode, pauseMs, run]);

  const handleBlur = useCallback(() => {
    if (mode === 'onBlur') void run(valueRef.current);
  }, [mode, run]);

  const triggerValidation = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await run(valueRef.current);
  }, [run]);

  const setValue = useCallback((v: string) => {
    valueRef.current = v;
    setState(s => ({ ...s, value: v }));
  }, []);

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    valueRef.current = '';
    callCount.current = 0;
    setState(IDLE);
  }, []);

  return { ...state, handleChange, handleBlur, triggerValidation, setValue, reset };
}
