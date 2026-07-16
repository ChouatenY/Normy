import { GoogleGenAI } from '@google/genai';
import { BaseAIProvider } from './base.js';
import type { ValidationRequest, ValidationResult, AIProviderName, ProviderConfig, ValidationIssue } from '@normy-validation/core';
import { ISSUE_TO_CATEGORY } from '@normy-validation/core';
import { getPromptTemplate } from '../prompts/index.js';

export class GeminiProvider extends BaseAIProvider {
  readonly name: AIProviderName = 'gemini';
  private ai: GoogleGenAI;

  constructor(config: ProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.ai = new GoogleGenAI({ apiKey: config.apiKey.trim() });
  }

  /**
   * Overridden retry logic with exponential backoff:
   * Max 3 retries (4 total attempts)
   * Backoff: 200ms, 400ms, 800ms...
   */
  protected override async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.maxRetries ?? 3;
    let attempts = 0;

    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempts++;
        if (attempts > maxRetries) {
          throw error;
        }
        const delay = Math.pow(2, attempts) * 100; // 200ms, 400ms, 800ms
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async validate(request: ValidationRequest): Promise<ValidationResult> {
    const startTime = Date.now();
    const promptTemplate = getPromptTemplate(request.promptVersion);
    const prompt = promptTemplate.build(request);
    const model = this.config.model ?? 'gemini-1.5-flash';

    try {
      return await this.withRetry(() =>
        this.withTimeout(
          (async () => {
            const response = await this.ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
              },
            });

            const text = response.text;
            if (!text) {
              throw new Error('No response returned from Gemini');
            }

            let parsed: any;
            try {
              let cleanText = text.trim();
              const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                cleanText = jsonMatch[0];
              }
              parsed = JSON.parse(cleanText);
            } catch (e) {
              console.error('Failed to parse Gemini JSON. Raw response:', text);
              throw new Error('Invalid JSON response from Gemini');
            }

            const issue = parsed.issue as ValidationIssue;
            
            // Validate the issue is one of the strictly allowed AI issue types
            let safeIssue = issue;
            if (!['IRRELEVANT_RESPONSE', 'CONTRADICTORY_RESPONSE', 'LOW_QUALITY', 'VALID'].includes(issue)) {
              safeIssue = 'LOW_QUALITY';
            }

            const score = typeof parsed.score === 'number' ? parsed.score : 50;
            const valid = score >= (request.minScore ?? 50);

            // Extract tokens if returned by the SDK
            const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
            const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;

            return {
              valid,
              score,
              issue: safeIssue,
              feedbackCategory: ISSUE_TO_CATEGORY[safeIssue] ?? 'ADD_SPECIFIC_DETAILS',
              feedback: parsed.feedback || 'Please refine your answer.',
              severity: score >= 80 ? 'success' : score >= 50 ? 'info' : score >= 30 ? 'warning' : 'error',
              validatedAt: new Date().toISOString(),
              provider: this.name,
              latencyMs: Date.now() - startTime,
              confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
              tokenUsage: {
                inputTokens,
                outputTokens,
              },
              exampleAnswer: parsed.exampleAnswer ?? null,
              explanation: parsed.explanation ?? undefined,
            };
          })()
        )
      );
    } catch (error) {
      console.error('Gemini Provider validation failed gracefully:', error);
      // We log the error completely so it's easier to debug
      console.error(error);
      const latencyMs = Date.now() - startTime;
      
      const errStr = String(error).toLowerCase();
      let feedback = 'We could not evaluate your answer with confidence. Please try again.';
      
      if (errStr.includes('quota') || errStr.includes('429') || errStr.includes('exhausted') || errStr.includes('limit')) {
        feedback = 'Normy AI validation quota or rate limit exceeded. Please try again in a few moments or check your API key status.';
      } else if (errStr.includes('403') || errStr.includes('leaked') || errStr.includes('permission')) {
        feedback = 'Your Gemini API key was rejected (Permission Denied / Leaked Key). Please update your GEMINI_API_KEY environment variable.';
      } else if (errStr.includes('404') || errStr.includes('not found')) {
        feedback = 'The AI model specified is not available. Please check your model configuration.';
      } else if (errStr.includes('invalid json')) {
        feedback = 'The AI produced an invalid response format that could not be parsed.';
      }

      // Fallback response - LOW_CONFIDENCE, never crash the API
      return {
        valid: false,
        score: 0,
        issue: 'LOW_CONFIDENCE',
        feedbackCategory: 'ADD_SPECIFIC_DETAILS',
        feedback,
        severity: 'error',
        validatedAt: new Date().toISOString(),
        provider: this.name,
        latencyMs,
        confidence: 0,
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
        },
        exampleAnswer: null,
      };
    }
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      const model = this.config.model ?? 'gemini-1.5-flash';
      // simple connectivity check
      const response = await this.ai.models.generateContent({
        model,
        contents: 'ping',
      });
      if (response.text) {
        return { ok: true };
      }
      return { ok: false, error: 'Empty response from Gemini' };
    } catch (e: any) {
      const errStr = String(e).toLowerCase();
      let error = 'Authentication failed';
      if (errStr.includes('quota') || errStr.includes('429')) error = 'Quota exceeded';
      else if (errStr.includes('404')) error = 'Model not found';
      else if (errStr.includes('timeout')) error = 'Timeout';
      else if (e instanceof Error) error = e.message;
      return { ok: false, error };
    }
  }

  estimateCost(request: ValidationRequest): number {
    // Very rough heuristic based on character count mapped to tokens
    const charCount = request.question.length + request.answer.length + (request.fieldContext?.length ?? 0);
    const estimatedTokens = Math.ceil(charCount / 4);
    // Assumption: $0.15 per 1M tokens -> 0.00000015 per token
    return estimatedTokens * 0.00000015;
  }

  getCapabilities(): { models: string[]; maxTokens: number; supportedFeatures: string[] } {
    return {
      models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
      maxTokens: 1048576, // Gemini 1.5 context window
      supportedFeatures: ['structured_json', 'system_instructions', 'function_calling']
    };
  }
}
