import { BaseAIProvider } from './base.js';
import type { ValidationRequest, ValidationResult, AIProviderName } from '../types/index.js';

export class MockAIProvider extends BaseAIProvider {
  readonly name: AIProviderName;

  constructor(name: AIProviderName = 'openai') {
    // Provide a default config so BaseAIProvider constructor is happy
    super({
      provider: name,
      apiKey: 'mock-key',
      timeoutMs: 10000,
      maxRetries: 2,
    });
    this.name = name;
  }

  async validate(request: ValidationRequest): Promise<ValidationResult> {
    const text = request.answer.trim().toLowerCase();

    // Specific trigger keywords to return mock issues for pipeline testing
    if (text.includes('mock_low_quality')) {
      return {
        valid: false,
        score: 40,
        issue: 'LOW_QUALITY',
        feedback: 'Your answer is somewhat vague. Can you elaborate further?',
        severity: 'warning',
        validatedAt: new Date().toISOString(),
        provider: this.name,
        latencyMs: 50,
        confidence: 0.8,
      };
    }

    if (text.includes('mock_contradictory')) {
      return {
        valid: false,
        score: 20,
        issue: 'CONTRADICTORY_RESPONSE',
        feedback: 'Your answer seems to contradict itself. Please review.',
        severity: 'error',
        validatedAt: new Date().toISOString(),
        provider: this.name,
        latencyMs: 50,
        confidence: 0.85,
      };
    }

    if (text.includes('mock_irrelevant')) {
      return {
        valid: false,
        score: 30,
        issue: 'IRRELEVANT_RESPONSE',
        feedback: 'This answer does not seem related to the question. Please stay on topic.',
        severity: 'warning',
        validatedAt: new Date().toISOString(),
        provider: this.name,
        latencyMs: 50,
        confidence: 0.75,
      };
    }

    // Default high-quality valid response
    return {
      valid: true,
      score: 95,
      issue: 'VALID',
      feedback: 'Great response! Thank you for the detailed information.',
      severity: 'success',
      validatedAt: new Date().toISOString(),
      provider: this.name,
      latencyMs: 100,
      confidence: 0.98,
    };
  }
}
