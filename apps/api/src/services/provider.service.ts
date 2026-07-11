import { env } from '../config/env.js';
import { decrypt } from '../utils/encryption.js';
import type { Project } from '../db/schema/projects.js';
import { GeminiProvider, MockAIProvider } from '@normy-validation/validation-core';
import type { AIProvider } from '@normy-validation/core';

export interface ProviderResolution {
  provider: AIProvider;
  mode: 'hosted' | 'byok';
}

export class ProviderService {
  /**
   * Resolves the AI provider instance based on project settings and available credits.
   * Throws an error if validation cannot proceed due to invalid config or lack of credits.
   */
  static resolveProvider(project: Project, apiKeyEnv: 'development' | 'production'): ProviderResolution {
    const providerName = project.defaultProvider;
    
    // BYOK Key Retrieval
    const rawEncryptedKey = 
      providerName === 'gemini' ? project.geminiApiKey :
      providerName === 'openai' ? project.openaiApiKey :
      providerName === 'anthropic' ? project.anthropicApiKey : null;

    let activeProviderKey = '';
    let mode: 'hosted' | 'byok' = 'hosted';
    let model = undefined;

    if (rawEncryptedKey) {
      mode = 'byok';
      try {
        activeProviderKey = decrypt(rawEncryptedKey);
      } catch (e) {
        console.error('Failed to decrypt BYOK key', e);
        throw new Error('INVALID_CONFIGURATION');
      }
      
      // Parse model if we have a config object in settings (Future Proofing)
      if (project.settings && (project.settings as any)[`${providerName}Model`]) {
        model = (project.settings as any)[`${providerName}Model`];
      }
    } else {
      // Hosted resolution
      activeProviderKey = providerName === 'gemini' ? (env.GEMINI_API_KEY || '') : '';
      
      const balanceStr = apiKeyEnv === 'production' ? (project as any).liveCreditsBalance : (project as any).testCreditsBalance;
      const balance = parseFloat(balanceStr as string || '0');
      if (isNaN(balance) || balance <= 0) {
        throw new Error('RATE_LIMITED');
      }
    }

    if (providerName === 'gemini') {
      const provider = new GeminiProvider({
        provider: 'gemini',
        apiKey: activeProviderKey || '',
        model: model,
      });
      return { provider, mode };
    }

    // Future placeholder for other providers (or throw NOT_IMPLEMENTED)
    if (providerName === 'openai' || providerName === 'anthropic') {
      throw new Error(`Provider "${providerName}" is configured but not active in this deployment.`);
    }

    // Fallback Mock provider
    return { provider: new MockAIProvider(providerName), mode };
  }
}
