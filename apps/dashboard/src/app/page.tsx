'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { DbService } from '../lib/db-service.js';
import type { Project, ApiKey } from '../lib/db-service.js';
import { InteractiveDocs } from '../components/InteractiveDocs.js';
import { PlaygroundView } from '../components/PlaygroundView.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiquidMetalButton } from '../components/LiquidMetalButton.js';
import { Hero } from '../components/ui/hero-1.js';
import { InteractiveFolderGallery } from '../components/ui/interactive-folder-gallery.js';
import { AiHeroBackground } from '../components/ui/ai-hero-background.js';
import { motion, AnimatePresence } from 'framer-motion';

// Active Form Components
import { CancellationForm } from '../components/CancellationForm.js';
import { JobApplicationForm } from '../components/JobApplicationForm.js';
import { FeedbackForm } from '../components/FeedbackForm.js';
import { GovernmentForm } from '../components/GovernmentForm.js';
import { SurveyForm } from '../components/SurveyForm.js';
import { NormyProvider } from '@normy-validation/react';
import { Features } from '../components/ui/features-6.js';

type ActiveSection = 'overview' | 'projects' | 'keys' | 'docs' | 'playground' | 'settings';

export default function AppMain() {
  // Authentication state
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Landing Page vs Interactive Docs switcher (for non-logged-in users)
  const [landingSection, setLandingSection] = useState<'sandbox' | 'docs'>('sandbox');

  // Form Live Demo active tab (for non-logged-in users)
  const [activeFormTab, setActiveFormTab] = useState<'cancel' | 'job' | 'feedback' | 'gov' | 'survey' | null>(null);
  const [pendingFormTab, setPendingFormTab] = useState<'cancel' | 'job' | 'feedback' | 'gov' | 'survey' | null>(null);

  const handleSelectForm = (id: string) => {
    // Start closing the folder immediately
    setPendingFormTab(id as any);
    // Wait for the folder collapse animation to finish, then shift layout and show form
    setTimeout(() => {
      setActiveFormTab(id as any);
    }, 450);
  };

  const handleCloseForm = () => {
    setActiveFormTab(null);
    setPendingFormTab(null);
  };

  // Dashboard Section routing state (for logged-in users)
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');

  // Application Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

  // Project modal / form state
  const [showProjModal, setShowProjModal] = useState(false);
  const [editingProj, setEditingProj] = useState<Project | null>(null);
  const [projName, setProjName] = useState('');
  const [projSlug, setProjSlug] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projProvider, setProjProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [projMinScore, setProjMinScore] = useState(70);

  // API Key state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'development' | 'production'>('development');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // Settings / Profile states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // API host determination
  const apiHostUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001';

  // Load user session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) {
        setUser(session.user);
        setName(session.user.user_metadata?.name || '');
        setNewName(session.user.user_metadata?.name || '');
        setNewEmail(session.user.email || '');
      }
    });
  }, []);

  // Fetch projects and keys when user changes
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  // Fetch keys when selected project changes
  useEffect(() => {
    if (selectedProject) {
      loadApiKeys(selectedProject.id);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    const list = await DbService.getProjects(user?.id || 'default_user');
    setProjects(list);
    if (list.length > 0 && !selectedProject) {
      setSelectedProject(list[0] ?? null);
    }
  };

  const loadApiKeys = async (projId: string) => {
    const list = await DbService.getApiKeys(projId);
    setApiKeys(list);
  };

  // --- Auth Handlers ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthMessage('Registration successful! Please log in.');
      setAuthMode('login');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
    } else {
      setUser(data.user);
      setName(data.user.user_metadata?.name || '');
      setNewName(data.user.user_metadata?.name || '');
      setNewEmail(data.user.email || '');
      setShowAuthModal(false); // Close modal on success
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSelectedProject(null);
    setProjects([]);
    setApiKeys([]);
    setLandingSection('sandbox');
  };

  // --- Project Handlers ---
  const openCreateProject = () => {
    setEditingProj(null);
    setProjName('');
    setProjSlug('');
    setProjDesc('');
    setProjProvider('gemini');
    setProjMinScore(70);
    setShowProjModal(true);
  };

  const openEditProject = (proj: Project) => {
    setEditingProj(proj);
    setProjName(proj.name);
    setProjSlug(proj.slug);
    setProjDesc(proj.description);
    setProjProvider(proj.defaultProvider);
    setProjMinScore(proj.minScore);
    setShowProjModal(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName) return;

    if (editingProj) {
      const updated = await DbService.updateProject(editingProj.id, {
        name: projName,
        slug: projSlug,
        description: projDesc,
        defaultProvider: projProvider,
        minScore: projMinScore
      });
      if (updated) {
        if (selectedProject?.id === updated.id) {
          setSelectedProject(updated);
        }
        await loadProjects();
      }
    } else {
      const created = await DbService.createProject(user?.id || 'default_user', {
        name: projName,
        slug: projSlug,
        description: projDesc,
        defaultProvider: projProvider,
        minScore: projMinScore
      });
      setSelectedProject(created);
      await loadProjects();
    }
    setShowProjModal(false);
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('Are you sure you want to delete this project? All associated API keys will be deleted.')) {
      await DbService.deleteProject(id);
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
      await loadProjects();
    }
  };

  // --- API Key Handlers ---
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newKeyName) return;

    const { apiKey } = await DbService.generateApiKey(selectedProject.id, newKeyName, newKeyEnv);
    setGeneratedKey(apiKey);
    setNewKeyName('');
    await loadApiKeys(selectedProject.id);
  };

  const handleRevokeKey = async (id: string) => {
    if (confirm('Are you sure you want to revoke this API key? Applications using this key will immediately fail validation.')) {
      await DbService.revokeApiKey(id);
      if (selectedProject) {
        await loadApiKeys(selectedProject.id);
      }
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this key record?')) {
      await DbService.deleteApiKey(id);
      if (selectedProject) {
        await loadApiKeys(selectedProject.id);
      }
    }
  };

  // --- Profile Settings ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({
      data: { name: newName },
      email: newEmail
    });
    if (error) {
      alert(error.message);
    } else {
      setName(newName);
      alert('Profile updated successfully!');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  /* ── Third-Party OAuth SVGs ── */
  const GoogleLogo = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  );

  const GitHubLogo = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8, fill: theme === 'light' ? '#000' : '#fff' }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );

  // --- Render Landing Page (Unauthenticated State) ---
  if (!user) {
    return (
      <div className="app-shell">
        
        <header className="top-nav">
          <div className="nav-logo" onClick={() => setLandingSection('sandbox')} style={{ cursor: 'pointer' }}>
            <img
              src="/logo.png"
              alt="Normy logo"
              style={{
                height: 24,
                width: 'auto',
                filter: theme === 'light' ? 'invert(1)' : 'none',
                transition: 'filter 0.3s ease'
              }}
            />
            <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--white)' }}>NORMY</span>
            <span className="nav-badge">Open Source</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Toggle views between live forms demo and API docs — liquid metal */}
            {landingSection === 'sandbox' ? (
              <LiquidMetalButton 
                label="API & SDK Docs" 
                onClick={() => setLandingSection('docs')}
                width={150}
                height={34}
              />
            ) : (
              <LiquidMetalButton 
                label="Live Sandbox" 
                onClick={() => setLandingSection('sandbox')}
                width={140}
                height={34}
              />
            )}

            {/* Console Login — round profile icon button */}
            <LiquidMetalButton
              onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
              width={34}
              height={34}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              }
            />

            {/* Theme switcher — round liquid metal button with SVG sun/moon */}
            <LiquidMetalButton
              onClick={toggleTheme}
              width={34}
              height={34}
              icon={
                theme === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )
              }
            />
          </div>
        </header>

        {/* ══ Main Landing Page Layout ══ */}
        <main className="main-wrapper" style={{ flex: 1 }}>
          
          {landingSection === 'docs' ? (
            /* --- Documentation Layout --- */
            <div>
              <div className="docs-header-container">
                <h2 className="docs-header-title">Developer Integration Kit</h2>
              </div>
              <InteractiveDocs />
            </div>
          ) : (
            /* --- Standard SDK Sandbox Landing Page Layout --- */
            <div>
              {/* Hero Banner rebuilt with component */}
              <Hero
                theme={theme}
                eyebrow="AI-Powered Form Validation v0.1.0"
                title="Say goodbye to regex form errors."
                subtitle="Normy analyzes user input context and semantics in real time. Wrap fields with our SDK to suggest immediate helpful improvements, score answers, and guide users to write great text content."
                ctaLabel="Try Interactive Sandbox"
                onCtaClick={() => {
                  const element = document.getElementById('sandbox-tabs');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />

              {/* ── Features Ecosystem Section ── */}
              <Features />

              {/* ── Interactive Folder Gallery ── */}
              <motion.div 
                id="sandbox-tabs" 
                initial={{ opacity: 0, y: 100 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                style={{ 
                  position: "relative", 
                  width: "100%", 
                  overflow: "hidden", 
                  minHeight: "900px", 
                  display: "flex", 
                  flexDirection: "column",
                  alignItems: "center", 
                  paddingTop: "60px",
                }}
              >
                {/* 3D Background behind the folder gallery */}
                <AiHeroBackground intensity={activeFormTab ? 'high' : 'normal'} />

                {/* Dark overlay to dim the background when a form is active */}
                <motion.div
                  animate={{ opacity: activeFormTab ? 0.7 : 0 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: '#000000',
                    zIndex: 1,
                    pointerEvents: 'none'
                  }}
                />

                {/* Top gradient overlay — fades from dark to transparent, matching hero bottom */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '200px',
                  background: 'linear-gradient(to bottom, #000000 0%, transparent 100%)',
                  zIndex: 2,
                  pointerEvents: 'none',
                }} />

                {/* Section Header */}
                <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', marginBottom: '40px', padding: '0 20px' }}>
                  <h2 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px', background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Experience the Sandbox
                  </h2>
                  <p style={{ color: '#888', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                    Select a template below to witness the AI validation engine in real-time. 
                    <br/><span style={{ color: '#bbb' }}>Drag a card or click to open the folder.</span>
                  </p>
                </div>
                
                {/* Horizontal flex container: folder gallery + active form side by side */}
                <div style={{ 
                  position: "relative", 
                  width: "100%", 
                  flex: 1, 
                  display: "flex", 
                  alignItems: "flex-start", 
                  justifyContent: "center", 
                  zIndex: 10,
                  gap: "32px",
                  padding: "0 24px",
                }}>
                  {/* Folder gallery — shifts left when a form is selected */}
                  <motion.div
                    animate={{
                      flex: activeFormTab ? "0 0 320px" : "1 1 auto",
                      opacity: activeFormTab ? 0.45 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "500px", cursor: activeFormTab ? "pointer" : "default" }}
                    onClick={() => {
                      if (activeFormTab) {
                        handleCloseForm();
                      }
                    }}
                  >
                    <InteractiveFolderGallery 
                      onSelectForm={handleSelectForm}
                      selectedFormId={pendingFormTab || activeFormTab} 
                    />
                  </motion.div>

                  {/* Animated Form Display — slides in from the right */}
                  <AnimatePresence>
                    {activeFormTab && (
                      <motion.div
                        key={activeFormTab}
                        initial={{ opacity: 0, x: "100%", scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: "100%", scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                        style={{
                          flex: "1 1 auto",
                          maxWidth: "800px",
                          zIndex: 20,
                        }}
                      >
                        {/* Back button */}
                        <button 
                          onClick={handleCloseForm}
                          style={{
                            marginBottom: "16px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "var(--text-sec)",
                            padding: "6px 16px",
                            borderRadius: "99px",
                            fontSize: "13px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                          Back to Templates
                        </button>

                        {/* Form Card */}
                        <div className="card">
                          <div className="card-header">
                            <span className="card-label">Live Integration sandbox</span>
                            <h2 className="card-title">
                              {activeFormTab === 'cancel' && 'Cancellation Feedback Form'}
                              {activeFormTab === 'job' && 'Software Engineer Job Application'}
                              {activeFormTab === 'feedback' && 'Customer Experience Rating'}
                              {activeFormTab === 'gov' && 'Road Infrastructure Repair Request'}
                              {activeFormTab === 'survey' && 'Technology Stack Survey'}
                            </h2>
                            <p className="card-desc">
                              {activeFormTab === 'cancel' && 'Validates the depth and clarity of subscription cancellation reasons.'}
                              {activeFormTab === 'job' && 'Evaluates summary structure, professional tone, and required experience.'}
                              {activeFormTab === 'feedback' && 'Validates user-submitted descriptions for spam, gibberish, or short strings.'}
                              {activeFormTab === 'gov' && 'Ensures the description contains sufficient context for public dispatchers.'}
                              {activeFormTab === 'survey' && 'Checks if the listed stack matches development tools.'}
                            </p>
                          </div>
                          <div className="card-body">
                            <NormyProvider
                              apiKey="nrm_live_demo"
                              projectId="00000000-0000-0000-0000-000000000000"
                              apiUrl={apiHostUrl}
                              showBadge={false}
                            >
                              {activeFormTab === 'cancel' && <CancellationForm />}
                              {activeFormTab === 'job' && <JobApplicationForm />}
                              {activeFormTab === 'feedback' && <FeedbackForm />}
                              {activeFormTab === 'gov' && <GovernmentForm />}
                              {activeFormTab === 'survey' && <SurveyForm />}
                            </NormyProvider>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          )}

        </main>

        {/* ══ Footer ══ */}
        <footer className="app-footer">
          <div>© {new Date().getFullYear()} Normy Validation Engine. Open-source under MIT License.</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="https://github.com/ChouatenY/Normy" target="_blank" rel="noreferrer">GitHub Repository</a>
            <a href="#installation" onClick={(e) => { e.preventDefault(); setLandingSection('docs'); }}>Developer SDK Documentation</a>
          </div>
        </footer>

        {/* ══ Auth Modal (Console Portal) ══ */}
        {showAuthModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
            padding: 24
          }}>
            <div className="auth-card" style={{ position: 'relative' }}>
              
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                style={{
                  position: 'absolute', top: 20, right: 20, background: 'none', border: 'none',
                  color: 'var(--text-sec)', fontSize: '1.25rem', cursor: 'pointer'
                }}
              >
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
                <img
                  src="/logo.png"
                  alt="Normy logo"
                  style={{
                    height: 24,
                    width: 'auto',
                    filter: theme === 'light' ? 'invert(1)' : 'none',
                  }}
                />
                <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--white)' }}>NORMY</span>
              </div>

              {authError && (
                <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', padding: 12, borderRadius: 6, fontSize: '0.8125rem', marginBottom: 20 }}>
                  {authError}
                </div>
              )}

              {authMessage && (
                <div style={{ background: 'rgba(76, 175, 145, 0.1)', border: '1px solid rgba(76, 175, 145, 0.2)', color: 'var(--teal)', padding: 12, borderRadius: 6, fontSize: '0.8125rem', marginBottom: 20 }}>
                  {authMessage}
                </div>
              )}

              {/* Login / Register Forms */}
              {authMode === 'login' ? (
                <form onSubmit={handleLogin}>
                  <div className="input-group">
                    <label className="input-label">Email Address</label>
                    <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. dev@example.com" />
                  </div>

                  <div className="input-group" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="input-label">Password</label>
                      <span onClick={() => setAuthMode('forgot')} style={{ fontSize: '0.75rem', color: 'var(--text-sec)', cursor: 'pointer', marginBottom: 8 }}>Forgot?</span>
                    </div>
                    <input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: 16 }}>
                    <LiquidMetalButton label="Sign In" type="submit" />
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-sec)', textAlign: 'center' }}>
                    New to Normy? <span onClick={() => setAuthMode('register')} style={{ color: 'var(--white)', cursor: 'pointer', fontWeight: 600 }}>Create an account</span>
                  </div>
                </form>
              ) : authMode === 'register' ? (
                <form onSubmit={handleRegister}>
                  <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <input type="text" required className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Dev" />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Email Address</label>
                    <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. dev@example.com" />
                  </div>

                  <div className="input-group" style={{ marginBottom: 24 }}>
                    <label className="input-label">Password</label>
                    <input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: 16 }}>
                    <LiquidMetalButton label="Create Account" type="submit" />
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-sec)', textAlign: 'center' }}>
                    Already have an account? <span onClick={() => setAuthMode('login')} style={{ color: 'var(--white)', cursor: 'pointer', fontWeight: 600 }}>Sign In</span>
                  </div>
                </form>
              ) : (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Reset Password</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-sec)', marginBottom: 20 }}>Enter your email address and we will send you a password reset link.</p>
                  <div className="input-group" style={{ marginBottom: 24 }}>
                    <label className="input-label">Email Address</label>
                    <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. dev@example.com" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <LiquidMetalButton label="Send Reset Link" type="submit" onClick={() => { setAuthMessage('Password reset link sent!'); setAuthMode('login'); }} />
                    <button onClick={() => setAuthMode('login')} className="btn btn-glass" style={{ width: '100%' }}>Back to Login</button>
                  </div>
                </div>
              )}

              {/* OAuth Providers with Liquid Metal Button wrapper and Google / GitHub SVG Logos */}
              <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 16, letterSpacing: '0.05em' }}>
                  Or continue with
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <LiquidMetalButton
                    label="GitHub"
                    onClick={() => alert('OAuth flow is ready. Integration config missing.')}
                    icon={<GitHubLogo />}
                  />
                  <LiquidMetalButton
                    label="Google"
                    onClick={() => alert('OAuth flow is ready. Integration config missing.')}
                    icon={<GoogleLogo />}
                  />
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // --- Render Dashboard Shell (Authenticated Developer State) ---
  return (
    <div className="dashboard-shell">
      
      {/* ── Navigation Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img
            src="/logo.png"
            alt="Normy logo"
            style={{
              height: 20,
              width: 'auto',
              filter: theme === 'light' ? 'invert(1)' : 'none',
              transition: 'filter 0.3s ease'
            }}
          />
          <span style={{ fontSize: '0.9375rem', fontWeight: 800, letterSpacing: '-0.02em' }}>NORMY CONSOLE</span>
        </div>

        <nav style={{ flex: 1 }}>
          <button onClick={() => setActiveSection('overview')} className={`nav-link ${activeSection === 'overview' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
            <span>Overview</span>
          </button>
          <button onClick={() => setActiveSection('projects')} className={`nav-link ${activeSection === 'projects' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
            <span>Projects</span>
          </button>
          <button onClick={() => setActiveSection('keys')} className={`nav-link ${activeSection === 'keys' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
            <span>API Keys</span>
          </button>
          <button onClick={() => setActiveSection('docs')} className={`nav-link ${activeSection === 'docs' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
            <span>Documentation</span>
          </button>
          <button onClick={() => setActiveSection('playground')} className={`nav-link ${activeSection === 'playground' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
            <span>Playground</span>
          </button>
          <button onClick={() => setActiveSection('settings')} className={`nav-link ${activeSection === 'settings' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
            <span>Settings</span>
          </button>
        </nav>

        {/* User profile footer */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border-hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--black)' }}>
              {name.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || 'Developer'}</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={handleSignOut} className="btn btn-glass" style={{ width: '100%', fontSize: '0.75rem', padding: '6px 12px' }}>Sign Out</button>
        </div>
      </aside>

      {/* ── Main Panel View ── */}
      <main className="main-content">
        
        {/* Header Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--white)' }}>
              {activeSection === 'overview' && 'Console Overview'}
              {activeSection === 'projects' && 'Project Workspace'}
              {activeSection === 'keys' && 'API Access Keys'}
              {activeSection === 'docs' && 'Interactive Documentation'}
              {activeSection === 'playground' && 'Developer Sandbox'}
              {activeSection === 'settings' && 'System Configuration'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Active Project Dropdown */}
            {projects.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)' }}>Active:</span>
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const p = projects.find(p => p.id === e.target.value);
                    if (p) setSelectedProject(p);
                  }}
                  style={{
                    background: 'var(--surface-1)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Shimmering Liquid Metal theme switcher button for Authenticated console */}
            <button
              onClick={toggleTheme}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #111 0%, #333 50%, #111 100%)',
                backgroundSize: '200% 200%',
                animation: 'lm-shimmer 4s linear infinite',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.8125rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* ── Overview Section ── */}
        {activeSection === 'overview' && (
          <div>
            {/* Quick start banner if no validation activity */}
            <div className="card-glass" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.03) 100%)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: 8, color: 'var(--white)' }}>
                🚀 Integration Quick Start
              </h3>
              <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginBottom: 20 }}>
                Copy the code below to implement real-time AI validation wrapper in your React workspace.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <CodeBlock
                  title="SDK Install"
                  lang="bash"
                  code="npm install @normy-validation/react"
                />
                <CodeBlock
                  title="App Setup"
                  lang="tsx"
                  code={`import { NormyProvider } from '@normy-validation/react';
 
<NormyProvider apiKey="${apiKeys.find(k => k.environment === 'development')?.prefix || 'nrm_test_xxxxxx'}" projectId="${selectedProject?.id || 'proj_xxxx'}">
  <textarea />
</NormyProvider>`}
                />
              </div>
            </div>

            {/* Metrics cards */}
            <div className="analytics-grid">
              <div className="card-glass stat-card">
                <span className="stat-label">Total Projects</span>
                <div className="stat-val">{projects.length}</div>
              </div>
              <div className="card-glass stat-card">
                <span className="stat-label">Total Validations</span>
                <div className="stat-val">
                  {projects.reduce((acc, curr) => acc + curr.validationCount, 0)}
                </div>
              </div>
              <div className="card-glass stat-card">
                <span className="stat-label">Average Score</span>
                <div className="stat-val">91.4/100</div>
              </div>
              <div className="card-glass stat-card">
                <span className="stat-label">Cache Hit Ratio</span>
                <div className="stat-val">68.2%</div>
              </div>
            </div>

            {/* Detailed analytics layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              <div className="card-glass">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--white)' }}>
                  Recent Activity Log
                </h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Field / Context</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Job Application Summary</td>
                        <td>94/100</td>
                        <td><span style={{ color: 'var(--teal)', fontWeight: 600 }}>VALID</span></td>
                        <td>2 mins ago</td>
                      </tr>
                      <tr>
                        <td>Cancellation Explanation</td>
                        <td>42/100</td>
                        <td><span style={{ color: 'var(--red)', fontWeight: 600 }}>FLAGGED</span></td>
                        <td>12 mins ago</td>
                      </tr>
                      <tr>
                        <td>Feedback Content</td>
                        <td>88/100</td>
                        <td><span style={{ color: 'var(--teal)', fontWeight: 600 }}>VALID</span></td>
                        <td>1 hr ago</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card-glass">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--white)' }}>
                  Top Issue Types
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                      <span>Too Short / Vague</span>
                      <span>54%</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ width: '54%', height: '100%', background: 'var(--white)', borderRadius: 2 }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                      <span>Spam / Random text</span>
                      <span>28%</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ width: '28%', height: '100%', background: 'var(--white)', borderRadius: 2 }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                      <span>Out of Context</span>
                      <span>18%</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ width: '18%', height: '100%', background: 'var(--white)', borderRadius: 2 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Projects Section ── */}
        {activeSection === 'projects' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <button onClick={openCreateProject} className="btn btn-primary">
                + Create Project
              </button>
            </div>

            <div className="card-glass" style={{ padding: 0 }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Slug</th>
                      <th>AI Provider</th>
                      <th>Min Score</th>
                      <th>Validation Count</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(proj => (
                      <tr key={proj.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--white)' }}>{proj.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', marginTop: 2 }}>{proj.description || 'No description'}</div>
                        </td>
                        <td><code>{proj.slug}</code></td>
                        <td style={{ textTransform: 'capitalize' }}>{proj.defaultProvider}</td>
                        <td>{proj.minScore}/100</td>
                        <td>{proj.validationCount}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => openEditProject(proj)} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '0.8125rem' }}>Edit</button>
                            <button onClick={() => handleDeleteProject(proj.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.8125rem' }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── API Keys Section ── */}
        {activeSection === 'keys' && (
          <div>
            {selectedProject ? (
              <div>
                {/* Generate New API Key Panel */}
                <div className="card-glass">
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--white)' }}>
                    Generate API Credentials for: <span style={{ textDecoration: 'underline' }}>{selectedProject.name}</span>
                  </h3>
                  
                  <form onSubmit={handleGenerateKey} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                      <label className="input-label">Key Descriptor Name</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. Local Development V1"
                      />
                    </div>

                    <div className="input-group" style={{ width: 180, marginBottom: 0 }}>
                      <label className="input-label">Environment</label>
                      <select
                        className="input-field"
                        value={newKeyEnv}
                        onChange={(e) => setNewKeyEnv(e.target.value as any)}
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="development">Development</option>
                        <option value="production">Production</option>
                      </select>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ height: 44 }}>
                      Generate Key
                    </button>
                  </form>

                  {/* Render generated key only once */}
                  {generatedKey && (
                    <div style={{ marginTop: 24, padding: 16, background: 'rgba(76, 175, 145, 0.08)', border: '1px solid rgba(76, 175, 145, 0.2)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', marginBottom: 4 }}>
                        🔑 Secret Key Generated (View Once Only)
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-sec)', marginBottom: 12 }}>
                        Copy this key now. For security purposes, it will never be displayed again.
                      </p>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <code style={{ fontSize: '0.9375rem', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 4, flex: 1, border: '1px solid var(--border)' }}>
                          {generatedKey}
                        </code>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(generatedKey);
                            alert('API Key copied to clipboard!');
                          }} 
                          className="btn btn-glass" 
                          style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* API Key Table */}
                <div className="card-glass" style={{ padding: 0 }}>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Key Name</th>
                          <th>Environment</th>
                          <th>Scope Prefix</th>
                          <th>Status</th>
                          <th>Created At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeys.map(key => (
                          <tr key={key.id}>
                            <td style={{ fontWeight: 600, color: 'var(--white)' }}>{key.name}</td>
                            <td style={{ textTransform: 'capitalize' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '0.75rem',
                                background: key.environment === 'production' ? 'rgba(91, 141, 239, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                color: key.environment === 'production' ? 'var(--blue)' : 'var(--text)'
                              }}>
                                {key.environment}
                              </span>
                            </td>
                            <td><code>{key.prefix}</code></td>
                            <td>
                              <span style={{
                                fontWeight: 700,
                                color: key.revokedAt ? 'var(--red)' : 'var(--teal)',
                                fontSize: '0.75rem',
                                textTransform: 'uppercase'
                              }}>
                                {key.revokedAt ? 'Revoked' : 'Active'}
                              </span>
                            </td>
                            <td>{new Date(key.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 12 }}>
                                {!key.revokedAt && (
                                  <button onClick={() => handleRevokeKey(key.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                    Revoke
                                  </button>
                                )}
                                <button onClick={() => handleDeleteKey(key.id)} style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="card-glass" style={{ textAlign: 'center', padding: 48, color: 'var(--text-sec)' }}>
                Please create a project first before generating API credentials.
              </div>
            )}
          </div>
        )}

        {/* ── Documentation Section ── */}
        {activeSection === 'docs' && (
          <InteractiveDocs
            projectId={selectedProject?.id || 'proj_example'}
            apiKey={apiKeys.find(k => !k.revokedAt)?.prefix || 'nrm_live_xxxxxxxx'}
          />
        )}

        {/* ── Playground Section ── */}
        {activeSection === 'playground' && (
          <PlaygroundView
            projectId={selectedProject?.id || 'proj_example'}
            apiKey={apiKeys.find(k => !k.revokedAt)?.prefix || 'nrm_test_xxxx'}
          />
        )}

        {/* ── Settings Section ── */}
        {activeSection === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {/* Profile update form */}
            <div className="card-glass">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 20, color: 'var(--white)' }}>
                Developer Profile
              </h3>
              <form onSubmit={handleUpdateProfile}>
                <div className="input-group">
                  <label className="input-label">Developer Name</label>
                  <input type="text" className="input-field" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: 28 }}>
                  <label className="input-label">Account Email</label>
                  <input type="email" className="input-field" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Save Profile Settings
                </button>
              </form>
            </div>

            {/* Subscription billing details (Placeholder only) */}
            <div className="card-glass">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 20, color: 'var(--white)' }}>
                Enterprise Billing
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-sec)', marginBottom: 24, lineHeight: 1.5 }}>
                You are currently on the free open-source tier. Upgrade to access higher rate limits, validation triggers, and analytics history.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--white)' }}>Developer Tier</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-sec)' }}>Free Open Source plan</div>
                </div>
                <button className="btn btn-glass" style={{ fontSize: '0.75rem', padding: '8px 16px' }} disabled>
                  Manage Billing
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── Project Create / Edit Modal ── */}
      {showProjModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 24
        }}>
          <div className="auth-card" style={{ width: '100%', maxWidth: 500 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 20, color: 'var(--white)', letterSpacing: '-0.02em' }}>
              {editingProj ? 'Modify Project Settings' : 'Create New Project'}
            </h3>

            <form onSubmit={handleSaveProject}>
              <div className="input-group">
                <label className="input-label">Project Name</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={projName}
                  onChange={(e) => {
                    setProjName(e.target.value);
                    if (!editingProj) {
                      setProjSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  placeholder="e.g. Validation Sandbox App"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Slug</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={projSlug}
                  onChange={(e) => setProjSlug(e.target.value)}
                  placeholder="validation-sandbox-app"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Description (Optional)</label>
                <input
                  type="text"
                  className="input-field"
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="Summary of this project integration scope"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Default Model</label>
                  <select
                    className="input-field"
                    value={projProvider}
                    onChange={(e) => setProjProvider(e.target.value as any)}
                  >
                    <option value="gemini">Gemini AI</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Min Score</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="input-field"
                    value={projMinScore}
                    onChange={(e) => setProjMinScore(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingProj ? 'Save Changes' : 'Create Project'}
                </button>
                <button type="button" onClick={() => setShowProjModal(false)} className="btn btn-glass" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
