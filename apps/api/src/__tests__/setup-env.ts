process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://normy:normy@localhost:5432/normy_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.API_SECRET = process.env.API_SECRET || 'test-secret-at-least-32-chars-long';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-mock-key';
