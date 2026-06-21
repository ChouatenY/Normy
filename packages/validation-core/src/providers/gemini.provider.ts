import { GoogleGenAI } from '@google/genai';
import { BaseAIProvider } from './base.js';
import type { ValidationRequest, ValidationResult, AIProviderName, ProviderConfig } from '../types/index.js';
import { ISSUE_TO_CATEGORY, ValidationIssue, FeedbackCategory } from '../types/index.js';
import { geminiValidationPrompt } from '../prompts/gemini.prompt.js';

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

  async validate(request: ValidationRequest): Promise<ValidationResult> {
    const startTime = Date.now();
    const prompt = geminiValidationPrompt.build(request);
    const model = this.config.model ?? 'gemini-2.5-flash';

    return this.withRetry(() =>
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
            parsed = JSON.parse(text);
          } catch (e) {
            throw new Error('Invalid JSON response from Gemini');
          }

          const issue = parsed.issue as ValidationIssue;
          
          // Ensure Gemini didn't invent an issue type. Fallback to LOW_QUALITY if it did.
          let safeIssue = issue;
          if (!['IRRELEVANT_RESPONSE', 'CONTRADICTORY_RESPONSE', 'LOW_QUALITY', 'VALID'].includes(issue)) {
            safeIssue = 'LOW_QUALITY';
          }

          const score = typeof parsed.score === 'number' ? parsed.score : 50;
          const valid = score >= 50; // Use minScore from request? The engine handles thresholds, but we provide a boolean here. Let's use 50.

          return {
            valid,
            score,
            issue: safeIssue,
            feedbackCategory: ISSUE_TO_CATEGORY[safeIssue] ?? 'content_quality',
            feedback: parsed.feedback || 'Please refine your answer.',
            severity: score >= 80 ? 'success' : score >= 50 ? 'info' : score >= 30 ? 'warning' : 'error',
            validatedAt: new Date().toISOString(),
            provider: this.name,
            latencyMs: Date.now() - startTime,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
          };
        })()
      )
    );
  }
}
