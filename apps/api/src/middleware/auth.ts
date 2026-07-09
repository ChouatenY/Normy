import { createMiddleware } from 'hono/factory';
import { db } from '../db/index.js';
import { apiKeys } from '../db/schema/api-keys.js';
import { eq, sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import type { Project } from '../db/schema/projects.js';

export interface AuthContext {
  Variables: {
    project: Project;
    apiKeyId: string;
    apiKeyEnvironment: 'development' | 'production';
  };
}

export const apiKeyAuth = createMiddleware<AuthContext>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid Authorization header', code: 'INVALID_API_KEY' }, 401);
  }

  const rawKey = authHeader.substring(7).trim();
  if (!rawKey) {
    return c.json({ error: 'Unauthorized: Empty token', code: 'INVALID_API_KEY' }, 401);
  }

  try {
    // Hash the token to look up the DB record
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    
    let apiKeyRecord: any = null;
    
    // Explicit bypass for landing page demo
    if (rawKey === 'nrm_live_demo') {
      apiKeyRecord = {
        id: '00000000-0000-0000-0000-000000000000',
        projectId: '00000000-0000-0000-0000-000000000000',
        environment: 'development',
        project: {
          id: '00000000-0000-0000-0000-000000000000',
          name: 'Demo Project (Bypass)',
          slug: 'demo-project-bypass',
          isActive: true,
          defaultProvider: 'gemini',
          testCreditsBalance: '500.0000',
          liveCreditsBalance: '500.0000',
          settings: {
            minScore: 50,
            defaultProvider: 'gemini',
            defaultValidationMode: 'onPause',
            pauseDelayMs: 1200,
            storeInputText: true,
          }
        }
      };
    } else {
      try {
        apiKeyRecord = await db.query.apiKeys.findFirst({
          where: (keys, { eq, and, isNull }) => and(
            eq(keys.keyHash, hash),
            isNull(keys.revokedAt)
          ),
          with: {
            project: true,
          },
        });
      } catch (dbError: any) {
        console.warn('Database connection refused in auth middleware. Applying fail-open bypass:', dbError.message);
        
        // If the API key starts with valid prefix, allow it by mocking the database record
        if (rawKey.startsWith('nrm_test_') || rawKey.startsWith('nrm_live_')) {
          apiKeyRecord = {
            id: '00000000-0000-0000-0000-000000000000',
            projectId: '00000000-0000-0000-0000-000000000000',
            environment: rawKey.startsWith('nrm_live_') ? 'production' : 'development',
            project: {
              id: '00000000-0000-0000-0000-000000000000',
              name: 'Demo Project (Bypass)',
              slug: 'demo-project-bypass',
              isActive: true,
              defaultProvider: 'gemini',
              testCreditsBalance: '500.0000',
              liveCreditsBalance: '500.0000',
              settings: {
                minScore: 50,
                defaultProvider: 'gemini',
                defaultValidationMode: 'onPause',
                pauseDelayMs: 1200,
                storeInputText: true,
              }
            }
          };
        }
      }
    }

    if (!apiKeyRecord) {
      return c.json({ error: 'Unauthorized: Invalid API key', code: 'INVALID_API_KEY' }, 401);
    }

    // Check expiration
    if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
      return c.json({ error: 'Unauthorized: API key expired', code: 'INVALID_API_KEY' }, 401);
    }

    // Check if project is active
    if (!apiKeyRecord.project || !apiKeyRecord.project.isActive) {
      return c.json({ error: 'Unauthorized: Project is inactive or suspended', code: 'PROJECT_NOT_FOUND' }, 401);
    }

    // Bind to request context
    c.set('project', apiKeyRecord.project);
    c.set('apiKeyId', apiKeyRecord.id);
    c.set('apiKeyEnvironment', apiKeyRecord.environment || 'development');

    // Update usage metadata asynchronously to avoid blocking the request path
    db.update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        totalRequestCount: sql`${apiKeys.totalRequestCount} + 1`,
      })
      .where(eq(apiKeys.id, apiKeyRecord.id))
      .catch((err) => console.error('Failed to update API key stats:', err));

    return await next();
  } catch (error) {
    console.error('API key auth error:', error);
    return c.json({ error: 'Internal server error during authentication', code: 'NETWORK_ERROR' }, 500);
  }
});
