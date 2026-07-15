'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '../../../../components/providers/DataProvider.js';
import { useAuth } from '../../../../components/providers/AuthProvider.js';
import { DbService, type Project } from '../../../../lib/db-service.js';
import { NormyProvider, useValidation } from '@normy-validation/react';
import { Edit2, ArrowLeft, Trash2, FolderKanban, AlertTriangle, HelpCircle } from 'lucide-react';
import { CustomSelect } from '../../../../components/ui/custom-select.js';

function ToggleSwitch({ checked, onChange, label, tooltip }: { checked: boolean; onChange: (v: boolean) => void; label: string; tooltip: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--white)', fontWeight: 500 }}>{label}</span>
        <div style={{ display: 'flex', cursor: 'help' }} title={tooltip}>
          <HelpCircle size={14} color="var(--text-sec)" />
        </div>
      </div>
      <div 
        onClick={() => onChange(!checked)}
        style={{ width: 40, height: 24, borderRadius: 12, background: checked ? '#fff' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
      >
        <div style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 20, height: 20, borderRadius: 10, background: checked ? '#000' : '#fff', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
      </div>
    </div>
  );
}

function WheelPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const itemHeight = 40;
  const items = Array.from({ length: 101 }, (_, i) => i);
  
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = value * itemHeight;
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollTop / itemHeight);
    if (items[index] !== undefined && items[index] !== value) {
      onChange(items[index]);
    }
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="no-scrollbar"
      style={{ 
        height: itemHeight * 3, 
        width: 120, 
        overflowY: 'scroll', 
        scrollSnapType: 'y mandatory', 
        position: 'relative', 
        border: '1px solid var(--border)', 
        borderRadius: 12, 
        background: 'var(--surface-1)', 
        msOverflowStyle: 'none', 
        scrollbarWidth: 'none',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
      }}
    >
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      <div style={{ position: 'sticky', top: itemHeight, height: itemHeight, width: '100%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }} />
      <div style={{ height: itemHeight, flexShrink: 0 }} /> 
      {items.map(item => (
        <div key={item} style={{ height: itemHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center', color: item === value ? 'var(--white)' : 'var(--text-sec)', fontSize: item === value ? '1.25rem' : '1rem', fontWeight: item === value ? 700 : 400, transition: 'all 0.2s', cursor: 'pointer' }} onClick={() => { onChange(item); if (containerRef.current) containerRef.current.scrollTo({ top: item * itemHeight, behavior: 'smooth' }); }}>
          {item}
        </div>
      ))}
      <div style={{ height: itemHeight, flexShrink: 0 }} />
    </div>
  );
}

function ValidatedInput({ id, label, value, onChange, question, placeholder, required, multiline }: {
  id: string; label: string; value: string; onChange: (v: string) => void; question: string; placeholder?: string; required?: boolean; multiline?: boolean;
}) {
  const v = useValidation({ mode: 'onPause', pauseMs: 1000, question });

  // Sync external value changes into the hook
  useEffect(() => { v.setValue(value); }, [value]);

  return (
    <div className="input-group">
      <label className="input-label" htmlFor={id}>{label} {required && <span style={{ color: 'var(--red)' }}>*</span>}</label>
      {multiline ? (
        <textarea
          id={id}
          className={`input-field ${v.status === 'error' ? 'has-error' : v.status === 'success' ? 'has-success' : ''}`}
          style={{ minHeight: 100, paddingTop: 12, paddingBottom: 12, resize: 'vertical' }}
          value={value}
          onChange={(e) => { onChange(e.target.value); v.handleChange(e); }}
          onBlur={v.handleBlur}
          placeholder={placeholder}
          required={required}
        />
      ) : (
        <input
          id={id}
          className={`input-field ${v.status === 'error' ? 'has-error' : v.status === 'success' ? 'has-success' : ''}`}
          value={value}
          onChange={(e) => { onChange(e.target.value); v.handleChange(e); }}
          onBlur={v.handleBlur}
          placeholder={placeholder}
          required={required}
        />
      )}
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
  const [isSaving, setIsSaving] = useState(false);
  const [projName, setProjName] = useState('');
  const [projSlug, setProjSlug] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projProvider, setProjProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [projMinScore, setProjMinScore] = useState(70);
  const [projPauseDelayMs, setProjPauseDelayMs] = useState(2000);
  const [projShieldEnabled, setProjShieldEnabled] = useState(false);
  const [projStoreInputText, setProjStoreInputText] = useState(true);
  const [projDefaultValidationMode, setProjDefaultValidationMode] = useState<'onBlur' | 'onPause' | 'onSubmit'>('onPause');
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const found = projects.find(p => p.id === projectId);
    if (found) {
      setProject(found);
      setProjName(found.name);
      setProjSlug(found.slug);
      setProjDesc(found.description || '');
      setProjProvider(found.defaultProvider);
      setProjMinScore(found.settings?.minScore ?? found.minScore ?? 70);
      setProjPauseDelayMs(found.settings?.pauseDelayMs ?? 2000);
      setProjShieldEnabled(found.settings?.shieldEnabled ?? false);
      setProjStoreInputText(found.settings?.storeInputText ?? true);
      setProjDefaultValidationMode(found.settings?.defaultValidationMode ?? 'onPause');
      if (!selectedProject || selectedProject.id !== found.id) {
        setSelectedProject(found);
      }
    }
  }, [projectId, projects]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !projName) return;

    setIsSaving(true);
    const updated = await DbService.updateProject(project.id, {
      name: projName,
      slug: projSlug,
      description: projDesc,
      defaultProvider: projProvider,
      minScore: projMinScore,
      settings: {
        ...(project.settings || {}),
        minScore: projMinScore,
        pauseDelayMs: projPauseDelayMs,
        shieldEnabled: projShieldEnabled,
        storeInputText: projStoreInputText,
        defaultValidationMode: projDefaultValidationMode
      }
    });
    if (updated) {
      setProject(updated);
      setSelectedProject(updated);
    }
    await refreshProjects();
    setIsSaving(false);
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

  const handleDelete = async () => {
    if (deleteConfirmName !== project.name) return;
    setIsDeleting(true);
    await DbService.deleteProject(project.id);
    await refreshProjects();
    router.push('/dashboard/projects');
  };

  return (
    <div>
      <button className="btn btn-glass" onClick={() => router.push('/dashboard/projects')} style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ArrowLeft size={16} /> Back to Projects
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)' }}>{project.name}</h1>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <NormyProvider apiKey="nrm_live_demo" projectId="00000000-0000-0000-0000-000000000000" apiUrl="" showBadge={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          
          {/* General Details Card */}
          <div className="card-glass" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--white)' }}>General Details</h3>
            
            <ValidatedInput id="proj-name" label="Project Name" value={projName} onChange={setProjName} question="What is the name of this validation project?" placeholder="e.g. User Registration" required />
            
            <div className="input-group">
              <label className="input-label" htmlFor="proj-slug">URL Slug</label>
              <input id="proj-slug" className="input-field" value={projSlug} onChange={(e) => setProjSlug(e.target.value)} placeholder="project-slug" />
            </div>
            
            <ValidatedInput id="proj-desc" label="Description" value={projDesc} onChange={setProjDesc} question="What does this validation project do?" placeholder="Describe the purpose of this project" multiline />
            
            <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-sec)' }}>Status</span>
              <span style={{ padding: '2px 8px', borderRadius: 12, background: project.status === 'active' ? 'rgba(76,175,145,0.1)' : 'rgba(255,100,100,0.1)', color: project.status === 'active' ? 'var(--teal)' : 'var(--red)' }}>
                {project.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
          </div>

          {/* Validation Engine Settings Card */}
          <div className="card-glass" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--white)' }}>Validation Engine Settings</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="input-group">
                <label className="input-label">Default AI Provider</label>
                <CustomSelect style={{ height: 44 }} value={projProvider} onChange={(val) => setProjProvider(val as any)} options={[
                  { label: 'Google Gemini', value: 'gemini' }, 
                  { label: 'OpenAI GPT', value: 'openai' }, 
                  { label: 'Anthropic Claude', value: 'anthropic' }
                ]} />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="proj-minscore">Min Score Threshold (0-100)</label>
                <WheelPicker value={projMinScore} onChange={setProjMinScore} />
              </div>
            </div>

            <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Advanced Behavior</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                 <div className="input-group">
                   <label className="input-label">Default Mode</label>
                   <CustomSelect style={{ height: 44 }} value={projDefaultValidationMode} onChange={val => setProjDefaultValidationMode(val as any)} options={[
                     {label: 'On Pause (Typing)', value: 'onPause'}, 
                     {label: 'On Blur', value: 'onBlur'}, 
                     {label: 'On Submit', value: 'onSubmit'}
                   ]} />
                 </div>
                 <div className="input-group">
                   <label className="input-label" htmlFor="proj-pausedelay">Pause Delay (ms)</label>
                   <input id="proj-pausedelay" type="number" className="input-field" value={projPauseDelayMs} onChange={e => setProjPauseDelayMs(Number(e.target.value))} step={100} min={500} max={5000} />
                 </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                 <ToggleSwitch 
                    label="Store Input Text (Privacy)"
                    tooltip="If enabled, the raw text inputted by users will be securely stored in your dashboard logs for quality analysis."
                    checked={projStoreInputText} 
                    onChange={setProjStoreInputText} 
                 />
                 <ToggleSwitch 
                    label="Enable Normy Shield"
                    tooltip="Automatically blocks profane, harmful, or adversarial prompts before hitting the AI."
                    checked={projShieldEnabled} 
                    onChange={setProjShieldEnabled} 
                 />
              </div>
            </div>
            
          </div>
        </div>
      </NormyProvider>

      {/* Danger Zone */}
      <div className="card-glass" style={{ marginTop: 24, padding: 24, border: '1px solid rgba(255,100,100,0.3)', background: 'rgba(255,100,100,0.02)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--red)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} /> Danger Zone
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-sec)', marginBottom: 16 }}>
            Permanently delete this project and all of its associated API keys and analytics data. This action cannot be undone.
          </p>
          <button className="btn btn-glass" style={{ color: 'var(--red)', border: '1px solid rgba(255,100,100,0.5)' }} onClick={() => setShowDeleteModal(true)}>
            Delete Project
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: 440, padding: 32 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--white)', marginBottom: 8 }}>Delete Project?</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-sec)', marginBottom: 24, lineHeight: 1.5 }}>
              You are about to delete the project <strong style={{ color: 'var(--white)' }}>{project.name}</strong>. All API keys will be revoked, and all validation logs and analytics will be permanently lost.
            </p>
            <div className="input-group" style={{ marginBottom: 24 }}>
              <label className="input-label">Type <strong>{project.name}</strong> to confirm</label>
              <input className="input-field" value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} placeholder={project.name} />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-glass" onClick={() => { setShowDeleteModal(false); setDeleteConfirmName(''); }}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--red)' }} onClick={handleDelete} disabled={deleteConfirmName !== project.name || isDeleting}>
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
