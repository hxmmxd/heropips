'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Shield, CreditCard, LogOut, ChevronRight, Trash2, Moon, Bell, Camera, Coins, Phone, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUserAvatar } from '@/lib/avatar';
import { PhoneVerificationModal } from '@/components/PhoneVerificationModal';

interface ProfileTabProps {
  theme: 'light' | 'dark';
  switchTab?: (tab: string) => void;
}

export default function ProfileTab({ theme, switchTab }: ProfileTabProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
        setEditName(data?.full_name || user.user_metadata?.full_name || '');
        setCurrentAvatar(data?.avatar_url || user.user_metadata?.avatar_url || '');
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      // Update profile and auth
      await supabase.from('profiles').update({ avatar_url: urlWithCacheBust, updated_at: new Date().toISOString() }).eq('id', user.id);
      await supabase.auth.updateUser({ data: { avatar_url: urlWithCacheBust } });
      setCurrentAvatar(urlWithCacheBust);
    } catch (err: any) {
      console.error('Avatar upload failed:', err.message);
    } finally {
      setUploading(false);
    }
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const avatarUrl = currentAvatar ||
    getUserAvatar({ id: user?.id, full_name: userName, email: userEmail });
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
            <div className="profile-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
              <img src={avatarUrl} alt={userName} className="profile-avatar" />
              <div className="profile-avatar-overlay">
                {uploading ? (
                  <div className="auth-spinner" style={{ width: 18, height: 18, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                ) : (
                  <Camera className="profile-avatar-cam" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="profile-avatar-input"
              />
            </div>
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
          <div className="profile-field">
            <label>Mobile Number</label>
            <div className="profile-field-value" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone className="profile-field-icon" />
                <span>{profile?.phone_number || 'No number linked'}</span>
              </div>
              {profile?.phone_verified ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 size={12} /> Verified
                </span>
              ) : (
                <button
                  onClick={() => setShowPhoneModal(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#ff3c00] hover:bg-[#e03500] px-3 py-1 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <AlertTriangle size={12} /> Verify Number
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Plan Summary */}
        <div className="profile-section">
          <h4 className="profile-section-title">Subscription</h4>
          <div className="profile-plan-card">
            <div className="profile-plan-info">
              <CreditCard className="profile-field-icon" />
              <div>
                <p className="profile-plan-name">{(plan === 'free' || plan === 'starter') ? 'Free Plan' : 'Paid Plan'}</p>
                <p className="profile-plan-desc">{(plan === 'free' || plan === 'starter') ? 'Limited features • Upgrade for full access' : 'Full access to all features'}</p>
              </div>
            </div>
            <button
              className={(plan === 'free' || plan === 'starter') ? 'profile-upgrade-btn' : 'profile-manage-btn'}
              onClick={(e) => { e.stopPropagation(); switchTab?.('subscription'); }}
            >
              {(plan === 'free' || plan === 'starter') ? 'Upgrade' : 'Manage'}
            </button>
          </div>
        </div>

        {/* Billing History Card */}
        <div className="profile-section profile-section-clickable" onClick={() => switchTab?.('billing')}>
          <h4 className="profile-section-title">Billing</h4>
          <div className="profile-plan-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer' }}>
            <div className="profile-plan-info">
              <Coins className="profile-field-icon" />
              <div>
                <p className="profile-plan-name">Billing History</p>
                <p className="profile-plan-desc">View transaction logs and download PDF receipts</p>
              </div>
            </div>
            <ChevronRight className="profile-field-icon" style={{ marginLeft: 'auto', color: 'var(--subtext)' }} />
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
          <div
            className="profile-menu-item profile-menu-clickable"
            onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswordMsg(''); }}
          >
            <div className="profile-menu-left">
              <Shield className="profile-field-icon" />
              <span>Change password</span>
            </div>
            <ChevronRight className={`profile-field-icon transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
          </div>
          {showPasswordForm && (
            <div className="profile-password-form">
              <div className="profile-field">
                <label>New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={6}
                  className="profile-pw-input"
                />
              </div>
              <div className="profile-field">
                <label>Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={6}
                  className="profile-pw-input"
                />
              </div>
              {passwordMsg && (
                <p className={`profile-pw-msg ${passwordMsg.includes('success') ? 'profile-pw-success' : 'profile-pw-error'}`}>
                  {passwordMsg}
                </p>
              )}
              <button
                className="profile-save-btn"
                disabled={passwordSaving || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                onClick={async () => {
                  setPasswordSaving(true);
                  setPasswordMsg('');
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) {
                    setPasswordMsg(error.message);
                  } else {
                    setPasswordMsg('Password updated successfully!');
                    setNewPassword('');
                    setConfirmPassword('');
                  }
                  setPasswordSaving(false);
                }}
              >
                {passwordSaving ? '...' : 'Update password'}
              </button>
            </div>
          )}
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

      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onSuccess={async () => {
          setShowPhoneModal(false);
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setProfile(data);
          }
        }}
        onCancel={() => setShowPhoneModal(false)}
      />
    </div>
  );
}
