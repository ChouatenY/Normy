import { CodeBlock, DocsShell } from '@/components/DocsShell';

export default function NextjsPage() {
  return (
    <DocsShell activePath="/docs/nextjs">
      <h1>Next.js integration</h1>
      <p className="lead">Use Normy in App Router or Pages Router with client components.</p>

      <h2>Install</h2>
      <CodeBlock>{`npm install @normy/react`}</CodeBlock>

      <h2>Environment</h2>
      <CodeBlock>{`# .env.local
NEXT_PUBLIC_NORMY_API_KEY=nrm_test_...
NEXT_PUBLIC_NORMY_PROJECT_ID=your-project-id
NEXT_PUBLIC_NORMY_API_URL=http://localhost:3001`}</CodeBlock>

      <h2>Client provider wrapper</h2>
      <CodeBlock>{`'use client';

import { NormyProvider } from '@normy/react';

export function NormyRoot({ children }: { children: React.ReactNode }) {
  return (
    <NormyProvider
      apiKey={process.env.NEXT_PUBLIC_NORMY_API_KEY!}
      projectId={process.env.NEXT_PUBLIC_NORMY_PROJECT_ID!}
      apiUrl={process.env.NEXT_PUBLIC_NORMY_API_URL}
    >
      {children}
    </NormyProvider>
  );
}`}</CodeBlock>

      <h2>Use in a page</h2>
      <CodeBlock>{`// app/feedback/page.tsx
'use client';

import { NormyTextarea } from '@normy/react';
import { NormyRoot } from '@/components/NormyRoot';

export default function FeedbackPage() {
  return (
    <NormyRoot>
      <form>
        <NormyTextarea
          id="feedback"
          question="What could we improve?"
          label="Your feedback"
          validationMode="onPause"
        />
      </form>
    </NormyRoot>
  );
}`}</CodeBlock>

      <div className="callout">
        Normy components must run on the client because they use hooks, fetch, and real-time validation.
        Keep server components for layout; wrap validated fields in a client boundary.
      </div>
    </DocsShell>
  );
}
