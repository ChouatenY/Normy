'use server';

import type { Project, ApiKey } from '../lib/db-service.js';

import { getApiUrl, getApiSecret } from '../lib/env.js';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-admin-secret': getApiSecret(),
});

export async function getProjectsAction(email: string): Promise<Project[]> {
  const targetUrl = `${getApiUrl()}/projects?email=${encodeURIComponent(email)}`;
  console.log(`[ACTION getProjects] fetching: ${targetUrl}`);
  try {
    const res = await fetch(targetUrl, {
      headers: getHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[ACTION getProjects] FAILED: HTTP ${res.status} ${res.statusText}`);
      const text = await res.text().catch(() => 'no-body');
      console.error(`[ACTION getProjects] Response body: ${text}`);
      return [];
    }
    const data = await res.json();
    return data.projects || [];
  } catch (error: any) {
    console.error(`[ACTION getProjects] EXCEPTION: ${error.message}`, error);
    return [];
  }
}

export async function createProjectAction(data: { name: string; ownerEmail: string; slug?: string; description?: string; defaultProvider?: string; minScore?: number }): Promise<Project | null> {
  const targetUrl = `${getApiUrl()}/projects`;
  console.log(`[ACTION createProject] fetching: ${targetUrl}`);
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.error(`[ACTION createProject] FAILED: HTTP ${res.status} ${res.statusText}`);
      const text = await res.text().catch(() => 'no-body');
      console.error(`[ACTION createProject] Response body: ${text}`);
      return null;
    }
    const json = await res.json();
    return json.project;
  } catch (error: any) {
    console.error(`[ACTION createProject] EXCEPTION: ${error.message}`, error);
    return null;
  }
}

export async function updateProjectAction(id: string, data: any): Promise<Project | null> {
  const res = await fetch(`${getApiUrl()}/projects/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.project;
}

export async function deleteProjectAction(id: string): Promise<boolean> {
  const res = await fetch(`${getApiUrl()}/projects/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.ok;
}

export async function updateByokAction(projectId: string, provider: string, key: string, title?: string): Promise<boolean> {
  const res = await fetch(`${getApiUrl()}/projects/${projectId}/byok`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ provider, key, title }),
  });
  return res.ok;
}

export async function setPrimaryByokAction(projectId: string, keyId: string): Promise<boolean> {
  const res = await fetch(`${getApiUrl()}/projects/${projectId}/byok/${keyId}/primary`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return res.ok;
}

export async function deleteByokAction(projectId: string, keyId: string): Promise<boolean> {
  const res = await fetch(`${getApiUrl()}/projects/${projectId}/byok/${keyId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.ok;
}

export async function getApiKeysAction(projectId: string): Promise<ApiKey[]> {
  const res = await fetch(`${getApiUrl()}/api-keys?projectId=${projectId}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.apiKeys || [];
}

export async function createApiKeyAction(projectId: string, name: string, environment: 'development' | 'production'): Promise<{ apiKey: string } | null> {
  const mode = environment === 'production' ? 'live' : 'test';
  const res = await fetch(`${getApiUrl()}/api-keys`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ projectId, name, mode }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function revokeApiKeyAction(id: string): Promise<boolean> {
  const res = await fetch(`${getApiUrl()}/api-keys/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.ok;
}

export async function deleteApiKeyAction(id: string): Promise<boolean> {
  // We use the same delete route to revoke/delete for now
  const res = await fetch(`${getApiUrl()}/api-keys/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.ok;
}

export async function validateInputAction(data: { projectId: string; question: string; answer: string; provider: string; apiKey: string }) {
  try {
    const res = await fetch(`${getApiUrl()}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.apiKey}`,
      },
      body: JSON.stringify({
        projectId: data.projectId,
        question: data.question,
        answer: data.answer,
        provider: data.provider || undefined
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown validation error');
      return {
        valid: false,
        error: `HTTP_${res.status}`,
        feedback: errText || `API responded with status ${res.status}`
      };
    }

    return await res.json();
  } catch (error: any) {
    return {
      valid: false,
      error: 'NETWORK_ERROR',
      feedback: error.message || 'Failed to connect to the Normy API server.'
    };
  }
}

export async function getAnalyticsAction(projectId: string) {
  const targetUrl = `${getApiUrl()}/analytics?projectId=${projectId}`;
  console.log(`[ACTION getAnalytics] fetching: ${targetUrl}`);
  try {
    const res = await fetch(targetUrl, {
      headers: getHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[ACTION getAnalytics] FAILED: HTTP ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    return data.analytics || null;
  } catch (error: any) {
    console.error(`[ACTION getAnalytics] EXCEPTION: ${error.message}`, error);
    return null;
  }
}

export async function getProjectProvidersAction(projectId: string) {
  const targetUrl = `${getApiUrl()}/projects/${projectId}/providers`;
  console.log(`[ACTION getProjectProviders] fetching: ${targetUrl}`);
  try {
    const res = await fetch(targetUrl, {
      headers: getHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[ACTION getProjectProviders] FAILED: HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (error: any) {
    console.error(`[ACTION getProjectProviders] EXCEPTION: ${error.message}`, error);
    return null;
  }
}
