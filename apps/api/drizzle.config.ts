import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../../.env') });


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
