import { db } from '../apps/api/src/db/index.js';
import { users } from '../apps/api/src/db/schema/users.js';
import { projects, DEFAULT_PROJECT_SETTINGS } from '../apps/api/src/db/schema/projects.js';
import { apiKeys } from '../apps/api/src/db/schema/api-keys.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateApiKey(mode: 'live' | 'test') {
  return `nrm_${mode}_${crypto.randomBytes(24).toString('base64url')}`;
}

function hashApiKey(rawKey: string) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

async function main() {
  console.log('Bootstrapping Normy default seed...');

  // 1. Get or create user
  let user = await db.query.users.findFirst();
  if (!user) {
    console.log('No user found, creating default admin user...');
    const [inserted] = await db.insert(users).values({
      email: 'admin@normy.dev',
      name: 'Normy Admin',
      passwordHash: 'managed-externally',
      emailVerified: true,
    }).returning();
    user = inserted;
  }
  console.log(`User ID: ${user.id}`);

  // 2. Get or create project
  let project = await db.query.projects.findFirst({
    where: (table, { isNull }) => isNull(table.deletedAt),
  });
  if (!project) {
    console.log('No project found, creating default project...');
    const [inserted] = await db.insert(projects).values({
      name: 'Default Demo Project',
      slug: 'default-demo-project',
      description: 'Default project created by bootstrap script',
      userId: user.id,
      defaultProvider: 'gemini',
      settings: DEFAULT_PROJECT_SETTINGS,
    }).returning();
    project = inserted;
  }
  console.log(`Project ID: ${project.id}`);

  // 3. Get or create API key
  let apiKeyRow = await db.query.apiKeys.findFirst({
    where: (table, { eq }) => eq(table.projectId, project.id),
  });
  let rawKey = '';

  if (!apiKeyRow) {
    console.log('No API key found, generating new one...');
    rawKey = generateApiKey('test');
    const prefix = rawKey.substring(0, 8);
    const hashedKey = hashApiKey(rawKey);

    const [inserted] = await db.insert(apiKeys).values({
      projectId: project.id,
      name: 'Default Test Key',
      prefix,
      hashedKey,
      mode: 'test',
      rateLimit: 60,
    }).returning();
    apiKeyRow = inserted;
  } else {
    // Since hashedKey is stored, we can't retrieve the raw key.
    // So we generate a fresh key to write to .env.
    console.log('Existing API key found. Replacing with a fresh one for the demo...');
    rawKey = generateApiKey('test');
    const prefix = rawKey.substring(0, 8);
    const hashedKey = hashApiKey(rawKey);

    await db.insert(apiKeys).values({
      projectId: project.id,
      name: `Demo Key ${new Date().toLocaleDateString()}`,
      prefix,
      hashedKey,
      mode: 'test',
      rateLimit: 60,
    });
  }

  const demoEnvPath = path.resolve(__dirname, '../examples/react-live-demo/.env');
  const envContent = `VITE_NORMY_API_URL="http://localhost:3001"
VITE_NORMY_PROJECT_ID="${project.id}"
VITE_NORMY_API_KEY="${rawKey}"
VITE_GEMINI_API_KEY="${process.env.GEMINI_API_KEY || ''}"
`;

  fs.writeFileSync(demoEnvPath, envContent, 'utf8');
  console.log(`Successfully updated ${demoEnvPath} with seeded credentials.`);
}

main().catch(err => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
