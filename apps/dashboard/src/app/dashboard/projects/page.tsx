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
                height: 280,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                cursor: 'pointer',
                perspective: '1200px',
              }}
              onClick={() => {
                setSelectedProject(proj);
                router.push(`/dashboard/projects/${proj.id}`);
              }}
              onMouseEnter={(e) => { 
                const paper = e.currentTarget.querySelector('.proj-paper') as HTMLElement;
                if (paper) paper.style.transform = 'translateY(-40px)';
                
                const front = e.currentTarget.querySelector('.proj-folder-front') as HTMLElement;
                if (front) {
                  front.style.transform = 'rotateX(-25deg)';
                  front.style.bottom = '10px';
                }
              }}
              onMouseLeave={(e) => { 
                const paper = e.currentTarget.querySelector('.proj-paper') as HTMLElement;
                if (paper) paper.style.transform = 'translateY(0)';
                
                const front = e.currentTarget.querySelector('.proj-folder-front') as HTMLElement;
                if (front) {
                  front.style.transform = 'rotateX(0deg)';
                  front.style.bottom = '0px';
                }
              }}
            >
              
              {/* Exact Folder Back Graphic (320x224) */}
              <div style={{
                position: 'absolute',
                bottom: 24,
                width: '100%',
                maxWidth: 320,
                height: 224,
                filter: 'drop-shadow(0 25px 25px rgba(0,0,0,0.25))'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 128, height: 40, background: 'linear-gradient(to top, #1e1e1e, #2a2a2a)', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }} />
                <div style={{ position: 'absolute', top: 32, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, #1e1e1e, #0a0a0a)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderTopRightRadius: 12, border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)' }} />
                <div style={{ position: 'absolute', top: 40, left: 8, right: 8, bottom: 8, background: '#000', borderRadius: 8, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                
                {/* BIG Title At the Top */}
                <h3 style={{ position: 'absolute', top: 50, left: 24, right: 24, fontSize: '1.4rem', fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0, zIndex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>
                  {proj.name}
                </h3>
              </div>

              {/* Exact Form Paper Graphic (224x288) */}
              <div className="proj-paper" style={{
                position: 'absolute',
                bottom: 10,
                width: '80%',
                maxWidth: 224,
                height: 260,
                background: '#fdfdfd',
                borderRadius: 12,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.2)',
                transformOrigin: 'bottom center',
                transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                overflow: 'hidden',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 16px'
              }}>
                <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Doc Details
                </div>
                <div style={{ color: '#222', fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5, marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {proj.description || 'No description provided for this project.'}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                  <div style={{ height: 10, width: "100%", background: "#f0f0f0", borderRadius: 4 }} />
                  <div style={{ height: 10, width: "85%", background: "#f0f0f0", borderRadius: 4 }} />
                  <div style={{ height: 10, width: "95%", background: "#f0f0f0", borderRadius: 4 }} />
                </div>
              </div>

              {/* Exact Folder Front Graphic (340x176) */}
              <div className="proj-folder-front" style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                maxWidth: 340,
                height: 176,
                transformOrigin: 'bottom center',
                transition: 'transform 0.4s ease, bottom 0.4s ease',
                zIndex: 20,
                pointerEvents: 'none'
              }}>
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #2a2a2a, #111)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.1), 0 -20px 40px rgba(0,0,0,0.8)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '20px' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.625rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-sec)', textTransform: 'capitalize' }}>
                        {proj.defaultProvider}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.625rem', background: proj.status === 'active' ? 'rgba(76,175,145,0.1)' : 'rgba(255,100,100,0.1)', color: proj.status === 'active' ? '#4CAF50' : '#F44336' }}>
                        {proj.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}>
                      <ArrowRight size={16} color="var(--text-sec)" />
                    </div>
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
