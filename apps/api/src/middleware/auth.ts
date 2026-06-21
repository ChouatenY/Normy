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
  };
}

export const apiKeyAuth = createMiddleware<AuthContext>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid Authorization header' }, 401);
  }

  const rawKey = authHeader.substring(7).trim();
  if (!rawKey) {
    return c.json({ error: 'Unauthorized: Empty token' }, 401);
  }

  try {
    // Hash the token to look up the DB record
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    
    const apiKeyRecord = await db.query.apiKeys.findFirst({
      where: (keys, { eq, and, isNull }) => and(
        eq(keys.keyHash, hash),
        isNull(keys.revokedAt)
      ),
      with: {
        project: true,
      },
    });

    if (!apiKeyRecord) {
      return c.json({ error: 'Unauthorized: Invalid API key' }, 401);
    }

    // Check expiration
    if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
      return c.json({ error: 'Unauthorized: API key expired' }, 401);
    }

    // Check if project is active
    if (!apiKeyRecord.project || !apiKeyRecord.project.isActive) {
      return c.json({ error: 'Unauthorized: Project is inactive or suspended' }, 401);
    }

    // Bind to request context
    c.set('project', apiKeyRecord.project);
    c.set('apiKeyId', apiKeyRecord.id);

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
    return c.json({ error: 'Internal server error during authentication' }, 500);
  }
});
