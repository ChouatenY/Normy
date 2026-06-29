import { describe, it, expect, beforeEach } from 'vitest';
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

describe('Normy Developer Dashboard - Unit Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    resetMockDatabase(true);
  });

  describe('Supabase Authentication Flow', () => {
    it('should successfully register a new user with mock credentials', async () => {
      const email = 'new-dev@normy.io';
      const password = 'securepassword123';
      const name = 'New Developer';

      const { data, error } = await supabase.signUp({
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
      await supabase.signUp({
        email,
        password,
        options: { data: { name: 'Alex' } }
      });

      // Sign In
      const { data, error } = await supabase.signInWithPassword({
        email,
        password
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(email);
    });

    it('should fail authentication with invalid credentials', async () => {
      const { data, error } = await supabase.signInWithPassword({
        email: 'nonexistent@normy.io',
        password: 'wrongpassword'
      });

      expect(error).not.toBeNull();
      expect(data.user).toBeNull();
    });
  });

  describe('Project Management (CRUD)', () => {
    it('should create and retrieve new developer projects', async () => {
      const userId = 'usr_123';
      const newProj = await DbService.createProject(userId, {
        name: 'Vite Production SDK App',
        description: 'Verifies landing forms in production environment',
        defaultProvider: 'openai',
        minScore: 85
      });

      expect(newProj.id).toContain('proj_');
      expect(newProj.name).toBe('Vite Production SDK App');
      expect(newProj.defaultProvider).toBe('openai');
      expect(newProj.minScore).toBe(85);

      const projects = await DbService.getProjects(userId);
      expect(projects.length).toBe(1);
      expect(projects[0]?.name).toBe('Vite Production SDK App');
    });

    it('should edit existing project properties', async () => {
      const userId = 'usr_123';
      const proj = await DbService.createProject(userId, { name: 'Alpha Project', minScore: 70 });
      
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

    it('should delete a project and associated keys', async () => {
      const userId = 'usr_123';
      const proj = await DbService.createProject(userId, { name: 'Temp Project' });
      await DbService.generateApiKey(proj.id, 'Temp Key', 'development');

      await DbService.deleteProject(proj.id);
      
      const projects = await DbService.getProjects(userId);
      expect(projects.length).toBe(0);

      const keys = await DbService.getApiKeys(proj.id);
      expect(keys.length).toBe(0);
    });
  });

  describe('API Access Key Management', () => {
    it('should generate secure development and production credentials', async () => {
      const projId = 'proj_main';
      const { apiKey, record } = await DbService.generateApiKey(projId, 'Staging Key', 'development');

      expect(apiKey).toContain('nrm_test_');
      expect(record.name).toBe('Staging Key');
      expect(record.environment).toBe('development');
      expect(record.prefix).toContain('nrm_test_');
    });

    it('should safely revoke active api keys', async () => {
      const projId = 'proj_main';
      const { record } = await DbService.generateApiKey(projId, 'Prod Key', 'production');
      
      const success = await DbService.revokeApiKey(record.id);
      expect(success).toBe(true);

      const keys = await DbService.getApiKeys(projId);
      expect(keys[0]?.revokedAt).toBeDefined();
    });
  });
});
