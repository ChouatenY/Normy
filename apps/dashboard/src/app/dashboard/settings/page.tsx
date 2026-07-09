'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../components/providers/AuthProvider.js';
import { supabase } from '../../../lib/supabase.js';
import { NormyProvider, useValidation } from '@normy-validation/react';

function ValidatedNameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const v = useValidation({ mode: 'onBlur', question: 'What is your display name for the Normy platform?' });

  return (
    <div className="input-group">
      <label className="input-label" htmlFor="settings-name">Display Name</label>
      <input
        id="settings-name"
        className={`input-field ${v.status === 'error' ? 'has-error' : v.status === 'success' ? 'has-success' : ''}`}
        value={value}
        onChange={(e) => { onChange(e.target.value); v.handleChange(e); }}
        onBlur={v.handleBlur}
      />
      {v.status !== 'idle' && v.status !== 'typing' && v.result?.feedback && (
        <div style={{ fontSize: '0.75rem', marginTop: 4, color: v.result.severity === 'success' ? 'var(--teal)' : v.result.severity === 'warning' ? 'var(--amber)' : 'var(--red)' }}>
          {v.result.feedback}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user, refreshSession, signOut } = useAuth();
  const [newName, setNewName] = useState(user?.user_metadata?.name || '');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { name: newName },
      email: newEmail
    });
    setSaving(false);
    if (error) {
      alert(error.message);
    } else {
      alert('Profile updated');
      await refreshSession();
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)', marginBottom: 24 }}>Account Settings</h1>
      <NormyProvider apiKey="nrm_live_demo" projectId="00000000-0000-0000-0000-000000000000" apiUrl="" showBadge={false}>
        <div className="card-glass" style={{ padding: 32, maxWidth: 600 }}>
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ValidatedNameInput value={newName} onChange={setNewName} />
            <div className="input-group">
              <label className="input-label" htmlFor="settings-email">Email Address</label>
              <input id="settings-email" className="input-field" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
          <hr style={{ borderColor: 'var(--border)', margin: '32px 0' }} />
          <button onClick={signOut} className="btn btn-glass" style={{ color: 'var(--red)' }}>Sign Out</button>
        </div>
      </NormyProvider>
    </div>
  );
}
