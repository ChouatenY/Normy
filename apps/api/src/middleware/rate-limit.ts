import { createMiddleware } from 'hono/factory';
import { redis } from '../redis/index.js';
import { db } from '../db/index.js';
import type { AuthContext } from './auth.js';

export const rateLimit = createMiddleware<AuthContext>(async (c, next) => {
  const apiKeyId = c.get('apiKeyId');
  if (!apiKeyId) {
    return await next();
  }

  try {
    // 1. Fetch key config (either from cache/context or query)
    const keyRecord = await db.query.apiKeys.findFirst({
      where: (keys, { eq }) => eq(keys.id, apiKeyId),
      columns: {
        rateLimit: true,
      },
    });

    const limit = keyRecord?.rateLimit ?? 60; // fallback default
    
    // 2. Generate window key: minute-based bucket
    const currentMinute = Math.floor(Date.now() / 60000);
    const redisKey = `rate_limit:${apiKeyId}:${currentMinute}`;

    // 3. Multi/Pipeline atomic increment & expire
    const results = await redis
      .multi()
      .incr(redisKey)
      .expire(redisKey, 60)
      .exec();

    if (results && results[0]) {
      const [err, count] = results[0];
      if (err) {
        throw err;
      }
      
      const currentCount = Number(count);
      
      // Set rate limit headers
      c.header('X-RateLimit-Limit', limit.toString());
      c.header('X-RateLimit-Remaining', Math.max(0, limit - currentCount).toString());

      if (currentCount > limit) {
        return c.json({ 
          error: 'Too Many Requests: API rate limit exceeded. Please try again later.' 
        }, 429);
      }
    }

    return await next();
  } catch (error) {
    // Fail-open: log error but do not block the user request if Redis is down
    console.warn('Redis rate-limiting failed (fail-open):', error);
    return await next();
  }
});
