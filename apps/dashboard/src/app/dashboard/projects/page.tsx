'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '../../../components/providers/DataProvider.js';
import { useAuth } from '../../../components/providers/AuthProvider.js';
import { DbService, type Project } from '../../../lib/db-service.js';
import { NormyProvider, useValidation } from '@normy-validation/react';
import { FolderKanban, Plus, Star, ArrowRight } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/custom-select.js';
import { EmptyProjectsState } from '../../../components/ui/empty-projects.js';

function ValidatedInput({ id, label, value, onChange, question, placeholder, required }: {
  id: string; label: string; value: string; onChange: (v: string) => void; question: string; placeholder?: string; required?: boolean;
}) {
  const v = useValidation({ mode: 'onPause', pauseMs: 1000, question });

  return (
    <div className="input-group">
      <label className="input-label" htmlFor={id}>{label} {required && <span style={{ color: 'var(--red)' }}>*</span>}</label>
      <input
        id={id}
        className={`input-field ${v.status === 'error' ? 'has-error' : v.status === 'success' ? 'has-success' : ''}`}
        value={value}
        onChange={(e) => { onChange(e.target.value); v.handleChange(e); }}
        onBlur={v.handleBlur}
        placeholder={placeholder}
        required={required}
      />
      {v.status !== 'idle' && v.status !== 'typing' && (
        <div style={{ fontSize: '0.75rem', marginTop: 4, color: v.result?.severity === 'success' ? 'var(--teal)' : v.result?.severity === 'warning' ? 'var(--amber)' : 'var(--red)' }}>
          {v.isValidating ? 'Validating…' : v.result?.feedback || v.apiError || ''}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { projects, selectedProject, setSelectedProject, refreshProjects } = useData();
  const { user } = useAuth();
  const [showProjModal, setShowProjModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projSlug, setProjSlug] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projProvider, setProjProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [projMinScore, setProjMinScore] = useState(70);
  const [isSaving, setIsSaving] = useState(false);

  const openCreate = () => {
    setProjName('');
    setProjSlug('');
    setProjDesc('');
    setProjProvider('gemini');
    setProjMinScore(70);
    setShowProjModal(true);
  };

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      openCreate();
      // Remove query param without reloading to avoid infinite loops
      window.history.replaceState(null, '', '/dashboard/projects');
    }
  }, [searchParams]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName) return;

    setIsSaving(true);
    try {
      const created = await DbService.createProject(user?.email || 'default@example.com', {
      name: projName,
      slug: projSlug,
      description: projDesc,
      defaultProvider: projProvider,
      minScore: projMinScore
    });
      setSelectedProject(created);
      await refreshProjects();
      setShowProjModal(false);
      router.push(`/dashboard/projects/${created.id}`);
    } catch (err: any) {
      alert(`Failed to create project: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)' }}>Projects</h1>
        {projects.length > 0 && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyProjectsState onCreateProject={openCreate} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.map(proj => (
            <div
              key={proj.id}
              style={{
                padding: 24,
                background: 'var(--surface-1)',
                border: selectedProject?.id === proj.id ? '1px solid var(--teal)' : '1px solid var(--border)',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
              onClick={() => {
                setSelectedProject(proj);
                router.push(`/dashboard/projects/${proj.id}`);
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--white)' }}>{proj.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedProject?.id === proj.id && <Star size={16} color="var(--teal)" fill="var(--teal)" />}
                  <ArrowRight size={16} color="var(--text-sec)" />
                </div>
              </div>
              <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginTop: 8 }}>{proj.description || 'No description'}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-sec)', textTransform: 'capitalize' }}>{proj.defaultProvider}</span>
                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', background: proj.status === 'active' ? 'rgba(76,175,145,0.1)' : 'rgba(255,100,100,0.1)', color: proj.status === 'active' ? 'var(--teal)' : 'var(--red)' }}>{proj.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showProjModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <NormyProvider apiKey="nrm_live_demo" projectId="00000000-0000-0000-0000-000000000000" apiUrl="" showBadge={false}>
            <div className="card-glass" style={{ width: 440, padding: 28 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 20, color: 'var(--white)' }}>New Project</h3>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <ValidatedInput
                  id="new-proj-name"
                  label="Project Name"
                  value={projName}
                  onChange={(val) => { setProjName(val); setProjSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }}
                  question="What is the name of this validation project?"
                  placeholder="e.g. User Registration"
                  required
                />
                <div className="input-group">
                  <label className="input-label" htmlFor="new-proj-slug">Slug</label>
                  <input id="new-proj-slug" className="input-field" value={projSlug} onChange={e => setProjSlug(e.target.value)} placeholder="project-slug" required />
                </div>
                <ValidatedInput
                  id="new-proj-desc"
                  label="Description"
                  value={projDesc}
                  onChange={setProjDesc}
                  question="What does this validation project do?"
                  placeholder="Describe what this project validates"
                />
                <div className="input-group">
                  <label className="input-label">Default Provider</label>
                  <CustomSelect value={projProvider} onChange={(val) => setProjProvider(val as any)} options={[{ label: 'Google Gemini', value: 'gemini' }, { label: 'OpenAI', value: 'openai' }, { label: 'Anthropic', value: 'anthropic' }]} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="btn btn-glass" style={{ flex: 1 }} onClick={() => setShowProjModal(false)} disabled={isSaving}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, filter: isSaving ? 'brightness(0.7)' : 'none', cursor: isSaving ? 'not-allowed' : 'pointer' }} disabled={isSaving}>
                    {isSaving ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </NormyProvider>
        </div>
      )}
    </div>
  );
}
