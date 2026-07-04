import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { NormyProvider } from '../components/NormyProvider.js';
import { NormyAssist } from '../components/NormyAssist.js';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <NormyProvider
      apiKey="nrm_test_abc123"
      projectId="proj-uuid-123"
      defaultMode="onPause"
    >
      {ui}
    </NormyProvider>
  );
}

describe('NormyAssist', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders trigger button and title when opened', async () => {
    renderWithProvider(<NormyAssist welcomeMessage="Welcome user" title="My Guide" />);
    
    const trigger = screen.getByRole('button', { name: /toggle assistant/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByText('My Guide')).toBeInTheDocument();
    expect(screen.getByText('Welcome user')).toBeInTheDocument();
  });

  it('submits a user message and renders response', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('/assistant/chat')) {
        return Promise.resolve(new Response(JSON.stringify({
          conversationId: 'mock-conv-id',
          messageId: 'mock-msg-id-assistant',
          response: 'Sure, here is the answer',
          createdAt: new Date().toISOString()
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    renderWithProvider(<NormyAssist title="Normy Guide" />);
    
    fireEvent.click(screen.getByRole('button', { name: /toggle assistant/i }));

    const input = screen.getByPlaceholderText(/Ask a question about the/i);
    fireEvent.change(input, { target: { value: 'How does Visa work?' } });
    
    const form = screen.getByPlaceholderText(/Ask a question about the/i).closest('form');
    expect(form).toBeInTheDocument();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText('Sure, here is the answer')).toBeInTheDocument();
    });
  });

  it('rates an assistant reply', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('/messages')) {
        return Promise.resolve(new Response(JSON.stringify({
          messages: [
            {
              id: 'assistant-msg-1',
              conversationId: 'mock-conv-id',
              role: 'assistant',
              content: 'This is advice',
              createdAt: new Date().toISOString()
            }
          ]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (urlStr.includes('/rate')) {
        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    renderWithProvider(<NormyAssist conversationId="mock-conv-id" />);
    
    fireEvent.click(screen.getByRole('button', { name: /toggle assistant/i }));

    await waitFor(() => {
      expect(screen.getByText('This is advice')).toBeInTheDocument();
    });

    const rateHelpful = screen.getByTitle('Helpful');
    fireEvent.click(rateHelpful);

    await waitFor(() => {
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
    });
  });
});
