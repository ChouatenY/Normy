import { OpenAPIHono, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { apiKeyAuth, type AuthContext } from './middleware/auth.js';
import { rateLimit } from './middleware/rate-limit.js';
import { validateRoute } from './routes/validate.js';
import { telemetryBatchRoute } from './routes/telemetry.js';
import {
  listKnowledgeSourcesRoute,
  createKnowledgeSourceRoute,
  updateKnowledgeSourceRoute,
  deleteKnowledgeSourceRoute,
  assistantChatRoute,
  getConversationMessagesRoute,
  rateAssistantMessageRoute,
  listAssistantConversationsRoute,
} from './routes/assistant.js';
import { providerRoutes } from './routes/providers.js';
import { db } from './db/index.js';
import { env } from './config/env.js';
import { validations } from './db/schema/validations.js';
import { validationEvents } from './db/schema/validation-events.js';
import { users } from './db/schema/users.js';
import { projects, DEFAULT_PROJECT_SETTINGS } from './db/schema/projects.js';
import { apiKeys } from './db/schema/api-keys.js';
import { knowledgeSources } from './db/schema/knowledge-sources.js';
import { assistantConversations } from './db/schema/assistant-conversations.js';
import { assistantMessages } from './db/schema/assistant-messages.js';
import { 
  EmptyValidator, 
  TooShortValidator, 
  RandomTextValidator, 
  SpamValidator, 
  OrchestratorPipeline,
} from '@normy-validation/validation-core';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { redis } from './redis/index.js';
import { GoogleGenAI } from '@google/genai';
import { encrypt, decrypt } from './utils/encryption.js';
import type { AIProvider } from '@normy-validation/core';
import { ProviderService } from './services/provider.service.js';

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
    defaultProvider?: 'gemini' | 'openai' | 'anthropic';
    minScore?: number;
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

  let finalSlug = projectSlug;
  const existingProject = await db.query.projects.findFirst({
    where: (table, { eq }) => eq(table.slug, finalSlug),
  });
  if (existingProject) {
    finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const [project] = await db.insert(projects).values({
    name: body.name!,
    slug: finalSlug,
    description: body.description ?? null,
    userId: owner!.id,
    defaultProvider: body.defaultProvider || 'gemini',
    settings: {
      ...DEFAULT_PROJECT_SETTINGS,
      minScore: body.minScore ?? DEFAULT_PROJECT_SETTINGS.minScore
    },
  }).returning();

  return c.json({ project }, 201);
});

app.get('/projects', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const email = c.req.query('email');
  if (!email) {
    return c.json({ error: 'email query parameter is required' }, 400);
  }

  const owner = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.email, email),
  });

  if (!owner) {
    return c.json({ projects: [] });
  }

  const userProjects = await db.query.projects.findMany({
    where: (table, { eq, isNull, and }) => and(
      eq(table.userId, owner.id),
      isNull(table.deletedAt)
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)]
  });

  return c.json({ projects: userProjects });
});

app.put('/projects/:projectId', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const projectId = c.req.param('projectId');
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'invalid body' }, 400);

  const existingProject = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.id, projectId)
  });

  if (!existingProject) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const updatePayload: any = {
    name: body.name,
    slug: body.slug,
    description: body.description,
    defaultProvider: body.defaultProvider,
    updatedAt: new Date()
  };

  if (body.settings) {
    updatePayload.settings = {
      ...(existingProject.settings || {}),
      ...body.settings
    };
  }

  const [project] = await db.update(projects)
    .set(updatePayload)
    .where(eq(projects.id, projectId))
    .returning();

  return c.json({ project });
});

app.delete('/projects/:projectId', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const projectId = c.req.param('projectId');
  
  // Soft delete
  await db.update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date(), isActive: false })
    .where(eq(projects.id, projectId));

  return c.json({ success: true });
});

app.put('/projects/:projectId/byok', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const projectId = c.req.param('projectId');
  const body = await c.req.json().catch(() => null) as {
    provider: 'gemini' | 'openai' | 'anthropic';
    key: string;
    title?: string;
  } | null;

  if (!body?.provider || !body.key) {
    return c.json({ error: 'provider and key are required' }, 400);
  }

  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.id, projectId)
  });

  if (!project) return c.json({ error: 'Project not found' }, 404) as any;

  const encryptedKey = encrypt(body.key);
  const settings: any = project.settings || {};
  if (!settings.byokKeys) settings.byokKeys = [];

  const newKey = {
    id: crypto.randomUUID(),
    provider: body.provider,
    title: body.title || `${body.provider === 'gemini' ? 'Google Gemini' : body.provider === 'openai' ? 'OpenAI' : 'Anthropic'} Key`,
    encryptedKey,
    isPrimary: false,
    createdAt: new Date().toISOString()
  };

  const existingProviderKeys = settings.byokKeys.filter((k: any) => k.provider === body.provider);
  if (existingProviderKeys.length === 0) {
    newKey.isPrimary = true;
  }

  settings.byokKeys.push(newKey);

  const updateData: any = { settings };
  if (newKey.isPrimary) {
    if (body.provider === 'gemini') updateData.geminiApiKey = encryptedKey;
    if (body.provider === 'openai') updateData.openaiApiKey = encryptedKey;
    if (body.provider === 'anthropic') updateData.anthropicApiKey = encryptedKey;
  }

  await db.update(projects)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  return c.json({ success: true, keyId: newKey.id }, 200) as any;
});

app.post('/projects/:projectId/byok/:keyId/primary', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const projectId = c.req.param('projectId');
  const keyId = c.req.param('keyId');

  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.id, projectId)
  });

  if (!project) return c.json({ error: 'Project not found' }, 404) as any;
  const settings: any = project.settings || {};
  if (!settings.byokKeys) return c.json({ error: 'No BYOK keys found' }, 404) as any;

  const targetKey = settings.byokKeys.find((k: any) => k.id === keyId);
  if (!targetKey) return c.json({ error: 'Key not found' }, 404) as any;

  settings.byokKeys = settings.byokKeys.map((k: any) => {
    if (k.provider === targetKey.provider) {
      return { ...k, isPrimary: k.id === keyId };
    }
    return k;
  });

  const updateData: any = { settings, defaultProvider: targetKey.provider };
  if (targetKey.provider === 'gemini') updateData.geminiApiKey = targetKey.encryptedKey;
  if (targetKey.provider === 'openai') updateData.openaiApiKey = targetKey.encryptedKey;
  if (targetKey.provider === 'anthropic') updateData.anthropicApiKey = targetKey.encryptedKey;

  await db.update(projects)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  return c.json({ success: true }, 200) as any;
});

app.delete('/projects/:projectId/byok/:keyId', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const projectId = c.req.param('projectId');
  const keyId = c.req.param('keyId');

  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.id, projectId)
  });

  if (!project) return c.json({ error: 'Project not found' }, 404) as any;
  const settings: any = project.settings || {};
  if (!settings.byokKeys) return c.json({ error: 'No BYOK keys found' }, 404) as any;

  const targetKey = settings.byokKeys.find((k: any) => k.id === keyId);
  if (!targetKey) return c.json({ error: 'Key not found' }, 404) as any;

  settings.byokKeys = settings.byokKeys.filter((k: any) => k.id !== keyId);

  const updateData: any = { settings };
  if (targetKey.isPrimary) {
    if (targetKey.provider === 'gemini') updateData.geminiApiKey = null;
    if (targetKey.provider === 'openai') updateData.openaiApiKey = null;
    if (targetKey.provider === 'anthropic') updateData.anthropicApiKey = null;
    
    const fallbackKey = settings.byokKeys.find((k: any) => k.provider === targetKey.provider);
    if (fallbackKey) {
       fallbackKey.isPrimary = true;
       if (fallbackKey.provider === 'gemini') updateData.geminiApiKey = fallbackKey.encryptedKey;
       if (fallbackKey.provider === 'openai') updateData.openaiApiKey = fallbackKey.encryptedKey;
       if (fallbackKey.provider === 'anthropic') updateData.anthropicApiKey = fallbackKey.encryptedKey;
    }
  }

  await db.update(projects)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  return c.json({ success: true }, 200) as any;
});

app.get('/projects/:projectId/providers', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const projectId = c.req.param('projectId');
  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.id, projectId)
  });

  if (!project) return c.json({ error: 'Project not found' }, 404) as any;

  // Resolve Gemini dynamic models if a key exists
  let geminiAvailableModels = [
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-pro'
  ];
  let geminiStatus: 'connected' | 'disconnected' | 'disabled' = project.geminiApiKey ? 'connected' : 'disconnected';

  if (project.geminiApiKey) {
    try {
      const decryptedKey = decrypt(project.geminiApiKey);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${decryptedKey}`, {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json() as any;
        if (data && Array.isArray(data.models)) {
          const chatModels = data.models
            .filter((m: any) => 
              m.supportedGenerationMethods?.includes('generateContent') &&
              !m.name?.includes('embedding')
            )
            .map((m: any) => {
              const name = m.name || '';
              return name.startsWith('models/') ? name.substring(7) : name;
            });
          if (chatModels.length > 0) {
            geminiAvailableModels = chatModels;
          } else {
            geminiAvailableModels = [];
          }
        } else {
          geminiAvailableModels = [];
        }
      } else {
        geminiAvailableModels = [];
        geminiStatus = 'disabled';
      }
    } catch (err) {
      console.error('Failed to fetch dynamic gemini models:', err);
    }
  }

  const geminiMode = project.geminiApiKey ? 'byok' : 'hosted';
  const geminiModel = (project.settings as any)?.geminiModel || env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

  const openaiMode = project.openaiApiKey ? 'byok' : 'hosted';
  const openaiModel = (project.settings as any)?.openaiModel || 'gpt-4o-mini';
  const openaiStatus = project.openaiApiKey ? 'connected' : 'disconnected';

  const anthropicMode = project.anthropicApiKey ? 'byok' : 'hosted';
  const anthropicModel = (project.settings as any)?.anthropicModel || 'claude-3-5-haiku-latest';
  const anthropicStatus = project.anthropicApiKey ? 'connected' : 'disconnected';

  return c.json({
    providers: [
      {
        name: 'gemini',
        status: geminiStatus,
        mode: geminiMode,
        model: geminiModel,
        availableModels: geminiAvailableModels,
      },
      {
        name: 'openai',
        status: openaiStatus,
        mode: openaiMode,
        model: openaiModel,
        availableModels: [
          'gpt-4o-mini',
          'gpt-4o',
          'gpt-4-turbo',
          'gpt-4',
          'gpt-3.5-turbo'
        ],
      },
      {
        name: 'anthropic',
        status: anthropicStatus,
        mode: anthropicMode,
        model: anthropicModel,
        availableModels: [
          'claude-3-5-haiku-latest',
          'claude-3-5-sonnet-latest',
          'claude-3-opus-latest',
          'claude-3-haiku-20240307',
          'claude-3-sonnet-20240229'
        ],
      }
    ]
  }) as any;
});

app.get('/analytics', async (c) => {
  const unauthorized = requireAdminSecret(c);
  if (unauthorized) return unauthorized;

  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'Missing projectId' }, 400);

  // Fetch all validations for this project — for moderate-scale projects
  // this is efficient enough. For high-volume, switch to analytics_daily.
  const stats = await db.query.validations.findMany({
    where: (v, { eq: e }) => e(v.projectId, projectId),
    orderBy: (v, { desc: d }) => [d(v.createdAt)],
  });

  const totalValidations = stats.length;

  if (totalValidations === 0) {
    return c.json({
      analytics: {
        totalValidations: 0,
        averageScore: 0,
        averageConfidence: 0,
        aiRequests: 0,
        aiRequestsAvoided: 0,
        cacheHitRate: 0,
        averageLatency: 0,
        localValidatorUsage: 0,
        hostedUsage: 0,
        byokUsage: 0,
        costSavings: 0,
        timeline: [],
        providerBreakdown: { gemini: 0, openai: 0, anthropic: 0, local: 0, cache: 0 },
        issueBreakdown: {},
      },
    });
  }

  // ── Core metrics ──────────────────────────────────────────────────
  const sumScore = stats.reduce((a, v) => a + (v.score ?? 0), 0);
  const averageScore = sumScore / totalValidations;

  const sumConfidence = stats.reduce((a, v) => a + (v.confidence ?? 0), 0);
  const averageConfidence = sumConfidence / totalValidations;

  const sumLatency = stats.reduce((a, v) => a + (v.latencyMs ?? 0), 0);
  const averageLatency = sumLatency / totalValidations;

  // ── Pipeline stage breakdown ──────────────────────────────────────
  const localShortCircuits = stats.filter(s => s.pipelineStage === 'local_validator');
  const cacheHits = stats.filter(s => s.resolvedBy === 'cache');
  const aiCalls = stats.filter(s => s.pipelineStage === 'ai_provider' && s.resolvedBy !== 'cache');

  const aiRequests = aiCalls.length;
  const aiRequestsAvoided = localShortCircuits.length + cacheHits.length;
  const cacheHitRate = (cacheHits.length / totalValidations) * 100;
  const localValidatorUsage = (localShortCircuits.length / totalValidations) * 100;

  // ── Provider breakdown (hosted vs BYOK) ───────────────────────────
  const providerBreakdown: Record<string, number> = { gemini: 0, openai: 0, anthropic: 0, local: 0, cache: 0 };
  for (const s of stats) {
    if (s.resolvedBy === 'cache') {
      providerBreakdown['cache'] = (providerBreakdown['cache'] || 0) + 1;
    } else if (s.pipelineStage === 'local_validator') {
      providerBreakdown['local'] = (providerBreakdown['local'] || 0) + 1;
    } else if (s.provider) {
      providerBreakdown[s.provider] = (providerBreakdown[s.provider] ?? 0) + 1;
    }
  }

  // BYOK = any AI request using a project-level key; Hosted = server default key
  // For now, all AI requests count as hosted unless the project has BYOK keys set
  const project = await db.query.projects.findFirst({
    where: (p, { eq: e }) => e(p.id, projectId),
  });
  const hasByokKeys = !!(project?.geminiApiKey || project?.openaiApiKey || project?.anthropicApiKey);
  const hostedUsage = hasByokKeys ? 0 : aiRequests;
  const byokUsage = hasByokKeys ? aiRequests : 0;

  // ── Issue breakdown ───────────────────────────────────────────────
  const issueBreakdown: Record<string, number> = {};
  for (const s of stats) {
    const issue = s.issue ?? 'UNKNOWN';
    issueBreakdown[issue] = (issueBreakdown[issue] ?? 0) + 1;
  }

  // ── Cost savings estimate ─────────────────────────────────────────
  // Average AI token cost: ~$0.002 per 1K tokens. Average request ~800 tokens.
  const avgTokenCost = 0.0016; // $0.002 * 0.8
  const totalTokens = stats.reduce((a, v) => a + (v.tokenCount ?? 0), 0);
  const actualAiCost = totalTokens > 0 ? (totalTokens / 1000) * 0.002 : aiRequests * avgTokenCost;
  const costSavings = aiRequestsAvoided * avgTokenCost;

  // ── Timeline (last 30 days, bucketed by date) ─────────────────────
  const timelineBuckets = new Map<string, { count: number; sumScore: number; sumLatency: number }>();
  for (const s of stats) {
    const dateKey = new Date(s.createdAt).toISOString().slice(0, 10);
    const bucket = timelineBuckets.get(dateKey) ?? { count: 0, sumScore: 0, sumLatency: 0 };
    bucket.count++;
    bucket.sumScore += s.score ?? 0;
    bucket.sumLatency += s.latencyMs ?? 0;
    timelineBuckets.set(dateKey, bucket);
  }

  const timeline = Array.from(timelineBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, b]) => ({
      date,
      validations: b.count,
      averageScore: Math.round((b.sumScore / b.count) * 10) / 10,
      averageLatency: Math.round(b.sumLatency / b.count),
    }));

  return c.json({
    analytics: {
      totalValidations,
      averageScore: Math.round(averageScore * 10) / 10,
      averageConfidence,
      aiRequests,
      aiRequestsAvoided,
      cacheHitRate: Math.round(cacheHitRate * 10) / 10,
      averageLatency: Math.round(averageLatency),
      localValidatorUsage: Math.round(localValidatorUsage * 10) / 10,
      hostedUsage,
      byokUsage,
      costSavings: Math.round(costSavings * 10000) / 10000,
      actualAiCost: Math.round(actualAiCost * 10000) / 10000,
      timeline,
      providerBreakdown,
      issueBreakdown,
    },
  });
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
    rateLimit: body.rateLimit ?? 300,
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
    return c.json({ error: 'API key not found', code: 'INVALID_API_KEY' }, 404);
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
    return c.json({ error: 'Forbidden: Project ID mismatch', code: 'PROJECT_NOT_FOUND' }, 403);
  }

  const sessionId = c.req.header('x-session-id') || null;
  const promptVersion = body.promptVersion || (project.settings as any)?.defaultPromptVersion || 'quality-v1';
  const providerName = (project as any).defaultProvider || env.AI_PROVIDER || 'gemini';
  const resolvedModel = providerName === 'gemini'
    ? ((project.settings as any)?.geminiModel || env.GEMINI_MODEL || 'gemini-2.5-flash-lite')
    : providerName === 'openai'
    ? ((project.settings as any)?.openaiModel || 'gpt-4o-mini')
    : providerName === 'anthropic'
    ? ((project.settings as any)?.anthropicModel || 'claude-3-5-haiku-latest')
    : 'default';
  const apiKeyEnv = c.get('apiKeyEnvironment');

  // Resolve Provider via Service
  let aiProvider: AIProvider;
  let providerMode: 'hosted' | 'byok';

  try {
    const res = ProviderService.resolveProvider(project, apiKeyEnv);
    aiProvider = res.provider;
    providerMode = res.mode;
  } catch (e: any) {
    if (e.message === 'INVALID_CONFIGURATION') {
      return c.json({ error: 'Failed to access configured BYOK provider. Invalid encryption state.', code: 'INVALID_CONFIGURATION' }, 500);
    } else if (e.message === 'RATE_LIMITED') {
      return c.json({ error: `Insufficient ${apiKeyEnv} credits. Please top up your balance or provide your own API key (BYOK).`, code: 'RATE_LIMITED' }, 402);
    } else {
      return c.json({ error: e.message, code: 'INVALID_CONFIGURATION' }, 501);
    }
  }

  const PIPELINE_VERSION = '1.0.0';

  // 1. Check Redis Cache
  const cacheKey = `validation_cache:${crypto.createHash('sha256').update(
    JSON.stringify({
      question: body.question,
      answer: body.answer,
      provider: providerName,
      promptVersion,
      pipelineVersion: PIPELINE_VERSION,
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
      model: resolvedModel,
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
      source: 'cache',
      resolvedBy: 'cache',
      metadata: {
        cached: true,
        latencyMs: 0,
        provider: providerName,
        pipelineVersion: PIPELINE_VERSION,
        promptVersion,
      }
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
  

  
  const pipeline = new OrchestratorPipeline(
    'api-validation-pipeline',
    validators,
    aiProvider
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
  let result;
  try {
    result = await pipeline.run({
      question: body.question,
      answer: body.answer,
      promptVersion,
      minScore: project.settings?.minScore ?? 50,
      ...(body.fieldContext !== undefined ? { fieldContext: body.fieldContext } : {}),
    });
  } catch (err: any) {
    if (err.message === 'INVALID_MODEL_CONFIGURATION') {
      return c.json({ error: 'INVALID_MODEL_CONFIGURATION', message: 'The configured AI model is unavailable or was not found.' }, 500);
    }
    throw err;
  }
  const latencyMs = Date.now() - startTime;

  const scoreAfter = result.score;
  const improvementDelta = scoreBefore !== null ? scoreAfter - scoreBefore : null;

  // 5. Persist validation to db
  const validationId = crypto.randomUUID();
  const storeInput = project.settings?.storeInputText ?? true;

  let validationInserted = false;
  try {
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
      pipelineStage: result.source === 'local' ? 'local_validator' : 'ai_provider',
      resolvedBy: result.resolvedBy ?? result.provider,
      provider: result.source === 'local' ? null : result.provider as any,
      model: result.source === 'local' ? null : (result.provider === 'gemini' ? resolvedModel : 'default'),
      latencyMs: result.metadata?.latencyMs ?? latencyMs,
      tokenCount: (result.tokenUsage?.inputTokens ?? 0) + (result.tokenUsage?.outputTokens ?? 0),
      confidence: result.confidence,
      promptVersion,
      scoreBefore,
      scoreAfter,
      improvementDelta,
    });
    validationInserted = true;
  } catch (err) {
    console.error('Failed to log validation to database:', err);
  }

  if (validationInserted) {
    // 6. Record validation_completed event referencing the validation ID
    await db.insert(validationEvents).values({
      validationId,
      projectId: project.id,
      type: 'validation_completed',
      sessionId,
      payload: { score: result.score, valid: result.valid },
    }).catch((err) => console.error('Failed to log validation_completed event:', err));
  }

  // 7. Record token usage and cost event
  if (validationInserted && result.provider === 'gemini' && result.tokenUsage) {
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
        model: resolvedModel,
        billedToUser: providerMode === 'hosted',
      },
    }).catch(err => console.error('Failed to log token_analytics event:', err));

    // Deduct cost from project balance
    if (providerMode === 'hosted') {
      const balanceField = apiKeyEnv === 'production' ? 'liveCreditsBalance' : 'testCreditsBalance';
      const currentBalance = parseFloat((project as any)[balanceField] as string || '0');
      const newBalance = Math.max(0, currentBalance - cost).toFixed(4);
      
      await db.update(projects)
        .set({ [balanceField]: newBalance })
        .where(eq(projects.id, project.id))
        .catch(err => console.error('Failed to deduct project credits:', err));
    }
  }

  // 8. Record improvement event if applicable
  if (validationInserted && improvementDelta !== null && improvementDelta > 0) {
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

  return c.json({
    valid: result.valid,
    score: result.score,
    confidence: result.confidence,
    issue: result.issue,
    severity: result.severity,
    feedback: result.feedback,
    feedbackCategory: result.feedbackCategory,
    exampleAnswer: result.exampleAnswer,
    explanation: result.explanation,
    source: result.source,
    resolvedBy: result.resolvedBy,
    metadata: {
      ...result.metadata,
      pipelineVersion: PIPELINE_VERSION,
      promptVersion,
    },
  }, 200);
});

// ─── Telemetry Routes ────────────────────────────────────────────────────────

app.use('/telemetry/batch', apiKeyAuth);

app.openapi(telemetryBatchRoute, async (c) => {
  const project = c.get('project');
  const body = c.req.valid('json');

  if (body.projectId !== project.id) {
    return c.json({ error: 'Forbidden: Project ID mismatch' } as any, 403);
  }

  if (body.events.length === 0) {
    return c.json({ success: true } as any, 202);
  }

  try {
    const insertValues = body.events.map(ev => ({
      projectId: project.id,
      type: ev.type as any,
      validationId: ev.validationId || null,
      sessionId: ev.sessionId || null,
      fieldName: ev.fieldName || null,
      payload: ev.payload || {},
      createdAt: ev.createdAt ? new Date(ev.createdAt) : new Date(),
    }));

    await db.insert(validationEvents).values(insertValues);

    return c.json({ success: true } as any, 202);
  } catch (err: any) {
    console.error('Telemetry batch insert failed:', err);
    return c.json({ error: 'Failed to insert telemetry' } as any, 400);
  }
});

// ─── Assistant Routes ────────────────────────────────────────────────────────

// Apply auth to assistant chat endpoint
app.use('/assistant/chat', apiKeyAuth, rateLimit);

app.openapi(listKnowledgeSourcesRoute, async (c) => {
  const projectId = c.req.param('projectId');
  try {
    const rows = await db.select().from(knowledgeSources).where(eq(knowledgeSources.projectId, projectId));
    return c.json({
      sources: rows.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    }, 200);
  } catch (err) {
    console.error('List knowledge sources failed:', err);
    return c.json({ sources: [] }, 200);
  }
});

app.openapi(createKnowledgeSourceRoute, async (c) => {
  const projectId = c.req.param('projectId');
  const body = c.req.valid('json');
  try {
    const [record] = await db.insert(knowledgeSources).values({
      projectId,
      name: body.name,
      type: body.type,
      content: body.content,
      sourceUrl: body.sourceUrl ?? null,
      isActive: body.isActive ?? true,
    }).returning();
    if (!record) throw new Error('Failed to create record');
    return c.json({
      source: {
        id: record.id,
        projectId: record.projectId,
        name: record.name,
        type: record.type,
        content: record.content,
        sourceUrl: record.sourceUrl,
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    }, 201) as any;
  } catch (err: any) {
    console.error('Create knowledge source failed:', err);
    return c.json({ error: err.message || 'Failed to create knowledge source' }, 400) as any;
  }
});

app.openapi(updateKnowledgeSourceRoute, async (c) => {
  const projectId = c.req.param('projectId');
  const id = c.req.param('id');
  const body = c.req.valid('json');
  try {
    const [record] = await db.update(knowledgeSources).set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.sourceUrl !== undefined ? { sourceUrl: body.sourceUrl } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      updatedAt: new Date(),
    }).where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.projectId, projectId))).returning();

    if (!record) return c.json({ error: 'Not found' }, 404) as any;
    return c.json({
      source: {
        id: record.id,
        projectId: record.projectId,
        name: record.name,
        type: record.type,
        content: record.content,
        sourceUrl: record.sourceUrl,
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    }, 200) as any;
  } catch (err: any) {
    console.error('Update knowledge source failed:', err);
    return c.json({ error: err.message || 'Failed to update' }, 400) as any;
  }
});

app.openapi(deleteKnowledgeSourceRoute, async (c) => {
  const projectId = c.req.param('projectId');
  const id = c.req.param('id');
  try {
    const [record] = await db.delete(knowledgeSources).where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.projectId, projectId))).returning();
    if (!record) {
      return c.json({ error: 'Knowledge source not found' }, 404) as any;
    }
    return c.json({ success: true }, 200) as any;
  } catch (err: any) {
    console.error('Delete knowledge source failed:', err);
    return c.json({ error: err.message || 'Failed to delete' }, 400) as any;
  }
});

app.openapi(assistantChatRoute, async (c) => {
  const project = c.get('project');
  const body = c.req.valid('json');

  // Verify request projectId matches the authenticated API key project
  if (body.projectId !== project.id) {
    return c.json({ error: 'Forbidden: Project ID mismatch' }, 403) as any;
  }

  // 1. Resolve or Create Conversation
  let conversationId = body.conversationId;
  if (!conversationId) {
    conversationId = crypto.randomUUID();
    try {
      await db.insert(assistantConversations).values({
        id: conversationId,
        projectId: project.id,
        sessionId: body.sessionId || null,
      });
    } catch (dbError) {
      console.warn('Failed to insert assistant conversation:', dbError);
    }
  }

  // 2. Fetch Knowledge Sources from Database
  let projectKnowledge = '';
  try {
    const sources = await db.query.knowledgeSources.findMany({
      where: (table, { eq, and }) => and(
        eq(table.projectId, project.id),
        eq(table.isActive, true)
      ),
    });
    projectKnowledge = sources.map(s => `[Source: ${s.name}]\n${s.content}`).join('\n\n');
  } catch (dbError) {
    console.warn('Failed to query knowledge sources:', dbError);
  }

  // Combine developer inline knowledge and field context
  const inlineKnowledge = body.knowledge || '';
  const combinedKnowledge = `${projectKnowledge}\n\n${inlineKnowledge}`.trim();

  const fieldId = body.fieldContext?.fieldId || 'N/A';
  const fieldQuestion = body.fieldContext?.question || 'N/A';
  const fieldHelp = body.fieldContext?.helpContext || 'N/A';

  // 3. Retrieve conversation history
  let historyPrompt = '';
  if (body.conversationId) {
    try {
      const messages = await db.query.assistantMessages.findMany({
        where: (table, { eq }) => eq(table.conversationId, body.conversationId!),
        orderBy: (table, { asc }) => [asc(table.createdAt)],
        limit: 10,
      });
      historyPrompt = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    } catch (dbError) {
      console.warn('Failed to retrieve conversation history:', dbError);
    }
  }

  // 4. Build prompt
  const systemPrompt = `You are Normy Assist, an intelligent form assistant.
Your goal is to help the user fill out the form by explaining questions, terminology, requirements, company policies, documentation, and procedures.

Rules:
1. Explain the questions and requirements to the user clearly.
2. NEVER write the answer for the user or generate fake personal information.
3. If the user asks you to write the answer, reply: "I can explain what the question is asking and show the expected format, but your response should reflect your own situation."
4. You should answer general language/vocabulary questions, industry terms, and concepts related to the form, fields, or company activity (e.g. explaining what "public works" means on a government form, or defining business/legal concepts) to help the user understand the context. Only reject completely unrelated off-topic questions (e.g., "What is the capital of France?").
5. Never mention that you are an AI or say "As an AI...". Keep answers friendly, short, and helpful.
6. STRICT SAFETY AND ETHICS: NEVER answer harmful, unethical, unsafe, malicious, or inappropriate questions. If the user asks anything unsafe, unethical, illegal, or inappropriate, refuse politely: "I cannot assist with that request. I am only able to help explain this form and its related terminology or policies."
7. STRICT CONTEXT BINDING: You must stay on-topic. If the user asks questions unrelated to the form, company services, fields, vocabulary/terminology, policies, or general vocabulary context of the form, politely refuse: "I'm here to help explain this form and its related documentation or vocabulary. Please ask a question related to the form fields or company policies."

Here is the developer-provided knowledge and documentation:
${combinedKnowledge || 'No additional documentation provided.'}

Here is the current field context the user is focused on:
Field ID: ${fieldId}
Question: ${fieldQuestion}
Description/Help Context: ${fieldHelp}

Conversation History:
${historyPrompt}

Current User Message: ${body.message}
Assistant:`;

  // 5. Invoke Gemini (or fallback offline)
  let assistantResponse = '';
  const apiKey = env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: systemPrompt,
      });
      assistantResponse = response.text || '';
    } catch (aiError) {
      console.warn('Gemini API call failed, applying offline fallback:', aiError);
    }
  }

  // Offline or error fallback response engine
  if (!assistantResponse) {
    const msg = body.message.toLowerCase();
    if (msg.includes('write') || msg.includes('answer') || msg.includes('fill') || msg.includes('generate')) {
      assistantResponse = "I can explain what the question is asking and show the expected format, but your response should reflect your own situation.";
    } else if (fieldQuestion !== 'N/A' && (msg.includes('mean') || msg.includes('explain') || msg.includes('what'))) {
      assistantResponse = `This question ("${fieldQuestion}") is asking you to provide input. Let me know if you need specific help with terms or policies!`;
    } else if (fieldHelp !== 'N/A' && (msg.includes('help') || msg.includes('find'))) {
      assistantResponse = `Based on the form help: ${fieldHelp}`;
    } else {
      assistantResponse = "I'm here to help explain this form and its related documentation. Let me know if you have questions about specific fields or policies.";
    }
  }

  // Clean response text
  assistantResponse = assistantResponse.trim();

  // 6. Insert user and assistant messages to DB
  const userMessageId = crypto.randomUUID();
  const assistantMessageId = crypto.randomUUID();
  const now = new Date();

  try {
    // Log user message
    await db.insert(assistantMessages).values({
      id: userMessageId,
      conversationId,
      role: 'user',
      content: body.message,
      metadata: body.fieldContext || null,
      createdAt: now,
    });

    // Log assistant message
    await db.insert(assistantMessages).values({
      id: assistantMessageId,
      conversationId,
      role: 'assistant',
      content: assistantResponse,
      metadata: null,
      createdAt: new Date(now.getTime() + 100),
    });
  } catch (dbError) {
    console.warn('Failed to persist assistant messages:', dbError);
  }

  // 7. Respond
  return c.json({
    conversationId,
    messageId: assistantMessageId,
    response: assistantResponse,
    createdAt: new Date().toISOString(),
  }, 200) as any;
});

app.openapi(getConversationMessagesRoute, async (c) => {
  const conversationId = c.req.param('conversationId');
  try {
    const rows = await db.select().from(assistantMessages).where(eq(assistantMessages.conversationId, conversationId)).orderBy(desc(assistantMessages.createdAt));
    return c.json({
      messages: rows.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    }, 200);
  } catch (err) {
    console.error('Get conversation messages failed:', err);
    return c.json({ messages: [] }, 200);
  }
});

app.openapi(rateAssistantMessageRoute, async (c) => {
  const messageId = c.req.param('messageId');
  const body = c.req.valid('json');
  try {
    await db.update(assistantMessages).set({
      metadata: sql`jsonb_set(coalesce(metadata, '{}'::jsonb), '{feedbackRating}', ${JSON.stringify(body.rating)}::jsonb)`,
    }).where(eq(assistantMessages.id, messageId));
    return c.json({ success: true }, 200);
  } catch (err: any) {
    console.error('Rate message failed:', err);
    return c.json({ error: err.message || 'Failed to rate message' }, 400) as any;
  }
});

app.openapi(listAssistantConversationsRoute, async (c) => {
  const projectId = c.req.param('projectId');
  try {
    const rows = await db.select().from(assistantConversations).where(eq(assistantConversations.projectId, projectId)).orderBy(desc(assistantConversations.createdAt));
    return c.json({
      conversations: rows.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    }, 200);
  } catch (err) {
    console.error('List assistant conversations failed:', err);
    return c.json({ conversations: [] }, 200);
  }
});

// ─── Provider Management Routes ───────────────────────────────────────────────

app.route('/providers', providerRoutes);

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
