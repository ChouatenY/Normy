import React from 'react';

export interface NormyBadgeProps {
  theme?: 'dark' | 'light';
  style?: React.CSSProperties;
}

export const NormyBadge: React.FC<NormyBadgeProps> = ({ theme = 'dark', style }) => {
  const isDark = theme === 'dark';
  return (
    <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-start', marginTop: '16px' }}>
      <a
        href="https://github.com/normy-ai/normy"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '30px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'none',
          letterSpacing: '0.01em',
          textDecoration: 'none',
          fontFamily: "'Inter', -apple-system, sans-serif",
          
          /* Liquid Glass styling */
          background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.15)',
          color: isDark ? 'rgba(255, 255, 255, 0.75)' : '#444',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          
          /* Premium glass reflections */
          boxShadow: isDark 
            ? '0 6px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.05)'
            : '0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
            
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          ...style
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
          e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.25)';
          e.currentTarget.style.color = isDark ? '#fff' : '#000';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = isDark
            ? '0 8px 24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.35), 0 0 12px rgba(255,255,255,0.1)'
            : '0 6px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
          e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
          e.currentTarget.style.color = isDark ? 'rgba(255, 255, 255, 0.75)' : '#444';
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = isDark
            ? '0 6px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.05)'
            : '0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)';
        }}
      >
        {/* Normy Navbar Logo Image */}
        <img
          src="/logo.png"
          alt="Normy Logo"
          style={{
            height: '14px',
            width: 'auto',
            display: 'block',
            flexShrink: 0,
            filter: 'brightness(1.1)',
          }}
        />
        
        <span>Validated by Normy</span>
        
        {/* Metallic gloss highlight sweep */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-150%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
          transform: 'skewX(-25deg)',
          animation: 'normy-badge-shimmer 6s infinite ease-in-out',
        }} />
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes normy-badge-shimmer {
            0% { left: -150%; }
            20% { left: 150%; }
            100% { left: 150%; }
          }
        `}} />
      </a>
    </div>
  );
};
