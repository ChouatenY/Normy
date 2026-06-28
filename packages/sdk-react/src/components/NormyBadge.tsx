import React from 'react';

export interface NormyBadgeProps {
  theme?: 'dark' | 'light';
  style?: React.CSSProperties;
}

export const NormyBadge: React.FC<NormyBadgeProps> = ({ theme = 'dark', style }) => {
  const isDark = theme === 'dark';
  return (
    <a
      href="https://github.com/normy-ai/normy"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 600,
        textDecoration: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
        color: isDark ? '#777' : '#666',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
        e.currentTarget.style.color = isDark ? '#fff' : '#000';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
        e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.color = isDark ? '#777' : '#666';
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#4caf91' }}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>Validated by Normy</span>
    </a>
  );
};
