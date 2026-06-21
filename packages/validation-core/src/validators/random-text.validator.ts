import { BaseValidator } from './base.js';
import type { ValidationRequest, ValidationResult, ValidationIssue } from '../types/index.js';

export class RandomTextValidator extends BaseValidator {
  readonly id = 'random-text-validator';
  readonly description = 'Detects keyboard mashing or random non-word strings.';
  readonly issueType: ValidationIssue = 'RANDOM_TEXT';

  async check(request: ValidationRequest): Promise<Partial<ValidationResult> | null> {
    const text = request.answer.trim().toLowerCase();
    if (text.length === 0) return null;

    // 1. Keyboard rows patterns (common mash: asdf, qwer, zxcv, etc.)
    const keyboardMashes = [
      'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
      'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop',
      'zxcv', 'xcvb', 'cvbn', 'vbnm'
    ];

    for (const mash of keyboardMashes) {
      if (text.includes(mash)) {
        return this.createFailure(
          0,
          'It looks like you typed random characters. Please write a meaningful response.',
          { confidence: 0.95 }
        );
      }
    }

    // 2. Vowelless strings: word >= 5 chars with no vowels
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.length >= 5 && !/[aeiouy]/.test(word)) {
        return this.createFailure(
          0,
          'Your input seems to contain gibberish. Please use real words with vowels.',
          { confidence: 0.9 }
        );
      }
    }

    // 3. Repeated character sequences (e.g. aaaaa, asdfasdfasdf)
    // 3a. Single char repeated 5+ times
    if (/(.)\1{4,}/.test(text)) {
      return this.createFailure(
        0,
        'Your response contains repetitive characters. Please provide a clear answer.',
        { confidence: 0.95 }
      );
    }

    // 3b. 2-3 char patterns repeated 3+ times (e.g. abcabcabc, ababab)
    if (/(.{2,3})\1{2,}/.test(text)) {
      return this.createFailure(
        0,
        'Your response looks repetitive and lacks structure. Please write a real answer.',
        { confidence: 0.9 }
      );
    }

    return null;
  }
}
