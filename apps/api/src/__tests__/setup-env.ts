import fs from 'node:fs';
import path from 'node:path';

process.env.NODE_ENV = 'test';

try {
  // Read root .env file (located in the workspace root)
  const envPath = path.resolve(process.cwd(), '../../.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    for (const line of envFile.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = val.trim();
        }
      }
    }
  }
} catch (e) {
  console.warn('Failed to parse root .env file:', e);
}

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:normy-validation2026@db.zowanqzybltfaxkdcmam.supabase.co:5432/postgres';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.API_SECRET = process.env.API_SECRET || '1bbcd60fb4cc6038be04e66d7a1e302ab93449cf6c5a0c8b25327762b6d29d6e';
process.env.AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBg0idKcxO9CkD-OymBcRlnsHLqqyK8Jk8';
