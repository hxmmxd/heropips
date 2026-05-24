'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Server, TrendingUp, DollarSign, Shield, ShieldOff, ArrowLeft,
  Search, Crown, Zap, Rocket, ChevronDown, ChevronUp, Activity,
  BarChart3, Eye, Ban, MoreVertical, RefreshCw, Download,
  ArrowUpRight, Globe, Clock, Wifi, WifiOff, Receipt, CheckCircle, XCircle,
  Heart, Cpu, Database
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AdminStats {
  totalUsers: number;
  proUsers: number;
  enterpriseUsers: number;
  freeUsers: number;
  totalBrokers: number;
  activeBrokers: number;
  totalTrades: number;
  openTrades: number;
  revenue: number;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  plan: string;
  is_admin: boolean;
  avatar_url: string;
  created_at: string;
}

interface BrokerRow { id: string; user_id: string; broker_name: string; account_id: string; server: string; status: string; created_at: string; }
interface TradeRow { id: string; user_id: string; symbol: string; type: string; volume: number; open_price: number; close_price: number; pnl: number; status: string; created_at: string; }

type SortKey = 'full_name' | 'email' | 'plan' | 'created_at';
type SortDir = 'asc' | 'desc';
type Section = 'overview' | 'users' | 'brokers' | 'trades' | 'analytics';

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin');
      if (res.status === 403) { setError('forbidden'); setLoading(false); return; }
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setStats(data.stats);
      setUsers(data.users);
      setBrokers(data.brokers || []);
      setTrades(data.trades || []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUpdatePlan = async (userId: string, plan: string) => {
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, plan }) });
    setUsers(users.map(u => u.id === userId ? { ...u, plan } : u));
    setEditingUser(null);
  };

  const handleToggleAdmin = async (userId: string, currentAdmin: boolean) => {
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, is_admin: !currentAdmin }) });
    setUsers(users.map(u => u.id === userId ? { ...u, is_admin: !currentAdmin } : u));
    setActionMenu(null);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filteredUsers = useMemo(() => {
    let list = users.filter(u =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
    );
    list.sort((a, b) => {
      const aVal = (a[sortKey] || '').toString().toLowerCase();
      const bVal = (b[sortKey] || '').toString().toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return list;
  }, [users, search, sortKey, sortDir]);

  // Compute plan distribution for chart
  const planDist = useMemo(() => {
    if (!stats) return [];
    const total = stats.totalUsers || 1;
    return [
      { label: 'Free', count: stats.freeUsers, pct: (stats.freeUsers / total) * 100, color: '#6b7280' },
      { label: 'Pro', count: stats.proUsers, pct: (stats.proUsers / total) * 100, color: '#8b5cf6' },
      { label: 'Enterprise', count: stats.enterpriseUsers, pct: (stats.enterpriseUsers / total) * 100, color: '#f59e0b' },
    ];
  }, [stats]);

  const recentUsers = useMemo(() => users.slice(0, 5), [users]);

  if (loading) {
    return (
      <div className="adm">
        <div className="adm-center"><div className="adm-loader"><div /><div /><div /></div></div>
      </div>
    );
  }

  if (error === 'forbidden') {
    return (
      <div className="adm">
        <div className="adm-center adm-denied-screen">
          <div className="adm-denied-icon-wrap"><ShieldOff /></div>
          <h2>Access Restricted</h2>
          <p>You don&apos;t have admin privileges to access this panel.</p>
          <a href="/" className="adm-link-btn">Return to Dashboard</a>
        </div>
      </div>
    );
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="adm-sort-icon adm-sort-inactive" />;
    return sortDir === 'asc' ? <ChevronUp className="adm-sort-icon" /> : <ChevronDown className="adm-sort-icon" />;
  };

  return (
    <div className="adm">
      {/* Top Bar */}
      <header className="adm-topbar">
        <div className="adm-topbar-left">
          <a href="/" className="adm-logo-link">
            <ArrowLeft className="adm-logo-arrow" />
          </a>
          <div className="adm-topbar-brand">
            <h1 className="adm-topbar-title">TradeGPT</h1>
            <span className="adm-topbar-badge">Admin</span>
          </div>
        </div>
        <div className="adm-topbar-right">
          <button className={`adm-refresh ${refreshing ? 'adm-spinning' : ''}`} onClick={handleRefresh} title="Refresh data">
            <RefreshCw />
          </button>
          <div className="adm-topbar-time">
            <Clock className="adm-topbar-time-icon" />
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </header>

      <div className="adm-body">
        {/* Sidebar Nav */}
        <nav className="adm-nav">
          <button className={`adm-nav-item ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')}>
            <BarChart3 /><span>Overview</span>
          </button>
          <button className={`adm-nav-item ${activeSection === 'users' ? 'active' : ''}`} onClick={() => setActiveSection('users')}>
            <Users /><span>Users</span>
          </button>
          <button className={`adm-nav-item ${activeSection === 'brokers' ? 'active' : ''}`} onClick={() => setActiveSection('brokers')}>
            <Server /><span>Brokers</span>
          </button>
          <button className={`adm-nav-item ${activeSection === 'trades' ? 'active' : ''}`} onClick={() => setActiveSection('trades')}>
            <Receipt /><span>Trades</span>
          </button>
          <div className="adm-nav-divider" />
          <button className={`adm-nav-item ${activeSection === 'analytics' ? 'active' : ''}`} onClick={() => setActiveSection('analytics')}>
            <TrendingUp /><span>Analytics</span>
          </button>
        </nav>

        {/* Content */}
        <main className="adm-main">
          {activeSection === 'overview' && stats && (
            <>
              {/* KPI Row */}
              <div className="adm-kpi-row">
                <div className="adm-kpi">
                  <div className="adm-kpi-top">
                    <div className="adm-kpi-icon adm-kpi-blue"><Users /></div>
                    <span className="adm-kpi-trend adm-kpi-up"><ArrowUpRight />12%</span>
                  </div>
                  <p className="adm-kpi-val">{stats.totalUsers}</p>
                  <p className="adm-kpi-label">Total Users</p>
                </div>
                <div className="adm-kpi">
                  <div className="adm-kpi-top">
                    <div className="adm-kpi-icon adm-kpi-green"><DollarSign /></div>
                    <span className="adm-kpi-trend adm-kpi-up"><ArrowUpRight />8%</span>
                  </div>
                  <p className="adm-kpi-val">${stats.revenue}<span className="adm-kpi-suffix">/mo</span></p>
                  <p className="adm-kpi-label">Monthly Revenue</p>
                </div>
                <div className="adm-kpi">
                  <div className="adm-kpi-top">
                    <div className="adm-kpi-icon adm-kpi-purple"><Activity /></div>
                  </div>
                  <p className="adm-kpi-val">{stats.totalTrades}</p>
                  <p className="adm-kpi-label">Total Trades</p>
                </div>
                <div className="adm-kpi">
                  <div className="adm-kpi-top">
                    <div className="adm-kpi-icon adm-kpi-amber"><Server /></div>
                  </div>
                  <p className="adm-kpi-val">{stats.activeBrokers}<span className="adm-kpi-suffix">/{stats.totalBrokers}</span></p>
                  <p className="adm-kpi-label">Active Brokers</p>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="adm-grid-2">
                {/* Plan Distribution */}
                <div className="adm-card">
                  <div className="adm-card-head">
                    <h3>Plan Distribution</h3>
                  </div>
                  <div className="adm-card-body">
                    <div className="adm-dist-bar">
                      {planDist.map(d => (
                        <div key={d.label} className="adm-dist-seg" style={{ width: `${Math.max(d.pct, 2)}%`, background: d.color }} title={`${d.label}: ${d.count}`} />
                      ))}
                    </div>
                    <div className="adm-dist-legend">
                      {planDist.map(d => (
                        <div key={d.label} className="adm-dist-item">
                          <span className="adm-dist-dot" style={{ background: d.color }} />
                          <span className="adm-dist-name">{d.label}</span>
                          <span className="adm-dist-count">{d.count}</span>
                          <span className="adm-dist-pct">{d.pct.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Users */}
                <div className="adm-card">
                  <div className="adm-card-head">
                    <h3>Recent Signups</h3>
                    <button className="adm-card-link" onClick={() => setActiveSection('users')}>View all →</button>
                  </div>
                  <div className="adm-card-body adm-card-body-flush">
                    {recentUsers.map(u => (
                      <div key={u.id} className="adm-recent-row">
                        <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.email)}&background=10a37f&color=fff&size=32`} alt="" className="adm-recent-avatar" />
                        <div className="adm-recent-info">
                          <p className="adm-recent-name">{u.full_name || u.email?.split('@')[0]}</p>
                          <p className="adm-recent-email">{u.email}</p>
                        </div>
                        <span className={`adm-tag adm-tag-${u.plan || 'free'}`}>{(u.plan || 'free').charAt(0).toUpperCase() + (u.plan || 'free').slice(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="adm-grid-3">
                <div className="adm-metric">
                  <Globe className="adm-metric-icon" />
                  <div>
                    <p className="adm-metric-val">{stats.openTrades}</p>
                    <p className="adm-metric-label">Open Positions</p>
                  </div>
                </div>
                <div className="adm-metric">
                  <Crown className="adm-metric-icon" />
                  <div>
                    <p className="adm-metric-val">{stats.proUsers}</p>
                    <p className="adm-metric-label">Pro Subscribers</p>
                  </div>
                </div>
                <div className="adm-metric">
                  <Rocket className="adm-metric-icon" />
                  <div>
                    <p className="adm-metric-val">{stats.enterpriseUsers}</p>
                    <p className="adm-metric-label">Enterprise Clients</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'users' && (
            <div className="adm-card adm-card-full">
              <div className="adm-card-head">
                <h3>User Management</h3>
                <div className="adm-card-actions">
                  <div className="adm-search">
                    <Search className="adm-search-icon" />
                    <input type="text" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <span className="adm-count-badge">{filteredUsers.length} users</span>
                </div>
              </div>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('full_name')} className="adm-th-sort">User <SortIcon col="full_name" /></th>
                      <th onClick={() => handleSort('plan')} className="adm-th-sort">Plan <SortIcon col="plan" /></th>
                      <th>Role</th>
                      <th onClick={() => handleSort('created_at')} className="adm-th-sort">Joined <SortIcon col="created_at" /></th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="adm-user-cell">
                            <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.email)}&background=10a37f&color=fff&size=36`} alt="" className="adm-user-av" />
                            <div>
                              <p className="adm-user-name">{u.full_name || '—'}</p>
                              <p className="adm-user-email">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {editingUser === u.id ? (
                            <div className="adm-plan-picker">
                              {['free', 'pro', 'enterprise'].map(p => (
                                <button key={p} className={`adm-plan-opt ${u.plan === p || (!u.plan && p === 'free') ? 'active' : ''}`} onClick={() => handleUpdatePlan(u.id, p)}>
                                  {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button className={`adm-tag adm-tag-${u.plan || 'free'}`} onClick={() => setEditingUser(u.id)}>
                              {(u.plan || 'free').charAt(0).toUpperCase() + (u.plan || 'free').slice(1)}
                              <ChevronDown className="adm-tag-chevron" />
                            </button>
                          )}
                        </td>
                        <td><span className={`adm-role ${u.is_admin ? 'adm-role-admin' : ''}`}>{u.is_admin ? '🛡 Admin' : 'User'}</span></td>
                        <td className="adm-date-cell">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                        <td>
                          <div className="adm-actions-cell">
                            <button className="adm-action-dot" onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)}>
                              <MoreVertical />
                            </button>
                            {actionMenu === u.id && (
                              <>
                                <div className="adm-action-overlay" onClick={() => setActionMenu(null)} />
                                <div className="adm-action-menu">
                                  <button onClick={() => handleToggleAdmin(u.id, u.is_admin)}>
                                    {u.is_admin ? <><ShieldOff /> Remove Admin</> : <><Shield /> Make Admin</>}
                                  </button>
                                  <button className="adm-action-danger"><Ban /> Suspend User</button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={5} className="adm-empty">No users found matching &quot;{search}&quot;</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === 'brokers' && (
            <div className="adm-card adm-card-full">
              <div className="adm-card-head">
                <h3>Broker Accounts ({brokers.length})</h3>
              </div>
              {brokers.length === 0 ? (
                <div className="adm-empty-state"><Server className="adm-empty-icon" /><p>No broker accounts connected yet</p></div>
              ) : (
                <div className="adm-table-wrap"><table className="adm-table"><thead><tr>
                  <th>Broker</th><th>Account ID</th><th>Server</th><th>Status</th><th>Connected</th>
                </tr></thead><tbody>
                  {brokers.map(b => (
                    <tr key={b.id}>
                      <td><span className="adm-broker-name">{b.broker_name || 'MT5'}</span></td>
                      <td className="adm-mono">{b.account_id}</td>
                      <td className="adm-date-cell">{b.server || '—'}</td>
                      <td><span className={`adm-status ${b.status === 'connected' ? 'adm-status-on' : 'adm-status-off'}`}>
                        {b.status === 'connected' ? <><Wifi /> Connected</> : <><WifiOff /> Offline</>}
                      </span></td>
                      <td className="adm-date-cell">{b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody></table></div>
              )}
            </div>
          )}

          {activeSection === 'trades' && (
            <div className="adm-card adm-card-full">
              <div className="adm-card-head">
                <h3>Trade Log ({trades.length})</h3>
                <button className="adm-export-btn" onClick={() => {
                  const csv = 'Symbol,Type,Volume,Open,Close,P&L,Status,Date\n' + trades.map(t => `${t.symbol},${t.type},${t.volume},${t.open_price},${t.close_price},${t.pnl},${t.status},${t.created_at}`).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'trades.csv'; a.click();
                }}><Download /> Export CSV</button>
              </div>
              {trades.length === 0 ? (
                <div className="adm-empty-state"><Receipt className="adm-empty-icon" /><p>No trades recorded yet</p></div>
              ) : (
                <div className="adm-table-wrap"><table className="adm-table"><thead><tr>
                  <th>Symbol</th><th>Type</th><th>Volume</th><th>Open</th><th>Close</th><th>P&L</th><th>Status</th><th>Date</th>
                </tr></thead><tbody>
                  {trades.map(t => (
                    <tr key={t.id}>
                      <td><span className="adm-symbol">{t.symbol}</span></td>
                      <td><span className={`adm-trade-type ${t.type === 'buy' ? 'adm-buy' : 'adm-sell'}`}>{(t.type || '').toUpperCase()}</span></td>
                      <td>{t.volume}</td>
                      <td className="adm-mono">{t.open_price}</td>
                      <td className="adm-mono">{t.close_price || '—'}</td>
                      <td className={`adm-pnl ${(t.pnl || 0) >= 0 ? 'adm-pnl-pos' : 'adm-pnl-neg'}`}>{(t.pnl || 0) >= 0 ? '+' : ''}{(t.pnl || 0).toFixed(2)}</td>
                      <td><span className={`adm-status ${t.status === 'open' ? 'adm-status-on' : 'adm-status-off'}`}>{t.status === 'open' ? 'Open' : 'Closed'}</span></td>
                      <td className="adm-date-cell">{t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody></table></div>
              )}
            </div>
          )}

          {activeSection === 'analytics' && stats && (
            <>
              {/* Revenue Breakdown */}
              <div className="adm-card">
                <div className="adm-card-head"><h3>Revenue Breakdown</h3></div>
                <div className="adm-card-body">
                  <div className="adm-rev-grid">
                    <div className="adm-rev-item"><div className="adm-rev-bar-wrap"><div className="adm-rev-bar" style={{ height: `${Math.min((stats.proUsers * 50 / Math.max(stats.revenue, 1)) * 100, 100)}%`, background: '#8b5cf6' }} /></div><p className="adm-rev-val">${stats.proUsers * 50}</p><p className="adm-rev-label">Pro</p></div>
                    <div className="adm-rev-item"><div className="adm-rev-bar-wrap"><div className="adm-rev-bar" style={{ height: `${Math.min((stats.enterpriseUsers * 100 / Math.max(stats.revenue, 1)) * 100, 100)}%`, background: '#f59e0b' }} /></div><p className="adm-rev-val">${stats.enterpriseUsers * 100}</p><p className="adm-rev-label">Enterprise</p></div>
                  </div>
                </div>
              </div>

              {/* System Health */}
              <div className="adm-card">
                <div className="adm-card-head"><h3>System Health</h3></div>
                <div className="adm-card-body">
                  <div className="adm-health-grid">
                    <div className="adm-health-item"><div className="adm-health-dot adm-health-green" /><Cpu className="adm-health-icon" /><div><p className="adm-health-name">API Server</p><p className="adm-health-status">Operational</p></div></div>
                    <div className="adm-health-item"><div className="adm-health-dot adm-health-green" /><Database className="adm-health-icon" /><div><p className="adm-health-name">Database</p><p className="adm-health-status">Operational</p></div></div>
                    <div className="adm-health-item"><div className="adm-health-dot adm-health-green" /><Globe className="adm-health-icon" /><div><p className="adm-health-name">Auth Service</p><p className="adm-health-status">Operational</p></div></div>
                    <div className="adm-health-item"><div className="adm-health-dot adm-health-green" /><Server className="adm-health-icon" /><div><p className="adm-health-name">Broker Gateway</p><p className="adm-health-status">Operational</p></div></div>
                  </div>
                </div>
              </div>

              {/* Conversion & Engagement */}
              <div className="adm-grid-3">
                <div className="adm-metric"><Heart className="adm-metric-icon" /><div><p className="adm-metric-val">{stats.totalUsers > 0 ? ((stats.proUsers + stats.enterpriseUsers) / stats.totalUsers * 100).toFixed(1) : 0}%</p><p className="adm-metric-label">Conversion Rate</p></div></div>
                <div className="adm-metric"><DollarSign className="adm-metric-icon" /><div><p className="adm-metric-val">${stats.totalUsers > 0 ? (stats.revenue / stats.totalUsers).toFixed(0) : 0}</p><p className="adm-metric-label">ARPU</p></div></div>
                <div className="adm-metric"><Activity className="adm-metric-icon" /><div><p className="adm-metric-val">{stats.totalUsers > 0 ? (stats.totalTrades / stats.totalUsers).toFixed(1) : 0}</p><p className="adm-metric-label">Trades/User</p></div></div>
              </div>

              {/* Export */}
              <div className="adm-card">
                <div className="adm-card-head"><h3>Data Export</h3></div>
                <div className="adm-card-body adm-export-grid">
                  <button className="adm-export-card" onClick={() => {
                    const csv = 'Name,Email,Plan,Admin,Joined\n' + users.map(u => `"${u.full_name || ''}",${u.email},${u.plan || 'free'},${u.is_admin},${u.created_at}`).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'users.csv'; a.click();
                  }}><Users className="adm-export-card-icon" /><span>Export Users</span><Download /></button>
                  <button className="adm-export-card" onClick={() => {
                    const csv = 'Broker,AccountID,Server,Status,Date\n' + brokers.map(b => `${b.broker_name},${b.account_id},${b.server},${b.status},${b.created_at}`).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'brokers.csv'; a.click();
                  }}><Server className="adm-export-card-icon" /><span>Export Brokers</span><Download /></button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
