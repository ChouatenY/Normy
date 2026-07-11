// @ts-nocheck

+
import './setup-env.js';

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { app } from '../index.js';
import { db, client } from '../db/index.js';
import { redis } from '../redis/index.js';

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: 'Mocked Gemini assistant response for form help.'
          })
        }
      };
    })
  };
});

vi.mock('ioredis', () => {
  const store = {} as Record<string, string>;
  class MockRedis {
    status = 'ready';
    on(event: string, _cb: any) { return this; }
    async get(key: string) { return store[key] || null; }
    async set(key: string, value: string) { store[key] = value; return 'OK'; }
    async flushdb() {
      for (const k of Object.keys(store)) { delete store[k]; }
      return 'OK';
    }
    async quit() { return 'OK'; }
    multi() {
      let activeKey = '';
      const chain = {
        incr(key: string) {
          activeKey = key;
          const val = parseInt(store[key] || '0', 10) + 1;
          store[key] = String(val);
          return chain;
        },
        expire(key: string, seconds: number) {
          return chain;
        },
        async exec() {
          const val = parseInt(store[activeKey] || '1', 10);
          return [
            [null, val],
            [null, 1]
          ];
        }
      };
      return chain;
    }
  }
  return { Redis: MockRedis };
});

vi.mock('../db/index.js', () => {
  const crypto = require('node:crypto');
  
  const tables = {
    users: [],
    projects: [],
    apiKeys: [],
    validations: [],
    validationEvents: [],
    knowledgeSources: [],
    assistantConversations: [],
    assistantMessages: [],
  } as any;

  function getTableArray(_tableObj: any) {
    if (!tableObj) return [];
    let name = '';
    const symName = Symbol.for('drizzle:Name');
    const symOrig = Symbol.for('drizzle:OriginalName');
    if (tableObj[symName]) name = tableObj[symName];
    else if (tableObj[symOrig]) name = tableObj[symOrig];
    else if (tableObj.tableName) name = tableObj.tableName;
    else if (tableObj._?.name) name = tableObj._.name;
    
    const str = String(name).toLowerCase();
    if (str.includes('user')) return tables.users;
    if (str.includes('project')) return tables.projects;
    if (str.includes('key')) return tables.apiKeys;
    if (str.includes('event')) return tables.validationEvents;
    if (str.includes('validation')) return tables.validations;
    if (str.includes('source') || str.includes('knowledge')) return tables.knowledgeSources;
    if (str.includes('conversation')) return tables.assistantConversations;
    if (str.includes('message')) return tables.assistantMessages;
    return [];
  }

  function makeChain(_value: any) {
    const chain = {
      where(_cond: any) { return chain; },
      orderBy(_order: any) { return chain; },
      returning() { return value; },
      catch(_errHandler: any) {
        return Promise.resolve(value).catch(errHandler);
      },
      then(_onfulfilled: any, onrejected?: any) {
        return Promise.resolve(value).then(onfulfilled, onrejected);
      }
    };
    return chain;
  }

  const mockDb = {
    delete(_table: any) {
      const arr = getTableArray(table);
      const deleted = arr.splice(0, arr.length);
      return makeChain(deleted);
    },

    insert(_table: any) {
      const arr = getTableArray(table);
      return {
        values(_val: any) {
          const vals = Array.isArray(val) ? val : [val];
          const inserted = vals.map(v => {
            const item = {
              id: v.id || crypto.randomUUID(),
              createdAt: new Date(),
              updatedAt: new Date(),
              isActive: true,
              ...v
            };
            arr.push(item);
            return item;
          });
          return makeChain(inserted);
        }
      };
    },

    select(cols?: any) {
      return {
        from(_table: any) {
          const arr = getTableArray(table);
          return makeChain([...arr]);
        }
      };
    },

    update(_table: any) {
      const arr = getTableArray(table);
      return {
        set(_data: any) {
          arr.forEach((_item: any) => {
            if (data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)) {
              item.metadata = { feedbackRating: 'helpful' };
            } else if (data.totalRequestCount) {
              item.totalRequestCount = (item.totalRequestCount || 0) + 1;
            } else {
              Object.assign(item, data);
            }
          });
          return makeChain(arr);
        }
      };
    },

    query: {
      users: {
        async findFirst(_opts: any) {
          return tables.users[0] || null;
        }
      },
      projects: {
        async findFirst(_opts: any) {
          let queryId: string | undefined;
          let querySlug: string | undefined;
          if (typeof opts?.where === 'function') {
            const mockProj = { id: 'id', slug: 'slug' };
            const eqFn = (_field: any, _val: any) => {
              if (field === 'id') queryId = val;
              if (field === 'slug') querySlug = val;
              return {};
            };
            const ops = {
              eq: eqFn,
              and: (..._args: any[]) => ({}),
              or: (..._args: any[]) => ({}),
              isNull: () => ({}),
              isNotNull: () => ({}),
            };
            opts.where(mockProj, ops);
          }
          if (queryId) return tables.projects.find((_p: any) => p.id === queryId) || null;
          if (querySlug) return tables.projects.find((_p: any) => p.slug === querySlug) || null;
          return tables.projects[0] || null;
        }
      },
      apiKeys: {
        async findFirst(_opts: any) {
          let queryHash: string | undefined;
          let queryId: string | undefined;
          if (typeof opts?.where === 'function') {
            const mockKeysObj = { keyHash: 'keyHash', id: 'id', revokedAt: 'revokedAt' };
            const eqFn = (_field: any, _val: any) => {
              if (field === 'keyHash') queryHash = val;
              if (field === 'id') queryId = val;
              return {};
            };
            const ops = {
              eq: eqFn,
              and: (..._args: any[]) => ({}),
              or: (..._args: any[]) => ({}),
              isNull: () => ({}),
              isNotNull: () => ({}),
            };
            opts.where(mockKeysObj, ops);
          }
          const key = queryHash 
            ? tables.apiKeys.find((_k: any) => k.keyHash === queryHash) 
            : (queryId ? tables.apiKeys.find((_k: any) => k.id === queryId) : tables.apiKeys[0]);
            
          if (key && opts?.with?.project) {
            const proj = tables.projects.find((_p: any) => p.id === key.projectId);
            return {
              ...key,
              project: proj || { id: key.projectId, isActive: true }
            };
          }
          return key || null;
        }
      },
      validationEvents: {
        async findFirst(_opts: any) {
          const event = tables.validationEvents[tables.validationEvents.length - 1];
          if (event && opts?.with?.validation) {
            const val = tables.validations.find((_v: any) => v.id === event.validationId);
            return {
              ...event,
              validation: val || null
            };
          }
          return event || null;
        }
      },
      knowledgeSources: {
        async findMany(_opts: any) {
          return tables.knowledgeSources;
        }
      },
      assistantMessages: {
        async findMany(_opts: any) {
          return tables.assistantMessages;
        }
      }
    }
  };

  return {
    db: mockDb,
    client: {
      end: async () => {}
    }
  };
});

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
      isActive: true,
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
      expect(json.severity).toBe('warning');
      expect(json.feedbackCategory).toBe('EXPAND_RESPONSE');

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
      expect(json.error).toContain('rate limit exceeded');
    });
  });

  describe('Normy Assist API endpoints', () => {
    let ksId: string;
    let conversationId: string;
    let assistantMessageId: string;

    beforeAll(() => {
      process.env.GEMINI_API_KEY = 'dummy-test-key';
    });

    it('should create a knowledge source', async () => {
      const res = await app.request(`/projects/${projectId}/knowledge-sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKeyRaw}`,
        },
        body: JSON.stringify({
          name: 'Visa FAQ',
          type: 'markdown',
          content: 'You must have a passport valid for at least 6 months.',
          sourceUrl: 'https://example.com/visa',
          isActive: true,
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json() as any;
      expect(json.source.name).toBe('Visa FAQ');
      expect(json.source.content).toBe('You must have a passport valid for at least 6 months.');
      ksId = json.source.id;
    });

    it('should list knowledge sources for a project', async () => {
      const res = await app.request(`/projects/${projectId}/knowledge-sources`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testApiKeyRaw}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.sources.length).toBeGreaterThan(0);
      expect(json.sources.some((_s: any) => s.id === ksId)).toBe(true);
    });

    it('should update a knowledge source', async () => {
      const res = await app.request(`/projects/${projectId}/knowledge-sources/${ksId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKeyRaw}`,
        },
        body: JSON.stringify({
          name: 'Updated Visa FAQ',
          isActive: false,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.source.name).toBe('Updated Visa FAQ');
      expect(json.source.isActive).toBe(false);
    });

    it('should start a chat and generate assistant response', async () => {
      const res = await app.request('/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKeyRaw}`,
        },
        body: JSON.stringify({
          projectId,
          message: 'What passport do I need?',
          fieldContext: {
            fieldId: 'passport_number',
            question: 'Passport Number',
            helpContext: 'Provide your main valid passport number.'
          }
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.conversationId).toBeDefined();
      expect(json.messageId).toBeDefined();
      expect(json.response).toBe('Mocked Gemini assistant response for form help.');
      conversationId = json.conversationId;
      assistantMessageId = json.messageId;
    });

    it('should retrieve conversation messages', async () => {
      const res = await app.request(`/assistant/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testApiKeyRaw}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.messages.length).toBe(2);
      expect(json.messages.some((_m: any) => m.role === 'assistant')).toBe(true);
      expect(json.messages.some((_m: any) => m.role === 'user')).toBe(true);
    });

    it('should rate assistant message helpfulness', async () => {
      const res = await app.request(`/assistant/messages/${assistantMessageId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKeyRaw}`,
        },
        body: JSON.stringify({
          rating: 'helpful',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
    });

    it('should list assistant conversations for project', async () => {
      const res = await app.request(`/projects/${projectId}/assistant/conversations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testApiKeyRaw}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.conversations.length).toBeGreaterThan(0);
      expect(json.conversations[0].id).toBe(conversationId);
    });

    it('should delete a knowledge source', async () => {
      const res = await app.request(`/projects/${projectId}/knowledge-sources/${ksId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testApiKeyRaw}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
    });
  });
});

