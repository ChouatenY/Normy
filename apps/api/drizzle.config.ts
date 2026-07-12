import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '../../.env' });


const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('[drizzle-kit] DATABASE_URL is required');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: false,
});
