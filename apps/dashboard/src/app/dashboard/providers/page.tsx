'use client';

import React, { useState } from 'react';
import { useData } from '../../../components/providers/DataProvider.js';
import { DbService } from '../../../lib/db-service.js';
import { NormyProvider, useValidation } from '@normy-validation/react';
import { CustomSelect } from '../../../components/ui/custom-select.js';
import { Star, Edit2, Plus, Shield, AlertCircle } from 'lucide-react';

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

  if (!selectedProject) return <div style={{ color: 'var(--text-sec)' }}>Select a project first.</div>;

  const handleSaveByok = async () => {
    if (!byokForm.title || !byokForm.key) return alert('Please provide title and key');
    if (selectedProject) {
      await DbService.updateByok(selectedProject.id, byokForm.provider, byokForm.key);
      await refreshProjects();
      setShowByokForm(false);
      alert('BYOK Key saved securely.');
    }
  };

  const handleSetDefault = async (providerId: 'gemini' | 'openai' | 'anthropic') => {
    if (selectedProject) {
      const updated = await DbService.updateProject(selectedProject.id, { defaultProvider: providerId });
      if (updated) setSelectedProject(updated);
      await refreshProjects();
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
                <CustomSelect value={byokForm.provider} onChange={val => setByokForm({...byokForm, provider: val as any})} options={[{label: 'Google Gemini', value: 'gemini'}, {label: 'OpenAI', value: 'openai'}, {label: 'Anthropic', value: 'anthropic'}]} />
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
        {['gemini', 'openai', 'anthropic'].map((providerId) => {
          const hasKey = providerId === 'gemini' ? !!selectedProject.geminiApiKey : providerId === 'openai' ? !!selectedProject.openaiApiKey : !!selectedProject.anthropicApiKey;
          if (!hasKey) return null;
          const isProminent = selectedProject.defaultProvider === providerId;
          const providerName = providerId === 'gemini' ? 'Google Gemini' : providerId === 'openai' ? 'OpenAI' : 'Anthropic';
          
          return (
            <div key={providerId} className="card-glass" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16, padding: 24, background: isProminent ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' : 'var(--surface-1)', border: isProminent ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              
              {/* Star Background Graphic for Default */}
              {isProminent && (
                <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05, transform: 'rotate(15deg)', pointerEvents: 'none' }}>
                  <Star size={120} fill="#fff" color="#fff" />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 1 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {isProminent ? <Star size={16} fill="var(--white)" color="var(--white)" /> : <Shield size={16} color="var(--text-sec)" />}
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--white)', letterSpacing: '-0.02em' }}>{providerName}</h3>
                  </div>
                  {isProminent && <span style={{ fontSize: '0.6875rem', background: 'rgba(255,255,255,0.1)', color: 'var(--white)', border: '1px solid rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Primary Provider</span>}
                </div>
                
                <button className="btn btn-glass" style={{ padding: 8, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.05)' }} onClick={() => { setByokForm({ provider: providerId as any, title: providerName, key: '' }); setShowByokForm(true); }}>
                  <Edit2 size={16} color="var(--text-sec)" />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1, marginTop: 'auto' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Active Key</span>
                <div style={{ background: '#000', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 8, fontSize: '0.875rem', color: 'var(--text-sec)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>••••••••••••••••••••</span>
                </div>
              </div>

              {!isProminent && (
                <button onClick={() => handleSetDefault(providerId as any)} className="btn btn-glass" style={{ width: '100%', marginTop: 8, padding: 10, fontSize: '0.8125rem', fontWeight: 600, zIndex: 1 }}>
                  Set as Primary
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
