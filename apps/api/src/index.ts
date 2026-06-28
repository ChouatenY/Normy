import { OpenAPIHono, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { apiKeyAuth, type AuthContext } from './middleware/auth.js';
import { rateLimit } from './middleware/rate-limit.js';
import { validateRoute } from './routes/validate.js';
import { db } from './db/index.js';
import { env } from './config/env.js';
import { validations } from './db/schema/validations.js';
import { validationEvents } from './db/schema/validation-events.js';
import { users } from './db/schema/users.js';
import { projects, DEFAULT_PROJECT_SETTINGS } from './db/schema/projects.js';
import { apiKeys } from './db/schema/api-keys.js';
import { 
  EmptyValidator, 
  TooShortValidator, 
  RandomTextValidator, 
  SpamValidator, 
  GeminiProvider,
  OrchestratorPipeline,
} from '@normy/validation-core';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { redis } from './redis/index.js';

// Setup Hono app with custom context types
const app = new OpenAPIHono<AuthContext>();

type ApiKeyMode = 'live' | 'test';

function requireAdminSecret(c: Context) {
  const secret = c.req.header('x-admin-secret');
  if (!secret || secret !== env.API_SECRET) {
    return c.json({ error: 'Unauthorized: invalid admin secret' }, 401);
  }
  return null;
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function generateApiKey(mode: ApiKeyMode) {
  return `nrm_${mode}_${crypto.randomBytes(24).toString('base64url')}`;
}

function hashApiKey(rawKey: string) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return origin;
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return origin;
    }
    return allowedOrigins.includes(origin) ? origin : null;
  },
  allowHeaders: ['Content-Type', 'Authorization', 'x-admin-secret', 'x-session-id'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}));

// ─── Health / Version Routes ──────────────────────────────────────────────────

app.openapi({
  method: 'get',
  path: '/health',
  responses: {
    200: {
      description: 'API is healthy and online',
      content: {
        'application/json': {
          schema: z.object({ status: z.string() })
        }
      }
    }
  }
}, (c) => {
  return c.json({ status: 'healthy' });
});

app.openapi({
  method: 'get',
  path: '/version',
  responses: {
    200: {
      description: 'API Version',
      content: {
        'application/json': {
          schema: z.object({ version: z.string() })
        }
      }
    }
  }
}, (c) => {
  return c.json({ version: '0.1.0' });
});

// ─── Validation Route ─────────────────────────────────────────────────────────

// Management routes are protected by x-admin-secret so the first production
// environment can be bootstrapped before the dashboard auth flow exists.
app.post('/projects', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const body = await c.req.json().catch(() => null) as {
    name?: string;
    slug?: string;
    description?: string;
    ownerEmail?: string;
    ownerName?: string;
  } | null;

  if (!body?.name || !body.ownerEmail) {
    return c.json({ error: 'name and ownerEmail are required' }, 400);
  }

  const ownerName = body.ownerName?.trim() || body.ownerEmail;
  const projectSlug = slugify(body.slug || body.name);
  if (!projectSlug) {
    return c.json({ error: 'slug must contain at least one letter or number' }, 400);
  }

  let owner = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.email, body.ownerEmail!),
  });

  if (!owner) {
    [owner] = await db.insert(users).values({
      email: body.ownerEmail!,
      name: ownerName,
      passwordHash: 'managed-externally',
      emailVerified: true,
    }).returning();
  }

  const [project] = await db.insert(projects).values({
    name: body.name!,
    slug: projectSlug,
    description: body.description ?? null,
    userId: owner!.id,
    defaultProvider: 'gemini',
    settings: DEFAULT_PROJECT_SETTINGS,
  }).returning();

  return c.json({ project }, 201);
});

app.post('/api-keys', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const body = await c.req.json().catch(() => null) as {
    projectId?: string;
    name?: string;
    mode?: ApiKeyMode;
    rateLimit?: number;
  } | null;

  if (!body?.projectId || !body.name) {
    return c.json({ error: 'projectId and name are required' }, 400);
  }

  const mode = body.mode ?? 'test';
  if (mode !== 'live' && mode !== 'test') {
    return c.json({ error: 'mode must be live or test' }, 400);
  }

  const project = await db.query.projects.findFirst({
    where: (table, { eq, and, isNull }) => and(
      eq(table.id, body.projectId!),
      isNull(table.deletedAt),
    ),
  });
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const key = generateApiKey(mode);
  const [record] = await db.insert(apiKeys).values({
    projectId: body.projectId,
    name: body.name,
    keyHash: hashApiKey(key),
    keyPrefix: key.substring(0, 18),
    environment: mode === 'live' ? 'production' : 'development',
    rateLimit: body.rateLimit ?? 60,
  }).returning({
    id: apiKeys.id,
    projectId: apiKeys.projectId,
    name: apiKeys.name,
    keyPrefix: apiKeys.keyPrefix,
    environment: apiKeys.environment,
    rateLimit: apiKeys.rateLimit,
    createdAt: apiKeys.createdAt,
  });

  return c.json({ apiKey: key, record }, 201);
});

const publicApiKeyColumns = {
  id: apiKeys.id,
  projectId: apiKeys.projectId,
  name: apiKeys.name,
  keyPrefix: apiKeys.keyPrefix,
  environment: apiKeys.environment,
  rateLimit: apiKeys.rateLimit,
  revokedAt: apiKeys.revokedAt,
  lastUsedAt: apiKeys.lastUsedAt,
  totalRequestCount: apiKeys.totalRequestCount,
  createdAt: apiKeys.createdAt,
};

app.get('/api-keys', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const projectId = c.req.query('projectId');
  const rows = projectId
    ? await db.select(publicApiKeyColumns).from(apiKeys).where(eq(apiKeys.projectId, projectId))
    : await db.select(publicApiKeyColumns).from(apiKeys);

  return c.json({ apiKeys: rows });
});

app.delete('/api-keys/:id', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const id = c.req.param('id');
  const [record] = await db.update(apiKeys).set({
    revokedAt: new Date(),
    revokeReason: 'Deleted through API key management endpoint',
    updatedAt: new Date(),
  }).where(eq(apiKeys.id, id)).returning({
    id: apiKeys.id,
    revokedAt: apiKeys.revokedAt,
  });

  if (!record) {
    return c.json({ error: 'API key not found' }, 404);
  }

  return c.json({ deleted: true, apiKey: record });
});

// Apply authentication and rate limiting to /validate endpoint
// We do it before registering the route handler
app.use('/validate', apiKeyAuth, rateLimit);

app.openapi(validateRoute, async (c) => {
  const project = c.get('project');
  const apiKeyId = c.get('apiKeyId');
  const body = c.req.valid('json');

  // Verify request projectId matches the authenticated API key project
  if (body.projectId !== project.id) {
    return c.json({ error: 'Forbidden: Project ID mismatch' }, 403);
  }

  const sessionId = c.req.header('x-session-id') || null;
  const promptVersion = body.promptVersion || (project.settings as any)?.defaultPromptVersion || 'quality-v1';
  const providerName = project.defaultProvider || env.AI_PROVIDER || 'gemini';

  // 1. Check Redis Cache
  const cacheKey = `validation_cache:${crypto.createHash('sha256').update(
    JSON.stringify({
      question: body.question,
      answer: body.answer,
      provider: providerName,
      promptVersion
    })
  ).digest('hex')}`;

  let cachedResult: any = null;
  if (redis.status === 'ready') {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        cachedResult = JSON.parse(cached);
      }
    } catch (err) {
      console.warn('Redis cache get failed, bypassing cache:', err);
    }
  }

  if (cachedResult) {
    const validationId = crypto.randomUUID();
    const storeInput = project.settings?.storeInputText ?? true;

    await db.insert(validations).values({
      id: validationId,
      projectId: project.id,
      apiKeyId,
      question: storeInput ? body.question : null,
      answer: storeInput ? body.answer : null,
      issue: cachedResult.issue,
      score: cachedResult.score,
      feedback: cachedResult.feedback,
      severity: cachedResult.severity,
      valid: cachedResult.valid,
      pipelineStage: 'ai_provider',
      resolvedBy: 'cache',
      provider: providerName as any,
      model: 'gemini-2.5-flash',
      latencyMs: 0,
      tokenCount: 0,
      confidence: cachedResult.confidence,
      promptVersion,
      scoreBefore: null,
      scoreAfter: cachedResult.score,
      improvementDelta: null,
    }).catch(err => console.error('Failed to log cached validation:', err));

    await db.insert(validationEvents).values({
      validationId,
      projectId: project.id,
      type: 'validation_completed',
      sessionId,
      payload: { score: cachedResult.score, valid: cachedResult.valid, cached: true },
    }).catch(err => console.error('Failed to log cached validation_completed event:', err));

    return c.json({
      valid: cachedResult.valid,
      score: cachedResult.score,
      confidence: cachedResult.confidence,
      issue: cachedResult.issue,
      severity: cachedResult.severity,
      feedback: cachedResult.feedback,
      feedbackCategory: cachedResult.feedbackCategory,
      exampleAnswer: cachedResult.exampleAnswer,
    }, 200);
  }

  // 2. Record validation_triggered event
  await db.insert(validationEvents).values({
    projectId: project.id,
    type: 'validation_triggered',
    sessionId,
    payload: { mode: 'onSubmit' },
  }).catch((err) => console.error('Failed to log validation_triggered event:', err));

  // 3. Initialize orchestrator pipeline
  const validators = [
    new EmptyValidator(),
    new TooShortValidator(),
    new RandomTextValidator(),
    new SpamValidator(),
  ];
  
  if (providerName !== 'gemini') {
    return c.json({
      error: `Provider "${providerName}" is configured but not active in this deployment. Switch the project default provider to gemini or deploy a real provider adapter.`,
    }, 501);
  }

  const provider = new GeminiProvider({
    provider: 'gemini',
    apiKey: env.GEMINI_API_KEY || '',
  });
  
  const pipeline = new OrchestratorPipeline(
    'api-validation-pipeline',
    validators,
    provider
  );

  // 4. Retrieve previous score for user improvement tracking
  let scoreBefore: number | null = null;
  if (sessionId) {
    try {
      const lastEvent = await db.query.validationEvents.findFirst({
        where: (events, { eq, and }) => and(
          eq(events.projectId, project.id),
          eq(events.sessionId, sessionId),
          eq(events.type, 'validation_completed')
        ),
        orderBy: (events, { desc }) => [desc(events.createdAt)],
        with: {
          validation: true,
        },
      });

      if (lastEvent?.validation) {
        scoreBefore = lastEvent.validation.score;
      }
    } catch (err) {
      console.error('Failed to find score_before for improvement tracking:', err);
    }
  }

  const startTime = Date.now();
  const result = await pipeline.run({
    question: body.question,
    answer: body.answer,
    promptVersion,
    minScore: project.settings?.minScore ?? 50,
    ...(body.fieldContext !== undefined ? { fieldContext: body.fieldContext } : {}),
  });
  const latencyMs = Date.now() - startTime;

  const scoreAfter = result.score;
  const improvementDelta = scoreBefore !== null ? scoreAfter - scoreBefore : null;

  // 5. Persist validation to db
  const validationId = crypto.randomUUID();
  const storeInput = project.settings?.storeInputText ?? true;

  await db.insert(validations).values({
    id: validationId,
    projectId: project.id,
    apiKeyId,
    question: storeInput ? body.question : null,
    answer: storeInput ? body.answer : null,
    issue: result.issue,
    score: result.score,
    feedback: result.feedback,
    severity: result.severity,
    valid: result.valid,
    pipelineStage: result.provider === 'local' ? 'local_validator' : 'ai_provider',
    resolvedBy: result.provider === 'local' ? 'local_validator' : result.provider,
    provider: result.provider === 'local' ? null : result.provider,
    model: result.provider === 'local' ? null : 'gemini-2.5-flash',
    latencyMs,
    tokenCount: (result.tokenUsage?.inputTokens ?? 0) + (result.tokenUsage?.outputTokens ?? 0),
    confidence: result.confidence,
    promptVersion,
    scoreBefore,
    scoreAfter,
    improvementDelta,
  }).catch((err) => console.error('Failed to log validation to database:', err));

  // 6. Record validation_completed event referencing the validation ID
  await db.insert(validationEvents).values({
    validationId,
    projectId: project.id,
    type: 'validation_completed',
    sessionId,
    payload: { score: result.score, valid: result.valid },
  }).catch((err) => console.error('Failed to log validation_completed event:', err));

  // 7. Record token usage and cost event
  if (result.provider === 'gemini' && result.tokenUsage) {
    const inputTokens = result.tokenUsage.inputTokens;
    const outputTokens = result.tokenUsage.outputTokens;
    
    // Gemini 2.5 Flash input rate: $0.075 / 1M, output rate: $0.30 / 1M
    const cost = (inputTokens * 0.075 + outputTokens * 0.30) / 1000000;

    await db.insert(validationEvents).values({
      validationId,
      projectId: project.id,
      type: 'token_analytics',
      sessionId,
      payload: {
        inputTokens,
        outputTokens,
        estimatedCost: cost,
        latencyMs,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
      },
    }).catch(err => console.error('Failed to log token_analytics event:', err));
  }

  // 8. Record improvement event if applicable
  if (improvementDelta !== null && improvementDelta > 0) {
    await db.insert(validationEvents).values({
      validationId,
      projectId: project.id,
      type: 'feedback_improved',
      sessionId,
      payload: {
        scoreBefore,
        scoreAfter,
        improvementDelta,
      },
    }).catch(err => console.error('Failed to log feedback_improved event:', err));
  }

  // 9. Write to Redis cache if the result is valid or was processed by Gemini
  if (redis.status === 'ready' && result.provider === 'gemini') {
    try {
      await redis.set(cacheKey, JSON.stringify({
        valid: result.valid,
        score: result.score,
        confidence: result.confidence,
        issue: result.issue,
        severity: result.severity,
        feedback: result.feedback,
        feedbackCategory: result.feedbackCategory,
        exampleAnswer: result.exampleAnswer,
      }), 'EX', 86400); // cache for 24h
    } catch (err) {
      console.warn('Redis cache set failed:', err);
    }
  }

  // 10. Respond
  return c.json({
    valid: result.valid,
    score: result.score,
    confidence: result.confidence,
    issue: result.issue,
    severity: result.severity,
    feedback: result.feedback,
    feedbackCategory: result.feedbackCategory,
    exampleAnswer: result.exampleAnswer,
  }, 200);
});

// ─── OpenAPI Docs ─────────────────────────────────────────────────────────────

app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Normy API',
    version: '0.1.0',
    description: 'API for AI-powered real-time form validation and guidance',
  },
});

app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export default app;
export { app };
