import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { env } from '../config/env.js';

// For testing or serverless, we might want single-connection or pool configuration.
// By default we initialize a query pool.
const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
export { client };
