import './setup-env.js';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../index.js';
import { db, client } from '../db/index.js';
import { redis } from '../redis/index.js';
import { users } from '../db/schema/users.js';
import { projects } from '../db/schema/projects.js';
import { apiKeys } from '../db/schema/api-keys.js';
import { validations } from '../db/schema/validations.js';
import { validationEvents } from '../db/schema/validation-events.js';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

describe('Normy API Integration Tests', () => {
  let userId: string;
  let projectId: string;
  let testApiKeyRaw: string;

  let lowLimitApiKeyRaw: string;

  beforeAll(async () => {
    // 1. Clean database test data if leftover (in transactional testing we might run migrates/pushes, let's do soft deletes or clear tables)
    await db.delete(validationEvents);
    await db.delete(validations);
    await db.delete(apiKeys);
    await db.delete(projects);
    await db.delete(users);

    // 2. Clear Redis cache
    await redis.flushdb();

    // 3. Create test user
    const [insertedUser] = await db.insert(users).values({
      email: 'test@example.com',
      name: 'Test Admin',
      passwordHash: 'bcrypt-hashed-password',
      emailVerified: true,
    }).returning();
    userId = insertedUser!.id;

    // 4. Create test project
    const [insertedProject] = await db.insert(projects).values({
      name: 'Test Project',
      slug: 'test-project',
      userId: userId,
      defaultProvider: 'gemini',
      monthlyValidationLimit: 1000,
    }).returning();
    projectId = insertedProject!.id;

    // 5. Create active API key (rateLimit = 100)
    testApiKeyRaw = `nrm_live_${crypto.randomBytes(16).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(testApiKeyRaw).digest('hex');
    await db.insert(apiKeys).values({
      projectId: projectId,
      name: 'Production Key',
      keyHash: hash,
      keyPrefix: testApiKeyRaw.substring(0, 16),
      environment: 'production',
      rateLimit: 100,
    });

    // 6. Create API key with ultra low rate limit (rateLimit = 2) to test rate limiting
    lowLimitApiKeyRaw = `nrm_live_${crypto.randomBytes(16).toString('hex')}`;
    const lowHash = crypto.createHash('sha256').update(lowLimitApiKeyRaw).digest('hex');
    await db.insert(apiKeys).values({
      projectId: projectId,
      name: 'Low Limit Key',
      keyHash: lowHash,
      keyPrefix: lowLimitApiKeyRaw.substring(0, 16),
      environment: 'development',
      rateLimit: 2,
    });
  });

  afterAll(async () => {
    // Cleanup and close database query pool & redis connections
    await db.delete(validationEvents);
    await db.delete(validations);
    await db.delete(apiKeys);
    await db.delete(projects);
    await db.delete(users);
    
    await redis.quit();
    await client.end();
  });

  describe('GET /health & GET /version', () => {
    it('should return health status', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const json = await res.json() as { status: string };
      expect(json).toEqual({ status: 'healthy' });
    });

    it('should return version status', async () => {
      const res = await app.request('/version');
      expect(res.status).toBe(200);
      const json = await res.json() as { version: string };
      expect(json).toEqual({ version: '0.1.0' });
    });
  });

  describe('POST /validate - Authorization & Input Checks', () => {
    it('should block requests without authorization header', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          question: 'Reason for canceling?',
          answer: 'Too expensive.',
        }),
      });
      expect(res.status).toBe(401);
      const json = await res.json() as { error: string };
      expect(json.error).toContain('Missing or invalid Authorization header');
    });

    it('should block requests with invalid API keys', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer nrm_live_invalidkeymaterial12345',
        },
        body: JSON.stringify({
          projectId,
          question: 'Reason for canceling?',
          answer: 'Too expensive.',
        }),
      });
      expect(res.status).toBe(401);
      const json = await res.json() as { error: string };
      expect(json.error).toContain('Invalid API key');
    });

    it('should block requests with a mismatching project ID', async () => {
      const wrongProjectId = crypto.randomUUID();
      const res = await app.request('/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKeyRaw}`,
        },
        body: JSON.stringify({
          projectId: wrongProjectId,
          question: 'Reason for canceling?',
          answer: 'Too expensive.',
        }),
      });
      expect(res.status).toBe(403);
      const json = await res.json() as { error: string };
      expect(json.error).toContain('Project ID mismatch');
    });

    it('should block malformed request payloads (Zod validation)', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKeyRaw}`,
        },
        body: JSON.stringify({
          projectId,
          // question is missing, answer is missing
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /validate - Integration Flow and Database Logging', () => {
    it('should validate successfully and persist validation event details to the database', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKeyRaw}`,
          'x-session-id': 'session_abc_123',
        },
        body: JSON.stringify({
          projectId,
          question: 'What features are you missing?',
          answer: 'idk', // triggers short-circuit TooShortValidator
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json() as { valid: boolean; issue: string; score: number; severity: string; feedbackCategory: string };
      expect(json.valid).toBe(false);
      expect(json.issue).toBe('TOO_SHORT');
      expect(json.score).toBe(30);
      expect(json.severity).toBe('error');
      expect(json.feedbackCategory).toBe('input_quality');

      // Verify validation was logged to the database
      const dbValidations = await db
        .select()
        .from(validations)
        .where(eq(validations.projectId, projectId));
      
      expect(dbValidations.length).toBe(1);
      const log = dbValidations[0]!;
      expect(log.answer).toBe('idk');
      expect(log.score).toBe(30);
      expect(log.issue).toBe('TOO_SHORT');
      expect(log.pipelineStage).toBe('local_validator');

      // Verify audit events were created
      const dbEvents = await db
        .select()
        .from(validationEvents)
        .where(eq(validationEvents.projectId, projectId));
      
      // Should have 1 validation_triggered and 1 validation_completed
      expect(dbEvents.length).toBe(2);
      const triggered = dbEvents.find(e => e.type === 'validation_triggered');
      const completed = dbEvents.find(e => e.type === 'validation_completed');
      expect(triggered).toBeDefined();
      expect(triggered?.sessionId).toBe('session_abc_123');
      expect(completed).toBeDefined();
      expect(completed?.validationId).toBe(log.id);
    });
  });

  describe('POST /validate - Rate Limiting', () => {
    it('should enforce Redis rate limits and return 429', async () => {
      // Clean previous logs so we are starting clean
      await db.delete(validationEvents);
      await db.delete(validations);

      const makeRequest = () => app.request('/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lowLimitApiKeyRaw}`,
        },
        body: JSON.stringify({
          projectId,
          question: 'What features are you missing?',
          answer: 'idk',
        }),
      });

      // Request 1: Allowed
      const res1 = await makeRequest();
      expect(res1.status).toBe(200);

      // Request 2: Allowed
      const res2 = await makeRequest();
      expect(res2.status).toBe(200);

      // Request 3: Exceeded (Rate limit is 2)
      const res3 = await makeRequest();
      expect(res3.status).toBe(429);
      const json = await res3.json() as { error: string };
      expect(json.error).toContain('Rate limit exceeded');
    });
  });
});
