'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users, Server, TrendingUp, DollarSign, Shield, ShieldOff, ArrowLeft,
  Search, Crown, Zap, Rocket, ChevronDown, ChevronUp, Activity,
  BarChart3, Eye, Ban, MoreVertical, RefreshCw, Download,
  ArrowUpRight, Globe, Clock, Wifi, WifiOff, Receipt, CheckCircle, XCircle,
  Heart, Cpu, Database, Pencil, Check, X, Mail, User, Settings, Megaphone,
  FileText, Power, ToggleLeft, ToggleRight, AlertTriangle, Plus, Trash2,
  Target, BarChart2, ShieldAlert, Plug, TestTube, Loader2, Key, Link2, Handshake,
  Menu, Calendar, Filter, MapPin, Smartphone, Monitor, Moon, Sun, Copy, MemoryStick
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUserAvatar } from '@/lib/avatar';
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

interface BrokerRow { id: string; user_id: string; broker_name: string; mt5_login: string; account_id?: string; server: string; metaapi_id?: string; status: string; balance: number; equity: number; pnl: number; is_active: boolean; created_at: string; trade_count?: number; }
interface TradeRow { id: string; user_id: string; broker_id?: string; symbol: string; action: string; volume: number; entry_price: number; close_price: number; pnl: number; status: string; order_id?: string; stop_loss?: number; take_profit?: number; created_at: string; updated_at?: string; }

type SortKey = 'full_name' | 'email' | 'plan' | 'created_at';
type SortDir = 'asc' | 'desc';
type Section = 'overview' | 'users' | 'brokers' | 'accounts' | 'trades' | 'analytics' | 'settings' | 'audit' | 'mt5farm';

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'partner_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

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
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerUser, setDrawerUser] = useState<UserRow | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [selectedUserAccounts, setSelectedUserAccounts] = useState<BrokerRow[]>([]);
  const [selectedUserTrades, setSelectedUserTrades] = useState<TradeRow[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'accounts' | 'session' | 'metrics'>('overview');
  const [selectedUserSession, setSelectedUserSession] = useState<any>(null);
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
  const [apiStats, setApiStats] = useState<any[]>([]);

  // ── MT5 Farm State ──
  const [farmHealth, setFarmHealth]   = useState<any>(null);
  const [farmAccounts, setFarmAccounts] = useState<any[]>([]);
  const [farmKeys, setFarmKeys]       = useState<any[]>([]);
  const [farmStats, setFarmStats]     = useState<any>(null);
  const [farmLoading, setFarmLoading] = useState(false);
  const [farmError, setFarmError]     = useState('');
  const [farmRefreshing, setFarmRefreshing] = useState(false);
  const [farmAutoRefresh, setFarmAutoRefresh] = useState(false);
  const [farmLastRefresh, setFarmLastRefresh] = useState<Date | null>(null);
  const [farmTab, setFarmTab]         = useState<'overview' | 'accounts' | 'keys' | 'stats'>('overview');
  const [farmNewKeyLabel, setFarmNewKeyLabel] = useState('');
  const [farmNewKeyLimit, setFarmNewKeyLimit] = useState(100);
  const [farmCreatingKey, setFarmCreatingKey] = useState(false);
  const [farmRevealedKey, setFarmRevealedKey] = useState<string | null>(null);
  const [farmActionLoading, setFarmActionLoading] = useState<string | null>(null);
  const farmIntervalRef = useRef<any>(null);
  const [farmTesting, setFarmTesting]           = useState(false);
  const [farmTestResult, setFarmTestResult]     = useState<any>(null);
  const [farmOrchestratorUrl, setFarmOrchestratorUrl] = useState('4.224.249.231:8080');

  const runFarmConnectionTest = async () => {
    setFarmTesting(true);
    setFarmTestResult(null);
    try {
      const res = await fetch('/api/admin/mt5-farm?action=test-connection');
      const data = await res.json();
      setFarmTestResult(data);
    } catch (e: any) {
      setFarmTestResult({ overall: false, error: e.message });
    } finally {
      setFarmTesting(false);
    }
  };

  const fetchFarmData = useCallback(async (silent = false) => {
    if (!silent) setFarmLoading(true);
    setFarmRefreshing(true);
    setFarmError('');
    try {
      const [ovRes, keysRes, statsRes] = await Promise.all([
        fetch('/api/admin/mt5-farm?action=overview'),
        fetch('/api/admin/mt5-farm?action=keys'),
        fetch('/api/admin/mt5-farm?action=stats'),
      ]);
      if (ovRes.ok)    {
        const d = await ovRes.json();
        setFarmHealth(d.health);
        setFarmAccounts(d.accounts || []);
        if (d.orchestratorUrl) {
          setFarmOrchestratorUrl(d.orchestratorUrl.replace('http://', '').replace('https://', ''));
        }
      }
      if (keysRes.ok)  { const d = await keysRes.json();  setFarmKeys(d.keys || []); }
      if (statsRes.ok) { const d = await statsRes.json(); setFarmStats(d); }
      setFarmLastRefresh(new Date());
    } catch (e: any) { setFarmError(e.message || 'Failed to fetch farm data'); }
    finally { setFarmLoading(false); setFarmRefreshing(false); }
  }, []);

  useEffect(() => {
    if (activeSection === 'mt5farm' && !farmLastRefresh) fetchFarmData();
  }, [activeSection, farmLastRefresh, fetchFarmData]);

  useEffect(() => {
    if (farmAutoRefresh && activeSection === 'mt5farm') {
      farmIntervalRef.current = setInterval(() => fetchFarmData(true), 5000);
    } else {
      clearInterval(farmIntervalRef.current);
    }
    return () => clearInterval(farmIntervalRef.current);
  }, [farmAutoRefresh, activeSection, fetchFarmData]);

  const farmAccountAction = async (id: string, action: string) => {
    setFarmActionLoading(`${action}-${id}`);
    try {
      await fetch('/api/admin/mt5-farm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, accountId: id }) });
      await fetchFarmData(true);
    } finally { setFarmActionLoading(null); }
  };

  const farmCreateKey = async () => {
    if (!farmNewKeyLabel.trim()) return;
    setFarmCreatingKey(true);
    try {
      const res = await fetch('/api/admin/mt5-farm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'createKey', label: farmNewKeyLabel, rateLimit: farmNewKeyLimit }) });
      const data = await res.json();
      if (data.key) { setFarmRevealedKey(data.key); setFarmNewKeyLabel(''); await fetchFarmData(true); }
    } finally { setFarmCreatingKey(false); }
  };

  const farmRevokeKey = async (keyId: string) => {
    if (!confirm('Revoke this key? Cannot be undone.')) return;
    setFarmActionLoading(`revoke-${keyId}`);
    try {
      await fetch('/api/admin/mt5-farm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'revokeKey', keyId }) });
      await fetchFarmData(true);
    } finally { setFarmActionLoading(null); }
  };

  // ── Partner Brokers State ──
  const EMPTY_PARTNER = { id: '', name: '', logo: '🏦', platform: 'mt5' as const, servers: [] as string[], rebate_per_lot: 5, rebate_currency: 'USD', website: '', notes: '', is_active: true, created_at: '' };
  const [partnerBrokers, setPartnerBrokers] = useState<any[]>([]);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [partnerForm, setPartnerForm] = useState<any>(EMPTY_PARTNER);
  const [partnerSaving, setPartnerSaving] = useState(false);

  // MetaAPI server search states inside modal
  const [brokerSearchQuery, setBrokerSearchQuery] = useState('');
  const [brokerSearchResults, setBrokerSearchResults] = useState<string[]>([]);
  const [searchingServers, setSearchingServers] = useState(false);
  const [showAdminServerDropdown, setShowAdminServerDropdown] = useState(false);
  const adminSearchRef = useRef<HTMLDivElement>(null);
  const [customServerInput, setCustomServerInput] = useState('');
  // verify-server state: null = idle, 'checking' = in progress, true/false = result
  const [verifyStatus, setVerifyStatus] = useState<null | 'checking' | 'ok' | 'fail'>(null);
  const [verifyError, setVerifyError]   = useState('');
  const [verifyNote, setVerifyNote]     = useState(''); // farm's note for unverified servers

  // Close admin server search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (adminSearchRef.current && !adminSearchRef.current.contains(e.target as Node)) {
        setShowAdminServerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);


  // ── Trade Filter State ──
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradeDateFrom, setTradeDateFrom] = useState('');
  const [tradeDateTo, setTradeDateTo] = useState('');
  const [tradeStatusFilter, setTradeStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  const filteredTrades = useMemo(() => {
    let result = trades;
    // Search by symbol, action, order_id
    if (tradeSearch.trim()) {
      const q = tradeSearch.toLowerCase();
      result = result.filter(t =>
        (t.symbol || '').toLowerCase().includes(q) ||
        (t.action || '').toLowerCase().includes(q) ||
        String(t.id || '').toLowerCase().includes(q)
      );
    }
    // Status filter
    if (tradeStatusFilter !== 'all') {
      result = result.filter(t => {
        if (tradeStatusFilter === 'open') return t.status === 'open';
        return t.status !== 'open'; // closed
      });
    }
    // Date range
    if (tradeDateFrom) {
      const from = new Date(tradeDateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(t => t.created_at && new Date(t.created_at) >= from);
    }
    if (tradeDateTo) {
      const to = new Date(tradeDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(t => t.created_at && new Date(t.created_at) <= to);
    }
    return result;
  }, [trades, tradeSearch, tradeStatusFilter, tradeDateFrom, tradeDateTo]);

  // Debounced search for broker servers
  useEffect(() => {
    if (!brokerSearchQuery.trim()) {
      setBrokerSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearchingServers(true);
      try {
        const res = await fetch(`/api/broker?q=${encodeURIComponent(brokerSearchQuery)}`);
        if (res.ok) {
          const d = await res.json();
          setBrokerSearchResults(d.servers || []);
        }
      } catch {}
      finally {
        setSearchingServers(false);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [brokerSearchQuery]);

  // Poll API stats every 10s when analytics tab is active
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/api-stats');
        if (res.ok) { const d = await res.json(); setApiStats(d.stats || []); }
      } catch {}
    };
    if (activeSection === 'analytics' || activeSection === 'settings') {
      fetchStats();
      timer = setInterval(fetchStats, 10_000);
    }
    return () => clearInterval(timer);
  }, [activeSection]);

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
      setPartnerBrokers(data.config?.partner_brokers ?? []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const savePartnerBrokers = async (list: any[]) => {
    setPartnerSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configKey: 'partner_brokers', configValue: list }),
      });
      if (!res.ok) throw new Error('Failed to save partner brokers');
      setPartnerBrokers(list);
    } catch (err: any) {
      alert(err.message || 'Error saving partner brokers');
    } finally {
      setPartnerSaving(false);
    }
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

  const openDrawer = async (u: UserRow) => {
    setDrawerUser(u);
    setEditName(u.full_name || '');
    setEditEmail(u.email || '');
    setEditPlan(u.plan || 'free');
    setEditMode(false);
    setSaveMsg('');
    setDrawerTab('overview');

    // Fetch user details (accounts, trades & session)
    setDrawerLoading(true);
    setSelectedUserAccounts([]);
    setSelectedUserTrades([]);
    setSelectedUserSession(null);
    try {
      const res = await fetch(`/api/admin/user?userId=${u.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSelectedUserAccounts(data.brokers || []);
          setSelectedUserTrades(data.trades || []);
          setSelectedUserSession(data.session || null);
        }
      }
    } catch (err) {
      console.error('Failed to load user details:', err);
    } finally {
      setDrawerLoading(false);
    }
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

  const visibleUsers = useMemo(() => filteredUsers.slice(0, visibleCount), [filteredUsers, visibleCount]);
  const hasMore = visibleCount < filteredUsers.length;

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleSelectAll = () => {
    if (selected.size === visibleUsers.length) setSelected(new Set());
    else setSelected(new Set(visibleUsers.map(u => u.id)));
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
          <button className="adm-hamburger" onClick={() => setShowMobileNav(!showMobileNav)} title="Toggle Navigation">
            <Menu />
          </button>
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
        {/* Mobile Sidebar Navigation Drawer */}
        {showMobileNav && (
          <>
            <div className="adm-drawer-overlay" onClick={() => setShowMobileNav(false)} style={{ zIndex: 1040 }} />
            <nav className="adm-nav-mobile">
              <div className="adm-nav-mobile-head">
                <h3>Navigation</h3>
                <button onClick={() => setShowMobileNav(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--subtext)' }}>✕</button>
              </div>
              <button className={`adm-nav-item ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => { setActiveSection('overview'); setShowMobileNav(false); }}>
                <BarChart3 /><span>Overview</span>
              </button>
              <button className={`adm-nav-item ${activeSection === 'users' ? 'active' : ''}`} onClick={() => { setActiveSection('users'); setShowMobileNav(false); }}>
                <Users /><span>Users</span>
              </button>
              <button className={`adm-nav-item ${activeSection === 'brokers' ? 'active' : ''}`} onClick={() => { setActiveSection('brokers'); setShowMobileNav(false); }}>
                <Server /><span>Brokers</span>
              </button>
              <button className={`adm-nav-item ${activeSection === 'accounts' ? 'active' : ''}`} onClick={() => { setActiveSection('accounts'); setShowMobileNav(false); }}>
                <Database /><span>Accounts</span>
              </button>
              <button className={`adm-nav-item ${activeSection === 'trades' ? 'active' : ''}`} onClick={() => { setActiveSection('trades'); setShowMobileNav(false); }}>
                <Receipt /><span>Trades</span>
              </button>
              <div className="adm-nav-divider" />
              <button className={`adm-nav-item ${activeSection === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveSection('analytics'); setShowMobileNav(false); }}>
                <TrendingUp /><span>Analytics</span>
              </button>
              <button className={`adm-nav-item ${activeSection === 'settings' ? 'active' : ''}`} onClick={() => { setActiveSection('settings'); setShowMobileNav(false); }}>
                <Settings /><span>Settings</span>
              </button>
              <button className={`adm-nav-item ${activeSection === 'audit' ? 'active' : ''}`} onClick={() => { setActiveSection('audit'); setShowMobileNav(false); }}>
                <FileText /><span>Audit Log</span>
              </button>
              <div className="adm-nav-divider" />
              <button className={`adm-nav-item ${activeSection === 'mt5farm' ? 'active' : ''}`} onClick={() => { setActiveSection('mt5farm'); setShowMobileNav(false); }}>
                <Server /><span>MT5 Farm</span>
              </button>
            </nav>
          </>
        )}

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
          <button className={`adm-nav-item ${activeSection === 'accounts' ? 'active' : ''}`} onClick={() => setActiveSection('accounts')}>
            <Database /><span>Accounts</span>
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
          <div className="adm-nav-divider" />
          <button className={`adm-nav-item ${activeSection === 'mt5farm' ? 'active' : ''}`} onClick={() => setActiveSection('mt5farm')}>
            <Server style={{ color: activeSection === 'mt5farm' ? '#818cf8' : undefined }} /><span>MT5 Farm</span>
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
                        <img src={getUserAvatar({ avatar_url: u.avatar_url, id: u.id, full_name: u.full_name, email: u.email })} alt="" className="adm-recent-avatar" />
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
                <div className="adm-search"><Search className="adm-search-icon" /><input type="text" placeholder="Search users…" value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(30); }} /></div>
                <div className="adm-filters">
                  <select className="adm-select" value={planFilter} onChange={e => { setPlanFilter(e.target.value); setVisibleCount(30); }}><option value="all">All Plans</option><option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select>
                  <select className="adm-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setVisibleCount(30); }}><option value="all">All Roles</option><option value="admin">Admins</option><option value="user">Users</option></select>
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
                      <th className="adm-th-check"><input type="checkbox" checked={selected.size === visibleUsers.length && visibleUsers.length > 0} onChange={toggleSelectAll} /></th>
                      <th onClick={() => handleSort('full_name')} className="adm-th-sort">User <SortIcon col="full_name" /></th>
                      <th onClick={() => handleSort('plan')} className="adm-th-sort">Plan <SortIcon col="plan" /></th>
                      <th>Role</th>
                      <th onClick={() => handleSort('created_at')} className="adm-th-sort">Joined <SortIcon col="created_at" /></th>
                      <th>Actions</th>
                    </tr></thead>
                    <tbody>
                      {visibleUsers.map((u) => (
                        <tr key={u.id} className={selected.has(u.id) ? 'adm-row-selected' : ''}>
                          <td className="adm-td-check"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} /></td>
                          <td>
                            <div className="adm-user-cell" onClick={() => openDrawer(u)} style={{cursor:'pointer'}}>
                              <img src={getUserAvatar({ avatar_url: u.avatar_url, id: u.id, full_name: u.full_name, email: u.email })} alt="" className="adm-user-av" />
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
                      {visibleUsers.length === 0 && (<tr><td colSpan={6} className="adm-empty">No users found</td></tr>)}
                    </tbody>
                  </table>
                </div>
                {/* Load More */}
                {hasMore && (
                  <div className="adm-pagination">
                    <span className="adm-page-info">Showing {visibleUsers.length} of {filteredUsers.length} users</span>
                    <button onClick={() => setVisibleCount(c => c + 30)}>Show More</button>
                    <button onClick={() => setVisibleCount(filteredUsers.length)}>Show All</button>
                  </div>
                )}
                {!hasMore && filteredUsers.length > 30 && (
                  <div className="adm-pagination">
                    <span className="adm-page-info">Showing all {filteredUsers.length} users</span>
                    <button onClick={() => setVisibleCount(30)}>Collapse</button>
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
                  {!editMode && (
                    <div className="adm-drawer-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
                      <button
                        className={`adm-drawer-tab ${drawerTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setDrawerTab('overview')}
                        style={{
                          padding: '12px 16px',
                          background: 'none',
                          border: 'none',
                          borderBottom: drawerTab === 'overview' ? '2px solid #10a37f' : '2px solid transparent',
                          color: drawerTab === 'overview' ? '#10a37f' : 'var(--subtext)',
                          fontWeight: drawerTab === 'overview' ? 'bold' : 'normal',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Overview
                      </button>
                      <button
                        className={`adm-drawer-tab ${drawerTab === 'accounts' ? 'active' : ''}`}
                        onClick={() => setDrawerTab('accounts')}
                        style={{
                          padding: '12px 16px',
                          background: 'none',
                          border: 'none',
                          borderBottom: drawerTab === 'accounts' ? '2px solid #10a37f' : '2px solid transparent',
                          color: drawerTab === 'accounts' ? '#10a37f' : 'var(--subtext)',
                          fontWeight: drawerTab === 'accounts' ? 'bold' : 'normal',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Accounts ({selectedUserAccounts.length})
                      </button>
                      <button
                        className={`adm-drawer-tab ${drawerTab === 'metrics' ? 'active' : ''}`}
                        onClick={() => setDrawerTab('metrics')}
                        style={{
                          padding: '12px 16px',
                          background: 'none',
                          border: 'none',
                          borderBottom: drawerTab === 'metrics' ? '2px solid #10a37f' : '2px solid transparent',
                          color: drawerTab === 'metrics' ? '#10a37f' : 'var(--subtext)',
                          fontWeight: drawerTab === 'metrics' ? 'bold' : 'normal',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Metrics
                      </button>
                      <button
                        className={`adm-drawer-tab ${drawerTab === 'session' ? 'active' : ''}`}
                        onClick={() => setDrawerTab('session')}
                        style={{
                          padding: '12px 16px',
                          background: 'none',
                          border: 'none',
                          borderBottom: drawerTab === 'session' ? '2px solid #10a37f' : '2px solid transparent',
                          color: drawerTab === 'session' ? '#10a37f' : 'var(--subtext)',
                          fontWeight: drawerTab === 'session' ? 'bold' : 'normal',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Session
                      </button>
                    </div>
                  )}
                  <div className="adm-drawer-body">
                    {editMode ? (
                      <>
                        <div className="adm-drawer-profile">
                          <img src={getUserAvatar({ avatar_url: drawerUser.avatar_url, id: drawerUser.id, full_name: drawerUser.full_name, email: drawerUser.email })} alt="" className="adm-drawer-avatar" />
                          <div className="adm-edit-profile-fields">
                            <div className="adm-edit-field"><User className="adm-edit-icon" /><input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name" className="adm-edit-input" /></div>
                            <div className="adm-edit-field"><Mail className="adm-edit-icon" /><input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" className="adm-edit-input" /></div>
                          </div>
                        </div>
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
                        {drawerTab === 'overview' && (
                          <>
                            <div className="adm-drawer-profile">
                              <img src={getUserAvatar({ avatar_url: drawerUser.avatar_url, id: drawerUser.id, full_name: drawerUser.full_name, email: drawerUser.email })} alt="" className="adm-drawer-avatar" />
                              <h4>{drawerUser.full_name || drawerUser.email?.split('@')[0]}</h4>
                              <p className="adm-drawer-email">{drawerUser.email}</p>
                              <div className="adm-drawer-tags">
                                <span className={`adm-tag adm-tag-${drawerUser.plan || 'free'}`}>{(drawerUser.plan || 'free').charAt(0).toUpperCase() + (drawerUser.plan || 'free').slice(1)}</span>
                                {drawerUser.is_admin && <span className="adm-tag" style={{background:'rgba(239,68,68,0.12)',color:'#f87171'}}>Admin</span>}
                              </div>
                            </div>
                            <div className="adm-drawer-fields" style={{ marginTop: '20px' }}>
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

                        {drawerTab === 'accounts' && (
                          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {drawerLoading ? (
                              <div className="text-center py-10" style={{ color: 'var(--subtext)' }}>
                                Loading connected accounts...
                              </div>
                            ) : selectedUserAccounts.length === 0 ? (
                              <div className="text-center py-12" style={{ color: 'var(--subtext)', border: '1px dashed var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                                No broker accounts connected yet.
                              </div>
                            ) : (
                              selectedUserAccounts.map((acc) => (
                                <div key={acc.id} style={{
                                  border: '1px solid var(--border)',
                                  borderRadius: '12px',
                                  padding: '16px',
                                  background: 'rgba(255,255,255,0.02)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{acc.broker_name || 'MT5 Account'}</h4>
                                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--subtext)' }}>
                                        Login: {acc.mt5_login} · Server: {acc.server}
                                      </p>
                                    </div>
                                    <span className={`adm-status ${acc.status === 'connected' ? 'adm-status-on' : 'adm-status-off'}`} style={{ fontSize: '10px' }}>
                                      {acc.status === 'connected' ? 'Connected' : 'Offline'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                    <div>
                                      <span style={{ display: 'block', fontSize: '9px', color: 'var(--subtext)', textTransform: 'uppercase' }}>Balance</span>
                                      <span className="adm-mono" style={{ fontSize: '12px', fontWeight: 'bold' }}>${(acc.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div>
                                      <span style={{ display: 'block', fontSize: '9px', color: 'var(--subtext)', textTransform: 'uppercase' }}>P&L</span>
                                      <span className={`adm-mono adm-pnl ${(acc.pnl || 0) >= 0 ? 'adm-pnl-pos' : 'adm-pnl-neg'}`} style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                        {(acc.pnl || 0) >= 0 ? '+' : ''}${(acc.pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div>
                                      <span style={{ display: 'block', fontSize: '9px', color: 'var(--subtext)', textTransform: 'uppercase' }}>Trades</span>
                                      <span className="adm-mono" style={{ fontSize: '12px', fontWeight: 'bold' }}>{acc.trade_count || 0}</span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {drawerTab === 'session' && (
                          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {drawerLoading ? (
                              <div className="text-center py-10" style={{ color: 'var(--subtext)' }}>
                                Loading session info...
                              </div>
                            ) : !selectedUserSession ? (
                              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--subtext)', border: '1px dashed var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                                <Globe style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.4 }} />
                                <p style={{ margin: 0, fontSize: '13px' }}>No session data available yet</p>
                                <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.6 }}>Session data is captured when the user visits the platform</p>
                              </div>
                            ) : (
                              <>
                                {/* Last Seen */}
                                {selectedUserSession.lastSeen && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,163,127,0.06)', border: '1px solid rgba(16,163,127,0.15)' }}>
                                    <Clock style={{ width: 14, height: 14, color: '#10a37f', flexShrink: 0 }} />
                                    <span style={{ fontSize: '12px', color: '#10a37f', fontWeight: 600 }}>
                                      Last seen {new Date(selectedUserSession.lastSeen).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                )}

                                {/* IP & Location */}
                                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--subtext)', background: 'rgba(255,255,255,0.02)' }}>
                                    <Globe style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                                    Network & Location
                                  </div>
                                  <div className="adm-drawer-fields" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                                    <div className="adm-drawer-field">
                                      <span>IP Address</span>
                                      <span className="adm-mono" style={{ fontWeight: 600 }}>{selectedUserSession.ip || '—'}</span>
                                    </div>
                                    <div className="adm-drawer-field">
                                      <span><MapPin style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Location</span>
                                      <span style={{ fontWeight: 600 }}>{selectedUserSession.location || '—'}</span>
                                    </div>
                                    <div className="adm-drawer-field">
                                      <span>Country</span>
                                      <span style={{ fontWeight: 600 }}>{selectedUserSession.country || '—'}</span>
                                    </div>
                                    <div className="adm-drawer-field">
                                      <span>Timezone</span>
                                      <span style={{ fontWeight: 600 }}>{selectedUserSession.timezone || '—'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Device Info */}
                                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--subtext)', background: 'rgba(255,255,255,0.02)' }}>
                                    <Monitor style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                                    Device & Browser
                                  </div>
                                  <div className="adm-drawer-fields" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                                    <div className="adm-drawer-field">
                                      <span>Operating System</span>
                                      <span style={{ fontWeight: 600 }}>{selectedUserSession.os || '—'}</span>
                                    </div>
                                    <div className="adm-drawer-field">
                                      <span>Browser</span>
                                      <span style={{ fontWeight: 600 }}>{selectedUserSession.browser || '—'}</span>
                                    </div>
                                    <div className="adm-drawer-field">
                                      <span>Device Type</span>
                                      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {selectedUserSession.device === 'Mobile' && <Smartphone style={{ width: 13, height: 13 }} />}
                                        {selectedUserSession.device === 'Desktop' && <Monitor style={{ width: 13, height: 13 }} />}
                                        {selectedUserSession.device === 'Tablet' && <Monitor style={{ width: 13, height: 13 }} />}
                                        {selectedUserSession.device || '—'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {drawerTab === 'metrics' && (
                          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {drawerLoading ? (
                              <div className="text-center py-10" style={{ color: 'var(--subtext)' }}>
                                Loading metrics...
                              </div>
                            ) : (
                              (() => {
                                const totalTrades = selectedUserTrades.length;
                                const closedTrades = selectedUserTrades.filter(t => t.status === 'closed' || t.close_price);
                                const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
                                const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
                                const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
                                const totalPnl = selectedUserTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
                                const avgVolume = totalTrades > 0 ? selectedUserTrades.reduce((acc, t) => acc + Number(t.volume || 0), 0) / totalTrades : 0;

                                const grossProfit = winningTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
                                const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + (t.pnl || 0), 0));
                                const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

                                return (
                                  <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
                                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--subtext)', textTransform: 'uppercase' }}>Total Trades</span>
                                        <span className="adm-mono" style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalTrades}</span>
                                      </div>
                                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
                                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--subtext)', textTransform: 'uppercase' }}>Win Rate</span>
                                        <span className="adm-mono text-green-500" style={{ fontSize: '20px', fontWeight: 'bold' }}>{winRate.toFixed(1)}%</span>
                                      </div>
                                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
                                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--subtext)', textTransform: 'uppercase' }}>Cumulative P&L</span>
                                        <span className={`adm-mono ${(totalPnl >= 0 ? 'adm-pnl-pos' : 'adm-pnl-neg')}`} style={{ fontSize: '20px', fontWeight: 'bold' }}>
                                          {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
                                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--subtext)', textTransform: 'uppercase' }}>Profit Factor</span>
                                        <span className="adm-mono" style={{ fontSize: '20px', fontWeight: 'bold' }}>{profitFactor.toFixed(2)}</span>
                                      </div>
                                    </div>

                                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                        <span style={{ color: 'var(--subtext)' }}>Avg. Trade Size</span>
                                        <span className="adm-mono font-bold">{avgVolume.toFixed(2)} Lots</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                        <span style={{ color: 'var(--subtext)' }}>Winning Trades</span>
                                        <span className="adm-mono font-bold text-green-500">{winningTrades.length}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                        <span style={{ color: 'var(--subtext)' }}>Losing Trades</span>
                                        <span className="adm-mono font-bold text-red-500">{losingTrades.length}</span>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()
                            )}
                          </div>
                        )}
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
                                try {
                                  setTestingProvider(p.id);
                                  const res = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brokerProvider: { action: 'test', data: { id: p.id } } }) });
                                  const result = await res.json();
                                  setBrokerProviders(brokerProviders.map(x => x.id === p.id ? { ...x, status: result.status || 'error', error_message: result.error || null } : x));
                                } catch (err: any) {
                                  alert('Test connection failed: ' + (err.message || 'Unknown error'));
                                } finally {
                                  setTestingProvider(null);
                                }
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

              {/* ── Partner Brokers ── */}
              <div className="adm-card adm-card-full">
                <div className="adm-card-head">
                  <h3><Handshake style={{width:16,height:16,marginRight:6,verticalAlign:'middle'}}/>Partner Brokers <span className="adm-count-badge">{partnerBrokers.length}</span></h3>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:11,color:'var(--subtext)'}}>Shown in Connect Broker modal</span>
                    <button className="adm-post-btn" onClick={() => { setPartnerForm({...EMPTY_PARTNER, id: generateUUID(), created_at: new Date().toISOString()}); setEditingPartner(null); setShowAddPartner(true); setBrokerSearchQuery(''); setBrokerSearchResults([]); setCustomServerInput(''); }}>+ Add Partner</button>
                  </div>
                </div>
                <div className="adm-card-body">
                  {partnerBrokers.length === 0 ? (
                    <div className="adm-empty-state">
                      <Handshake className="adm-empty-icon" />
                      <p>No partner brokers configured</p>
                      <p style={{fontSize:12,color:'var(--subtext)'}}>Add brokers you have partnerships with — users will see these first when connecting</p>
                    </div>
                  ) : (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,300px),1fr))',gap:14}}>
                      {partnerBrokers.map((p: any) => (
                        <div key={p.id} style={{border:'1px solid var(--border)',borderRadius:14,padding:16,background:'var(--input-bg)',opacity:p.is_active?1:0.55,transition:'opacity 0.2s'}}>
                          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <div style={{fontSize:28,lineHeight:1}}>{p.logo || '🏦'}</div>
                              <div>
                                <p style={{margin:0,fontSize:14,fontWeight:700,color:'var(--text)'}}>{p.name}</p>
                                <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',padding:'2px 7px',borderRadius:20,background:'#3b82f620',color:'#3b82f6'}}>{p.platform?.toUpperCase()}</span>
                              </div>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              {/* Active toggle */}
                              <button onClick={async () => { const updated = partnerBrokers.map((x:any) => x.id === p.id ? {...x, is_active: !x.is_active} : x); await savePartnerBrokers(updated); }}
                                style={{width:36,height:20,borderRadius:10,border:'none',cursor:'pointer',background:p.is_active?'#10b981':'var(--border)',position:'relative',transition:'background 0.2s'}}>
                                <span style={{position:'absolute',top:2,left:p.is_active?18:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
                              </button>
                              <button onClick={() => { setPartnerForm({...p, servers: p.servers ? [...p.servers] : []}); setEditingPartner(p.id); setShowAddPartner(true); setBrokerSearchQuery(''); setBrokerSearchResults([]); setCustomServerInput(''); }}
                                style={{background:'none',border:'none',cursor:'pointer',color:'var(--subtext)',padding:4}}>
                                <Pencil style={{width:14,height:14}}/>
                              </button>
                              <button onClick={async () => { if (!confirm(`Delete "${p.name}"?`)) return; await savePartnerBrokers(partnerBrokers.filter((x:any) => x.id !== p.id)); }}
                                style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',padding:4}}>
                                <Trash2 style={{width:14,height:14}}/>
                              </button>
                            </div>
                          </div>
                          {/* Rebate badge */}
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                            <span style={{fontSize:11,fontWeight:700,color:'#10b981',background:'rgba(16,185,129,0.1)',padding:'3px 10px',borderRadius:20}}>
                              💰 ${p.rebate_per_lot}/lot rebate
                            </span>
                            {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#4f8ef7',textDecoration:'none'}}>Visit ↗</a>}
                          </div>
                          {/* Servers list */}
                          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                            {(p.servers||[]).slice(0,4).map((s:string) => (
                              <span key={s} style={{fontSize:10,fontFamily:'monospace',background:'var(--sidebar-bg)',border:'1px solid var(--border)',padding:'2px 8px',borderRadius:6,color:'var(--text)'}}>{s}</span>
                            ))}
                            {(p.servers||[]).length > 4 && <span style={{fontSize:10,color:'var(--subtext)'}}>+{p.servers.length - 4} more</span>}
                          </div>
                          {p.notes && <p style={{margin:'8px 0 0',fontSize:11,color:'var(--subtext)'}}>{p.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add/Edit Partner Broker Modal */}
              {showAddPartner && (
                <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={() => { setShowAddPartner(false); setBrokerSearchQuery(''); setBrokerSearchResults([]); setCustomServerInput(''); setVerifyStatus(null); setVerifyError(''); }}>
                  <div style={{background:'var(--sidebar-bg)',border:'1px solid var(--border)',borderRadius:18,padding:28,width:'100%',maxWidth:540,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                      <h3 style={{margin:0,fontSize:16,fontWeight:700}}>{editingPartner ? 'Edit Partner Broker' : 'Add Partner Broker'}</h3>
                      <button onClick={() => { setShowAddPartner(false); setBrokerSearchQuery(''); setBrokerSearchResults([]); setCustomServerInput(''); }} style={{background:'none',border:'none',cursor:'pointer',color:'var(--subtext)'}}><X style={{width:18,height:18}}/></button>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:14}}>
                      {/* Logo + Name row */}
                      <div className="adm-form-row">
                        <div style={{flexShrink:0}}>
                          <label style={{fontSize:11,fontWeight:600,color:'var(--subtext)',display:'block',marginBottom:5}}>Logo (emoji)</label>
                          <input value={partnerForm.logo} onChange={e=>setPartnerForm((f:any)=>({...f,logo:e.target.value}))}
                            style={{width:60,textAlign:'center',fontSize:22,background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:9,padding:'6px 8px',color:'var(--text)'}}/>
                        </div>
                        <div style={{flex:1}}>
                          <label style={{fontSize:11,fontWeight:600,color:'var(--subtext)',display:'block',marginBottom:5}}>Broker Name *</label>
                          <input value={partnerForm.name} onChange={e=>setPartnerForm((f:any)=>({...f,name:e.target.value}))} placeholder="e.g. ICMarkets"
                            style={{width:'100%',boxSizing:'border-box',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:9,padding:'9px 12px',fontSize:13,color:'var(--text)'}}/>
                        </div>
                      </div>

                      {/* Servers Search & Selector */}
                      <div style={{border:'1px solid var(--border)',borderRadius:12,padding:14,background:'rgba(0,0,0,0.1)'}}>
                        <label style={{fontSize:11,fontWeight:600,color:'var(--subtext)',display:'block',marginBottom:6}}>Search MT5 Farm Broker Servers</label>
                        <div ref={adminSearchRef} style={{position:'relative', marginBottom:8}}>
                          <div style={{display:'flex',gap:8}}>
                            <input
                              type="text"
                              placeholder="Type to search (e.g. ICMarkets, Pepperstone)"
                              value={brokerSearchQuery}
                              onChange={e => {
                                setBrokerSearchQuery(e.target.value);
                                setShowAdminServerDropdown(true);
                              }}
                              onFocus={() => setShowAdminServerDropdown(true)}
                              style={{flex:1,background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:9,padding:'8px 12px',fontSize:13,color:'var(--text)',outline:'none'}}
                            />
                            {searchingServers && <Loader2 style={{width:16,height:16,alignSelf:'center'}} className="adm-spin"/>}
                          </div>

                          {/* Search Results Dropdown */}
                          {showAdminServerDropdown && brokerSearchResults.length > 0 && (
                            <div style={{
                              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                              background: 'var(--sidebar-bg)', border: '1px solid var(--border)',
                              borderRadius: 9, marginTop: 4, maxHeight: 180, overflowY: 'auto',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            }}>
                              {brokerSearchResults.map(srv => {
                                const isSelected = partnerForm.servers?.includes(srv);
                                return (
                                  <div
                                    key={srv}
                                    onClick={() => {
                                      const current = partnerForm.servers || [];
                                      const next = isSelected ? current.filter((x: string) => x !== srv) : [...current, srv];
                                      setPartnerForm((f: any) => ({ ...f, servers: next }));
                                    }}
                                    style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      padding: '8px 12px', cursor: 'pointer',
                                      borderBottom: '1px solid var(--border)',
                                      background: isSelected ? 'rgba(16,185,129,0.06)' : 'transparent',
                                      transition: 'background 0.12s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = isSelected ? 'rgba(16,185,129,0.1)' : 'var(--input-bg)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = isSelected ? 'rgba(16,185,129,0.06)' : 'transparent')}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <Server style={{ width: 12, height: 12, color: isSelected ? '#10b981' : 'var(--subtext)', flexShrink: 0 }} />
                                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: isSelected ? '#10b981' : 'var(--text)' }}>{srv}</span>
                                    </div>
                                    {isSelected && <span style={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}>✓</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Selected Servers list */}
                        <label style={{fontSize:11,fontWeight:600,color:'var(--subtext)',display:'block',marginBottom:6}}>Selected Servers (shown to users)</label>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6,minHeight:40,padding:10,border:'1px solid var(--border)',borderRadius:9,background:'var(--input-bg)',marginBottom:10}}>
                          {(partnerForm.servers || []).length === 0 ? (
                            <span style={{fontSize:11,color:'var(--subtext)',fontStyle:'italic'}}>No servers selected. Search above or add manually below.</span>
                          ) : (
                            partnerForm.servers.map((srv: string) => (
                              <span
                                key={srv}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '2px 6px',
                                  borderRadius: 6,
                                  background: 'rgba(59,130,246,0.1)',
                                  color: '#3b82f6',
                                  fontSize: 11,
                                  fontFamily: 'monospace',
                                  border: '1px solid rgba(59,130,246,0.2)'
                                }}
                              >
                                {srv}
                                <button
                                  type="button"
                                  onClick={() => setPartnerForm((f: any) => ({ ...f, servers: (f.servers || []).filter((x: string) => x !== srv) }))}
                                  style={{background:'none',border:'none',color:'#3b82f6',cursor:'pointer',fontSize:10,padding:0,lineHeight:1}}
                                >
                                  ✕
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        {/* Add custom manually — with server verification */}
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          <div style={{display:'flex',gap:8}}>
                            <input
                              type="text"
                              placeholder="Add server manually (e.g. ICMarketsSC-Live9)"
                              value={customServerInput}
                              onChange={e => {
                                setCustomServerInput(e.target.value);
                                setVerifyStatus(null);
                                setVerifyError('');
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') e.preventDefault();
                              }}
                              style={{flex:1,background:'var(--input-bg)',border:`1px solid ${verifyStatus === 'ok' ? '#10b981' : verifyStatus === 'fail' ? '#f59e0b' : 'var(--border)'}`,borderRadius:9,padding:'6px 10px',fontSize:12,color:'var(--text)',fontFamily:'monospace',transition:'border-color 0.2s'}}
                            />
                            {/* Verify button — becomes Add once verified */}
                            {verifyStatus !== 'ok' ? (
                              <button
                                type="button"
                                disabled={!customServerInput.trim() || verifyStatus === 'checking'}
                                onClick={async () => {
                                  const val = customServerInput.trim();
                                  if (!val) return;
                                  setVerifyStatus('checking');
                                  setVerifyError('');
                                  try {
                                    const r = await fetch('/api/broker/verify-server', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ server: val }),
                                    });
                                    const d = await r.json();
                                    if (d.reachable) {
                                      setVerifyStatus('ok');
                                      setVerifyError('');
                                      setVerifyNote('');
                                    } else {
                                      setVerifyStatus('fail');
                                      setVerifyError(d.error || 'Not found in MT5 registry');
                                      setVerifyNote(d.note || 'MT5 may still accept this server name — try adding it anyway.');
                                    }
                                  } catch {
                                    setVerifyStatus('fail');
                                    setVerifyError('Verification request failed');
                                  }
                                }}
                                style={{padding:'6px 14px',background: verifyStatus === 'checking' ? 'var(--border)' : '#3b82f6',border:'none',borderRadius:9,color:'#fff',fontSize:12,fontWeight:600,cursor: verifyStatus === 'checking' ? 'not-allowed' : 'pointer',whiteSpace:'nowrap',minWidth:80,display:'flex',alignItems:'center',gap:5,transition:'background 0.2s'}}
                              >
                                {verifyStatus === 'checking' ? (
                                  <><svg style={{width:12,height:12,animation:'spin 1s linear infinite'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg> Checking...</>
                                ) : 'Verify'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const val = customServerInput.trim();
                                  if (!val) return;
                                  if (partnerForm.servers?.includes(val)) {
                                    alert('Server already added.');
                                    return;
                                  }
                                  setPartnerForm((f: any) => ({ ...f, servers: [...(f.servers || []), val] }));
                                  setCustomServerInput('');
                                  setVerifyStatus(null);
                                  setVerifyError('');
                                }}
                                style={{padding:'6px 14px',background:'#10b981',border:'none',borderRadius:9,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',minWidth:80,display:'flex',alignItems:'center',gap:5}}
                              >
                                ✓ Add
                              </button>
                            )}
                          </div>
                          {/* Status feedback */}
                          {verifyStatus === 'ok' && (
                            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#10b981',fontWeight:600}}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:12,height:12}}><polyline points="20 6 9 17 4 12"/></svg>
                              Server verified — click ✓ Add to confirm
                            </div>
                          )}
                          {verifyStatus === 'fail' && (
                            <div style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:9,padding:'10px 12px',display:'flex',flexDirection:'column',gap:6}}>
                              <div style={{display:'flex',alignItems:'center',gap:5}}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{width:13,height:13,flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                <span style={{fontSize:12,fontWeight:700,color:'#f59e0b'}}>Not found in MT5 registry</span>
                              </div>
                              <p style={{margin:0,fontSize:11,color:'var(--subtext)',lineHeight:1.45,paddingLeft:18}}>{verifyNote}</p>
                              <div style={{paddingLeft:18}}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = customServerInput.trim();
                                    if (!val) return;
                                    if (partnerForm.servers?.includes(val)) { alert('Server already added.'); return; }
                                    setPartnerForm((f: any) => ({ ...f, servers: [...(f.servers || []), val] }));
                                    setCustomServerInput('');
                                    setVerifyStatus(null);
                                    setVerifyError('');
                                    setVerifyNote('');
                                  }}
                                  style={{padding:'5px 14px',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:7,color:'#f59e0b',fontSize:12,fontWeight:700,cursor:'pointer'}}
                                >
                                  + Add anyway
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rebate */}
                      <div className="adm-form-row">
                        <div style={{flex:1}}>
                          <label style={{fontSize:11,fontWeight:600,color:'var(--subtext)',display:'block',marginBottom:5}}>Rebate per Lot ($)</label>
                          <input type="number" min={0} step={0.01} value={partnerForm.rebate_per_lot}
                            onChange={e=>setPartnerForm((f:any)=>({...f,rebate_per_lot:parseFloat(e.target.value)||0}))}
                            style={{width:'100%',boxSizing:'border-box',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:9,padding:'9px 12px',fontSize:13,color:'var(--text)'}}/>
                        </div>
                        <div style={{flex:1}}>
                          <label style={{fontSize:11,fontWeight:600,color:'var(--subtext)',display:'block',marginBottom:5}}>Website URL</label>
                          <input value={partnerForm.website} onChange={e=>setPartnerForm((f:any)=>({...f,website:e.target.value}))} placeholder="https://icmarkets.com"
                            style={{width:'100%',boxSizing:'border-box',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:9,padding:'9px 12px',fontSize:13,color:'var(--text)'}}/>
                        </div>
                      </div>
                      {/* Notes */}
                      <div>
                        <label style={{fontSize:11,fontWeight:600,color:'var(--subtext)',display:'block',marginBottom:5}}>Internal Notes</label>
                        <input value={partnerForm.notes} onChange={e=>setPartnerForm((f:any)=>({...f,notes:e.target.value}))} placeholder="e.g. 20% rebate share, contact: partner@broker.com"
                          style={{width:'100%',boxSizing:'border-box',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:9,padding:'9px 12px',fontSize:13,color:'var(--text)'}}/>
                      </div>
                      {/* Active toggle */}
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderTop:'1px solid var(--border)'}}>
                        <div>
                          <p style={{margin:0,fontSize:13,fontWeight:600,color:'var(--text)'}}>Show to users</p>
                          <p style={{margin:0,fontSize:11,color:'var(--subtext)'}}>Partner appears in Connect Broker modal</p>
                        </div>
                        <button onClick={()=>setPartnerForm((f:any)=>({...f,is_active:!f.is_active}))}
                          style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',background:partnerForm.is_active?'#10b981':'var(--border)',position:'relative',transition:'background 0.2s'}}>
                          <span style={{position:'absolute',top:2,left:partnerForm.is_active?22:2,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
                        </button>
                      </div>
                      {/* Save */}
                      <button
                        disabled={!partnerForm.name || partnerSaving}
                        onClick={async () => {
                          if (!partnerForm.name) return;
                          const updated = editingPartner
                            ? partnerBrokers.map((x:any) => x.id === editingPartner ? partnerForm : x)
                            : [...partnerBrokers, partnerForm];
                          await savePartnerBrokers(updated);
                          setShowAddPartner(false);
                          setBrokerSearchQuery('');
                          setBrokerSearchResults([]);
                          setCustomServerInput('');
                        }}
                        style={{padding:'12px',borderRadius:10,border:'none',cursor:'pointer',background:'#4f8ef7',color:'#fff',fontSize:14,fontWeight:700,opacity:partnerSaving||!partnerForm.name?0.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                        {partnerSaving ? <><Loader2 style={{width:14,height:14}} className="adm-spin"/>Saving...</> : <><CheckCircle style={{width:14,height:14}}/>{editingPartner ? 'Update Partner' : 'Add Partner'}</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}

          {activeSection === 'accounts' && (
            <div className="adm-card adm-card-full">
              <div className="adm-card-head">
                <h3><Database style={{width:16,height:16,marginRight:6,verticalAlign:'middle'}} />Connected Accounts ({brokers.length})</h3>
              </div>
              {brokers.length === 0 ? (
                <div className="adm-empty-state"><Server className="adm-empty-icon" /><p>No broker accounts connected yet</p></div>
              ) : (
                <div className="adm-table-wrap"><table className="adm-table"><thead><tr>
                  <th>Broker</th><th>Login</th><th>Server</th><th>Balance</th><th>P&L</th><th style={{textAlign:'center'}}>Trades</th><th>Status</th><th>Connected</th>
                </tr></thead><tbody>
                  {brokers.map(b => (
                    <tr key={b.id}>
                      <td><span className="adm-broker-name">{b.broker_name || 'MT5'}</span></td>
                      <td className="adm-mono">{b.mt5_login || b.account_id || '—'}</td>
                      <td className="adm-date-cell">{b.server || '—'}</td>
                      <td className="adm-mono">${(b.balance || 0).toLocaleString()}</td>
                      <td className={`adm-mono adm-pnl ${(b.pnl || 0) >= 0 ? 'adm-pnl-pos' : 'adm-pnl-neg'}`}>
                        {(b.pnl || 0) >= 0 ? '+' : ''}${(b.pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="adm-mono" style={{textAlign:'center'}}>{b.trade_count || 0}</td>
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
                <h3>Trade Log ({filteredTrades.length}{filteredTrades.length !== trades.length ? ` of ${trades.length}` : ''})</h3>
                <button className="adm-export-btn" onClick={() => {
                  const csv = 'User,Symbol,Type,Volume,Open,Close,SL,TP,P&L,Status,Order,Date\n' + filteredTrades.map(t => {
                    const u = users.find(x => x.id === t.user_id);
                    return `"${u?.full_name || u?.email || ''}",${t.symbol},${t.action},${t.volume},${t.entry_price},${t.close_price || ''},${t.stop_loss || ''},${t.take_profit || ''},${t.pnl || 0},${t.status},${t.order_id || ''},${t.created_at}`;
                  }).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'trades.csv'; a.click();
                }}><Download /> Export CSV</button>
              </div>

              {/* Search & Filter Bar */}
              <div style={{
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
              }}>
                {/* Search input */}
                <div style={{
                  flex: '1 1 200px', position: 'relative', minWidth: 180,
                }}>
                  <Search style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 14, height: 14, color: 'var(--subtext)', pointerEvents: 'none',
                  }} />
                  <input
                    type="text"
                    placeholder="Search symbol, type..."
                    value={tradeSearch}
                    onChange={e => setTradeSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--input-bg)',
                      fontSize: 12, color: 'var(--text)', outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Status filter */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['all', 'open', 'closed'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setTradeStatusFilter(s)}
                      style={{
                        padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)',
                        background: tradeStatusFilter === s
                          ? s === 'open' ? 'rgba(59,130,246,0.12)'
                          : s === 'closed' ? 'rgba(16,163,127,0.12)'
                          : 'rgba(139,92,246,0.12)'
                          : 'transparent',
                        color: tradeStatusFilter === s
                          ? s === 'open' ? '#3b82f6' : s === 'closed' ? '#10a37f' : '#8b5cf6'
                          : 'var(--subtext)',
                        fontSize: 11, fontWeight: tradeStatusFilter === s ? 700 : 500,
                        cursor: 'pointer', fontFamily: 'inherit',
                        borderColor: tradeStatusFilter === s
                          ? s === 'open' ? 'rgba(59,130,246,0.3)'
                          : s === 'closed' ? 'rgba(16,163,127,0.3)'
                          : 'rgba(139,92,246,0.3)'
                          : 'var(--border)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {s === 'all' ? 'All' : s === 'open' ? '● Open' : '● Closed'}
                    </button>
                  ))}
                </div>

                {/* Date range */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar style={{ width: 13, height: 13, color: 'var(--subtext)', flexShrink: 0 }} />
                  <input
                    type="date"
                    value={tradeDateFrom}
                    onChange={e => setTradeDateFrom(e.target.value)}
                    style={{
                      padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)',
                      background: 'var(--input-bg)', fontSize: 11, color: 'var(--text)',
                      fontFamily: 'inherit', outline: 'none', minWidth: 120,
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--subtext)' }}>→</span>
                  <input
                    type="date"
                    value={tradeDateTo}
                    onChange={e => setTradeDateTo(e.target.value)}
                    style={{
                      padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)',
                      background: 'var(--input-bg)', fontSize: 11, color: 'var(--text)',
                      fontFamily: 'inherit', outline: 'none', minWidth: 120,
                    }}
                  />
                </div>

                {/* Clear filters */}
                {(tradeSearch || tradeDateFrom || tradeDateTo || tradeStatusFilter !== 'all') && (
                  <button
                    onClick={() => { setTradeSearch(''); setTradeDateFrom(''); setTradeDateTo(''); setTradeStatusFilter('all'); }}
                    style={{
                      padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)',
                      background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 11,
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    ✕ Clear
                  </button>
                )}
              </div>

              {filteredTrades.length === 0 ? (
                <div className="adm-empty-state"><Receipt className="adm-empty-icon" /><p>{trades.length === 0 ? 'No trades recorded yet' : 'No trades match your filters'}</p></div>
              ) : (
                <div className="adm-table-wrap"><table className="adm-table"><thead><tr>
                  <th>User</th><th>Symbol</th><th>Type</th><th>Volume</th><th>Open</th><th>Close</th><th>SL</th><th>TP</th><th>P&L</th><th>Status</th><th>Order</th><th>Date</th>
                </tr></thead><tbody>
                  {filteredTrades.map(t => {
                    const tradeUser = users.find(u => u.id === t.user_id);
                    const userName = tradeUser?.full_name || tradeUser?.email?.split('@')[0] || '—';
                    return (
                    <tr key={t.id}>
                      <td><span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }} title={tradeUser?.email || ''}>{userName}</span></td>
                      <td><span className="adm-symbol">{t.symbol}</span></td>
                      <td><span className={`adm-trade-type ${String(t.action).toLowerCase() === 'buy' ? 'adm-buy' : 'adm-sell'}`}>{(t.action || '').toUpperCase()}</span></td>
                      <td>{Number(t.volume || 0).toFixed(2)}</td>
                      <td className="adm-mono">${Number(t.entry_price || 0).toFixed(2)}</td>
                      <td className="adm-mono">{t.close_price ? `$${Number(t.close_price).toFixed(2)}` : '—'}</td>
                      <td className="adm-mono" style={{ fontSize: 11, color: t.stop_loss ? '#ef4444' : 'var(--subtext)' }}>{t.stop_loss ? `$${Number(t.stop_loss).toFixed(2)}` : '—'}</td>
                      <td className="adm-mono" style={{ fontSize: 11, color: t.take_profit ? '#10b981' : 'var(--subtext)' }}>{t.take_profit ? `$${Number(t.take_profit).toFixed(2)}` : '—'}</td>
                      <td className={`adm-pnl ${(t.pnl || 0) >= 0 ? 'adm-pnl-pos' : 'adm-pnl-neg'}`}>{t.status === 'open' && !t.pnl ? '—' : `${(t.pnl || 0) >= 0 ? '+' : ''}${(t.pnl || 0).toFixed(2)}`}</td>
                      <td><span className={`adm-status ${t.status === 'open' ? 'adm-status-on' : 'adm-status-off'}`}>{t.status === 'open' ? 'Open' : 'Closed'}</span></td>
                      <td style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--subtext)' }}>{t.order_id || '—'}</td>
                      <td className="adm-date-cell">{t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    </tr>
                    );
                  })}
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

              {/* ── API Stats Panel ── */}
              {apiStats.length > 0 && (
                <div className="adm-card adm-card-full">
                  <div className="adm-card-head">
                    <h3><Wifi style={{width:15,height:15,marginRight:6,verticalAlign:'middle'}}/>API Integration Stats</h3>
                    <span style={{fontSize:11,color:'var(--subtext)'}}>Live · refreshes every 10s</span>
                  </div>
                  <div className="adm-card-body" style={{display:'flex',flexDirection:'column',gap:16}}>
                    {apiStats.map((s: any) => {
                      const callsPerMin = s.recentTimestamps?.length ?? 0;
                      const quotaUsePct = s.quotaPerMin ? Math.min((callsPerMin / s.quotaPerMin) * 100, 100) : null;
                      const statusColor = s.status === 'active' ? '#10b981' : s.status === 'error' ? '#ef4444' : s.status === 'unconfigured' ? '#f59e0b' : '#6b7280';
                      const statusLabel = s.status === 'active' ? 'Active' : s.status === 'error' ? 'Error' : s.status === 'unconfigured' ? 'Not Configured' : 'Idle';
                      return (
                        <div key={s.name} style={{display:'flex',alignItems:'flex-start',gap:16,padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
                          {/* Status dot */}
                          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:160}}>
                            <div style={{width:9,height:9,borderRadius:'50%',background:statusColor,boxShadow:`0 0 6px ${statusColor}`,flexShrink:0}} />
                            <div>
                              <p style={{margin:0,fontSize:13,fontWeight:600,color:'var(--text)'}}>{s.label}</p>
                              <span style={{fontSize:10,fontWeight:700,color:statusColor,textTransform:'uppercase',letterSpacing:'0.05em'}}>{statusLabel}</span>
                            </div>
                          </div>
                          {/* Stats */}
                          <div style={{flex:1,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                            <div style={{textAlign:'center'}}>
                              <p style={{margin:0,fontSize:18,fontWeight:700,color:'var(--text)',fontFamily:'monospace'}}>{s.totalCalls.toLocaleString()}</p>
                              <p style={{margin:0,fontSize:10,color:'var(--subtext)'}}>Total Calls</p>
                            </div>
                            <div style={{textAlign:'center'}}>
                              <p style={{margin:0,fontSize:18,fontWeight:700,color:'var(--text)',fontFamily:'monospace'}}>{callsPerMin}</p>
                              <p style={{margin:0,fontSize:10,color:'var(--subtext)'}}>Calls/Min{s.quotaPerMin ? ` (of ${s.quotaPerMin})` : ''}</p>
                            </div>
                            <div style={{textAlign:'center'}}>
                              <p style={{margin:0,fontSize:18,fontWeight:700,color:'var(--text)',fontFamily:'monospace'}}>{s.avgLatencyMs > 0 ? `${s.avgLatencyMs}ms` : '—'}</p>
                              <p style={{margin:0,fontSize:10,color:'var(--subtext)'}}>Avg Latency</p>
                            </div>
                            <div style={{textAlign:'center'}}>
                              <p style={{margin:0,fontSize:18,fontWeight:700,color:s.errorCalls > 0 ? '#ef4444' : 'var(--text)',fontFamily:'monospace'}}>{s.errorCalls}</p>
                              <p style={{margin:0,fontSize:10,color:'var(--subtext)'}}>Errors</p>
                            </div>
                          </div>
                          {/* Quota bar */}
                          {quotaUsePct !== null && (
                            <div style={{minWidth:120}}>
                              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                                <span style={{fontSize:10,color:'var(--subtext)'}}>Quota</span>
                                <span style={{fontSize:10,fontWeight:700,color:quotaUsePct > 90 ? '#ef4444' : quotaUsePct > 70 ? '#f59e0b' : '#10b981'}}>{quotaUsePct.toFixed(0)}%</span>
                              </div>
                              <div style={{height:6,background:'var(--input-bg)',borderRadius:3,overflow:'hidden'}}>
                                <div style={{height:'100%',borderRadius:3,transition:'width 0.5s',width:`${quotaUsePct}%`,background:quotaUsePct > 90 ? '#ef4444' : quotaUsePct > 70 ? '#f59e0b' : '#10b981'}} />
                              </div>
                              <p style={{margin:'4px 0 0',fontSize:10,color:'var(--subtext)'}}>{callsPerMin}/{s.quotaPerMin}/min</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {apiStats.some((s: any) => s.lastErrorMsg) && (
                      <div style={{marginTop:8,padding:'10px 14px',background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10}}>
                        <p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:'#ef4444'}}>Recent Errors</p>
                        {apiStats.filter((s: any) => s.lastErrorMsg).map((s: any) => (
                          <p key={s.name} style={{margin:'2px 0',fontSize:11,color:'var(--subtext)'}}><span style={{color:'#ef4444',fontWeight:600}}>{s.label}:</span> {s.lastErrorMsg}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeSection === 'settings' && (
            <AdminSettings
              initialConfig={config}
              initialAnnouncements={announcements}
              onRefresh={loadData}
              apiStats={apiStats}
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
                  <option value="metatrader">MetaTrader (MT5 Farm)</option>
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
              <input className="adm-edit-input" type="password" placeholder={newProvider.type === 'metatrader' ? 'MT5 Farm API Key' : 'API Key'} value={newProvider.api_key} onChange={e => setNewProvider({ ...newProvider, api_key: e.target.value })} />
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

          {/* ─── MT5 FARM SECTION ─────────────────────────────────────────── */}
          {activeSection === 'mt5farm' && (
            <>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 18px rgba(99,102,241,.35)' }}>
                    <Server size={20} color="white" />
                  </div>
                  <div>
                    <h2 style={{ fontSize:20, fontWeight:800, letterSpacing:-0.5, margin:0 }}>MT5 Farm Monitor</h2>
                    <p style={{ fontSize:12, color:'var(--subtext)', margin:0 }}>
                      {farmOrchestratorUrl} · {farmLastRefresh ? `Updated ${farmLastRefresh.toLocaleTimeString()}` : 'Not loaded'}
                    </p>
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button
                    onClick={() => setFarmAutoRefresh(v => !v)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:`1px solid ${farmAutoRefresh?'rgba(99,102,241,.4)':'rgba(255,255,255,.1)'}`, background:farmAutoRefresh?'rgba(99,102,241,.12)':'transparent', color:farmAutoRefresh?'#818cf8':'var(--subtext)', fontSize:12, fontWeight:600, cursor:'pointer' }}
                  >
                    <Wifi size={13} />{farmAutoRefresh ? 'Live On' : 'Live Off'}
                  </button>
                  <button
                    onClick={() => fetchFarmData(true)}
                    disabled={farmRefreshing}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', color:'var(--subtext)', fontSize:12, fontWeight:600, cursor:'pointer' }}
                  >
                    <RefreshCw size={13} style={{ animation: farmRefreshing ? 'adm-spin 0.7s linear infinite' : 'none' }} />Refresh
                  </button>
                  <button
                    onClick={runFarmConnectionTest}
                    disabled={farmTesting}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid rgba(34,197,94,.3)', background:'rgba(34,197,94,.08)', color:'#4ade80', fontSize:12, fontWeight:700, cursor:'pointer', opacity: farmTesting ? 0.7 : 1 }}
                  >
                    <Zap size={13} style={{ animation: farmTesting ? 'pulse 1s infinite' : 'none' }} />{farmTesting ? 'Testing…' : 'Test Connection'}
                  </button>
                </div>
              </div>

              {farmError && (
                <div style={{ padding:'10px 16px', borderRadius:10, marginBottom:16, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#fca5a5', fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
                  <AlertTriangle size={15} />{farmError}
                </div>
              )}

              {/* Connection Test Results */}
              {farmTestResult && (
                <div style={{ marginBottom:20, padding:'16px 20px', borderRadius:12, border:`1px solid ${farmTestResult.overall?'rgba(34,197,94,.3)':'rgba(239,68,68,.3)'}`, background:farmTestResult.overall?'rgba(34,197,94,.06)':'rgba(239,68,68,.06)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      {farmTestResult.overall
                        ? <CheckCircle size={18} color="#22c55e" />
                        : <XCircle size={18} color="#ef4444" />
                      }
                      <span style={{ fontWeight:700, fontSize:14, color: farmTestResult.overall?'#4ade80':'#f87171' }}>
                        {farmTestResult.overall ? 'Connection Healthy ✓' : 'Connection Issues Detected'}
                      </span>
                    </div>
                    <span style={{ fontSize:11, color:'var(--subtext)' }}>{farmTestResult.testedAt ? new Date(farmTestResult.testedAt).toLocaleTimeString() : ''}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                    {[{key:'orchestrator',label:'Orchestrator Health'},{key:'accounts',label:'Accounts API'},{key:'sidecar',label:'Sidecar Ping'}].map(({key,label}) => {
                      const r = farmTestResult.results?.[key];
                      if (!r) return null;
                      const isOk = r.ok === true;
                      const isNull = r.ok === null;
                      return (
                        <div key={key} style={{ padding:'12px 14px', borderRadius:8, background:'rgba(255,255,255,.04)', border:`1px solid ${isOk?'rgba(34,197,94,.2)':isNull?'rgba(245,158,11,.2)':'rgba(239,68,68,.2)'}` }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                            <span style={{ fontSize:11, fontWeight:600, color:'var(--subtext)', textTransform:'uppercase', letterSpacing:.5 }}>{label}</span>
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:isOk?'rgba(34,197,94,.15)':isNull?'rgba(245,158,11,.15)':'rgba(239,68,68,.15)', color:isOk?'#4ade80':isNull?'#fbbf24':'#f87171' }}>{isOk?'OK':isNull?'SKIP':'FAIL'}</span>
                          </div>
                          {r.latencyMs !== undefined && <div style={{ fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:2 }}>{r.latencyMs}<span style={{ fontSize:11, color:'var(--subtext)', fontWeight:400 }}>ms</span></div>}
                          <div style={{ fontSize:11, color:'var(--subtext)', marginTop:4 }}>
                            {key==='orchestrator' && r.ok && r.detail ? `${r.detail.active} active · ${r.detail.hibernated} hibernated · RAM ${r.detail.ram_pct}%` : ''}
                            {key==='accounts' && r.ok ? `${r.total} total · ${r.connected} connected` : ''}
                            {key==='sidecar' && r.ok ? `Login ${r.account} · ${r.currency} ${Number(r.balance||0).toLocaleString('en-US',{minimumFractionDigits:2})}` : ''}
                            {!r.ok && r.detail && typeof r.detail === 'string' ? r.detail : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {farmTestResult.error && <div style={{ marginTop:10, fontSize:12, color:'#f87171' }}>{farmTestResult.error}</div>}
                </div>
              )}

              {/* Farm Sub-tabs */}
              <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid rgba(255,255,255,.06)', paddingBottom:0, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                {(['overview','accounts','keys','stats'] as const).map(t => (
                  <button key={t} onClick={() => setFarmTab(t)} style={{ padding:'8px 16px', borderRadius:'8px 8px 0 0', border:'none', background:farmTab===t?'rgba(99,102,241,.1)':'transparent', color:farmTab===t?'#818cf8':'var(--subtext)', fontSize:12, fontWeight:600, cursor:'pointer', borderBottom:farmTab===t?'2px solid #6366f1':'2px solid transparent', marginBottom:-1, textTransform:'capitalize', flexShrink:0 }}>
                    {t === 'overview' ? '📊 Overview' : t === 'accounts' ? '🖥 Accounts' : t === 'keys' ? '🔑 API Keys' : '📈 Stats'}
                  </button>
                ))}
              </div>

              {/* OVERVIEW */}
              {farmTab === 'overview' && (
                <>
                  {/* KPI row */}
                  <div className="adm-kpi-row" style={{ marginBottom:20 }}>
                    {[
                      { label:'Total Accounts', val: farmHealth?.total_accounts ?? '—', icon:<Server size={18}/>, cls:'adm-kpi-purple' },
                      { label:'Active',         val: farmHealth?.active         ?? '—', icon:<CheckCircle size={18}/>, cls:'adm-kpi-green' },
                      { label:'Hibernated',     val: farmHealth?.hibernated     ?? '—', icon:<Moon size={18}/>, cls:'adm-kpi-blue' },
                      { label:'RAM Used',       val: farmHealth ? `${farmHealth.ram_used_gb} GB` : '—', icon:<MemoryStick size={18}/>, cls:'adm-kpi-amber' },
                    ].map(k => (
                      <div className="adm-kpi" key={k.label}>
                        <div className="adm-kpi-top"><div className={`adm-kpi-icon ${k.cls}`}>{k.icon}</div></div>
                        <p className="adm-kpi-val">{k.val}</p>
                        <p className="adm-kpi-label">{k.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* RAM bar */}
                  {farmHealth && (
                    <div className="adm-card" style={{ marginBottom:20 }}>
                      <div className="adm-card-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <h3 style={{ display:'flex', alignItems:'center', gap:8 }}><MemoryStick size={16}/>RAM Utilization</h3>
                        <span style={{ fontSize:13, fontWeight:700, padding:'3px 10px', borderRadius:6, background:parseFloat(farmHealth.ram_pct)>85?'rgba(239,68,68,.15)':parseFloat(farmHealth.ram_pct)>65?'rgba(245,158,11,.15)':'rgba(34,197,94,.15)', color:parseFloat(farmHealth.ram_pct)>85?'#f87171':parseFloat(farmHealth.ram_pct)>65?'#fbbf24':'#4ade80' }}>
                          {farmHealth.ram_pct}%
                        </span>
                      </div>
                      <div className="adm-card-body">
                        <div style={{ height:8, borderRadius:4, background:'rgba(255,255,255,.08)', overflow:'hidden', marginBottom:10 }}>
                          <div style={{ height:'100%', width:`${parseFloat(farmHealth.ram_pct)}%`, borderRadius:4, background:parseFloat(farmHealth.ram_pct)>85?'linear-gradient(90deg,#ef444480,#ef4444)':parseFloat(farmHealth.ram_pct)>65?'linear-gradient(90deg,#f59e0b80,#f59e0b)':'linear-gradient(90deg,#22c55e80,#22c55e)', transition:'width .6s' }} />
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--subtext)' }}>
                          <span>Used: {farmHealth.ram_used_gb} GB</span>
                          <span>Free: {farmHealth.ram_free_gb} GB</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="adm-grid-2">
                    <div className="adm-card">
                      <div className="adm-card-head"><h3 style={{display:'flex',alignItems:'center',gap:8}}><Server size={15}/>Account Status</h3></div>
                      <div className="adm-card-body">
                        {[{l:'Connected',c:farmAccounts.filter(a=>a.status==='connected').length,col:'#22c55e'},{l:'Hibernated',c:farmAccounts.filter(a=>a.status==='hibernated').length,col:'#64748b'},{l:'Starting',c:farmAccounts.filter(a=>a.status==='starting').length,col:'#f59e0b'},{l:'Error',c:farmAccounts.filter(a=>a.status==='timeout').length,col:'#ef4444'}].map(({l,c,col})=>(
                          <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:8, height:8, borderRadius:'50%', background:col, boxShadow:`0 0 6px ${col}` }} />
                              <span style={{ fontSize:13, color:'var(--subtext)' }}>{l}</span>
                            </div>
                            <span style={{ fontWeight:700, color:col }}>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {farmStats && (
                      <div className="adm-card">
                        <div className="adm-card-head"><h3 style={{display:'flex',alignItems:'center',gap:8}}><Activity size={15}/>Last 100 Requests</h3></div>
                        <div className="adm-card-body">
                          {[{l:'Success',v:farmStats.recent_100_requests.success,col:'#22c55e'},{l:'Auth Errors',v:farmStats.recent_100_requests.auth_errors,col:'#ef4444'},{l:'Rate Limited',v:farmStats.recent_100_requests.rate_limited,col:'#f59e0b'}].map(({l,v,col})=>(
                            <div key={l} style={{ marginBottom:14 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}><span style={{ fontSize:13, color:'var(--subtext)' }}>{l}</span><span style={{ fontWeight:700, color:col, fontSize:13 }}>{v}</span></div>
                              <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,.06)' }}><div style={{ height:'100%', borderRadius:2, background:col, width:`${v}%`, transition:'width .6s' }} /></div>
                            </div>
                          ))}
                          <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', justifyContent:'space-between' }}>
                            <span style={{ color:'var(--subtext)', fontSize:12 }}>All-time requests</span>
                            <span style={{ fontWeight:700, color:'#818cf8' }}>{farmStats.requests.total_all_time.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ACCOUNTS */}
              {farmTab === 'accounts' && (
                <div className="adm-card">
                  <div className="adm-card-head" style={{ display:'flex', justifyContent:'space-between' }}>
                    <h3>{farmAccounts.length} Registered Farm Accounts</h3>
                    <span style={{ fontSize:12, color:'var(--subtext)' }}>{farmAccounts.filter(a=>a.status==='connected').length} active · {farmAccounts.filter(a=>a.status==='hibernated').length} hibernated</span>
                  </div>
                  <div style={{ maxHeight:520, overflowY:'auto', overflowX:'hidden' }}>
                    {farmAccounts.length === 0 ? (
                      <div style={{ padding:48, textAlign:'center', color:'var(--subtext)' }}><Server size={36} style={{ margin:'0 auto 12px', opacity:.3, display:'block' }} />No farm accounts registered yet</div>
                    ) : farmAccounts.map((acc: any) => (
                      <div key={acc.accountId} style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.04)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:14, minWidth:0, flex:1 }}>
                          <div style={{ width:34, height:34, borderRadius:8, background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <Server size={15} color="#818cf8" />
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{acc.name || acc.label || `Account ${acc.login}`}</div>
                            <div style={{ fontSize:11, color:'var(--subtext)', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Login: {acc.login} · {acc.server}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
                          {acc.balance !== null && <div style={{ textAlign:'right' }}><div style={{ fontWeight:700, fontSize:14 }}>{acc.currency} {Number(acc.balance||0).toLocaleString('en-US',{minimumFractionDigits:2})}</div><div style={{ fontSize:11, color:'var(--subtext)' }}>balance</div></div>}
                          <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:acc.status==='connected'?'rgba(34,197,94,.12)':acc.status==='hibernated'?'rgba(100,116,139,.12)':acc.status==='starting'?'rgba(245,158,11,.12)':'rgba(239,68,68,.12)', color:acc.status==='connected'?'#22c55e':acc.status==='hibernated'?'#94a3b8':acc.status==='starting'?'#f59e0b':'#ef4444' }}>{acc.status}</span>
                          <div style={{ display:'flex', gap:6 }}>
                            {acc.status==='connected' && <button onClick={() => farmAccountAction(acc.accountId,'hibernate')} disabled={!!farmActionLoading} title="Hibernate" style={{ padding:'5px 8px', borderRadius:6, border:'1px solid rgba(255,255,255,.1)', background:'transparent', color:'var(--subtext)', cursor:'pointer' }}><Moon size={13}/></button>}
                            {acc.status==='hibernated' && <button onClick={() => farmAccountAction(acc.accountId,'wake')} disabled={!!farmActionLoading} title="Wake" style={{ padding:'5px 8px', borderRadius:6, border:'1px solid rgba(34,197,94,.3)', background:'rgba(34,197,94,.1)', color:'#22c55e', cursor:'pointer' }}><Sun size={13}/></button>}
                            <button onClick={() => farmAccountAction(acc.accountId,'disconnect')} disabled={!!farmActionLoading} title="Disconnect" style={{ padding:'5px 8px', borderRadius:6, border:'1px solid rgba(239,68,68,.25)', background:'transparent', color:'#ef4444', cursor:'pointer' }}><Power size={13}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* API KEYS */}
              {farmTab === 'keys' && (<>

                  {/* Create New API Key */}
                  <div className="adm-card" style={{ marginBottom:20 }}>
                    <div className="adm-card-head">
                      <h3 style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <Plus size={15} color="#818cf8"/>Create New API Key
                      </h3>
                    </div>
                    <div className="adm-card-body">
                      {/* Inputs row */}
                      <div style={{ display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' }}>
                        <div style={{ flex:'1 1 200px', minWidth:0 }}>
                          <label style={{ fontSize:11, color:'var(--subtext)', fontWeight:600, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.4 }}>Label</label>
                          <input
                            value={farmNewKeyLabel}
                            onChange={e => setFarmNewKeyLabel(e.target.value)}
                            placeholder="e.g. Mobile App, Web Dashboard"
                            onKeyDown={e => e.key === 'Enter' && farmCreateKey()}
                            style={{ display:'block', width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }}
                          />
                        </div>
                        <div style={{ flex:'0 0 130px', minWidth:100 }}>
                          <label style={{ fontSize:11, color:'var(--subtext)', fontWeight:600, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.4 }}>Rate Limit / min</label>
                          <input
                            type="number"
                            value={farmNewKeyLimit}
                            onChange={e => setFarmNewKeyLimit(Number(e.target.value))}
                            style={{ display:'block', width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }}
                          />
                        </div>
                      </div>
                      {/* Button on own row — always visible */}
                      <button
                        onClick={farmCreateKey}
                        disabled={farmCreatingKey || !farmNewKeyLabel.trim()}
                        style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 20px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', opacity: farmCreatingKey || !farmNewKeyLabel.trim() ? 0.5 : 1 }}
                      >
                        <Plus size={14}/>{farmCreatingKey ? 'Creating…' : 'Create Key'}
                      </button>
                      {farmRevealedKey && (
                        <div style={{ marginTop:14, padding:'12px 16px', borderRadius:10, background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.25)' }}>
                          <div style={{ fontSize:12, color:'#4ade80', fontWeight:700, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                            <CheckCircle size={13}/> Key created — save it now, won&apos;t be shown again!
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(0,0,0,.15)', borderRadius:7, padding:'8px 12px' }}>
                            <code style={{ fontFamily:'monospace', fontSize:12, color:'#4ade80', flex:1, wordBreak:'break-all', letterSpacing:.5 }}>{farmRevealedKey}</code>
                            <button onClick={() => { navigator.clipboard.writeText(farmRevealedKey); }} title="Copy" style={{ background:'transparent', border:'none', color:'#4ade80', cursor:'pointer', padding:4, borderRadius:5, display:'flex', flexShrink:0 }}><Copy size={15}/></button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Keys list — scrollable */}
                  <div className="adm-card">
                    <div className="adm-card-head"><h3>{farmKeys.length} API Keys</h3></div>
                    <div style={{ maxHeight:340, overflowY:'auto', overflowX:'hidden' }}>
                      {farmKeys.map((k:any) => (
                        <div key={k.id} style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.04)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                              <Key size={13} color="#818cf8" style={{ flexShrink: 0 }} />
                              <span style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.label}</span>
                              <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:k.is_active?'rgba(34,197,94,.1)':'rgba(239,68,68,.1)', color:k.is_active?'#4ade80':'#f87171', fontWeight:600, flexShrink: 0 }}>{k.is_active?'Active':'Revoked'}</span>
                            </div>
                            <div style={{ fontFamily:'monospace', fontSize:11, color:'var(--subtext)', wordBreak:'break-all' }}>{k.key_preview}</div>
                            <div style={{ fontSize:11, color:'var(--subtext)', marginTop:3 }}>{k.requests} reqs · {k.rate_limit}/min{k.last_used?` · last ${new Date(k.last_used).toLocaleString()}`:' · never used'}</div>
                          </div>
                          {k.is_active && (
                            <button onClick={() => farmRevokeKey(k.id)} disabled={farmActionLoading===`revoke-${k.id}`} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid rgba(239,68,68,.25)', background:'transparent', color:'#ef4444', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                              <Trash2 size={12}/>Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

              </>)}


              {farmTab === 'stats' && farmStats && (
                <div className="adm-grid-2">
                  <div className="adm-card">
                    <div className="adm-card-head"><h3 style={{display:'flex',alignItems:'center',gap:8}}><TrendingUp size={15}/>Top Keys by Requests</h3></div>
                    <div className="adm-card-body">
                      {farmStats.requests.top_keys.map((k:any,i:number) => (
                        <div key={k.label} style={{ marginBottom:16 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ width:18, height:18, borderRadius:4, background:'rgba(99,102,241,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#818cf8' }}>{i+1}</span>
                              <span style={{ fontSize:13 }}>{k.label}</span>
                            </div>
                            <span style={{ fontSize:13, fontWeight:700, color:'#818cf8' }}>{k.requests.toLocaleString()}</span>
                          </div>
                          <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,.06)' }}><div style={{ height:'100%', borderRadius:2, background:'linear-gradient(90deg,#6366f180,#6366f1)', width:`${(k.requests/farmStats.requests.total_all_time)*100}%`, transition:'width .6s' }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="adm-card">
                    <div className="adm-card-head"><h3 style={{display:'flex',alignItems:'center',gap:8}}><Shield size={15}/>Key Health</h3></div>
                    <div className="adm-card-body">
                      {[{l:'Total Keys',v:farmStats.keys.total,col:'#818cf8'},{l:'Active',v:farmStats.keys.active,col:'#22c55e'},{l:'Revoked',v:farmStats.keys.revoked,col:'#ef4444'},{l:'All-time Requests',v:farmStats.requests.total_all_time.toLocaleString(),col:'#f59e0b'}].map(({l,v,col})=>(
                        <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                          <span style={{ color:'var(--subtext)', fontSize:13 }}>{l}</span>
                          <span style={{ fontWeight:700, fontSize:16, color:col }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{ marginTop:32, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.2)' }}>MT5 Farm v4.0 · <a href={`http://${farmOrchestratorUrl}/docs`} target="_blank" rel="noreferrer" style={{ color:'#6366f1', textDecoration:'none' }}>Swagger Docs ↗</a></span>
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e' }} />
                  <span style={{ color:'var(--subtext)' }}>Orchestrator {farmOrchestratorUrl}</span>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
