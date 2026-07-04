import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../lib/supabase.js';
import { DbService, resetMockDatabase } from '../lib/db-service.js';

// Mock browser localStorage for mock auth/db test runs
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'window', {
  value: { localStorage: localStorageMock },
  writable: true
});
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock Server Actions so vitest doesn't try to fetch from localhost:3001
vi.mock('../app/actions.js', () => {
  let projects: any[] = [];
  let apiKeys: any[] = [];
  
  return {
    getProjectsAction: vi.fn(async (_email) => projects),
    createProjectAction: vi.fn(async (data) => {
      const proj = { ...data, id: 'proj_' + Math.random().toString(36).substr(2, 9) };
      projects.push(proj);
      return proj;
    }),
    updateProjectAction: vi.fn(async (id, data) => {
      const idx = projects.findIndex(p => p.id === id);
      if (idx !== -1) {
        projects[idx] = { ...projects[idx], ...data };
        return projects[idx];
      }
      return null;
    }),
    updateByokAction: vi.fn(async (_id, _provider, _key) => true),
    getApiKeysAction: vi.fn(async (projectId) => apiKeys.filter(k => k.projectId === projectId)),
    createApiKeyAction: vi.fn(async (projectId, name, environment) => {
      const apiKey = `nrm_${environment === 'production' ? 'live' : 'test'}_${Math.random().toString(36).substr(2, 9)}`;
      apiKeys.push({ id: 'key_' + Math.random().toString(36).substr(2, 9), projectId, name, environment, keyPrefix: apiKey });
      return { apiKey };
    }),
    revokeApiKeyAction: vi.fn(async (id) => {
      const k = apiKeys.find(k => k.id === id);
      if (k) k.revokedAt = new Date().toISOString();
      return true;
    }),
    deleteApiKeyAction: vi.fn(async (id) => {
      apiKeys = apiKeys.filter(k => k.id !== id);
      return true;
    })
  };
});

describe('Normy Developer Dashboard - Unit Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    resetMockDatabase();
  });

  describe('Supabase Authentication Flow', () => {
    it('should successfully register a new user with mock credentials', async () => {
      const email = 'new-dev@normy.io';
      const password = 'securepassword123';
      const name = 'New Developer';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(email);
      expect(data.user?.user_metadata.name).toBe(name);
    });

    it('should authenticate a user with correct credentials', async () => {
      const email = 'user@normy.io';
      const password = 'mypassword';

      // Register first
      await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: 'Alex' } }
      });

      // Sign In
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(email);
    });

    it('should fail authentication with invalid credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@normy.io',
        password: 'wrongpassword'
      });

      expect(error).not.toBeNull();
      expect(data.user).toBeNull();
    });
  });

  describe('Project Management (CRUD)', () => {
    it('should create and retrieve new developer projects', async () => {
      const email = 'usr_123@example.com';
      const newProj = await DbService.createProject(email, {
        name: 'Vite Production SDK App',
        description: 'Verifies landing forms in production environment',
        defaultProvider: 'openai',
        minScore: 85
      });

      expect(newProj.id).toContain('proj_');
      expect(newProj.name).toBe('Vite Production SDK App');
      expect(newProj.defaultProvider).toBe('openai');
      expect(newProj.minScore).toBe(85);

      const projects = await DbService.getProjects(email);
      expect(projects.length).toBe(1);
      expect(projects[0]?.name).toBe('Vite Production SDK App');
    });

    it('should edit existing project properties', async () => {
      const email = 'usr_123@example.com';
      const proj = await DbService.createProject(email, { name: 'Alpha Project', minScore: 70 });
      
      const updated = await DbService.updateProject(proj.id, {
        name: 'Omega Project',
        minScore: 90,
        defaultProvider: 'anthropic'
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Omega Project');
      expect(updated?.minScore).toBe(90);
      expect(updated?.defaultProvider).toBe('anthropic');
    });
  });

  describe('API Access Key Management', () => {
    it('should generate secure development and production credentials', async () => {
      const projId = 'proj_main';
      const apiKey = await DbService.createApiKey(projId, 'Staging Key', 'development');

      expect(apiKey).toContain('nrm_test_');
    });

    it('should safely revoke active api keys', async () => {
      const projId = 'proj_main';
      await DbService.createApiKey(projId, 'Prod Key', 'production');
      
      // we mock it so we can't easily get the ID since createApiKey just returns the raw string
      // Let's get the keys first
      const keys = await DbService.getApiKeys(projId);
      const record = keys[0];

      await DbService.revokeApiKey(record!.id);

      const keysAfter = await DbService.getApiKeys(projId);
      expect(keysAfter[0]?.revokedAt).toBeDefined();
    });
  });
});
