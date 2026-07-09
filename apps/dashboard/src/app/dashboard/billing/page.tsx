'use client';

import React from 'react';
import { useData } from '../../../components/providers/DataProvider.js';
import { CreditCard } from 'lucide-react';

export default function BillingPage() {
  const { selectedProject } = useData();

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: 24 }}>Billing & Quotas</h1>
      <div className="card-glass" style={{ padding: 32, maxWidth: 600 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--white)', marginBottom: 16 }}>Hosted AI Credits</h3>
        <p style={{ color: 'var(--text-sec)', marginBottom: 24 }}>Normy uses a BYOK-first model. If you are using Hosted AI, your credits will be displayed here.</p>
        
        <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
          <div style={{ flex: 1, padding: 16, background: 'var(--surface-1)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>Test Balance</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--white)' }}>$5.00</div>
          </div>
          <div style={{ flex: 1, padding: 16, background: 'var(--surface-1)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>Live Balance</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--white)' }}>$0.00</div>
          </div>
        </div>

        <button className="btn btn-glass" disabled style={{ opacity: 0.5 }}>Top Up Credits (Coming Soon)</button>
      </div>
    </div>
  );
}
