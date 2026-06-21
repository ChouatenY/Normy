/**
 * @normy/react — Typed API Client
 *
 * A thin, fully-typed fetch wrapper around the Normy REST API.
 * No external dependencies — plain fetch, ready for SSR / edge / browser.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValidationIssue =
  | 'RANDOM_TEXT'
  | 'TOO_SHORT'
  | 'EMPTY'
  | 'IRRELEVANT_RESPONSE'
  | 'CONTRADICTORY_RESPONSE'
  | 'SPAM'
  | 'LOW_QUALITY'
  | 'VALID';

export type ValidationSeverity = 'success' | 'info' | 'warning' | 'error';

export type FeedbackCategory =
  | 'input_quality'
  | 'input_format'
  | 'content_quality'
  | 'content_logic'
  | 'valid';

export interface ValidateRequest {
  projectId: string;
  question: string;
  answer: string;
}

export interface ValidateResponse {
  valid: boolean;
  score: number;
  confidence: number;
  issue: ValidationIssue;
  severity: ValidationSeverity;
  feedback: string;
  /** Derived from issue on the client side since the API may not send it yet */
  feedbackCategory?: FeedbackCategory;
}

export interface NormyApiError {
  error: string;
  status: number;
}

export type NormyApiResult =
  | { ok: true; data: ValidateResponse }
  | { ok: false; error: NormyApiError };

// ─── Issue → FeedbackCategory mapping (client-side) ─────────────────────────

export const ISSUE_TO_CATEGORY: Record<ValidationIssue, FeedbackCategory> = {
  EMPTY:                  'input_quality',
  TOO_SHORT:              'input_quality',
  RANDOM_TEXT:            'input_format',
  SPAM:                   'input_format',
  LOW_QUALITY:            'content_quality',
  IRRELEVANT_RESPONSE:    'content_quality',
  CONTRADICTORY_RESPONSE: 'content_logic',
  VALID:                  'valid',
};

// ─── Client ───────────────────────────────────────────────────────────────────

export interface NormyClientOptions {
  /** Your Normy API key (nrm_live_... or nrm_test_...) */
  apiKey: string;
  /** Base URL of the Normy API. Defaults to https://api.normy.dev */
  baseUrl?: string | undefined;
  /** Request timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number | undefined;
}

export class NormyClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: NormyClientOptions) {
    this.apiKey   = options.apiKey;
    this.baseUrl  = (options.baseUrl ?? 'https://api.normy.dev').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async validate(req: ValidateRequest): Promise<NormyApiResult> {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(req),
      });

      clearTimeout(timerId);

      if (!res.ok) {
        let errorMessage = res.statusText;
        try {
          const body = await res.json() as { error?: string };
          if (body.error) errorMessage = body.error;
        } catch { /* ignore */ }

        return {
          ok: false,
          error: { error: errorMessage, status: res.status },
        };
      }

      const data = await res.json() as ValidateResponse;
      // Enrich with client-side feedbackCategory if not present
      data.feedbackCategory = data.feedbackCategory ?? ISSUE_TO_CATEGORY[data.issue];

      return { ok: true, data };
    } catch (err: unknown) {
      clearTimeout(timerId);

      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      return {
        ok: false,
        error: {
          error: isAbort ? 'Request timed out' : 'Network error — please check your connection',
          status: isAbort ? 408 : 0,
        },
      };
    }
  }
}
