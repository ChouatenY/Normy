'use server';

import type { Project, ApiKey } from '../lib/db-service.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_SECRET = process.env.API_SECRET || '';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-admin-secret': API_SECRET,
});

export async function getProjectsAction(email: string): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects?email=${encodeURIComponent(email)}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.projects || [];
}

export async function createProjectAction(data: { name: string; ownerEmail: string; slug?: string; description?: string; defaultProvider?: string; minScore?: number }): Promise<Project | null> {
  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.project;
}

export async function updateProjectAction(id: string, data: Partial<Project>): Promise<Project | null> {
  const res = await fetch(`${API_URL}/projects/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.project;
}

export async function updateByokAction(projectId: string, provider: string, key: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/projects/${projectId}/byok`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ provider, key }),
  });
  return res.ok;
}

export async function getApiKeysAction(projectId: string): Promise<ApiKey[]> {
  const res = await fetch(`${API_URL}/api-keys?projectId=${projectId}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.apiKeys || [];
}

export async function createApiKeyAction(projectId: string, name: string, environment: 'development' | 'production'): Promise<{ apiKey: string } | null> {
  const res = await fetch(`${API_URL}/api-keys`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ projectId, name, environment }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function revokeApiKeyAction(id: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api-keys/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.ok;
}

export async function deleteApiKeyAction(id: string): Promise<boolean> {
  // We use the same delete route to revoke/delete for now
  const res = await fetch(`${API_URL}/api-keys/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.ok;
}

export async function validateInputAction(data: { projectId: string; question: string; answer: string; provider: string; apiKey: string }) {
  const res = await fetch(`${API_URL}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.apiKey}`,
    },
    body: JSON.stringify({
      projectId: data.projectId,
      question: data.question,
      answer: data.answer,
      provider: data.provider
    }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return await res.json();
}
