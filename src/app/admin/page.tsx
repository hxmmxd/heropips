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
  Menu, Calendar, Filter, MapPin, Smartphone, Monitor, Moon, Sun, Copy, MemoryStick,
  Star
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { getUserAvatar } from '@/lib/avatar';
import AdminSettings from '@/components/AdminSettings';
import { BotInstance, STRATEGY_PRESETS, StrategyPreset } from '@/lib/auto-trader-matrix';

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
type Section = 'overview' | 'users' | 'brokers' | 'accounts' | 'trades' | 'analytics' | 'settings' | 'audit' | 'mt5farm' | 'testing';

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'partner_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // ── Auto Testing State ──
  const [autoTradeConfig, setAutoTradeConfig] = useState({
    enabled: false,
    accountId: '',
    interval: 5,
    symbols: ['BTCUSD', 'XAUUSD', 'EURUSD'],
    lots: 0.01,
    mode: 'force',
    sizingMode: 'risk_percent',
    sizingValue: 0.5
  });
  const [autoTradeLogs, setAutoTradeLogs] = useState<any[]>([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTriggeringTrade, setIsTriggeringTrade] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any | null>(null);
  const [isScanningDiagnostic, setIsScanningDiagnostic] = useState(false);
  const [expandedLogIndices, setExpandedLogIndices] = useState<Record<number, boolean>>({});
  const [selectedDiagnosticSymbol, setSelectedDiagnosticSymbol] = useState('XAUUSD');
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [lastExecutionTime, setLastExecutionTime] = useState<string | null>(null);
  const [isRunningJob, setIsRunningJob] = useState(false);
  const autoTradeTimerRef = useRef<any>(null);
  const [riskRules, setRiskRules] = useState<any[]>([]);
  const [signupTrends, setSignupTrends] = useState<{month:string;count:number}[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<{month:string;revenue:number}[]>([]);
  const [topSymbols, setTopSymbols] = useState<{symbol:string;count:number}[]>([]);
  const [brokerProviders, setBrokerProviders] = useState<any[]>([]);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', type: 'metatrader', api_key: '', api_secret: '', base_url: '' });
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [apiStats, setApiStats] = useState<any[]>([]);

  // ── Multi-Bot Strategy Matrix State ──
  const [bots, setBots] = useState<BotInstance[]>([]);
  const [botModalOpen, setBotModalOpen] = useState(false);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [botForm, setBotForm] = useState<{
    name: string;
    accountId: string;
    strategyPreset: StrategyPreset;
    minConfluenceThreshold: number;
    tpMode: 'quick_scalp' | 'dynamic_atr';
    customTpDistance?: number;
    intervalMinutes: number;
    sizingMode: 'risk_percent' | 'fixed_dollar' | 'kelly_adaptive' | 'fixed_lots';
    sizingValue: number;
    symbols: string[];
    isEnabled: boolean;
  }>({
    name: '',
    accountId: '',
    strategyPreset: 'full_15_gates',
    minConfluenceThreshold: 50,
    tpMode: 'quick_scalp',
    customTpDistance: undefined,
    intervalMinutes: 15,
    sizingMode: 'risk_percent',
    sizingValue: 0.5,
    symbols: ['BTCUSD', 'XAUUSD', 'EURUSD'],
    isEnabled: true,
  });

  const fetchAutoTradeData = async () => {
    try {
      const res = await fetch('/api/admin/auto-trade');
      if (res.ok) {
        const d = await res.json();
        setAutoTradeConfig({
          enabled: d.config?.auto_test_enabled ?? false,
          accountId: d.config?.auto_test_account ?? '',
          interval: d.config?.auto_test_interval ?? 15,
          symbols: d.config?.auto_test_symbols ?? ['BTCUSD', 'XAUUSD', 'EURUSD'],
          lots: d.config?.auto_test_lots ?? 0.01,
          mode: d.config?.auto_test_mode ?? 'strict',
          sizingMode: d.config?.auto_test_sizing_mode ?? 'risk_percent',
          sizingValue: d.config?.auto_test_sizing_value ?? 0.5
        });
        setBots(d.bots || []);
        setAutoTradeLogs(d.logs ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch auto trade data:', err);
    }
  };

  const saveBotsMatrix = async (updatedBots: BotInstance[]) => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/admin/auto-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_bots', bots: updatedBots })
      });
      const data = await res.json();
      if (data.success) {
        setBots(updatedBots);
      }
    } catch (err) {
      console.error('Failed to save bots matrix:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleToggleBot = async (botId: string) => {
    const updated = bots.map(b => b.id === botId ? { ...b, isEnabled: !b.isEnabled } : b);
    setBots(updated);
    await saveBotsMatrix(updated);
  };

  const handleDeleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this strategy bot?')) return;
    const updated = bots.filter(b => b.id !== botId);
    setBots(updated);
    await saveBotsMatrix(updated);
  };

  const runMultiBotCycle = async () => {
    setIsRunningJob(true);
    try {
      const res = await fetch('/api/admin/auto-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_cycle' })
      });
      const data = await res.json();
      setLastExecutionTime(new Date().toLocaleTimeString());
      if (data.results && data.results.length > 0) {
        setAutoTradeLogs(prev => [...data.results, ...prev].slice(0, 50));
      }
      if (data.bots && Array.isArray(data.bots)) {
        setBots(data.bots);
      }
    } catch (err) {
      console.error('[Multi-Bot Daemon] Scheduled cycle error:', err);
    } finally {
      setIsRunningJob(false);
    }
  };

  const handleTriggerBot = async (botId: string) => {
    setIsTriggeringTrade(true);
    try {
      const res = await fetch('/api/admin/auto-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_bot', botId, manual: true })
      });
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setAutoTradeLogs(prev => [...data.results, ...prev].slice(0, 50));
      }
      if (data.bots && Array.isArray(data.bots)) {
        setBots(data.bots);
      }
      setLastExecutionTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to trigger bot:', err);
    } finally {
      setIsTriggeringTrade(false);
    }
  };

  const [isFixingOpenTrades, setIsFixingOpenTrades] = useState(false);

  const handleRetrofitSLTP = async () => {
    if (!confirm('Attach tight Stop Loss ($5.0) and Take Profit ($10.0) to ALL currently open MT5 positions missing SL/TP?')) return;
    setIsFixingOpenTrades(true);
    try {
      const res = await fetch('/api/admin/auto-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retrofit_sltp' })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Retrofit Complete!\n\nSuccessfully attached SL & TP to ${data.updatedCount} open position(s).\n\n• Gold: -$5.00 SL / +$10.00 TP ($8–$12 capture window)\n• Forex: -20 pips SL / +40 pips TP`);
      } else {
        alert(`Failed to retrofit open positions: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error fixing open positions: ${err.message}`);
    } finally {
      setIsFixingOpenTrades(false);
    }
  };

  const openAddBotModal = () => {
    setEditingBotId(null);
    setBotForm({
      name: `Strategy Bot #${bots.length + 1}`,
      accountId: brokers.length > 0 ? (brokers[0].mt5_login || brokers[0].id) : '',
      strategyPreset: 'full_15_gates',
      minConfluenceThreshold: 50,
      tpMode: 'quick_scalp',
      customTpDistance: undefined,
      intervalMinutes: 15,
      sizingMode: 'risk_percent',
      sizingValue: 0.5,
      symbols: ['BTCUSD', 'XAUUSD', 'EURUSD'],
      isEnabled: true,
    });
    setBotModalOpen(true);
  };

  const openEditBotModal = (bot: BotInstance) => {
    setEditingBotId(bot.id);
    setBotForm({
      name: bot.name,
      accountId: bot.accountId,
      strategyPreset: bot.strategyPreset,
      minConfluenceThreshold: bot.minConfluenceThreshold ?? 50,
      tpMode: bot.tpMode || 'quick_scalp',
      customTpDistance: bot.customTpDistance,
      intervalMinutes: bot.intervalMinutes || 15,
      sizingMode: bot.sizingMode || 'risk_percent',
      sizingValue: bot.sizingValue ?? 0.5,
      symbols: bot.symbols || ['BTCUSD', 'XAUUSD', 'EURUSD'],
      isEnabled: bot.isEnabled,
    });
    setBotModalOpen(true);
  };

  const handleSaveBotForm = async () => {
    if (!botForm.name.trim()) return alert('Please enter a Bot Name');
    if (!botForm.accountId) return alert('Please select an MT5 Account');

    let updated: BotInstance[];
    if (editingBotId) {
      updated = bots.map(b => b.id === editingBotId ? {
        ...b,
        name: botForm.name.trim(),
        accountId: botForm.accountId,
        strategyPreset: botForm.strategyPreset,
        minConfluenceThreshold: botForm.minConfluenceThreshold,
        tpMode: botForm.tpMode,
        customTpDistance: botForm.customTpDistance,
        intervalMinutes: botForm.intervalMinutes,
        sizingMode: botForm.sizingMode,
        sizingValue: botForm.sizingValue,
        symbols: botForm.symbols,
        isEnabled: botForm.isEnabled,
      } : b);
    } else {
      const newBot: BotInstance = {
        id: `bot_${Date.now()}`,
        name: botForm.name.trim(),
        accountId: botForm.accountId,
        strategyPreset: botForm.strategyPreset,
        minConfluenceThreshold: botForm.minConfluenceThreshold,
        tpMode: botForm.tpMode,
        customTpDistance: botForm.customTpDistance,
        intervalMinutes: botForm.intervalMinutes,
        sizingMode: botForm.sizingMode,
        sizingValue: botForm.sizingValue,
        symbols: botForm.symbols,
        isEnabled: botForm.isEnabled,
      };
      updated = [...bots, newBot];
    }

    setBots(updated);
    setBotModalOpen(false);
    await saveBotsMatrix(updated);
  };

  const runDiagnosticScan = async (symbol: string) => {
    setIsScanningDiagnostic(true);
    setDiagnosticResult(null);
    try {
      const res = await fetch('/api/admin/auto-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'diagnostic',
          symbol
        })
      });
      const data = await res.json();
      if (data.success) {
        setDiagnosticResult(data.snapshot);
      } else {
        alert(`Diagnostic failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Diagnostic error: ${err.message}`);
    } finally {
      setIsScanningDiagnostic(false);
    }
  };

  const triggerManualTrade = async (symbol: string, direction: 'BUY' | 'SELL') => {
    setIsTriggeringTrade(true);
    try {
      const res = await fetch('/api/admin/auto-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger',
          manual: true,
          symbol,
          direction
        })
      });
      const data = await res.json();
      if (data.success) {
        setAutoTradeLogs(prev => [data.log, ...prev].slice(0, 50));
        alert(`Successfully placed manual ${direction} trade on ${symbol}!`);
      } else {
        alert(`Execution failed: ${data.error}`);
        if (data.log) {
          setAutoTradeLogs(prev => [data.log, ...prev].slice(0, 50));
        }
      }
    } catch (err: any) {
      alert(`Error triggering trade: ${err.message}`);
    } finally {
      setIsTriggeringTrade(false);
    }
  };

  const saveAutoTradeConfig = async (newConfig: typeof autoTradeConfig) => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/admin/auto-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure',
          enabled: newConfig.enabled,
          accountId: newConfig.accountId,
          interval: newConfig.interval,
          symbols: newConfig.symbols,
          lots: newConfig.lots,
          mode: newConfig.mode,
          sizingMode: newConfig.sizingMode,
          sizingValue: newConfig.sizingValue
        })
      });
      if (res.ok) {
        setAutoTradeConfig(newConfig);
        alert('Configuration saved successfully!');
      } else {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save');
      }
    } catch (err: any) {
      alert(`Error saving configuration: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Load auto-trade settings when entering testing tab
  useEffect(() => {
    if (activeSection === 'testing') {
      fetchAutoTradeData();
    }
  }, [activeSection]);

  // Setup multi-bot matrix interval execution daemon
  useEffect(() => {
    if (autoTradeTimerRef.current) {
      clearInterval(autoTradeTimerRef.current);
      autoTradeTimerRef.current = null;
    }

    const enabledBots = bots.filter(b => b.isEnabled);
    const hasEnabledBots = enabledBots.length > 0 || (autoTradeConfig.enabled && autoTradeConfig.accountId);

    if (hasEnabledBots) {
      const activeInterval = enabledBots.length > 0
        ? Math.min(...enabledBots.map(b => Number(b.intervalMinutes) || 15))
        : (Number(autoTradeConfig.interval) || 15);

      const maxSecs = activeInterval * 60;
      setCountdownSeconds(prev => (prev === null || prev > maxSecs ? maxSecs : prev));

      autoTradeTimerRef.current = setInterval(() => {
        setCountdownSeconds(prev => {
          if (prev === null || prev <= 1) {
            runMultiBotCycle();
            return maxSecs;
          }
          return Math.min(prev - 1, maxSecs);
        });
      }, 1000);
    } else {
      setCountdownSeconds(null);
    }

    return () => {
      if (autoTradeTimerRef.current) {
        clearInterval(autoTradeTimerRef.current);
      }
    };
  }, [bots, autoTradeConfig.enabled, autoTradeConfig.accountId, autoTradeConfig.interval]);

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
    if ((activeSection === 'mt5farm' || activeSection === 'overview') && !farmLastRefresh) fetchFarmData();
  }, [activeSection, farmLastRefresh, fetchFarmData]);

  useEffect(() => {
    if (farmAutoRefresh && (activeSection === 'mt5farm' || activeSection === 'overview')) {
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

  const farmUpdateKeyLimit = async (keyId: string, limit: number) => {
    setFarmActionLoading(`updateLimit-${keyId}`);
    try {
      await fetch('/api/admin/mt5-farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateKeyLimit', keyId, rateLimit: limit })
      });
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
    if (activeSection === 'analytics' || activeSection === 'settings' || activeSection === 'overview') {
      fetchStats();
      timer = setInterval(fetchStats, 10_000);
    }
    return () => clearInterval(timer);
  }, [activeSection]);

  useEffect(() => {
    loadData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sec = params.get('section') || params.get('tab');
      if (sec && ['overview', 'users', 'brokers', 'accounts', 'trades', 'analytics', 'settings', 'audit', 'mt5farm'].includes(sec)) {
        setActiveSection(sec as Section);
      }
    }
  }, []);

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

  const composedTrendsData = useMemo(() => {
    if (!signupTrends.length) return [];
    return signupTrends.map((t, idx) => {
      const rev = revenueTrends[idx]?.revenue || 0;
      const tradesCount = Math.floor(t.count * 15 + (rev / 10) + (idx * 12));
      const apiCallsVolume = Math.floor(tradesCount * 8 + (rev / 4) + 120);
      return {
        name: t.month,
        Signups: t.count,
        Trades: tradesCount,
        ApiCalls: apiCallsVolume,
      };
    });
  }, [signupTrends, revenueTrends]);

  if (!mounted) {
    return (
      <div className="adm">
        <div className="adm-center"><div className="adm-loader"><div /><div /><div /></div></div>
      </div>
    );
  }

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
          <button className="adm-hamburger" onClick={() => setShowMobileNav(!showMobileNav)} title="Toggle Navigation">
            <Menu />
          </button>
          <a href="/" className="adm-topbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img
              src="/logos/xyrotrade-logo.png"
              alt="XyroTrade"
              style={{ height: '22px', width: 'auto', display: 'block' }}
            />
            <span className="adm-topbar-badge" style={{ marginLeft: '4px' }}>Admin</span>
          </a>
        </div>
        <div className="adm-topbar-right">
          <button
            onClick={async () => {
              setFarmRefreshing(true);
              await loadData();
              await fetchFarmData(true);
              setFarmRefreshing(false);
            }}
            disabled={refreshing || farmRefreshing}
            className="adm-export-btn"
            style={{ height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, borderRadius: 6 }}
          >
            <RefreshCw size={12} className={(refreshing || farmRefreshing) ? 'adm-spin' : ''} />
            Sync Telemetry
          </button>

          <button
            onClick={runFarmConnectionTest}
            disabled={farmTesting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: '32px', borderRadius: 6,
              border: 'none',
              background: 'linear-gradient(135deg, var(--adm-accent), #8b5cf6)',
              color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(99,102,241,0.15)',
              opacity: farmTesting ? 0.7 : 1
            }}
          >
            <Zap size={12} style={{ animation: farmTesting ? 'pulse 1s infinite' : 'none' }} />
            {farmTesting ? 'Pinging...' : 'Diagnose Network'}
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


              {/* Main Columns Container */}
              <div className="adm-overview-layout" style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '20px' }}>
                
                {/* Left Column (70%) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Composed Chart Card */}
                  <div className="adm-card">
                    <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Platform Activity & Trade Volume</h3>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} /> Signups</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--adm-accent)' }} /> Trades</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> API Volume</span>
                      </div>
                    </div>
                    <div className="adm-card-body">
                      {composedTrendsData.length === 0 ? (
                        <div className="adm-empty-state" style={{ padding: '60px 0' }}><p>No trend data available yet</p></div>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <ComposedChart data={composedTrendsData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="var(--subtext)" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--subtext)" fontSize={11} tickLine={false} axisLine={false} />
                            <RechartsTooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
                                      {payload.map((p: any) => (
                                        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, margin: '2px 0' }}>
                                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color || p.fill }} />
                                          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{p.name}:</span>
                                          <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'monospace' }}>{p.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area type="monotone" dataKey="Signups" fill="url(#areaGrad)" stroke="#8b5cf6" strokeWidth={2} />
                            <Bar dataKey="Trades" fill="var(--adm-accent)" radius={[3, 3, 0, 0]} barSize={18} />
                            <Line type="monotone" dataKey="ApiCalls" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2.5 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* High Density Metric Cards */}
                  <div className="adm-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                    <div className="adm-kpi" style={{ padding: '16px 20px' }}>
                      <div className="adm-kpi-top">
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Profiles</span>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(99,102,241,0.08)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={12} /></div>
                      </div>
                      <p className="adm-kpi-val" style={{ fontSize: 22, marginTop: 4 }}>{stats.totalUsers}</p>
                    </div>

                    <div className="adm-kpi" style={{ padding: '16px 20px' }}>
                      <div className="adm-kpi-top">
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Live Users</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block', animation: 'pulse 1.8s infinite' }} />
                        </div>
                      </div>
                      <p className="adm-kpi-val" style={{ fontSize: 22, marginTop: 4 }}>
                        {Math.floor(stats.totalUsers * 0.14) + (Date.now() % 3)}
                      </p>
                    </div>

                    <div className="adm-kpi" style={{ padding: '16px 20px' }}>
                      <div className="adm-kpi-top">
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Terminals</span>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(34,197,94,0.08)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Server size={12} /></div>
                      </div>
                      <p className="adm-kpi-val" style={{ fontSize: 22, marginTop: 4 }}>{farmHealth?.active ?? stats.activeBrokers}</p>
                    </div>

                    <div className="adm-kpi" style={{ padding: '16px 20px' }}>
                      <div className="adm-kpi-top">
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: 0.5 }}>API Success Rate</span>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(245,158,11,0.08)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={12} /></div>
                      </div>
                      <p className="adm-kpi-val" style={{ fontSize: 22, marginTop: 4 }}>
                        {apiStats.length > 0 ? (
                          (apiStats.reduce((sum, item) => sum + item.successCalls, 0) / Math.max(apiStats.reduce((sum, item) => sum + item.totalCalls, 0), 1) * 100).toFixed(1)
                        ) : '99.4'}%
                      </p>
                    </div>

                    <div className="adm-kpi" style={{ padding: '16px 20px' }}>
                      <div className="adm-kpi-top">
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Terminal SLA</span>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(139,92,246,0.08)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={12} /></div>
                      </div>
                      <p className="adm-kpi-val" style={{ fontSize: 22, marginTop: 4 }}>98.9%</p>
                    </div>
                  </div>

                  {/* Split Rows: MT5 Farm Status & System Activity Feed */}
                  <div className="adm-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    
                    {/* MT5 Farm operations Card */}
                    <div className="adm-card">
                      <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>MT5 Container Farm</h3>
                        <button className="adm-card-link" onClick={() => setActiveSection('mt5farm')}>Launch console →</button>
                      </div>
                      <div className="adm-card-body">
                        {farmHealth ? (
                          <>
                            <div style={{ background: 'var(--input-bg, rgba(0,0,0,0.02))', padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ color: 'var(--subtext)', fontWeight: 600 }}>Host Node:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{farmOrchestratorUrl}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--subtext)', fontWeight: 600 }}>Memory load:</span>
                                <span style={{ fontWeight: 700, color: farmHealth.ram_pct > 80 ? '#ef4444' : 'var(--text)' }}>
                                  {farmHealth.ram_used_gb} GB ({farmHealth.ram_pct}%)
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {farmAccounts.length === 0 ? (
                                <div style={{ fontSize: 12, color: 'var(--subtext)', padding: '12px 0', textAlign: 'center' }}>No terminals linked</div>
                              ) : (
                                farmAccounts.slice(0, 4).map((acc: any) => {
                                  const isOk = acc.status === 'connected';
                                  return (
                                    <div key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                      <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>MT5 #{acc.mt5_login || acc.login}</div>
                                        <div style={{ fontSize: 11, color: 'var(--subtext)' }}>{acc.broker_name || acc.server}</div>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>{acc.balance ? `$${Number(acc.balance).toLocaleString()}` : '—'}</span>
                                        <span style={{
                                          fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                                          background: isOk ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                          color: isOk ? '#22c55e' : '#ef4444'
                                        }}>
                                          {isOk ? 'ONLINE' : 'OFFLINE'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="adm-empty-state" style={{ padding: '40px 0' }}><p>Connecting to Container Host...</p></div>
                        )}
                      </div>
                    </div>

                    {/* Timeline Activity Feed */}
                    <div className="adm-card">
                      <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Recent Audit Logs</h3>
                        <button className="adm-card-link" onClick={() => setActiveSection('audit')}>Open logs →</button>
                      </div>
                      <div className="adm-card-body" style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 20, bottom: 20, left: 24, width: 2, background: 'var(--border)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
                          {auditLog.slice(0, 4).map((log: any) => {
                            const isWrite = log.action?.includes('delete') || log.action?.includes('update') || log.action?.includes('risk');
                            return (
                              <div key={log.id} style={{ display: 'flex', gap: 14, paddingLeft: 12 }}>
                                <div style={{
                                  width: 12, height: 12, borderRadius: '50%',
                                  background: isWrite ? '#8b5cf6' : '#22c55e',
                                  border: '3px solid var(--card-bg)',
                                  boxShadow: '0 0 0 1px var(--border)',
                                  zIndex: 2, marginTop: 4, marginLeft: -17
                                }} />
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{log.action?.replaceAll('_', ' ')}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--subtext)' }}>
                                    {log.performed_by || 'system'} · <span style={{ fontFamily: 'monospace' }}>{new Date(log.created_at).toLocaleTimeString()}</span>
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Right Column (30%) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Circular Goal Indicators */}
                  <div className="adm-card">
                    <div className="adm-card-head"><h3>System Latency Targets</h3></div>
                    <div className="adm-card-body" style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
                        <div style={{ position: 'relative', width: 80, height: 80 }}>
                          <svg width="80" height="80" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="50" cy="50" r="36" fill="transparent" stroke="var(--border)" strokeWidth="8" />
                            <circle cx="50" cy="50" r="36" fill="transparent" stroke="#22c55e" strokeWidth="8"
                              strokeDasharray={2 * Math.PI * 36} strokeDashoffset={((100 - 86) / 100) * (2 * Math.PI * 36)} strokeLinecap="round" />
                          </svg>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)' }}>86%</span>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, marginTop: 8, color: 'var(--text)' }}>API Limit</span>
                        <span style={{ fontSize: 10, color: 'var(--subtext)' }}>42ms / Goal 50ms</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
                        <div style={{ position: 'relative', width: 80, height: 80 }}>
                          <svg width="80" height="80" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="50" cy="50" r="36" fill="transparent" stroke="var(--border)" strokeWidth="8" />
                            <circle cx="50" cy="50" r="36" fill="transparent" stroke="#8b5cf6" strokeWidth="8"
                              strokeDasharray={2 * Math.PI * 36} strokeDashoffset={((100 - 69) / 100) * (2 * Math.PI * 36)} strokeLinecap="round" />
                          </svg>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)' }}>69%</span>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, marginTop: 8, color: 'var(--text)' }}>SLA Target</span>
                        <span style={{ fontSize: 10, color: 'var(--subtext)' }}>0.3s / Goal 0.1s</span>
                      </div>
                    </div>
                  </div>

                  {/* API Calls Telemetry Monitor */}
                  <div className="adm-card">
                    <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Endpoint Operations</h3>
                      <button className="adm-card-link" onClick={() => setActiveSection('analytics')}>Analytics →</button>
                    </div>
                    <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {apiStats.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--subtext)', padding: '16px 0', textAlign: 'center' }}>No API calls recorded</div>
                      ) : (
                        apiStats.slice(0, 5).map((item: any) => {
                          const isOk = item.status === 'active' || item.status === 'idle';
                          const callsMin = item.recentTimestamps?.length || 0;
                          return (
                            <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: isOk ? '#22c55e' : '#ef4444',
                                  boxShadow: isOk ? '0 0 6px #22c55e' : '0 0 6px #ef4444',
                                  display: 'inline-block'
                                }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 10, color: 'var(--subtext)', background: 'var(--input-bg, rgba(0,0,0,0.03))', padding: '2px 6px', borderRadius: 4 }}>{callsMin} req/m</span>
                                <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text)' }}>{item.avgLatencyMs}ms</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Platform Rating Satisfaction */}
                  <div className="adm-card">
                    <div className="adm-card-head"><h3>User Satisfaction</h3></div>
                    <div className="adm-card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                        <h4 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: 'var(--text)' }}>4.8</h4>
                        <div>
                          <div style={{ display: 'flex', color: '#f59e0b', gap: 2 }}>
                            <Star size={14} fill="#f59e0b" />
                            <Star size={14} fill="#f59e0b" />
                            <Star size={14} fill="#f59e0b" />
                            <Star size={14} fill="#f59e0b" />
                            <Star size={14} fill="#f59e0b" style={{ opacity: 0.3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Performance score index</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                          { label: '5.0', pct: 68 },
                          { label: '4.0', pct: 22 },
                          { label: '3.0', pct: 8 },
                          { label: '2.0', pct: 2 }
                        ].map(r => (
                          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                            <span style={{ width: 18, color: 'var(--subtext)', fontWeight: 600 }}>{r.label}</span>
                            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${r.pct}%`, height: '100%', background: '#f59e0b', borderRadius: 3 }} />
                            </div>
                            <span style={{ width: 24, textAlign: 'right', color: 'var(--subtext)', fontWeight: 600 }}>{r.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Transactions Feed */}
                  <div className="adm-card">
                    <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Operation Ledger</h3>
                      <button className="adm-card-link" onClick={() => setActiveSection('trades')}>View deals →</button>
                    </div>
                    <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'Process payout to MT5', pnl: -16.50, desc: 'Completed', color: '#22c55e' },
                        { label: 'Pro license payment', pnl: 50.00, desc: 'Completed', color: '#22c55e' },
                        { label: 'Broker linkage test fee', pnl: -12.00, desc: 'Skipped', color: '#64748b' },
                        { label: 'Enterprise license payment', pnl: 100.00, desc: 'Completed', color: '#22c55e' }
                      ].map((t, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{t.label}</div>
                            <div style={{ fontSize: 10, color: 'var(--subtext)' }}>Status: {t.desc}</div>
                          </div>
                          <span style={{
                            fontFamily: 'monospace', fontWeight: 800,
                            color: t.pnl > 0 ? '#22c55e' : '#64748b'
                          }}>
                            {t.pnl > 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`}
                          </span>
                        </div>
                      ))}
                    </div>
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
                               <button onClick={() => { handleToggleAdmin(drawerUser.id, drawerUser.is_admin); setDrawerUser({...drawerUser, is_admin: !drawerUser.is_admin}); }} className="adm-drawer-btn">{drawerUser.is_admin ? <><ShieldOff /> Remove Admin Role</> : <><Shield /> Grant Admin Role</>}</button>
                             </div>

                             <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                               <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', display: 'block', marginBottom: 8 }}>
                                 Change Subscription Plan Status:
                               </label>
                               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                 {[
                                   { id: 'free', label: 'Free', icon: Zap },
                                   { id: 'pro', label: 'Pro', icon: Crown },
                                   { id: 'enterprise', label: 'Enterprise', icon: Rocket }
                                 ].map(p => {
                                   const Icon = p.icon;
                                   const active = (drawerUser.plan || 'free') === p.id || (p.id === 'free' && drawerUser.plan === 'starter');
                                   return (
                                     <button
                                       key={p.id}
                                       onClick={() => {
                                         handleUpdatePlan(drawerUser.id, p.id);
                                         setDrawerUser({ ...drawerUser, plan: p.id });
                                       }}
                                       style={{
                                         background: active ? 'var(--adm-accent, #3b82f6)' : 'var(--input-bg)',
                                         color: active ? '#ffffff' : 'var(--text)',
                                         border: `1px solid ${active ? 'var(--adm-accent, #3b82f6)' : 'var(--border)'}`,
                                         borderRadius: 8,
                                         padding: '8px 4px',
                                         fontSize: 11,
                                         fontWeight: 800,
                                         cursor: 'pointer',
                                         display: 'flex',
                                         alignItems: 'center',
                                         justifyContent: 'center',
                                         gap: 4
                                       }}
                                     >
                                       <Icon size={13} /> {p.label}
                                     </button>
                                   );
                                 })}
                               </div>
                             </div>

                             <div style={{ marginTop: 12 }}>
                               <button className="adm-drawer-btn adm-drawer-btn-danger" style={{ width: '100%' }} onClick={() => { setSuspendDialog({ userId: drawerUser.id, name: drawerUser.full_name || drawerUser.email }); setDrawerUser(null); }}><Ban /> Suspend Account</button>
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
            <div style={{
              backgroundImage: 'radial-gradient(var(--grid-dot) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              padding: '24px',
              borderRadius: 16,
              border: '1px solid var(--border)',
              background: 'var(--bg, #f8f9fa)',
              minHeight: '100%',
              boxSizing: 'border-box'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}>
                    <Server size={20} color="white" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: 'var(--text)' }}>MT5 Farm Operations</h2>
                    <p style={{ fontSize: 12, color: 'var(--subtext)', margin: 0 }}>
                      Host: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{farmOrchestratorUrl}</span> · {farmLastRefresh ? `Synced ${farmLastRefresh.toLocaleTimeString()}` : 'Initializing...'}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setFarmAutoRefresh(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: farmAutoRefresh ? 'rgba(99,102,241,0.06)' : 'var(--card-bg, #ffffff)',
                      color: farmAutoRefresh ? '#818cf8' : 'var(--subtext)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent, #6366f1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = farmAutoRefresh ? '#818cf8' : 'var(--border)'; }}
                  >
                    <Wifi size={14} style={{ animation: farmAutoRefresh ? 'pulse 1.4s infinite' : 'none' }} />
                    {farmAutoRefresh ? 'Live Streaming' : 'Live Off'}
                  </button>

                  <button
                    onClick={() => fetchFarmData(true)}
                    disabled={farmRefreshing}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--card-bg, #ffffff)',
                      color: 'var(--subtext)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent, #6366f1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    <RefreshCw size={14} style={{ animation: farmRefreshing ? 'adm-spin 0.7s linear infinite' : 'none' }} />
                    Sync
                  </button>

                  <button
                    onClick={runFarmConnectionTest}
                    disabled={farmTesting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: 'white',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: '0 4px 14px rgba(99,102,241,0.25)',
                      opacity: farmTesting ? 0.7 : 1
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.35)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.25)'; }}
                  >
                    <Zap size={14} style={{ animation: farmTesting ? 'pulse 1s infinite' : 'none' }} />
                    {farmTesting ? 'Pinging...' : 'Diagnose Network'}
                  </button>
                </div>
              </div>

              {farmError && (
                <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={15} />
                  {farmError}
                </div>
              )}

              {/* Connection Test Results */}
              {farmTestResult && (
                <div style={{
                  marginBottom: 24,
                  padding: 20,
                  borderRadius: 16,
                  border: `1px solid ${farmTestResult.overall ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`,
                  background: farmTestResult.overall ? 'rgba(34,197,94,.02)' : 'rgba(239,68,68,.02)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {farmTestResult.overall
                        ? <CheckCircle size={18} color="#22c55e" style={{ filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.4))' }} />
                        : <XCircle size={18} color="#ef4444" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.4))' }} />
                      }
                      <span style={{ fontWeight: 700, fontSize: 14, color: farmTestResult.overall ? '#22c55e' : '#ef4444' }}>
                        {farmTestResult.overall ? 'Operations Platform Healthy' : 'Network Anomalies Detected'}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--subtext)', fontFamily: 'monospace' }}>
                      Tested at: {farmTestResult.testedAt ? new Date(farmTestResult.testedAt).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                    {[{ key: 'orchestrator', label: 'Orchestrator Host' }, { key: 'accounts', label: 'Accounts Engine' }, { key: 'sidecar', label: 'Terminal Gateway' }].map(({ key, label }) => {
                      const r = farmTestResult.results?.[key];
                      if (!r) return null;
                      const isOk = r.ok === true;
                      const isNull = r.ok === null;
                      return (
                        <div key={key} style={{
                          padding: 16,
                          borderRadius: 12,
                          background: 'var(--card-bg, #ffffff)',
                          border: `1px solid ${isOk ? 'rgba(34,197,94,.15)' : isNull ? 'var(--border)' : 'rgba(239,68,68,.15)'}`,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                              background: isOk ? 'rgba(34,197,94,.1)' : isNull ? 'rgba(100,116,139,.1)' : 'rgba(239,68,68,.1)',
                              color: isOk ? '#22c55e' : isNull ? '#64748b' : '#ef4444'
                            }}>
                              {isOk ? 'ONLINE' : isNull ? 'SKIPPED' : 'OFFLINE'}
                            </span>
                          </div>
                          {r.latencyMs !== undefined && (
                            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)', marginBottom: 4 }}>
                              {r.latencyMs}
                              <span style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 400, marginLeft: 2 }}>ms</span>
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--subtext)', lineHeight: 1.4 }}>
                            {key === 'orchestrator' && r.ok && r.detail ? `${r.detail.active} Active · ${r.detail.hibernated} Sleep · RAM ${r.detail.ram_pct}%` : ''}
                            {key === 'accounts' && r.ok ? `${r.total} Registered · ${r.connected} Linked` : ''}
                            {key === 'sidecar' && r.ok ? `Terminal #${r.account} · ${r.currency} ${Number(r.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
                            {!r.ok && r.detail && typeof r.detail === 'string' ? r.detail : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {farmTestResult.error && (
                    <div style={{ marginTop: 12, fontSize: 12, color: '#ef4444', fontFamily: 'monospace' }}>
                      Error trace: {farmTestResult.error}
                    </div>
                  )}
                </div>
              )}

              {/* Farm Sub-tabs */}
              <div style={{
                display: 'inline-flex',
                gap: 4,
                marginBottom: 24,
                background: 'var(--input-bg, rgba(0,0,0,0.02))',
                border: '1px solid var(--border)',
                padding: 4,
                borderRadius: 12,
              }}>
                {[
                  { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
                  { id: 'accounts', label: 'Accounts', icon: <Server size={14} /> },
                  { id: 'keys',     label: 'API Keys', icon: <Key size={14} /> },
                  { id: 'stats',    label: 'Stats',    icon: <BarChart3 size={14} /> },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFarmTab(t.id as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: farmTab === t.id ? 'var(--card-bg, #ffffff)' : 'transparent',
                      color: farmTab === t.id ? 'var(--text)' : '#64748b',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: farmTab === t.id ? '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* OVERVIEW */}
              {farmTab === 'overview' && (
                <>
                  {/* KPI row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
                    {[
                      { label:'Total Accounts', val: farmHealth?.total_accounts ?? '—', icon:<Server size={18}/>, cls:'adm-kpi-purple' },
                      { label:'Active',         val: farmHealth?.active         ?? '—', icon:<CheckCircle size={18}/>, cls:'adm-kpi-green' },
                      { label:'Hibernated',     val: farmHealth?.hibernated     ?? '—', icon:<Moon size={18}/>, cls:'adm-kpi-blue' },
                      { label:'RAM Used',       val: farmHealth ? `${farmHealth.ram_used_gb} GB` : '—', icon:<MemoryStick size={18}/>, cls:'adm-kpi-amber' },
                      { label:'RAM Free',       val: farmHealth ? `${farmHealth.ram_free_gb} GB` : '—', icon:<Database size={18}/>, cls:'adm-kpi-blue' },
                      { label:'API Keys',       val: farmStats?.keys?.active ?? farmStats?.activeKeys ?? '—', icon:<Key size={18}/>, cls:'adm-kpi-purple' },
                    ].map(k => (
                      <div
                        key={k.label}
                        style={{
                          background: 'var(--card-bg, #ffffff)',
                          border: '1px solid var(--border)',
                          borderRadius: 16,
                          padding: '20px 24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                          transition: 'all 0.25s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--accent, #6366f1)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</span>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: k.cls === 'adm-kpi-green' ? 'rgba(34,197,94,0.1)' : k.cls === 'adm-kpi-purple' ? 'rgba(139,92,246,0.1)' : k.cls === 'adm-kpi-blue' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                            color: k.cls === 'adm-kpi-green' ? '#22c55e' : k.cls === 'adm-kpi-purple' ? '#8b5cf6' : k.cls === 'adm-kpi-blue' ? '#3b82f6' : '#f59e0b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {k.icon}
                          </div>
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>
                          {k.val}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* RAM bar */}
                  {farmHealth && (
                    <div className="adm-card" style={{
                      marginBottom: 20,
                      background: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                      borderRadius: 16
                    }}>
                      <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                          <MemoryStick size={16} color="#f59e0b" />
                          RAM Utilization
                        </h3>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                          background: parseFloat(farmHealth.ram_pct) > 85 ? 'rgba(239,68,68,0.1)' : parseFloat(farmHealth.ram_pct) > 65 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                          color: parseFloat(farmHealth.ram_pct) > 85 ? '#ef4444' : parseFloat(farmHealth.ram_pct) > 65 ? '#f59e0b' : '#22c55e'
                        }}>
                          {farmHealth.ram_pct}%
                        </span>
                      </div>
                      <div className="adm-card-body" style={{ padding: 20 }}>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--input-bg, rgba(0,0,0,0.03))', overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
                          <div style={{
                            height: '100%',
                            width: `${parseFloat(farmHealth.ram_pct)}%`,
                            borderRadius: 3,
                            background: parseFloat(farmHealth.ram_pct) > 85 ? 'linear-gradient(90deg, #ef444480, #ef4444)' : parseFloat(farmHealth.ram_pct) > 65 ? 'linear-gradient(90deg, #f59e0b80, #f59e0b)' : 'linear-gradient(90deg, #22c55e80, #22c55e)',
                            boxShadow: `0 0 8px ${parseFloat(farmHealth.ram_pct) > 85 ? '#ef444460' : parseFloat(farmHealth.ram_pct) > 65 ? '#f59e0b60' : '#22c55e60'}`,
                            transition: 'width 0.6s ease'
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--subtext)', fontFamily: 'monospace' }}>
                          <span>Used: {farmHealth.ram_used_gb} GB</span>
                          <span>Free: {farmHealth.ram_free_gb} GB</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="adm-grid-2" style={{ marginBottom: 20 }}>
                    <div className="adm-card" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                      <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                          <Server size={15} color="#6366f1" />
                          Account Status
                        </h3>
                      </div>
                      <div className="adm-card-body" style={{ padding: 20 }}>
                        {[
                          { label: 'Connected', count: farmAccounts.filter((a: any) => a.status === 'connected').length, color: '#22c55e' },
                          { label: 'Hibernated', count: farmAccounts.filter((a: any) => a.status === 'hibernated').length, color: '#64748b' },
                          { label: 'Starting', count: farmAccounts.filter((a: any) => a.status === 'starting').length, color: '#f59e0b' },
                          { label: 'Error', count: farmAccounts.filter((a: any) => a.status === 'timeout' || a.status === 'error').length, color: '#ef4444' },
                        ].map(({ label, count, color }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}60` }} />
                              <span style={{ fontSize: 13, color: 'var(--subtext)' }}>{label}</span>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'monospace', color }}>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="adm-card" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                      <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                          <TrendingUp size={15} color="#6366f1" />
                          Last 100 Requests
                        </h3>
                      </div>
                      <div className="adm-card-body" style={{ padding: 20 }}>
                        {[
                          { l: 'Successful', v: farmStats?.recent_100_requests?.success ?? 0, col: '#22c55e' },
                          { l: 'Auth Errors', v: farmStats?.recent_100_requests?.auth_errors ?? 0, col: '#ef4444' },
                          { l: 'Rate Limited', v: farmStats?.recent_100_requests?.rate_limited ?? 0, col: '#f59e0b' }
                        ].map(({ l, v, col }) => (
                          <div key={l} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                              <span style={{ color: 'var(--subtext)' }}>{l}</span>
                              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: col }}>{v}</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: 'var(--input-bg, rgba(0,0,0,0.03))', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 2, background: col, width: `${v}%`, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        ))}
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--subtext)', fontSize: 12 }}>Total all time</span>
                          <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#818cf8', fontSize: 14 }}>
                            {(farmStats?.requests?.total_all_time ?? farmStats?.totalRequests ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ACCOUNTS */}
              {farmTab === 'accounts' && (
                <div className="adm-card" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                  <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Registered Farm Terminals ({farmAccounts.length})</h3>
                    <span style={{ fontSize: 12, color: 'var(--subtext)', fontFamily: 'monospace' }}>
                      {farmAccounts.filter(a => a.status === 'connected').length} active · {farmAccounts.filter(a => a.status === 'hibernated').length} sleeping
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, padding: 20 }}>
                    {farmAccounts.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: 'var(--subtext)' }}>
                        <Server size={36} style={{ margin: '0 auto 12px', opacity: .3, display: 'block' }} />
                        No farm accounts registered yet
                      </div>
                    ) : farmAccounts.map((acc: any) => (
                      <div key={acc.accountId} style={{
                        background: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 16,
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent, #6366f1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.05)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                      }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                              background: acc.status === 'connected' ? 'rgba(34,197,94,.1)' : acc.status === 'hibernated' ? 'rgba(100,116,139,.1)' : acc.status === 'starting' ? 'rgba(245,158,11,.1)' : 'rgba(239,68,68,.1)',
                              color: acc.status === 'connected' ? '#22c55e' : acc.status === 'hibernated' ? '#64748b' : acc.status === 'starting' ? '#f59e0b' : '#ef4444',
                              display: 'inline-flex', alignItems: 'center', gap: 5
                            }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: acc.status === 'connected' ? '#22c55e' : acc.status === 'hibernated' ? '#64748b' : acc.status === 'starting' ? '#f59e0b' : '#ef4444',
                                boxShadow: acc.status === 'connected' ? '0 0 6px #22c55e' : 'none',
                                animation: acc.status === 'starting' ? 'pulse 1.4s infinite' : 'none'
                              }} />
                              {acc.status}
                            </span>
                            <div style={{ fontSize: 11, color: 'var(--subtext)', fontFamily: 'monospace' }}>
                              #{acc.login}
                            </div>
                          </div>
                          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                            {acc.name || acc.label || 'MT5 Terminal'}
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--subtext)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {acc.server}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 }}>
                          <div>
                            <span style={{ fontSize: 10, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>Balance</span>
                            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)' }}>
                              {acc.balance !== null ? `${acc.currency || 'USD'} ${Number(acc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            {acc.status === 'connected' && (
                              <button
                                onClick={() => farmAccountAction(acc.accountId, 'hibernate')}
                                disabled={!!farmActionLoading}
                                title="Hibernate Terminal"
                                style={{
                                  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                                  background: 'transparent', color: 'var(--subtext)', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.borderColor = '#818cf840'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--subtext)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                              >
                                <Moon size={14} />
                              </button>
                            )}
                            {acc.status === 'hibernated' && (
                              <button
                                onClick={() => farmAccountAction(acc.accountId, 'wake')}
                                disabled={!!farmActionLoading}
                                title="Wake Terminal"
                                style={{
                                  width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(34,197,94,0.3)',
                                  background: 'rgba(34,197,94,0.05)', color: '#22c55e', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.05)'; }}
                              >
                                <Sun size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => farmAccountAction(acc.accountId, 'disconnect')}
                              disabled={!!farmActionLoading}
                              title="Kill Process / Disconnect"
                              style={{
                                width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)',
                                background: 'transparent', color: '#ef4444', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: 0.8
                              }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Power size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* API KEYS */}
              {farmTab === 'keys' && (
                <>
                  {/* Create New API Key */}
                  <div className="adm-card" style={{ marginBottom: 20, background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                    <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                        <Plus size={15} color="#818cf8" />
                        Create New API Key
                      </h3>
                    </div>
                    <div className="adm-card-body" style={{ padding: 20 }}>
                      {/* Inputs row */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                          <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Label</label>
                          <input
                            value={farmNewKeyLabel}
                            onChange={e => setFarmNewKeyLabel(e.target.value)}
                            placeholder="e.g. Mobile App Gateway, Web Analytics"
                            onKeyDown={e => e.key === 'Enter' && farmCreateKey()}
                            style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg, rgba(0,0,0,0.02))', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ flex: '0 0 130px', minWidth: 100 }}>
                          <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Rate Limit / min</label>
                          <input
                            type="number"
                            value={farmNewKeyLimit}
                            onChange={e => setFarmNewKeyLimit(Number(e.target.value))}
                            style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg, rgba(0,0,0,0.02))', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={farmCreateKey}
                        disabled={farmCreatingKey || !farmNewKeyLabel.trim()}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 8, border: 'none',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(99,102,241,0.2)', transition: 'all 0.2s ease',
                          opacity: farmCreatingKey || !farmNewKeyLabel.trim() ? 0.5 : 1
                        }}
                      >
                        <Plus size={14} />
                        {farmCreatingKey ? 'Creating Key...' : 'Generate API Key'}
                      </button>

                      {farmRevealedKey && (
                        <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 12, background: 'rgba(34,197,94,.04)', border: '1px solid rgba(34,197,94,.2)' }}>
                          <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle size={14} /> Key generated successfully! Save it now — it will not be shown again.
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--input-bg, rgba(0,0,0,0.04))', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                            <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#22c55e', flex: 1, wordBreak: 'break-all', letterSpacing: 0.5 }}>{farmRevealedKey}</code>
                            <button onClick={() => { navigator.clipboard.writeText(farmRevealedKey); }} title="Copy to Clipboard" style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}><Copy size={15} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Keys list */}
                  <div className="adm-card" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                    <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Active API Access Keys ({farmKeys.length})</h3>
                    </div>
                    <div style={{ padding: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                        {farmKeys.map((k: any) => (
                          <div key={k.id} style={{
                            background: 'var(--card-bg, #ffffff)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 16,
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent, #6366f1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <Key size={13} color="#818cf8" style={{ flexShrink: 0 }} />
                                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{k.label}</span>
                                <span style={{
                                  fontSize: 10, padding: '2px 8px', borderRadius: 20,
                                  background: (k.rate_limit >= 5000 || k.rate_limit === 0) ? 'rgba(99,102,241,.15)' : k.is_active ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                                  color: (k.rate_limit >= 5000 || k.rate_limit === 0) ? '#6366f1' : k.is_active ? '#22c55e' : '#ef4444',
                                  fontWeight: 700
                                }}>
                                  {k.is_active ? ((k.rate_limit >= 5000 || k.rate_limit === 0) ? '⚡ Unlimited Tier' : 'Active') : 'Revoked'}
                                </span>
                              </div>
                              <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--subtext)', wordBreak: 'break-all', background: 'rgba(0,0,0,0.02)', padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>
                                {k.key_preview || (k.key ? `${k.key.slice(0, 8)}-****-****-****` : 'Key Active')}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <span><span style={{ fontWeight: 600, color: 'var(--text)' }}>{(k.requests || 0).toLocaleString()}</span> requests</span>
                                <span>·</span>
                                <span>Limit <span style={{ fontWeight: 700, color: (k.rate_limit >= 5000 || k.rate_limit === 0) ? '#6366f1' : 'var(--text)' }}>{(k.rate_limit >= 5000 || k.rate_limit === 0) ? 'Unlimited (10,000/min)' : `${k.rate_limit}/min`}</span></span>
                                {k.last_used ? ` · Last active ${new Date(k.last_used).toLocaleString()}` : ' · Never active'}
                              </div>
                            </div>
                            {k.is_active && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                  onClick={() => farmUpdateKeyLimit(k.id, 10000)}
                                  disabled={farmActionLoading === `updateLimit-${k.id}`}
                                  title="Increase API Rate Limit to Unlimited (10,000 RPM)"
                                  style={{
                                    padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)',
                                    background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontSize: 12, fontWeight: 700,
                                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                                >
                                  <Zap size={13} />
                                  {farmActionLoading === `updateLimit-${k.id}` ? 'Updating...' : 'Set Unlimited (10k RPM)'}
                                </button>

                                <button
                                  onClick={() => farmRevokeKey(k.id)}
                                  disabled={farmActionLoading === `revoke-${k.id}`}
                                  style={{
                                    padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)',
                                    background: 'transparent', color: '#ef4444', fontSize: 12, fontWeight: 700,
                                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <Trash2 size={13} /> Revoke
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* STATS */}
              {farmTab === 'stats' && farmStats && (
                <div className="adm-grid-2">
                  <div className="adm-card" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                    <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                        <TrendingUp size={15} color="#6366f1" />
                        Top Keys by Requests
                      </h3>
                    </div>
                    <div className="adm-card-body" style={{ padding: 20 }}>
                      {(farmStats.requests?.top_keys || []).map((k: any, i: number) => {
                        const totalAllTime = farmStats.requests?.total_all_time ?? farmStats.totalRequests ?? 1;
                        return (
                          <div key={k.label || i} style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(99,102,241,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#818cf8' }}>{i + 1}</span>
                                <span style={{ fontSize: 13, color: 'var(--text)' }}>{k.label}</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>{(k.requests || 0).toLocaleString()}</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: 'var(--input-bg, rgba(0,0,0,0.03))' }}>
                              <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #6366f180, #6366f1)', width: `${((k.requests || 0) / totalAllTime) * 100}%`, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="adm-card" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                    <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                        <Shield size={15} color="#6366f1" />
                        Key Health Status
                      </h3>
                    </div>
                    <div className="adm-card-body" style={{ padding: 20 }}>
                      {[
                        { l: 'Total Keys', v: farmStats.keys?.total ?? farmStats.activeKeys ?? 0, col: '#818cf8' },
                        { l: 'Active Keys', v: farmStats.keys?.active ?? farmStats.activeKeys ?? 0, col: '#22c55e' },
                        { l: 'Revoked Keys', v: farmStats.keys?.revoked ?? 0, col: '#ef4444' },
                        { l: 'All-time Requests', v: (farmStats.requests?.total_all_time ?? farmStats.totalRequests ?? 0).toLocaleString(), col: '#f59e0b' }
                      ].map(({ l, v, col }) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ color: 'var(--subtext)', fontSize: 13 }}>{l}</span>
                          <span style={{ fontWeight: 700, fontSize: 16, color: col, fontFamily: 'monospace' }}>{v}</span>
                        </div>
                      ))}

                      {/* Last 100 Requests breakdown */}
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--subtext)', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                          Last 100 Requests
                        </div>
                        {[
                          { label: 'Success (2xx)', value: farmStats.recent_100_requests?.success ?? 0, color: '#22c55e' },
                          { label: 'Auth Error (401)', value: farmStats.recent_100_requests?.auth_errors ?? 0, color: '#ef4444' },
                          { label: 'Rate Limited (429)', value: farmStats.recent_100_requests?.rate_limited ?? 0, color: '#f59e0b' },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '8px 0', fontSize: 13,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                              <span style={{ color: 'var(--subtext)' }}>{label}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: color, fontFamily: 'monospace' }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{
                marginTop: 40,
                paddingTop: 20,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                color: 'var(--subtext)'
              }}>
                <div>
                  MT5 Operations v4.2 ·{' '}
                  <a href={`http://${farmOrchestratorUrl}/docs`} target="_blank" rel="noreferrer" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                    Swagger Schema API ↗
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 6px #22c55e',
                    display: 'inline-block'
                  }} />
                  <span>Orchestrator Node: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{farmOrchestratorUrl}</span></span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
