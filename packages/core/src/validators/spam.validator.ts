import { BaseValidator } from './base.js';
import type { ValidationRequest, ValidationResult, ValidationIssue } from '../types.js';

export class SpamValidator extends BaseValidator {
  readonly id = 'spam-validator';
  readonly description = 'Detects potential spam, repetitive promotional phrases, excessive uppercase, or excessive punctuation.';
  readonly issueType: ValidationIssue = 'SPAM';

  async check(request: ValidationRequest): Promise<Partial<ValidationResult> | null> {
    const trimmed = request.answer.trim();
    if (trimmed.length === 0) return null;

    const lower = trimmed.toLowerCase();

    // 1. Repetitive phrases (e.g. "buy now buy now buy now" or "click here click here")
    // Split into words and check if the same word/phrase is repeated heavily
    const words = lower.split(/\s+/);
    if (words.length >= 3) {
      // Check for repeating sequences of 1-3 words
      for (let len = 1; len <= 3; len++) {
        for (let i = 0; i <= words.length - len * 3; i++) {
          const chunk1 = words.slice(i, i + len).join(' ');
          const chunk2 = words.slice(i + len, i + len * 2).join(' ');
          const chunk3 = words.slice(i + len * 2, i + len * 3).join(' ');
          
          if (chunk1 === chunk2 && chunk2 === chunk3) {
            return this.createFailure(
              10,
              'Your response looks repetitive and spam-like. Please write a genuine response.',
              { confidence: 0.95 }
            );
          }
        }
      }
    }

    // 2. High capitalization (e.g. all caps in long strings: "BUY NOW BUY NOW BUY NOW")
    // If the input has at least 8 alphabetic characters and is all caps
    const alphaChars = trimmed.replace(/[^a-zA-Z]/g, '');
    if (alphaChars.length >= 8 && alphaChars === alphaChars.toUpperCase()) {
      return this.createFailure(
        20,
        'Please avoid typing in all capital letters. It looks like spam or shouting.',
        { confidence: 0.85 }
      );
    }

    // 3. Excessive punctuation (e.g. "!!!!" or "????")
    if (/([!?])\1{3,}/.test(trimmed)) {
      return this.createFailure(
        15,
        'Your response contains excessive punctuation. Please write standard sentences.',
        { confidence: 0.9 }
      );
    }

    // 4. Common spam keywords/phrases
    const spamPhrases = [
      'free money',
      'earn money',
      'click here',
      'click link',
      'subscribe now',
      'winner',
      'cash prize',
      'make money fast'
    ];

    for (const phrase of spamPhrases) {
      if (lower.includes(phrase)) {
        return this.createFailure(
          10,
          `Your response contains phrases associated with spam ("${phrase}"). Please provide a relevant answer.`,
          { confidence: 0.9 }
        );
      }
    }

    return null;
  }
}
