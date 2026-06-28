import { CodeBlock, DocsShell } from '@/components/DocsShell';

export default function QuickstartPage() {
  return (
    <DocsShell activePath="/docs/quickstart">
      <h1>Quick start</h1>
      <p className="lead">
        Validate a form field in under five minutes using the React SDK and a Normy API key.
      </p>

      <h2>1. Clone and start the platform</h2>
      <CodeBlock>{`git clone https://github.com/normy/normy.git
cd normy
cp .env.example .env
pnpm install
docker compose -f docker-compose.test.yml up -d   # Postgres + Redis
pnpm --filter @normy/api db:push
pnpm --filter @normy/api dev                      # http://localhost:3001`}</CodeBlock>

      <h2>2. Install the React SDK in your app</h2>
      <CodeBlock>{`pnpm add @normy/react
# or: npm install @normy/react`}</CodeBlock>

      <h2>3. Wrap your form</h2>
      <CodeBlock>{`import { NormyProvider, NormyTextarea } from '@normy/react';

export function CancelForm() {
  return (
    <NormyProvider
      apiKey={import.meta.env.VITE_NORMY_API_KEY}
      projectId={import.meta.env.VITE_NORMY_PROJECT_ID}
      apiUrl="http://localhost:3001"
      defaultMode="onPause"
      pauseMs={2000}
    >
      <NormyTextarea
        id="reason"
        question="Why are you cancelling?"
        label="Cancellation reason"
        rows={4}
      />
    </NormyProvider>
  );
}`}</CodeBlock>

      <div className="callout">
        Type a low-quality answer like <code>asdf</code> or <code>idk</code>, pause for 2 seconds,
        and the inline toast shows AI guidance — no form submit required.
      </div>

      <h2>4. Try the live demo</h2>
      <CodeBlock>{`pnpm --filter @normy/react-live-demo dev`}</CodeBlock>
    </DocsShell>
  );
}
