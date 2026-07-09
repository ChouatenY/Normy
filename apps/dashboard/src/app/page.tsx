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
import ContributorsWallDemo from '../components/ui/contributors-section.js';
import { LayoutDashboard, FolderKanban, KeyRound, BookOpenText, CodeXml, Settings2, CreditCard, AlertCircle, Plus, Edit2, PanelLeftClose, Star } from 'lucide-react';
import { CustomSelect } from '../components/ui/custom-select.js';
import { EmptyProjectsState } from '../components/ui/empty-projects.js';
import { FlickeringFooter } from '../components/ui/flickering-footer.js';

type ActiveSection = 'overview' | 'projects' | 'keys' | 'docs' | 'playground' | 'settings' | 'billing';

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
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // BYOK Form state
  const [showByokForm, setShowByokForm] = useState(false);
  const [byokForm, setByokForm] = useState<{ id?: string; provider: 'gemini' | 'openai' | 'anthropic'; title: string; key: string }>({ provider: 'gemini', title: '', key: '' });

  // Landing Page vs Interactive Docs switcher (for non-logged-in users)
  const [landingSection, setLandingSection] = useState<'sandbox' | 'docs'>('sandbox');

  // Form Live Demo active tab (for non-logged-in users)
  const [activeFormTab, setActiveFormTab] = useState<'cancel' | 'job' | 'feedback' | 'gov' | 'survey' | null>(null);

  const handleSelectForm = (id: string) => {
    setActiveFormTab(id as any);
  };

  const handleCloseForm = () => {
    setActiveFormTab(null);
  };

  // Dashboard Section routing state (for logged-in users)
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Application Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

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

  // UI States for Custom Modals
  const [alertConfig, setAlertConfig] = useState<{title: string, message: string} | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

  const showAlert = (title: string, message: string) => setAlertConfig({ title, message });
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmConfig({ title, message, onConfirm });

  // API host determination
  // We use an empty string so the React SDK fetches from /validate, hitting our Next.js API route proxy!
  const apiHostUrl = '';

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
    setIsLoadingProjects(true);
    const list = await DbService.getProjects(user?.email || 'default@example.com');
    setProjects(list || []);
    if (list && list.length > 0 && !selectedProject) {
      setSelectedProject(list[0] ?? null);
    } else if (!list || list.length === 0) {
      setActiveSection('projects');
    }
    setIsLoadingProjects(false);
  };

  const loadApiKeys = async (projId: string) => {
    const list = await DbService.getApiKeys(projId);
    setApiKeys(list || []);
  };

  // --- Auth Handlers ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthLoading) return;
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (!/[A-Za-z]/.test(password)) {
      setAuthError('Password must contain at least one letter.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setAuthError('Password must contain at least one number.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setAuthError('Password must contain at least one special character.');
      return;
    }
    
    setIsAuthLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    setIsAuthLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthMessage('Registration successful! Please log in.');
      setAuthMode('login');
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      showAlert('OAuth Error', error.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthLoading) return;
    setIsAuthLoading(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setIsAuthLoading(false);
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
      const created = await DbService.createProject(user?.email || 'default@example.com', {
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
    showConfirm('Delete Project', 'Are you sure you want to delete this project? All associated API keys will be deleted.', async () => {
      // await DbService.deleteProject(id); // TODO: implement backend route
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
      await loadProjects();
    });
  };

  // --- API Key Handlers ---
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newKeyName) return;

    const apiKey = await DbService.createApiKey(selectedProject.id, newKeyName, newKeyEnv as 'development' | 'production');
    setGeneratedKey(apiKey);
    setNewKeyName('');
    await loadApiKeys(selectedProject.id);
  };

  const handleRevokeKey = async (id: string) => {
    showConfirm('Revoke API Key', 'Are you sure you want to revoke this API key? Applications using this key will immediately fail validation.', async () => {
      await DbService.revokeApiKey(id);
      if (selectedProject) {
        await loadApiKeys(selectedProject.id);
      }
    });
  };

  const handleDeleteKey = async (id: string) => {
    showConfirm('Delete API Key', 'Are you sure you want to permanently delete this key record?', async () => {
      await DbService.deleteApiKey(id);
      if (selectedProject) {
        await loadApiKeys(selectedProject.id);
      }
    });
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
        <div className="mobile-blocker" style={{ display: 'none' }}>
          Site looks better on desktop, please open with PC
        </div>
        
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
              onClick={() => showAlert("Theme Switcher", "this website actually looks better in black so no 🤣")}
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
                
                {/* Cross-fade container: folder gallery OR active form */}
                <div style={{ 
                  position: "relative", 
                  width: "100%", 
                  flex: 1, 
                  display: "flex", 
                  alignItems: "flex-start", 
                  justifyContent: "center", 
                  zIndex: 10,
                  padding: "0 24px",
                }}>
                  <AnimatePresence mode="wait">
                    {!activeFormTab ? (
                      <motion.div
                        key="gallery"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        style={{ display: "flex", width: "100%", justifyContent: "center", minHeight: "500px" }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                          <InteractiveFolderGallery 
                            onSelectForm={handleSelectForm}
                            selectedFormId={activeFormTab} 
                          />
                          <a 
                            href="http://localhost:5173" 
                            target="_blank" 
                            rel="noreferrer"
                            style={{
                              marginTop: "-20px",
                              padding: "10px 24px",
                              background: "linear-gradient(to right, #333, #111)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "99px",
                              color: "#fff",
                              fontWeight: 600,
                              textDecoration: "none",
                              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                              transition: "all 0.2s",
                              zIndex: 60,
                              position: "relative"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-2px)";
                              e.currentTarget.style.boxShadow = "0 15px 35px rgba(0,0,0,0.6)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
                            }}
                          >
                            Deep Dive into Sandbox 🚀
                          </a>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -30, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        style={{
                          width: "100%",
                          maxWidth: "800px",
                          zIndex: 20,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center"
                        }}
                      >
                        {/* Back button */}
                        <button 
                          onClick={handleCloseForm}
                          style={{
                            marginBottom: "24px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "var(--text-sec)",
                            padding: "8px 20px",
                            borderRadius: "99px",
                            fontSize: "14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                            e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                            e.currentTarget.style.color = "var(--text-sec)";
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                          Back to Templates
                        </button>

                        {/* Form Card */}
                        <div className="card" style={{ width: "100%" }}>
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

          {/* ── Open Source Contributors ── */}
          <ContributorsWallDemo />

        </main>

        {/* ══ Footer ══ */}
        <FlickeringFooter />

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

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 16 }}>
                    <LiquidMetalButton label={isAuthLoading ? "Loading..." : "Sign In"} type="submit" />
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

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 16 }}>
                    <LiquidMetalButton label={isAuthLoading ? "Loading..." : "Create Account"} type="submit" />
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
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
                    onClick={() => handleOAuthLogin('github')}
                    icon={<GitHubLogo />}
                  />
                  <LiquidMetalButton
                    label="Google"
                    onClick={() => handleOAuthLogin('google')}
                    icon={<GoogleLogo />}
                  />
                </div>
              </div>

            </div>
          </div>
        )}

      {/* ── Custom Modals ── */}
      <AnimatePresence>
        {alertConfig && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: 24
          }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card-glass" style={{ maxWidth: 400, width: '100%', padding: 24, textAlign: 'center' }}>
              <div style={{ color: 'var(--blue)', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                <AlertCircle size={48} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--white)', marginBottom: 8 }}>{alertConfig.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-sec)', marginBottom: 24, lineHeight: 1.5 }}>{alertConfig.message}</p>
              <button className="btn btn-primary" onClick={() => setAlertConfig(null)} style={{ width: '100%' }}>Dismiss</button>
            </motion.div>
          </motion.div>
        )}

        {confirmConfig && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: 24
          }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card-glass" style={{ maxWidth: 400, width: '100%', padding: 24, textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--white)', marginBottom: 8 }}>{confirmConfig.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-sec)', marginBottom: 24, lineHeight: 1.5 }}>{confirmConfig.message}</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-glass" onClick={() => setConfirmConfig(null)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={() => { confirmConfig.onConfirm(); setConfirmConfig(null); }} style={{ flex: 1, background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }}>Confirm</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>
    );
  }

  // Fallback for when user is authenticated and hasn't been redirected yet
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100%' }}>
      <div className="text-shimmer" style={{ color: 'var(--text-sec)', fontWeight: 600 }}>Loading Normy Console...</div>
    </div>
  );
}
