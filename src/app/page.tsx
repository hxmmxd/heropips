'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ModalNode from '@/components/ModalNode';
import TerminalTab from '@/components/TerminalTab';
import AstroDisclaimerModal from '@/components/AstroDisclaimerModal';
import BrokerLimitModal from '@/components/BrokerLimitModal';
import { PhoneVerificationModal } from '@/components/PhoneVerificationModal';
import { createClient } from '@/lib/supabase/client';
import { Broker, ChatMessage, Partner, TradeLog } from '@/types';

// Lazy-loaded tabs — only fetched when the user navigates to them
const ManagerTab         = lazy(() => import('@/components/ManagerTab'));
const BrokersTab         = lazy(() => import('@/components/BrokersTab'));
const HistoryTab         = lazy(() => import('@/components/HistoryTab'));
const ReferralTab        = lazy(() => import('@/components/ReferralTab'));
const ProfileTab         = lazy(() => import('@/components/ProfileTab'));
const SubscriptionTab    = lazy(() => import('@/components/SubscriptionTab'));
const BillingTab         = lazy(() => import('@/components/BillingTab'));
const CoursesTab         = lazy(() => import('@/components/CoursesTab'));
const AstroPerformanceTab = lazy(() => import('@/components/AstroPerformanceTab'));

// Minimal tab skeleton to show while a lazy tab loads
function TabSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4 }}>
      <svg className="animate-spin w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
    </div>
  );
}

function HomeContent() {
  const [currentTab, setCurrentTab] = useState('terminal');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [modalOpen, setModalOpen] = useState(false);
  const [brokerLimitModalOpen, setBrokerLimitModalOpen] = useState(false);
  const [astroMode, setAstroMode] = useState(false);
  const [showAstroDisclaimer, setShowAstroDisclaimer] = useState(false);

  const [isFree, setIsFree] = useState(true);
  const [dailySignalsUsed, setDailySignalsUsed] = useState(0);
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  // Initial Brokers Data — starts empty (SSR safe), cache loaded in useEffect
  const [brokers, setBrokersRaw] = useState<Broker[]>([]);
  const [activeBrokerId, setActiveBrokerId] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pollTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptsRef = React.useRef(0);

  // Wrapper that keeps localStorage in sync
  const setBrokers = React.useCallback((updater: Broker[] | ((prev: Broker[]) => Broker[])) => {
    setBrokersRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem('tgpt_brokers', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Find currently active broker data
  const defaultBroker: Broker = { name: 'No Broker', balance: '0.00', pnl: '0.00', equity: '0.00', acc: 'none' };
  const activeBroker = brokers.find((b) => b.acc === activeBrokerId) || brokers[0] || defaultBroker;

  // Chat Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Real logs data from Supabase
  const [logs, setLogs] = useState<any[]>([]);

  // Partners data
  const [partners, setPartners] = useState<Partner[]>([
    { name: 'Alpha_Quant',        portfolio: '42,481', rebate: '622',   commission: '124', status: 'Active',   joined: 'May 12', trades: 84  },
    { name: 'Retail_King',        portfolio: '12,400', rebate: '88',    commission: '17',  status: 'Active',   joined: 'May 18', trades: 31  },
    { name: 'Scalp_Hunter',       portfolio: '89,120', rebate: '1,142', commission: '228', status: 'Active',   joined: 'Apr 29', trades: 210 },
    { name: 'Institutional_Void', portfolio: '540,200',rebate: '4,240', commission: '848', status: 'Active',   joined: 'Apr 10', trades: 612 },
    { name: 'FX_Nomad',           portfolio: '8,800',  rebate: '44',    commission: '8',   status: 'Inactive', joined: 'May 25', trades: 12  },
  ]);

  // Synchronize HTML dark mode selector
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Restore astroMode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('astroMode') === 'true';
    setAstroMode(saved);
    document.documentElement.classList.toggle('astro-mode', saved);
    // If astro was active, ensure dark mode is on
    if (saved) {
      setTheme('dark');
    }
  }, []);

  // Hydrate broker list from localStorage (runs before API fetch, no hydration mismatch)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('tgpt_brokers');
      if (cached) {
        const parsed: Broker[] = JSON.parse(cached);
        if (parsed.length > 0) setBrokersRaw(parsed);
      }
    } catch {}
  }, []);

  const handleToggleAstroMode = () => {
    const next = !astroMode;
    
    if (next) {
      const accepted = localStorage.getItem('astroDisclaimerAccepted') === 'true';
      if (!accepted) {
        setShowAstroDisclaimer(true);
        return;
      }
    }
    
    toggleAstroModeActive(next);
  };

  const toggleAstroModeActive = (next: boolean) => {
    setAstroMode(next);
    localStorage.setItem('astroMode', String(next));
    document.documentElement.classList.toggle('astro-mode', next);

    if (next) {
      // Save current theme then force dark
      localStorage.setItem('preAstroTheme', theme);
      setTheme('dark');

      // Inject astro activation bot message into chat
      const activationMsg: ChatMessage = {
        id: `astro-activate-${Date.now()}`,
        sender: 'bot',
        text: 'ASTRO_ACTIVATION',
        astroCard: true,
      };
      setMessages(prev => [...prev, activationMsg]);
    } else {
      // Restore previous theme
      const prev = (localStorage.getItem('preAstroTheme') as 'light' | 'dark') ?? 'light';
      setTheme(prev);
      localStorage.removeItem('preAstroTheme');
    }

    // Non-blocking Supabase sync
    fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ astro_mode: next }),
    }).catch(() => {});
  };

  // Dynamic height handling for mobile keyboard resize
  useEffect(() => {
    const handleResize = () => {
      const vv = window.visualViewport;
      
      // On iOS, if the keyboard is open, the visual viewport height becomes significantly
      // smaller than window.innerHeight (e.g. > 120px difference).
      const isKeyboardOpen = vv ? (window.innerHeight - vv.height > 120) : false;
      
      if (isKeyboardOpen && vv) {
        document.documentElement.style.setProperty('--app-height', `${vv.height}px`);
      } else {
        document.documentElement.style.setProperty('--app-height', '100%');
      }
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    // Initial call
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Prevent iOS page-level scrolling/bouncing on input focus
  useEffect(() => {
    const preventScroll = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', preventScroll);
    return () => {
      window.removeEventListener('scroll', preventScroll);
    };
  }, []);

  // Handle mobile tab switcher closing sidebar
  const handleSwitchTab = (tabId: string) => {
    setCurrentTab(tabId);
    setSidebarOpen(false);
  };

  // Shared broker data mapper — handles both number and string values from different sources
  const mapBroker = React.useCallback((b: any): Broker => {
    const toNum = (v: any) => typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '')) || 0;
    const balance = toNum(b.balance);
    const equity  = toNum(b.equity);
    const pnl     = toNum(b.pnl);
    const fmt     = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return {
      name:                b.name,
      balance:             fmt(balance),
      pnl:                 (pnl >= 0 ? '+' : '') + fmt(pnl),
      equity:              fmt(equity),
      acc:                 b.id || b.login,
      status:              b.status,
      timezone_offset:     b.timezone_offset,
      broker_timezone_name: b.broker_timezone_name,
      allowed_symbols:     b.allowed_symbols,
    };
  }, []);

  // Auto-poll: refetch balances every 5s while any broker is still connecting or has $0 balance.
  // Polls for up to 120 seconds (24 attempts) before giving up.
  const startBalancePoll = React.useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollAttemptsRef.current = 0;

    const poll = async () => {
      if (pollAttemptsRef.current >= 24) return; // give up after ~120s
      pollAttemptsRef.current += 1;
      try {
        const res = await fetch('/api/broker');
        const data = await res.json();
        if (Array.isArray(data.brokers)) {
          const mapped = data.brokers.map(mapBroker);
          setBrokers(mapped);
          // Keep polling if any broker is still 'connecting' or has $0 balance.
          // 'connecting' covers: starting, waking, or orchestrator status mismatch.
          const stillWaiting = mapped.some(
            (b: Broker) => b.status === 'connecting' || b.balance === '0.00'
          );
          if (stillWaiting && pollAttemptsRef.current < 24) {
            pollTimerRef.current = setTimeout(poll, 5000);
          }
        }
      } catch {
        // silently retry
        pollTimerRef.current = setTimeout(poll, 5000);
      }
    };

    // First poll after 4 seconds
    pollTimerRef.current = setTimeout(poll, 4000);
  }, []);

  const fetchPlan = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('profiles').select('plan, daily_signals_used, phone_verified').eq('id', user.id).maybeSingle();
        console.log('CLIENT FETCH PLAN DATA:', data, 'ERROR:', error);
        if (data) {
          if (data.plan) {
            setIsFree(data.plan === 'free' || data.plan === 'starter');
          }
          const { data: configData } = await supabase
            .from('platform_config')
            .select('value')
            .eq('key', 'phone_verification_required')
            .maybeSingle();

          const isRequired = configData?.value !== false && configData?.value !== 'false';

          if (isRequired) {
            const isCookieVerified = typeof window !== 'undefined' && (localStorage.getItem('tgpt_phone_verified') === 'true' || document.cookie.includes('phone_verified=true'));
            const isVerified = Boolean(data?.phone_verified) || isCookieVerified;
            setPhoneVerified(isVerified);
            if (!isVerified) {
              window.location.href = '/verify-phone';
              return;
            }
          } else {
            setPhoneVerified(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load user plan:', err);
    }
  }, []);

  // Load connected brokers and trade logs from server on mount
  useEffect(() => {
    const fetchBrokers = async () => {
      try {
        const res = await fetch('/api/broker');
        const data = await res.json();
        if (Array.isArray(data.brokers)) {
          const mapped = data.brokers.map(mapBroker);
          setBrokers(mapped);
          // Auto-poll if any broker is still connecting or has $0 (sidecar warming up)
          if (mapped.some((b: Broker) => b.status === 'connecting' || b.balance === '0.00')) {
            startBalancePoll();
          }
        }
      } catch (err) {
        console.error('Failed to load brokers:', err);
      }
    };

    const fetchTrades = async () => {
      try {
        const res = await fetch('/api/trades');
        const data = await res.json();
        if (data.trades) {
          setLogs(data.trades);
        }
      } catch (err) {
        console.error('Failed to load trade logs:', err);
      }
    };

    fetchBrokers();
    fetchTrades();
    fetchPlan();

    // Track session info (IP, geo, device) — fire-and-forget
    fetch('/api/session-track', { method: 'POST' }).catch(() => {});

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Listen to auth state changes to load plan metrics as soon as user session is restored
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        fetchPlan();
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPlan]);

  // Real-time balance polling: fetch broker status & balance every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/broker');
        const data = await res.json();
        if (Array.isArray(data.brokers)) {
          const mapped = data.brokers.map(mapBroker);
          setBrokers(mapped);
        }
      } catch (err) {
        console.error('[Balance Polling] Error fetching brokers:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [mapBroker, setBrokers]);

  // Add new broker node from pairing modal
  const handleAddBrokerNode = async (server: string, loginId: string, password: string) => {
    // Auto-derive display name from server (e.g. "ICMarketsSC-Live" → "ICMarketsSC")
    const derivedName = server.split('-')[0] || server;
    const displayName = `${derivedName}-${loginId}`;

    const connectingBroker: Broker = {
      name: displayName,
      balance: 'Connecting...',
      pnl: '0.00',
      equity: 'Connecting...',
      acc: loginId,
      status: 'connecting',
    };
    setBrokers((prev) => [...prev, connectingBroker]);
    setActiveBrokerId(loginId);

    try {
      const res = await fetch('/api/broker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginId, password, server }),
      });
      const data = await res.json();
      if (data.success && data.broker) {
        const b = data.broker;
        const mapped: Broker = {
          name: b.name,
          balance: b.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          pnl: (b.pnl >= 0 ? '+' : '') + b.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          equity: b.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          acc: b.login,
          status: b.status,
          timezone_offset: b.timezone_offset,
          broker_timezone_name: b.broker_timezone_name,
          allowed_symbols: b.allowed_symbols,
        };
        setBrokers((prev) => prev.map((item) => item.acc === loginId ? mapped : item));
        // Always start polling after connect — sidecar may need time to start up
        // (poll stops automatically once status reaches 'connected' or after 120s)
        startBalancePoll();
      } else {
        throw new Error(data.error || 'Failed to connect broker');
      }
    } catch (err: any) {
      // Remove the placeholder and let the error surface in the UI
      setBrokers((prev) => prev.filter((item) => item.acc !== loginId));
      // Re-throw so ModalNode can display the error message in its own UI
      throw err;
    }
  };

  // Disconnect a broker node
  const handleDisconnectBroker = async (acc: string) => {
    try {
      const res = await fetch('/api/broker', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId: acc }),
      });
      const data = await res.json();
      if (data.success) {
        setBrokers((prev) => prev.filter((b) => b.acc !== acc));
        // If disconnected broker was active, switch to first remaining
        if (activeBrokerId === acc) {
          const remaining = brokers.filter((b) => b.acc !== acc);
          setActiveBrokerId(remaining[0]?.acc || '');
        }
      } else {
        alert('Disconnect failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Disconnect failed: ' + err.message);
    }
  };

  // Refresh live balances
  const handleRefreshBalances = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/broker');
      const data = await res.json();
      if (Array.isArray(data.brokers)) {
        const mapped = data.brokers.map(mapBroker);
        setBrokers(mapped);
        if (mapped.some((b: Broker) => b.balance === '0.00')) {
          startBalancePoll();
        }
      }
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle sending messages via live API
  const handleSendMessage = async (text: string, forceSignal?: boolean) => {
    const trimmed = text.trim();

    // ── Command Interceptors (Client-Side) ───────────────────
    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();

      if (cmd === '/clear') {
        setMessages([]);
        return;
      }

      if (cmd === '/watchlist') {
        const list = activeBroker.allowed_symbols && activeBroker.allowed_symbols.length > 0
          ? activeBroker.allowed_symbols
          : ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'NAS100', 'US30', 'OIL', 'SP500'];

        const userMsg: ChatMessage = {
          id: `msg-${Date.now()}-user`,
          sender: 'user',
          text,
        };
        const botReply: ChatMessage = {
          id: `msg-${Date.now()}-bot`,
          sender: 'bot',
          text: `### 📋 Active Watchlist\nHere are the permitted instruments for your connected account **${activeBroker.name}**:\n\n` +
            list.map(s => `* **${s}**`).join('\n') +
            `\n\nClick any of these assets or type their name to analyze them.`,
        };
        setMessages(prev => [...prev, userMsg, botReply]);
        return;
      }
    }

    const isAstroCommand = trimmed.toLowerCase().startsWith('/astro');
    const isSignalCommand = trimmed.toLowerCase().startsWith('/signal');

    const newUserMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text,
    };

    // Don't show user message for button-triggered signals
    if (!forceSignal) {
      setMessages((prev) => [...prev, newUserMessage]);
    }

    // Show typing indicator
    const typingId = `msg-${Date.now()}-typing`;
    const typingMessage: ChatMessage = {
      id: typingId,
      sender: 'bot',
      text: '__TYPING__',
    };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      // Build conversation history for context
      const conversationHistory = [...messages, newUserMessage].map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text || '',
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          accountBalance: activeBroker.balance,
          forceSignal: forceSignal || isSignalCommand,
          activeBrokerId: activeBroker.acc,
          astroMode: astroMode || isAstroCommand,
        }),
      });

      const data = await response.json();

      // Remove typing indicator and add real response
      const botReply: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        sender: 'bot',
        text: data.text || undefined,
        ticket: data.ticket || undefined,
        signalSymbol: data.signalSymbol || undefined,
        marketData: data.marketData || undefined,
        gating: data.gating || undefined,
        astroGate: data.astroGate || undefined,
        screenerData: data.screenerData || undefined,
      };

      setMessages((prev) =>
        prev.filter((m) => m.id !== typingId).concat(botReply)
      );

      fetchPlan();

    } catch (error) {
      // Remove typing indicator and show error
      const errorReply: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        sender: 'bot',
        text: 'Signal engine connection failed. Please check your network and try again.',
      };
      setMessages((prev) =>
        prev.filter((m) => m.id !== typingId).concat(errorReply)
      );
    }
  };

  // Handle "Generate Signal" button click
  const handleGenerateSignal = (symbolKeyword: string) => {
    handleSendMessage(`generate trade signal for ${symbolKeyword}`, true);
  };

  return (
    <div 
      className="flex overflow-hidden w-full relative"
      style={{ height: 'var(--app-height, 100dvh)' }}
    >
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        switchTab={handleSwitchTab}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        astroMode={astroMode}
        userPlan={isFree ? 'free' : 'pro'}
        dailySignalsUsed={dailySignalsUsed}
        connectedBrokersCount={brokers.length}
      />

      {/* Main viewport */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        <Header
          brokers={brokers}
          activeBroker={activeBroker}
          onSelectBroker={setActiveBrokerId}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onRefresh={handleRefreshBalances}
          isRefreshing={isRefreshing}
          astroMode={astroMode}
          onToggleAstroMode={handleToggleAstroMode}
          currentTab={currentTab}
        />

        {/* Unverified Mobile Floating Security Bar */}
        {!phoneVerified && (
          <div className="mx-4 my-2.5 p-3.5 px-5 rounded-2xl bg-[#0d0f17]/95 border border-amber-500/30 shadow-[0_4px_25px_rgba(0,0,0,0.6)] backdrop-blur-xl flex items-center justify-between gap-4 text-xs shrink-0 animate-fadeIn">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Mobile Identity Verification Required</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-400">
                    ACTION REQUIRED
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">
                  Authenticate your mobile phone number to enable SMS alerts and secure your trading terminal account.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPhoneModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#ff3c00] via-[#ff5500] to-[#e03500] hover:shadow-[0_0_20px_rgba(255,60,0,0.4)] text-white font-bold rounded-xl transition-all duration-300 text-xs shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>Verify Mobile</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Tab display contents */}
        <div id="scroll-area" className={`flex-1 no-scrollbar relative flex flex-col bg-[var(--bg)] ${currentTab === 'terminal' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {currentTab === 'terminal' && (
            <TerminalTab
              messages={messages}
              onSendMessage={handleSendMessage}
              onGenerateSignal={handleGenerateSignal}
              activeBrokerId={activeBroker.acc}
              allowedSymbols={activeBroker.allowed_symbols}
              onOpenManager={() => setCurrentTab('manager')}
              astroMode={astroMode}
              onSwitchTab={setCurrentTab}
              onTradeExecuted={(result) => {
                const t = result.ticket;
                // Prepend the new trade locally matching DB schema
                setLogs((prev) => [
                  {
                    symbol: t.symbol,
                    action: t.action || 'BUY',
                    volume: parseFloat(t.lotVolume) || 0.01,
                    entry_price: result.fillPrice || parseFloat(t.entryPrice) || 0,
                    stop_loss: parseFloat(t.stopLoss) || null,
                    take_profit: parseFloat(t.takeProfit) || null,
                    status: 'open',
                    order_id: String(result.orderId),
                    created_at: new Date().toISOString(),
                  },
                  ...prev,
                ]);

                // Background fetch to ensure all data is in sync
                fetch('/api/trades')
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.trades) setLogs(data.trades);
                  })
                  .catch((err) => console.error('Failed to refresh trades:', err));

                // Update broker balance
                setBrokers((prevBrokers) =>
                  prevBrokers.map((b) => {
                    if (b.acc === activeBroker.acc) {
                      const currentBal = parseFloat(b.balance.replace(/,/g, ''));
                      const marginUsed = parseFloat(t.margin?.replace(/,/g, '')) || 0;
                      const newBalance = currentBal - marginUsed;
                      const newEquity = newBalance + (parseFloat(b.pnl) || 0);
                      return {
                        ...b,
                        balance: newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        equity: newEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                      };
                    }
                    return b;
                  })
                );
              }}
            />
          )}

          {currentTab === 'manager' && (
            <Suspense fallback={<TabSkeleton />}>
              <ManagerTab
                activeBrokerId={activeBroker.acc}
                allowedSymbols={activeBroker.allowed_symbols}
                onNavigateToTerminal={() => setCurrentTab('terminal')}
                onAccountUpdate={(info) => {
                  setBrokers(prev => prev.map(b => {
                    if (b.acc === activeBroker.acc) {
                      return {
                        ...b,
                        balance: info.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        equity: info.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        pnl: (info.pnl >= 0 ? '+' : '') + info.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                      };
                    }
                    return b;
                  }));
                }}
                isFree={isFree}
              />
            </Suspense>
          )}

          {currentTab === 'brokers' && (
            <Suspense fallback={<TabSkeleton />}>
              <BrokersTab
                brokers={brokers}
                onOpenModal={() => {
                  const maxAllowed = isFree ? 1 : 5;
                  if (brokers.length >= maxAllowed) {
                    setBrokerLimitModalOpen(true);
                  } else {
                    setModalOpen(true);
                  }
                }}
                onDisconnect={handleDisconnectBroker}
                onRefresh={handleRefreshBalances}
                isRefreshing={isRefreshing}
              />
            </Suspense>
          )}

          {currentTab === 'history' && (
            <Suspense fallback={<TabSkeleton />}>
              <HistoryTab logs={logs} activeBrokerId={activeBroker.acc} />
            </Suspense>
          )}

          {currentTab === 'referral' && (
            <Suspense fallback={<TabSkeleton />}>
              <ReferralTab partners={partners} switchTab={setCurrentTab} />
            </Suspense>
          )}

          {currentTab === 'courses' && (
            <Suspense fallback={<TabSkeleton />}>
              <CoursesTab />
            </Suspense>
          )}

          {currentTab === 'profile' && (
            <Suspense fallback={<TabSkeleton />}>
              <ProfileTab theme={theme} switchTab={setCurrentTab} />
            </Suspense>
          )}

          {currentTab === 'subscription' && (
            <Suspense fallback={<TabSkeleton />}>
              <SubscriptionTab onBack={() => setCurrentTab('profile')} />
            </Suspense>
          )}

          {currentTab === 'billing' && (
            <Suspense fallback={<TabSkeleton />}>
              <BillingTab switchTab={setCurrentTab} />
            </Suspense>
          )}

          {currentTab === 'astro-performance' && (
            <Suspense fallback={<TabSkeleton />}>
              <AstroPerformanceTab />
            </Suspense>
          )}
        </div>
      </main>

      {/* MT5 Account linking dialog */}
      <ModalNode
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnect={handleAddBrokerNode}
      />

      {/* Astro Mode First-Activation Disclaimer Modal */}
      <AstroDisclaimerModal
        isOpen={showAstroDisclaimer}
        onClose={() => setShowAstroDisclaimer(false)}
        onAccept={() => {
          localStorage.setItem('astroDisclaimerAccepted', 'true');
          setShowAstroDisclaimer(false);
          toggleAstroModeActive(true);
        }}
      />

      {/* Broker limit reached modal */}
      <BrokerLimitModal
        isOpen={brokerLimitModalOpen}
        onClose={() => setBrokerLimitModalOpen(false)}
        onUpgrade={() => setCurrentTab('subscription')}
        isFree={isFree}
        brokersCount={brokers.length}
      />

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        isOpen={phoneModalOpen}
        onSuccess={() => {
          setPhoneVerified(true);
          setPhoneModalOpen(false);
        }}
        onCancel={() => setPhoneModalOpen(false)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <svg className="animate-spin w-8 h-8 text-amber-500 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Loading TradeGPT Interface...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </React.Suspense>
  );
}
