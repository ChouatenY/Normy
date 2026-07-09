'use client';

import React from 'react';
import { useData } from '../../components/providers/DataProvider.js';
import { useAuth } from '../../components/providers/AuthProvider.js';
import { useRouter } from 'next/navigation';
import { LiquidMetalButton } from '../../components/LiquidMetalButton.js';
import { Code, Terminal, Activity, CheckCircle, AlertCircle, TrendingUp, Copy, ArrowRight } from 'lucide-react';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { projects, selectedProject } = useData();
  const router = useRouter();

  return (
    <div className="fade-in">
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--white)', letterSpacing: '-0.02em', marginBottom: 8 }}>
          Overview
        </h1>
        <p style={{ color: 'var(--text-sec)', fontSize: '0.9375rem' }}>
          Welcome back, {user?.user_metadata?.name || 'Developer'}. Here's what's happening across your projects.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="card-glass" style={{ padding: '40px 24px', textAlign: 'center', marginBottom: 40, border: '1px dashed rgba(255,255,255,0.2)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--white)', marginBottom: 8 }}>Welcome to Normy</h2>
          <p style={{ color: 'var(--text-sec)', marginBottom: 24, fontSize: '0.9375rem' }}>
            Create your first project to get started.
          </p>
          <button 
            onClick={() => router.push('/dashboard/projects')} 
            style={{ 
              background: '#fff', color: '#000', border: 'none', padding: '10px 24px', 
              borderRadius: 6, fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255,255,255,0.1)',
              display: 'inline-flex', alignItems: 'center', gap: 8
            }}
          >
            Go to Projects
            <ArrowRight size={16} className="arrow-bounce" />
          </button>
          <style>{`
            @keyframes arrowBounce {
              0% { transform: translateX(0); }
              100% { transform: translateX(4px); }
            }
            .arrow-bounce {
              animation: arrowBounce 0.6s ease-in-out infinite alternate;
            }
          `}</style>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 40 }}>
            <div className="card stat-card" style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-sec)', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Total Validations</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--white)', letterSpacing: '-0.03em' }}>14,209</div>
              <div style={{ color: 'var(--teal)', fontSize: '0.8125rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={14} /> +12.5% from last week
              </div>
            </div>
            <div className="card stat-card" style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-sec)', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Avg Quality Score</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--white)', letterSpacing: '-0.03em' }}>88.4<span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>/100</span></div>
              <div style={{ color: 'var(--teal)', fontSize: '0.8125rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={14} /> +2.1 pts improvement
              </div>
            </div>
            <div className="card stat-card" style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-sec)', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Active Projects</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--white)', letterSpacing: '-0.03em' }}>{projects.length}</div>
              <div style={{ color: 'var(--text-sec)', fontSize: '0.8125rem', marginTop: 8 }}>
                Currently viewing: {selectedProject?.name || 'All Projects'}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Integration Quick Start Card */}
      <div style={{ background: 'var(--surface-1, #0a0a0a)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.02)' }}>
          <Terminal size={18} color="var(--white)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--white)' }}>Integration Quick Start</h2>
        </div>
        
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--white)', marginBottom: 12 }}>1. Install the SDK</h3>
            <div style={{ position: 'relative' }}>
              <div style={{ background: 'var(--bg, #000)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--white)' }}>
                npm install @normy/sdk-react
              </div>
              <button style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', display: 'flex', padding: 4 }} title="Copy to clipboard">
                <Copy size={14} />
              </button>
            </div>
          </div>
          
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--white)', marginBottom: 12 }}>2. Initialize Provider</h3>
            <div style={{ position: 'relative' }}>
              <div style={{ background: 'var(--bg, #000)', padding: '16px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--white)', lineHeight: 1.6 }}>
                import {'{'} NormyProvider {'}'} from '@normy/sdk-react';<br/><br/>
                &lt;NormyProvider apiKey="YOUR_API_KEY"&gt;<br/>
                &nbsp;&nbsp;&lt;App /&gt;<br/>
                &lt;/NormyProvider&gt;
              </div>
              <button style={{ position: 'absolute', right: 12, top: 12, background: 'transparent', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', display: 'flex', padding: 4 }} title="Copy to clipboard">
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
