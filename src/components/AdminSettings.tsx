'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, Crown, Rocket, Check, X, Loader2, Play, AlertTriangle, Copy, CheckCircle2, Shield, Settings, Activity, Send, Trash2, Key, Info, Terminal
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

  // Core configurations are passed down to child components which isolate state.
  return (
    <div className="settings-reimagined">
      <style>{`
        /* ── Reimagined Premium CSS System ── */
        .settings-reimagined {
          display: flex;
          gap: 24px;
          min-height: calc(100vh - 120px);
          font-family: 'Inter', system-ui, sans-serif;
          color: #f3f4f6;
        }

        @media (max-width: 1024px) {
          .settings-reimagined {
            flex-direction: column;
          }
        }

        /* Glass Sidebar */
        .settings-sidebar {
          width: 260px;
          flex-shrink: 0;
          background: rgba(17, 24, 39, 0.45);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-self: flex-start;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }

        @media (max-width: 1024px) {
          .settings-sidebar {
            width: 100%;
            flex-direction: row;
            overflow-x: auto;
            white-space: nowrap;
          }
        }

        .settings-sidebar-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: rgba(255, 255, 255, 0.4);
          padding: 12px 14px 6px;
        }

        .sidebar-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
        }

        .sidebar-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.04);
        }

        .sidebar-btn.active {
          color: #fff;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%);
          border-left: 3px solid #6366f1;
          box-shadow: inset 0 0 12px rgba(99, 102, 241, 0.08);
        }

        .sidebar-btn-icon {
          width: 18px;
          height: 18px;
          opacity: 0.8;
          transition: transform 0.2s ease;
        }

        .sidebar-btn.active .sidebar-btn-icon {
          opacity: 1;
          transform: scale(1.1);
          color: #818cf8;
        }

        /* Content Area */
        .settings-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Glass Cards */
        .premium-card {
          background: rgba(17, 24, 39, 0.45);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
          position: relative;
          overflow: hidden;
        }

        .premium-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        }

        .card-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 6px;
          background: linear-gradient(135deg, #fff 0%, #d1d5db 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-desc {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.55);
          margin: 0 0 20px;
          line-height: 1.5;
        }

        /* Custom Inputs styling */
        .re-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .re-label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .re-input {
          background: rgba(17, 24, 39, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 14px;
          color: #fff;
          font-family: inherit;
          font-size: 13px;
          transition: all 0.2s ease;
        }

        .re-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        /* Cyber toggles */
        .cyber-switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .cyber-switch-row:last-child {
          border-bottom: none;
        }

        .switch-info {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .switch-title {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          margin: 0 0 3px;
        }

        .switch-desc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
          margin: 0;
          line-height: 1.4;
        }

        .switch-icon-bg {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        /* Buttons styling */
        .re-btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
          transition: all 0.2s ease;
        }

        .re-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
        }

        .re-btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .re-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        /* Spin Animation */
        @keyframes customSpin {
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: customSpin 1s linear infinite;
        }
      `}</style>

      {/* ── Glass Sidebar Navigation ── */}
      <div className="settings-sidebar">
        <div className="settings-sidebar-title">Categories</div>
        {[
          { id: 'main', label: 'Platform Controls', icon: Settings },
          { id: 'referral', label: 'Referral Program', icon: Crown },
          { id: 'pricing', label: 'Plan Pricing', icon: Zap },
          { id: 'announcements', label: 'Announcements', icon: Send },
          { id: 'payments', label: 'NOWPayments Gateway', icon: Shield },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSettingsSubPage(tab.id as any)}
              className={`sidebar-btn ${settingsSubPage === tab.id ? 'active' : ''}`}
            >
              <Icon className="sidebar-btn-icon" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Active Content panel ── */}
      <div className="settings-content">
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
      <div className="premium-card">
        <h3 className="card-title"><Activity style={{ color: '#6366f1' }} /> System Parameters</h3>
        <p className="card-desc">Control global network configurations and live broker rules instantly.</p>

        <div>
          {[
            { key: 'maintenance_mode', icon: '⚠️', label: 'Maintenance Mode', desc: 'Display client-facing maintenance screen to all accounts', color: 'rgba(245,158,11,0.15)' },
            { key: 'ai_kill_switch', icon: '⚡', label: 'AI Signal Kill Switch', desc: 'Immediately freeze automated execution pipelines globally', color: 'rgba(239,68,68,0.15)' },
            { key: 'new_registrations', icon: '👤', label: 'Allow Registrations', desc: 'Permit new traders to register and initialize accounts', color: 'rgba(16,185,129,0.15)' },
            { key: 'demo_mode', icon: '🧪', label: 'Demo Mode Simulation', desc: 'Route broker signals directly to sandbox simulator accounts', color: 'rgba(99,102,241,0.15)' },
          ].map(t => (
            <div key={t.key} className="cyber-switch-row">
              <div className="switch-info">
                <div className="switch-icon-bg" style={{ backgroundColor: t.color }}>{t.icon}</div>
                <div>
                  <p className="switch-title">{t.label}</p>
                  <p className="switch-desc">{t.desc}</p>
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

      {/* Feature Flags */}
      <div className="premium-card">
        <h3 className="card-title">🚩 Feature Gates</h3>
        <p className="card-desc">Safely activate pre-release system components and features.</p>

        {config.feature_flags ? (
          <div>
            {Object.entries(config.feature_flags as Record<string, boolean>).map(([key, val]) => (
              <div key={key} className="cyber-switch-row">
                <div className="switch-info">
                  <div className="switch-icon-bg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', fontSize: 13 }}>🚩</div>
                  <div>
                    <p className="switch-title" style={{ textTransform: 'capitalize' }}>
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
          <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            No feature gates configured.
          </div>
        )}
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
    <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 className="card-title" style={{ margin: 0 }}>🎁 Multi-Tier Affiliates</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: referralConfig.enabled ? '#10b981' : '#ef4444' }}>
              {referralConfig.enabled ? '● ENABLED' : '○ DISABLED'}
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
        <p className="card-desc">Configure commission splits, milestone payouts, and user rebate rules.</p>
      </div>

      {/* Multi-Level splits */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Commission Matrix</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {referralConfig.levels.map((lvl: any, i: number) => {
            const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
            return (
              <div
                key={lvl.level}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 140px 140px',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 12
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: colors[i], color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800
                }}>
                  L{lvl.level}
                </div>
                <input
                  className="re-input"
                  style={{ width: '100%', padding: '8px 12px' }}
                  value={lvl.label}
                  onChange={e => handleLevelChange(i, 'label', e.target.value)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    className="re-input"
                    style={{ width: '100%', textAlign: 'center', fontWeight: 700, color: colors[i] }}
                    value={lvl.commission}
                    onChange={e => handleLevelChange(i, 'commission', Number(e.target.value))}
                  />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    className="re-input"
                    style={{ width: '100%', textAlign: 'center', fontWeight: 700, color: '#10b981' }}
                    value={lvl.rebate}
                    onChange={e => handleLevelChange(i, 'rebate', Number(e.target.value))}
                  />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone rewards */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Affiliate Targets & Milestones</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {referralConfig.milestones.map((m: any, i: number) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 12,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                🏆 {m.referrals} Direct Ref{m.referrals > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#10b981', fontWeight: 700 }}>$</span>
                <input
                  type="number"
                  className="re-input"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 14, fontWeight: 800, color: '#10b981' }}
                  value={m.reward}
                  onChange={e => handleMilestoneChange(i, 'reward', Number(e.target.value))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global limits */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Global Thresholds</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { label: 'Minimum Withdrawal ($)', key: 'minWithdrawal' },
            { label: 'Tracking Cookie (Days)', key: 'cookieDays' },
            { label: 'Payout Processing Day', key: 'payoutDay' },
          ].map(f => (
            <div
              key={f.key}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 12,
                padding: '14px'
              }}
            >
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 8 }}>
                {f.label}
              </label>
              <input
                type="number"
                className="re-input"
                style={{ width: '100%', padding: '8px 12px', fontWeight: 700 }}
                value={(referralConfig as any)[f.key]}
                onChange={e => setReferralConfig({ ...referralConfig, [f.key]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
        <button className="re-btn-primary" onClick={saveConfig}>
          <CheckCircle2 style={{ width: 16, height: 16 }} /> Save Changes
        </button>
        <button className="re-btn-secondary" onClick={resetToDefaults}>
          Reset to Defaults
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700, animation: 'fadeIn 0.2s ease' }}>
            ✓ Configuration saved successfully
          </span>
        )}
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
    <div className="premium-card">
      <h3 className="card-title"><Zap style={{ color: '#f59e0b' }} /> Plan Pricing Tiers</h3>
      <p className="card-desc">Configure client subscription pricing and dynamically preview cards live.</p>

      {/* Previews & Inputs Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            { key: 'starter', label: 'Starter Tier', icon: Rocket, color: '#6b7280', shadow: 'rgba(107,114,128,0.15)', desc: 'For automated trading entry levels' },
            { key: 'pro', label: 'Pro Tier', icon: Crown, color: '#8b5cf6', shadow: 'rgba(139,92,246,0.25)', desc: 'Optimized for high-performance scale' },
            { key: 'enterprise', label: 'Enterprise Tier', icon: Shield, color: '#f59e0b', shadow: 'rgba(245,158,11,0.25)', desc: 'Dedicated institutional integration' },
          ].map(tier => {
            const Icon = tier.icon;
            const price = config.plan_pricing?.[tier.key] ?? 0;
            return (
              <div
                key={tier.key}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid rgba(255,255,255,0.04)`,
                  borderRadius: 16,
                  padding: 24,
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: `0 10px 30px ${tier.shadow}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `linear-gradient(135deg, ${tier.color}20, ${tier.color}40)`,
                  display: 'flex', alignItems: 'center', justifySelf: 'center', margin: '0 auto',
                  justifyContent: 'center', color: tier.color
                }}>
                  <Icon style={{ width: 22, height: 22 }} />
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>{tier.label}</h4>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{tier.desc}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '8px 0' }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: tier.color }}>$</span>
                  <input
                    type="number"
                    className="re-input"
                    style={{ width: 90, fontSize: 20, fontWeight: 800, textAlign: 'center', color: '#fff' }}
                    value={price}
                    onChange={e => handlePriceChange(tier.key, Number(e.target.value))}
                  />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>/mo</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
          <button className="re-btn-primary" onClick={savePricing}>
            <CheckCircle2 style={{ width: 16, height: 16 }} /> Save Pricing Matrix
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>
              ✓ Subscriptions successfully updated
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
      <div className="premium-card">
        <h3 className="card-title"><Send style={{ color: '#3b82f6' }} /> Broadcast Terminal</h3>
        <p className="card-desc">Publish system-wide notifications, maintenance schedules, or alerts.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="re-input-group" style={{ marginBottom: 0 }}>
            <label className="re-label">Announcement Title</label>
            <input
              className="re-input"
              placeholder="e.g., MT5 Server Integration Upgrade"
              value={newAnnouncement.title}
              onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="re-input-group" style={{ marginBottom: 0 }}>
            <label className="re-label">Message Payload</label>
            <input
              className="re-input"
              placeholder="Detailed system update notes..."
              value={newAnnouncement.message}
              onChange={e => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="re-input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="re-label">Severity Level</label>
              <select
                className="re-input"
                style={{ background: 'rgba(17, 24, 39, 0.8)' }}
                value={newAnnouncement.type}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="info">ℹ️ System Info</option>
                <option value="warning">⚠️ High Warning</option>
                <option value="success">✅ Maintenance Completed</option>
              </select>
            </div>
            <button
              className="re-btn-primary"
              style={{ marginTop: 22, height: 42 }}
              disabled={loading || !newAnnouncement.title}
              onClick={postAnnouncement}
            >
              {loading ? <Loader2 className="spin" style={{ width: 16, height: 16 }} /> : 'Broadcast Broadcast'}
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Feed */}
      <div className="premium-card">
        <h3 className="card-title">📢 Published Board ({announcements.length})</h3>
        <p className="card-desc">Manage active announcements currently visible to connected accounts.</p>

        {announcements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            No broadcasts posted.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {announcements.map(a => {
              const borderColors = { info: '#3b82f6', warning: '#f59e0b', success: '#10b981' };
              const color = borderColors[a.type as 'info' | 'warning' | 'success'] || '#3b82f6';
              return (
                <div
                  key={a.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.02)',
                    borderLeft: `4px solid ${color}`,
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    borderRight: '1px solid rgba(255,255,255,0.04)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{a.title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{a.message}</p>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginTop: 4 }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                    onClick={() => deleteAnnouncement(a.id)}
                  >
                    <Trash2 style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
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
      <div className="premium-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 className="card-title" style={{ margin: 0 }}><Shield style={{ color: '#10b981' }} /> NOWPayments Gateway</h3>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: npSandbox ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
              color: npSandbox ? '#f59e0b' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              backgroundColor: npSandbox ? '#f59e0b' : '#10b981',
              animation: 'pulse 1.5s infinite'
            }} />
            {npSandbox ? 'SANDBOX ENGINE' : 'LIVE BLOCKCHAIN'}
          </div>
        </div>
        <p className="card-desc">Configure automated cryptocurrency withdrawals and transaction verification API credentials.</p>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'API Key (HMAC-SHA512)', hint: 'Dashboard → Settings → API Keys', val: npApiKey, setter: setNpApiKey, icon: Key },
            { label: 'Dashboard User Email', hint: 'Authenticated nowpayments.io dashboard email login', val: npEmail, setter: setNpEmail, icon: Send },
            { label: 'Dashboard Secure Password', hint: 'Password (exclusively authenticated via standard secure HTTPS tokens)', val: npPassword, setter: setNpPassword, icon: Key },
            { label: 'Two-Step 2FA Secret Key (TOTP)', hint: 'TOTP secret from Two-step auth setup in Dashboard settings', val: npTotpSecret, setter: setNpTotpSecret, icon: Shield },
            { label: 'IPN Instant Webhook Secret', hint: 'Verification key from Dashboard → Payment Settings', val: npIpnSecret, setter: setNpIpnSecret, icon: Shield },
          ].map(f => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="re-input-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="re-label"><Icon style={{ width: 14, height: 14, opacity: 0.6 }} /> {f.label}</label>
                  <span style={{ fontSize: 9, fontWeight: 700, color: f.val ? '#10b981' : '#f59e0b' }}>
                    {f.val ? 'CONFIGURED' : 'UNCONFIGURED'}
                  </span>
                </div>
                <input
                  type="password"
                  className="re-input"
                  placeholder="••••••••••••••••••••••••••••••••"
                  value={f.val}
                  onChange={e => f.setter(e.target.value)}
                />
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>{f.hint}</p>
              </div>
            );
          })}

          {/* Sandbox toggle */}
          <div className="cyber-switch-row" style={{ borderBottom: 'none', paddingTop: 8 }}>
            <div className="switch-info">
              <div className="switch-icon-bg" style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}>🧪</div>
              <div>
                <p className="switch-title">Activate Sandbox Test Mode</p>
                <p className="switch-desc">Verify connection status using play money sandbox testnets</p>
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

      {/* Connection log terminal */}
      <div className="premium-card">
        <h3 className="card-title"><Terminal style={{ color: '#10b981' }} /> Interactive Gateway Terminal</h3>
        <p className="card-desc">Execute instant handshakes and view debug outputs in real time.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: '#070b13',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.06)',
              padding: 16,
              minHeight: 140,
              maxHeight: 200,
              overflowY: 'auto',
              fontFamily: 'Courier New, Courier, monospace',
              fontSize: 12,
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
          >
            {logs.length === 0 ? (
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>Terminal idle. Awaiting handshake request...</span>
            ) : (
              logs.map((log, index) => {
                let color = '#fff';
                if (log.startsWith('[ERROR]')) color = '#ef4444';
                if (log.startsWith('[SUCCESS]')) color = '#10b981';
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

          {/* Webhook URLs */}
          <div
            style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Instant Payment Notification (IPN) Webhook URL
              </span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#818cf8', wordBreak: 'break-all' }}>
                {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/webhooks/nowpayments
              </span>
            </div>
            <button
              className="re-btn-secondary"
              style={{ padding: '8px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => navigator.clipboard.writeText((typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com') + '/api/webhooks/nowpayments')}
            >
              <Copy style={{ width: 14, height: 14 }} /> Copy
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, marginTop: 20 }}>
          <button
            className="re-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            disabled={testing || !npApiKey}
            onClick={testGatewayConnection}
          >
            {testing ? <Loader2 className="spin" style={{ width: 16, height: 16 }} /> : <Play style={{ width: 16, height: 16 }} />}
            🔌 Test Connection
          </button>
          <button className="re-btn-primary" onClick={saveConfiguration}>
            <CheckCircle2 style={{ width: 16, height: 16 }} /> Save Configuration
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>
              ✓ Gateway updated successfully
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
