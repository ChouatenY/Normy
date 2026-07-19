/**
 * useMockValidation — client-side validation hook
 *
 * Scoring system (matches ScoringEngine defaults):
 *   ≥ 80  → VALID      / success
 *   50-79 → LOW_QUALITY / info
 *   30-49 → LOW_QUALITY / warning
 *   < 30  → EMPTY/SPAM/RANDOM_TEXT/TOO_SHORT / error
 *
 * valid = score >= 70 (hard threshold, not just issue == VALID)
 */

import { useState, useRef, useCallback } from 'react';

export type ValidationStatus = 'idle' | 'validating' | 'success' | 'error' | 'rate_limited' | 'network_error';

export type ValidationIssue =
  | 'EMPTY'
  | 'TOO_SHORT'
  | 'RANDOM_TEXT'
  | 'SPAM'
  | 'IRRELEVANT_RESPONSE'
  | 'CONTRADICTORY_RESPONSE'
  | 'LOW_QUALITY'
  | 'VALID';

export type ValidationSeverity = 'error' | 'warning' | 'info' | 'success';

export interface ValidateResponse {
  valid: boolean;
  score: number;
  confidence: number;
  issue: ValidationIssue;
  severity: ValidationSeverity;
  feedback: string;
  feedbackCategory?: string;
}

export type ValidationMode = 'onPause' | 'onBlur' | 'onSubmit';

// ── Scoring helpers ────────────────────────────────────────────────────────

function scoreToSeverity(score: number): ValidationSeverity {
  if (score >= 80) return 'success';
  if (score >= 50) return 'info';
  if (score >= 30) return 'warning';
  return 'error';
}

const MIN_VALID_SCORE = 70;

// ── Local fast-path validators ─────────────────────────────────────────────

function localValidate(answer: string): ValidateResponse | null {
  const trimmed = answer.trim();

  // EMPTY
  if (!trimmed) {
    return {
      valid: false, score: 0, confidence: 1.0,
      issue: 'EMPTY', severity: 'error',
      feedback: 'This field cannot be left empty. Please provide an answer.',
      feedbackCategory: 'input_quality',
    };
  }

  // TOO_SHORT (< 4 chars)
  if (trimmed.length < 4) {
    const score = Math.min(30, trimmed.length * 8);
    return {
      valid: false, score, confidence: 1.0,
      issue: 'TOO_SHORT', severity: 'error',
      feedback: `Your response is too brief ("${trimmed}"). Please elaborate with at least a short sentence.`,
      feedbackCategory: 'input_quality',
    };
  }

  // RANDOM_TEXT — keyboard mash heuristic
  const hasNoVowels = /^[^aeiouAEIOU\s]{6,}$/.test(trimmed);
  const repeatingChars = /(.)\1{4,}/.test(trimmed);
  const allCapsKeySmash = /^[A-Z]{8,}$/.test(trimmed);
  const consecutiveCons = /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(trimmed);
  if (hasNoVowels || repeatingChars || (allCapsKeySmash && trimmed.length > 8) || consecutiveCons) {
    return {
      valid: false, score: 5, confidence: 0.92,
      issue: 'RANDOM_TEXT', severity: 'error',
      feedback: 'This looks like random keystrokes rather than a real answer. Could you share what you actually mean?',
      feedbackCategory: 'input_quality',
    };
  }

  // SPAM — repeating phrases, all caps
  const words = trimmed.split(/\s+/);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const repetitionRatio = words.length > 3 ? uniqueWords.size / words.length : 1;
  const isAllCaps = trimmed.length > 10 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  const spamKeywords = /\b(buy now|click here|free money|act now|limited time|subscribe|winner)\b/i.test(trimmed);

  if (repetitionRatio < 0.35 || isAllCaps || spamKeywords) {
    return {
      valid: false, score: 8, confidence: 0.9,
      issue: 'SPAM', severity: 'error',
      feedback: 'Your response appears to be spam or repetitive filler. Please provide a genuine, thoughtful answer.',
      feedbackCategory: 'content_quality',
    };
  }

  return null; // proceed to AI
}

// ── Gemini live integration ────────────────────────────────────────────────

async function callGemini(answer: string, question: string, apiKey: string): Promise<ValidateResponse> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are Normy, an AI form validation engine. Analyze the user's answer to a form question.

Question: "${question}"
Answer: "${answer}"

Evaluate whether the answer is relevant, meaningful, and of good quality. You must ONLY classify it as one of:
- IRRELEVANT_RESPONSE: answer doesn't address the question
- CONTRADICTORY_RESPONSE: answer contradicts itself
- LOW_QUALITY: vague, unhelpful, or insufficient
- VALID: good quality, relevant answer

Return a JSON object with EXACTLY these fields:
{
  "issue": "VALID" | "LOW_QUALITY" | "IRRELEVANT_RESPONSE" | "CONTRADICTORY_RESPONSE",
  "score": <integer 0-100>,
  "confidence": <float 0.0-1.0>,
  "feedback": "<concise, friendly, actionable message under 120 chars>"
}

Scoring guide:
- VALID: 75-100 (only if truly good)
- LOW_QUALITY: 30-69
- IRRELEVANT_RESPONSE: 5-30
- CONTRADICTORY_RESPONSE: 5-25

Be strict. A one-word valid answer like "yes" or "no" without explanation is LOW_QUALITY (score 35).`;

  const model = (typeof window !== 'undefined' && localStorage.getItem('GEMINI_MODEL')) ||
    (import.meta as unknown as { env: Record<string, string> }).env?.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite';

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const rawText = response.text?.trim() ?? '';
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Gemini response');

  const parsed = JSON.parse(jsonMatch[0]) as {
    issue: ValidationIssue;
    score: number;
    confidence: number;
    feedback: string;
  };

  const allowedIssues: ValidationIssue[] = ['IRRELEVANT_RESPONSE', 'CONTRADICTORY_RESPONSE', 'LOW_QUALITY', 'VALID'];
  const issue: ValidationIssue = allowedIssues.includes(parsed.issue) ? parsed.issue : 'LOW_QUALITY';
  const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
  const confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.85));

  // ⚠️ Key fix: valid is determined by SCORE, not just issue label
  const valid = score >= MIN_VALID_SCORE;
  const severity = scoreToSeverity(score);

  const categoryMap: Record<ValidationIssue, string> = {
    VALID: 'valid',
    LOW_QUALITY: 'content_quality',
    IRRELEVANT_RESPONSE: 'content_logic',
    CONTRADICTORY_RESPONSE: 'content_logic',
    EMPTY: 'input_quality',
    TOO_SHORT: 'input_quality',
    RANDOM_TEXT: 'input_quality',
    SPAM: 'content_quality',
  };

  return {
    valid,
    score,
    confidence,
    issue,
    severity,
    feedback: parsed.feedback || 'Thank you for your response.',
    feedbackCategory: categoryMap[issue],
  };
}

// ── Mock AI fallback (when no Gemini key) ─────────────────────────────────

async function mockAI(answer: string): Promise<ValidateResponse> {
  await new Promise(r => setTimeout(r, 300 + Math.random() * 400));

  const trimmed = answer.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  if (wordCount <= 2) {
    return {
      valid: false, score: 35, confidence: 0.8,
      issue: 'LOW_QUALITY', severity: 'warning',
      feedback: 'Your answer is very brief. Could you add more detail to help us understand?',
      feedbackCategory: 'content_quality',
    };
  }

  if (wordCount <= 5) {
    return {
      valid: false, score: 52, confidence: 0.75,
      issue: 'LOW_QUALITY', severity: 'info',
      feedback: 'A bit more context would really help. Try explaining your reasoning in a full sentence.',
      feedbackCategory: 'content_quality',
    };
  }

  const score = Math.min(95, 72 + Math.floor(Math.random() * 20));
  return {
    valid: score >= MIN_VALID_SCORE,
    score,
    confidence: 0.88,
    issue: 'VALID',
    severity: scoreToSeverity(score),
    feedback: 'Great response! Clear and informative.',
    feedbackCategory: 'valid',
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────

export interface UseMockValidationOptions {
  mode?: ValidationMode;
  pauseMs?: number;
  rateLimitAfter?: number;
  networkErrorOn?: number;
  question?: string;
}

export interface UseMockValidationReturn {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  status: ValidationStatus;
  result: ValidateResponse | null;
  apiError: string | null;
  isValid: boolean;
  isValidating: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | string) => void;
  handleBlur: () => void;
  triggerValidation: () => Promise<void>;
  reset: () => void;
}

export function useMockValidation(opts: UseMockValidationOptions = {}): UseMockValidationReturn {
  const {
    mode = 'onPause',
    pauseMs = 1200,
    rateLimitAfter = 0,
    networkErrorOn = 0,
    question = 'Please provide an answer',
  } = opts;

  const [value, setValue] = useState('');
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [apiError, setApiError] = useState<string | null>(null);
  const callCount = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runValidation = useCallback(async (text: string) => {
    if (!text.trim()) {
      setResult(null);
      setStatus('idle');
      setApiError(null);
      return;
    }

    callCount.current += 1;
    const thisCall = callCount.current;

    // Simulate rate limit
    if (rateLimitAfter > 0 && callCount.current > rateLimitAfter) {
      setStatus('rate_limited');
      setResult(null);
      setApiError('Too many requests. Please wait a moment before trying again (429 Rate Limit).');
      return;
    }

    // Simulate network error
    if (networkErrorOn > 0 && callCount.current === networkErrorOn) {
      setStatus('network_error');
      setResult(null);
      setApiError('Unable to connect to the validation server. Please check your internet connection.');
      return;
    }

    setStatus('validating');
    setResult(null);
    setApiError(null);

    try {
      // Local validators first (free, instant)
      const localResult = localValidate(text);
      if (localResult) {
        if (thisCall !== callCount.current) return;
        setResult(localResult);
        setStatus(localResult.valid ? 'success' : 'error');
        return;
      }

      // Try live Gemini
      const geminiKey =
        (typeof window !== 'undefined' && localStorage.getItem('GEMINI_API_KEY')) ||
        (import.meta as unknown as { env: Record<string, string> }).env?.VITE_GEMINI_API_KEY;

      let aiResult: ValidateResponse;

      if (geminiKey) {
        try {
          aiResult = await callGemini(text, question, geminiKey);
        } catch {
          aiResult = await mockAI(text);
        }
      } else {
        aiResult = await mockAI(text);
      }

      if (thisCall !== callCount.current) return;
      setResult(aiResult);
      setStatus(aiResult.valid ? 'success' : 'error');
    } catch {
      if (thisCall !== callCount.current) return;
      setStatus('network_error');
      setResult(null);
      setApiError('An unexpected validation error occurred.');
    }
  }, [question, rateLimitAfter, networkErrorOn]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | string) => {
    const val = typeof e === 'string' ? e : e.target.value;
    setValue(val);
    if (mode !== 'onPause') return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => runValidation(val), pauseMs);
  }, [mode, pauseMs, runValidation]);

  const handleBlur = useCallback(() => {
    if (mode === 'onBlur') runValidation(value);
  }, [mode, value, runValidation]);

  const triggerValidation = useCallback(async () => {
    await runValidation(value);
  }, [value, runValidation]);

  const reset = useCallback(() => {
    setValue('');
    setResult(null);
    setStatus('idle');
    setApiError(null);
    callCount.current = 0;
  }, []);

  return {
    value,
    setValue,
    status,
    result,
    apiError,
    isValid: result?.valid === true,
    isValidating: status === 'validating',
    handleChange,
    handleBlur,
    triggerValidation,
    reset,
  };
}
