'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DbService, Project, ApiKey } from '../lib/db-service';
import { InteractiveDocs } from '../components/InteractiveDocs';
import { PlaygroundView } from '../components/PlaygroundView';
import { CodeBlock } from '../components/CodeBlock';

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

  // Dashboard Section routing state
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

  // Load user session
  useEffect(() => {
    supabase.getSession().then(({ data: { session } }: any) => {
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
      setSelectedProject(list[0]);
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
    const { data, error } = await supabase.signUp({
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
    const { data, error } = await supabase.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
    } else {
      setUser(data.user);
      setName(data.user.user_metadata?.name || '');
      setNewName(data.user.user_metadata?.name || '');
      setNewEmail(data.user.email || '');
    }
  };

  const handleSignOut = async () => {
    await supabase.signOut();
    setUser(null);
    setSelectedProject(null);
    setProjects([]);
    setApiKeys([]);
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

    const { apiKey, record } = await DbService.generateApiKey(selectedProject.id, newKeyName, newKeyEnv);
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
    const { data, error } = await supabase.updateUser({
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

  // --- Render Authentication Pages ---
  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.875rem',
              color: 'var(--black)',
              letterSpacing: '-0.04em'
            }}>N</div>
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

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: 16 }}>Sign In</button>

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

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: 16 }}>Create Account</button>

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
              <button onClick={() => { setAuthMessage('Password reset link sent!'); setAuthMode('login'); }} className="btn btn-primary" style={{ width: '100%', marginBottom: 16 }}>Send Reset Link</button>
              <button onClick={() => setAuthMode('login')} className="btn btn-glass" style={{ width: '100%' }}>Back to Login</button>
            </div>
          )}

          {/* Third-Party Auth UI Placeholders */}
          <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 16, letterSpacing: '0.05em' }}>
              Or continue with
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button className="btn btn-glass" style={{ fontSize: '0.8125rem' }} onClick={() => alert('OAuth flow is ready. Integration config missing.')}>
                <span>GitHub</span>
              </button>
              <button className="btn btn-glass" style={{ fontSize: '0.8125rem' }} onClick={() => alert('OAuth flow is ready. Integration config missing.')}>
                <span>Google</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // --- Render Dashboard Shell ---
  return (
    <div className="dashboard-shell">
      
      {/* ── Navigation Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'var(--white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.75rem',
            color: 'var(--black)',
            letterSpacing: '-0.04em'
          }}>N</div>
          <span>NORMY CONSOLE</span>
        </div>

        <nav style={{ flex: 1 }}>
          <button onClick={() => setActiveSection('overview')} className={`nav-link ${activeSection === 'overview' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%' }}>
            <span>Overview</span>
          </button>
          <button onClick={() => setActiveSection('projects')} className={`nav-link ${activeSection === 'projects' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%' }}>
            <span>Projects</span>
          </button>
          <button onClick={() => setActiveSection('keys')} className={`nav-link ${activeSection === 'keys' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%' }}>
            <span>API Keys</span>
          </button>
          <button onClick={() => setActiveSection('docs')} className={`nav-link ${activeSection === 'docs' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%' }}>
            <span>Documentation</span>
          </button>
          <button onClick={() => setActiveSection('playground')} className={`nav-link ${activeSection === 'playground' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%' }}>
            <span>Playground</span>
          </button>
          <button onClick={() => setActiveSection('settings')} className={`nav-link ${activeSection === 'settings' ? 'active' : ''}`} style={{ background: 'none', border: 'none', width: '100%' }}>
            <span>Settings</span>
          </button>
        </nav>

        {/* User profile footer */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border-hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem' }}>
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

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--white)',
                fontSize: '0.875rem'
              }}
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
