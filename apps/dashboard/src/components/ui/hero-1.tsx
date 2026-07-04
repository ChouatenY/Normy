"use client"

import React from "react"
import { ChevronRight } from "lucide-react"

interface HeroProps {
  theme?: 'dark' | 'light' | undefined
  eyebrow?: string | undefined
  title: string
  subtitle: string
  ctaLabel?: string | undefined
  ctaHref?: string | undefined
  onCtaClick?: (() => void) | undefined
}

export function Hero({
  theme = 'dark',
  eyebrow = "Next-Gen Productivity",
  title,
  subtitle,
  ctaLabel = "Get Started",
  ctaHref = "#",
  onCtaClick,
}: HeroProps) {
  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
    } else if (ctaHref) {
      window.location.href = ctaHref;
    }
  };

  const isDark = theme === 'dark';

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        margin: '0 auto',
        width: '100%',
        paddingTop: '80px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '0',
        textAlign: 'center',
        minHeight: 'calc(100vh - 40px)',
        overflow: 'hidden',
        background: isDark
          ? 'linear-gradient(to bottom, #000000 0%, #000000 30%, #898e8e 78%, #ffffff 99%)'
          : 'linear-gradient(to bottom, #ffffff 0%, #ffffff 50%, #e8e8e8 88%)',
        borderRadius: '0 0 12px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* ── CSS Grid Background Pattern ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          opacity: 0.8,
          height: '600px',
          width: '100%',
          backgroundImage: isDark
            ? 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)'
            : 'linear-gradient(to right, #d4d4d8 1px, transparent 1px), linear-gradient(to bottom, #d4d4d8 1px, transparent 1px)',
          backgroundSize: '6rem 5rem',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Top Gradient Overlay (blends with the navbar) ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '150px',
          background: isDark
            ? 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
            : 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      />

      {/* ── Radial Accent Dome (the massive curved shape at the bottom) ── */}
      <div
        style={{
          position: 'absolute',
          left: '-20%',
          right: '-20%',
          bottom: '-420px',
          height: '750px',
          borderRadius: '100%',
          border: isDark ? '1px solid rgba(180,140,222,0.15)' : '1px solid rgba(0,0,0,0.06)',
          background: isDark
            ? 'radial-gradient(closest-side, #000 82%, #ffffff)'
            : 'radial-gradient(closest-side, #fff 82%, #000000)',
          zIndex: 1,
          animation: 'hero-fade-up 0.8s ease-out forwards',
          pointerEvents: 'none',
        }}
      />

      {/* ── Eyebrow Pill Badge ── */}
      {eyebrow && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', position: 'relative', zIndex: 10 }}>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); handleCtaClick(); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 20px',
              borderRadius: '99px',
              border: isDark ? '2px solid rgba(255,255,255,0.08)' : '2px solid rgba(0,0,0,0.1)',
              background: isDark
                ? 'linear-gradient(to top-right, rgba(113,113,122,0.05), rgba(161,161,170,0.05), transparent)'
                : 'linear-gradient(to top-right, rgba(0,0,0,0.02), rgba(0,0,0,0.03), transparent)',
              textDecoration: 'none',
              transition: 'background 0.2s, border-color 0.2s',
              width: 'fit-content',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
              e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark
                ? 'linear-gradient(to top-right, rgba(113,113,122,0.05), rgba(161,161,170,0.05), transparent)'
                : 'linear-gradient(to top-right, rgba(0,0,0,0.02), rgba(0,0,0,0.03), transparent)';
              e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
            }}
          >
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--mono, monospace)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
              fontWeight: 500,
            }}>
              {eyebrow}
            </span>
            <ChevronRight
              style={{
                width: '14px',
                height: '14px',
                color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
                transition: 'transform 0.3s',
              }}
            />
          </a>
        </div>
      )}

      {/* ── Title — Large gradient text, thick weight ── */}
      <h1
        style={{
          position: 'relative',
          zIndex: 10,
          margin: '0 auto',
          maxWidth: '1100px',
          fontSize: 'clamp(2.8rem, 7vw, 6rem)',
          fontWeight: 700,
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
          textAlign: 'center',
          padding: '24px 0',
          backgroundImage: isDark
            ? 'linear-gradient(to bottom right, #ffffff 30%, rgba(255,255,255,0.4))'
            : 'linear-gradient(to bottom right, #000000 30%, rgba(0,0,0,0.4))',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          animation: 'hero-fade-in 0.8s ease-out 0.15s forwards',
          opacity: 0,
          transform: 'translateY(-16px)',
        }}
      >
        {title}
      </h1>

      {/* ── Subtitle ── */}
      <p
        style={{
          position: 'relative',
          zIndex: 10,
          margin: '0 auto',
          maxWidth: '780px',
          fontSize: 'clamp(0.95rem, 2vw, 1.2rem)',
          lineHeight: 1.65,
          color: '#c0c0c0',
          mixBlendMode: 'difference',
          textAlign: 'center',
          letterSpacing: '-0.01em',
          animation: 'hero-fade-in 0.8s ease-out 0.3s forwards',
          opacity: 0,
          transform: 'translateY(-16px)',
          marginBottom: '48px',
        }}
      >
        {subtitle}
      </p>

      {/* ── CTA Button ── */}
      {ctaLabel && (
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 40, animation: 'hero-fade-in 0.8s ease-out 0.45s forwards', opacity: 0, transform: 'translateY(-16px)' }}>
          <button
            onClick={handleCtaClick}
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '15px',
              letterSpacing: '-0.01em',
              background: isDark ? '#ffffff' : '#000000',
              color: isDark ? '#000000' : '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: isDark
                ? '0 4px 20px rgba(255,255,255,0.15)'
                : '0 4px 20px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s ease, box-shadow 0.25s ease',
              fontFamily: 'var(--font, system-ui)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.04)';
              e.currentTarget.style.boxShadow = isDark
                ? '0 6px 28px rgba(255,255,255,0.25)'
                : '0 6px 28px rgba(0,0,0,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = isDark
                ? '0 4px 20px rgba(255,255,255,0.15)'
                : '0 4px 20px rgba(0,0,0,0.15)';
            }}
          >
            {ctaLabel}
          </button>
        </div>
      )}

      {/* ── Bottom Gradient Overlay — fades hero into the dark sandbox below ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '250px',
          background: isDark
            ? 'linear-gradient(to bottom, transparent 0%, #000000 100%)'
            : 'linear-gradient(to bottom, transparent 0%, #ffffff 100%)',
          zIndex: 30,
          pointerEvents: 'none',
        }}
      />

      {/* ── Inject keyframes ── */}
      <style>{`
        @keyframes hero-fade-in {
          0% { opacity: 0; transform: translateY(-16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-fade-up {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
