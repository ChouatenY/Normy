'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../../components/providers/DataProvider.js';
import { DbService } from '../../../lib/db-service.js';
import { KeyRound, Plus, Trash2, Copy, Check } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/custom-select.js';

export default function ApiKeysPage() {
  const { selectedProject, apiKeys, refreshApiKeys } = useData();
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'development' | 'production'>('development');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, keyId: string, keyName: string } | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Map of prefix -> full raw key for keys generated locally
  const [newlyCreatedKeys, setNewlyCreatedKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('normy_session_keys');
      if (saved) {
        setNewlyCreatedKeys(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load session keys from localStorage', e);
    }
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newKeyName) return;
    const apiKey = await DbService.createApiKey(selectedProject.id, newKeyName, newKeyEnv);
    if (apiKey) {
      setGeneratedKey(apiKey);
      const prefix = apiKey.substring(0, 18);
      const updatedKeys = {
        ...newlyCreatedKeys,
        [prefix]: apiKey
      };
      setNewlyCreatedKeys(updatedKeys);
      localStorage.setItem('normy_session_keys', JSON.stringify(updatedKeys));
    }
    setNewKeyName('');
    await refreshApiKeys();
  };

  const confirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteModal && deleteConfirmName.trim().toLowerCase() === deleteModal.keyName.trim().toLowerCase()) {
      setIsDeleting(true);
      await DbService.revokeApiKey(deleteModal.keyId);
      await refreshApiKeys();
      setDeleteModal(null);
      setDeleteConfirmName('');
      setIsDeleting(false);
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
        <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input className="input-field" style={{ flex: 2, height: '42px', margin: 0 }} value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key Name" required />
          <div style={{ flex: 1, height: '42px' }}>
            <CustomSelect value={newKeyEnv} onChange={val => setNewKeyEnv(val as any)} options={[{label: 'Development', value: 'development'}, {label: 'Production', value: 'production'}]} style={{ height: '100%' }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '42px', margin: 0 }}><Plus size={16} /> Create</button>
        </form>
        {generatedKey && (
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.05)', color: 'var(--text-sec)', borderRadius: 8, marginTop: 16, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ display: 'block', marginBottom: 8, color: 'var(--white)' }}>Key Created Successfully. Copy it now, you will not see it again:</strong>
              <code style={{ fontSize: '1.1rem', background: '#000', padding: '6px 12px', borderRadius: 4, color: 'var(--teal)', fontWeight: 700, letterSpacing: '0.5px' }}>{generatedKey}</code>
            </div>
            <button
              onClick={() => handleCopy(generatedKey)}
              className="btn btn-glass"
              style={{ padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center' }}
            >
              {copiedKey === generatedKey ? <Check size={16} color="var(--teal)" /> : <Copy size={16} />}
              {copiedKey === generatedKey ? 'Copied' : 'Copy'}
            </button>
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
            {apiKeys.filter(key => !key.revokedAt).map(key => {
              const fullKey = newlyCreatedKeys[key.keyPrefix];
              const displayCopyTarget = fullKey || key.keyPrefix;
              const hasFullKey = !!fullKey;

              return (
                <tr key={key.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--white)' }}>
                  <td style={{ padding: '16px' }}>{key.name}</td>
                  <td style={{ padding: '16px', fontFamily: 'var(--mono)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {key.keyPrefix}••••••••
                      <button 
                        onClick={() => handleCopy(displayCopyTarget)} 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          color: hasFullKey ? 'var(--teal)' : 'var(--text-sec)',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 2
                        }}
                        title={hasFullKey ? "Copy Full API Key" : "Copy Prefix (Full key only available on creation)"}
                      >
                        {copiedKey === displayCopyTarget ? <Check size={14} color="var(--teal)" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: key.environment === 'production' ? 'rgba(76,175,145,0.1)' : 'rgba(255,255,255,0.05)', color: key.environment === 'production' ? 'var(--teal)' : 'var(--text-sec)' }}>{key.environment}</span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-sec)' }}>{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button className="btn btn-glass" style={{ padding: '6px' }} onClick={() => setDeleteModal({ isOpen: true, keyId: key.id, keyName: key.name })}><Trash2 size={16} color="var(--red)" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleteModal && typeof document !== 'undefined' ? createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div className="card-glass" style={{ width: 440, padding: 28, position: 'relative' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 12, color: 'var(--white)' }}>Revoke API Key</h3>
            
            <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: 20 }}>
              This action is permanent and cannot be undone. <span style={{ color: 'var(--red)', fontWeight: 600 }}>Any applications currently using this API key will immediately lose access and start failing.</span>
            </p>

            <form onSubmit={confirmDelete} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label" style={{ marginBottom: 8 }}>
                  To confirm, type <strong style={{ color: 'var(--white)' }}>{deleteModal.keyName}</strong> below:
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={deleteConfirmName} 
                  onChange={(e) => setDeleteConfirmName(e.target.value)} 
                  placeholder={deleteModal.keyName} 
                  required 
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn btn-glass" style={{ flex: 1 }} onClick={() => { setDeleteModal(null); setDeleteConfirmName(''); }} disabled={isDeleting}>Cancel</button>
                <button 
                  type="submit" 
                  className="btn" 
                  style={{ 
                    flex: 1, 
                    background: deleteConfirmName.trim().toLowerCase() === deleteModal.keyName.trim().toLowerCase() ? 'var(--red)' : 'var(--border)', 
                    color: deleteConfirmName.trim().toLowerCase() === deleteModal.keyName.trim().toLowerCase() ? 'var(--white)' : 'var(--text-sec)', 
                    border: 'none',
                    cursor: deleteConfirmName.trim().toLowerCase() === deleteModal.keyName.trim().toLowerCase() && !isDeleting ? 'pointer' : 'not-allowed',
                    opacity: isDeleting ? 0.7 : 1
                  }} 
                  disabled={deleteConfirmName.trim().toLowerCase() !== deleteModal.keyName.trim().toLowerCase() || isDeleting}
                >
                  {isDeleting ? 'Revoking...' : 'Revoke Key'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
