'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ModalNode from '@/components/ModalNode';
import TerminalTab from '@/components/TerminalTab';
import BrokersTab from '@/components/BrokersTab';
import HistoryTab from '@/components/HistoryTab';
import ReferralTab from '@/components/ReferralTab';
import { Broker, ChatMessage, Partner, TradeLog } from '@/types';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('terminal');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [modalOpen, setModalOpen] = useState(false);

  // Initial Brokers Data
  const [brokers, setBrokers] = useState<Broker[]>([
    { name: 'Vantage-Real-01', balance: '12,450.00', pnl: '+240.12', equity: '12,690.12', acc: '882910' },
    { name: 'IC-Markets-Pro', balance: '5,200.50', pnl: '-120.00', equity: '5,080.50', acc: '110922' },
  ]);
  const [activeBrokerName, setActiveBrokerName] = useState('Vantage-Real-01');

  // Find currently active broker data
  const activeBroker = brokers.find((b) => b.name === activeBrokerName) || brokers[0];

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
    { name: 'Alpha_Quant', portfolio: '42,481.68', rebate: '622.01', commission: '124.40', status: 'Active' },
    { name: 'Retail_King', portfolio: '12,400.00', rebate: '88.20', commission: '17.60', status: 'Active' },
    { name: 'Scalp_Hunter', portfolio: '89,120.50', rebate: '142.10', commission: '28.42', status: 'Active' },
    { name: 'Institutional_Void', portfolio: '540,200.00', rebate: '1,240.00', commission: '248.00', status: 'Active' },
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

  // Handle mobile tab switcher closing sidebar
  const handleSwitchTab = (tabId: string) => {
    setCurrentTab(tabId);
    setSidebarOpen(false);
  };

  // Add new broker node from pairing modal
  const handleAddBrokerNode = (name: string, loginId: string) => {
    const newBroker: Broker = {
      name,
      balance: '0.00',
      pnl: '0.00',
      equity: '0.00',
      acc: loginId,
    };
    setBrokers((prev) => [...prev, newBroker]);
    setActiveBrokerName(name);
  };

  // Handle dynamic chatbot trade parsing simulation
  const handleSendMessage = (text: string) => {
    const newUserMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, newUserMessage]);

    // Delayed bot response simulation with ticket parameter payload
    setTimeout(() => {
      const ticketId = Math.floor(10000 + Math.random() * 90000).toString();
      const botReply: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        sender: 'bot',
        ticket: {
          ticketId,
          symbol: 'XAUUSD',
          action: 'BUY',
          entryPrice: '2341.20',
          lotVolume: '0.50 Lots',
          rrRatio: '1 : 3.2',
          stopLoss: '2335.00',
          takeProfit: '2360.00',
          margin: '234.12',
          risk: '31.00',
          profit: '94.00',
        },
      };
      setMessages((prev) => [...prev, botReply]);
    }, 600);
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
        />

        {/* Tab display contents */}
        <div id="scroll-area" className={`flex-1 no-scrollbar relative flex flex-col bg-[var(--bg)] ${currentTab === 'terminal' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {currentTab === 'terminal' && (
            <TerminalTab messages={messages} onSendMessage={handleSendMessage} />
          )}

          {currentTab === 'brokers' && (
            <BrokersTab brokers={brokers} onOpenModal={() => setModalOpen(true)} />
          )}

          {currentTab === 'history' && (
            <HistoryTab logs={logs} />
          )}

          {currentTab === 'referral' && (
            <ReferralTab partners={partners} />
          )}
        </div>
      </main>

      {/* MT5 Account linking dialog */}
      <ModalNode
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddNode={handleAddBrokerNode}
      />
    </div>
  );
}
