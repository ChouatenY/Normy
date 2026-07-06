import { assertServerEnv } from '@normy-validation/shared';

// Parse and validate environment variables at startup
export const env = assertServerEnv();
