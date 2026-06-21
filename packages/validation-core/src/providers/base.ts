import type { AIProvider, AIProviderName, ValidationRequest, ValidationResult, ProviderConfig } from '../types/index.js';

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: AIProviderName;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * The core validate execution method that concrete providers implement.
   */
  abstract validate(request: ValidationRequest): Promise<ValidationResult>;

  /**
   * Helper to execute an operation with retries.
   */
  protected async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.maxRetries ?? 2;
    let attempts = 0;

    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempts++;
        if (attempts > maxRetries) {
          throw error;
        }
        // Basic backoff: 200ms, 400ms...
        await new Promise((resolve) => setTimeout(resolve, attempts * 200));
      }
    }
  }

  /**
   * Helper to wrap a promise with a timeout.
   */
  protected withTimeout<T>(promise: Promise<T>): Promise<T> {
    const timeoutMs = this.config.timeoutMs ?? 10000;
    
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`AI Provider ${this.name} request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
