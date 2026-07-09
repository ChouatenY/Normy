'use client';

import React, { useEffect, useState } from 'react';
import { useData } from '../../../components/providers/DataProvider.js';
import { Activity, TrendingUp, Zap, Clock, Shield, Server, Cpu, DollarSign, BarChart3 } from 'lucide-react';
import { getAnalyticsAction } from '../../actions.js';

interface AnalyticsData {
  totalValidations: number;
  averageScore: number;
  averageConfidence: number;
  aiRequests: number;
  aiRequestsAvoided: number;
  cacheHitRate: number;
  averageLatency: number;
  localValidatorUsage: number;
  hostedUsage: number;
  byokUsage: number;
  costSavings: number;
  actualAiCost: number;
  timeline: Array<{ date: string; validations: number; averageScore: number; averageLatency: number }>;
  providerBreakdown: Record<string, number>;
  issueBreakdown: Record<string, number>;
}

function MetricCard({ label, value, icon, color = 'var(--white)', subtitle }: { label: string; value: string | number; icon: React.ReactNode; color?: string; subtitle?: string }) {
  return (
    <div className="card-glass" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-sec)', fontWeight: 600 }}>{label}</div>
        <div style={{ color: 'var(--text-sec)', opacity: 0.5 }}>{icon}</div>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { selectedProject } = useData();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    getAnalyticsAction(selectedProject.id)
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, [selectedProject]);

  if (!selectedProject) return <div style={{ color: 'var(--text-sec)' }}>Select a project first.</div>;
  if (loading) return <div style={{ color: 'var(--text-sec)' }}>Loading analytics…</div>;
  if (!data) return <div style={{ color: 'var(--text-sec)' }}>No analytics data available. Run some validations first.</div>;

  const maxTimelineValidations = Math.max(...(data.timeline.map(t => t.validations)), 1);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: 24 }}>Analytics</h1>

      {/* ── Primary Metrics Grid ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <MetricCard label="Total Validations" value={data.totalValidations.toLocaleString()} icon={<Activity size={18} />} />
        <MetricCard label="Average Score" value={`${data.averageScore}/100`} icon={<TrendingUp size={18} />} color="var(--teal)" subtitle="Quality score" />
        <MetricCard label="Avg Confidence" value={`${(data.averageConfidence * 100).toFixed(1)}%`} icon={<Shield size={18} />} color="var(--blue)" />
        <MetricCard label="AI Requests" value={data.aiRequests.toLocaleString()} icon={<Cpu size={18} />} color="var(--blue)" subtitle={`${data.aiRequestsAvoided} avoided by local/cache`} />
        <MetricCard label="Cache Hit Rate" value={`${data.cacheHitRate}%`} icon={<Zap size={18} />} color="var(--orange)" />
        <MetricCard label="Local Validators" value={`${data.localValidatorUsage}%`} icon={<Shield size={18} />} color="var(--teal)" subtitle="Short-circuited before AI" />
        <MetricCard label="Avg Latency" value={`${data.averageLatency}ms`} icon={<Clock size={18} />} />
        <MetricCard label="Cost Savings" value={`$${data.costSavings.toFixed(4)}`} icon={<DollarSign size={18} />} color="var(--teal)" subtitle={`AI spend: $${data.actualAiCost.toFixed(4)}`} />
      </div>

      {/* ── BYOK vs Hosted ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <div className="card-glass" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 16 }}>Provider Usage</h3>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>Hosted AI</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--blue)' }}>{data.hostedUsage}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>BYOK</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--teal)' }}>{data.byokUsage}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(data.providerBreakdown).filter(([, v]) => v > 0).map(([provider, count]) => (
              <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)', width: 80, textTransform: 'capitalize' }}>{provider}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / data.totalValidations) * 100}%`, background: provider === 'local' ? 'var(--teal)' : provider === 'cache' ? 'var(--orange)' : 'var(--blue)', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--white)', fontFamily: 'var(--mono)', width: 40, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-glass" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 16 }}>Issue Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(data.issueBreakdown).sort(([, a], [, b]) => b - a).map(([issue, count]) => (
              <div key={issue} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)', width: 140, fontFamily: 'var(--mono)' }}>{issue}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / data.totalValidations) * 100}%`, background: issue === 'VALID' ? 'var(--teal)' : 'var(--red)', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--white)', fontFamily: 'var(--mono)', width: 40, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Validation Timeline ──────────────────────────────────── */}
      {data.timeline.length > 0 && (
        <div className="card-glass" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 16 }}>Validation Timeline (Last 30 Days)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
            {data.timeline.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.validations} validations, avg score ${day.averageScore}`}
                style={{
                  flex: 1,
                  height: `${(day.validations / maxTimelineValidations) * 100}%`,
                  minHeight: 4,
                  background: `linear-gradient(to top, var(--teal), var(--blue))`,
                  borderRadius: '2px 2px 0 0',
                  opacity: 0.8,
                  transition: 'opacity 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: '0.625rem', color: 'var(--text-sec)' }}>{data.timeline[0]?.date}</span>
            <span style={{ fontSize: '0.625rem', color: 'var(--text-sec)' }}>{data.timeline[data.timeline.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}
