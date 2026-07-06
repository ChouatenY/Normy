import { describe, it, expect } from 'vitest';
import { EmptyValidator, TooShortValidator, RandomTextValidator, SpamValidator } from '@normy-validation/core';
import { MockAIProvider } from '../../providers/mock.provider.js';
import { OrchestratorPipeline } from '../orchestrator.js';
import { ScoringEngine } from '../../scoring/engine.js';

describe('OrchestratorPipeline End-to-End Flow', () => {
  const validators = [
    new EmptyValidator(),
    new TooShortValidator(),
    new RandomTextValidator(),
    new SpamValidator(),
  ];
  const mockProvider = new MockAIProvider('openai');
  const scoringEngine = new ScoringEngine();
  
  const pipeline = new OrchestratorPipeline(
    'test-pipeline',
    validators,
    mockProvider,
    scoringEngine
  );

  it('should short-circuit on EmptyValidator', async () => {
    const result = await pipeline.run({ question: 'Feedback', answer: '' });
    expect(result.valid).toBe(false);
    expect(result.issue).toBe('EMPTY');
    expect(result.score).toBe(0);
    expect(result.provider).toBe('local');
    expect(result.confidence).toBe(1.0);
  });

  it('should short-circuit on TooShortValidator', async () => {
    const result = await pipeline.run({ question: 'Feedback', answer: 'no' });
    expect(result.valid).toBe(false);
    expect(result.issue).toBe('TOO_SHORT');
    expect(result.score).toBe(20);
    expect(result.provider).toBe('local');
    expect(result.confidence).toBe(1.0);
  });

  it('should hit MockAIProvider and succeed for valid input', async () => {
    const result = await pipeline.run({ 
      question: 'Feedback', 
      answer: 'This was an excellent product experience.' 
    });
    expect(result.valid).toBe(true);
    expect(result.issue).toBe('VALID');
    expect(result.score).toBe(95);
    expect(result.provider).toBe('openai');
    expect(result.confidence).toBe(0.98);
  });

  it('should hit MockAIProvider and trigger mock low quality response', async () => {
    const result = await pipeline.run({ 
      question: 'Feedback', 
      answer: 'This is mock_low_quality response.' 
    });
    expect(result.valid).toBe(false);
    expect(result.issue).toBe('LOW_QUALITY');
    expect(result.score).toBe(40);
    expect(result.provider).toBe('openai');
    expect(result.confidence).toBe(0.8);
  });
});
