import React from 'react';
import { Cpu, Lock, Sparkles, Zap } from 'lucide-react';

export function Features() {
  return (
    <section style={{ position: 'relative', zIndex: 10, padding: '120px 24px', margin: '0 auto', width: '100%', background: '#000' }}>
      <div style={{ margin: '0 auto', maxWidth: '1024px', display: 'flex', flexDirection: 'column', gap: '80px' }}>
        
        {/* Header Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'center' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            The Normy Validation Ecosystem
          </h2>
          <p style={{ color: '#888', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '400px', margin: '0 0 0 auto' }}>
            Empower your applications with real-time AI context, whether you're validating simple fields or analyzing complex multi-step forms.
          </p>
        </div>
        
        {/* Image Section */}
        <div style={{ position: 'relative', width: '100%', borderRadius: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '88/36', overflow: 'hidden', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)', zIndex: 2 }} />
            <img 
              src="/dashboard.png" 
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', zIndex: 1, opacity: 0.9 }} 
              alt="Normy Dashboard Interface" 
            />
          </div>
        </div>
        
        {/* Features Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
              <Zap size={24} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Ultra Fast</h3>
            </div>
            <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              Sub-second latency pipeline validates form inputs without breaking the user experience.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
              <Cpu size={24} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Context Aware</h3>
            </div>
            <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              Analyzes the semantic meaning of inputs, catching gibberish and structural issues regex can't.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
              <Lock size={24} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Secure by Default</h3>
            </div>
            <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              Built-in content filtering prevents prompt injection and harmful text submissions.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
              <Sparkles size={24} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>AI Guidance</h3>
            </div>
            <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              Don't just reject bad inputs—provide real-time AI suggestions on how users can improve them.
            </p>
          </div>
        </div>
        
      </div>
    </section>
  );
}
