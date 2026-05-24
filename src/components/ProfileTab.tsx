'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, CreditCard, LogOut, ChevronRight, Trash2, Moon, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ProfileTabProps {
  theme: 'light' | 'dark';
}

export default function ProfileTab({ theme }: ProfileTabProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
        setEditName(data?.full_name || user.user_metadata?.full_name || '');
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: editName.trim(), updated_at: new Date().toISOString() }).eq('id', user.id);
    await supabase.auth.updateUser({ data: { full_name: editName.trim() } });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=10a37f&color=fff&size=128`;
  const plan = profile?.plan || 'free';
  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="auth-spinner" style={{ width: 24, height: 24, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'var(--subtext)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h2 className="profile-heading">Settings</h2>

        {/* Profile Card */}
        <div className="profile-section">
          <div className="profile-avatar-row">
            <img src={avatarUrl} alt={userName} className="profile-avatar" />
            <div className="profile-info">
              <h3 className="profile-name">{userName}</h3>
              <p className="profile-email">{userEmail}</p>
              {joinDate && <p className="profile-joined">Member since {joinDate}</p>}
            </div>
          </div>
        </div>

        {/* Edit Name */}
        <div className="profile-section">
          <h4 className="profile-section-title">Profile</h4>
          <div className="profile-field">
            <label>Display name</label>
            <div className="profile-field-row">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
              />
              <button
                onClick={handleSaveName}
                disabled={saving || editName.trim() === (user?.user_metadata?.full_name || '')}
                className="profile-save-btn"
              >
                {saving ? '...' : saved ? '✓' : 'Save'}
              </button>
            </div>
          </div>
          <div className="profile-field">
            <label>Email</label>
            <div className="profile-field-value">
              <Mail className="profile-field-icon" />
              <span>{userEmail}</span>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="profile-section">
          <h4 className="profile-section-title">Subscription</h4>
          <div className="profile-plan-card">
            <div className="profile-plan-info">
              <CreditCard className="profile-field-icon" />
              <div>
                <p className="profile-plan-name">{plan === 'free' ? 'Free Plan' : plan === 'pro' ? 'Pro Plan' : 'Enterprise'}</p>
                <p className="profile-plan-desc">{plan === 'free' ? 'Limited features • Upgrade for full access' : 'Full access to all features'}</p>
              </div>
            </div>
            {plan === 'free' && (
              <button className="profile-upgrade-btn">Upgrade</button>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="profile-section">
          <h4 className="profile-section-title">Preferences</h4>
          <div className="profile-menu-item">
            <div className="profile-menu-left">
              <Moon className="profile-field-icon" />
              <span>Appearance</span>
            </div>
            <span className="profile-menu-value">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </div>
          <div className="profile-menu-item">
            <div className="profile-menu-left">
              <Bell className="profile-field-icon" />
              <span>Notifications</span>
            </div>
            <span className="profile-menu-value">On</span>
          </div>
        </div>

        {/* Security */}
        <div className="profile-section">
          <h4 className="profile-section-title">Security</h4>
          <div className="profile-menu-item profile-menu-clickable">
            <div className="profile-menu-left">
              <Shield className="profile-field-icon" />
              <span>Change password</span>
            </div>
            <ChevronRight className="profile-field-icon" />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="profile-section profile-danger">
          <button onClick={handleLogout} className="profile-danger-btn">
            <LogOut className="profile-field-icon" />
            Log out
          </button>
          <button className="profile-danger-btn profile-delete-btn">
            <Trash2 className="profile-field-icon" />
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
