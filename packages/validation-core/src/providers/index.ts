/**
 * AI Provider abstractions for @normy/validation-core
 *
 * Each concrete provider adapter lives in its own file.
 * The engine imports only the AIProvider interface — never concrete classes.
 */

export type { AIProvider, AIProviderName, ProviderConfig } from '@normy-validation/core';

export { BaseAIProvider } from './base.js';
export { MockAIProvider } from './mock.provider.js';
export { GeminiProvider } from './gemini.provider.js';
export { OpenAIProvider } from './openai.provider.js';
export { AnthropicProvider } from './anthropic.provider.js';
