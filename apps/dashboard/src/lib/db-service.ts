import {
  getProjectsAction,
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  updateByokAction,
  setPrimaryByokAction,
  deleteByokAction,
  getApiKeysAction,
  createApiKeyAction,
  revokeApiKeyAction,
  deleteApiKeyAction,
  getProjectProvidersAction,
} from '../app/actions.js';

export interface ProjectSettings {
  minScore?: number;
  defaultProvider?: 'openai' | 'gemini' | 'anthropic';
  defaultValidationMode?: 'onBlur' | 'onPause' | 'onSubmit';
  pauseDelayMs?: number;
  storeInputText?: boolean;
  shieldEnabled?: boolean;
  byokKeys?: any[];
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string;
  defaultProvider: 'gemini' | 'openai' | 'anthropic';
  minScore: number;
  status: 'active' | 'suspended';
  validationCount: number;
  createdAt: string;
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  anthropicApiKey?: string | null;
  settings?: ProjectSettings;
}

export interface ApiKey {
  id: string;
  projectId: string;
  name: string;
  keyPrefix: string;
  environment: 'development' | 'production';
  status: 'active' | 'revoked';
  rateLimit: number;
  revokedAt?: string;
  createdAt: string;
}

export function resetMockDatabase() {
  // Deprecated since we are using the live API
  console.log('resetMockDatabase called but mock DB is disabled.');
}

export class DbService {
  static async getProjects(email: string): Promise<Project[]> {
    return getProjectsAction(email);
  }

  static async createProject(email: string, data: Partial<Project>): Promise<Project> {
    const payload: any = {
      name: data.name || 'Untitled Project',
      ownerEmail: email,
      defaultProvider: data.defaultProvider,
      minScore: data.minScore,
    };
    if (data.slug) payload.slug = data.slug;
    if (data.description) payload.description = data.description;
    
    const proj = await createProjectAction(payload);
    if (!proj) throw new Error('Failed to create project');
    return proj;
  }

  static async updateProject(projectId: string, data: Partial<Project>): Promise<Project | null> {
    return updateProjectAction(projectId, data);
  }

  static async deleteProject(projectId: string): Promise<boolean> {
    return deleteProjectAction(projectId);
  }

  static async updateByok(projectId: string, provider: 'gemini' | 'openai' | 'anthropic', key: string, title?: string): Promise<void> {
    await updateByokAction(projectId, provider, key, title);
  }

  static async setPrimaryByok(projectId: string, keyId: string): Promise<void> {
    await setPrimaryByokAction(projectId, keyId);
  }

  static async deleteByok(projectId: string, keyId: string): Promise<void> {
    await deleteByokAction(projectId, keyId);
  }

  static async getApiKeys(projectId: string): Promise<ApiKey[]> {
    return getApiKeysAction(projectId);
  }

  static async createApiKey(projectId: string, name: string, environment: 'development' | 'production'): Promise<string> {
    const res = await createApiKeyAction(projectId, name, environment);
    if (!res) throw new Error('Failed to create API key');
    return res.apiKey;
  }

  static async revokeApiKey(id: string): Promise<void> {
    await revokeApiKeyAction(id);
  }

  static async deleteApiKey(id: string): Promise<void> {
    await deleteApiKeyAction(id);
  }

  static async getProjectProviders(projectId: string): Promise<any> {
    return getProjectProvidersAction(projectId);
  }
}
