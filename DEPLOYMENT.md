# Normy Deployment Guide

Normy is not ready for public SDK publishing yet. Treat this guide as the first production environment checklist for the API, database, Redis, docs, and live demo.

## Provider Readiness

- `AI_PROVIDER` defaults to `gemini`.
- Fresh projects default to `defaultProvider = gemini`.
- OpenAI and Anthropic remain valid provider options for future developer-selected provider configuration, but this deployment only has a real Gemini runtime adapter wired.
- Do not rely on mock validation in production.

## Fresh PostgreSQL Database

Local Docker database:

```bash
docker run --name normy-postgres \
  -e POSTGRES_USER=normy \
  -e POSTGRES_PASSWORD=change-me \
  -e POSTGRES_DB=normy \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Create the local `.env`:

```bash
cp .env.example .env
```

Set:

```bash
DATABASE_URL=postgresql://normy:change-me@localhost:5432/normy
REDIS_URL=redis://localhost:6379
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key
API_SECRET=your-32-character-minimum-secret
```

## Drizzle Migrations And Table Initialization

Generate migrations from the schema:

```bash
pnpm --filter @normy/api db:generate
```

Run migrations against the configured database:

```bash
pnpm --filter @normy/api db:migrate
```

For a brand-new non-production database where you want Drizzle to initialize all tables directly from schema:

```bash
pnpm --filter @normy/api db:push
```

Verify tables:

```bash
psql "$DATABASE_URL" -c "\dt"
```

Expected tables include `users`, `projects`, `api_keys`, `provider_configs`, `validations`, `validation_events`, and `analytics_daily`.

## API Bootstrap

Create a project:

```bash
curl -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $API_SECRET" \
  -d '{"name":"Production","slug":"production","ownerEmail":"admin@example.com","ownerName":"Admin"}'
```

Create a test key:

```bash
curl -X POST http://localhost:3001/api-keys \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $API_SECRET" \
  -d '{"projectId":"PROJECT_ID","name":"Local demo","mode":"test"}'
```

Create a live key:

```bash
curl -X POST http://localhost:3001/api-keys \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $API_SECRET" \
  -d '{"projectId":"PROJECT_ID","name":"Production frontend","mode":"live"}'
```

Keys are returned once as `nrm_test_*` or `nrm_live_*`. Only SHA-256 hashes are stored.

List keys:

```bash
curl http://localhost:3001/api-keys?projectId=PROJECT_ID \
  -H "x-admin-secret: $API_SECRET"
```

Revoke a key:

```bash
curl -X DELETE http://localhost:3001/api-keys/API_KEY_ID \
  -H "x-admin-secret: $API_SECRET"
```

## Production Docker Compose

Create `.env.production`:

```bash
POSTGRES_PASSWORD=replace-me
POSTGRES_DB=normy
API_SECRET=replace-with-long-random-secret
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key
ALLOWED_ORIGINS=https://your-docs-domain.vercel.app
```

Start the stack:

```bash
docker compose --env-file .env.production up -d --build
```

Initialize the database:

```bash
docker compose --env-file .env.production exec api pnpm --filter @normy/api db:migrate
```

Health check:

```bash
curl http://localhost:3001/health
```

## Neon PostgreSQL

1. Create a Neon project.
2. Create a production database named `normy`.
3. Copy the pooled connection string.
4. Set Railway `DATABASE_URL` to the Neon pooled connection string.
5. Run `pnpm --filter @normy/api db:migrate` from a trusted environment with `DATABASE_URL` set.

## Upstash Redis

1. Create an Upstash Redis database.
2. Copy the Redis URL.
3. Set Railway `REDIS_URL` to that value.
4. Confirm rate limiting by using a low `rateLimit` API key in staging.

## Vercel Docs Site

1. Import the repository into Vercel.
2. Set the root directory to `apps/docs`.
3. Use install command `pnpm install --frozen-lockfile`.
4. Use build command `pnpm build`.
5. Set `NEXT_PUBLIC_NORMY_API_URL` to the Railway API URL.
6. Add the Vercel domain to API `ALLOWED_ORIGINS`.

## Railway API Deployment

1. Create a Railway service from this repository.
2. Set the Dockerfile path to `apps/api/Dockerfile`.
3. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `DATABASE_URL`
   - `REDIS_URL`
   - `API_SECRET`
   - `AI_PROVIDER=gemini`
   - `GEMINI_API_KEY`
   - `ALLOWED_ORIGINS`
4. Deploy the service.
5. Run migrations with a one-off Railway command:

```bash
pnpm --filter @normy/api db:migrate
```

6. Open `/health` on the Railway domain.

## React Live Demo

Set these in `examples/react-live-demo/.env.local`:

```bash
VITE_NORMY_API_URL=http://localhost:3001
VITE_NORMY_PROJECT_ID=your-project-id
VITE_NORMY_API_KEY=nrm_test_or_live_key
```

Run:

```bash
pnpm --filter @normy/example-react-live-demo dev
```

The demo path is:

```text
Form -> @normy/react SDK -> API -> Gemini -> NormyToast
```

## First Production Checklist

1. Create Neon PostgreSQL database.
2. Create Upstash Redis database.
3. Generate `API_SECRET`.
4. Add `DATABASE_URL`, `REDIS_URL`, `API_SECRET`, `AI_PROVIDER=gemini`, and `GEMINI_API_KEY` to Railway.
5. Deploy the Railway API from `apps/api/Dockerfile`.
6. Run Drizzle migrations against Neon.
7. Confirm `GET /health` returns `{"status":"healthy"}`.
8. Create the first project with `POST /projects`.
9. Create `nrm_test_*` and `nrm_live_*` keys with `POST /api-keys`.
10. Store the raw keys in the deployment secret manager only.
11. Configure Vercel docs with `NEXT_PUBLIC_NORMY_API_URL`.
12. Add the docs/demo origins to `ALLOWED_ORIGINS`.
13. Configure the React live demo with `VITE_NORMY_API_URL`, `VITE_NORMY_PROJECT_ID`, and `VITE_NORMY_API_KEY`.
14. Submit a demo form and verify API logs show Gemini-backed validation.
15. Revoke any bootstrap/test keys that should not remain active.
