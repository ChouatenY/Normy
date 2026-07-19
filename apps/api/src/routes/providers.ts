import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { apiKeyAuth, type AuthContext } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { projects } from '../db/schema/projects.js';
import { eq } from 'drizzle-orm';
import { encrypt } from '../utils/encryption.js';
import { ProviderService } from '../services/provider.service.js';
import { env } from '../config/env.js';

export const providerRoutes = new OpenAPIHono<AuthContext>();

providerRoutes.use('*', apiKeyAuth);

const ProviderSchema = z.object({
  name: z.string(),
  status: z.enum(['connected', 'disconnected', 'disabled']),
  mode: z.enum(['hosted', 'byok']),
  model: z.string().optional(),
  availableModels: z.array(z.string()).optional(),
  lastTested: z.string().nullable().optional(),
  lastUsed: z.string().nullable().optional(),
});

// 1. List Providers
providerRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Providers'],
    summary: 'List available and configured AI providers',
    responses: {
      200: {
        description: 'List of providers',
        content: { 'application/json': { schema: z.object({ providers: z.array(ProviderSchema) }) } },
      },
    },
  }),
  async (c) => {
    const project = c.get('project');
    
    const geminiMode: 'byok' | 'hosted' = project.geminiApiKey ? 'byok' : 'hosted';
    const geminiModel = (project.settings as any)?.geminiModel || env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    
    const openaiMode: 'byok' | 'hosted' = project.openaiApiKey ? 'byok' : 'hosted';
    const openaiModel = (project.settings as any)?.openaiModel || 'gpt-4o-mini';
    const openaiStatus = project.openaiApiKey ? ('connected' as const) : ('disconnected' as const);

    const anthropicMode: 'byok' | 'hosted' = project.anthropicApiKey ? 'byok' : 'hosted';
    const anthropicModel = (project.settings as any)?.anthropicModel || 'claude-3-5-haiku-latest';
    const anthropicStatus = project.anthropicApiKey ? ('connected' as const) : ('disconnected' as const);

    return c.json({
      providers: [
        {
          name: 'gemini',
          status: 'connected' as const,
          mode: geminiMode,
          model: geminiModel,
          availableModels: [
            'gemini-2.5-flash-lite',
            'gemini-2.0-flash',
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-2.0-pro'
          ],
          lastTested: null,
          lastUsed: null,
        },
        {
          name: 'openai',
          status: openaiStatus,
          mode: openaiMode,
          model: openaiModel,
          availableModels: [
            'gpt-4o-mini',
            'gpt-4o',
            'gpt-4-turbo',
            'gpt-4',
            'gpt-3.5-turbo'
          ],
          lastTested: null,
          lastUsed: null,
        },
        {
          name: 'anthropic',
          status: anthropicStatus,
          mode: anthropicMode,
          model: anthropicModel,
          availableModels: [
            'claude-3-5-haiku-latest',
            'claude-3-5-sonnet-latest',
            'claude-3-opus-latest',
            'claude-3-haiku-20240307',
            'claude-3-sonnet-20240229'
          ],
          lastTested: null,
          lastUsed: null,
        }
      ]
    });
  }
);

// 2. Connect Provider (BYOK)
providerRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/{providerName}/connect',
    tags: ['Providers'],
    summary: 'Connect a BYOK provider',
    request: {
      params: z.object({ providerName: z.string() }),
      body: {
        content: { 'application/json': { schema: z.object({ apiKey: z.string().min(1) }) } },
      },
    },
    responses: {
      200: { description: 'Connected successfully' },
      400: { description: 'Invalid request' },
    },
  }),
  async (c) => {
    const project = c.get('project');
    const { providerName } = c.req.valid('param');
    const { apiKey } = c.req.valid('json');

    if (providerName !== 'gemini' && providerName !== 'openai' && providerName !== 'anthropic') {
      return c.json({ error: 'Unsupported provider' }, 400);
    }

    const encryptedKey = encrypt(apiKey);

    const updateData: any = {};
    if (providerName === 'gemini') updateData.geminiApiKey = encryptedKey;
    if (providerName === 'openai') updateData.openaiApiKey = encryptedKey;
    if (providerName === 'anthropic') updateData.anthropicApiKey = encryptedKey;

    await db.update(projects).set(updateData).where(eq(projects.id, project.id));

    // Audit Log (future: validationEvents or audit logs table)

    return c.json({ success: true });
  }
);

// 3. Test Provider Connection
providerRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/{providerName}/test',
    tags: ['Providers'],
    summary: 'Test provider health',
    request: {
      params: z.object({ providerName: z.string() }),
    },
    responses: {
      200: { 
        description: 'Test result',
        content: { 'application/json': { schema: z.object({ ok: z.boolean(), error: z.string().optional() }) } },
      },
    },
  }),
  async (c) => {
    const project = c.get('project');
    const apiKeyEnv = c.get('apiKeyEnvironment');
    const { providerName } = c.req.valid('param');

    try {
      // Temporarily set default provider to test it
      const tempProject = { ...project, defaultProvider: providerName as any };
      const res = ProviderService.resolveProvider(tempProject, apiKeyEnv);
      
      const health = await res.provider.healthCheck();
      return c.json(health);
    } catch (e: any) {
      return c.json({ ok: false, error: e.message || 'Configuration error' });
    }
  }
);

// 4. Delete Provider
providerRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/{providerName}',
    tags: ['Providers'],
    summary: 'Remove BYOK credentials and revert to Hosted',
    request: {
      params: z.object({ providerName: z.string() }),
    },
    responses: {
      200: { description: 'Deleted' },
    },
  }),
  async (c) => {
    const project = c.get('project');
    const { providerName } = c.req.valid('param');

    const updateData: any = {};
    if (providerName === 'gemini') updateData.geminiApiKey = null;
    if (providerName === 'openai') updateData.openaiApiKey = null;
    if (providerName === 'anthropic') updateData.anthropicApiKey = null;

    await db.update(projects).set(updateData).where(eq(projects.id, project.id));

    return c.json({ success: true });
  }
);

// 5. Update Provider Config (Model Selection)
providerRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/{providerName}',
    tags: ['Providers'],
    summary: 'Update provider settings',
    request: {
      params: z.object({ providerName: z.string() }),
      body: {
        content: { 'application/json': { schema: z.object({ model: z.string().optional() }) } },
      }
    },
    responses: {
      200: { description: 'Updated' },
    },
  }),
  async (c) => {
    const project = c.get('project');
    const { providerName } = c.req.valid('param');
    const { model } = c.req.valid('json');

    const settings = { ...project.settings } as any;
    if (model) {
      settings[`${providerName}Model`] = model;
    }

    await db.update(projects).set({ settings }).where(eq(projects.id, project.id));

    return c.json({ success: true });
  }
);
