import { assertServerEnv } from '@normy/shared';

// Parse and validate environment variables at startup
export const env = assertServerEnv();
