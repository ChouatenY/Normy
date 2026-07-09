'use client';

import React from 'react';
import { useData } from '../../components/providers/DataProvider.js';
import { useAuth } from '../../components/providers/AuthProvider.js';
import { EmptyProjectsState } from '../../components/ui/empty-projects.js';
import { useRouter } from 'next/navigation';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { projects } = useData();

  const router = useRouter();

  if (projects.length === 0) {
    return (
      <EmptyProjectsState onCreateProject={() => router.push('/dashboard/projects?create=true')} />
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: 24 }}>Welcome back, {user?.user_metadata?.name || 'Developer'}</h1>
      <div className="card-glass" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--white)', marginBottom: 8 }}>Overview</h3>
        <p style={{ color: 'var(--text-sec)' }}>You have {projects.length} active validation projects.</p>
      </div>
    </div>
  );
}
