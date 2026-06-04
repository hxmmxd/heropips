'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, Crown, Rocket, Loader2, Play, Copy, Shield, Settings, Activity, Send, Trash2, Key, Terminal, FileText, Mail, Receipt, Cpu, Eye, EyeOff, CheckCircle2, Percent
} from 'lucide-react';

interface AdminSettingsProps {
  initialConfig: Record<string, any>;
  initialAnnouncements: any[];
  onRefresh: () => Promise<void> | void;
  apiStats?: any[];
}

export default function AdminSettings({
  initialConfig,
  initialAnnouncements,
  onRefresh,
  apiStats = [],
}: AdminSettingsProps) {
  const [settingsSubPage, setSettingsSubPage] = useState<'main' | 'referral' | 'pricing' | 'announcements' | 'payments' | 'smtp' | 'invoice' | 'integrations' | 'rebates'>('main');

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
          { id: 'smtp', label: 'SMTP Mailer', icon: Mail },
          { id: 'invoice', label: 'Invoice Branding', icon: Receipt },
          { id: 'integrations', label: 'API Integrations', icon: Cpu },
          { id: 'rebates', label: 'Rebate Controls', icon: Percent },
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
        {settingsSubPage === 'smtp' && (
          <SmtpTab initialConfig={initialConfig} />
        )}
        {settingsSubPage === 'invoice' && (
          <InvoiceConfigTab />
        )}
        {settingsSubPage === 'integrations' && (
          <ApiIntegrationsTab initialConfig={initialConfig} apiStats={apiStats} />
        )}
        {settingsSubPage === 'rebates' && (
          <RebatesTab />
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

  const getNormalizedPricing = () => {
    const defaultData: Record<string, any> = {
      starter: {
        price: 20,
        features: [
          '5 AI trade signals per day',
          '1 broker connection',
          'Basic market analysis',
          'Email support',
          'Trade history (30 days)',
          'Standard execution speed',
        ],
        limits: [
          'No advanced indicators',
          'No priority execution',
        ]
      },
      pro: {
        price: 50,
        features: [
          'Unlimited AI trade signals',
          '5 broker connections',
          'Advanced technical analysis',
          'Priority support (24/7)',
          'Full trade history',
          'Priority execution speed',
          'Risk management tools',
          'Custom trading strategies',
        ],
        limits: []
      },
      enterprise: {
        price: 100,
        features: [
          'Everything in Pro',
          'Unlimited broker connections',
          'Institutional-grade AI models',
          'Dedicated account manager',
          'API access & webhooks',
          'White-label dashboard',
          'Custom integrations',
          'Multi-user team access',
          'SLA guarantee (99.9%)',
        ],
        limits: []
      }
    };

    const currentPricing = config.plan_pricing || {};
    const normalized: Record<string, any> = {};

    ['starter', 'pro', 'enterprise'].forEach(k => {
      const val = currentPricing[k];
      if (val === undefined) {
        normalized[k] = defaultData[k];
      } else if (typeof val === 'number' || typeof val === 'string') {
        normalized[k] = {
          price: Number(val),
          features: defaultData[k].features,
          limits: defaultData[k].limits,
        };
      } else {
        normalized[k] = {
          price: val.price ?? defaultData[k].price,
          features: val.features ?? defaultData[k].features,
          limits: val.limits ?? defaultData[k].limits,
        };
      }
    });

    return normalized;
  };

  const pricingData = getNormalizedPricing();

  const handlePriceChange = (key: string, val: number) => {
    const updated = {
      ...pricingData,
      [key]: {
        ...pricingData[key],
        price: val
      }
    };
    setConfig(prev => ({ ...prev, plan_pricing: updated }));
  };

  const handleFeaturesChange = (key: string, field: 'features' | 'limits', list: string[]) => {
    const updated = {
      ...pricingData,
      [key]: {
        ...pricingData[key],
        [field]: list
      }
    };
    setConfig(prev => ({ ...prev, plan_pricing: updated }));
  };

  const savePricing = async () => {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: 'plan_pricing', configValue: pricingData })
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { key: 'starter', label: 'Starter Plan', desc: 'Starter Tier subscription' },
            { key: 'pro', label: 'Pro Plan', desc: 'Pro Tier subscription' },
            { key: 'enterprise', label: 'Enterprise Plan', desc: 'Enterprise Tier subscription' },
          ].map(tier => {
            const pData = pricingData[tier.key];
            return (
              <div key={tier.key} style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{tier.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--subtext)', margin: '2px 0 0' }}>{tier.desc}</p>
                </div>
                
                {/* Price input wrapper */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', display: 'block', marginBottom: 4 }}>Monthly Price</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--input-bg, #f9fafb)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
                    <span style={{ fontSize: 13, color: 'var(--subtext)', fontWeight: 700 }}>$</span>
                    <input
                      type="number"
                      style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 15, fontWeight: 800, color: 'var(--text)', outline: 'none', padding: 0, margin: 0 }}
                      value={pData.price}
                      onChange={e => handlePriceChange(tier.key, Number(e.target.value))}
                    />
                    <span style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 500 }}>/mo</span>
                  </div>
                </div>

                {/* Features input wrapper */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>Included Features</label>
                    <span style={{ fontSize: 10, color: 'var(--subtext)' }}>One per line</span>
                  </div>
                  <textarea
                    style={{
                      width: '100%',
                      minHeight: 120,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      padding: '8px 10px',
                      background: 'var(--input-bg, #f9fafb)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                      resize: 'vertical',
                      outline: 'none',
                      lineHeight: '1.4'
                    }}
                    value={pData.features.join('\n')}
                    onChange={e => handleFeaturesChange(tier.key, 'features', e.target.value.split('\n'))}
                  />
                </div>

                {/* Limits input wrapper */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>Excluded / Limits</label>
                    <span style={{ fontSize: 10, color: 'var(--subtext)' }}>One per line</span>
                  </div>
                  <textarea
                    style={{
                      width: '100%',
                      minHeight: 80,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      padding: '8px 10px',
                      background: 'var(--input-bg, #f9fafb)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                      resize: 'vertical',
                      outline: 'none',
                      lineHeight: '1.4'
                    }}
                    value={pData.limits.join('\n')}
                    onChange={e => handleFeaturesChange(tier.key, 'limits', e.target.value.split('\n'))}
                  />
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

// ──────────────────────────────────────────────────────────────────────
// 6. SMTP MAIL CONFIGURATION TAB
// ──────────────────────────────────────────────────────────────────────
function SmtpTab({ initialConfig }: { initialConfig: Record<string, any> }) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [from, setFrom] = useState('');
  const [secure, setSecure] = useState(false);

  const [testEmail, setTestEmail] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialConfig?.smtp_config) {
      const smtp = initialConfig.smtp_config;
      setHost(smtp.host || '');
      setPort(smtp.port?.toString() || '587');
      setUser(smtp.user || '');
      setPass(smtp.pass || '');
      setFrom(smtp.from || '');
      setSecure(!!smtp.secure);
    }
  }, [initialConfig]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const testConnection = async () => {
    setTesting(true);
    setLogs([]);
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    setLogs(prev => [...prev, `[INFO] Initializing SMTP connection test...`]);
    await sleep(400);
    setLogs(prev => [...prev, `[INFO] Connecting to ${host}:${port} (SSL/TLS: ${secure ? 'ON' : 'OFF'})...`]);
    await sleep(600);

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_smtp',
          smtpConfig: { host, port: Number(port), user, pass, from, secure },
          testEmail: testEmail || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLogs(prev => [
          ...prev,
          `[SUCCESS] Connection established! SMTP Server verified successfully.`,
          testEmail ? `[SUCCESS] Test verification email sent to: ${testEmail}` : `[INFO] (No test email requested. SMTP handshake succeeded.)`
        ]);
      } else {
        setLogs(prev => [
          ...prev,
          `[ERROR] Connection failed! Details: ${data.error}`
        ]);
      }
    } catch (e: any) {
      setLogs(prev => [...prev, `[ERROR] Network error: ${e.message}`]);
    }
    setTesting(false);
  };

  const saveConfiguration = async () => {
    const cfg = {
      host,
      port: Number(port) || 587,
      user,
      pass,
      from,
      secure
    };
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: 'smtp_config', configValue: cfg })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Form */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>SMTP Mailer Configuration</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>SMTP Host / Server</label>
              <input
                type="text"
                className="adm-edit-input"
                placeholder="smtp.mailgun.org or smtp.gmail.com"
                value={host}
                onChange={e => setHost(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>SMTP Port</label>
              <input
                type="text"
                className="adm-edit-input"
                placeholder="587, 465, or 25"
                value={port}
                onChange={e => setPort(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>SMTP Username / Login</label>
              <input
                type="text"
                className="adm-edit-input"
                placeholder="user@domain.com"
                value={user}
                onChange={e => setUser(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>SMTP Password</label>
              <input
                type="password"
                className="adm-edit-input"
                placeholder={pass ? '••••••••••••••••••••••••••••••••' : 'Enter SMTP password...'}
                value={pass}
                onChange={e => setPass(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Default Sender Email Address (From)</label>
            <input
              type="text"
              className="adm-edit-input"
              placeholder='TradeGPT <noreply@yourdomain.com>'
              value={from}
              onChange={e => setFrom(e.target.value)}
            />
          </div>

          {/* Secure SSL toggle */}
          <div className="adm-toggle-row" style={{ borderBottom: 'none', padding: '8px 0 0' }}>
            <div className="adm-toggle-info">
              <div>
                <p className="adm-toggle-name">SSL/TLS Secure Connection</p>
                <p className="adm-toggle-desc">Enable for port 465, disable for port 587 or 25 (uses STARTTLS)</p>
              </div>
            </div>
            <div
              className={`adm-switch ${secure ? 'adm-switch-on' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setSecure(!secure)}
            >
              <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics & Test email */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>Connection Handshake & Diagnostics</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Test Email recipient input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Send Test Verification Email To (Optional)</label>
            <input
              type="email"
              className="adm-edit-input"
              placeholder="Enter recipient email address..."
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
            />
          </div>

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
              <span style={{ color: 'var(--subtext)' }}>Terminal ready. Click &quot;Test Connection&quot; to verify SMTP server handshake.</span>
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

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <button
              className="adm-pagination button"
              style={{ height: 34, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={testing || !host}
              onClick={testConnection}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button className="adm-post-btn" onClick={saveConfiguration}>
              Save SMTP Configuration
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: '#10a37f', fontWeight: 600 }}>
                ✓ SMTP configuration saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// INVOICE CONFIG TAB
// ──────────────────────────────────────────────────────────────────────
const DEFAULT_INVOICE_CONFIG = {
  company_name: 'TradeGPT',
  company_tagline: 'Institutional AI Signal Platform',
  company_address: '1 Financial District',
  company_city: 'Dubai, UAE',
  company_country: 'United Arab Emirates',
  company_email: 'billing@tradegpt.ai',
  company_website: 'tradegpt.ai',
  company_phone: '+971 XX XXX XXXX',
  primary_color: '#6366f1',
  accent_color: '#8b5cf6',
  header_bg_color: '#0d1117',
  invoice_prefix: 'TG',
  currency_symbol: '$',
  currency_code: 'USD',
  tax_label: 'VAT (0%)',
  tax_rate: 0,
  show_tax_line: false,
  footer_note: 'Subscription activations occur automatically upon successful blockchain confirmation. All fees are non-refundable after plan activation.',
  support_email: 'support@tradegpt.ai',
  terms_url: 'tradegpt.ai/terms',
  show_watermark: true,
  watermark_text: 'PAID',
};

function InvoiceConfigTab() {
  const [cfg, setCfg] = useState<Record<string, any>>(DEFAULT_INVOICE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/invoice-config')
      .then(r => r.json())
      .then(data => { setCfg({ ...DEFAULT_INVOICE_CONFIG, ...data }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: string, v: any) => setCfg(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/invoice-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const textField = (label: string, key: string, helpText?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--subtext)' }}>{label}</label>
      <input
        type="text"
        value={cfg[key] ?? ''}
        onChange={e => set(key, e.target.value)}
        style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}
      />
      {helpText && <span style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>{helpText}</span>}
    </div>
  );

  const numberField = (label: string, key: string, helpText?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--subtext)' }}>{label}</label>
      <input
        type="number"
        value={cfg[key] ?? 0}
        onChange={e => set(key, Number(e.target.value))}
        style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}
      />
      {helpText && <span style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>{helpText}</span>}
    </div>
  );

  const colorField = (label: string, key: string, helpText?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--subtext)' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="color"
          value={cfg[key] || '#6366f1'}
          onChange={e => set(key, e.target.value)}
          style={{ width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 2, background: 'var(--input-bg)' }}
        />
        <input
          type="text"
          value={cfg[key] || ''}
          onChange={e => set(key, e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'monospace', outline: 'none' }}
        />
      </div>
      {helpText && <span style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>{helpText}</span>}
    </div>
  );

  const toggleField = (label: string, key: string, onLabel: string, offLabel: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--subtext)' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          onClick={() => set(key, !cfg[key])}
          style={{ width: 44, height: 24, borderRadius: 12, background: cfg[key] ? '#6366f1' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
        >
          <div style={{ position: 'absolute', top: 3, left: cfg[key] ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--subtext)' }}>{cfg[key] ? onLabel : offLabel}</span>
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--subtext)' }}>Loading invoice configuration...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header card */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt style={{ width: 20, height: 20, color: '#6366f1' }} />
            Invoice & Receipt Branding
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--subtext)' }}>
            Configure company info, colors, tax rules, and document layout for all generated PDF invoices.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>✓ Saved</span>}
          <button type="button" onClick={save} disabled={saving} className="adm-post-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 style={{ width: 14, height: 14 }} className="adm-spin" /> : <FileText style={{ width: 14, height: 14 }} />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Company Info */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>🏢 Company Information</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {textField('Company Name', 'company_name')}
          {textField('Tagline / Description', 'company_tagline')}
          {textField('Billing Email', 'company_email', 'Shown in the From section of every invoice')}
          {textField('Phone Number', 'company_phone')}
          {textField('Address Line', 'company_address')}
          {textField('City & State', 'company_city')}
          {textField('Country', 'company_country')}
          {textField('Website', 'company_website', 'Shown in header and document footer')}
        </div>
      </div>

      {/* Branding Colors */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>🎨 Branding Colors</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {colorField('Primary Color', 'primary_color', 'Accent stripes, badges, total box, header labels')}
          {colorField('Accent Color', 'accent_color', 'Secondary highlights and decorative elements')}
          {colorField('Header Background', 'header_bg_color', 'Top banner and footer bar background')}
        </div>
        {/* Live preview */}
        <div style={{ marginTop: 18, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ background: cfg.header_bg_color, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${cfg.primary_color}` }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{cfg.company_name || 'Company Name'}</div>
              <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 3 }}>{cfg.company_tagline}</div>
              <div style={{ color: cfg.primary_color, fontSize: 11, marginTop: 4 }}>{cfg.company_website}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px' }}>INVOICE</div>
              <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 2 }}>{cfg.invoice_prefix}-A3F91B2C</div>
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '10px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ background: '#10b981', borderRadius: 4, padding: '3px 10px', color: '#fff', fontSize: 11, fontWeight: 700 }}>PAID</div>
            <div style={{ background: cfg.primary_color, borderRadius: 4, padding: '3px 10px', color: '#fff', fontSize: 11, fontWeight: 700 }}>COMPLETED</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>Live preview — updates in real-time</div>
          </div>
        </div>
      </div>

      {/* Invoice Numbering */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>🔢 Invoice Numbering & Currency</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {textField('Invoice ID Prefix', 'invoice_prefix', 'e.g. TG → TG-A3F91B2C')}
          {textField('Currency Symbol', 'currency_symbol', 'e.g. $ £ € ₹')}
          {textField('Currency Code', 'currency_code', 'ISO code e.g. USD, GBP, EUR')}
        </div>
      </div>

      {/* Tax */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>🧾 Tax Configuration</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {toggleField('Show Tax Line', 'show_tax_line', 'Tax line shown on invoice', 'No tax line (0% / excluded)')}
          {cfg.show_tax_line && textField('Tax Label', 'tax_label', 'e.g. VAT (5%), GST, Sales Tax')}
          {cfg.show_tax_line && numberField('Tax Rate (%)', 'tax_rate', 'Percentage applied to subtotal')}
        </div>
      </div>

      {/* Watermark */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>🔏 Watermark & Security</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {toggleField('Diagonal Watermark (completed invoices only)', 'show_watermark', 'Watermark stamp enabled', 'No watermark')}
          {textField('Watermark Text', 'watermark_text', 'e.g. PAID, OFFICIAL, CONFIDENTIAL')}
        </div>
      </div>

      {/* Footer & Legal */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>📋 Footer & Legal Text</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {textField('Support Email', 'support_email', 'Displayed in invoice footer contact info')}
          {textField('Terms of Service URL', 'terms_url', 'e.g. tradegpt.ai/terms')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--subtext)' }}>Payment Notes / Legal Disclaimer</label>
          <textarea
            value={cfg.footer_note || ''}
            onChange={e => set('footer_note', e.target.value)}
            rows={3}
            style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
          />
          <span style={{ fontSize: 11, color: 'var(--subtext)' }}>This text appears in the "Payment Notes" panel on every generated PDF invoice.</span>
        </div>
      </div>

      {/* Save row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center', paddingBottom: 16 }}>
        {saved && <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>✓ Configuration saved successfully</span>}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="adm-post-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <Loader2 style={{ width: 14, height: 14 }} className="adm-spin" /> : <FileText style={{ width: 14, height: 14 }} />}
          {saving ? 'Saving...' : 'Save Invoice Configuration'}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 8. API INTEGRATIONS TAB
// ──────────────────────────────────────────────────────────────────────
function ApiIntegrationsTab({ initialConfig, apiStats = [] }: { initialConfig: Record<string, any>; apiStats?: any[] }) {
  const integrations = [
    {
      id: 'twelve_data',
      label: 'Twelve Data',
      description: 'Market data, indicators (RSI, MACD, EMA, ATR), and candle history',
      planNote: 'Grow plan ($29/mo) recommended — 55 credits/min, no daily limits',
      docsUrl: 'https://twelvedata.com/pricing',
      fields: [
        { key: 'twelve_data_api_key', label: 'API Key', placeholder: 'Enter Twelve Data API key', isSecret: true },
      ],
    },
    {
      id: 'nvidia',
      label: 'NVIDIA NIM (AI Chat)',
      description: 'Powers the AI multi-agent trading analysis and chat responses',
      planNote: 'Multiple keys supported (comma-separated) for round-robin rotation',
      docsUrl: 'https://build.nvidia.com/',
      fields: [
        { key: 'nvidia_api_keys', label: 'API Key(s)', placeholder: 'nvapi-xxxx,nvapi-yyyy (comma-separated)', isSecret: true },
      ],
    },
    {
      id: 'metaapi',
      label: 'MetaAPI (MT5 Broker)',
      description: 'Connects MetaTrader 5 broker accounts for live trade execution',
      planNote: 'Required for live broker connectivity and automated order execution',
      docsUrl: 'https://metaapi.cloud/',
      fields: [
        { key: 'metaapi_token', label: 'API Token', placeholder: 'Enter MetaAPI token', isSecret: true },
      ],
    },
    {
      id: 'yahoo_finance',
      label: 'Yahoo Finance',
      description: 'Free unofficial price feed — fallback for Forex, Metals, and ETFs when Twelve Data quota is exceeded',
      planNote: 'No API key required — free and unlimited (soft rate-limited). Used as fallback only when Twelve Data returns no data.',
      docsUrl: 'https://finance.yahoo.com/',
      fields: [
        { key: 'yahoo_finance_enabled', label: 'Enable as Fallback', placeholder: 'true', isSecret: false, isToggle: true },
      ],
    },
  ];

  // Per-field state
  type FieldState = { value: string; show: boolean; saving: boolean; saved: boolean };
  const [fields, setFields] = useState<Record<string, FieldState>>(() => {
    const init: Record<string, FieldState> = {};
    for (const intg of integrations) {
      for (const f of intg.fields) {
        const existing = initialConfig[f.key];
        init[f.key] = {
          value: existing || '',
          show: false,
          saving: false,
          saved: false,
        };
      }
    }
    return init;
  });

  const setField = (key: string, patch: Partial<FieldState>) =>
    setFields(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const saveField = async (key: string) => {
    setField(key, { saving: true, saved: false });
    try {
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configKey: key, configValue: fields[key].value }),
      });
      setField(key, { saving: false, saved: true });
      setTimeout(() => setField(key, { saved: false }), 3000);
    } catch {
      setField(key, { saving: false });
    }
  };

  const maskValue = (val: string) => {
    if (!val) return '';
    if (val.length <= 8) return '••••••••';
    return val.slice(0, 4) + '••••••••' + val.slice(-4);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>API Integrations</h3>
          <p style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 4 }}>
            Keys saved here override <code style={{ fontSize: 11, background: 'var(--input-bg)', padding: '1px 5px', borderRadius: 4 }}>.env.local</code> — changes take effect within 60 seconds, no redeploy needed.
          </p>
        </div>
      </div>

      {integrations.map(intg => {
        const stat = apiStats.find((s: any) => s.name === intg.id);
        const callsPerMin = stat?.recentTimestamps?.length ?? null;
        const statusColor = !stat ? '#6b7280'
          : stat.status === 'active' ? '#10b981'
          : stat.status === 'error' ? '#ef4444'
          : stat.status === 'unconfigured' ? '#f59e0b'
          : '#6b7280';
        const statusLabel = !stat ? 'No data'
          : stat.status === 'active' ? 'Connected'
          : stat.status === 'error' ? 'Error'
          : stat.status === 'unconfigured' ? 'Not Configured'
          : 'Idle';

        return (
        <div key={intg.id} className="adm-card adm-card-full">
          <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Cpu style={{ width: 16, height: 16, color: 'var(--subtext)' }} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{intg.label}</h4>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>{intg.description}</p>
                </div>
              </div>
              {/* Live status badge + metrics */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {stat && (
                  <>
                    {callsPerMin !== null && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>{callsPerMin}<span style={{ fontSize: 10, color: 'var(--subtext)', fontWeight: 400 }}>/min</span></p>
                        {stat.avgLatencyMs > 0 && <p style={{ margin: 0, fontSize: 10, color: 'var(--subtext)' }}>{stat.avgLatencyMs}ms avg</p>}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: `${statusColor}15`, border: `1px solid ${statusColor}40` }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: stat.status === 'active' ? `0 0 5px ${statusColor}` : 'none' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                    </div>
                  </>
                )}
                <a
                  href={intg.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: '#4f8ef7', textDecoration: 'none' }}
                >
                  Docs ↗
                </a>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--subtext)', background: 'var(--input-bg)', padding: '6px 10px', borderRadius: 7 }}>
              💡 {intg.planNote}
            </div>
            {stat?.lastErrorMsg && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.06)', padding: '6px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)' }}>
                ⚠ Last error: {stat.lastErrorMsg}
              </div>
            )}
          </div>

          <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {intg.fields.map(f => {
              const fstate = fields[f.key] || { value: '', show: false, saving: false, saved: false };
              const isEnabled = fstate.value === 'true' || fstate.value === '1';

              // ── Toggle field (e.g. Yahoo Finance enable/disable) ──
              if ((f as any).isToggle) {
                return (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.label}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--subtext)', marginTop: 3 }}>
                        Currently <strong style={{ color: isEnabled ? '#10b981' : 'var(--subtext)' }}>{isEnabled ? 'enabled' : 'disabled'}</strong>
                        {fstate.saved && <span style={{ color: '#10b981', marginLeft: 8 }}>✓ Saved</span>}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const next = isEnabled ? 'false' : 'true';
                        setField(f.key, { value: next, saving: true });
                        await fetch('/api/admin', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ configKey: f.key, configValue: next }),
                        });
                        setField(f.key, { value: next, saving: false, saved: true });
                        setTimeout(() => setField(f.key, { saved: false }), 3000);
                      }}
                      style={{
                        width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                        background: isEnabled ? '#10b981' : 'var(--input-bg)',
                        position: 'relative', transition: 'background 0.25s', flexShrink: 0,
                        boxShadow: isEnabled ? '0 0 8px rgba(16,185,129,0.3)' : 'none',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 3, left: isEnabled ? 26 : 4,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#fff', transition: 'left 0.25s',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      }} />
                    </button>
                  </div>
                );
              }

              // ── Regular key/secret field ──
              return (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)', display: 'block', marginBottom: 6 }}>
                    {f.label}
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type={f.isSecret && !fstate.show ? 'password' : 'text'}
                        value={fstate.value}
                        onChange={e => setField(f.key, { value: e.target.value, saved: false })}
                        placeholder={fstate.value ? maskValue(fstate.value) : f.placeholder}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: 'var(--input-bg)', border: '1px solid var(--border)',
                          borderRadius: 9, padding: '9px 36px 9px 12px',
                          fontSize: 13, color: 'var(--text)',
                          outline: 'none', fontFamily: 'monospace',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#4f8ef7')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                      />
                      {f.isSecret && (
                        <button
                          type="button"
                          onClick={() => setField(f.key, { show: !fstate.show })}
                          style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--subtext)', padding: 2,
                          }}
                        >
                          {fstate.show
                            ? <EyeOff style={{ width: 15, height: 15 }} />
                            : <Eye style={{ width: 15, height: 15 }} />}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => saveField(f.key)}
                      disabled={fstate.saving || !fstate.value}
                      style={{
                        padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                        background: fstate.saved ? '#10b981' : '#4f8ef7',
                        color: '#fff', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6,
                        opacity: fstate.saving || !fstate.value ? 0.6 : 1,
                        transition: 'background 0.3s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fstate.saving
                        ? <><Loader2 style={{ width: 13, height: 13 }} className="adm-spin" /> Saving</>
                        : fstate.saved
                        ? <><CheckCircle2 style={{ width: 13, height: 13 }} /> Saved!</>
                        : <><Key style={{ width: 13, height: 13 }} /> Save Key</>}
                    </button>
                  </div>
                  {fstate.saved && (
                    <p style={{ fontSize: 11, color: '#10b981', marginTop: 5 }}>
                      ✓ Key updated. Takes effect within 60 seconds — no restart needed.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 9. REBATES CONFIGURATION TAB
// ──────────────────────────────────────────────────────────────────────
function RebatesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({
    rebate_system_enabled: true,
    default_rebate_rate_per_lot: 1.50,
    min_withdrawal_threshold: 50.00,
  });
  const [riskSettings, setRiskSettings] = useState<any>({
    id: '',
    exclude_hedged_positions: true,
    hedge_time_buffer_seconds: 15,
    max_drawdown_limit: 35.00,
    spread_protection_multiplier: 0.70,
    clawback_grace_period_days: 14,
  });
  const [promotions, setPromotions] = useState<any[]>([]);
  const [volumeTiers, setVolumeTiers] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<'rules' | 'risk' | 'promotions' | 'tiers' | 'levels' | 'milestones'>('rules');
  const [rebateLevels, setRebateLevels] = useState<any[]>([]);
  const [milestonesList, setMilestonesList] = useState<any[]>([]);

  // Modal states
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [ruleForm, setRuleForm] = useState({
    broker_provider_id: '',
    symbol: '*',
    rebate_per_lot: 2.00,
    min_hold_time_seconds: 120,
    min_pip_distance: 3.00,
    free_multiplier: 0.60,
    pro_multiplier: 0.80,
    enterprise_multiplier: 1.00,
  });

  const [showAddPromo, setShowAddPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({
    name: '',
    symbol: '*',
    multiplier: 1.20,
    start_time: '',
    end_time: '',
    description: '',
  });

  const loadRebateData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin');
      if (res.ok) {
        const d = await res.json();
        setProviders(d.brokerProviders || []);
        setRules(d.rebateRules || []);
        if (d.config?.rebate_config) {
          setConfig(d.config.rebate_config);
        }
        if (d.rebateRiskSettings) {
          setRiskSettings(d.rebateRiskSettings);
        }
        setPromotions(d.rebatePromotions || []);
        setVolumeTiers(d.rebateVolumeTiers || []);
        
        // Set default broker provider in form if exists
        if (d.brokerProviders?.length > 0) {
          setRuleForm(prev => ({ ...prev, broker_provider_id: d.brokerProviders[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRebateData();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configKey: 'rebate_config', configValue: config }),
      });
      if (res.ok) {
        alert('Global rebate settings saved successfully.');
      } else {
        alert('Failed to save settings.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRiskSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rebateRiskRule: riskSettings }),
      });
      if (res.ok) {
        alert('Rebate risk settings saved successfully.');
      } else {
        alert('Failed to save risk settings.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rebatePromotion: {
            action: 'create',
            data: promoForm,
          }
        }),
      });
      if (res.ok) {
        setShowAddPromo(false);
        setPromoForm({
          name: '',
          symbol: '*',
          multiplier: 1.20,
          start_time: '',
          end_time: '',
          description: '',
        });
        await loadRebateData();
      } else {
        alert('Failed to create promotion.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePromo = async (promo: any) => {
    if (!confirm(`Are you sure you want to delete promo "${promo.name}"?`)) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rebatePromotion: {
            action: 'delete',
            data: { id: promo.id }
          }
        }),
      });
      if (res.ok) {
        await loadRebateData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTierMultiplier = async (tierId: string, multiplier: number) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rebateVolumeTier: {
            action: 'update',
            data: { id: tierId, payout_multiplier: multiplier },
          }
        }),
      });
      if (res.ok) {
        setVolumeTiers(prev => prev.map(t => t.id === tierId ? { ...t, payout_multiplier: multiplier } : t));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const action = editingRule ? 'update' : 'create';
      const payload = editingRule 
        ? { ...ruleForm, id: editingRule.id }
        : ruleForm;

      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rebateRule: {
            action,
            data: payload,
          },
        }),
      });

      if (res.ok) {
        setShowAddRule(false);
        setEditingRule(null);
        await loadRebateData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save rule.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (rule: any) => {
    if (!confirm(`Are you sure you want to delete the rule for ${rule.symbol}?`)) return;
    try {
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rebateRule: {
            action: 'delete',
            data: { id: rule.id },
          },
        }),
      });
      await loadRebateData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <Loader2 className="adm-spin" style={{ width: 24, height: 24, color: '#10a37f' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Global Config Card */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Global Rebate Controls</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: config.rebate_system_enabled ? '#10a37f' : 'var(--subtext)' }}>
              {config.rebate_system_enabled ? '● System Enabled' : '○ System Disabled'}
            </span>
            <div
              className={`adm-switch ${config.rebate_system_enabled ? 'adm-switch-on' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setConfig({ ...config, rebate_system_enabled: !config.rebate_system_enabled })}
            >
              <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
            </div>
          </div>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, marginBottom: 6 }}>
                Default Rebate Per Lot ($)
              </label>
              <input
                type="number"
                step="0.01"
                className="adm-edit-input"
                style={{ width: '100%', padding: '8px 12px', fontWeight: 700 }}
                value={config.default_rebate_rate_per_lot}
                onChange={e => setConfig({ ...config, default_rebate_rate_per_lot: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, marginBottom: 6 }}>
                Minimum Withdrawal Threshold ($)
              </label>
              <input
                type="number"
                step="0.01"
                className="adm-edit-input"
                style={{ width: '100%', padding: '8px 12px', fontWeight: 700 }}
                value={config.min_withdrawal_threshold}
                onChange={e => setConfig({ ...config, min_withdrawal_threshold: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <button className="adm-post-btn" style={{ alignSelf: 'flex-start' }} onClick={handleSaveConfig} disabled={saving}>
            Save Global Settings
          </button>
        </div>
      </div>

      {/* Sub tabs Selector */}
      <div style={{ display: 'flex', gap: 8, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 4 }}>
        {[
          { id: 'rules', label: 'Rate Rules' },
          { id: 'levels', label: 'Multi-Level %' },
          { id: 'milestones', label: '40/40/20 Milestones' },
          { id: 'risk', label: 'Risk Safeguards' },
          { id: 'promotions', label: 'Happy Hours & Promos' },
          { id: 'tiers', label: 'Volume Tiers' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: subTab === t.id ? '#10a37f' : 'transparent',
              color: subTab === t.id ? '#fff' : 'var(--subtext)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => setSubTab(t.id as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Dynamic Content Cards */}
      {subTab === 'rules' && (
        <div className="adm-card adm-card-full">
          <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Symbol-Specific Overrides</h3>
              <p style={{ fontSize: 11, color: 'var(--subtext)', margin: '2px 0 0' }}>Configure micro-settings and rebate rates per symbol or broker provider.</p>
            </div>
            <button 
              className="adm-post-btn" 
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px' }}
              onClick={() => {
                setEditingRule(null);
                setRuleForm({
                  broker_provider_id: providers[0]?.id || '',
                  symbol: '*',
                  rebate_per_lot: 2.00,
                  min_hold_time_seconds: 120,
                  min_pip_distance: 3.00,
                  free_multiplier: 0.60,
                  pro_multiplier: 0.80,
                  enterprise_multiplier: 1.00,
                });
                setShowAddRule(true);
              }}
            >
              Add Custom Rule
            </button>
          </div>
          <div className="adm-card-body" style={{ padding: 0 }}>
            {rules.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--subtext)', fontSize: 13 }}>
                No custom rebate rules defined. The platform will use global default rates.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="adm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Broker / Symbol</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Base Rate ($/lot)</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Min Hold / Pips</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Multipliers (F / P / E)</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => {
                      const provider = providers.find(p => p.id === rule.broker_provider_id);
                      return (
                        <tr key={rule.id} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{rule.symbol}</div>
                            <div style={{ fontSize: 10, color: 'var(--subtext)' }}>{provider?.name || 'Unknown Broker'}</div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>
                            ${rule.rebate_per_lot.toFixed(2)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12 }}>
                            <div>{rule.min_hold_time_seconds}s</div>
                            <div style={{ fontSize: 10, color: 'var(--subtext)' }}>min {rule.min_pip_distance} pips</div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: 6, fontSize: 11, fontWeight: 700 }}>
                              <span style={{ color: 'var(--subtext)', background: 'var(--input-bg)', padding: '2px 6px', borderRadius: 4 }}>Free: {rule.free_multiplier}x</span>
                              <span style={{ color: '#10a37f', background: 'var(--input-bg)', padding: '2px 6px', borderRadius: 4 }}>Pro: {rule.pro_multiplier}x</span>
                              <span style={{ color: '#6366f1', background: 'var(--input-bg)', padding: '2px 6px', borderRadius: 4 }}>Ent: {rule.enterprise_multiplier}x</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button 
                                className="adm-pagination button" 
                                style={{ padding: '4px 10px', height: 28 }}
                                onClick={() => {
                                  setEditingRule(rule);
                                  setRuleForm({ ...rule });
                                  setShowAddRule(true);
                                }}
                              >
                                Edit
                              </button>
                              <button 
                                className="adm-pagination button" 
                                style={{ padding: '4px 10px', height: 28, borderColor: '#ef4444', color: '#ef4444' }}
                                onClick={() => handleDeleteRule(rule)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'risk' && (
        <div className="adm-card adm-card-full">
          <div className="adm-card-head">
            <h3>Risk Safeguards & Anti-Gaming</h3>
            <p style={{ fontSize: 11, color: 'var(--subtext)', margin: '2px 0 0' }}>Configure multi-account correlation thresholds, drawdown limits, and spread safeguards.</p>
          </div>
          <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 15 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, display: 'block' }}>Exclude Opposing Hedged Positions</span>
                <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Nullifies rebates if user closes opposing buy/sell deals inside time buffer window.</span>
              </div>
              <div
                className={`adm-switch ${riskSettings.exclude_hedged_positions ? 'adm-switch-on' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setRiskSettings({ ...riskSettings, exclude_hedged_positions: !riskSettings.exclude_hedged_positions })}
              >
                <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, marginBottom: 6 }}>
                  Hedge Time Buffer (seconds)
                </label>
                <input
                  type="number"
                  className="adm-edit-input"
                  style={{ width: '100%', padding: '8px 12px', fontWeight: 700 }}
                  value={riskSettings.hedge_time_buffer_seconds}
                  onChange={e => setRiskSettings({ ...riskSettings, hedge_time_buffer_seconds: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, marginBottom: 6 }}>
                  Max Account Drawdown Limit (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="adm-edit-input"
                  style={{ width: '100%', padding: '8px 12px', fontWeight: 700 }}
                  value={riskSettings.max_drawdown_limit}
                  onChange={e => setRiskSettings({ ...riskSettings, max_drawdown_limit: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, marginBottom: 6 }}>
                  Revenue Protection Payout Limit (Ratio)
                </label>
                <input
                  type="number"
                  step="0.05"
                  className="adm-edit-input"
                  style={{ width: '100%', padding: '8px 12px', fontWeight: 700 }}
                  value={riskSettings.spread_protection_multiplier}
                  onChange={e => setRiskSettings({ ...riskSettings, spread_protection_multiplier: parseFloat(e.target.value) || 0 })}
                />
                <span style={{ fontSize: 10, color: 'var(--subtext)', display: 'block', marginTop: 4 }}>
                  Maximum rebate paid as a percentage of broker charges. (0.70 = 70% max)
                </span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, marginBottom: 6 }}>
                  Audit Clawback Window (days)
                </label>
                <input
                  type="number"
                  className="adm-edit-input"
                  style={{ width: '100%', padding: '8px 12px', fontWeight: 700 }}
                  value={riskSettings.clawback_grace_period_days}
                  onChange={e => setRiskSettings({ ...riskSettings, clawback_grace_period_days: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <button className="adm-post-btn" style={{ alignSelf: 'flex-start', marginTop: 10 }} onClick={handleSaveRiskSettings} disabled={saving}>
              Save Risk Safeguards
            </button>
          </div>
        </div>
      )}

      {subTab === 'promotions' && (
        <div className="adm-card adm-card-full">
          <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Happy Hours & Promo Multipliers</h3>
              <p style={{ fontSize: 11, color: 'var(--subtext)', margin: '2px 0 0' }}>Configure scheduled boosts on selected instruments.</p>
            </div>
            <button
              className="adm-post-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px' }}
              onClick={() => {
                setPromoForm({
                  name: '',
                  symbol: '*',
                  multiplier: 1.20,
                  start_time: '',
                  end_time: '',
                  description: '',
                });
                setShowAddPromo(true);
              }}
            >
              Create Promotion
            </button>
          </div>
          <div className="adm-card-body" style={{ padding: 0 }}>
            {promotions.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--subtext)', fontSize: 13 }}>
                No active or upcoming rebate promotions.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="adm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Promo / Description</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Symbol</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Boost Multiplier</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Active Window</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map((promo) => (
                      <tr key={promo.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{promo.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--subtext)' }}>{promo.description || 'No description'}</div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>
                          {promo.symbol}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#10a37f' }}>
                          {promo.multiplier.toFixed(2)}x
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11 }}>
                          <div>Start: {new Date(promo.start_time).toLocaleString()}</div>
                          <div style={{ color: 'var(--subtext)' }}>End: {new Date(promo.end_time).toLocaleString()}</div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            className="adm-pagination button"
                            style={{ padding: '4px 10px', height: 28, borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={() => handleDeletePromo(promo)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'tiers' && (
        <div className="adm-card adm-card-full">
          <div className="adm-card-head">
            <h3>Lot Volume Tiers (Monthly)</h3>
            <p style={{ fontSize: 11, color: 'var(--subtext)', margin: '2px 0 0' }}>Configure payout multipliers based on user monthly closed lot volume.</p>
          </div>
          <div className="adm-card-body" style={{ padding: 0 }}>
            {volumeTiers.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--subtext)', fontSize: 13 }}>
                No volume tiers initialized in the database.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="adm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Tier Range (lots)</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Payout Multiplier</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 10, textTransform: 'uppercase', color: 'var(--subtext)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volumeTiers.map((tier) => (
                      <tr key={tier.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 13 }}>
                          {tier.min_monthly_lots.toFixed(1)} lots to {tier.max_monthly_lots > 99999 ? '∞' : tier.max_monthly_lots.toFixed(1) + ' lots'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', width: 120 }}>
                            <input
                              type="number"
                              step="0.05"
                              style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 13, fontWeight: 700, outline: 'none', color: 'var(--text)' }}
                              value={tier.payout_multiplier}
                              onChange={e => handleUpdateTierMultiplier(tier.id, parseFloat(e.target.value) || 1.00)}
                            />
                            <span style={{ fontSize: 10, color: 'var(--subtext)' }}>x</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 11, color: 'var(--subtext)' }}>
                          Auto-saved
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Rule Modal Overlay */}
      {showAddRule && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <form onSubmit={handleSaveRule} style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            width: '100%',
            maxWidth: 500,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{ margin: 0 }}>{editingRule ? 'Edit Rebate Rule' : 'Create Custom Rebate Rule'}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Broker Broker</label>
              <select
                className="adm-select"
                style={{ width: '100%' }}
                value={ruleForm.broker_provider_id}
                onChange={e => setRuleForm({ ...ruleForm, broker_provider_id: e.target.value })}
                required
              >
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Symbol Matching</label>
                <input
                  className="adm-edit-input"
                  placeholder="e.g. XAUUSD or * for fallback"
                  value={ruleForm.symbol}
                  onChange={e => setRuleForm({ ...ruleForm, symbol: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Rebate Rate per Lot ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="adm-edit-input"
                  value={ruleForm.rebate_per_lot}
                  onChange={e => setRuleForm({ ...ruleForm, rebate_per_lot: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Min Hold Duration (seconds)</label>
                <input
                  type="number"
                  className="adm-edit-input"
                  value={ruleForm.min_hold_time_seconds}
                  onChange={e => setRuleForm({ ...ruleForm, min_hold_time_seconds: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Min Price Distance (pips)</label>
                <input
                  type="number"
                  step="0.1"
                  className="adm-edit-input"
                  value={ruleForm.min_pip_distance}
                  onChange={e => setRuleForm({ ...ruleForm, min_pip_distance: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Plan Multipliers (Free / Pro / Enterprise)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
                  <input
                    type="number"
                    step="0.01"
                    style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12, fontWeight: 700, outline: 'none', color: 'var(--text)' }}
                    value={ruleForm.free_multiplier}
                    onChange={e => setRuleForm({ ...ruleForm, free_multiplier: parseFloat(e.target.value) || 0 })}
                  />
                  <span style={{ fontSize: 10, color: 'var(--subtext)' }}>Free</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
                  <input
                    type="number"
                    step="0.01"
                    style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12, fontWeight: 700, outline: 'none', color: 'var(--text)' }}
                    value={ruleForm.pro_multiplier}
                    onChange={e => setRuleForm({ ...ruleForm, pro_multiplier: parseFloat(e.target.value) || 0 })}
                  />
                  <span style={{ fontSize: 10, color: 'var(--subtext)' }}>Pro</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
                  <input
                    type="number"
                    step="0.01"
                    style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12, fontWeight: 700, outline: 'none', color: 'var(--text)' }}
                    value={ruleForm.enterprise_multiplier}
                    onChange={e => setRuleForm({ ...ruleForm, enterprise_multiplier: parseFloat(e.target.value) || 0 })}
                  />
                  <span style={{ fontSize: 10, color: 'var(--subtext)' }}>Ent</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <button 
                type="button" 
                className="adm-pagination button" 
                style={{ height: 36, padding: '0 16px' }}
                onClick={() => {
                  setShowAddRule(false);
                  setEditingRule(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="adm-post-btn" style={{ height: 36 }} disabled={saving}>
                {saving ? 'Saving...' : 'Save Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Promotion Modal Overlay */}
      {showAddPromo && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <form onSubmit={handleCreatePromo} style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            width: '100%',
            maxWidth: 500,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{ margin: 0 }}>Create scheduled Promo Boost</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Promotion Name</label>
              <input
                className="adm-edit-input"
                placeholder="e.g. Gold Rush Friday"
                value={promoForm.name}
                onChange={e => setPromoForm({ ...promoForm, name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Symbol Matching</label>
                <input
                  className="adm-edit-input"
                  placeholder="e.g. XAUUSD or * for all"
                  value={promoForm.symbol}
                  onChange={e => setPromoForm({ ...promoForm, symbol: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Boost Multiplier (e.g. 1.25)</label>
                <input
                  type="number"
                  step="0.05"
                  className="adm-edit-input"
                  value={promoForm.multiplier}
                  onChange={e => setPromoForm({ ...promoForm, multiplier: parseFloat(e.target.value) || 1.00 })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Start Time (UTC)</label>
                <input
                  type="datetime-local"
                  className="adm-edit-input"
                  value={promoForm.start_time}
                  onChange={e => setPromoForm({ ...promoForm, start_time: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>End Time (UTC)</label>
                <input
                  type="datetime-local"
                  className="adm-edit-input"
                  value={promoForm.end_time}
                  onChange={e => setPromoForm({ ...promoForm, end_time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Description</label>
              <textarea
                className="adm-edit-input"
                style={{ minHeight: 60, resize: 'vertical' }}
                placeholder="Brief description of the promotion details..."
                value={promoForm.description}
                onChange={e => setPromoForm({ ...promoForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <button 
                type="button" 
                className="adm-pagination button" 
                style={{ height: 36, padding: '0 16px' }}
                onClick={() => setShowAddPromo(false)}
              >
                Cancel
              </button>
              <button type="submit" className="adm-post-btn" style={{ height: 36 }} disabled={saving}>
                {saving ? 'Creating...' : 'Create Promo'}
              </button>
            </div>
          </form>
        </div>
      )}
      {subTab === 'levels' && (
        <RebateLevelsSection levels={rebateLevels} setLevels={setRebateLevels} />
      )}

      {subTab === 'milestones' && (
        <MilestonesSection milestones={milestonesList} setMilestones={setMilestonesList} />
      )}
    </div>
  );
}

// ── Rebate Levels Sub-Section ────────────────────────────────────────────────
function RebateLevelsSection({ levels, setLevels }: { levels: any[]; setLevels: (l: any[]) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin?table=rebate_levels');
        if (res.ok) { const d = await res.json(); setLevels(d.data || []); }
      } catch {} finally { setLoading(false); }
    })();
  }, [setLevels]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rebateLevels: levels }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else alert('Failed to save levels');
    } catch { alert('Error saving'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--subtext)' }}>Loading levels…</div>;

  return (
    <div className="adm-card adm-card-full">
      <div className="adm-card-head">
        <h3>Multi-Level Distribution Percentages</h3>
        <p style={{ fontSize: 11, color: 'var(--subtext)', margin: '4px 0 0' }}>Configure how rebates are distributed to each referral level upline</p>
      </div>
      <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px', background: 'var(--input-bg)', borderBottom: '1px solid var(--border)' }}>
            {['Level', 'Label', 'Share %', 'Active'].map(h => (
              <div key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
            ))}
          </div>
          {levels.sort((a, b) => a.level - b.level).map((lvl, i) => (
            <div key={lvl.level} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px', borderBottom: i < levels.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
              <div style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: 'var(--text)', textAlign: 'center' }}>L{lvl.level}</div>
              <div style={{ padding: '8px 14px' }}>
                <input className="adm-edit-input" style={{ width: '100%', padding: '6px 10px' }} value={lvl.label}
                  onChange={e => { const u = [...levels]; u[i] = { ...u[i], label: e.target.value }; setLevels(u); }} />
              </div>
              <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="number" className="adm-edit-input" style={{ width: 72, padding: '6px 10px', textAlign: 'center', fontWeight: 700 }} value={lvl.percentage}
                  onChange={e => { const u = [...levels]; u[i] = { ...u[i], percentage: Number(e.target.value) }; setLevels(u); }} />
                <span style={{ fontSize: 12, color: 'var(--subtext)' }}>%</span>
              </div>
              <div style={{ padding: '8px 14px', display: 'flex', justifyContent: 'center' }}>
                <div className={`adm-switch ${lvl.active !== false ? 'adm-switch-on' : ''}`} role="button" tabIndex={0}
                  onClick={() => { const u = [...levels]; u[i] = { ...u[i], active: !(lvl.active !== false) }; setLevels(u); }}>
                  <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--subtext)' }}>
          <span>Total distributed: <strong style={{ color: 'var(--text)' }}>{levels.filter(l => l.active !== false).reduce((s, l) => s + Number(l.percentage), 0)}%</strong></span>
          <span>·</span>
          <span>Company retains: <strong style={{ color: 'var(--text)' }}>{100 - levels.filter(l => l.active !== false).reduce((s, l) => s + Number(l.percentage), 0)}%</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button className="adm-post-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Level Config'}</button>
          {saved && <span style={{ fontSize: 13, color: '#10a37f', fontWeight: 600 }}>✓ Levels saved</span>}
        </div>
      </div>
    </div>
  );
}

// ── Milestones (40/40/20) Sub-Section ────────────────────────────────────────
function MilestonesSection({ milestones, setMilestones }: { milestones: any[]; setMilestones: (m: any[]) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', target_lots: 500, reward_amount: 500, leg_cap_pct: 40, icon: '🏆', min_active_legs: 2 });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin?table=milestones');
        if (res.ok) { const d = await res.json(); setMilestones(d.data || []); }
      } catch {} finally { setLoading(false); }
    })();
  }, [setMilestones]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else alert('Failed to save milestones');
    } catch { alert('Error saving'); }
    finally { setSaving(false); }
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone: { action: 'create', data: { ...form, sort_order: milestones.length + 1 } } }),
      });
      if (res.ok) {
        const d = await res.json();
        setMilestones([...milestones, d.milestone || { ...form, id: Date.now().toString() }]);
        setShowAdd(false);
        setForm({ name: '', target_lots: 500, reward_amount: 500, leg_cap_pct: 40, icon: '🏆', min_active_legs: 2 });
      }
    } catch { alert('Error creating milestone'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--subtext)' }}>Loading milestones…</div>;

  return (
    <div className="adm-card adm-card-full">
      <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>40/40/20 Milestone Tiers</h3>
          <p style={{ fontSize: 11, color: 'var(--subtext)', margin: '4px 0 0' }}>Team volume milestones with balanced-leg qualification</p>
        </div>
        <button className="adm-post-btn" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setShowAdd(!showAdd)}>+ Add Tier</button>
      </div>
      <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Existing milestones */}
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 100px 80px 80px', background: 'var(--input-bg)', borderBottom: '1px solid var(--border)' }}>
            {['', 'Name', 'Target Lots', 'Reward $', 'Cap %', 'Active'].map(h => (
              <div key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
            ))}
          </div>
          {milestones.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((m, i) => (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 100px 80px 80px', borderBottom: i < milestones.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
              <div style={{ padding: '12px 14px', fontSize: 18, textAlign: 'center' }}>{m.icon || '🏆'}</div>
              <div style={{ padding: '8px 14px' }}>
                <input className="adm-edit-input" style={{ width: '100%', padding: '6px 10px', fontWeight: 700 }} value={m.name}
                  onChange={e => { const u = [...milestones]; u[i] = { ...u[i], name: e.target.value }; setMilestones(u); }} />
              </div>
              <div style={{ padding: '8px 14px' }}>
                <input type="number" className="adm-edit-input" style={{ width: '100%', padding: '6px 10px', textAlign: 'center', fontWeight: 700 }} value={m.target_lots}
                  onChange={e => { const u = [...milestones]; u[i] = { ...u[i], target_lots: Number(e.target.value) }; setMilestones(u); }} />
              </div>
              <div style={{ padding: '8px 14px' }}>
                <input type="number" className="adm-edit-input" style={{ width: '100%', padding: '6px 10px', textAlign: 'center', fontWeight: 700 }} value={m.reward_amount}
                  onChange={e => { const u = [...milestones]; u[i] = { ...u[i], reward_amount: Number(e.target.value) }; setMilestones(u); }} />
              </div>
              <div style={{ padding: '8px 14px' }}>
                <input type="number" className="adm-edit-input" style={{ width: '100%', padding: '6px 10px', textAlign: 'center', fontWeight: 700 }} value={m.leg_cap_pct || 40}
                  onChange={e => { const u = [...milestones]; u[i] = { ...u[i], leg_cap_pct: Number(e.target.value) }; setMilestones(u); }} />
              </div>
              <div style={{ padding: '8px 14px', display: 'flex', justifyContent: 'center' }}>
                <div className={`adm-switch ${m.active !== false ? 'adm-switch-on' : ''}`} role="button" tabIndex={0}
                  onClick={() => { const u = [...milestones]; u[i] = { ...u[i], active: !(m.active !== false) }; setMilestones(u); }}>
                  <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
                </div>
              </div>
            </div>
          ))}
          {milestones.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--subtext)', fontSize: 13 }}>No milestone tiers configured.</div>
          )}
        </div>

        {/* Add new */}
        {showAdd && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--input-bg)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>New Milestone Tier</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              {[{ l: 'Name', k: 'name', t: 'text' }, { l: 'Target Lots', k: 'target_lots', t: 'number' }, { l: 'Reward $', k: 'reward_amount', t: 'number' }, { l: 'Leg Cap %', k: 'leg_cap_pct', t: 'number' }].map(f => (
                <div key={f.k}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--subtext)', display: 'block', marginBottom: 4 }}>{f.l}</label>
                  <input type={f.t} className="adm-edit-input" style={{ width: '100%', padding: '6px 10px', fontWeight: 700 }}
                    value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: f.t === 'number' ? Number(e.target.value) : e.target.value })} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="adm-pagination button" style={{ height: 34, padding: '0 16px' }} onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="adm-post-btn" style={{ height: 34 }} onClick={handleAdd} disabled={saving || !form.name}>{saving ? 'Creating…' : 'Add Milestone'}</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button className="adm-post-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save All Milestones'}</button>
          {saved && <span style={{ fontSize: 13, color: '#10a37f', fontWeight: 600 }}>✓ Milestones saved</span>}
        </div>
      </div>
    </div>
  );
}
