'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Server, TrendingUp, DollarSign, Shield, ShieldOff, ArrowLeft,
  Search, Crown, Zap, Rocket, ChevronDown, ChevronUp, Activity,
  BarChart3, Eye, Ban, MoreVertical, RefreshCw, Download,
  ArrowUpRight, Globe, Clock, Wifi, WifiOff, Receipt, CheckCircle, XCircle,
  Heart, Cpu, Database, Pencil, Check, X, Mail, User, Settings, Megaphone,
  FileText, Power, ToggleLeft, ToggleRight, AlertTriangle, Plus, Trash2,
  Target, BarChart2, ShieldAlert, Plug, TestTube, Loader2, Key, Link2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AdminSettings from '@/components/AdminSettings';

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
  winRate: number;
  totalPnl: number;
  suspendedUsers: number;
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

interface BrokerRow { id: string; user_id: string; broker_name: string; mt5_login: string; account_id?: string; server: string; metaapi_id?: string; status: string; balance: number; equity: number; pnl: number; is_active: boolean; created_at: string; }
interface TradeRow { id: string; user_id: string; symbol: string; type: string; volume: number; open_price: number; close_price: number; pnl: number; status: string; created_at: string; }

type SortKey = 'full_name' | 'email' | 'plan' | 'created_at';
type SortDir = 'asc' | 'desc';
type Section = 'overview' | 'users' | 'brokers' | 'trades' | 'analytics' | 'settings' | 'audit';

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
  const [planFilter, setPlanFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerUser, setDrawerUser] = useState<UserRow | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [suspendDialog, setSuspendDialog] = useState<{userId: string, name: string} | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [riskRules, setRiskRules] = useState<any[]>([]);
  const [signupTrends, setSignupTrends] = useState<{month:string;count:number}[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<{month:string;revenue:number}[]>([]);
  const [topSymbols, setTopSymbols] = useState<{symbol:string;count:number}[]>([]);
  const [brokerProviders, setBrokerProviders] = useState<any[]>([]);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', type: 'metatrader', api_key: '', api_secret: '', base_url: '' });
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

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
      setAnnouncements(data.announcements || []);
      setConfig(data.config || {});
      setAuditLog(data.auditLog || []);
      setRiskRules(data.riskRules || []);
      setSignupTrends(data.signupTrends || []);
      setRevenueTrends(data.revenueTrends || []);
      setTopSymbols(data.topSymbols || []);
      setBrokerProviders(data.brokerProviders || []);
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

  const openDrawer = (u: UserRow) => {
    setDrawerUser(u);
    setEditName(u.full_name || '');
    setEditEmail(u.email || '');
    setEditPlan(u.plan || 'free');
    setEditMode(false);
    setSaveMsg('');
  };

  const handleSaveUser = async () => {
    if (!drawerUser) return;
    setSaving(true); setSaveMsg('');
    try {
      await fetch('/api/admin', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: drawerUser.id, full_name: editName, email: editEmail, plan: editPlan }),
      });
      const updated = { ...drawerUser, full_name: editName, email: editEmail, plan: editPlan };
      setUsers(users.map(u => u.id === drawerUser.id ? updated : u));
      setDrawerUser(updated);
      setEditMode(false);
      setSaveMsg('Saved successfully');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch { setSaveMsg('Error saving'); }
    finally { setSaving(false); }
  };

  const filteredUsers = useMemo(() => {
    let list = users.filter(u => {
      const matchSearch = u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase());
      const matchPlan = planFilter === 'all' || (planFilter === 'free' ? (!u.plan || u.plan === 'free') : u.plan === planFilter);
      const matchRole = roleFilter === 'all' || (roleFilter === 'admin' ? u.is_admin : !u.is_admin);
      return matchSearch && matchPlan && matchRole;
    });
    list.sort((a, b) => {
      const aVal = (a[sortKey] || '').toString().toLowerCase();
      const bVal = (b[sortKey] || '').toString().toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return list;
  }, [users, search, sortKey, sortDir, planFilter, roleFilter]);

  const pagedUsers = useMemo(() => filteredUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filteredUsers, page]);
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleSelectAll = () => {
    if (selected.size === pagedUsers.length) setSelected(new Set());
    else setSelected(new Set(pagedUsers.map(u => u.id)));
  };
  const handleBulkPlan = async (plan: string) => {
    await Promise.all([...selected].map(id => fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, plan }) })));
    setUsers(users.map(u => selected.has(u.id) ? { ...u, plan } : u));
    setSelected(new Set());
  };

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
          <button className={`adm-nav-item ${activeSection === 'settings' ? 'active' : ''}`} onClick={() => setActiveSection('settings')}>
            <Settings /><span>Settings</span>
          </button>
          <button className={`adm-nav-item ${activeSection === 'audit' ? 'active' : ''}`} onClick={() => setActiveSection('audit')}>
            <FileText /><span>Audit Log</span>
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
            <>
              {/* Filter bar */}
              <div className="adm-filter-bar">
                <div className="adm-search"><Search className="adm-search-icon" /><input type="text" placeholder="Search users…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></div>
                <div className="adm-filters">
                  <select className="adm-select" value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(0); }}><option value="all">All Plans</option><option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select>
                  <select className="adm-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(0); }}><option value="all">All Roles</option><option value="admin">Admins</option><option value="user">Users</option></select>
                  <button className="adm-export-btn" onClick={() => {
                    const csv = 'Name,Email,Plan,Admin,Joined\n' + filteredUsers.map(u => `"${u.full_name || ''}",${u.email},${u.plan || 'free'},${u.is_admin},${u.created_at}`).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'users.csv'; a.click();
                  }}><Download /> Export</button>
                </div>
              </div>

              {/* Bulk bar */}
              {selected.size > 0 && (
                <div className="adm-bulk-bar">
                  <span className="adm-bulk-count">{selected.size} selected</span>
                  <div className="adm-bulk-actions">
                    <button onClick={() => handleBulkPlan('free')}>Set Free</button>
                    <button onClick={() => handleBulkPlan('pro')}>Set Pro</button>
                    <button onClick={() => handleBulkPlan('enterprise')}>Set Enterprise</button>
                    <button onClick={() => setSelected(new Set())} className="adm-bulk-clear">Clear</button>
                  </div>
                </div>
              )}

              <div className="adm-card adm-card-full">
                <div className="adm-card-head"><h3>Users</h3><span className="adm-count-badge">{filteredUsers.length} results</span></div>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead><tr>
                      <th className="adm-th-check"><input type="checkbox" checked={selected.size === pagedUsers.length && pagedUsers.length > 0} onChange={toggleSelectAll} /></th>
                      <th onClick={() => handleSort('full_name')} className="adm-th-sort">User <SortIcon col="full_name" /></th>
                      <th onClick={() => handleSort('plan')} className="adm-th-sort">Plan <SortIcon col="plan" /></th>
                      <th>Role</th>
                      <th onClick={() => handleSort('created_at')} className="adm-th-sort">Joined <SortIcon col="created_at" /></th>
                      <th>Actions</th>
                    </tr></thead>
                    <tbody>
                      {pagedUsers.map((u) => (
                        <tr key={u.id} className={selected.has(u.id) ? 'adm-row-selected' : ''}>
                          <td className="adm-td-check"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} /></td>
                          <td>
                            <div className="adm-user-cell" onClick={() => openDrawer(u)} style={{cursor:'pointer'}}>
                              <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.email)}&background=10a37f&color=fff&size=36`} alt="" className="adm-user-av" />
                              <div><p className="adm-user-name">{u.full_name || '—'}</p><p className="adm-user-email">{u.email}</p></div>
                            </div>
                          </td>
                          <td>
                            {editingUser === u.id ? (
                              <div className="adm-plan-picker">
                                {['free', 'pro', 'enterprise'].map(p => (<button key={p} className={`adm-plan-opt ${u.plan === p || (!u.plan && p === 'free') ? 'active' : ''}`} onClick={() => handleUpdatePlan(u.id, p)}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>))}
                              </div>
                            ) : (
                              <button className={`adm-tag adm-tag-${u.plan || 'free'}`} onClick={() => setEditingUser(u.id)}>{(u.plan || 'free').charAt(0).toUpperCase() + (u.plan || 'free').slice(1)}<ChevronDown className="adm-tag-chevron" /></button>
                            )}
                          </td>
                          <td><span className={`adm-role ${u.is_admin ? 'adm-role-admin' : ''}`}>{u.is_admin ? '🛡 Admin' : 'User'}</span></td>
                          <td className="adm-date-cell">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                          <td>
                            <div className="adm-actions-cell">
                              <button className="adm-action-dot" onClick={() => openDrawer(u)} title="View details"><Eye /></button>
                              <button className="adm-action-dot" onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)}><MoreVertical /></button>
                              {actionMenu === u.id && (<>
                                <div className="adm-action-overlay" onClick={() => setActionMenu(null)} />
                                <div className="adm-action-menu">
                                  <button onClick={() => { openDrawer(u); setActionMenu(null); }}><Eye /> View Profile</button>
                                  <button onClick={() => handleToggleAdmin(u.id, u.is_admin)}>{u.is_admin ? <><ShieldOff /> Remove Admin</> : <><Shield /> Make Admin</>}</button>
                                  <button className="adm-action-danger" onClick={() => { setSuspendDialog({ userId: u.id, name: u.full_name || u.email }); setActionMenu(null); }}><Ban /> Suspend User</button>
                                </div>
                              </>)}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pagedUsers.length === 0 && (<tr><td colSpan={6} className="adm-empty">No users found</td></tr>)}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="adm-pagination">
                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <span className="adm-page-info">Page {page + 1} of {totalPages}</span>
                    <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
                  </div>
                )}
              </div>

              {/* User Drawer */}
              {drawerUser && (<>
                <div className="adm-drawer-overlay" onClick={() => setDrawerUser(null)} />
                <div className="adm-drawer">
                  <div className="adm-drawer-head">
                    <h3>{editMode ? 'Edit User' : 'User Details'}</h3>
                    <div className="adm-drawer-head-actions">
                      {!editMode && <button className="adm-drawer-edit" onClick={() => setEditMode(true)}><Pencil /></button>}
                      <button className="adm-drawer-close" onClick={() => setDrawerUser(null)}>✕</button>
                    </div>
                  </div>
                  <div className="adm-drawer-body">
                    <div className="adm-drawer-profile">
                      <img src={drawerUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(drawerUser.full_name || drawerUser.email)}&background=10a37f&color=fff&size=80`} alt="" className="adm-drawer-avatar" />
                      {!editMode ? (
                        <>
                          <h4>{drawerUser.full_name || drawerUser.email?.split('@')[0]}</h4>
                          <p className="adm-drawer-email">{drawerUser.email}</p>
                        </>
                      ) : (
                        <div className="adm-edit-profile-fields">
                          <div className="adm-edit-field"><User className="adm-edit-icon" /><input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name" className="adm-edit-input" /></div>
                          <div className="adm-edit-field"><Mail className="adm-edit-icon" /><input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" className="adm-edit-input" /></div>
                        </div>
                      )}
                      <div className="adm-drawer-tags">
                        <span className={`adm-tag adm-tag-${drawerUser.plan || 'free'}`}>{(drawerUser.plan || 'free').charAt(0).toUpperCase() + (drawerUser.plan || 'free').slice(1)}</span>
                        {drawerUser.is_admin && <span className="adm-tag" style={{background:'rgba(239,68,68,0.12)',color:'#f87171'}}>Admin</span>}
                      </div>
                    </div>

                    {editMode ? (
                      <>
                        <div className="adm-edit-section">
                          <label className="adm-edit-label">Subscription Plan</label>
                          <div className="adm-edit-plan-row">
                            {['free', 'pro', 'enterprise'].map(p => (
                              <button key={p} className={`adm-edit-plan-opt ${editPlan === p ? 'active' : ''}`} onClick={() => setEditPlan(p)}>
                                {p === 'free' && <Zap className="adm-edit-plan-icon" />}
                                {p === 'pro' && <Crown className="adm-edit-plan-icon" />}
                                {p === 'enterprise' && <Rocket className="adm-edit-plan-icon" />}
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                        {saveMsg && <p className={`adm-save-msg ${saveMsg.includes('Error') ? 'adm-save-err' : ''}`}>{saveMsg}</p>}
                        <div className="adm-edit-buttons">
                          <button className="adm-edit-cancel" onClick={() => { setEditMode(false); setEditName(drawerUser.full_name || ''); setEditEmail(drawerUser.email || ''); setEditPlan(drawerUser.plan || 'free'); }}><X /> Cancel</button>
                          <button className="adm-edit-save" onClick={handleSaveUser} disabled={saving}>{saving ? 'Saving…' : <><Check /> Save Changes</>}</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="adm-drawer-fields">
                          <div className="adm-drawer-field"><span>User ID</span><span className="adm-mono">{drawerUser.id.slice(0, 8)}…</span></div>
                          <div className="adm-drawer-field"><span>Full Name</span><span>{drawerUser.full_name || '—'}</span></div>
                          <div className="adm-drawer-field"><span>Email</span><span>{drawerUser.email}</span></div>
                          <div className="adm-drawer-field"><span>Plan</span><span>{(drawerUser.plan || 'free').charAt(0).toUpperCase() + (drawerUser.plan || 'free').slice(1)}</span></div>
                          <div className="adm-drawer-field"><span>Role</span><span>{drawerUser.is_admin ? 'Admin' : 'User'}</span></div>
                          <div className="adm-drawer-field"><span>Joined</span><span>{drawerUser.created_at ? new Date(drawerUser.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</span></div>
                        </div>
                        <div className="adm-drawer-actions">
                          <button onClick={() => setEditMode(true)} className="adm-drawer-btn"><Pencil /> Edit User Info</button>
                          <button onClick={() => { handleUpdatePlan(drawerUser.id, 'pro'); setDrawerUser({...drawerUser, plan: 'pro'}); }} className="adm-drawer-btn"><Crown /> Upgrade to Pro</button>
                          <button onClick={() => { handleToggleAdmin(drawerUser.id, drawerUser.is_admin); setDrawerUser({...drawerUser, is_admin: !drawerUser.is_admin}); }} className="adm-drawer-btn">{drawerUser.is_admin ? <><ShieldOff /> Remove Admin</> : <><Shield /> Make Admin</>}</button>
                          <button className="adm-drawer-btn adm-drawer-btn-danger" onClick={() => { setSuspendDialog({ userId: drawerUser.id, name: drawerUser.full_name || drawerUser.email }); setDrawerUser(null); }}><Ban /> Suspend Account</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>)}
            </>
          )}

          {activeSection === 'brokers' && (
            <>
              {/* Broker Providers Hub */}
              <div className="adm-card">
                <div className="adm-card-head">
                  <h3><Plug style={{width:16,height:16,marginRight:6}} />Broker Providers ({brokerProviders.length})</h3>
                  <div className="adm-post-btn" role="button" tabIndex={0} onClick={() => setShowAddProvider(true)}>+ Add Provider</div>
                </div>
                <div className="adm-card-body">
                  {brokerProviders.length === 0 ? (
                    <div className="adm-empty-state"><Plug className="adm-empty-icon" /><p>No broker providers configured</p><p style={{fontSize:12,color:'var(--subtext)'}}>Add a provider to enable user broker connections</p></div>
                  ) : (
                    <div className="adm-provider-grid">
                      {brokerProviders.map(p => (
                        <div key={p.id} className="adm-provider-card">
                          <div className="adm-provider-top">
                            <div className={`adm-provider-status adm-provider-${p.status}`}>
                              {p.status === 'active' ? <CheckCircle /> : p.status === 'error' ? <XCircle /> : <Clock />}
                            </div>
                            <div className="adm-provider-actions">
                              <div className="adm-provider-act" role="button" tabIndex={0} onClick={async () => {
                                setTestingProvider(p.id);
                                const res = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brokerProvider: { action: 'test', data: { id: p.id } } }) });
                                const result = await res.json();
                                setBrokerProviders(brokerProviders.map(x => x.id === p.id ? { ...x, status: result.status || 'error', error_message: result.error || null } : x));
                                setTestingProvider(null);
                              }}>{testingProvider === p.id ? <Loader2 className="adm-spin" /> : <TestTube />}</div>
                              <div className="adm-provider-act adm-provider-del" role="button" tabIndex={0} onClick={async () => {
                                const yes = window.confirm(`Delete provider "${p.name}"?`);
                                if (!yes) return;
                                try {
                                  const res = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brokerProvider: { action: 'delete', data: { id: p.id, name: p.name } } }) });
                                  const result = await res.json();
                                  if (result.success) {
                                    setBrokerProviders(prev => prev.filter(x => x.id !== p.id));
                                  } else {
                                    alert('Delete failed: ' + (result.error || 'Unknown error'));
                                  }
                                } catch (err: any) {
                                  alert('Delete failed: ' + err.message);
                                }
                              }}><Trash2 /></div>
                            </div>
                          </div>
                          <h4 className="adm-provider-name">{p.name}</h4>
                          <span className={`adm-tag adm-tag-${p.type}`}>{
                            ({ metatrader: 'MetaTrader', ctrader: 'cTrader', binance: 'Binance', bybit: 'Bybit', okx: 'OKX', custom: 'Custom REST' } as Record<string,string>)[p.type] || p.type
                          }</span>
                          <div className="adm-provider-meta">
                            <div className="adm-provider-kv"><Key /><span>{p.api_key || 'No key'}</span></div>
                            {p.base_url && <div className="adm-provider-kv"><Link2 /><span>{p.base_url}</span></div>}
                          </div>
                          {p.error_message && <p className="adm-provider-error">{p.error_message}</p>}
                          <div className="adm-provider-footer">
                            <span>{p.connected_accounts || 0} accounts</span>
                            <span className={`adm-provider-badge adm-provider-${p.status}`}>{p.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Connected Accounts Table */}
              <div className="adm-card adm-card-full">
                <div className="adm-card-head"><h3>Connected Accounts ({brokers.length})</h3></div>
                {brokers.length === 0 ? (
                  <div className="adm-empty-state"><Server className="adm-empty-icon" /><p>No broker accounts connected yet</p></div>
                ) : (
                  <div className="adm-table-wrap"><table className="adm-table"><thead><tr>
                    <th>Broker</th><th>Login</th><th>Server</th><th>Balance</th><th>Status</th><th>Connected</th>
                  </tr></thead><tbody>
                    {brokers.map(b => (
                      <tr key={b.id}>
                        <td><span className="adm-broker-name">{b.broker_name || 'MT5'}</span></td>
                        <td className="adm-mono">{b.mt5_login || b.account_id || '—'}</td>
                        <td className="adm-date-cell">{b.server || '—'}</td>
                        <td className="adm-mono">${(b.balance || 0).toLocaleString()}</td>
                        <td><span className={`adm-status ${b.status === 'connected' ? 'adm-status-on' : 'adm-status-off'}`}>
                          {b.status === 'connected' ? <><Wifi /> Connected</> : <><WifiOff /> Offline</>}
                        </span></td>
                        <td className="adm-date-cell">{b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody></table></div>
                )}
              </div>
            </>
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
              {/* Trade Performance KPIs */}
              <div className="adm-kpi-row">
                <div className="adm-kpi"><div className="adm-kpi-top"><div className="adm-kpi-icon adm-kpi-green"><Target /></div></div><p className="adm-kpi-val">{stats.winRate}%</p><p className="adm-kpi-label">Win Rate</p></div>
                <div className="adm-kpi"><div className="adm-kpi-top"><div className={`adm-kpi-icon ${stats.totalPnl >= 0 ? 'adm-kpi-green' : 'adm-kpi-red'}`}><TrendingUp /></div></div><p className="adm-kpi-val">${stats.totalPnl}</p><p className="adm-kpi-label">Total P&L</p></div>
                <div className="adm-kpi"><div className="adm-kpi-top"><div className="adm-kpi-icon adm-kpi-purple"><Heart /></div></div><p className="adm-kpi-val">{stats.totalUsers > 0 ? ((stats.proUsers + stats.enterpriseUsers) / stats.totalUsers * 100).toFixed(1) : 0}%</p><p className="adm-kpi-label">Conversion</p></div>
                <div className="adm-kpi"><div className="adm-kpi-top"><div className="adm-kpi-icon adm-kpi-amber"><DollarSign /></div></div><p className="adm-kpi-val">${stats.totalUsers > 0 ? (stats.revenue / stats.totalUsers).toFixed(0) : 0}</p><p className="adm-kpi-label">ARPU</p></div>
              </div>

              {/* Signup & Revenue Trends */}
              <div className="adm-grid-2">
                <div className="adm-card">
                  <div className="adm-card-head"><h3>Signup Trend (6mo)</h3></div>
                  <div className="adm-card-body">
                    <div className="adm-chart-bars">
                      {signupTrends.map((t, i) => {
                        const max = Math.max(...signupTrends.map(s => s.count), 1);
                        return (<div key={i} className="adm-chart-col"><div className="adm-chart-bar-wrap"><div className="adm-chart-bar" style={{ height: `${(t.count / max) * 100}%`, background: '#10a37f' }} /></div><span className="adm-chart-val">{t.count}</span><span className="adm-chart-label">{t.month}</span></div>);
                      })}
                    </div>
                  </div>
                </div>
                <div className="adm-card">
                  <div className="adm-card-head"><h3>Revenue Trend (6mo)</h3></div>
                  <div className="adm-card-body">
                    <div className="adm-chart-bars">
                      {revenueTrends.map((t, i) => {
                        const max = Math.max(...revenueTrends.map(s => s.revenue), 1);
                        return (<div key={i} className="adm-chart-col"><div className="adm-chart-bar-wrap"><div className="adm-chart-bar" style={{ height: `${(t.revenue / max) * 100}%`, background: '#8b5cf6' }} /></div><span className="adm-chart-val">${t.revenue}</span><span className="adm-chart-label">{t.month}</span></div>);
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Symbols & Revenue Split */}
              <div className="adm-grid-2">
                <div className="adm-card">
                  <div className="adm-card-head"><h3>Top Traded Symbols</h3></div>
                  <div className="adm-card-body adm-card-body-flush">
                    {topSymbols.length === 0 ? <div className="adm-empty-state" style={{padding:'30px'}}><p>No trade data yet</p></div> : topSymbols.map((s, i) => {
                      const maxC = Math.max(...topSymbols.map(x => x.count), 1);
                      return (<div key={i} className="adm-symbol-row"><span className="adm-symbol-rank">#{i + 1}</span><span className="adm-symbol-name">{s.symbol}</span><div className="adm-symbol-bar-wrap"><div className="adm-symbol-bar" style={{ width: `${(s.count / maxC) * 100}%` }} /></div><span className="adm-symbol-count">{s.count}</span></div>);
                    })}
                  </div>
                </div>
                <div className="adm-card">
                  <div className="adm-card-head"><h3>Revenue Split</h3></div>
                  <div className="adm-card-body">
                    <div className="adm-rev-grid">
                      <div className="adm-rev-item"><div className="adm-rev-bar-wrap"><div className="adm-rev-bar" style={{ height: `${Math.min((stats.proUsers * 50 / Math.max(stats.revenue, 1)) * 100, 100)}%`, background: '#8b5cf6' }} /></div><p className="adm-rev-val">${stats.proUsers * 50}</p><p className="adm-rev-label">Pro</p></div>
                      <div className="adm-rev-item"><div className="adm-rev-bar-wrap"><div className="adm-rev-bar" style={{ height: `${Math.min((stats.enterpriseUsers * 100 / Math.max(stats.revenue, 1)) * 100, 100)}%`, background: '#f59e0b' }} /></div><p className="adm-rev-val">${stats.enterpriseUsers * 100}</p><p className="adm-rev-label">Enterprise</p></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Rules */}
              <div className="adm-card">
                <div className="adm-card-head"><h3><ShieldAlert style={{width:16,height:16,marginRight:6}} />Risk Rules</h3></div>
                <div className="adm-card-body">
                  <div className="adm-risk-grid">
                    {riskRules.map(r => (
                      <div key={r.id} className={`adm-risk-item ${!r.is_active ? 'adm-risk-disabled' : ''}`}>
                        <div className="adm-risk-top"><span className="adm-risk-name">{r.name}</span>
                          <button className={`adm-toggle ${r.is_active ? 'adm-toggle-on' : ''}`} onClick={async () => {
                            await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ riskRule: { id: r.id, threshold: r.threshold, is_active: !r.is_active } }) });
                            setRiskRules(riskRules.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x));
                          }}>{r.is_active ? <ToggleRight /> : <ToggleLeft />}</button>
                        </div>
                        <div className="adm-risk-bottom">
                          <span className="adm-risk-type">{r.rule_type === 'max_lot' ? 'Max Lots' : 'Daily Loss $'}</span>
                          <input type="number" className="adm-risk-input" value={r.threshold} onChange={e => setRiskRules(riskRules.map(x => x.id === r.id ? { ...x, threshold: Number(e.target.value) } : x))} onBlur={async () => {
                            await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ riskRule: { id: r.id, threshold: r.threshold, is_active: r.is_active } }) });
                          }} />
                          {r.plan_tier && <span className={`adm-tag adm-tag-${r.plan_tier}`}>{r.plan_tier.charAt(0).toUpperCase() + r.plan_tier.slice(1)}</span>}
                        </div>
                      </div>
                    ))}
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

          {activeSection === 'settings' && (
            <AdminSettings
              initialConfig={config}
              initialAnnouncements={announcements}
              onRefresh={loadData}
            />
          )}
          {activeSection === 'audit' && (
            <div className="adm-card adm-card-full">
              <div className="adm-card-head"><h3>Audit Trail ({auditLog.length})</h3></div>
              {auditLog.length === 0 ? (
                <div className="adm-empty-state"><FileText className="adm-empty-icon" /><p>No audit entries yet</p></div>
              ) : (
                <div className="adm-audit-list">
                  {auditLog.map((entry: any) => (
                    <div key={entry.id} className="adm-audit-item">
                      <div className={`adm-audit-dot ${entry.action.includes('suspend') ? 'adm-audit-red' : entry.action.includes('config') ? 'adm-audit-amber' : 'adm-audit-green'}`} />
                      <div className="adm-audit-body">
                        <p className="adm-audit-action">{entry.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                        <p className="adm-audit-details">{entry.target_type}{entry.target_id ? ` · ${entry.target_id.slice(0, 8)}…` : ''}</p>
                        <p className="adm-audit-time">{new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Suspend Dialog */}
          {suspendDialog && (<>
            <div className="adm-drawer-overlay" onClick={() => setSuspendDialog(null)} />
            <div className="adm-suspend-dialog">
              <h3>Suspend {suspendDialog.name}</h3>
              <p>This will disable the user&apos;s access to the platform.</p>
              <textarea className="adm-suspend-input" placeholder="Reason for suspension…" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} />
              <div className="adm-edit-buttons">
                <button className="adm-edit-cancel" onClick={() => setSuspendDialog(null)}><X /> Cancel</button>
                <button className="adm-edit-save" style={{background:'#ef4444'}} onClick={async () => {
                  await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: suspendDialog.userId, status: 'suspended', suspended_reason: suspendReason }) });
                  setUsers(users.map(u => u.id === suspendDialog.userId ? { ...u, status: 'suspended' } as any : u));
                  setSuspendDialog(null); setSuspendReason('');
                }}><Ban /> Suspend</button>
              </div>
            </div>
          </>)}

          {/* Add Provider Dialog */}
          {showAddProvider && (<>
            <div className="adm-drawer-overlay" onClick={() => setShowAddProvider(false)} />
            <div className="adm-suspend-dialog" style={{width:'480px'}}>
              <h3>Add Broker Provider</h3>
              <p>Configure a new broker API connection for your platform.</p>
              <input className="adm-edit-input" placeholder="Provider Name (e.g. MetaAPI Production)" value={newProvider.name} onChange={e => setNewProvider({ ...newProvider, name: e.target.value })} />
              <select className="adm-select" style={{width:'100%',marginBottom:8}} value={newProvider.type} onChange={e => {
                const t = e.target.value;
                const urls: Record<string,string> = { binance: 'https://api.binance.com', bybit: 'https://api.bybit.com', okx: 'https://www.okx.com' };
                setNewProvider({ ...newProvider, type: t, base_url: urls[t] || '' });
              }}>
                <optgroup label="Forex / Metals / Indices">
                  <option value="metatrader">MetaTrader (MetaAPI)</option>
                  <option value="ctrader">cTrader (Open API)</option>
                </optgroup>
                <optgroup label="Crypto Exchanges">
                  <option value="binance">Binance</option>
                  <option value="bybit">Bybit</option>
                  <option value="okx">OKX</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="custom">Custom REST API</option>
                </optgroup>
              </select>
              <input className="adm-edit-input" type="password" placeholder={newProvider.type === 'metatrader' ? 'MetaAPI Token' : 'API Key'} value={newProvider.api_key} onChange={e => setNewProvider({ ...newProvider, api_key: e.target.value })} />
              {newProvider.type !== 'metatrader' && (
                <input className="adm-edit-input" type="password" placeholder="API Secret" value={newProvider.api_secret} onChange={e => setNewProvider({ ...newProvider, api_secret: e.target.value })} />
              )}
              {['ctrader', 'custom'].includes(newProvider.type) && (
                <input className="adm-edit-input" placeholder="Base URL (e.g. https://api.broker.com)" value={newProvider.base_url} onChange={e => setNewProvider({ ...newProvider, base_url: e.target.value })} />
              )}
              {['binance', 'bybit', 'okx'].includes(newProvider.type) && (
                <p style={{fontSize:11,color:'var(--subtext)',margin:'0 0 4px'}}>🔗 Endpoint: {newProvider.base_url || 'auto-configured'}</p>
              )}
              <div className="adm-edit-buttons" style={{marginTop:8}}>
                <div className="adm-edit-cancel" role="button" tabIndex={0} onClick={() => setShowAddProvider(false)}>Cancel</div>
                <div className="adm-post-btn" role="button" tabIndex={0} onClick={async () => {
                  if (!newProvider.name || !newProvider.api_key) return;
                  await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brokerProvider: { action: 'create', data: newProvider } }) });
                  setShowAddProvider(false);
                  setNewProvider({ name: '', type: 'metatrader', api_key: '', api_secret: '', base_url: '' });
                  handleRefresh();
                }}>+ Create Provider</div>
              </div>
            </div>
          </>)}
        </main>
      </div>
    </div>
  );
}
