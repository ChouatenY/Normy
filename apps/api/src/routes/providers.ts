import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { apiKeyAuth, type AuthContext } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { projects } from '../db/schema/projects.js';
import { eq } from 'drizzle-orm';
import { encrypt } from '../utils/encryption.js';
import { ProviderService } from '../services/provider.service.js';

export const providerRoutes = new OpenAPIHono<AuthContext>();

providerRoutes.use('*', apiKeyAuth);

const ProviderSchema = z.object({
  name: z.string(),
  status: z.enum(['connected', 'disconnected', 'disabled']),
  mode: z.enum(['hosted', 'byok']),
  model: z.string().optional(),
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
    
    // Only Gemini implemented for now
    const geminiMode: 'byok' | 'hosted' = project.geminiApiKey ? 'byok' : 'hosted';
    const geminiModel = (project.settings as any)?.geminiModel || 'gemini-2.5-flash';
    
    return c.json({
      providers: [
        {
          name: 'gemini',
          status: 'connected',
          mode: geminiMode,
          model: geminiModel,
          lastTested: null,
          lastUsed: null,
        },
        {
          name: 'openai',
          status: 'disconnected',
          mode: 'hosted',
        },
        {
          name: 'anthropic',
          status: 'disconnected',
          mode: 'hosted',
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
