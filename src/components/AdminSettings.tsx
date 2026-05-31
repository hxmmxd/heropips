'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, Crown, Rocket, Loader2, Play, Copy, Shield, Settings, Activity, Send, Trash2, Key, Terminal, FileText
} from 'lucide-react';

interface AdminSettingsProps {
  initialConfig: Record<string, any>;
  initialAnnouncements: any[];
  onRefresh: () => Promise<void> | void;
}

export default function AdminSettings({
  initialConfig,
  initialAnnouncements,
  onRefresh
}: AdminSettingsProps) {
  const [settingsSubPage, setSettingsSubPage] = useState<'main' | 'referral' | 'pricing' | 'announcements' | 'payments'>('main');

  return (
    <div style={{ display: 'flex', gap: 24, width: '100%' }}>
      {/* ── Sub Navigation (Matches Admin Sidebar Theme) ── */}
      <div className="adm-nav" style={{ border: '1px solid var(--border)', borderRadius: 14, height: 'fit-content' }}>
        {[
          { id: 'main', label: 'Platform Controls', icon: Settings },
          { id: 'referral', label: 'Referral Program', icon: Crown },
          { id: 'pricing', label: 'Plan Pricing', icon: Zap },
          { id: 'announcements', label: 'Announcements', icon: Send },
          { id: 'payments', label: 'Payments Gateway', icon: Shield },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSettingsSubPage(tab.id as any)}
              className={`adm-nav-item ${settingsSubPage === tab.id ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left' }}
            >
              <Icon style={{ width: 16, height: 16 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Settings Sections ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {settingsSubPage === 'main' && (
          <PlatformTab initialConfig={initialConfig} />
        )}
        {settingsSubPage === 'referral' && (
          <ReferralTab initialConfig={initialConfig} />
        )}
        {settingsSubPage === 'pricing' && (
          <PricingTab initialConfig={initialConfig} />
        )}
        {settingsSubPage === 'announcements' && (
          <AnnouncementsTab initialAnnouncements={initialAnnouncements} onRefresh={onRefresh} />
        )}
        {settingsSubPage === 'payments' && (
          <PaymentsTab initialConfig={initialConfig} />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 1. PLATFORM CONTROLS TAB (Isolated States)
// ──────────────────────────────────────────────────────────────────────
function PlatformTab({ initialConfig }: { initialConfig: Record<string, any> }) {
  const [config, setConfig] = useState(initialConfig);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const toggleConfig = async (key: string) => {
    const newVal = !config[key];
    setConfig(prev => ({ ...prev, [key]: newVal }));
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: key, configValue: newVal })
    });
  };

  const toggleFeatureFlag = async (flagKey: string, currentVal: boolean) => {
    const updatedFlags = { ...config.feature_flags, [flagKey]: !currentVal };
    setConfig(prev => ({ ...prev, feature_flags: updatedFlags }));
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: 'feature_flags', configValue: updatedFlags })
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Platform Toggles */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>System Controls</h3>
        </div>
        <div className="adm-card-body">
          <div className="adm-toggle-list">
            {[
              { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Display client-facing maintenance screen to all users' },
              { key: 'ai_kill_switch', label: 'AI Signal Kill Switch', desc: 'Immediately pause all automated AI signal execution pipelines' },
              { key: 'new_registrations', label: 'Allow Registrations', desc: 'Permit new traders to register and create accounts' },
              { key: 'demo_mode', label: 'Demo Mode Simulation', desc: 'Route broker signals directly to simulator accounts' },
            ].map(t => (
              <div key={t.key} className="adm-toggle-row">
                <div className="adm-toggle-info">
                  <div>
                    <p className="adm-toggle-name">{t.label}</p>
                    <p className="adm-toggle-desc">{t.desc}</p>
                  </div>
                </div>
                <div
                  className={`adm-switch ${config[t.key] ? 'adm-switch-on' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleConfig(t.key)}
                >
                  <span className="adm-switch-track">
                    <span className="adm-switch-thumb" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>Feature Gates</h3>
        </div>
        <div className="adm-card-body">
          {config.feature_flags ? (
            <div className="adm-toggle-list">
              {Object.entries(config.feature_flags as Record<string, boolean>).map(([key, val]) => (
                <div key={key} className="adm-toggle-row">
                  <div className="adm-toggle-info">
                    <div>
                      <p className="adm-toggle-name" style={{ textTransform: 'capitalize' }}>
                        {key.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`adm-switch ${val ? 'adm-switch-on' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleFeatureFlag(key, val)}
                  >
                    <span className="adm-switch-track">
                      <span className="adm-switch-thumb" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--subtext)', padding: '12px 0' }}>No feature gates configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 2. REFERRAL PROGRAM TAB (Isolated State + Interactive Previews)
// ──────────────────────────────────────────────────────────────────────
function ReferralTab({ initialConfig }: { initialConfig: Record<string, any> }) {
  const [referralConfig, setReferralConfig] = useState(() => {
    if (initialConfig?.referral_config) {
      return initialConfig.referral_config;
    }
    return {
      enabled: true,
      levels: [
        { level: 1, label: 'Direct', commission: 10, rebate: 5 },
        { level: 2, label: 'Level 2', commission: 5, rebate: 2 },
        { level: 3, label: 'Level 3', commission: 3, rebate: 1 },
        { level: 4, label: 'Level 4', commission: 2, rebate: 0.5 },
        { level: 5, label: 'Level 5', commission: 1, rebate: 0.25 },
      ],
      milestones: [
        { referrals: 1, reward: 25 },
        { referrals: 5, reward: 100 },
        { referrals: 10, reward: 250 },
        { referrals: 25, reward: 750 },
        { referrals: 50, reward: 2000 },
      ],
      minWithdrawal: 50,
      cookieDays: 30,
      payoutDay: 1,
    };
  });
  const [saved, setSaved] = useState(false);

  const saveConfig = async () => {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: 'referral_config', configValue: referralConfig })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLevelChange = (index: number, key: 'label' | 'commission' | 'rebate', val: any) => {
    const newLevels = [...referralConfig.levels];
    newLevels[index] = { ...newLevels[index], [key]: val };
    setReferralConfig({ ...referralConfig, levels: newLevels });
  };

  const handleMilestoneChange = (index: number, key: 'reward', val: number) => {
    const newMilestones = [...referralConfig.milestones];
    newMilestones[index] = { ...newMilestones[index], [key]: val };
    setReferralConfig({ ...referralConfig, milestones: newMilestones });
  };

  const resetToDefaults = () => {
    setReferralConfig({
      enabled: true,
      levels: [
        { level: 1, label: 'Direct', commission: 10, rebate: 5 },
        { level: 2, label: 'Level 2', commission: 5, rebate: 2 },
        { level: 3, label: 'Level 3', commission: 3, rebate: 1 },
        { level: 4, label: 'Level 4', commission: 2, rebate: 0.5 },
        { level: 5, label: 'Level 5', commission: 1, rebate: 0.25 },
      ],
      milestones: [
        { referrals: 1, reward: 25 },
        { referrals: 5, reward: 100 },
        { referrals: 10, reward: 250 },
        { referrals: 25, reward: 750 },
        { referrals: 50, reward: 2000 },
      ],
      minWithdrawal: 50,
      cookieDays: 30,
      payoutDay: 1,
    });
  };

  return (
    <div className="adm-card adm-card-full">
      <div className="adm-card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3>🎁 Referral Program Settings</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: referralConfig.enabled ? '#10a37f' : 'var(--subtext)' }}>
            {referralConfig.enabled ? '● Active' : '○ Disabled'}
          </span>
          <div
            className={`adm-switch ${referralConfig.enabled ? 'adm-switch-on' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => setReferralConfig({ ...referralConfig, enabled: !referralConfig.enabled })}
          >
            <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
          </div>
        </div>
      </div>
      <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Level Commission */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Commission & Rebates Per Level</p>
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 140px 140px', background: 'var(--input-bg)', borderBottom: '1px solid var(--border)' }}>
              {['Lvl', 'Label', 'Commission %', 'Rebate %'].map(h => (
                <div key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</div>
              ))}
            </div>
            {referralConfig.levels.map((lvl: any, i: number) => (
              <div key={lvl.level} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 140px 140px', borderBottom: i < referralConfig.levels.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--subtext)' }}>
                  L{lvl.level}
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="adm-edit-input"
                    style={{ width: '100%', padding: '6px 10px' }}
                    value={lvl.label}
                    onChange={e => handleLevelChange(i, 'label', e.target.value)}
                  />
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    className="adm-edit-input"
                    style={{ width: 72, padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}
                    value={lvl.commission}
                    onChange={e => handleLevelChange(i, 'commission', Number(e.target.value))}
                  />
                  <span style={{ fontSize: 12, color: 'var(--subtext)' }}>%</span>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    className="adm-edit-input"
                    style={{ width: 72, padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}
                    value={lvl.rebate}
                    onChange={e => handleLevelChange(i, 'rebate', Number(e.target.value))}
                  />
                  <span style={{ fontSize: 12, color: 'var(--subtext)' }}>%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Milestone Rewards</p>
          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            {referralConfig.milestones.map((m: any, i: number) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i === referralConfig.milestones.length - 1 ? 'none' : '1px solid var(--border)',
                  gap: 16
                }}
              >
                {/* Part 1: Icon + Tier (Aligned left with fixed width) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 140, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                    }}
                  >
                    🏆
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--subtext)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Tier {i + 1} Target
                  </span>
                </div>

                {/* Part 2: Referral Count Target (Middle column, aligned) */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {m.referrals} Referral{m.referrals > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Part 3: Reward Input (Aligned right) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--input-bg, #f9fafb)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    width: 120,
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--subtext)', fontWeight: 700 }}>$</span>
                  <input
                    type="number"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      width: '100%',
                      textAlign: 'right',
                      fontWeight: 800,
                      fontSize: 14,
                      outline: 'none',
                      color: 'var(--text)',
                      padding: 0,
                      margin: 0,
                    }}
                    value={m.reward}
                    onChange={e => handleMilestoneChange(i, 'reward', Number(e.target.value))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Limits */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Threshold Configuration</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Min Withdrawal ($)', key: 'minWithdrawal' },
              { label: 'Cookie Days', key: 'cookieDays' },
              { label: 'Payout Day of Month', key: 'payoutDay' },
            ].map(f => (
              <div key={f.key} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, marginBottom: 6 }}>
                  {f.label}
                </label>
                <input
                  type="number"
                  className="adm-edit-input"
                  style={{ width: '100%', padding: '6px 10px', fontWeight: 700 }}
                  value={(referralConfig as any)[f.key]}
                  onChange={e => setReferralConfig({ ...referralConfig, [f.key]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button className="adm-post-btn" onClick={saveConfig}>
            Save Referral Configuration
          </button>
          <button className="adm-pagination button" style={{ height: 34, padding: '0 16px' }} onClick={resetToDefaults}>
            Reset defaults
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: '#10a37f', fontWeight: 600 }}>
              ✓ Settings stored
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 3. PLAN PRICING TAB (Dynamic Previews)
// ──────────────────────────────────────────────────────────────────────
function PricingTab({ initialConfig }: { initialConfig: Record<string, any> }) {
  const [config, setConfig] = useState(initialConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const handlePriceChange = (key: string, val: number) => {
    const pricing = { ...config.plan_pricing, [key]: val };
    setConfig(prev => ({ ...prev, plan_pricing: pricing }));
  };

  const savePricing = async () => {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: 'plan_pricing', configValue: config.plan_pricing })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="adm-card adm-card-full">
      <div className="adm-card-head">
        <h3>Plan Pricing Options</h3>
      </div>
      <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { key: 'starter', label: 'Starter Plan', desc: 'Starter Tier subscription' },
            { key: 'pro', label: 'Pro Plan', desc: 'Pro Tier subscription' },
            { key: 'enterprise', label: 'Enterprise Plan', desc: 'Enterprise Tier subscription' },
          ].map(tier => {
            const price = config.plan_pricing?.[tier.key] ?? 0;
            return (
              <div key={tier.key} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 14px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{tier.label}</p>
                <p style={{ fontSize: 11, color: 'var(--subtext)', margin: '0 0 12px' }}>{tier.desc}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, color: 'var(--subtext)', fontWeight: 600 }}>$</span>
                  <input
                    type="number"
                    className="adm-edit-input"
                    style={{ width: '100%', padding: '6px 10px', fontSize: 16, fontWeight: 800 }}
                    value={price}
                    onChange={e => handlePriceChange(tier.key, Number(e.target.value))}
                  />
                  <span style={{ fontSize: 12, color: 'var(--subtext)' }}>/mo</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button className="adm-post-btn" onClick={savePricing}>
            Save Plan Pricing
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: '#10a37f', fontWeight: 600 }}>
              ✓ Pricing updated
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 4. ANNOUNCEMENTS TAB (Isolated Feed Forms)
// ──────────────────────────────────────────────────────────────────────
function AnnouncementsTab({
  initialAnnouncements,
  onRefresh
}: {
  initialAnnouncements: any[];
  onRefresh: () => Promise<void> | void;
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAnnouncements(initialAnnouncements);
  }, [initialAnnouncements]);

  const postAnnouncement = async () => {
    if (!newAnnouncement.title) return;
    setLoading(true);
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement: newAnnouncement })
    });
    setNewAnnouncement({ title: '', message: '', type: 'info' });
    await onRefresh();
    setLoading(false);
  };

  const deleteAnnouncement = async (id: string) => {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement: { id, is_active: false } })
    });
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Post Board */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>Create Announcement</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Title</label>
              <input
                className="adm-edit-input"
                placeholder="e.g., Scheduled Maintenance"
                value={newAnnouncement.title}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Severity Type</label>
              <select
                className="adm-select"
                style={{ width: '100%' }}
                value={newAnnouncement.type}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="info">ℹ️ System Information</option>
                <option value="warning">⚠️ High Warning Alert</option>
                <option value="success">✅ Task Completed</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Announcement Content</label>
            <input
              className="adm-edit-input"
              placeholder="Provide notification details here..."
              value={newAnnouncement.message}
              onChange={e => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              className="adm-post-btn"
              disabled={loading || !newAnnouncement.title}
              onClick={postAnnouncement}
            >
              {loading ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Feed */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>Active Notifications ({announcements.length})</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {announcements.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '16px 0', color: 'var(--subtext)', fontSize: 13, margin: 0 }}>
              No active announcements broadcasted.
            </p>
          ) : (
            announcements.map(a => {
              const borderColors = { info: '#3b82f6', warning: '#f59e0b', success: '#10b981' };
              const color = borderColors[a.type as 'info' | 'warning' | 'success'] || '#3b82f6';
              return (
                <div
                  key={a.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: 'var(--input-bg)',
                    borderLeft: `4px solid ${color}`,
                    borderTop: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{a.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--subtext)', margin: '0 0 6px' }}>{a.message}</p>
                    <span style={{ fontSize: 10, color: 'var(--subtext)', opacity: 0.6 }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    style={{ background: 'transparent', border: 'none', color: 'var(--subtext)', cursor: 'pointer', padding: 2 }}
                    onClick={() => deleteAnnouncement(a.id)}
                  >
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 5. NOWPAYMENTS GATEWAY TAB (Isolate inputs + Connection Log Terminal)
// ──────────────────────────────────────────────────────────────────────
function PaymentsTab({ initialConfig }: { initialConfig: Record<string, any> }) {
  const [npApiKey, setNpApiKey] = useState('');
  const [npEmail, setNpEmail] = useState('');
  const [npPassword, setNpPassword] = useState('');
  const [npTotpSecret, setNpTotpSecret] = useState('');
  const [npIpnSecret, setNpIpnSecret] = useState('');
  const [npSandbox, setNpSandbox] = useState(false);
  const [npCoins, setNpCoins] = useState(['USDT (TRC-20)', 'USDT (ERC-20)', 'BTC', 'ETH', 'BNB', 'USDC']);

  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialConfig?.nowpayments_config) {
      const npc = initialConfig.nowpayments_config;
      setNpApiKey(npc.api_key || '');
      setNpEmail(npc.email || '');
      setNpPassword(npc.password || '');
      setNpTotpSecret(npc.totp_secret || '');
      setNpIpnSecret(npc.ipn_secret || '');
      setNpSandbox(npc.sandbox ?? false);
      if (Array.isArray(npc.enabled_coins)) {
        setNpCoins(npc.enabled_coins);
      }
    }
  }, [initialConfig]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const testGatewayConnection = async () => {
    setTesting(true);
    setLogs([]);
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    setLogs(prev => [...prev, `[INFO] Initializing gateway handshake...`]);
    await sleep(600);
    setLogs(prev => [...prev, `[INFO] Env Target: ${npSandbox ? 'SANDBOX SIMULATOR' : 'PRODUCTION GATEWAY'}`]);
    await sleep(500);
    setLogs(prev => [...prev, `[INFO] Resolving NOWPayments server status via withdrawals client...`]);
    await sleep(700);

    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_gateway', apiKey: npApiKey || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setLogs(prev => [
          ...prev,
          `[SUCCESS] Connection established! Node status: ONLINE`,
          `[SUCCESS] Response details: ${data.message}`
        ]);
      } else {
        setLogs(prev => [
          ...prev,
          `[ERROR] Handshake failed! Details: ${data.message}`
        ]);
      }
    } catch (e: any) {
      setLogs(prev => [...prev, `[ERROR] Network error: ${e.message}`]);
    }
    setTesting(false);
  };

  const saveConfiguration = async () => {
    const cfg = {
      api_key: npApiKey,
      email: npEmail,
      password: npPassword,
      totp_secret: npTotpSecret,
      ipn_secret: npIpnSecret,
      sandbox: npSandbox,
      enabled_coins: npCoins
    };
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: 'nowpayments_config', configValue: cfg })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Credentials */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Withdrawals Gateway Configuration</h3>
          <span style={{ fontSize: 11, fontWeight: 700, color: npSandbox ? '#f59e0b' : '#10a37f' }}>
            {npSandbox ? 'SANDBOX MODE' : 'PRODUCTION MODE'}
          </span>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'API Key (HMAC-SHA512)', key: 'api_key', val: npApiKey, setter: setNpApiKey },
            { label: 'nowpayments.io Login Email', key: 'email', val: npEmail, setter: setNpEmail },
            { label: 'nowpayments.io Login Password', key: 'password', val: npPassword, setter: setNpPassword },
            { label: '2FA Secure Key Secret (TOTP)', key: 'totp', val: npTotpSecret, setter: setNpTotpSecret },
            { label: 'IPN Webhook Verification Secret', key: 'ipn', val: npIpnSecret, setter: setNpIpnSecret },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>{f.label}</label>
              <input
                type="password"
                className="adm-edit-input"
                placeholder={f.val ? '••••••••••••••••••••••••••••••••' : 'Enter credential value...'}
                value={f.val}
                onChange={e => f.setter(e.target.value)}
              />
            </div>
          ))}

          {/* Sandbox toggle */}
          <div className="adm-toggle-row" style={{ borderBottom: 'none', padding: '8px 0 0' }}>
            <div className="adm-toggle-info">
              <div>
                <p className="adm-toggle-name">Sandbox Mode</p>
                <p className="adm-toggle-desc">Simulate payouts and transactions without moving real assets</p>
              </div>
            </div>
            <div
              className={`adm-switch ${npSandbox ? 'adm-switch-on' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setNpSandbox(!npSandbox)}
            >
              <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal log & Webhook */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>Gateway Handshake Diagnostics</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Terminal Console */}
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 10,
              border: '1px solid var(--border)',
              padding: 14,
              minHeight: 120,
              maxHeight: 180,
              overflowY: 'auto',
              fontFamily: 'Courier New, Courier, monospace',
              fontSize: 12,
              lineHeight: 1.4,
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
          >
            {logs.length === 0 ? (
              <span style={{ color: 'var(--subtext)' }}>Terminal ready. Click &quot;Test Connection&quot; to begin.</span>
            ) : (
              logs.map((log, index) => {
                let color = 'var(--text)';
                if (log.startsWith('[ERROR]')) color = '#ef4444';
                if (log.startsWith('[SUCCESS]')) color = '#10a37f';
                if (log.startsWith('[INFO]')) color = '#3b82f6';
                return (
                  <div key={index} style={{ color }}>
                    {log}
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Webhook */}
          <div
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 10, color: 'var(--subtext)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                IPN Callback URL
              </span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#10a37f', wordBreak: 'break-all' }}>
                {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/webhooks/nowpayments
              </span>
            </div>
            <button
              className="adm-pagination button"
              style={{ height: 32, padding: '0 12px', whiteSpace: 'nowrap' }}
              onClick={() => navigator.clipboard.writeText((typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com') + '/api/webhooks/nowpayments')}
            >
              ⎘ Copy
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <button
              className="adm-pagination button"
              style={{ height: 34, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={testing || !npApiKey}
              onClick={testGatewayConnection}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button className="adm-post-btn" onClick={saveConfiguration}>
              Save Gateway Configuration
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: '#10a37f', fontWeight: 600 }}>
                ✓ Gateway configuration saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
