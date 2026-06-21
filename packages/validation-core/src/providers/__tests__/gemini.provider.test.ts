import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from '../gemini.provider.js';

// Mock the @google/genai package
const generateContentMock = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: generateContentMock,
    },
  })),
}));

describe('GeminiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws if no API key is provided', () => {
    expect(() => new GeminiProvider({ provider: 'gemini', apiKey: '' })).toThrow('Gemini API key is required');
  });

  it('validates a successful response', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        issue: 'VALID',
        score: 85,
        confidence: 0.95,
        feedbackCategory: 'valid',
        feedback: 'Great answer.',
      }),
    });

    const provider = new GeminiProvider({ provider: 'gemini', apiKey: 'test-key' });
    const result = await provider.validate({
      question: 'Why?',
      answer: 'Because of X and Y.',
    });

    expect(result.valid).toBe(true);
    expect(result.issue).toBe('VALID');
    expect(result.score).toBe(85);
    expect(result.feedback).toBe('Great answer.');
    expect(result.provider).toBe('gemini');
  });

  it('handles invalid issue types gracefully', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        issue: 'MADE_UP_ISSUE',
        score: 40,
        confidence: 0.8,
        feedbackCategory: 'content_quality',
        feedback: 'Something is weird.',
      }),
    });

    const provider = new GeminiProvider({ provider: 'gemini', apiKey: 'test-key' });
    const result = await provider.validate({
      question: 'Test',
      answer: 'Test',
    });

    expect(result.issue).toBe('LOW_QUALITY'); // Fallback
    expect(result.score).toBe(40);
  });

  it('retries on failure', async () => {
    // Fail first time, succeed second time
    generateContentMock.mockRejectedValueOnce(new Error('Network error'));
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        issue: 'VALID',
        score: 90,
        confidence: 0.9,
        feedbackCategory: 'valid',
        feedback: 'Good.',
      }),
    });

    const provider = new GeminiProvider({ provider: 'gemini', apiKey: 'test-key', maxRetries: 1 });
    const result = await provider.validate({
      question: 'Q',
      answer: 'A',
    });

    expect(result.valid).toBe(true);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });
});
