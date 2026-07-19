import { BaseAIProvider } from './base.js';
import type { ValidationRequest, ValidationResult, ProviderConfig } from '@normy-validation/core';
import { ISSUE_TO_CATEGORY, type ValidationIssue } from '@normy-validation/core';

export class OpenAIProvider extends BaseAIProvider {
  constructor(config: ProviderConfig) {
    super(config);
  }

  private resolveModelsToTry(configuredModel?: string): { models: string[]; isFallbackMode: boolean } {
    if (configuredModel) {
      return { models: [configuredModel], isFallbackMode: false };
    }
    return {
      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
      isFallbackMode: true,
    };
  }

  async validate(request: ValidationRequest): Promise<ValidationResult> {
    const prompt = this.buildPrompt(request);
    const startTime = Date.now();
    
    const { models, isFallbackMode } = this.resolveModelsToTry(this.config.model);
    let lastError: any = null;

    for (let i = 0; i < models.length; i++) {
      const currentModel = models[i];
      try {
        const result = await this.withRetry(() =>
          this.withTimeout(
            (async () => {
              const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                  model: currentModel,
                  messages: [
                    { role: 'user', content: prompt }
                  ],
                  response_format: { type: 'json_object' }
                })
              });

              if (!res.ok) {
                const textErr = await res.text();
                throw new Error(`OpenAI HTTP ${res.status}: ${textErr}`);
              }

              const data = await res.json();
              const text = data.choices?.[0]?.message?.content;
              if (!text) {
                throw new Error('No content returned from OpenAI');
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
                console.error('Failed to parse OpenAI JSON. Raw response:', text);
                throw new Error('Invalid JSON response from OpenAI');
              }

              const issue = parsed.issue as ValidationIssue;
              
              // Validate the issue is one of the strictly allowed AI issue types
              let safeIssue = issue;
              if (!['IRRELEVANT_RESPONSE', 'CONTRADICTORY_RESPONSE', 'LOW_QUALITY', 'VALID'].includes(issue)) {
                safeIssue = 'LOW_QUALITY';
              }

              const score = typeof parsed.score === 'number' ? parsed.score : 50;
              const valid = score >= (request.minScore ?? 50);

              const inputTokens = data.usage?.prompt_tokens ?? 0;
              const outputTokens = data.usage?.completion_tokens ?? 0;

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
        return result;
      } catch (error: any) {
        lastError = error;
        const errStr = String(error).toLowerCase();
        const is404 = errStr.includes('404') || errStr.includes('not found') || errStr.includes('model_not_found') || errStr.includes('does not exist');

        if (is404) {
          if (isFallbackMode && i < models.length - 1) {
            console.warn(`Fallback: Model "${currentModel}" not found/available. Trying next fallback: "${models[i + 1]}"...`);
            continue;
          }
          console.error(`Configured OpenAI model "${currentModel}" is unavailable. Please update project settings or OPENAI_MODEL.`);
          throw new Error('INVALID_MODEL_CONFIGURATION');
        }

        break;
      }
    }

    throw lastError || new Error('OpenAI validation failed');
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      const { models } = this.resolveModelsToTry(this.config.model);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: models[0],
          messages: [
            { role: 'user', content: 'Ping' }
          ],
          max_tokens: 5
        })
      });

      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `HTTP ${res.status}: ${text}` };
      }

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  estimateCost(request: ValidationRequest): number {
    // Standard cost estimate for gpt-4o-mini
    return 0.0001;
  }

  getCapabilities(): { models: string[]; maxTokens: number; supportedFeatures: string[] } {
    return {
      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
      maxTokens: 128000,
      supportedFeatures: ['json_mode'],
    };
  }
}
