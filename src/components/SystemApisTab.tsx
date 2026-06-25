'use client';

import React, { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';

interface SystemApi {
  method: string;
  path: string;
  description: string;
  auth: 'none' | 'user' | 'admin' | 'cron' | 'webhook';
  category: string;
}

const SYSTEM_APIS: SystemApi[] = [
  // AI & Trading
  { method: 'POST', path: '/api/chat', description: 'AI chat + signal generation via LLM failover (Groq → NVIDIA → engine)', auth: 'none', category: 'AI & Trading' },
  { method: 'POST', path: '/api/execute', description: 'Execute broker order on connected MT5 account', auth: 'user', category: 'AI & Trading' },
  { method: 'POST', path: '/api/scan', description: 'Multi-asset market scanner with pattern detection', auth: 'none', category: 'AI & Trading' },
  // Astro Mode
  { method: 'GET', path: '/api/astro', description: 'Query live planetary coordinates and moon phases (accurate to <0.1° via astronomy-engine)', auth: 'none', category: 'Astro Mode' },
  { method: 'GET', path: '/api/astro/analytics', description: 'Aggregated trade win rates and performance metrics categorized by celestial patterns', auth: 'user', category: 'Astro Mode' },
  // Market Data
  { method: 'GET', path: '/api/price-stream', description: 'SSE price stream (Twelve Data → Yahoo Finance fallback)', auth: 'none', category: 'Market Data' },
  { method: 'GET', path: '/api/candles', description: 'OHLCV candle history for charting (symbol, interval params)', auth: 'none', category: 'Market Data' },
  { method: 'GET', path: '/api/news', description: 'Financial news headlines aggregator', auth: 'none', category: 'Market Data' },
  // Broker
  { method: 'GET', path: '/api/broker', description: 'List connected broker accounts with live balances', auth: 'user', category: 'Broker' },
  { method: 'POST', path: '/api/broker', description: 'Connect new MT5 broker account via MT5 Farm', auth: 'user', category: 'Broker' },
  { method: 'DELETE', path: '/api/broker', description: 'Disconnect and remove a broker account', auth: 'user', category: 'Broker' },
  { method: 'GET', path: '/api/broker/deals', description: 'Fetch closed deal history from broker', auth: 'user', category: 'Broker' },
  { method: 'POST', path: '/api/broker/order', description: 'Place market/limit order on broker account', auth: 'user', category: 'Broker' },
  { method: 'GET', path: '/api/broker/positions', description: 'Get open positions from broker account', auth: 'user', category: 'Broker' },
  { method: 'GET', path: '/api/trades', description: 'User trade history from Supabase trades table', auth: 'user', category: 'Broker' },
  // Auth
  { method: 'POST', path: '/api/auth/signup', description: 'Register new user with email + referral code', auth: 'none', category: 'Auth' },
  { method: 'POST', path: '/api/auth/verify-otp', description: 'Verify OTP for email authentication', auth: 'none', category: 'Auth' },
  { method: 'POST', path: '/api/session-track', description: 'Track user session activity and last seen', auth: 'user', category: 'Auth' },
  { method: 'GET', path: '/api/user/settings', description: 'Retrieve user preference settings (e.g. Astro Mode activation state)', auth: 'user', category: 'Auth' },
  { method: 'PATCH', path: '/api/user/settings', description: 'Update user preference settings (e.g. Astro Mode activation state)', auth: 'user', category: 'Auth' },
  // Referral
  { method: 'GET', path: '/api/referral/profile', description: 'Get user referral profile and stats', auth: 'user', category: 'Referral' },
  { method: 'GET', path: '/api/referral/network', description: 'Fetch multi-level referral tree for user', auth: 'user', category: 'Referral' },
  { method: 'GET', path: '/api/referral/analytics', description: 'Referral analytics — commissions, levels, volume', auth: 'user', category: 'Referral' },
  { method: 'GET', path: '/api/referral/rates', description: 'Get current commission and rebate rates per level', auth: 'user', category: 'Referral' },
  { method: 'GET', path: '/api/referral/debug', description: 'Debug referral chain for troubleshooting', auth: 'admin', category: 'Referral' },
  { method: 'POST', path: '/api/referral/seed', description: 'Seed referral data for testing', auth: 'admin', category: 'Referral' },
  // Subscriptions & Payments
  { method: 'GET', path: '/api/pricing', description: 'Get plan pricing (Starter, Pro, Enterprise)', auth: 'none', category: 'Subscriptions' },
  { method: 'POST', path: '/api/subscriptions/checkout', description: 'Create NOWPayments crypto checkout session', auth: 'user', category: 'Subscriptions' },
  { method: 'GET', path: '/api/subscriptions/status', description: 'Check payment status for a subscription', auth: 'user', category: 'Subscriptions' },
  { method: 'GET', path: '/api/subscriptions/history', description: 'Get user subscription payment history', auth: 'user', category: 'Subscriptions' },
  { method: 'GET', path: '/api/wallet', description: 'Get user wallet balance and transaction history', auth: 'user', category: 'Subscriptions' },
  { method: 'POST', path: '/api/withdrawals', description: 'Create withdrawal request or admin approve/reject', auth: 'user', category: 'Subscriptions' },
  { method: 'POST', path: '/api/webhooks/nowpayments', description: 'NOWPayments IPN webhook receiver', auth: 'webhook', category: 'Subscriptions' },
  // Admin
  { method: 'GET', path: '/api/admin', description: 'Fetch platform config, announcements, and stats', auth: 'admin', category: 'Admin' },
  { method: 'PATCH', path: '/api/admin', description: 'Update platform config key/value', auth: 'admin', category: 'Admin' },
  { method: 'POST', path: '/api/admin', description: 'Post announcement or bulk admin action', auth: 'admin', category: 'Admin' },
  { method: 'GET', path: '/api/admin/user', description: 'Search and manage individual user accounts', auth: 'admin', category: 'Admin' },
  { method: 'GET', path: '/api/admin/api-stats', description: 'Get API health stats for all providers', auth: 'admin', category: 'Admin' },
  { method: 'GET', path: '/api/invoice-config', description: 'Get invoice branding configuration', auth: 'admin', category: 'Admin' },
  { method: 'PATCH', path: '/api/invoice-config', description: 'Update invoice branding configuration', auth: 'admin', category: 'Admin' },
  { method: 'GET', path: '/api/milestones', description: 'Get referral milestone definitions', auth: 'user', category: 'Admin' },
  { method: 'POST', path: '/api/milestones', description: 'Create or update milestone definitions', auth: 'admin', category: 'Admin' },
  { method: 'GET', path: '/api/partner-brokers', description: 'Get list of partner broker providers', auth: 'none', category: 'Admin' },
  // Cron
  { method: 'GET', path: '/api/cron/sync-deals', description: 'Sync closed deals from MT5 Farm to database', auth: 'cron', category: 'Cron' },
  { method: 'GET', path: '/api/cron/sync-rebates', description: 'Process rebate payouts with multi-level distribution', auth: 'cron', category: 'Cron' },
  // Courses
  { method: 'GET', path: '/api/courses', description: 'Get published courses (public) or all courses (admin)', auth: 'none', category: 'Courses' },
  { method: 'POST', path: '/api/courses', description: 'Add new course with YouTube URL auto-parsing', auth: 'admin', category: 'Courses' },
  { method: 'PATCH', path: '/api/courses', description: 'Update course details, reorder, publish/unpublish', auth: 'admin', category: 'Courses' },
  { method: 'DELETE', path: '/api/courses', description: 'Remove a course by ID', auth: 'admin', category: 'Courses' },
  { method: 'POST', path: '/api/courses/purchase', description: 'Purchase course category via wallet or crypto', auth: 'user', category: 'Courses' },
];

const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  GET: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  POST: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  PATCH: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  PUT: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  DELETE: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

const AUTH_BADGES: Record<string, { label: string; color: string }> = {
  none: { label: 'Public', color: '#6b7280' },
  user: { label: 'Auth', color: '#3b82f6' },
  admin: { label: 'Admin', color: '#ef4444' },
  cron: { label: 'Cron', color: '#8b5cf6' },
  webhook: { label: 'Webhook', color: '#f59e0b' },
};

export default function SystemApisTab() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [testResults, setTestResults] = useState<Record<string, { status: number; time: number; ok: boolean } | null>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const categories = ['all', ...Array.from(new Set(SYSTEM_APIS.map(a => a.category)))];

  const filtered = SYSTEM_APIS.filter(a => {
    if (filter !== 'all' && a.category !== filter) return false;
    if (search && !a.path.toLowerCase().includes(search.toLowerCase()) && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const testEndpoint = async (api: SystemApi) => {
    const key = `${api.method}:${api.path}`;
    setTesting(p => ({ ...p, [key]: true }));
    const t0 = Date.now();
    try {
      const res = await fetch(api.path, {
        method: api.method === 'GET' ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(api.method !== 'GET' ? { body: JSON.stringify({}) } : {}),
      });
      setTestResults(p => ({ ...p, [key]: { status: res.status, time: Date.now() - t0, ok: res.ok } }));
    } catch {
      setTestResults(p => ({ ...p, [key]: { status: 0, time: Date.now() - t0, ok: false } }));
    }
    setTesting(p => ({ ...p, [key]: false }));
  };

  const grouped = categories.filter(c => c !== 'all').map(cat => ({
    category: cat,
    apis: filtered.filter(a => a.category === cat),
  })).filter(g => g.apis.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header + Stats */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>🔌 System API Reference</h3>
          <p style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 4 }}>
            {SYSTEM_APIS.length} endpoints across {categories.length - 1} categories. All routes under <code style={{ fontSize: 11, background: 'var(--input-bg)', padding: '1px 5px', borderRadius: 4 }}>/api/*</code>
          </p>
        </div>
        <div className="adm-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {[
              { label: 'GET', count: SYSTEM_APIS.filter(a => a.method === 'GET').length, color: '#10b981' },
              { label: 'POST', count: SYSTEM_APIS.filter(a => a.method === 'POST').length, color: '#3b82f6' },
              { label: 'PATCH', count: SYSTEM_APIS.filter(a => a.method === 'PATCH').length, color: '#f59e0b' },
              { label: 'DELETE', count: SYSTEM_APIS.filter(a => a.method === 'DELETE').length, color: '#ef4444' },
              { label: 'Total', count: SYSTEM_APIS.length, color: 'var(--text)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.count}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="Search endpoints..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)',
            background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none',
          }}
        />
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer',
              background: filter === c ? '#4f8ef7' : 'var(--input-bg)',
              color: filter === c ? '#fff' : 'var(--subtext)',
              fontSize: 11, fontWeight: 600, transition: 'all 0.2s', textTransform: 'capitalize',
            }}
          >
            {c === 'all' ? `All (${SYSTEM_APIS.length})` : c}
          </button>
        ))}
      </div>

      {/* API Groups */}
      {(filter === 'all' ? grouped : [{ category: filter, apis: filtered }]).map(group => (
        <div key={group.category} className="adm-card adm-card-full">
          <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            <h3 style={{ fontSize: 14 }}>{group.category} <span style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 400 }}>({group.apis.length})</span></h3>
          </div>
          <div className="adm-card-body" style={{ padding: 0 }}>
            {group.apis.map((api, i) => {
              const mc = METHOD_COLORS[api.method] || METHOD_COLORS.GET;
              const ab = AUTH_BADGES[api.auth] || AUTH_BADGES.none;
              const key = `${api.method}:${api.path}`;
              const tr = testResults[key];
              const isTesting = testing[key];

              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                  borderBottom: i < group.apis.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  {/* Method Badge */}
                  <span style={{
                    display: 'inline-block', width: 56, textAlign: 'center', padding: '4px 0', borderRadius: 6,
                    fontSize: 11, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.3px',
                    background: mc.bg, color: mc.color, flexShrink: 0,
                  }}>{api.method}</span>

                  {/* Path */}
                  <code style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace',
                    width: 240, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{api.path}</code>

                  {/* Description */}
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--subtext)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {api.description}
                  </span>

                  {/* Auth Badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                    background: `${ab.color}15`, color: ab.color, border: `1px solid ${ab.color}30`,
                    flexShrink: 0,
                  }}>{ab.label}</span>

                  {/* Test Result */}
                  {tr && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, fontFamily: 'monospace',
                      background: tr.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: tr.ok ? '#10b981' : '#ef4444', flexShrink: 0,
                    }}>{tr.status} · {tr.time}ms</span>
                  )}

                  {/* Test Button (GET only, non-cron) */}
                  {api.method === 'GET' && api.auth !== 'cron' && (
                    <button
                      onClick={() => testEndpoint(api)}
                      disabled={!!isTesting}
                      style={{
                        padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)',
                        background: 'var(--input-bg)', color: 'var(--subtext)', fontSize: 10, fontWeight: 600,
                        cursor: 'pointer', flexShrink: 0, opacity: isTesting ? 0.5 : 1,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {isTesting ? <Loader2 style={{ width: 10, height: 10, animation: 'spin 1s linear infinite' }} /> : <Play style={{ width: 10, height: 10 }} />}
                      Test
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
