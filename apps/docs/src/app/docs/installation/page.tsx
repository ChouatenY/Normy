import { CodeBlock, DocsShell } from '@/components/DocsShell';

export default function InstallationPage() {
  return (
    <DocsShell activePath="/docs/installation">
      <h1>Installation</h1>
      <p className="lead">Requirements, monorepo setup, and environment configuration.</p>

      <h2>Requirements</h2>
      <ul>
        <li>Node.js 18+</li>
        <li>pnpm 9+</li>
        <li>PostgreSQL 16+</li>
        <li>Redis 7+</li>
        <li>At least one AI provider key (OpenAI, Gemini, or Anthropic)</li>
      </ul>

      <h2>Monorepo layout</h2>
      <CodeBlock>{`normy/
├── apps/
│   ├── api/          # Hono REST API (POST /validate)
│   ├── dashboard/    # Analytics dashboard (Next.js)
│   └── docs/         # This documentation site
├── packages/
│   ├── sdk-react/    # @normy/react
│   ├── sdk-js/       # @normy/js
│   ├── validation-core/  # AI engine + local validators
│   ├── shared/       # Shared types & env schemas
│   └── ui/           # Dashboard UI primitives
└── examples/
    └── react-live-demo/  # Interactive SDK sandbox`}</CodeBlock>

      <h2>Environment variables</h2>
      <p>Copy <code>.env.example</code> to <code>.env</code> and configure:</p>
      <CodeBlock>{`DATABASE_URL=postgresql://normy:normy@localhost:5432/normy
REDIS_URL=redis://localhost:6379
API_SECRET=your-32-char-minimum-secret
GEMINI_API_KEY=...          # or OPENAI_API_KEY / ANTHROPIC_API_KEY
AI_PROVIDER=gemini
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
PORT=3001`}</CodeBlock>

      <h2>Commands</h2>
      <table>
        <thead>
          <tr><th>Command</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>pnpm install</code></td><td>Install all workspace dependencies</td></tr>
          <tr><td><code>pnpm dev</code></td><td>Start all apps in dev mode (Turbo)</td></tr>
          <tr><td><code>pnpm build</code></td><td>Build all packages</td></tr>
          <tr><td><code>pnpm test</code></td><td>Run unit tests across the monorepo</td></tr>
          <tr><td><code>pnpm --filter @normy/api dev</code></td><td>API only</td></tr>
          <tr><td><code>pnpm --filter @normy/docs dev</code></td><td>Docs site on port 3002</td></tr>
        </tbody>
      </table>
    </DocsShell>
  );
}
