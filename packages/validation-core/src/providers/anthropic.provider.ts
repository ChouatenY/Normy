import { BaseAIProvider } from './base.js';
import type { ValidationRequest, ValidationResult, ProviderConfig, AIProviderName } from '@normy-validation/core';
import { ISSUE_TO_CATEGORY, type ValidationIssue } from '@normy-validation/core';
import { getPromptTemplate } from '../prompts/index.js';

export class AnthropicProvider extends BaseAIProvider {
  readonly name: AIProviderName = 'anthropic';

  constructor(config: ProviderConfig) {
    super(config);
  }

  private resolveModelsToTry(configuredModel?: string): { models: string[]; isFallbackMode: boolean } {
    if (configuredModel) {
      return { models: [configuredModel], isFallbackMode: false };
    }
    return {
      models: [
        'claude-3-5-haiku-latest',
        'claude-3-5-sonnet-latest',
        'claude-3-opus-latest',
        'claude-3-haiku-20240307',
        'claude-3-sonnet-20240229',
      ],
      isFallbackMode: true,
    };
  }

  async validate(request: ValidationRequest): Promise<ValidationResult> {
    const promptTemplate = getPromptTemplate(request.promptVersion);
    const prompt = promptTemplate.build(request);
    const startTime = Date.now();
    
    const { models, isFallbackMode } = this.resolveModelsToTry(this.config.model);
    let lastError: any = null;

    for (let i = 0; i < models.length; i++) {
      const currentModel = models[i];
      if (!currentModel) continue;
      try {
        const result = await this.withRetry(() =>
          this.withTimeout(
            (async () => {
              const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': this.config.apiKey,
                  'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                  model: currentModel,
                  max_tokens: 1000,
                  messages: [
                    { role: 'user', content: prompt }
                  ]
                })
              });

              if (!res.ok) {
                const textErr = await res.text();
                throw new Error(`Anthropic HTTP ${res.status}: ${textErr}`);
              }

              const data = (await res.json()) as any;
              const text = data.content?.[0]?.text;
              if (!text) {
                throw new Error('No content returned from Anthropic');
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
                console.error('Failed to parse Anthropic JSON. Raw response:', text);
                throw new Error('Invalid JSON response from Anthropic');
              }

              const issue = parsed.issue as ValidationIssue;
              
              // Validate the issue is one of the strictly allowed AI issue types
              let safeIssue = issue;
              if (!['IRRELEVANT_RESPONSE', 'CONTRADICTORY_RESPONSE', 'LOW_QUALITY', 'VALID'].includes(issue)) {
                safeIssue = 'LOW_QUALITY';
              }

              const score = typeof parsed.score === 'number' ? parsed.score : 50;
              const valid = score >= (request.minScore ?? 50);

              const inputTokens = data.usage?.input_tokens ?? 0;
              const outputTokens = data.usage?.output_tokens ?? 0;

              return {
                valid,
                score,
                issue: safeIssue,
                feedbackCategory: ISSUE_TO_CATEGORY[safeIssue] ?? 'ADD_SPECIFIC_DETAILS',
                feedback: parsed.feedback || 'Please refine your answer.',
                severity: (score >= 80 ? 'success' : score >= 50 ? 'info' : score >= 30 ? 'warning' : 'error') as any,
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
        const is404 = errStr.includes('404') || errStr.includes('not found') || errStr.includes('model_not_found') || errStr.includes('does not exist') || errStr.includes('invalid_request_error');

        if (is404) {
          if (isFallbackMode && i < models.length - 1) {
            console.warn(`Fallback: Model "${currentModel}" not found/available. Trying next fallback: "${models[i + 1]}"...`);
            continue;
          }
          console.error(`Configured Anthropic model "${currentModel}" is unavailable. Please update project settings or ANTHROPIC_MODEL.`);
          throw new Error('INVALID_MODEL_CONFIGURATION');
        }

        break;
      }
    }

    throw lastError || new Error('Anthropic validation failed');
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      const { models } = this.resolveModelsToTry(this.config.model);
      const model = models[0];
      if (!model) {
        return { ok: false, error: 'No models configured' };
      }
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 5,
          messages: [
            { role: 'user', content: 'Ping' }
          ]
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

  estimateCost(_request: ValidationRequest): number {
    return 0.00015;
  }

  getCapabilities(): { models: string[]; maxTokens: number; supportedFeatures: string[] } {
    return {
      models: [
        'claude-3-5-haiku-latest',
        'claude-3-5-sonnet-latest',
        'claude-3-opus-latest',
        'claude-3-haiku-20240307',
        'claude-3-sonnet-20240229',
      ],
      maxTokens: 200000,
      supportedFeatures: [],
    };
  }
}
