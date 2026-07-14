'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../components/providers/AuthProvider.js';
import { supabase } from '../../../lib/supabase.js';
import { NormyProvider, useValidation } from '@normy-validation/react';
import { AvatarPicker } from '../../../components/ui/avatar-picker.js';

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
  const [selectedAvatarId, setSelectedAvatarId] = useState<number>(user?.user_metadata?.avatarId || 1);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { name: newName, avatarId: selectedAvatarId },
      email: newEmail
    });
    setSaving(false);
    if (error) {
      alert(error.message);
    } else {
      setToastMessage('Profile updated successfully');
      await refreshSession();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--white)' }}>Account Settings</h1>
        <button onClick={signOut} className="btn btn-glass" style={{ color: 'var(--red)', padding: '8px 16px' }}>Sign Out</button>
      </div>

      <NormyProvider apiKey="nrm_live_demo" projectId="00000000-0000-0000-0000-000000000000" apiUrl="" showBadge={false}>
        <form onSubmit={handleUpdate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 800 }}>
          
          {/* Avatar Card */}
          <div className="card-glass" style={{ padding: 32, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--white)', marginBottom: 24 }}>Profile Avatar</h3>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AvatarPicker selectedId={selectedAvatarId} onSelect={setSelectedAvatarId} />
            </div>
          </div>

          {/* Details Card */}
          <div className="card-glass" style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--white)', marginBottom: 24 }}>Account Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ValidatedNameInput value={newName} onChange={setNewName} />
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-email">Email Address</label>
                  <input id="settings-email" className="input-field" value={newEmail} onChange={e => setNewEmail(e.target.value)} disabled />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 32 }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </NormyProvider>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'rgba(10, 10, 10, 0.95)',
          border: '1px solid var(--teal)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          borderRadius: 8,
          padding: '16px 20px',
          zIndex: 9999,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          backdropFilter: 'blur(12px)',
        }}>
          <span style={{ fontSize: '1.25rem', color: 'var(--teal)' }}>✓</span>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{toastMessage}</div>
        </div>
      )}
    </div>
  );
}
