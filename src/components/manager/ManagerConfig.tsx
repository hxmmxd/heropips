'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Zap, Shield, Eye, Send } from 'lucide-react';

// ── Config Sections ──

interface RiskConfigData {
  // Gate 14
  daily_caution_pct: number;
  daily_warning_pct: number;
  daily_terminal_pct: number;
  // Gate 15
  dd_yellow_pct: number;
  dd_orange_pct: number;
  dd_red_pct: number;
  dd_black_pct: number;
  // Streak
  streak_halt_threshold: number;
  streak_cooldown_hours: number;
  // Sentinel
  sentinel_heartbeat_ms: number;
  sentinel_enabled: boolean;
  sentinel_max_failures: number;
  // Break-Even
  be_migration_enabled: boolean;
  be_migration_buffer_pips: number;
  // Portfolio Heat
  max_portfolio_heat_pct: number;
  single_trade_risk_pct: number;
  // Trade Limits
  max_trades_green: number;
  max_trades_yellow: number;
  max_trades_orange: number;
  max_trades_red: number;
  // Daily Reset
  daily_reset_hour_utc: number;
  daily_report_enabled: boolean;
  // Telegram
  telegram_alerts_enabled: boolean;
  telegram_bot_token: string;
  telegram_chat_id: string;
  // Alert Toggles
  alert_on_zone_change: boolean;
  alert_on_streak_warning: boolean;
  alert_on_kill_switch: boolean;
}

// ── Local Trading Config (localStorage) ──

export interface ManagerConfigValues {
  oneClickTrading: boolean;
  guardMode: boolean;
  soundNotifications: boolean;
  defaultLot: string;
  defaultSL: string;
  defaultTP: string;
}

export const DEFAULT_CONFIG: ManagerConfigValues = {
  oneClickTrading: false,
  guardMode: false,
  soundNotifications: true,
  defaultLot: '0.01',
  defaultSL: '50',
  defaultTP: '100',
};

const STORAGE_KEY = 'tradegpt-mgr-config';

export function loadConfig(): ManagerConfigValues {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveConfig(config: ManagerConfigValues) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

// ── Component ──

interface ManagerConfigProps {
  config: ManagerConfigValues;
  onChange: (config: ManagerConfigValues) => void;
}

type TabKey = 'trading' | 'risk' | 'sentinel' | 'telegram';

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`mgr-toggle ${on ? 'mgr-toggle-on' : ''}`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <span className="mgr-toggle-knob" />
    </button>
  );
}

function NumericField({
  label, desc, value, onChange, min, max, step, unit, disabled,
}: {
  label: string; desc?: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; unit?: string; disabled?: boolean;
}) {
  return (
    <div className="mgr-config-row" style={{ gap: '8px' }}>
      <div className="mgr-config-row-info" style={{ flex: 1 }}>
        <span className="mgr-config-row-label">{label}</span>
        {desc && <span className="mgr-config-row-desc">{desc}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="mgr-input"
          style={{ width: '80px', textAlign: 'right' }}
          min={min}
          max={max}
          step={step || 0.1}
          disabled={disabled}
        />
        {unit && <span style={{ fontSize: '11px', color: 'var(--subtext)' }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function ManagerConfig({ config, onChange }: ManagerConfigProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('trading');
  const [riskConfig, setRiskConfig] = useState<RiskConfigData | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState('');
  const [sentinelStatus, setSentinelStatus] = useState<any>(null);

  // Persist local config on every change
  useEffect(() => { saveConfig(config); }, [config]);

  const update = (patch: Partial<ManagerConfigValues>) => {
    onChange({ ...config, ...patch });
  };

  // Fetch risk config from server
  const fetchRiskConfig = useCallback(async () => {
    setRiskLoading(true);
    try {
      const res = await fetch('/api/admin/risk-config');
      if (!res.ok) return;
      const data = await res.json();
      setRiskConfig(data.config);
      setSentinelStatus(data.sentinel);
    } catch {}
    setRiskLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab !== 'trading') fetchRiskConfig();
  }, [activeTab, fetchRiskConfig]);

  // Update risk config locally
  const updateRisk = (patch: Partial<RiskConfigData>) => {
    if (!riskConfig) return;
    setRiskConfig({ ...riskConfig, ...patch });
    setDirty(true);
    setSaveMsg('');
  };

  // Save risk config to server
  const saveRiskConfig = async () => {
    if (!riskConfig || !dirty) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/admin/risk-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(riskConfig),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg(`✅ Saved ${data.updated?.length || 0} settings`);
        setDirty(false);
      } else {
        setSaveMsg('❌ Save failed');
      }
    } catch {
      setSaveMsg('❌ Network error');
    }
    setSaving(false);
  };

  // Test Telegram
  const testTelegram = async () => {
    if (!riskConfig?.telegram_bot_token || !riskConfig?.telegram_chat_id) {
      setTelegramTestResult('❌ Enter bot token and chat ID first');
      return;
    }
    setTelegramTesting(true);
    setTelegramTestResult('');
    try {
      const res = await fetch('/api/admin/risk-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...riskConfig,
          _sentinel_action: 'test_telegram',
        }),
      });

      // Also try direct telegram test
      const testRes = await fetch(`https://api.telegram.org/bot${riskConfig.telegram_bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: riskConfig.telegram_chat_id,
          text: '✅ <b>TradeGPT Alert Test</b>\n\nTelegram alerts configured successfully!',
          parse_mode: 'HTML',
        }),
      });
      if (testRes.ok) {
        setTelegramTestResult('✅ Message sent! Check your Telegram.');
      } else {
        setTelegramTestResult('❌ Failed — check token and chat ID');
      }
    } catch {
      setTelegramTestResult('❌ Network error');
    }
    setTelegramTesting(false);
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'trading', label: 'Trading', icon: <Zap className="w-3.5 h-3.5" /> },
    { key: 'risk', label: 'Risk Gates', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'sentinel', label: 'Sentinel', icon: <Eye className="w-3.5 h-3.5" /> },
    { key: 'telegram', label: 'Alerts', icon: <Send className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="mgr-config">
      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '4px', padding: '4px', marginBottom: '12px',
        background: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--border)',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '8px 4px', border: 'none', borderRadius: '8px',
              background: activeTab === t.key ? 'rgba(16,163,127,0.15)' : 'transparent',
              color: activeTab === t.key ? '#10a37f' : 'var(--subtext)',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Trading Tab ── */}
      {activeTab === 'trading' && (
        <>
          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Trading Preferences</h3>

            <div className="mgr-config-row">
              <div className="mgr-config-row-info">
                <span className="mgr-config-row-label">One-Click Trading</span>
                <span className="mgr-config-row-desc">Execute orders without confirmation dialog</span>
              </div>
              <Toggle on={config.oneClickTrading} onClick={() => update({ oneClickTrading: !config.oneClickTrading })} />
            </div>

            <div className="mgr-config-row">
              <div className="mgr-config-row-info">
                <span className="mgr-config-row-label">Equity Guard</span>
                <span className="mgr-config-row-desc">Auto-close positions at equity threshold</span>
              </div>
              <Toggle on={config.guardMode} onClick={() => update({ guardMode: !config.guardMode })} />
            </div>

            <div className="mgr-config-row">
              <div className="mgr-config-row-info">
                <span className="mgr-config-row-label">Sound Notifications</span>
                <span className="mgr-config-row-desc">Play sounds on order fills and alerts</span>
              </div>
              <Toggle on={config.soundNotifications} onClick={() => update({ soundNotifications: !config.soundNotifications })} />
            </div>
          </div>

          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Default Order Settings</h3>

            <div className="mgr-config-field">
              <label className="mgr-config-field-label">Default Lot Size</label>
              <input type="number" value={config.defaultLot} onChange={e => update({ defaultLot: e.target.value })} className="mgr-input" step="0.01" min="0.01" />
            </div>
            <div className="mgr-config-field">
              <label className="mgr-config-field-label">Default SL (points)</label>
              <input type="number" value={config.defaultSL} onChange={e => update({ defaultSL: e.target.value })} className="mgr-input" />
            </div>
            <div className="mgr-config-field">
              <label className="mgr-config-field-label">Default TP (points)</label>
              <input type="number" value={config.defaultTP} onChange={e => update({ defaultTP: e.target.value })} className="mgr-input" />
            </div>
          </div>
        </>
      )}

      {/* ── Risk Gates Tab ── */}
      {activeTab === 'risk' && riskConfig && (
        <>
          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Gate 14 — Daily Circuit Breaker</h3>
            <NumericField label="CAUTION Threshold" desc="Throttle to 50% sizing" value={riskConfig.daily_caution_pct} onChange={v => updateRisk({ daily_caution_pct: v })} min={0.5} max={10} unit="%" />
            <NumericField label="WARNING Threshold" desc="Halt new trades" value={riskConfig.daily_warning_pct} onChange={v => updateRisk({ daily_warning_pct: v })} min={1} max={10} unit="%" />
            <NumericField label="TERMINAL Threshold" desc="Kill switch — close all positions" value={riskConfig.daily_terminal_pct} onChange={v => updateRisk({ daily_terminal_pct: v })} min={2} max={15} unit="%" />
          </div>

          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Gate 15 — Drawdown Governor</h3>
            <NumericField label="YELLOW Zone" desc="Reduce to 50%, AAA only" value={riskConfig.dd_yellow_pct} onChange={v => updateRisk({ dd_yellow_pct: v })} min={3} max={30} unit="%" />
            <NumericField label="ORANGE Zone" desc="Manual approval required" value={riskConfig.dd_orange_pct} onChange={v => updateRisk({ dd_orange_pct: v })} min={5} max={40} unit="%" />
            <NumericField label="RED Zone" desc="10% sizing, exit-only" value={riskConfig.dd_red_pct} onChange={v => updateRisk({ dd_red_pct: v })} min={10} max={40} unit="%" />
            <NumericField label="BLACK Zone" desc="Terminal shutdown" value={riskConfig.dd_black_pct} onChange={v => updateRisk({ dd_black_pct: v })} min={15} max={50} unit="%" />
          </div>

          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Streak Management</h3>
            <NumericField label="Halt Threshold" desc="Consecutive losses before cooldown" value={riskConfig.streak_halt_threshold} onChange={v => updateRisk({ streak_halt_threshold: v })} min={3} max={20} step={1} unit="losses" />
            <NumericField label="Cooldown Period" desc="Hours of pause after streak halt" value={riskConfig.streak_cooldown_hours} onChange={v => updateRisk({ streak_cooldown_hours: v })} min={1} max={48} step={1} unit="hrs" />
          </div>

          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Portfolio Heat</h3>
            <NumericField label="Max Portfolio Heat" desc="Total open risk across all positions" value={riskConfig.max_portfolio_heat_pct} onChange={v => updateRisk({ max_portfolio_heat_pct: v })} min={1} max={20} unit="%" />
            <NumericField label="Single Trade Risk" desc="Default risk per trade (Kelly cap)" value={riskConfig.single_trade_risk_pct} onChange={v => updateRisk({ single_trade_risk_pct: v })} min={0.5} max={5} unit="%" />
          </div>

          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Per-Zone Trade Limits</h3>
            <NumericField label="GREEN Zone" desc="Max trades per day" value={riskConfig.max_trades_green} onChange={v => updateRisk({ max_trades_green: v })} min={1} max={99} step={1} />
            <NumericField label="YELLOW Zone" value={riskConfig.max_trades_yellow} onChange={v => updateRisk({ max_trades_yellow: v })} min={0} max={10} step={1} />
            <NumericField label="ORANGE Zone" value={riskConfig.max_trades_orange} onChange={v => updateRisk({ max_trades_orange: v })} min={0} max={5} step={1} />
            <NumericField label="RED Zone" value={riskConfig.max_trades_red} onChange={v => updateRisk({ max_trades_red: v })} min={0} max={3} step={1} />
          </div>
        </>
      )}

      {/* ── Sentinel Tab ── */}
      {activeTab === 'sentinel' && riskConfig && (
        <>
          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Sentinel Engine</h3>

            <div className="mgr-config-row">
              <div className="mgr-config-row-info">
                <span className="mgr-config-row-label">Sentinel Enabled</span>
                <span className="mgr-config-row-desc">Real-time equity monitoring</span>
              </div>
              <Toggle on={riskConfig.sentinel_enabled} onClick={() => updateRisk({ sentinel_enabled: !riskConfig.sentinel_enabled })} />
            </div>

            <NumericField label="Heartbeat Interval" desc="Polling frequency" value={riskConfig.sentinel_heartbeat_ms / 1000} onChange={v => updateRisk({ sentinel_heartbeat_ms: v * 1000 })} min={5} max={60} step={1} unit="sec" />
            <NumericField label="Max Failures" desc="Auto-stop after N MT5 failures" value={riskConfig.sentinel_max_failures} onChange={v => updateRisk({ sentinel_max_failures: v })} min={1} max={20} step={1} />
          </div>

          {/* Sentinel Status */}
          {sentinelStatus && (
            <div className="mgr-config-section" style={{
              background: sentinelStatus.running ? 'rgba(16,163,127,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${sentinelStatus.running ? 'rgba(16,163,127,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: '10px', padding: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: sentinelStatus.running ? '#10b981' : '#ef4444',
                  boxShadow: sentinelStatus.running ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
                }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                  {sentinelStatus.running ? 'ACTIVE' : 'STOPPED'}
                </span>
                {sentinelStatus.tickCount > 0 && (
                  <span style={{ fontSize: '10px', color: 'var(--subtext)', marginLeft: 'auto' }}>
                    Tick #{sentinelStatus.tickCount}
                  </span>
                )}
              </div>

              {sentinelStatus.running && (
                <div style={{ fontSize: '11px', color: 'var(--subtext)', lineHeight: '1.6' }}>
                  <div>Account: <code style={{ color: 'var(--text)' }}>{sentinelStatus.accountId}</code></div>
                  <div>Equity: <code style={{ color: '#10b981' }}>${sentinelStatus.lastEquity?.toFixed(2)}</code></div>
                  <div>Positions: <code>{sentinelStatus.openPositions || 0}</code></div>
                  <div>BE Migrated: <code>{sentinelStatus.beMigrated || 0}</code></div>
                </div>
              )}
            </div>
          )}

          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Break-Even Migration</h3>

            <div className="mgr-config-row">
              <div className="mgr-config-row-info">
                <span className="mgr-config-row-label">Auto BE Migration</span>
                <span className="mgr-config-row-desc">Move SL to entry after 1R profit</span>
              </div>
              <Toggle on={riskConfig.be_migration_enabled} onClick={() => updateRisk({ be_migration_enabled: !riskConfig.be_migration_enabled })} />
            </div>

            <NumericField label="Buffer Above Entry" desc="Pip buffer for BE stop" value={riskConfig.be_migration_buffer_pips} onChange={v => updateRisk({ be_migration_buffer_pips: v })} min={0} max={5} step={0.1} unit="pips" />
          </div>

          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Daily Reset</h3>
            <NumericField label="Reset Hour (UTC)" desc="Daily counters reset time" value={riskConfig.daily_reset_hour_utc} onChange={v => updateRisk({ daily_reset_hour_utc: v })} min={0} max={23} step={1} unit="UTC" />

            <div className="mgr-config-row">
              <div className="mgr-config-row-info">
                <span className="mgr-config-row-label">Daily Report</span>
                <span className="mgr-config-row-desc">Generate daily risk summary</span>
              </div>
              <Toggle on={riskConfig.daily_report_enabled} onClick={() => updateRisk({ daily_report_enabled: !riskConfig.daily_report_enabled })} />
            </div>
          </div>
        </>
      )}

      {/* ── Telegram / Alerts Tab ── */}
      {activeTab === 'telegram' && riskConfig && (
        <>
          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Telegram Bot</h3>

            <div className="mgr-config-row">
              <div className="mgr-config-row-info">
                <span className="mgr-config-row-label">Enable Alerts</span>
                <span className="mgr-config-row-desc">Send risk alerts via Telegram</span>
              </div>
              <Toggle on={riskConfig.telegram_alerts_enabled} onClick={() => updateRisk({ telegram_alerts_enabled: !riskConfig.telegram_alerts_enabled })} />
            </div>

            <div className="mgr-config-field" style={{ marginTop: '8px' }}>
              <label className="mgr-config-field-label">Bot Token</label>
              <input
                type="password"
                value={riskConfig.telegram_bot_token}
                onChange={e => updateRisk({ telegram_bot_token: e.target.value })}
                className="mgr-input"
                placeholder="123456:ABC-DEF..."
                style={{ fontSize: '12px' }}
              />
            </div>

            <div className="mgr-config-field">
              <label className="mgr-config-field-label">Chat ID</label>
              <input
                type="text"
                value={riskConfig.telegram_chat_id}
                onChange={e => updateRisk({ telegram_chat_id: e.target.value })}
                className="mgr-input"
                placeholder="-100123456789"
                style={{ fontSize: '12px' }}
              />
            </div>

            <button
              onClick={testTelegram}
              disabled={telegramTesting}
              style={{
                marginTop: '8px', width: '100%', padding: '10px', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                background: 'linear-gradient(135deg, #0088cc, #00aaee)',
                color: '#fff', opacity: telegramTesting ? 0.6 : 1,
              }}
            >
              {telegramTesting ? '⏳ Sending...' : '📨 Send Test Message'}
            </button>

            {telegramTestResult && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: telegramTestResult.startsWith('✅') ? '#10b981' : '#ef4444' }}>
                {telegramTestResult}
              </div>
            )}
          </div>

          <div className="mgr-config-section">
            <h3 className="mgr-config-title">Alert Preferences</h3>

            <div className="mgr-config-row">
              <div className="mgr-config-row-info">
                <span className="mgr-config-row-label">Zone Transitions</span>
                <span className="mgr-config-row-desc">Gate 14/15 tier changes</span>
              </div>
              <Toggle on={riskConfig.alert_on_zone_change} onClick={() => updateRisk({ alert_on_zone_change: !riskConfig.alert_on_zone_change })} />
            </div>

            <div className="mgr-config-row">
              <div className="mgr-config-row-info">
                <span className="mgr-config-row-label">Streak Warnings</span>
                <span className="mgr-config-row-desc">Consecutive loss alerts</span>
              </div>
              <Toggle on={riskConfig.alert_on_streak_warning} onClick={() => updateRisk({ alert_on_streak_warning: !riskConfig.alert_on_streak_warning })} />
            </div>

            <div className="mgr-config-row">
              <div className="mgr-config-row-info">
                <span className="mgr-config-row-label">Kill Switch</span>
                <span className="mgr-config-row-desc">Emergency shutdown alerts</span>
              </div>
              <Toggle on={riskConfig.alert_on_kill_switch} onClick={() => updateRisk({ alert_on_kill_switch: !riskConfig.alert_on_kill_switch })} />
            </div>
          </div>

          <div className="mgr-config-section" style={{
            background: 'var(--input-bg)', borderRadius: '10px', padding: '12px',
          }}>
            <h3 className="mgr-config-title" style={{ fontSize: '11px', marginBottom: '6px' }}>Bot Commands</h3>
            <div style={{ fontSize: '11px', color: 'var(--subtext)', lineHeight: '1.8' }}>
              <code style={{ color: '#10b981' }}>/status</code> — Current risk state & equity<br/>
              <code style={{ color: '#10b981' }}>/halt</code> — Emergency close all positions<br/>
              <code style={{ color: '#10b981' }}>/resume</code> — Re-enable trading<br/>
              <code style={{ color: '#10b981' }}>/help</code> — Show available commands
            </div>
          </div>
        </>
      )}

      {/* ── Save Bar ── */}
      {activeTab !== 'trading' && riskConfig && (
        <div style={{
          position: 'sticky' as const, bottom: 0,
          padding: '12px 0 4px 0',
          background: 'linear-gradient(to top, var(--card-bg) 60%, transparent)',
        }}>
          <button
            onClick={saveRiskConfig}
            disabled={saving || !dirty}
            style={{
              width: '100%', padding: '12px', border: 'none', borderRadius: '10px',
              cursor: dirty ? 'pointer' : 'default', fontSize: '13px', fontWeight: 700,
              background: dirty
                ? 'linear-gradient(135deg, #10a37f, #0ea5e9)'
                : 'var(--input-bg)',
              color: dirty ? '#fff' : 'var(--subtext)',
              transition: 'all 0.3s',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '⏳ Saving...' : dirty ? '💾 Save Configuration' : '✓ All Saved'}
          </button>
          {saveMsg && (
            <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '6px', color: saveMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>
              {saveMsg}
            </div>
          )}

          {riskLoading && (
            <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '6px', color: 'var(--subtext)' }}>
              Loading configuration...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
