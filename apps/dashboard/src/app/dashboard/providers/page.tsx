'use client';

import React, { useState } from 'react';
import { useData } from '../../../components/providers/DataProvider.js';
import { DbService } from '../../../lib/db-service.js';
import { NormyProvider, useValidation } from '@normy-validation/react';
import { CustomSelect } from '../../../components/ui/custom-select.js';
import { Star, Edit2, Plus, Shield, AlertCircle, Trash2 } from 'lucide-react';

import { motion } from 'framer-motion';

function ValidatedKeyTitle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const v = useValidation({ mode: 'onBlur', question: 'What is the name for this BYOK API key configuration?' });

  return (
    <div className="input-group">
      <label className="input-label">Key Title</label>
      <input
        className={`input-field ${v.status === 'error' ? 'has-error' : v.status === 'success' ? 'has-success' : ''}`}
        value={value}
        onChange={(e) => { onChange(e.target.value); v.handleChange(e); }}
        onBlur={v.handleBlur}
        placeholder="e.g. Production Gemini Key"
      />
      {v.status !== 'idle' && v.status !== 'typing' && v.result?.feedback && (
        <div style={{ fontSize: '0.75rem', marginTop: 4, color: v.result.severity === 'success' ? 'var(--teal)' : 'var(--red)' }}>
          {v.result.feedback}
        </div>
      )}
    </div>
  );
}

export default function ProvidersPage() {
  const { selectedProject, setSelectedProject, refreshProjects } = useData();
  const [showByokForm, setShowByokForm] = useState(false);
  const [byokForm, setByokForm] = useState<{ provider: 'gemini' | 'openai' | 'anthropic'; title: string; key: string }>({ provider: 'gemini', title: '', key: '' });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (!selectedProject) return <div style={{ color: 'var(--text-sec)' }}>Select a project first.</div>;

  const handleSaveByok = async () => {
    const trimmedTitle = byokForm.title.trim();
    const trimmedKey = byokForm.key.trim();
    if (!trimmedTitle || !trimmedKey) {
      setToastMessage('Please provide title and key');
      return;
    }
    if (selectedProject) {
      await DbService.updateByok(selectedProject.id, byokForm.provider, trimmedKey, trimmedTitle);
      await refreshProjects();
      setShowByokForm(false);
      setByokForm({ provider: 'gemini', title: '', key: '' });
      setToastMessage('BYOK Key saved securely.');
    }
  };

  const handleSetDefault = async (keyId: string) => {
    if (selectedProject) {
      await DbService.setPrimaryByok(selectedProject.id, keyId);
      await refreshProjects();
      setToastMessage('Primary provider updated.');
    }
  };

  const handleDelete = async (keyId: string) => {
    if (selectedProject) {
      await DbService.deleteByok(selectedProject.id, keyId);
      await refreshProjects();
      setToastMessage('BYOK Key deleted.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)' }}>Providers / BYOK</h1>
        <button className="btn btn-primary" onClick={() => setShowByokForm(true)}><Plus size={16} /> Add Custom Key</button>
      </div>

      {/* Notification / Info banner */}
      <div className="card-glass" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}>
        <div style={{ fontSize: '2rem', padding: '0 8px', filter: 'grayscale(0.2)' }}>
          🔐
        </div>
        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--white)', marginBottom: 4 }}>Bring Your Own Key (BYOK) Environment</h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-sec)' }}>You will not be charged by Normy for AI validation requests. Usage will be billed directly to the respective LLM provider using your supplied key.</p>
        </div>
      </div>

      {showByokForm && (
        <NormyProvider apiKey="nrm_live_demo" projectId="00000000-0000-0000-0000-000000000000" apiUrl="" showBadge={false}>
          <div className="card-glass" style={{ padding: 24, marginBottom: 32 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--white)', marginBottom: 16 }}>Configure BYOK Provider</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="input-group">
                <label className="input-label">Provider</label>
                <CustomSelect style={{ height: '42px', minHeight: '42px' }} value={byokForm.provider} onChange={val => setByokForm({...byokForm, provider: val as any})} options={[{label: 'Google Gemini', value: 'gemini'}, {label: 'OpenAI', value: 'openai'}, {label: 'Anthropic', value: 'anthropic'}]} />
              </div>
              <ValidatedKeyTitle value={byokForm.title} onChange={(val) => setByokForm({...byokForm, title: val})} />
            </div>
            <div className="input-group">
              <label className="input-label">API Key</label>
              <input type="password" className="input-field" value={byokForm.key} onChange={e => setByokForm({...byokForm, key: e.target.value})} placeholder="sk-..." />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-glass" onClick={() => setShowByokForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveByok}>Save Key</button>
            </div>
          </div>
        </NormyProvider>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {(selectedProject.settings?.byokKeys || []).map((keyItem: any) => {
          const isProminent = keyItem.isPrimary;
          const providerLabel = keyItem.provider === 'gemini' ? 'Google Gemini' : keyItem.provider === 'openai' ? 'OpenAI' : 'Anthropic';
          
          return (
            <div key={keyItem.id} className="card-glass" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16, padding: 24, background: isProminent ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' : 'var(--surface-1)', border: isProminent ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              
              {/* Star Background Graphic for Default */}
              {isProminent && (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0, rotate: 0 }}
                  animate={{ scale: 1, opacity: 0.05, rotate: 15 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  style={{ position: 'absolute', top: -20, right: -20, pointerEvents: 'none' }}
                >
                  <Star size={120} fill="#fff" color="#fff" />
                </motion.div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 1 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <button 
                      type="button"
                      onClick={() => !isProminent && handleSetDefault(keyItem.id)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: isProminent ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title={isProminent ? "Primary Provider" : "Click to set as Primary"}
                    >
                      <Star size={16} fill={isProminent ? "var(--white)" : "none"} color={isProminent ? "var(--white)" : "var(--text-sec)"} />
                    </button>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--white)', letterSpacing: '-0.02em' }}>{keyItem.title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                     <span style={{ fontSize: '0.6875rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-sec)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase', fontWeight: 600 }}>{providerLabel}</span>
                     {isProminent && <span style={{ fontSize: '0.6875rem', background: 'rgba(255,255,255,0.1)', color: 'var(--white)', border: '1px solid rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Primary Provider</span>}
                  </div>
                </div>
                
                <button className="btn btn-glass" style={{ padding: 8, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.05)' }} onClick={() => handleDelete(keyItem.id)} title="Delete Key">
                  <Trash2 size={16} color="rgba(255,100,100,0.8)" />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1, marginTop: 'auto' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Active Key</span>
                <div style={{ background: '#000', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 8, fontSize: '0.875rem', color: 'var(--text-sec)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>••••••••••••••••••••</span>
                </div>
              </div>

              {!isProminent && (
                <button onClick={() => handleSetDefault(keyItem.id)} className="btn btn-glass" style={{ width: '100%', marginTop: 8, padding: 10, fontSize: '0.8125rem', fontWeight: 600, zIndex: 1 }}>
                  Set as Primary
                </button>
              )}
            </div>
          );
        })}
        {(selectedProject.settings?.byokKeys || []).length === 0 && (
          <div style={{ color: 'var(--text-sec)', padding: 24, textAlign: 'center', width: '100%', gridColumn: '1 / -1' }}>
            No BYOK keys configured yet. Click "Add Custom Key" to add one.
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'rgba(10, 10, 10, 0.95)',
          border: toastMessage.includes('Please') ? '1px solid var(--red)' : '1px solid var(--teal)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          borderRadius: 8,
          padding: '16px 20px',
          zIndex: 9999,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          backdropFilter: 'blur(12px)',
        }}>
          <span style={{ fontSize: '1.25rem', color: toastMessage.includes('Please') ? 'var(--red)' : 'var(--teal)' }}>
            {toastMessage.includes('Please') ? '✕' : '✓'}
          </span>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{toastMessage}</div>
        </div>
      )}
    </div>
  );
}
