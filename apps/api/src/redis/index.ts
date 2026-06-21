import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis(env.REDIS_URL, {
  // Gracefully handle connection errors in environments where Redis isn't running
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    if (times > 3) {
      console.warn(`Redis connection failed after ${times} retries. Rate limiting might be bypassed.`);
      return null; // Stop retrying
    }
    return Math.min(times * 100, 2000);
  },
});

redis.on('error', (err: Error) => {
  console.error('Redis error occurred:', err);
});
