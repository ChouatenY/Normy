'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../../components/providers/DataProvider.js';
import { DbService } from '../../../lib/db-service.js';
import { Plus, Trash2, Star, ShieldAlert } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/custom-select.js';
import { motion } from 'framer-motion';
import { NormyProvider } from '@normy/sdk-react';

interface ValidatedKeyTitleProps {
  value: string;
  onChange: (val: string) => void;
}

function ValidatedKeyTitle({ value, onChange }: ValidatedKeyTitleProps) {
  const [touched, setTouched] = useState(false);
  const isValid = value.trim().length >= 3;

  return (
    <div className="input-group">
      <label className="input-label">Key Title</label>
      <input
        type="text"
        className="input-field"
        value={value}
        onChange={(e) => { onChange(e.target.value); setTouched(true); }}
        onBlur={() => setTouched(true)}
        placeholder="e.g. Production Gemini Key"
        style={{
          border: touched && !isValid ? '1px solid var(--red)' : undefined
        }}
      />
      {touched && !isValid && (
        <span style={{ fontSize: '0.7rem', color: 'var(--red)', marginTop: 4 }}>
          Title must be at least 3 characters.
        </span>
      )}
    </div>
  );
}

const PROVIDER_MODELS: Record<string, { name: string; default: string; list: { label: string; value: string }[] }> = {
  gemini: {
    name: 'Google Gemini',
    default: 'gemini-2.5-flash-lite',
    list: [
      { label: 'gemini-2.5-flash-lite ★', value: 'gemini-2.5-flash-lite' },
      { label: 'gemini-2.0-flash', value: 'gemini-2.0-flash' },
      { label: 'gemini-2.5-flash', value: 'gemini-2.5-flash' },
      { label: 'gemini-2.5-pro', value: 'gemini-2.5-pro' },
      { label: 'gemini-2.0-pro', value: 'gemini-2.0-pro' }
    ]
  },
  openai: {
    name: 'OpenAI',
    default: 'gpt-4o-mini',
    list: [
      { label: 'gpt-4o-mini ★', value: 'gpt-4o-mini' },
      { label: 'gpt-4o', value: 'gpt-4o' },
      { label: 'gpt-4-turbo', value: 'gpt-4-turbo' },
      { label: 'gpt-4', value: 'gpt-4' },
      { label: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' }
    ]
  },
  anthropic: {
    name: 'Anthropic Claude',
    default: 'claude-3-5-haiku-latest',
    list: [
      { label: 'claude-3-5-haiku-latest ★', value: 'claude-3-5-haiku-latest' },
      { label: 'claude-3-5-sonnet-latest', value: 'claude-3-5-sonnet-latest' },
      { label: 'claude-3-opus-latest', value: 'claude-3-opus-latest' },
      { label: 'claude-3-haiku-20240307', value: 'claude-3-haiku-20240307' },
      { label: 'claude-3-sonnet-20240229', value: 'claude-3-sonnet-20240229' }
    ]
  }
};

export default function ProvidersPage() {
  const { selectedProject, setSelectedProject, refreshProjects } = useData();
  const [showByokForm, setShowByokForm] = useState(false);
  const [byokForm, setByokForm] = useState<{ provider: 'gemini' | 'openai' | 'anthropic'; title: string; key: string }>({ provider: 'gemini', title: '', key: '' });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [dynamicProviders, setDynamicProviders] = useState<any[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  const fetchDynamicProviders = useCallback(async () => {
    if (!selectedProject) return;
    setIsLoadingProviders(true);
    try {
      const data = await DbService.getProjectProviders(selectedProject.id);
      if (data && data.providers) {
        setDynamicProviders(data.providers);
      }
    } catch (e) {
      console.error('Failed to fetch dynamic providers:', e);
    } finally {
      setIsLoadingProviders(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchDynamicProviders();
  }, [selectedProject, fetchDynamicProviders]);

  useEffect(() => {
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
      await fetchDynamicProviders();
      setShowByokForm(false);
      setByokForm({ provider: 'gemini', title: '', key: '' });
      setToastMessage('BYOK Key saved securely.');
    }
  };

  const handleUpdateModel = async (provider: string, modelName: string) => {
    if (selectedProject) {
      const settingsKey = `${provider}Model`;
      await DbService.updateProject(selectedProject.id, {
        settings: {
          ...(selectedProject.settings || {}),
          [settingsKey]: modelName
        }
      });
      await refreshProjects();
      const capitalized = provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'Anthropic';
      setToastMessage(`${capitalized} model updated.`);
    }
  };

  const handleSetDefault = async (keyId: string) => {
    if (selectedProject) {
      await DbService.setPrimaryByok(selectedProject.id, keyId);
      await refreshProjects();
      await fetchDynamicProviders();
      setToastMessage('Primary provider updated.');
    }
  };

  const handleDelete = async (keyId: string) => {
    if (selectedProject) {
      await DbService.deleteByok(selectedProject.id, keyId);
      await refreshProjects();
      await fetchDynamicProviders();
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

      {/* Provider Model Selection */}
      {['gemini', 'openai', 'anthropic'].map((provider) => {
        const hasProvider = (selectedProject.settings?.byokKeys || []).some((k: any) => k.provider === provider);
        if (!hasProvider) return null;

        const pInfo = PROVIDER_MODELS[provider];
        const settingsKey = `${provider}Model`;
        const currentValue = (selectedProject.settings as any)[settingsKey] || pInfo.default;

        const dynamicProviderInfo = dynamicProviders.find((p: any) => p.name === provider);
        const hasWarning = provider === 'gemini' && (dynamicProviderInfo?.status === 'disabled' || (dynamicProviderInfo?.availableModels || []).length === 0);

        // Check if custom option needs to be added
        let options = [...pInfo.list];
        if (provider === 'gemini') {
          if (dynamicProviderInfo && dynamicProviderInfo.availableModels && dynamicProviderInfo.availableModels.length > 0) {
            options = dynamicProviderInfo.availableModels.map((m: string) => {
              const isRecommended = m === 'gemini-2.5-flash-lite';
              return {
                label: `${m}${isRecommended ? ' ★' : ''}`,
                value: m
              };
            });
          } else if (hasWarning) {
            options = [{ label: '⚠️ No models found', value: '' }];
          }
        }

        const isListed = options.some((m) => m.value === currentValue);
        if (!isListed && currentValue && !hasWarning) {
          options.push({ label: currentValue, value: currentValue });
        }

        return (
          <div key={provider} className="card-glass" style={{ padding: 24, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16, border: hasWarning ? '1px solid var(--red)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>{pInfo.name} Model</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-sec)' }}>Select the model to use for {pInfo.name} BYOK requests.</p>
              </div>
              <div style={{ width: 250, flexShrink: 0 }}>
                <CustomSelect 
                  value={hasWarning ? '' : currentValue} 
                  onChange={val => !hasWarning && handleUpdateModel(provider, val)} 
                  options={options} 
                  disabled={hasWarning}
                  style={hasWarning ? { border: '1px solid var(--red)', color: 'var(--red)' } : undefined}
                />
              </div>
            </div>
            {hasWarning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--red)', fontSize: '0.8125rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.05)', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>⚠️ No models found for this Gemini API key. Please check your credentials or verify your project billing setup on Google AI Studio.</span>
              </div>
            )}
          </div>
        );
      })}

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
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', marginTop: 8 }}>
                    Model: <span style={{ color: 'var(--white)', fontFamily: 'var(--mono)' }}>{
                      keyItem.provider === 'gemini' ? ((selectedProject.settings as any)?.geminiModel || 'gemini-2.5-flash-lite') :
                      keyItem.provider === 'openai' ? ((selectedProject.settings as any)?.openaiModel || 'gpt-4o-mini') :
                      keyItem.provider === 'anthropic' ? ((selectedProject.settings as any)?.anthropicModel || 'claude-3-5-haiku-latest') : 'Default'
                    }</span>
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
