import { OpenAPIHono, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { apiKeyAuth, type AuthContext } from './middleware/auth.js';
import { rateLimit } from './middleware/rate-limit.js';
import { validateRoute } from './routes/validate.js';
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
  GeminiProvider,
  OrchestratorPipeline,
} from '@normy/validation-core';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { redis } from './redis/index.js';
import { GoogleGenAI } from '@google/genai';

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
  const providerName = (project as any).defaultProvider || env.AI_PROVIDER || 'gemini';
  const apiKeyEnv = c.get('apiKeyEnvironment');

  // BYOK & Billing Check
  const isBYOK = providerName === 'gemini' ? !!(project as any).geminiApiKey :
                 providerName === 'openai' ? !!(project as any).openaiApiKey :
                 providerName === 'anthropic' ? !!(project as any).anthropicApiKey : false;

  const activeProviderKey = isBYOK ? 
    (providerName === 'gemini' ? (project as any).geminiApiKey :
     providerName === 'openai' ? (project as any).openaiApiKey :
     providerName === 'anthropic' ? (project as any).anthropicApiKey : null) :
    (providerName === 'gemini' ? env.GEMINI_API_KEY : '');

  if (!isBYOK) {
    // Hosted by Normy, check credits
    const balanceStr = apiKeyEnv === 'production' ? (project as any).liveCreditsBalance : (project as any).testCreditsBalance;
    const balance = parseFloat(balanceStr as string || '0');
    if (isNaN(balance) || balance <= 0) {
      return c.json({ error: `Insufficient ${apiKeyEnv} credits. Please top up your balance or provide your own API key (BYOK).` }, 402);
    }
  }

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
    apiKey: activeProviderKey || '',
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
        billedToUser: !isBYOK,
      },
    }).catch(err => console.error('Failed to log token_analytics event:', err));

    // Deduct cost from project balance
    if (!isBYOK) {
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
    return c.json({
      source: {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    }, 201);
  } catch (err: any) {
    console.error('Create knowledge source failed:', err);
    return c.json({ error: err.message || 'Failed to create knowledge source' }, 400);
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

    if (!record) {
      return c.json({ error: 'Knowledge source not found' }, 404);
    }
    return c.json({
      source: {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    }, 200);
  } catch (err: any) {
    console.error('Update knowledge source failed:', err);
    return c.json({ error: err.message || 'Failed to update knowledge source' }, 400);
  }
});

app.openapi(deleteKnowledgeSourceRoute, async (c) => {
  const projectId = c.req.param('projectId');
  const id = c.req.param('id');
  try {
    const [record] = await db.delete(knowledgeSources).where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.projectId, projectId))).returning();
    if (!record) {
      return c.json({ error: 'Knowledge source not found' }, 404);
    }
    return c.json({ success: true }, 200);
  } catch (err: any) {
    console.error('Delete knowledge source failed:', err);
    return c.json({ error: err.message || 'Failed to delete knowledge source' }, 400);
  }
});

app.openapi(assistantChatRoute, async (c) => {
  const project = c.get('project');
  const body = c.req.valid('json');

  // Verify request projectId matches the authenticated API key project
  if (body.projectId !== project.id) {
    return c.json({ error: 'Forbidden: Project ID mismatch' }, 403);
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
  }, 200);
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
    return c.json({ error: err.message || 'Failed to rate message' }, 400);
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
