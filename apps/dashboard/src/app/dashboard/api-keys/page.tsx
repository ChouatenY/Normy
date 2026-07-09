'use client';

import React, { useState } from 'react';
import { useData } from '../../../components/providers/DataProvider.js';
import { DbService } from '../../../lib/db-service.js';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/custom-select.js';

export default function ApiKeysPage() {
  const { selectedProject, apiKeys, refreshApiKeys } = useData();
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'development' | 'production'>('development');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newKeyName) return;
    const apiKey = await DbService.createApiKey(selectedProject.id, newKeyName, newKeyEnv);
    setGeneratedKey(apiKey);
    setNewKeyName('');
    await refreshApiKeys();
  };

  const handleRevoke = async (id: string) => {
    if (confirm('Revoke API Key? Apps using this will fail.')) {
      await DbService.revokeApiKey(id);
      await refreshApiKeys();
    }
  };

  if (!selectedProject) return <div style={{ color: 'var(--text-sec)' }}>Select a project first.</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)' }}>API Keys</h1>
      </div>

      <div className="card-glass" style={{ padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--white)', marginBottom: 16 }}>Generate New Key</h3>
        <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 12 }}>
          <input className="input-field" style={{ flex: 2 }} value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key Name" required />
          <div style={{ flex: 1 }}>
            <CustomSelect value={newKeyEnv} onChange={val => setNewKeyEnv(val as any)} options={[{label: 'Development', value: 'development'}, {label: 'Production', value: 'production'}]} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}><Plus size={16} /> Create</button>
        </form>
        {generatedKey && (
          <div style={{ padding: 16, background: 'rgba(76,175,145,0.1)', color: 'var(--teal)', borderRadius: 8, marginTop: 16, border: '1px solid rgba(76,175,145,0.3)' }}>
            <strong style={{ display: 'block', marginBottom: 4 }}>Key Created Successfully. Copy it now, you will not see it again:</strong>
            <code style={{ fontSize: '1rem', background: '#000', padding: '4px 8px', borderRadius: 4, userSelect: 'all' }}>{generatedKey}</code>
          </div>
        )}
      </div>

      <div className="table-container" style={{ background: 'var(--surface-1)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', color: 'var(--text-sec)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Prefix</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Env</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Created</th>
              <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map(key => (
              <tr key={key.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--white)' }}>
                <td style={{ padding: '16px' }}>{key.name}</td>
                <td style={{ padding: '16px', fontFamily: 'var(--mono)' }}>{key.keyPrefix}••••••••</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: key.environment === 'production' ? 'rgba(76,175,145,0.1)' : 'rgba(255,255,255,0.05)', color: key.environment === 'production' ? 'var(--teal)' : 'var(--text-sec)' }}>{key.environment}</span>
                </td>
                <td style={{ padding: '16px', color: 'var(--text-sec)' }}>{new Date(key.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button className="btn btn-glass" style={{ padding: '6px' }} onClick={() => handleRevoke(key.id)}><Trash2 size={16} color="var(--red)" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
