'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderKanban, KeyRound, BookOpenText, CodeXml, Settings2, CreditCard, PanelLeftClose, PanelRightClose, BarChart3, Plus } from 'lucide-react';
import { useAuth } from '../../components/providers/AuthProvider.js';
import { useData } from '../../components/providers/DataProvider.js';
import { CustomSelect } from '../../components/ui/custom-select.js';
import { TextShimmer } from '../../components/ui/be-ui-text-animation.js';

/** Human-readable labels for known route segments */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  'api-keys': 'API Keys',
  providers: 'Providers',
  docs: 'SDK Docs',
  playground: 'Playground',
  analytics: 'Analytics',
  settings: 'Settings',
  billing: 'Billing',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const { projects, selectedProject, setSelectedProject } = useData();

  React.useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #000)' }}>
        {/* Skeleton loading — never show landing page */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <TextShimmer style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Loading session…</TextShimmer>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via AuthProvider
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} />, href: '/dashboard' },
    { id: 'projects', label: 'Projects', icon: <FolderKanban size={18} />, href: '/dashboard/projects' },
    { id: 'keys', label: 'API Keys', icon: <KeyRound size={18} />, href: '/dashboard/api-keys' },
    { id: 'providers', label: 'Providers / BYOK', icon: <Settings2 size={18} />, href: '/dashboard/providers' },
    { id: 'docs', label: 'Integration SDK', icon: <BookOpenText size={18} />, href: '/dashboard/docs' },
    { id: 'playground', label: 'Playground', icon: <CodeXml size={18} />, href: '/dashboard/playground' },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} />, href: '/dashboard/analytics' },
    { id: 'settings', label: 'Settings', icon: <Settings2 size={18} />, href: '/dashboard/settings' },
    { id: 'billing', label: 'Billing & Quotas', icon: <CreditCard size={18} />, href: '/dashboard/billing' },
  ];

  // ── Breadcrumbs with dynamic segment resolution ──────────────────
  const pathParts = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part, idx) => {
    const href = '/' + pathParts.slice(0, idx + 1).join('/');

    // Check known labels first
    if (ROUTE_LABELS[part]) {
      return { href, title: ROUTE_LABELS[part] };
    }

    // Try to resolve dynamic project IDs to their names
    const project = projects.find(p => p.id === part);
    if (project) {
      return { href, title: project.name };
    }

    // Fallback: capitalize the segment
    const title = part
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    return { href, title };
  });

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: 'var(--bg, #000)' }}>
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ width: isSidebarCollapsed ? 80 : 260, borderRight: '1px solid var(--border)', transition: 'width 0.2s', padding: '24px 12px', display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between', paddingBottom: 24, /* borderBottom: '1px solid var(--border)', */ marginBottom: 24, cursor: isSidebarCollapsed ? 'pointer' : 'default' }} onClick={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}>
          {isSidebarCollapsed ? (
            <img src="/logo.png" alt="Normy" style={{ height: 24 }} />
          ) : (
            <>
              <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                <img src="/logo.png" alt="Normy" style={{ height: 24, filter: theme === 'light' ? 'invert(1)' : 'none' }} />
                <span style={{ fontWeight: 800, color: 'var(--white)' }}>NORMY</span>
              </Link>
              <button onClick={() => setIsSidebarCollapsed(true)} style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer' }}>
                <PanelLeftClose size={18} />
              </button>
            </>
          )}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                <div className={`nav-item ${isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, color: isActive ? 'var(--white)' : 'var(--text-sec)', background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                  {item.icon}
                  {!isSidebarCollapsed && <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--white)' }}>
              {user.user_metadata?.name ? user.user_metadata.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!isSidebarCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--white)' }}>{user.user_metadata?.name || 'Developer'}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            )}
          </div>
          <button onClick={signOut} className="btn-liquid-metal" style={{ width: '100%', padding: 1, marginTop: 8 }}>
            <span className="btn-liquid-metal-inner" style={{ padding: '8px 16px', display: 'flex', justifyContent: 'center' }}>
              {isSidebarCollapsed ? 'Exit' : 'Sign Out'}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ padding: 0, marginLeft: isSidebarCollapsed ? 80 : 260, width: isSidebarCollapsed ? 'calc(100vw - 80px)' : 'calc(100vw - 260px)', boxSizing: 'border-box', overflowX: 'hidden', transition: 'margin-left 0.2s ease, width 0.2s ease', minHeight: '100vh' }}>
        {/* Sticky Top Navbar */}
        <header style={{ height: 72, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', zIndex: 50, marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-sec)' }}>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.href}>
                <Link href={crumb.href} style={{ color: idx === breadcrumbs.length - 1 ? 'var(--white)' : 'var(--text-sec)', fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400, textDecoration: 'none' }}>
                  {crumb.title}
                </Link>
                {idx < breadcrumbs.length - 1 && <span style={{ color: 'var(--border-hi)', fontWeight: 400 }}>/</span>}
              </React.Fragment>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Active Project Dropdown */}
            {projects.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CustomSelect
                  value={selectedProject?.id || ''}
                  onChange={(val) => {
                    const proj = projects.find(p => p.id === val);
                    if (proj) setSelectedProject(proj);
                  }}
                  options={projects.map(p => ({ label: p.name, value: p.id }))}
                />
                <button className="btn btn-glass" style={{ padding: 8 }}>
                  <Plus size={16} />
                </button>
              </div>
            )}

            {/* Theme switcher */}
            <button className="btn-liquid-metal" style={{ padding: 1, width: 34, height: 34, borderRadius: '50%' }} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              <span className="btn-liquid-metal-inner" style={{ padding: 0, width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {theme === 'dark' ? (
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
                )}
              </span>
            </button>
          </div>
        </header>

        <div style={{ padding: '0 32px 32px 32px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
