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
      <div className="card-glass" style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(90deg, rgba(76,175,145,0.05) 0%, rgba(255,255,255,0.02) 100%)', borderColor: 'rgba(76,175,145,0.2)' }}>
        <div style={{ padding: 12, background: 'rgba(76,175,145,0.1)', borderRadius: 8 }}>
          <AlertCircle size={24} color="var(--teal)" />
        </div>
        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--white)', marginBottom: 4 }}>You are on the BYOK (Bring Your Own Key) Tier</h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-sec)' }}>You are not being charged by Normy for API validations. Your configured provider key will be billed directly by the LLM provider.</p>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {['gemini', 'openai', 'anthropic'].map((providerId) => {
          const hasKey = providerId === 'gemini' ? !!selectedProject.geminiApiKey : providerId === 'openai' ? !!selectedProject.openaiApiKey : !!selectedProject.anthropicApiKey;
          if (!hasKey) return null;
          const isProminent = selectedProject.defaultProvider === providerId;
          const providerName = providerId === 'gemini' ? 'Google Gemini' : providerId === 'openai' ? 'OpenAI' : 'Anthropic';
          
          return (
            <div key={providerId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Shield size={14} color="var(--teal)" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--white)' }}>{providerName} Key</span>
                  {isProminent && <span style={{ fontSize: '0.625rem', background: 'rgba(76,175,145,0.1)', color: 'var(--teal)', border: '1px solid rgba(76,175,145,0.2)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', fontWeight: 700 }}>Default</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', fontFamily: 'var(--mono)' }}>•••••••••••••••• (Encrypted)</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleSetDefault(providerId as any)} className={isProminent ? 'btn-liquid-metal' : 'btn btn-glass'} style={{ padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={16} fill={isProminent ? '#fff' : 'none'} color={isProminent ? '#fff' : 'var(--text-sec)'} />
                </button>
                <button className="btn btn-glass" style={{ padding: 8 }} onClick={() => { setByokForm({ provider: providerId as any, title: providerName, key: '' }); setShowByokForm(true); }}>
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
