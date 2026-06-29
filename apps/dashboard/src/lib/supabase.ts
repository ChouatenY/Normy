import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// A high-fidelity Mock Auth implementation for offline/local-only mode
class MockAuthService {
  private getStorage() {
    if (typeof window === 'undefined') return { user: null, projects: [], apiKeys: [] };
    const user = localStorage.getItem('normy_mock_user');
    const projects = localStorage.getItem('normy_mock_projects');
    const apiKeys = localStorage.getItem('normy_mock_apikeys');
    return {
      user: user ? JSON.parse(user) : null,
      projects: projects ? JSON.parse(projects) : [],
      apiKeys: apiKeys ? JSON.parse(apiKeys) : [],
    };
  }

  private saveUser(user: any) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('normy_mock_user', JSON.stringify(user));
    }
  }

  private saveProjects(projects: any[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('normy_mock_projects', JSON.stringify(projects));
    }
  }

  private saveApiKeys(apiKeys: any[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('normy_mock_apikeys', JSON.stringify(apiKeys));
    }
  }

  async signUp({ email, password, options }: any) {
    const { user } = this.getStorage();
    if (user && user.email === email) {
      return { data: { user: null }, error: { message: 'User already exists' } };
    }
    const newUser = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      email,
      user_metadata: options?.data || { name: email.split('@')[0] },
      created_at: new Date().toISOString(),
    };
    this.saveUser(newUser);
    // Seed default project for new user to make 5-min quick start instant!
    const defaultProj = {
      id: 'proj_' + Math.random().toString(36).substr(2, 9),
      userId: newUser.id,
      name: 'My First Validation Project',
      slug: 'my-first-validation-project',
      description: 'Automatically created during signup to help you get started.',
      defaultProvider: 'gemini',
      minScore: 70,
      status: 'active',
      validationCount: 12,
      createdAt: new Date().toISOString(),
    };
    const defaultKey = {
      id: 'key_' + Math.random().toString(36).substr(2, 9),
      projectId: defaultProj.id,
      name: 'Default Test Key',
      prefix: 'nrm_test_d3f8a29b',
      key: 'nrm_test_d3f8a29b_seed_secret_key_once_only_copy_it',
      environment: 'development',
      rateLimit: 60,
      createdAt: new Date().toISOString(),
    };
    this.saveProjects([defaultProj]);
    this.saveApiKeys([defaultKey]);

    return { data: { user: newUser }, error: null };
  }

  async signInWithPassword({ email, password }: any) {
    const { user } = this.getStorage();
    if (!user || user.email !== email) {
      return { data: { user: null }, error: { message: 'Invalid credentials or user not found' } };
    }
    return { data: { user }, error: null };
  }

  async signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('normy_mock_user');
    }
    return { error: null };
  }

  async getSession() {
    const { user } = this.getStorage();
    return { data: { session: user ? { user, access_token: 'mock-token' } : null }, error: null };
  }

  async getUser() {
    const { user } = this.getStorage();
    return { data: { user }, error: null };
  }

  async updateUser({ data, password }: any) {
    const { user } = this.getStorage();
    if (!user) return { data: { user: null }, error: { message: 'Not authenticated' } };
    if (data?.name) user.user_metadata = { ...user.user_metadata, name: data.name };
    if (data?.email) user.email = data.email;
    this.saveUser(user);
    return { data: { user }, error: null };
  }
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new MockAuthService() as any);
