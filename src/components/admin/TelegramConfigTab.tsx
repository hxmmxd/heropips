import React, { useState, useEffect } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';

export default function TelegramConfigTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'setting' | 'set' | 'error'>('idle');
  const [webhookMsg, setWebhookMsg] = useState('');
  const [cfg, setCfg] = useState({
    risk_telegram_enabled: false,
    risk_telegram_bot_token: '',
    risk_telegram_chat_id: '',
    risk_telegram_admin_ids: '',
    risk_alert_zone_change: true,
    risk_alert_streak_warning: true,
    risk_alert_kill_switch: true,
    risk_alert_flash_drop: true,
    risk_alert_be_migration: false,
    risk_alert_daily_report: true,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/risk-config');
        if (res.ok) {
          const data = await res.json();
          const c = data.config || {};
          setCfg(prev => ({
            ...prev,
            risk_telegram_enabled: c.risk_telegram_enabled ?? false,
            risk_telegram_bot_token: c.risk_telegram_bot_token ?? '',
            risk_telegram_chat_id: c.risk_telegram_chat_id ?? '',
            risk_telegram_admin_ids: c.risk_telegram_admin_ids ?? '',
            risk_alert_zone_change: c.risk_alert_zone_change ?? true,
            risk_alert_streak_warning: c.risk_alert_streak_warning ?? true,
            risk_alert_kill_switch: c.risk_alert_kill_switch ?? true,
            risk_alert_flash_drop: c.risk_alert_flash_drop ?? true,
            risk_alert_be_migration: c.risk_alert_be_migration ?? false,
            risk_alert_daily_report: c.risk_alert_daily_report ?? true,
          }));
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const set = (key: string, val: any) => {
    setCfg(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/risk-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      if (res.ok) setSaved(true);
    } catch {}
    setSaving(false);
  };

  const testMessage = async () => {
    if (!cfg.risk_telegram_bot_token || !cfg.risk_telegram_chat_id) {
      setTestResult('❌ Enter bot token and chat ID first');
      return;
    }
    setTesting(true);
    setTestResult('');
    try {
      const res = await fetch(`https://api.telegram.org/bot${cfg.risk_telegram_bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cfg.risk_telegram_chat_id,
          text: '✅ <b>TradeGPT Alert Test</b>\n\n🔔 Telegram alerts configured successfully!\n\n📊 You will receive alerts for:\n• Risk zone transitions\n• Kill switch activations\n• Flash equity drops\n• Streak warnings\n• Daily reports',
          parse_mode: 'HTML',
        }),
      });
      if (res.ok) {
        setTestResult('✅ Message sent successfully! Check your Telegram.');
      } else {
        const err = await res.json();
        setTestResult(`❌ Failed: ${err.description || 'Unknown error'}`);
      }
    } catch (e: any) {
      setTestResult(`❌ Network error: ${e.message}`);
    }
    setTesting(false);
  };

  const setWebhookFn = async () => {
    if (!cfg.risk_telegram_bot_token) {
      setWebhookMsg('❌ Enter bot token first');
      return;
    }
    setWebhookStatus('setting');
    setWebhookMsg('');
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const webhookUrl = `${origin}/api/telegram`;
      const res = await fetch(`https://api.telegram.org/bot${cfg.risk_telegram_bot_token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        setWebhookStatus('set');
        setWebhookMsg(`✅ Webhook set to: ${webhookUrl}`);
      } else {
        setWebhookStatus('error');
        setWebhookMsg(`❌ ${data.description || 'Failed to set webhook'}`);
      }
    } catch (e: any) {
      setWebhookStatus('error');
      setWebhookMsg(`❌ ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <Loader2 className="adm-spin" style={{ width: 24, height: 24, color: '#10a37f' }} />
      </div>
    );
  }

  const toggleBtnStyle = (on: boolean): React.CSSProperties => ({
    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
    background: on ? '#10b981' : 'rgba(255,255,255,0.1)',
    position: 'relative', transition: 'background 0.25s', flexShrink: 0,
    boxShadow: on ? '0 0 8px rgba(16,185,129,0.3)' : 'none',
  });

  const knobPos = (on: boolean): React.CSSProperties => ({
    position: 'absolute', top: 3, left: on ? 23 : 3,
    width: 18, height: 18, borderRadius: '50%',
    background: '#fff', transition: 'left 0.25s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #0088cc, #00aaee)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
            }}>✈️</div>
            <div>
              <h3 style={{ margin: 0 }}>Telegram Bot &amp; Alert Configuration</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--subtext)' }}>
                Configure the Telegram bot for real-time risk alerts, emergency commands, and daily reports.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Connection */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>🤖 Bot Connection</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: cfg.risk_telegram_enabled ? '#10b981' : 'var(--subtext)' }}>
                {cfg.risk_telegram_enabled ? '● Enabled' : '○ Disabled'}
              </span>
              <button onClick={() => set('risk_telegram_enabled', !cfg.risk_telegram_enabled)} style={toggleBtnStyle(cfg.risk_telegram_enabled)}>
                <span style={knobPos(cfg.risk_telegram_enabled)} />
              </button>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--subtext)', background: 'var(--input-bg)', padding: '8px 12px', borderRadius: 7, lineHeight: '1.6' }}>
            💡 Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" style={{ color: '#4f8ef7' }}>@BotFather</a> on Telegram.
            Then send <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 4 }}>/start</code> to your bot and get your Chat ID from <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" style={{ color: '#4f8ef7' }}>@userinfobot</a>.
          </div>
        </div>

        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Bot Token */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)', display: 'block', marginBottom: 6 }}>Bot Token</label>
            <input
              type="password"
              value={cfg.risk_telegram_bot_token}
              onChange={e => set('risk_telegram_bot_token', e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--input-bg)', border: '1px solid var(--border)',
                borderRadius: 9, padding: '10px 14px',
                fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'monospace',
              }}
            />
          </div>

          {/* Chat ID */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)', display: 'block', marginBottom: 6 }}>Chat ID</label>
            <input
              type="text"
              value={cfg.risk_telegram_chat_id}
              onChange={e => set('risk_telegram_chat_id', e.target.value)}
              placeholder="-100123456789 (group) or 123456789 (private)"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--input-bg)', border: '1px solid var(--border)',
                borderRadius: 9, padding: '10px 14px',
                fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'monospace',
              }}
            />
          </div>

          {/* Admin IDs */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)', display: 'block', marginBottom: 6 }}>
              Authorized Admin IDs <span style={{ fontWeight: 400, fontSize: 11 }}>(comma-separated Telegram user IDs for /halt, /resume commands)</span>
            </label>
            <input
              type="text"
              value={cfg.risk_telegram_admin_ids}
              onChange={e => set('risk_telegram_admin_ids', e.target.value)}
              placeholder="123456789,987654321"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--input-bg)', border: '1px solid var(--border)',
                borderRadius: 9, padding: '10px 14px',
                fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'monospace',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={testMessage}
              disabled={testing}
              style={{
                padding: '10px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #0088cc, #00aaee)',
                color: '#fff', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: testing ? 0.6 : 1,
              }}
            >
              {testing ? <><Loader2 style={{ width: 14, height: 14 }} className="adm-spin" /> Sending...</> : '📨 Send Test Message'}
            </button>

            <button
              onClick={setWebhookFn}
              disabled={webhookStatus === 'setting'}
              style={{
                padding: '10px 20px', borderRadius: 9, border: '1px solid var(--border)', cursor: 'pointer',
                background: 'var(--input-bg)',
                color: 'var(--text)', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: webhookStatus === 'setting' ? 0.6 : 1,
              }}
            >
              {webhookStatus === 'setting' ? <><Loader2 style={{ width: 14, height: 14 }} className="adm-spin" /> Setting...</> : '🔗 Set Webhook'}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div style={{
              fontSize: 12, padding: '8px 12px', borderRadius: 8,
              background: testResult.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${testResult.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: testResult.startsWith('✅') ? '#10b981' : '#ef4444',
            }}>
              {testResult}
            </div>
          )}

          {/* Webhook Result */}
          {webhookMsg && (
            <div style={{
              fontSize: 12, padding: '8px 12px', borderRadius: 8,
              background: webhookMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${webhookMsg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: webhookMsg.startsWith('✅') ? '#10b981' : '#ef4444',
            }}>
              {webhookMsg}
            </div>
          )}
        </div>
      </div>

      {/* Alert Preferences */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>🔔 Alert Preferences</h4>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--subtext)' }}>Choose which risk events trigger Telegram notifications.</p>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { key: 'risk_alert_zone_change', label: 'Zone Transitions', desc: 'Gate 14 daily tier & Gate 15 drawdown zone changes', emoji: '🟡' },
            { key: 'risk_alert_kill_switch', label: 'Kill Switch Activation', desc: 'EMERGENCY — when positions are force-liquidated', emoji: '🚨' },
            { key: 'risk_alert_flash_drop', label: 'Flash Equity Drops', desc: 'Equity drops >2% within 60 seconds', emoji: '⚡' },
            { key: 'risk_alert_streak_warning', label: 'Streak Warnings', desc: 'Consecutive loss cooldown activation', emoji: '🔥' },
            { key: 'risk_alert_be_migration', label: 'Break-Even Migrations', desc: 'When SL is moved to entry after 1R profit', emoji: '🎯' },
            { key: 'risk_alert_daily_report', label: 'Daily Risk Report', desc: 'End-of-day summary with P&L and gate status', emoji: '📊' },
          ].map(item => (
            <div key={item.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--subtext)' }}>{item.desc}</p>
                </div>
              </div>
              <button onClick={() => set(item.key, !(cfg as any)[item.key])} style={toggleBtnStyle((cfg as any)[item.key])}>
                <span style={knobPos((cfg as any)[item.key])} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bot Commands Reference */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>💬 Bot Commands</h4>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--subtext)' }}>Commands available when messaging your bot directly.</p>
        </div>
        <div className="adm-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { cmd: '/status', desc: 'Live equity, risk zones, sizing multiplier, and active positions', severity: 'info' },
              { cmd: '/halt', desc: 'Emergency kill switch — closes ALL open positions immediately', severity: 'danger' },
              { cmd: '/resume', desc: 'Re-enable trading after a manual halt', severity: 'success' },
              { cmd: '/help', desc: 'Show all available commands', severity: 'info' },
            ].map(c => (
              <div key={c.cmd} style={{
                padding: '12px 14px', borderRadius: 10,
                background: c.severity === 'danger' ? 'rgba(239,68,68,0.06)'
                  : c.severity === 'success' ? 'rgba(16,185,129,0.06)'
                  : 'var(--input-bg)',
                border: `1px solid ${c.severity === 'danger' ? 'rgba(239,68,68,0.15)'
                  : c.severity === 'success' ? 'rgba(16,185,129,0.15)'
                  : 'var(--border)'}`,
              }}>
                <code style={{
                  fontSize: 14, fontWeight: 700,
                  color: c.severity === 'danger' ? '#ef4444'
                    : c.severity === 'success' ? '#10b981'
                    : '#4f8ef7',
                }}>{c.cmd}</code>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--subtext)', lineHeight: '1.5' }}>{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Webhook URL info */}
          <div style={{
            marginTop: 16, padding: '12px 14px', borderRadius: 10,
            background: 'var(--input-bg)', border: '1px solid var(--border)',
          }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Webhook Endpoint</p>
            <code style={{
              fontSize: 12, color: 'var(--text)', fontFamily: 'monospace',
              background: 'rgba(255,255,255,0.05)', padding: '6px 10px',
              borderRadius: 6, display: 'block',
            }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/api/telegram` : 'https://yourdomain.com/api/telegram'}
            </code>
            <p style={{ margin: '6px 0 0', fontSize: 10, color: 'var(--subtext)' }}>
              Set this URL as your bot&apos;s webhook via the &quot;Set Webhook&quot; button above, or manually via @BotFather.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center', paddingBottom: 16 }}>
        {saved && <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>✓ Telegram configuration saved</span>}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="adm-post-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <Loader2 style={{ width: 14, height: 14 }} className="adm-spin" /> : <MessageSquare style={{ width: 14, height: 14 }} />}
          {saving ? 'Saving...' : 'Save Telegram Configuration'}
        </button>
      </div>
    </div>
  );
}
