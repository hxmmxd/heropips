'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ModalNode from '@/components/ModalNode';
import TerminalTab from '@/components/TerminalTab';
import ManagerTab from '@/components/ManagerTab';
import BrokersTab from '@/components/BrokersTab';
import HistoryTab from '@/components/HistoryTab';
import ReferralTab from '@/components/ReferralTab';
import ProfileTab from '@/components/ProfileTab';
import SubscriptionTab from '@/components/SubscriptionTab';
import CoursesTab from '@/components/CoursesTab';
import AstroPerformanceTab from '@/components/AstroPerformanceTab';
import { Broker, ChatMessage, Partner, TradeLog } from '@/types';

function HomeContent() {
  const [currentTab, setCurrentTab] = useState('terminal');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [modalOpen, setModalOpen] = useState(false);
  const [astroMode, setAstroMode] = useState(false);
  const [showAstroDisclaimer, setShowAstroDisclaimer] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  // Initial Brokers Data
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [activeBrokerName, setActiveBrokerName] = useState('');

  // Find currently active broker data
  const defaultBroker: Broker = { name: 'No Broker', balance: '0.00', pnl: '0.00', equity: '0.00', acc: 'none' };
  const activeBroker = brokers.find((b) => b.name === activeBrokerName) || brokers[0] || defaultBroker;

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
      const height = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
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

  // Load connected brokers and trade logs from server on mount
  useEffect(() => {
    const fetchBrokers = async () => {
      try {
        const res = await fetch('/api/broker');
        const data = await res.json();
        if (data.brokers?.length > 0) {
          setBrokers(data.brokers.map((b: any) => ({
            name: b.name,
            balance: b.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            pnl: (b.pnl >= 0 ? '+' : '') + b.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            equity: b.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            acc: b.id || b.login,  // prefer MetaAPI UUID for trade execution
            timezone_offset: b.timezone_offset,
            broker_timezone_name: b.broker_timezone_name,
            allowed_symbols: b.allowed_symbols,
          })));
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

    // Track session info (IP, geo, device) — fire-and-forget
    fetch('/api/session-track', { method: 'POST' }).catch(() => {});
  }, []);

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
    };
    setBrokers((prev) => [...prev, connectingBroker]);
    setActiveBrokerName(displayName);

    try {
      const res = await fetch('/api/broker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginId, password, server }),
      });
      const data = await res.json();
      if (data.success && data.broker) {
        const b = data.broker;
        setBrokers((prev) =>
          prev.map((item) =>
            item.acc === loginId
              ? {
                  name: b.name,
                  balance: b.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                  pnl: (b.pnl >= 0 ? '+' : '') + b.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                  equity: b.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                  acc: b.login,
                  timezone_offset: b.timezone_offset,
                  broker_timezone_name: b.broker_timezone_name,
                  allowed_symbols: b.allowed_symbols,
                }
              : item
          )
        );
      } else {
        throw new Error(data.error || 'Failed to connect broker');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Connection failed: ${err.message}`);
      setBrokers((prev) => prev.filter((item) => item.acc !== loginId));
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
        if (activeBrokerName?.includes(acc)) {
          const remaining = brokers.filter((b) => b.acc !== acc);
          setActiveBrokerName(remaining[0]?.name || '');
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
    try {
      const res = await fetch('/api/broker');
      const data = await res.json();
      if (data.brokers?.length > 0) {
        setBrokers(data.brokers.map((b: any) => ({
          name: b.name,
          balance: b.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          pnl: (b.pnl >= 0 ? '+' : '') + b.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          equity: b.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          acc: b.id || b.login,
          timezone_offset: b.timezone_offset,
          broker_timezone_name: b.broker_timezone_name,
          allowed_symbols: b.allowed_symbols,
        })));
      }
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    }
  };

  // Handle sending messages via live API
  const handleSendMessage = async (text: string, forceSignal?: boolean) => {
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
          forceSignal: forceSignal || false,
          activeBrokerId: activeBroker.acc,
          astroMode: astroMode,
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
      };

      setMessages((prev) =>
        prev.filter((m) => m.id !== typingId).concat(botReply)
      );

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
      />

      {/* Main viewport */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        <Header
          brokers={brokers}
          activeBroker={activeBroker}
          onSelectBroker={setActiveBrokerName}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onRefresh={handleRefreshBalances}
          astroMode={astroMode}
          onToggleAstroMode={handleToggleAstroMode}
        />

        {/* Tab display contents */}
        <div id="scroll-area" className={`flex-1 no-scrollbar relative flex flex-col bg-[var(--bg)] ${currentTab === 'terminal' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {currentTab === 'terminal' && (
            <TerminalTab
              messages={messages}
              onSendMessage={handleSendMessage}
              onGenerateSignal={handleGenerateSignal}
              activeBrokerId={activeBroker.acc}
              onOpenManager={() => setCurrentTab('manager')}
              astroMode={astroMode}
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
            />
          )}

          {currentTab === 'brokers' && (
            <BrokersTab brokers={brokers} onOpenModal={() => setModalOpen(true)} onDisconnect={handleDisconnectBroker} />
          )}

          {currentTab === 'history' && (
            <HistoryTab logs={logs} />
          )}

          {currentTab === 'referral' && (
            <ReferralTab partners={partners} switchTab={setCurrentTab} />
          )}

          {currentTab === 'courses' && (
            <CoursesTab />
          )}

          {currentTab === 'profile' && (
            <ProfileTab theme={theme} switchTab={setCurrentTab} />
          )}

          {currentTab === 'subscription' && (
            <SubscriptionTab onBack={() => setCurrentTab('profile')} />
          )}

          {currentTab === 'astro-performance' && (
            <AstroPerformanceTab />
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
      {showAstroDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="max-w-md w-full bg-slate-950/90 border border-amber-500/30 rounded-3xl p-6 text-white shadow-[0_0_30px_rgba(245,158,11,0.15)] animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              🪐 Astro Mode Activation
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Astro Mode integrates experimental celestial telemetry overlays—including geocentric planetary velocities, lunar aspects, and seasonal solar alignments—into TradeGPT's risk management architecture.
            </p>
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3.5 space-y-2 mb-4">
              <h4 className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">System Protocols:</h4>
              <ul className="text-[10px] text-amber-100/80 space-y-1.5 list-disc pl-4">
                <li>Mercury Retrograde enforces a strict <strong>hard-block</strong> on trade tickets.</li>
                <li>Position sizing is scaled dynamically by lunar cycles and elements.</li>
                <li>These parameters are computational overlays and are <strong>not financial advice</strong>.</li>
              </ul>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer mb-6 select-none">
              <input
                type="checkbox"
                id="disclaimer-checkbox"
                checked={disclaimerChecked}
                onChange={(e) => setDisclaimerChecked(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/50"
              />
              <span className="text-[10px] text-slate-400 font-medium leading-tight">
                I understand that celestial gating is analytical telemetry. I accept all risks associated with executing orders.
              </span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAstroDisclaimer(false);
                  setDisclaimerChecked(false);
                }}
                className="flex-1 py-3 rounded-xl border border-slate-800 text-[10px] font-bold uppercase tracking-wider hover:bg-white/5 transition"
              >
                Decline
              </button>
              <button
                id="accept-astro-btn"
                disabled={!disclaimerChecked}
                onClick={() => {
                  localStorage.setItem('astroDisclaimerAccepted', 'true');
                  setShowAstroDisclaimer(false);
                  setDisclaimerChecked(false);
                  toggleAstroModeActive(true);
                }}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Accept & Enable
              </button>
            </div>
          </div>
        </div>
      )}
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
