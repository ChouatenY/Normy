import React from 'react';

export interface NormyBadgeProps {
  theme?: 'dark' | 'light';
  style?: React.CSSProperties;
}

export const NormyBadge: React.FC<NormyBadgeProps> = ({ style }) => {
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
          
          /* Black Liquid Metal styling */
          background: 'linear-gradient(135deg, #2a2a2a 0%, #555 20%, #888 35%, #bbb 50%, #888 65%, #555 80%, #2a2a2a 100%)',
          backgroundSize: '400% 100%',
          animation: 'lm-shimmer-badge 4s linear infinite',
          border: 'none',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.5)',
          
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          ...style
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.4), 0 8px 24px rgba(255,255,255,0.08), 0 2px 8px rgba(255,255,255,0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.5)';
        }}
      >
        {/* Inner dark overlay */}
        <span
          style={{
            position: 'absolute',
            inset: 1.5,
            borderRadius: '30px',
            background: 'linear-gradient(180deg, rgba(20,20,20,0.85) 0%, rgba(0,0,0,0.92) 100%)',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
        
        {/* Shimmer highlight */}
        <span
          style={{
            position: 'absolute',
            inset: 1.5,
            borderRadius: '30px',
            background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)',
            backgroundSize: '300% 100%',
            animation: 'lm-shimmer-badge 3s ease-in-out infinite',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />

        {/* Normy Navbar Logo Image */}
        <img
          src="/logo.png"
          alt="Normy Logo"
          style={{
            height: '14px',
            width: 'auto',
            display: 'block',
            flexShrink: 0,
            filter: 'invert(var(--logo-invert)) brightness(1.1)',
            zIndex: 3,
            position: 'relative',
            transition: 'filter 0.3s ease',
          }}
        />
        
        <span style={{ position: 'relative', zIndex: 3, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
          Validated by Normy
        </span>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes lm-shimmer-badge {
            0% { background-position: 200% 50%; }
            100% { background-position: -200% 50%; }
          }
        `}} />
      </a>
    </div>
  );
};
