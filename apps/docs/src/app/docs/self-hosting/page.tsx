import { CodeBlock, DocsShell } from '@/components/DocsShell';

export default function SelfHostingPage() {
  return (
    <DocsShell activePath="/docs/self-hosting">
      <h1>Self-hosting</h1>
      <p className="lead">Run the Normy API, database, and Redis on your own infrastructure.</p>

      <h2>One-command startup (development)</h2>
      <CodeBlock>{`cp .env.example .env
# Edit .env with your secrets and AI provider key

docker compose -f docker-compose.test.yml up -d
pnpm install
pnpm --filter @normy/api db:push
pnpm --filter @normy/api dev`}</CodeBlock>

      <h2>Services</h2>
      <table>
        <thead><tr><th>Service</th><th>Port</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td>API</td><td>3001</td><td>Hono REST API</td></tr>
          <tr><td>PostgreSQL</td><td>5432</td><td>Validations, projects, analytics</td></tr>
          <tr><td>Redis</td><td>6379</td><td>Rate limiting</td></tr>
          <tr><td>Docs</td><td>3002</td><td><code>pnpm --filter @normy/docs dev</code></td></tr>
          <tr><td>Dashboard</td><td>3000</td><td><code>pnpm --filter @normy/dashboard dev</code></td></tr>
        </tbody>
      </table>

      <h2>Point SDKs at your instance</h2>
      <CodeBlock>{`<NormyProvider
  apiKey="nrm_live_..."
  projectId="..."
  apiUrl="https://normy-api.yourcompany.com"
/>`}</CodeBlock>

      <h2>Production checklist</h2>
      <ul>
        <li>Set a strong <code>API_SECRET</code> (32+ characters)</li>
        <li>Configure <code>ALLOWED_ORIGINS</code> for CORS</li>
        <li>Use production API keys (<code>nrm_live_...</code>) with rate limits</li>
        <li>Run database migrations via <code>pnpm --filter @normy/api db:push</code></li>
        <li>Set at least one AI provider key (<code>OPENAI_API_KEY</code>, etc.)</li>
      </ul>

      <div className="callout">
        A production <code>docker-compose.yml</code> with the API Dockerfile is planned for the next release.
        For now, deploy the API as a Node.js service behind your reverse proxy.
      </div>
    </DocsShell>
  );
}
