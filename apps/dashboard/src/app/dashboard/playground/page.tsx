'use client';

import React from 'react';
import { useData } from '../../../components/providers/DataProvider.js';
import { PlaygroundView } from '../../../components/PlaygroundView.js';

export default function PlaygroundPage() {
  const { selectedProject, apiKeys } = useData();
  const apiKey = apiKeys[0]?.keyPrefix + '...' || 'nrm_test_...';

  if (!selectedProject) return <div style={{ color: 'var(--text-sec)' }}>Select a project first.</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: 24 }}>Playground</h1>
      <PlaygroundView projectId={selectedProject.id} apiKey={apiKey} apiHostUrl="" />
    </div>
  );
}
