import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function RebatesTab() {
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
  const [form, setForm] = useState({ name: '', target_lots: 100, reward_amount: 500, leg_cap_pct: 40 });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin?table=rebate_milestones');
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
        body: JSON.stringify({ rebateMilestones: milestones }),
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
        body: JSON.stringify({
          rebateMilestoneSingle: { action: 'create', data: form }
        })
      });
      if (res.ok) {
        setShowAdd(false);
        setForm({ name: '', target_lots: 100, reward_amount: 500, leg_cap_pct: 40 });
        // reload
        const r = await fetch('/api/admin?table=rebate_milestones');
        if (r.ok) { const d = await r.json(); setMilestones(d.data || []); }
      } else {
        alert('Failed to add milestone');
      }
    } catch {
      alert('Error adding milestone');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--subtext)' }}>Loading milestones…</div>;

  return (
    <div className="adm-card adm-card-full">
      <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>40/40/20 Monthly Volume Milestones</h3>
          <p style={{ fontSize: 11, color: 'var(--subtext)', margin: '4px 0 0' }}>Configure milestone bonuses with leg capacity constraints to protect payout treasury</p>
        </div>
        <button className="adm-pagination button" style={{ height: 32, padding: '0 14px' }} onClick={() => setShowAdd(true)}>+ Add Milestone</button>
      </div>
      <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 80px', background: 'var(--input-bg)', borderBottom: '1px solid var(--border)' }}>
            {['Milestone Name', 'Target Volume (Lots)', 'Reward Amount ($)', 'Leg Cap %', 'Active'].map(h => (
              <div key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
            ))}
          </div>
          {milestones.sort((a, b) => a.target_lots - b.target_lots).map((m, i) => (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 80px', borderBottom: i < milestones.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
              <div style={{ padding: '8px 14px' }}>
                <input className="adm-edit-input" style={{ width: '100%', padding: '6px 10px', fontWeight: 600 }} value={m.name}
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
