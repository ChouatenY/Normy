import { describe, it, expect } from 'vitest';
import { EmptyValidator } from '../empty.validator.js';
import { TooShortValidator } from '../too-short.validator.js';
import { RandomTextValidator } from '../random-text.validator.js';
import { SpamValidator } from '../spam.validator.js';
import { MockAIProvider } from '../../providers/mock.provider.js';
import { OrchestratorPipeline } from '../../pipelines/orchestrator.js';
import { ScoringEngine } from '../../scoring/engine.js';

describe('Local Validators', () => {
  describe('EmptyValidator', () => {
    const validator = new EmptyValidator();

    it('should flag empty strings', async () => {
      const res = await validator.check({ question: 'Test', answer: '' });
      expect(res).not.toBeNull();
      expect(res?.issue).toBe('EMPTY');
      expect(res?.score).toBe(0);
      expect(res?.confidence).toBe(1.0);
      expect(res?.valid).toBe(false);
    });

    it('should flag whitespace-only strings', async () => {
      const res = await validator.check({ question: 'Test', answer: '   ' });
      expect(res).not.toBeNull();
      expect(res?.issue).toBe('EMPTY');
      expect(res?.score).toBe(0);
    });

    it('should pass non-empty strings', async () => {
      const res = await validator.check({ question: 'Test', answer: 'hello' });
      expect(res).toBeNull();
    });
  });

  describe('TooShortValidator', () => {
    const validator = new TooShortValidator();

    it('should flag short strings (length < 4)', async () => {
      const res1 = await validator.check({ question: 'Test', answer: 'idk' });
      expect(res1).not.toBeNull();
      expect(res1?.issue).toBe('TOO_SHORT');
      expect(res1?.score).toBe(30);
      expect(res1?.confidence).toBe(1.0);

      const res2 = await validator.check({ question: 'Test', answer: 'a' });
      expect(res2?.score).toBe(10);
    });

    it('should pass strings with length >= 4', async () => {
      const res = await validator.check({ question: 'Test', answer: 'good' });
      expect(res).toBeNull();
    });
  });

  describe('RandomTextValidator', () => {
    const validator = new RandomTextValidator();

    it('should flag keyboard mashing row patterns', async () => {
      const res = await validator.check({ question: 'Test', answer: 'asdfghjkl' });
      expect(res).not.toBeNull();
      expect(res?.issue).toBe('RANDOM_TEXT');
      expect(res?.score).toBe(0);
      expect(res?.confidence).toBe(0.95);
    });

    it('should flag vowelless strings', async () => {
      const res = await validator.check({ question: 'Test', answer: 'qwrtp' });
      expect(res).not.toBeNull();
      expect(res?.issue).toBe('RANDOM_TEXT');
      expect(res?.confidence).toBe(0.9);
    });

    it('should flag highly repetitive characters', async () => {
      const res1 = await validator.check({ question: 'Test', answer: 'aaaaa' });
      expect(res1).not.toBeNull();
      expect(res1?.issue).toBe('RANDOM_TEXT');

      const res2 = await validator.check({ question: 'Test', answer: 'ababab' });
      expect(res2).not.toBeNull();
      expect(res2?.issue).toBe('RANDOM_TEXT');
    });

    it('should pass normal words', async () => {
      const res = await validator.check({ question: 'Test', answer: 'hello world' });
      expect(res).toBeNull();
    });
  });

  describe('SpamValidator', () => {
    const validator = new SpamValidator();

    it('should flag repetitive word/phrase spam', async () => {
      const res = await validator.check({ question: 'Test', answer: 'BUY NOW BUY NOW BUY NOW' });
      expect(res).not.toBeNull();
      expect(res?.issue).toBe('SPAM');
      expect(res?.score).toBe(10);
      expect(res?.confidence).toBe(0.95);
    });

    it('should flag high capitalization / shouting', async () => {
      const res = await validator.check({ question: 'Test', answer: 'PLEASEHELPME' });
      expect(res).not.toBeNull();
      expect(res?.issue).toBe('SPAM');
      expect(res?.score).toBe(20);
      expect(res?.confidence).toBe(0.85);
    });

    it('should flag excessive punctuation', async () => {
      const res = await validator.check({ question: 'Test', answer: 'really!!!!' });
      expect(res).not.toBeNull();
      expect(res?.issue).toBe('SPAM');
      expect(res?.score).toBe(15);
    });

    it('should flag spam keywords', async () => {
      const res = await validator.check({ question: 'Test', answer: 'This is free money' });
      expect(res).not.toBeNull();
      expect(res?.issue).toBe('SPAM');
    });

    it('should pass regular sentences', async () => {
      const res = await validator.check({ question: 'Test', answer: 'This is a normal response for the form.' });
      expect(res).toBeNull();
    });
  });
});

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
