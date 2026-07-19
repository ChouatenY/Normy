import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../anthropic.provider.js';

describe('AnthropicProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('validates a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              issue: 'VALID',
              score: 85,
              confidence: 0.95,
              feedback: 'Great answer.',
            }),
          },
        ],
        usage: {
          input_tokens: 15,
          output_tokens: 25,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new AnthropicProvider({ provider: 'anthropic', apiKey: 'test-key' });
    const result = await provider.validate({
      question: 'Why?',
      answer: 'Because of X and Y.',
    });

    expect(result.valid).toBe(true);
    expect(result.issue).toBe('VALID');
    expect(result.score).toBe(85);
    expect(result.feedback).toBe('Great answer.');
    expect(result.provider).toBe('anthropic');
  });

  it('throws INVALID_MODEL_CONFIGURATION on model not found error (404)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Model not found',
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new AnthropicProvider({ provider: 'anthropic', apiKey: 'test-key', model: 'invalid-model', maxRetries: 0 });
    await expect(provider.validate({
      question: 'Q',
      answer: 'A',
    })).rejects.toThrow('INVALID_MODEL_CONFIGURATION');
  });

  it('gracefully falls back to secondary model if first model is not found', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Model not found',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                issue: 'VALID',
                score: 90,
                confidence: 0.9,
                feedback: 'Good.',
              }),
            },
          ],
          usage: {
            input_tokens: 15,
            output_tokens: 25,
          },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new AnthropicProvider({ provider: 'anthropic', apiKey: 'test-key', maxRetries: 0 });
    const result = await provider.validate({
      question: 'Q',
      answer: 'A',
    });

    expect(result.valid).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
