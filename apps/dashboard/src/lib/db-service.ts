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
  prefix: string;
  key?: string; // only returned once
  environment: 'development' | 'production';
  rateLimit: number;
  revokedAt?: string;
  createdAt: string;
}

let mockProjects: Project[] = [];
let mockKeys: ApiKey[] = [];

export function resetMockDatabase(empty = false) {
  if (empty) {
    mockProjects = [];
    mockKeys = [];
    return;
  }
  mockProjects = [
    {
      id: 'proj_first',
      userId: 'default_user',
      name: 'My Validation Project',
      slug: 'my-validation-project',
      description: 'Clean description for form validation metrics.',
      defaultProvider: 'gemini',
      minScore: 70,
      status: 'active',
      validationCount: 124,
      createdAt: new Date().toISOString(),
    }
  ];
  mockKeys = [
    {
      id: 'key_1',
      projectId: 'proj_first',
      name: 'Development Test Key',
      prefix: 'nrm_test_7a9b8c...',
      environment: 'development',
      rateLimit: 60,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'key_2',
      projectId: 'proj_first',
      name: 'Production Key',
      prefix: 'nrm_live_f1e2d3...',
      environment: 'production',
      rateLimit: 120,
      createdAt: new Date().toISOString(),
    }
  ];
}

// Initialise
resetMockDatabase();

export class DbService {
  private static getStorage() {
    if (typeof window === 'undefined') {
      return { projects: mockProjects, apiKeys: mockKeys };
    }
    const projects = localStorage.getItem('normy_mock_projects');
    const apiKeys = localStorage.getItem('normy_mock_apikeys');
    
    if (!projects) {
      localStorage.setItem('normy_mock_projects', JSON.stringify(mockProjects));
    }
    if (!apiKeys) {
      localStorage.setItem('normy_mock_apikeys', JSON.stringify(mockKeys));
    }

    return {
      projects: projects ? JSON.parse(projects) : mockProjects,
      apiKeys: apiKeys ? JSON.parse(apiKeys) : mockKeys,
    };
  }

  private static saveProjects(projects: Project[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('normy_mock_projects', JSON.stringify(projects));
    } else {
      mockProjects = projects;
    }
  }

  private static saveApiKeys(apiKeys: ApiKey[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('normy_mock_apikeys', JSON.stringify(apiKeys));
    } else {
      mockKeys = apiKeys;
    }
  }

  static async getProjects(userId: string): Promise<Project[]> {
    const { projects } = this.getStorage();
    return projects.filter((p: Project) => p.userId === userId || p.userId === 'default_user');
  }

  static async createProject(userId: string, data: Partial<Project>): Promise<Project> {
    const { projects } = this.getStorage();
    const newProject: Project = {
      id: 'proj_' + Math.random().toString(36).substr(2, 9),
      userId,
      name: data.name || 'Untitled Project',
      slug: data.slug || data.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'untitled',
      description: data.description || '',
      defaultProvider: data.defaultProvider || 'gemini',
      minScore: data.minScore ?? 70,
      status: 'active',
      validationCount: 0,
      createdAt: new Date().toISOString(),
    };
    projects.push(newProject);
    this.saveProjects(projects);
    return newProject;
  }

  static async updateProject(projectId: string, data: Partial<Project>): Promise<Project | null> {
    const { projects } = this.getStorage();
    const idx = projects.findIndex((p: Project) => p.id === projectId);
    if (idx === -1) return null;
    projects[idx] = { ...projects[idx], ...data } as Project;
    this.saveProjects(projects);
    return projects[idx];
  }

  static async deleteProject(projectId: string): Promise<boolean> {
    const { projects, apiKeys } = this.getStorage();
    const filteredProj = projects.filter((p: Project) => p.id !== projectId);
    const filteredKeys = apiKeys.filter((k: ApiKey) => k.projectId !== projectId);
    this.saveProjects(filteredProj);
    this.saveApiKeys(filteredKeys);
    return true;
  }

  static async getApiKeys(projectId: string): Promise<ApiKey[]> {
    const { apiKeys } = this.getStorage();
    return apiKeys.filter((k: ApiKey) => k.projectId === projectId);
  }

  static async generateApiKey(projectId: string, name: string, environment: 'development' | 'production'): Promise<{ apiKey: string; record: ApiKey }> {
    const { apiKeys } = this.getStorage();
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const rawKey = environment === 'production' ? `nrm_live_${randomHex}` : `nrm_test_${randomHex}`;
    const prefix = rawKey.substring(0, 18) + '******';
    
    const newRecord: ApiKey = {
      id: 'key_' + Math.random().toString(36).substr(2, 9),
      projectId,
      name,
      prefix,
      environment,
      rateLimit: environment === 'production' ? 120 : 60,
      createdAt: new Date().toISOString(),
    };

    apiKeys.push(newRecord);
    this.saveApiKeys(apiKeys);

    return {
      apiKey: rawKey,
      record: newRecord
    };
  }

  static async revokeApiKey(keyId: string): Promise<boolean> {
    const { apiKeys } = this.getStorage();
    const idx = apiKeys.findIndex((k: ApiKey) => k.id === keyId);
    if (idx === -1) return false;
    apiKeys[idx] = { ...apiKeys[idx], revokedAt: new Date().toISOString() };
    this.saveApiKeys(apiKeys);
    return true;
  }

  static async deleteApiKey(keyId: string): Promise<boolean> {
    const { apiKeys } = this.getStorage();
    const filtered = apiKeys.filter((k: ApiKey) => k.id !== keyId);
    this.saveApiKeys(filtered);
    return true;
  }
}
