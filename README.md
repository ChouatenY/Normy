# Normy

AI-powered form validation and guidance layer that sits between forms and databases.

Instead of generic "Invalid input" errors, Normy returns contextual AI feedback that helps users write better answers — in real time.

## Monorepo structure

```
apps/
  api/           Hono REST API (POST /validate)
  dashboard/     Analytics dashboard (Next.js)
  docs/          Developer documentation site
packages/
  sdk-react/     @normy/react — React components + hooks
  sdk-js/        @normy/js — vanilla JavaScript client
  validation-core/  AI engine + local validators
  shared/        Shared types and env schemas
  ui/            Dashboard UI components
examples/
  react-live-demo/  Interactive SDK sandbox
```

## Quick start

```bash
git clone https://github.com/normy/normy.git
cd normy
cp .env.example .env
pnpm install

# Start Postgres + Redis
docker compose -f docker-compose.test.yml up -d

# Run migrations and start API
pnpm --filter @normy/api db:push
pnpm --filter @normy/api dev
```

Open API docs at http://localhost:3001/docs

## Install SDKs (from npm)

```bash
npm install @normy/react
npm install @normy/js
```

## React example

```tsx
import { NormyProvider, NormyTextarea } from '@normy/react';

<NormyProvider apiKey="nrm_test_..." projectId="your-project-id">
  <NormyTextarea
    id="reason"
    question="Why are you cancelling?"
    label="Cancellation reason"
    validationMode="onPause"
  />
</NormyProvider>
```

## Documentation

Run the docs site locally:

```bash
pnpm --filter @normy/docs dev
```

Open http://localhost:3002

## Development commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps (Turbo) |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests |
| `pnpm --filter @normy/react test` | React SDK unit tests |
| `pnpm --filter @normy/react-live-demo dev` | Live demo sandbox |

## Deployment readiness

SDK publishing is intentionally paused. Current work should focus on production deployment readiness: Gemini-backed API validation, PostgreSQL, Redis, API key management, and the live demo wired to the real API.

See [DEPLOYMENT.md](DEPLOYMENT.md) for database setup, Drizzle migrations, Docker Compose, Neon, Upstash, Vercel, Railway, and first-production checklist.

## License

MIT
