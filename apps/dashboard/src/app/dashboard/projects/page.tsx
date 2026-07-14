'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '../../../components/providers/DataProvider.js';
import { useAuth } from '../../../components/providers/AuthProvider.js';
import { DbService, type Project } from '../../../lib/db-service.js';
import { FolderKanban, Plus, Star, ArrowRight } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/custom-select.js';
import { EmptyProjectsState } from '../../../components/ui/empty-projects.js';
import confetti from 'canvas-confetti';

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
      
      // Fire confetti from the center of the screen
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1", "#50e3c2"]
      });

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
                position: 'relative',
                height: 250,
                cursor: 'pointer',
                perspective: '1000px',
              }}
              onClick={() => {
                setSelectedProject(proj);
                router.push(`/dashboard/projects/${proj.id}`);
              }}
              onMouseEnter={(e) => { 
                const paper = e.currentTarget.querySelector('.proj-paper') as HTMLElement;
                if (paper) paper.style.transform = 'translateY(-36px)';
                
                const front = e.currentTarget.querySelector('.proj-folder-front') as HTMLElement;
                if (front) front.style.transform = 'rotateX(-6deg)';
              }}
              onMouseLeave={(e) => { 
                const paper = e.currentTarget.querySelector('.proj-paper') as HTMLElement;
                if (paper) paper.style.transform = 'translateY(0)';
                
                const front = e.currentTarget.querySelector('.proj-folder-front') as HTMLElement;
                if (front) front.style.transform = 'rotateX(0deg)';
              }}
            >
              {/* Folder Back */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '92%',
                background: '#151515',
                borderRadius: '12px',
                border: selectedProject?.id === proj.id ? '1px solid var(--teal)' : '1px solid rgba(255,255,255,0.05)',
                transition: 'border-color 0.2s',
              }}>
                {/* Folder Tab */}
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '12px',
                  width: '90px',
                  height: '15px',
                  background: '#151515',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                  borderTop: selectedProject?.id === proj.id ? '1px solid var(--teal)' : '1px solid rgba(255,255,255,0.05)',
                  borderLeft: selectedProject?.id === proj.id ? '1px solid var(--teal)' : '1px solid rgba(255,255,255,0.05)',
                  borderRight: selectedProject?.id === proj.id ? '1px solid var(--teal)' : '1px solid rgba(255,255,255,0.05)',
                  borderBottom: 'none',
                }} />
              </div>

              {/* Form Paper */}
              <div className="proj-paper" style={{
                position: 'absolute',
                bottom: '15px',
                left: '8%',
                right: '8%',
                height: '80%',
                background: '#fdfdfd',
                borderRadius: '8px',
                transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 5
              }}>
                <div style={{ height: 6, width: '100%', background: selectedProject?.id === proj.id ? 'var(--teal)' : '#222' }} />
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontSize: '0.625rem', color: selectedProject?.id === proj.id ? 'var(--teal)' : '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                    Form Template
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#111', lineHeight: 1.15 }}>{proj.name}</h3>
                  
                  {/* Wireframe fields */}
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ height: 10, width: '100%', background: '#eee', borderRadius: 4 }} />
                    <div style={{ height: 10, width: '75%', background: '#eee', borderRadius: 4 }} />
                    <div style={{ height: 10, width: '90%', background: '#eee', borderRadius: 4 }} />
                  </div>
                </div>
              </div>

              {/* Folder Front */}
              <div className="proj-folder-front" style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '72%',
                background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                borderRadius: '12px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                borderLeft: '1px solid rgba(255,255,255,0.05)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 -4px 12px rgba(0,0,0,0.4)',
                transformOrigin: 'bottom center',
                transition: 'transform 0.3s ease',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, paddingRight: 12 }}>
                    <p style={{ color: 'var(--text-sec)', fontSize: '0.8125rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {proj.description || 'No description'}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.625rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-sec)', textTransform: 'capitalize' }}>
                        {proj.defaultProvider}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.625rem', background: proj.status === 'active' ? 'rgba(76,175,145,0.1)' : 'rgba(255,100,100,0.1)', color: proj.status === 'active' ? 'var(--teal)' : 'var(--red)' }}>
                        {proj.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}>
                    {selectedProject?.id === proj.id ? <Star size={16} color="var(--teal)" fill="var(--teal)" /> : <ArrowRight size={16} color="var(--text-sec)" />}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showProjModal && typeof document !== 'undefined' ? createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div className="card-glass" style={{ width: 440, padding: 28 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 20, color: 'var(--white)' }}>New Project</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label" htmlFor="new-proj-name">Project Name <span style={{ color: 'var(--red)' }}>*</span></label>
                <input id="new-proj-name" className="input-field" value={projName} onChange={(e) => { setProjName(e.target.value); setProjSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} placeholder="e.g. User Registration" required />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="new-proj-slug">Slug <span style={{ color: 'var(--red)' }}>*</span></label>
                <input id="new-proj-slug" className="input-field" value={projSlug} onChange={e => setProjSlug(e.target.value)} placeholder="project-slug" required />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="new-proj-desc">Description</label>
                <input id="new-proj-desc" className="input-field" value={projDesc} onChange={(e) => setProjDesc(e.target.value)} placeholder="Describe what this project validates" />
              </div>
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
        </div>,
        document.body
      ) : null}
    </div>
  );
}
