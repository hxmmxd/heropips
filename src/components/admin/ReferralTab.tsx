import React, { useState } from 'react';

interface ReferralTabProps {
  initialConfig: Record<string, any>;
}

export default function ReferralTab({ initialConfig }: ReferralTabProps) {
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
