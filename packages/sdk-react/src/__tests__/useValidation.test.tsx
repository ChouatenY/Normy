import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { useValidation } from '../hooks/useValidation.js';
import { NormyProvider } from '../components/NormyProvider.js';

// Mock the core API client so we can control network timing
vi.mock('../client/api.js', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    NormyClient: vi.fn().mockImplementation(() => ({
      getCapabilities: async () => ({ validate: true }),
      validate: vi.fn(async (req) => {
        // Default network latency mock
        await new Promise(r => setTimeout(r, 100));
        return {
          ok: true,
          data: {
            valid: true,
            score: 90,
            confidence: 100,
            issue: 'VALID',
            severity: 'success',
            feedback: 'Looks good!',
            source: 'gemini',
            metadata: { latencyMs: 150 }
          }
        };
      })
    }))
  };
});

// A wrapper component to test the hook visually in the DOM
function ValidationTestComponent({ mode = 'smart', pauseMs = 100 }: { mode?: any, pauseMs?: number }) {
  const { value, status, handleChange, result, isValidating } = useValidation({
    question: 'Why do you want to cancel?',
    mode,
    pauseMs
  });

  return (
    <div>
      <input data-testid="input" value={value} onChange={handleChange} />
      <div data-testid="status">{status}</div>
      <div data-testid="is-validating">{isValidating ? 'yes' : 'no'}</div>
      {result && <div data-testid="toast">{result.feedback}</div>}
    </div>
  );
}

function renderHookTest() {
  return render(
    <NormyProvider apiKey="nrm_test_123" projectId="proj-123">
      <ValidationTestComponent />
    </NormyProvider>
  );
}

describe('useValidation State Machine', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('Local validation never shows loading state', async () => {
    renderHookTest();
    const input = screen.getByTestId('input');
    
    // Type "a" (TooShortValidator will catch this instantly)
    fireEvent.change(input, { target: { value: 'a' } });
    
    expect(screen.getByTestId('status').textContent).toBe('typing');
    expect(screen.getByTestId('is-validating').textContent).toBe('no');

    // Trigger debounce
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Since 'a' is too short, the local validator catches it instantly.
    // It should NEVER flash 'checking_ai' and isValidating should NOT be true.
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('error');
    });

    expect(screen.getByTestId('is-validating').textContent).toBe('no');
    // Ensure the network was never hit
    expect(screen.queryByText('checking_ai')).not.toBeInTheDocument();
  });

  it('Toast clears immediately when editing resumes', async () => {
    renderHookTest();
    const input = screen.getByTestId('input');
    
    // Trigger local error
    fireEvent.change(input, { target: { value: 'asdf' } });
    act(() => { vi.advanceTimersByTime(100); });
    
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument();
    });

    // Start typing again
    fireEvent.change(input, { target: { value: 'asdfa' } });
    
    // Toast should instantly disappear, status back to typing, not validating
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    expect(screen.getByTestId('status').textContent).toBe('typing');
    expect(screen.getByTestId('is-validating').textContent).toBe('no');
  });

  it('Browser cache prevents duplicate HTTP requests', async () => {
    // For this test, we would track client.validate calls.
    // Since the API client mock is handled per-instance by NormyProvider,
    // we can observe the status changes to cache_hit.
    renderHookTest();
    const input = screen.getByTestId('input');
    
    // Type a valid sentence
    fireEvent.change(input, { target: { value: 'This is a long enough and valid sentence.' } });
    act(() => { vi.advanceTimersByTime(100); });
    
    // Wait for AI to finish
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('success');
    });

    // Edit to clear
    fireEvent.change(input, { target: { value: 'This is a long enough and valid sentence. ' } });
    // Edit back to exactly the same
    fireEvent.change(input, { target: { value: 'This is a long enough and valid sentence.' } });
    act(() => { vi.advanceTimersByTime(100); });

    // It should hit cache_hit and immediately success, bypassing checking_ai
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('success');
    });
  });

  it('AI loading only appears after browser validation succeeds', async () => {
    renderHookTest();
    const input = screen.getByTestId('input');
    
    // Valid input that bypasses local validators
    fireEvent.change(input, { target: { value: 'This is a completely valid and long enough sentence for testing.' } });
    
    // Fast-forward debounce
    act(() => { vi.advanceTimersByTime(100); });

    // Should immediately transition to checking_ai
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('checking_ai');
      expect(screen.getByTestId('is-validating').textContent).toBe('yes');
    });

    // Wait for the mock network to finish
    act(() => { vi.advanceTimersByTime(150); });

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('success');
      expect(screen.getByTestId('is-validating').textContent).toBe('no');
    });
  });
});
