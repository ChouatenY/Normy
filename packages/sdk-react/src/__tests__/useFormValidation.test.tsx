import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React, { useEffect } from 'react';
import { NormyProvider } from '../components/NormyProvider.js';
import { useValidation } from '../hooks/useValidation.js';
import { useFormValidation } from '../hooks/useFormValidation.js';
import type { ValidateResponse } from '../types.js';

const MOCK_RESULT_VALID: ValidateResponse = {
  valid: true,
  score: 95,
  confidence: 0.98,
  issue: 'VALID',
  severity: 'success',
  feedback: 'Perfect description.',
};

const MOCK_RESULT_INVALID: ValidateResponse = {
  valid: false,
  score: 30,
  confidence: 0.99,
  issue: 'TOO_SHORT',
  severity: 'error',
  feedback: 'Please write a bit more.',
};

function TestForm({ minScore = 60 }: { minScore?: number }) {
  const fieldA = useValidation({ id: 'fieldA', question: 'Question A', mode: 'onBlur' });
  const fieldB = useValidation({ id: 'fieldB', question: 'Question B', mode: 'onBlur' });
  const form = useFormValidation({ minScore });

  return (
    <div>
      <input
        data-testid="input-a"
        value={fieldA.value}
        onChange={fieldA.handleChange}
        onBlur={fieldA.handleBlur}
      />
      <input
        data-testid="input-b"
        value={fieldB.value}
        onChange={fieldB.handleChange}
        onBlur={fieldB.handleBlur}
      />
      <div data-testid="form-valid">{form.isValid ? 'VALID' : 'INVALID'}</div>
      <div data-testid="form-score">{form.score}</div>
      <button data-testid="submit-btn" disabled={!form.isValid}>Submit</button>
    </div>
  );
}

describe('useFormValidation', () => {
  it('correctly reports invalid state initially and disables submit button', () => {
    render(
      <NormyProvider apiKey="nrm_test_abc123" projectId="proj-uuid-123">
        <TestForm />
      </NormyProvider>
    );

    expect(screen.getByTestId('form-valid').textContent).toBe('INVALID');
    expect(screen.getByTestId('form-score').textContent).toBe('0');
    expect(screen.getByTestId('submit-btn')).toBeDisabled();
  });

  it('reports valid state and enables submit button when all fields satisfy criteria', async () => {
    render(
      <NormyProvider apiKey="nrm_test_abc123" projectId="proj-uuid-123">
        <TestForm minScore={80} />
      </NormyProvider>
    );

    // Mock API validation call for field A
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_RESULT_VALID), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const inputA = screen.getByTestId('input-a');
    act(() => {
      fireEvent.change(inputA, { target: { value: 'Valid answer for A' } });
      fireEvent.blur(inputA);
    });

    // Await field A validation
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Form should still be INVALID because field B has not validated yet
    expect(screen.getByTestId('form-valid').textContent).toBe('INVALID');
    expect(screen.getByTestId('form-score').textContent).toBe('48'); // average of 95 and 0

    // Mock API validation call for field B
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_RESULT_VALID), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const inputB = screen.getByTestId('input-b');
    act(() => {
      fireEvent.change(inputB, { target: { value: 'Valid answer for B' } });
      fireEvent.blur(inputB);
    });

    // Await field B validation
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Form should now be VALID (all fields valid and scores 95 >= 80)
    expect(screen.getByTestId('form-valid').textContent).toBe('VALID');
    expect(screen.getByTestId('form-score').textContent).toBe('95');
    expect(screen.getByTestId('submit-btn')).not.toBeDisabled();
  });

  it('fails form validation if any field score is below minScore', async () => {
    render(
      <NormyProvider apiKey="nrm_test_abc123" projectId="proj-uuid-123">
        <TestForm minScore={80} />
      </NormyProvider>
    );

    // Mock API validation call for field A (valid with score 95)
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_RESULT_VALID), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const inputA = screen.getByTestId('input-a');
    act(() => {
      fireEvent.change(inputA, { target: { value: 'Valid answer for A' } });
      fireEvent.blur(inputA);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Mock API validation call for field B (invalid/low score 30)
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_RESULT_INVALID), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const inputB = screen.getByTestId('input-b');
    act(() => {
      fireEvent.change(inputB, { target: { value: 'Bad response' } });
      fireEvent.blur(inputB);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Form should be INVALID because field B score (30) < minScore (80)
    expect(screen.getByTestId('form-valid').textContent).toBe('INVALID');
    expect(screen.getByTestId('form-score').textContent).toBe('63'); // average of 95 and 30
    expect(screen.getByTestId('submit-btn')).toBeDisabled();
  });
});
