import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { NormyProvider } from '../components/NormyProvider.js';
import { NormyTextarea } from '../components/NormyTextarea.js';
import { NormyInput } from '../components/NormyInput.js';
import { NormyToast } from '../components/NormyToast.js';
import { NormyClient } from '../client/api.js';
import { useNormy } from '../hooks/useNormy.js';
import type { ValidateResponse } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_RESULT_VALID: ValidateResponse = {
  valid: true,
  score: 90,
  confidence: 0.95,
  issue: 'VALID',
  severity: 'success',
  feedback: 'Great response! Thank you.',
};

const MOCK_RESULT_INVALID: ValidateResponse = {
  valid: false,
  score: 10,
  confidence: 1.0,
  issue: 'TOO_SHORT',
  severity: 'error',
  feedback: 'Your response is too short. Please elaborate.',
};

function mockFetch(response: ValidateResponse | null, status = 200) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce(
    new Response(
      response ? JSON.stringify(response) : JSON.stringify({ error: 'Rate limit exceeded' }),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  );
}

function renderWithProvider(ui: React.ReactElement, pauseMs = 0) {
  return render(
    <NormyProvider
      apiKey="nrm_test_abc123"
      projectId="proj-uuid-123"
      defaultMode="onPause"
      pauseMs={pauseMs}
    >
      {ui}
    </NormyProvider>
  );
}

// ─── NormyProvider ────────────────────────────────────────────────────────────

describe('NormyProvider', () => {
  it('provides context to children', () => {
    function Consumer() {
      const ctx = useNormy();
      return <div data-testid="ctx">{ctx.projectId}</div>;
    }

    renderWithProvider(<Consumer />);
    expect(screen.getByTestId('ctx')).toHaveTextContent('proj-uuid-123');
  });

  it('throws when useNormy() is used outside provider', () => {
    // Suppress React error boundary output in test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<>{React.createElement(() => { useNormy(); return null; })}</>)).toThrow(
      '[Normy] useNormy()'
    );
    spy.mockRestore();
  });
});

// ─── NormyToast ───────────────────────────────────────────────────────────────

describe('NormyToast', () => {
  it('renders nothing when result is null', () => {
    const { container } = render(<NormyToast result={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders loading state while validating', () => {
    render(<NormyToast result={null} isValidating={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/checking your response/i)).toBeInTheDocument();
  });

  it('renders error toast with alert role', () => {
    render(<NormyToast result={MOCK_RESULT_INVALID} />);
    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute('data-severity', 'error');
    expect(screen.getByText(/too short/i)).toBeInTheDocument();
  });

  it('renders success toast with status role', () => {
    render(<NormyToast result={MOCK_RESULT_VALID} successDismissMs={0} />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('data-severity', 'success');
    expect(screen.getByText(/great response/i)).toBeInTheDocument();
  });

  it('renders api error message', () => {
    render(<NormyToast result={null} apiError="Rate limit exceeded" />);
    expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
  });
});

// ─── NormyTextarea ────────────────────────────────────────────────────────────

describe('NormyTextarea — onPause mode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders label and textarea', () => {
    renderWithProvider(
      <NormyTextarea id="test" question="Why cancel?" label="Reason" />
    );
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
  });

  it('updates value when user types', () => {
    renderWithProvider(<NormyTextarea id="t1" question="Why?" label="Reason" pauseMs={50} />);
    const ta = screen.getByLabelText('Reason') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'Hello' } });
    expect(ta.value).toBe('Hello');
  });

  it('calls API after debounce and shows success toast', async () => {
    mockFetch(MOCK_RESULT_VALID);
    renderWithProvider(
      <NormyTextarea id="t2" question="Why cancel?" label="Reason" pauseMs={50} />,
      50
    );

    const ta = screen.getByLabelText('Reason');
    fireEvent.change(ta, { target: { value: 'Some good answer' } });

    await waitFor(() => {
      expect(screen.queryByRole('status')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows error toast on invalid result', async () => {
    mockFetch(MOCK_RESULT_INVALID);
    renderWithProvider(
      <NormyTextarea id="t3" question="Why?" label="Reason" pauseMs={50} />,
      50
    );

    const ta = screen.getByLabelText('Reason');
    fireEvent.change(ta, { target: { value: 'no' } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/too short/i)).toBeInTheDocument();
    }, { timeout: 1000 });

    // aria-invalid should be set
    expect(ta).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles rate limit (429) gracefully', async () => {
    mockFetch(null, 429);
    renderWithProvider(
      <NormyTextarea id="t4" question="Why?" label="Reason" pauseMs={50} />,
      50
    );

    const ta = screen.getByLabelText('Reason');
    fireEvent.change(ta, { target: { value: 'some text' } });
    
    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});

// ─── NormyInput ───────────────────────────────────────────────────────────────

describe('NormyInput — onBlur mode', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('validates on blur', async () => {
    mockFetch(MOCK_RESULT_VALID);
    renderWithProvider(
      <NormyInput id="i1" question="Company name?" label="Company" validationMode="onBlur" />
    );

    const input = screen.getByLabelText('Company') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Acme Corp' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce();
    });
  });

  it('does NOT validate on change in onBlur mode', () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    renderWithProvider(
      <NormyInput id="i2" question="Name?" label="Name" validationMode="onBlur" />
    );

    const input = screen.getByLabelText('Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─── NormyClient ─────────────────────────────────────────────────────────────

describe('NormyClient', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns ok:true with enriched feedbackCategory on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_RESULT_VALID), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new NormyClient({ apiKey: 'test', baseUrl: 'http://localhost' });
    const res = await client.validate({ projectId: 'p1', question: 'Q', answer: 'A' });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.feedbackCategory).toBe('valid');
    }
  });

  it('returns ok:false on 401', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized: Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new NormyClient({ apiKey: 'bad', baseUrl: 'http://localhost' });
    const res = await client.validate({ projectId: 'p1', question: 'Q', answer: 'A' });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.status).toBe(401);
      expect(res.error.error).toContain('Unauthorized');
    }
  });

  it('returns ok:false with timeout error on AbortError', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(
      Object.assign(new DOMException('Aborted', 'AbortError'))
    );

    const client = new NormyClient({ apiKey: 'test', baseUrl: 'http://localhost', timeoutMs: 1 });
    const res = await client.validate({ projectId: 'p1', question: 'Q', answer: 'A' });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.error).toBe('Request timed out');
      expect(res.error.status).toBe(408);
    }
  });
});
