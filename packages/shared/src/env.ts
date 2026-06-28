import { z } from 'zod';

// ─── Individual field schemas ─────────────────────────────────────────────────

const urlSchema = z.string().url();
const nonEmptyString = z.string().min(1, 'Must not be empty');

// ─── Full server environment schema ──────────────────────────────────────────

/**
 * Complete environment variable schema for the Normy API server.
 * All fields with defaults are optional at the infrastructure level;
 * everything else is REQUIRED at startup — the process exits if missing.
 */
export const serverEnvSchema = z.object({
  // ── Node ────────────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // ── Database ─────────────────────────────────────────────────────────────────
  DATABASE_URL: urlSchema.describe(
    'PostgreSQL connection string, e.g. postgresql://user:pass@host:5432/normy'
  ),

  // ── Redis ────────────────────────────────────────────────────────────────────
  REDIS_URL: urlSchema.describe(
    'Redis connection string, e.g. redis://localhost:6379'
  ),

  // ── AI Providers (at least one required at runtime) ──────────────────────────
  OPENAI_API_KEY: nonEmptyString.optional(),
  GEMINI_API_KEY: nonEmptyString.optional(),
  ANTHROPIC_API_KEY: nonEmptyString.optional(),

  // ── Default AI provider to use ───────────────────────────────────────────────
  AI_PROVIDER: z
    .enum(['openai', 'gemini', 'anthropic'])
    .default('gemini'),

  // ── API Security ─────────────────────────────────────────────────────────────
  API_SECRET: nonEmptyString.describe(
    'Secret used to sign and verify internal API tokens'
  ),

  // ── CORS ──────────────────────────────────────────────────────────────────────
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .describe('Comma-separated list of allowed CORS origins'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// ─── Client / SDK schema (public env only) ────────────────────────────────────

/**
 * Environment variables safe to expose to browser-side SDKs.
 * Never include secrets here.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_NORMY_API_URL: urlSchema.default('http://localhost:3001'),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

// ─── Parse utilities ──────────────────────────────────────────────────────────

/**
 * Parses and validates server environment variables.
 * Throws a descriptive ZodError if validation fails — call this at startup
 * so misconfiguration is caught immediately, not at request time.
 *
 * @example
 * ```ts
 * import { parseServerEnv } from '@normy/shared/env';
 * const env = parseServerEnv(process.env);
 * ```
 */
export function parseServerEnv(raw: NodeJS.ProcessEnv): ServerEnv {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `[Normy] Invalid environment variables:\n${formatted}\n\nPlease check your .env file.`
    );
  }

  // Enforce that the selected AI provider has a configured key.
  const { data } = result;
  const selectedProviderKey = {
    openai: data.OPENAI_API_KEY,
    gemini: data.GEMINI_API_KEY,
    anthropic: data.ANTHROPIC_API_KEY,
  }[data.AI_PROVIDER];

  if (!selectedProviderKey) {
    throw new Error(
      `[Normy] ${data.AI_PROVIDER.toUpperCase()}_API_KEY must be set because AI_PROVIDER=${data.AI_PROVIDER}.`
    );
  }

  return data;
}

/**
 * Parses and validates client-safe environment variables.
 * Safe to call in both server and browser contexts.
 *
 * @example
 * ```ts
 * import { parseClientEnv } from '@normy/shared/env';
 * const env = parseClientEnv(process.env);
 * ```
 */
export function parseClientEnv(raw: Record<string, string | undefined>): ClientEnv {
  const result = clientEnvSchema.safeParse(raw);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`[Normy] Invalid client environment variables:\n${formatted}`);
  }
  return result.data;
}

/**
 * Convenience: parse server env from process.env at module load time.
 * Import this at the top of your server entry point.
 *
 * @example
 * ```ts
 * import '@normy/shared/env/assert';
 * // if invalid, process.exit(1) has already been called
 * ```
 */
export function assertServerEnv(): ServerEnv {
  try {
    return parseServerEnv(process.env);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
