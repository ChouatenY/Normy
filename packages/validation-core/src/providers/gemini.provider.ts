import { GoogleGenAI } from '@google/genai';
import { BaseAIProvider } from './base.js';
import type { ValidationRequest, ValidationResult, AIProviderName, ProviderConfig, ValidationIssue } from '../types/index.js';
import { ISSUE_TO_CATEGORY } from '../types/index.js';
import { getPromptTemplate } from '../prompts/index.js';

export class GeminiProvider extends BaseAIProvider {
  readonly name: AIProviderName = 'gemini';
  private ai: GoogleGenAI;

  constructor(config: ProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
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
    const model = this.config.model ?? 'gemini-2.5-flash';

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
              // Strip code fences if the model output them despite guidelines
              let cleanText = text.trim();
              if (cleanText.includes('```')) {
                cleanText = cleanText.replace(/```json|```/g, '').trim();
              }
              parsed = JSON.parse(cleanText);
            } catch (e) {
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
            };
          })()
        )
      );
    } catch (error) {
      console.error('Gemini Provider validation failed gracefully:', error);
      const latencyMs = Date.now() - startTime;
      
      const errStr = String(error).toLowerCase();
      const isQuotaOrRateLimit = errStr.includes('quota') || errStr.includes('429') || errStr.includes('exhausted') || errStr.includes('limit');
      const feedback = isQuotaOrRateLimit
        ? 'Normy AI validation quota or rate limit exceeded. Please try again in a few moments or check your API key status.'
        : 'We could not evaluate your answer with confidence. Please try again.';

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
}
