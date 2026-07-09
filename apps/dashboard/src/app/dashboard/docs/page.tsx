'use client';

import React from 'react';
import { useData } from '../../../components/providers/DataProvider.js';
import { InteractiveDocs } from '../../../components/InteractiveDocs.js';

export default function DocsPage() {
  const { selectedProject, apiKeys } = useData();
  const apiKey = apiKeys[0]?.keyPrefix + '...' || 'nrm_test_...';

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: 24 }}>Integration SDK</h1>
      <InteractiveDocs projectId={selectedProject?.id || 'proj_example'} apiKey={apiKey} />
    </div>
  );
}
