import React, { useState } from 'react';
import { Cpu, Eye, EyeOff, Loader2, CheckCircle2, Key } from 'lucide-react';

interface ApiIntegrationsTabProps {
  initialConfig: Record<string, any>;
  apiStats?: any[];
}

export default function ApiIntegrationsTab({ initialConfig, apiStats = [] }: ApiIntegrationsTabProps) {
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
      label: 'NVIDIA NIM (AI Fallback)',
      description: 'Secondary LLM provider — used when Groq is unavailable (same llama-3.3-70b model)',
      planNote: 'Multiple keys supported (comma-separated) for round-robin rotation',
      docsUrl: 'https://build.nvidia.com/',
      fields: [
        { key: 'nvidia_api_keys', label: 'API Key(s)', placeholder: 'nvapi-xxxx,nvapi-yyyy (comma-separated)', isSecret: true },
      ],
    },
    {
      id: 'groq',
      label: 'Groq LPU (AI Primary)',
      description: 'Priority 1 LLM provider — 70x faster inference on same llama-3.3-70b model via LPU hardware',
      planNote: 'Free tier: 14,400 req/day, 30,000 tokens/min. Get key at console.groq.com',
      docsUrl: 'https://console.groq.com/',
      fields: [
        { key: 'groq_api_key', label: 'API Key', placeholder: 'gsk_xxxxxxxxxxxxxxxx', isSecret: true },
      ],
    },
    {
      id: 'mt5farm',
      label: 'MT5 Farm (Broker Infrastructure)',
      description: 'Proprietary self-hosted MT5 sidecar farm — drop-in replacement for MetaAPI. Manages all MT5 account connections.',
      planNote: 'Orchestrator: http://4.224.249.231:8080 · Sidecar: :9101 · All requests require X-API-Key header',
      docsUrl: 'http://4.224.249.231:8080/docs',
      fields: [
        { key: 'mt5_farm_url',     label: 'Orchestrator URL',  placeholder: 'http://4.224.249.231:8080',            isSecret: false },
        { key: 'mt5_farm_api_key', label: 'API Key (X-API-Key)', placeholder: 'XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX', isSecret: true  },
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
