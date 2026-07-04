import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { NormyProvider } from '../components/NormyProvider.js';
import {
  NormyAssistant,
  NormyHelpButton,
  useNormyAssistant,
} from '../components/NormyAssistant.js';

function renderWithProvider(ui: React.ReactElement, providerProps: any = {}) {
  return render(
    <NormyProvider
      apiKey="nrm_test_abc123"
      projectId="proj-uuid-123"
      defaultMode="onPause"
      {...providerProps}
    >
      {ui}
    </NormyProvider>
  );
}

describe('NormyAssistant and related components', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders closed by default and opens programmatically or via trigger', async () => {
    function TestComponent() {
      const assistant = useNormyAssistant();
      return (
        <div>
          <button onClick={() => assistant.open()}>Open Programmatically</button>
          <NormyAssistant welcomePlaceholder="Need help?" />
        </div>
      );
    }

    renderWithProvider(<TestComponent />);

    // Initially closed
    expect(screen.queryByPlaceholderText('Need help?')).not.toBeInTheDocument();

    // Open programmatically
    fireEvent.click(screen.getByText('Open Programmatically'));
    expect(screen.getByPlaceholderText('Need help?')).toBeInTheDocument();
  });

  it('opens and closes via custom keyboard shortcut', async () => {
    renderWithProvider(<NormyAssistant welcomePlaceholder="Need help?" />, {
      assistantShortcut: 'Ctrl+k',
    });

    expect(screen.queryByPlaceholderText('Need help?')).not.toBeInTheDocument();

    // Trigger keyboard shortcut Ctrl+k
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByPlaceholderText('Need help?')).toBeInTheDocument();

    // Trigger keyboard shortcut Ctrl+k again to close
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.queryByPlaceholderText('Need help?')).not.toBeInTheDocument();
  });

  it('updates placeholder dynamically based on field focus and triggers fetch', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('/assistant/chat')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              conversationId: 'mock-conv-id',
              messageId: 'mock-msg-id',
              response: 'The company allows cancellation within 30 days.',
              createdAt: new Date().toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    renderWithProvider(
      <div>
        <input id="policy" data-normy-label="Cancellation Policy" />
        <NormyAssistant welcomePlaceholder="General help..." />
      </div>
    );

    // Open the assistant
    fireEvent.keyDown(window, { key: '/', ctrlKey: true });
    expect(screen.getByPlaceholderText('General help...')).toBeInTheDocument();

    // Focus on input field
    const inputField = document.getElementById('policy')!;
    fireEvent.focus(inputField);

    // Verify placeholder updates dynamically
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ask about "Cancellation Policy"...')).toBeInTheDocument();
    });

    // Ask a question in the assistant text box
    const assistantInput = screen.getByPlaceholderText('Ask about "Cancellation Policy"...');
    fireEvent.change(assistantInput, { target: { value: 'What is the refund window?' } });
    fireEvent.submit(assistantInput.closest('form')!);

    // Verify response is displayed directly withoutTimeline bubbles
    await waitFor(() => {
      expect(screen.getByText('The company allows cancellation within 30 days.')).toBeInTheDocument();
    });

    // Click "Got it" to dismiss the answer
    fireEvent.click(screen.getByText('Got it'));
    expect(screen.queryByText('The company allows cancellation within 30 days.')).not.toBeInTheDocument();
  });

  it('updates context when NormyHelpButton is clicked', async () => {
    renderWithProvider(
      <div>
        <NormyHelpButton
          fieldId="pricing"
          label="Subscription Price"
          hint="We offer monthly and annual tiers"
        />
        <NormyAssistant welcomePlaceholder="Need help?" />
      </div>
    );

    expect(screen.queryByPlaceholderText('Need help?')).not.toBeInTheDocument();

    // Click help button by its exact title
    fireEvent.click(screen.getByTitle('Get help with Subscription Price'));

    // Assistant should open and focus, showing the dynamic label placeholder
    expect(screen.getByPlaceholderText('Ask about "Subscription Price"...')).toBeInTheDocument();
  });
});
