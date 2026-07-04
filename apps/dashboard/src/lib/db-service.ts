import {
  getProjectsAction,
  createProjectAction,
  updateProjectAction,
  updateByokAction,
  getApiKeysAction,
  createApiKeyAction,
  revokeApiKeyAction,
  deleteApiKeyAction,
} from '../app/actions.js';

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

export function resetMockDatabase(empty = false) {
  // Deprecated since we are using the live API
  console.log('resetMockDatabase called but mock DB is disabled.');
}

export class DbService {
  static async getProjects(email: string): Promise<Project[]> {
    return getProjectsAction(email);
  }

  static async createProject(email: string, data: Partial<Project>): Promise<Project> {
    const proj = await createProjectAction({
      name: data.name || 'Untitled Project',
      ownerEmail: email,
      slug: data.slug,
      description: data.description,
      defaultProvider: data.defaultProvider,
      minScore: data.minScore,
    });
    if (!proj) throw new Error('Failed to create project');
    return proj;
  }

  static async updateProject(projectId: string, data: Partial<Project>): Promise<Project | null> {
    return updateProjectAction(projectId, data);
  }

  static async updateByok(projectId: string, provider: 'gemini' | 'openai' | 'anthropic', key: string): Promise<void> {
    await updateByokAction(projectId, provider, key);
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
}
