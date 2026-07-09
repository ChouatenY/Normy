'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '../../../../components/providers/DataProvider.js';
import { useAuth } from '../../../../components/providers/AuthProvider.js';
import { DbService, type Project } from '../../../../lib/db-service.js';
import { NormyProvider, useValidation } from '@normy-validation/react';
import { Edit2, ArrowLeft, Trash2, FolderKanban } from 'lucide-react';
import { CustomSelect } from '../../../../components/ui/custom-select.js';

function ValidatedInput({ id, label, value, onChange, question, placeholder, required }: {
  id: string; label: string; value: string; onChange: (v: string) => void; question: string; placeholder?: string; required?: boolean;
}) {
  const v = useValidation({ mode: 'onPause', pauseMs: 1000, question });

  // Sync external value changes into the hook
  useEffect(() => { v.setValue(value); }, [value]);

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

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { user } = useAuth();
  const { projects, selectedProject, setSelectedProject, refreshProjects } = useData();

  const [project, setProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [projName, setProjName] = useState('');
  const [projSlug, setProjSlug] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projProvider, setProjProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [projMinScore, setProjMinScore] = useState(70);

  useEffect(() => {
    const found = projects.find(p => p.id === projectId);
    if (found) {
      setProject(found);
      setProjName(found.name);
      setProjSlug(found.slug);
      setProjDesc(found.description || '');
      setProjProvider(found.defaultProvider);
      setProjMinScore(found.minScore);
      if (!selectedProject || selectedProject.id !== found.id) {
        setSelectedProject(found);
      }
    }
  }, [projectId, projects]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !projName) return;

    const updated = await DbService.updateProject(project.id, {
      name: projName,
      slug: projSlug,
      description: projDesc,
      defaultProvider: projProvider,
      minScore: projMinScore,
    });
    if (updated) {
      setProject(updated);
      setSelectedProject(updated);
    }
    await refreshProjects();
    setIsEditing(false);
  };

  if (!project) {
    return (
      <div style={{ color: 'var(--text-sec)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 48 }}>
        <FolderKanban size={48} style={{ opacity: 0.3 }} />
        <div>Project not found</div>
        <button className="btn btn-glass" onClick={() => router.push('/dashboard/projects')}>← Back to Projects</button>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-glass" onClick={() => router.push('/dashboard/projects')} style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ArrowLeft size={16} /> Back to Projects
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)' }}>{project.name}</h1>
        <button className="btn btn-primary" onClick={() => setIsEditing(!isEditing)}>
          <Edit2 size={16} /> {isEditing ? 'Cancel' : 'Edit Project'}
        </button>
      </div>

      {isEditing ? (
        <NormyProvider apiKey="nrm_live_demo" projectId="00000000-0000-0000-0000-000000000000" apiUrl="" showBadge={false}>
          <div className="card-glass" style={{ padding: 32, maxWidth: 600 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--white)', marginBottom: 20 }}>Edit Project</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ValidatedInput id="proj-name" label="Project Name" value={projName} onChange={setProjName} question="What is the name of this validation project?" placeholder="e.g. User Registration" required />
              <div className="input-group">
                <label className="input-label" htmlFor="proj-slug">Slug</label>
                <input id="proj-slug" className="input-field" value={projSlug} onChange={(e) => setProjSlug(e.target.value)} placeholder="project-slug" />
              </div>
              <ValidatedInput id="proj-desc" label="Description" value={projDesc} onChange={setProjDesc} question="What does this validation project do?" placeholder="Describe the purpose of this project" />
              <div className="input-group">
                <label className="input-label">Default Provider</label>
                <CustomSelect value={projProvider} onChange={(val) => setProjProvider(val as any)} options={[{ label: 'Google Gemini', value: 'gemini' }, { label: 'OpenAI', value: 'openai' }, { label: 'Anthropic', value: 'anthropic' }]} />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="proj-minscore">Min Score Threshold</label>
                <input id="proj-minscore" type="number" className="input-field" value={projMinScore} onChange={(e) => setProjMinScore(Number(e.target.value))} min={0} max={100} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-glass" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </NormyProvider>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card-glass" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 12 }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>Slug</div>
                <div style={{ color: 'var(--white)', fontFamily: 'var(--mono)', fontSize: '0.875rem' }}>{project.slug}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
                <div style={{ color: 'var(--white)', fontSize: '0.875rem' }}>{project.description || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: project.status === 'active' ? 'rgba(76,175,145,0.1)' : 'rgba(255,100,100,0.1)', color: project.status === 'active' ? 'var(--teal)' : 'var(--red)' }}>{project.status}</span>
              </div>
            </div>
          </div>

          <div className="card-glass" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 12 }}>Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>Default Provider</div>
                <div style={{ color: 'var(--white)', fontSize: '0.875rem', textTransform: 'capitalize' }}>{project.defaultProvider}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>Min Score</div>
                <div style={{ color: 'var(--white)', fontSize: '0.875rem' }}>{project.minScore}/100</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>Created</div>
                <div style={{ color: 'var(--white)', fontSize: '0.875rem' }}>{new Date(project.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
