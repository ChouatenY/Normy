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
  | 'VALID'
  | 'LOW_CONFIDENCE';

export type ValidationSeverity = 'success' | 'info' | 'warning' | 'error';

export type FeedbackCategory =
  | 'input_quality'
  | 'input_format'
  | 'content_quality'
  | 'content_logic'
  | 'valid'
  | 'EXPAND_RESPONSE'
  | 'ANSWER_THE_QUESTION'
  | 'ADD_SPECIFIC_DETAILS'
  | 'REMOVE_RANDOM_TEXT'
  | 'REMOVE_SPAM'
  | 'EXPLAIN_REASON'
  | 'CLARIFY_RESPONSE'
  | 'NO_ACTION';

export interface ValidateRequest {
  projectId: string;
  question: string;
  answer: string;
  fieldContext?: string;
  promptVersion?: string;
}

export interface ValidateResponse {
  valid: boolean;
  score: number;
  confidence: number;
  issue: ValidationIssue;
  severity: ValidationSeverity;
  feedback: string;
  feedbackCategory?: FeedbackCategory;
  exampleAnswer?: string | null;
  explanation?: {
    problem?: string;
    suggestion?: string;
    detail?: string;
  };
  source?: 'local' | 'cache' | 'gemini' | 'openai' | 'anthropic' | 'offline';
  resolvedBy?: string;
  metadata?: {
    resolvedBy?: string;
    provider?: string;
    cached?: boolean;
    latencyMs?: number;
    pipelineVersion?: string;
    promptVersion?: string;
  };
}

export interface NormyApiError {
  error: string;
  code: string;
  status: number;
}

export type NormyApiResult =
  | { ok: true; data: ValidateResponse }
  | { ok: false; error: NormyApiError };

// ─── Issue → FeedbackCategory mapping (client-side) ─────────────────────────

export const ISSUE_TO_CATEGORY: Record<ValidationIssue, FeedbackCategory> = {
  EMPTY:                  'EXPAND_RESPONSE',
  TOO_SHORT:              'EXPAND_RESPONSE',
  RANDOM_TEXT:            'REMOVE_RANDOM_TEXT',
  SPAM:                   'REMOVE_SPAM',
  LOW_QUALITY:            'ADD_SPECIFIC_DETAILS',
  IRRELEVANT_RESPONSE:    'ANSWER_THE_QUESTION',
  CONTRADICTORY_RESPONSE: 'CLARIFY_RESPONSE',
  VALID:                  'NO_ACTION',
  LOW_CONFIDENCE:         'ADD_SPECIFIC_DETAILS',
};

export interface AssistantChatRequest {
  projectId: string;
  message: string;
  conversationId?: string | undefined;
  fieldContext?: {
    fieldId: string;
    question?: string | undefined;
    helpContext?: string | undefined;
  } | undefined;
  sessionId?: string | undefined;
  knowledge?: string | undefined;
}

export interface AssistantChatResponse {
  conversationId: string;
  messageId: string;
  response: string;
  createdAt: string;
}

export interface AssistantMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  createdAt: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export interface TelemetryEvent {
  type: string;
  validationId?: string;
  sessionId?: string;
  fieldName?: string;
  payload?: any;
  createdAt?: string;
}

export interface TelemetryBatchRequest {
  projectId: string;
  events: TelemetryEvent[];
}

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

  async getCapabilities() {
    // This could optionally fetch from an endpoint, but for now we return the static platform capabilities
    return {
      validate: true,
      assist: true,
      shield: false,
      insights: true,
      provider: 'gemini',
      byok: true,
      offline: true,
      version: '1.0.0'
    };
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
        let errorCode = 'NETWORK_ERROR';
        try {
          const body = await res.json() as { error?: string; code?: string };
          if (body.error) errorMessage = body.error;
          if (body.code) errorCode = body.code;
        } catch { /* ignore */ }

        return {
          ok: false,
          error: { error: errorMessage, code: errorCode, status: res.status },
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
          code: 'OFFLINE',
          status: isAbort ? 408 : 0,
        },
      };
    }
  }

  async chat(req: AssistantChatRequest): Promise<
    | { ok: true; data: AssistantChatResponse }
    | { ok: false; error: NormyApiError }
  > {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/assistant/chat`, {
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

      const data = await res.json() as AssistantChatResponse;
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

  async getMessages(conversationId: string): Promise<
    | { ok: true; data: { messages: AssistantMessage[] } }
    | { ok: false; error: NormyApiError }
  > {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/assistant/conversations/${conversationId}/messages`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
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

      const data = await res.json() as { messages: AssistantMessage[] };
      return { ok: true, data };
    } catch (err: unknown) {
      clearTimeout(timerId);
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      return {
        ok: false,
        error: {
          error: isAbort ? 'Request timed out' : 'Network error',
          status: isAbort ? 408 : 0,
        },
      };
    }
  }

  async rateMessage(messageId: string, rating: 'helpful' | 'unhelpful'): Promise<
    | { ok: true; data: { success: boolean } }
    | { ok: false; error: NormyApiError }
  > {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/assistant/messages/${messageId}/rate`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ rating }),
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

      const data = await res.json() as { success: boolean };
      return { ok: true, data };
    } catch (err: unknown) {
      clearTimeout(timerId);
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      return {
        ok: false,
        error: {
          error: isAbort ? 'Request timed out' : 'Network error',
          status: isAbort ? 408 : 0,
        },
      };
    }
  }

  async sendTelemetryBatch(req: TelemetryBatchRequest): Promise<
    | { ok: true; data: { success: boolean } }
    | { ok: false; error: NormyApiError }
  > {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/telemetry/batch`, {
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

      const data = await res.json() as { success: boolean };
      return { ok: true, data };
    } catch (err: unknown) {
      clearTimeout(timerId);
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      return {
        ok: false,
        error: {
          error: isAbort ? 'Request timed out' : 'Network error',
          status: isAbort ? 408 : 0,
        },
      };
    }
  }
}
