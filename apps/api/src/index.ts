import { OpenAPIHono, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { apiKeyAuth, type AuthContext } from './middleware/auth.js';
import { rateLimit } from './middleware/rate-limit.js';
import { validateRoute } from './routes/validate.js';
import { db } from './db/index.js';
import { validations } from './db/schema/validations.js';
import { validationEvents } from './db/schema/validation-events.js';
import { 
  EmptyValidator, 
  TooShortValidator, 
  RandomTextValidator, 
  SpamValidator, 
  MockAIProvider, 
  OrchestratorPipeline 
} from '@normy/validation-core';
import crypto from 'node:crypto';

// Setup Hono app with custom context types
const app = new OpenAPIHono<AuthContext>();

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

  // 1. Record validation_triggered event
  await db.insert(validationEvents).values({
    projectId: project.id,
    type: 'validation_triggered',
    sessionId,
    payload: { mode: 'onSubmit' },
  }).catch((err) => console.error('Failed to log validation_triggered event:', err));

  // 2. Initialize orchestrator pipeline
  const validators = [
    new EmptyValidator(),
    new TooShortValidator(),
    new RandomTextValidator(),
    new SpamValidator(),
  ];
  
  // Use project settings default provider
  const providerName = project.defaultProvider || 'openai';
  const mockProvider = new MockAIProvider(providerName);
  
  const pipeline = new OrchestratorPipeline(
    'api-validation-pipeline',
    validators,
    mockProvider
  );

  const startTime = Date.now();
  const result = await pipeline.run({
    question: body.question,
    answer: body.answer,
    minScore: project.settings?.minScore ?? 50,
  });
  const latencyMs = Date.now() - startTime;

  // 3. Persist validation to db
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
    model: result.provider === 'local' ? null : 'mock-model',
    latencyMs,
    tokenCount: 0,
    confidence: result.confidence,
  });

  // 4. Record validation_completed event referencing the validation ID
  await db.insert(validationEvents).values({
    validationId,
    projectId: project.id,
    type: 'validation_completed',
    sessionId,
    payload: { score: result.score, valid: result.valid },
  }).catch((err) => console.error('Failed to log validation_completed event:', err));

  // 5. Respond
  return c.json({
    valid: result.valid,
    score: result.score,
    confidence: result.confidence,
    issue: result.issue,
    severity: result.severity,
    feedback: result.feedback,
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
