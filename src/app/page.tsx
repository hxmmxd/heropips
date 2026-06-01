'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ModalNode from '@/components/ModalNode';
import TerminalTab from '@/components/TerminalTab';
import BrokersTab from '@/components/BrokersTab';
import HistoryTab from '@/components/HistoryTab';
import ReferralTab from '@/components/ReferralTab';
import ProfileTab from '@/components/ProfileTab';
import SubscriptionTab from '@/components/SubscriptionTab';
import { Broker, ChatMessage, Partner, TradeLog } from '@/types';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('terminal');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [modalOpen, setModalOpen] = useState(false);

  // Initial Brokers Data
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [activeBrokerName, setActiveBrokerName] = useState('');

  // Find currently active broker data
  const defaultBroker: Broker = { name: 'No Broker', balance: '0.00', pnl: '0.00', equity: '0.00', acc: 'none' };
  const activeBroker = brokers.find((b) => b.name === activeBrokerName) || brokers[0] || defaultBroker;

  // Chat Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Stable logs data
  const [logs, setLogs] = useState<TradeLog[]>([
    { symbol: 'XAUUSD', action: 'BUY', orderId: '882100', amount: '243.50', isWin: true },
    { symbol: 'EURUSD', action: 'SELL', orderId: '882101', amount: '89.20', isWin: false },
    { symbol: 'BTCUSD', action: 'BUY', orderId: '882102', amount: '412.10', isWin: true },
    { symbol: 'NAS100', action: 'SELL', orderId: '882103', amount: '315.00', isWin: false },
    { symbol: 'US30', action: 'BUY', orderId: '882104', amount: '124.00', isWin: true },
    { symbol: 'XRPUSD', action: 'BUY', orderId: '882105', amount: '45.80', isWin: true },
    { symbol: 'ETHUSD', action: 'SELL', orderId: '882106', amount: '210.50', isWin: false },
    { symbol: 'GBPUSD', action: 'BUY', orderId: '882107', amount: '180.20', isWin: true },
    { symbol: 'USOIL', action: 'SELL', orderId: '882108', amount: '95.00', isWin: false },
    { symbol: 'USDJPY', action: 'BUY', orderId: '882109', amount: '320.00', isWin: true },
  ]);

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

  // Load connected brokers from server on mount
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
          })));
        }
      } catch (err) {
        console.error('Failed to load brokers:', err);
      }
    };
    fetchBrokers();
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
      />

      {/* Main viewport */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        <Header
          brokers={brokers}
          activeBroker={activeBroker}
          onSelectBroker={setActiveBrokerName}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onRefresh={handleRefreshBalances}
        />

        {/* Tab display contents */}
        <div id="scroll-area" className={`flex-1 no-scrollbar relative flex flex-col bg-[var(--bg)] ${currentTab === 'terminal' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {currentTab === 'terminal' && (
            <TerminalTab
              messages={messages}
              onSendMessage={handleSendMessage}
              onGenerateSignal={handleGenerateSignal}
              activeBrokerId={activeBroker.acc}
              onTradeExecuted={(result) => {
                // Log the trade
                const t = result.ticket;
                setLogs((prev) => [{
                  symbol: t.symbol,
                  action: t.action || 'BUY',
                  orderId: result.orderId,
                  amount: t.risk,
                  isWin: Math.random() > 0.4,
                }, ...prev]);

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

          {currentTab === 'brokers' && (
            <BrokersTab brokers={brokers} onOpenModal={() => setModalOpen(true)} onDisconnect={handleDisconnectBroker} />
          )}

          {currentTab === 'history' && (
            <HistoryTab logs={logs} />
          )}

          {currentTab === 'referral' && (
            <ReferralTab partners={partners} />
          )}

          {currentTab === 'profile' && (
            <ProfileTab theme={theme} switchTab={setCurrentTab} />
          )}

          {currentTab === 'subscription' && (
            <SubscriptionTab onBack={() => setCurrentTab('profile')} />
          )}
        </div>
      </main>

      {/* MT5 Account linking dialog */}
      <ModalNode
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnect={handleAddBrokerNode}
      />
    </div>
  );
}
