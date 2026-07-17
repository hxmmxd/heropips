'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, Server, Zap, Database, Key, Shield, 
  TrendingUp, AlertTriangle, CheckCircle, Clock, 
  Cpu, MemoryStick, Globe, RefreshCw, Power, Moon,
  Sun, Trash2, Plus, Copy, Eye, EyeOff, ChevronDown,
  ChevronRight, Wifi, WifiOff, BarChart3
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface FarmHealth {
  total_accounts: number;
  active: number;
  hibernated: number;
  ram_used_gb: string;
  ram_free_gb: string;
  ram_pct: string;
}

interface FarmAccount {
  accountId: string;
  login: number;
  server: string;
  label: string;
  port: number;
  status: 'starting' | 'connected' | 'hibernated' | 'timeout';
  balance: number | null;
  currency: string | null;
  name: string | null;
}

interface ApiKey {
  id: string;
  label: string;
  key_preview: string;
  created_at: string;
  last_used: string | null;
  requests: number;
  rate_limit: number;
  is_active: boolean;
}

interface FarmStats {
  keys: { total: number; active: number; revoked: number };
  requests: {
    total_all_time: number;
    top_keys: { label: string; requests: number; last_used: string }[];
  };
  recent_100_requests: { success: number; auth_errors: number; rate_limited: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  connected:  '#22c55e',
  starting:   '#f59e0b',
  hibernated: '#64748b',
  timeout:    '#ef4444',
};

const statusBg: Record<string, string> = {
  connected:  'rgba(34,197,94,0.12)',
  starting:   'rgba(245,158,11,0.12)',
  hibernated: 'rgba(100,116,139,0.12)',
  timeout:    'rgba(239,68,68,0.12)',
};

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20,
      background: statusBg[status] || 'rgba(100,116,139,0.12)',
      fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
      color: statusColors[status] || '#64748b',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: statusColors[status] || '#64748b',
        boxShadow: status === 'connected' ? `0 0 6px ${statusColors[status]}` : 'none',
        animation: status === 'starting' ? 'pulse 1.4s infinite' : 'none',
      }} />
      {status}
    </span>
  );
}

function RamBar({ pct }: { pct: number }) {
  const color = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: 3,
        background: `linear-gradient(90deg, ${color}80, ${color})`,
        transition: 'width 0.6s ease',
        boxShadow: `0 0 8px ${color}60`,
      }} />
    </div>
  );
}

function StatCard({ icon, label, value, sub, color = '#6366f1' }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '20px 24px', position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}40`)}
    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
    >
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function MT5FarmDashboard() {
  const [health,   setHealth]   = useState<FarmHealth | null>(null);
  const [accounts, setAccounts] = useState<FarmAccount[]>([]);
  const [keys,     setKeys]     = useState<ApiKey[]>([]);
  const [stats,    setStats]    = useState<FarmStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [orchestratorUrl, setOrchestratorUrl] = useState('4.224.249.231:8080');
  const [error,    setError]    = useState('');
  const [activeTab, setActiveTab]   = useState<'overview' | 'accounts' | 'keys' | 'logs'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyLimit, setNewKeyLimit] = useState(100);
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const intervalRef = useRef<any>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError('');
    try {
      const [overviewRes, keysRes, statsRes] = await Promise.all([
        fetch('/api/admin/mt5-farm?action=overview'),
        fetch('/api/admin/mt5-farm?action=keys'),
        fetch('/api/admin/mt5-farm?action=stats'),
      ]);

      if (overviewRes.ok) {
        const d = await overviewRes.json();
        setHealth(d.health);
        setAccounts(d.accounts || []);
        if (d.orchestratorUrl) {
          setOrchestratorUrl(d.orchestratorUrl.replace('http://', '').replace('https://', ''));
        }
      }
      if (keysRes.ok) {
        const d = await keysRes.json();
        setKeys(d.keys || []);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d);
      }
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to fetch farm data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(true), 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchData]);

  async function accountAction(id: string, action: string) {
    setActionLoading(`${action}-${id}`);
    try {
      await fetch('/api/admin/mt5-farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, accountId: id }),
      });
      await fetchData(true);
    } finally {
      setActionLoading(null);
    }
  }

  async function createKey() {
    if (!newKeyLabel.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch('/api/admin/mt5-farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createKey', label: newKeyLabel, rateLimit: newKeyLimit }),
      });
      const data = await res.json();
      if (data.key) {
        setRevealedKey(data.key);
        setNewKeyLabel('');
        await fetchData(true);
      }
    } finally {
      setCreatingKey(false);
    }
  }

  async function revokeKey(keyId: string) {
    if (!confirm('Revoke this key? This cannot be undone.')) return;
    setActionLoading(`revoke-${keyId}`);
    try {
      await fetch('/api/admin/mt5-farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revokeKey', keyId }),
      });
      await fetchData(true);
    } finally {
      setActionLoading(null);
    }
  }

  const ramPct    = health ? parseFloat(health.ram_pct) : 0;
  const activeAcc = accounts.filter(a => a.status === 'connected').length;
  const hibAcc    = accounts.filter(a => a.status === 'hibernated').length;
  const errAcc    = accounts.filter(a => a.status === 'timeout').length;

  const tabs = [
    { id: 'overview',  label: 'Overview',  icon: <Activity size={14} /> },
    { id: 'accounts',  label: 'Accounts',  icon: <Server size={14} /> },
    { id: 'keys',      label: 'API Keys',  icon: <Key size={14} /> },
    { id: 'logs',      label: 'Stats',     icon: <BarChart3 size={14} /> },
  ] as const;

  return (
    <div style={{
      minHeight: '100vh', background: '#080c14', color: '#f1f5f9',
      fontFamily: "'Inter', -apple-system, sans-serif", padding: '32px 40px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.4)',
          }}>
            <Server size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
              MT5 Farm Monitor
            </h1>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {orchestratorUrl} · {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Loading…'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 10, border: '1px solid',
              borderColor: autoRefresh ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)',
              background: autoRefresh ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: autoRefresh ? '#818cf8' : '#64748b',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Wifi size={14} style={{ animation: autoRefresh ? 'pulse 2s infinite' : 'none' }} />
            {autoRefresh ? 'Live' : 'Live Off'}
          </button>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 20px', borderRadius: 12, marginBottom: 24,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px',
              borderRadius: '10px 10px 0 0', border: 'none',
              background: activeTab === t.id ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: activeTab === t.id ? '#818cf8' : '#64748b',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              borderBottom: activeTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
              transition: 'all 0.2s', marginBottom: -1,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard icon={<Server size={18} />}   label="Total Accounts" value={health?.total_accounts ?? '—'} sub="registered sidecars" color="#6366f1" />
            <StatCard icon={<CheckCircle size={18} />} label="Active"       value={health?.active ?? '—'}         sub="connected & trading" color="#22c55e" />
            <StatCard icon={<Moon size={18} />}     label="Hibernated"      value={health?.hibernated ?? '—'}     sub="sleeping / on-demand" color="#64748b" />
            <StatCard icon={<Cpu size={18} />}      label="RAM Used"        value={health ? `${health.ram_used_gb} GB` : '—'} sub={`${health?.ram_pct ?? 0}% of total`} color="#f59e0b" />
            <StatCard icon={<Database size={18} />} label="RAM Free"        value={health ? `${health.ram_free_gb} GB` : '—'} sub="available headroom" color="#06b6d4" />
            <StatCard icon={<Key size={18} />}      label="API Keys"        value={stats?.keys.active ?? '—'}    sub={`${stats?.requests.total_all_time ?? 0} total requests`} color="#8b5cf6" />
          </div>

          {/* RAM Usage Bar */}
          {health && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: 24, marginBottom: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MemoryStick size={18} color="#f59e0b" />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>RAM Utilization</span>
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 8,
                  background: ramPct > 85 ? 'rgba(239,68,68,0.15)' : ramPct > 65 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                  color: ramPct > 85 ? '#f87171' : ramPct > 65 ? '#fbbf24' : '#4ade80',
                }}>
                  {health.ram_pct}%
                </span>
              </div>
              <RamBar pct={ramPct} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: '#64748b' }}>
                <span>Used: {health.ram_used_gb} GB</span>
                <span>Free: {health.ram_free_gb} GB</span>
              </div>
            </div>
          )}

          {/* Account status breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Server size={16} color="#6366f1" /> Account Status Breakdown
              </div>
              {[
                { label: 'Connected', count: activeAcc, color: '#22c55e' },
                { label: 'Hibernated', count: hibAcc, color: '#64748b' },
                { label: 'Starting', count: accounts.filter(a => a.status === 'starting').length, color: '#f59e0b' },
                { label: 'Timeout / Error', count: errAcc, color: '#ef4444' },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 15, color }}>{count}</span>
                </div>
              ))}
            </div>

            {/* Request stats */}
            {stats && (
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, padding: 24,
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TrendingUp size={16} color="#6366f1" /> Last 100 Requests
                </div>
                {[
                  { label: 'Successful', count: stats.recent_100_requests.success, color: '#22c55e' },
                  { label: 'Auth Errors', count: stats.recent_100_requests.auth_errors, color: '#ef4444' },
                  { label: 'Rate Limited', count: stats.recent_100_requests.rate_limited, color: '#f59e0b' },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color }}>{count}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: color, width: `${count}%`, transition: 'width 0.6s' }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: 12 }}>Total all time</span>
                  <span style={{ fontWeight: 700, color: '#818cf8' }}>{stats.requests.total_all_time.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ACCOUNTS TAB ── */}
      {activeTab === 'accounts' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                {accounts.length} Registered Accounts
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {activeAcc} active · {hibAcc} hibernated
              </span>
            </div>

            {accounts.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                <Server size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p>No accounts registered in the farm yet</p>
              </div>
            ) : (
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                {accounts.map(acc => (
                  <div key={acc.accountId} style={{
                    padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: `radial-gradient(circle, ${statusColors[acc.status] || '#64748b'}20, transparent)`,
                        border: `1px solid ${statusColors[acc.status] || '#64748b'}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Server size={16} color={statusColors[acc.status] || '#64748b'} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {acc.name || acc.label || `Account ${acc.login}`}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                          Login: {acc.login} · {acc.server}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      {acc.balance !== null && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>
                            {acc.currency} {Number(acc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>balance</div>
                        </div>
                      )}

                      <StatusDot status={acc.status} />

                      <div style={{ display: 'flex', gap: 6 }}>
                        {acc.status === 'connected' && (
                          <button
                            onClick={() => accountAction(acc.accountId, 'hibernate')}
                            disabled={actionLoading !== null}
                            title="Hibernate"
                            style={{
                              padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                              background: 'transparent', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s',
                            }}
                          >
                            <Moon size={14} />
                          </button>
                        )}
                        {acc.status === 'hibernated' && (
                          <button
                            onClick={() => accountAction(acc.accountId, 'wake')}
                            disabled={actionLoading !== null}
                            title="Wake"
                            style={{
                              padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.3)',
                              background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', transition: 'all 0.2s',
                            }}
                          >
                            <Sun size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => accountAction(acc.accountId, 'disconnect')}
                          disabled={actionLoading !== null}
                          title="Disconnect"
                          style={{
                            padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
                            background: 'transparent', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s', opacity: 0.6,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                        >
                          <Power size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── API KEYS TAB ── */}
      {activeTab === 'keys' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          {/* Create new key */}
          <div style={{
            background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 16, padding: 24, marginBottom: 24,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Plus size={16} color="#818cf8" /> Create New API Key
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 8 }}>Label</label>
                <input
                  value={newKeyLabel}
                  onChange={e => setNewKeyLabel(e.target.value)}
                  placeholder="e.g. Mobile App, Web Dashboard"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                    color: '#f1f5f9', fontSize: 14, outline: 'none',
                  }}
                />
              </div>
              <div style={{ width: 140 }}>
                <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 8 }}>Rate Limit/min</label>
                <input
                  type="number"
                  value={newKeyLimit}
                  onChange={e => setNewKeyLimit(Number(e.target.value))}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                    color: '#f1f5f9', fontSize: 14, outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={createKey}
                disabled={creatingKey || !newKeyLabel.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: creatingKey || !newKeyLabel.trim() ? 0.6 : 1,
                }}
              >
                {creatingKey ? 'Creating…' : 'Create Key'}
              </button>
            </div>

            {/* Show newly created key */}
            {revealedKey && (
              <div style={{
                marginTop: 16, padding: '12px 16px', borderRadius: 10,
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              }}>
                <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, marginBottom: 8 }}>
                  ✓ Key created — save it now, it won&apos;t be shown again!
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <code style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
                    color: '#f1f5f9', flex: 1, wordBreak: 'break-all',
                  }}>
                    {revealedKey}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(revealedKey); }}
                    style={{ background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer' }}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Key list */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{keys.length} API Keys</span>
            </div>

            {keys.map(k => (
              <div key={k.id} style={{
                padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Key size={14} color="#818cf8" />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{k.label}</span>
                    {k.is_active ? (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', color: '#4ade80', fontWeight: 600 }}>Active</span>
                    ) : (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600 }}>Revoked</span>
                    )}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#64748b' }}>
                    {k.key_preview}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                    {k.requests} requests · limit {k.rate_limit}/min
                    {k.last_used ? ` · last used ${new Date(k.last_used).toLocaleString()}` : ' · never used'}
                  </div>
                </div>

                {k.is_active && (
                  <button
                    onClick={() => revokeKey(k.id)}
                    disabled={actionLoading === `revoke-${k.id}`}
                    style={{
                      padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                      background: 'transparent', color: '#ef4444', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Trash2 size={13} /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STATS TAB ── */}
      {activeTab === 'logs' && stats && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Top keys by usage */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <TrendingUp size={16} color="#6366f1" /> Top Keys by Requests
              </div>
              {stats.requests.top_keys.map((k, i) => (
                <div key={k.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 6, background: 'rgba(99,102,241,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#818cf8',
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 13 }}>{k.label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>{k.requests.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: 'linear-gradient(90deg, #6366f180, #6366f1)',
                      width: `${(k.requests / stats.requests.total_all_time) * 100}%`,
                      transition: 'width 0.6s',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                    Last used: {k.last_used ? new Date(k.last_used).toLocaleString() : 'never'}
                  </div>
                </div>
              ))}
            </div>

            {/* Key health */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={16} color="#6366f1" /> Key Health
              </div>
              {[
                { label: 'Total Keys', value: stats.keys.total, color: '#818cf8' },
                { label: 'Active Keys', value: stats.keys.active, color: '#22c55e' },
                { label: 'Revoked Keys', value: stats.keys.revoked, color: '#ef4444' },
                { label: 'All-time Requests', value: stats.requests.total_all_time.toLocaleString(), color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}</span>
                  <span style={{ fontWeight: 700, fontSize: 16, color }}>{value}</span>
                </div>
              ))}

              {/* Endpoint breakdown */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Last 100 Requests
                </div>
                {[
                  { label: 'Success (2xx)', value: stats.recent_100_requests.success, color: '#22c55e' },
                  { label: 'Auth Error (401)', value: stats.recent_100_requests.auth_errors, color: '#ef4444' },
                  { label: 'Rate Limited (429)', value: stats.recent_100_requests.rate_limited, color: '#f59e0b' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', fontSize: 13,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                      <span style={{ color: '#94a3b8' }}>{label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: '#334155' }}>
          MT5 Farm v4.0 · TradeGPT Infrastructure ·{' '}
          <a href={`http://${orchestratorUrl}/docs`} target="_blank" rel="noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>
            Swagger Docs ↗
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
          <span style={{ color: '#64748b' }}>Orchestrator {orchestratorUrl}</span>
        </div>
      </div>
    </div>
  );
}
