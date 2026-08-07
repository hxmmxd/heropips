'use client';

import React, { useState, useEffect } from 'react';
import { Menu, ChevronDown, RefreshCw, Bell, Moon, Sun } from 'lucide-react';
import { Broker } from '../types';
import { cleanBrokerName } from '@/utils/broker';

interface HeaderProps {
  brokers: Broker[];
  activeBroker: Broker;
  onSelectBroker: (acc: string) => void;
  onToggleSidebar: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  currentTab?: string;
}



export default function Header({
  brokers,
  activeBroker,
  onSelectBroker,
  onToggleSidebar,
  onRefresh,
  isRefreshing = false,

  currentTab,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const getDotColor = () => {
    if (!activeBroker || activeBroker.acc === 'none') return '#ef4444'; // red when not connected
    const s = (activeBroker.status || '').toLowerCase();
    if (s === 'connected') return '#22c55e'; // green
    if (s === 'connecting' || s === 'starting' || s === 'waking') return '#f59e0b'; // amber
    return '#ef4444'; // red (timeout, error, disconnected)
  };



  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    try {
      await onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBrokerClick = (acc: string) => {
    onSelectBroker(acc);
    setDropdownOpen(false);
  };

  const isPositivePnl = activeBroker.pnl.startsWith('+');
  const isSubscriptionTab = currentTab === 'subscription';

  return (
    <header className="flex flex-col z-40 bg-[var(--bg)] shrink-0 pwa-top-padding">

      {/* ── Top Navbar ── */}
      <div className="flex items-center justify-between px-4 py-2">

        {/* Left Side: Hamburger (mobile) */}
        <div className="flex-1">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--input-bg)] transition text-[var(--subtext)]"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Broker Dropdown */}
        <div className={`flex justify-center flex-1 relative ${isSubscriptionTab ? 'lg:hidden' : ''}`}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center px-4 py-1.5 rounded-lg hover:bg-[var(--input-bg)] font-bold text-sm transition max-w-full"
              >
                <span className="truncate whitespace-nowrap">{cleanBrokerName(activeBroker.name)}</span>
                <ChevronDown className="w-3.5 h-3.5 ml-2 opacity-50 shrink-0" />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-56 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-xl shadow-xl p-2 z-50">
                    <div className="space-y-1">
                      {brokers.map((b) => (
                        <button
                          key={b.acc}
                          onClick={() => handleBrokerClick(b.acc)}
                          className="w-full text-left px-4 py-2 rounded-lg hover:bg-[var(--accent)] hover:text-[var(--on-volt)] transition flex flex-col items-start gap-0.5"
                        >
                          <span className="text-xs font-bold">{cleanBrokerName(b.name)}</span>
                          {b.acc && b.acc !== 'none' && (
                            <span className="text-[10px] opacity-60 font-mono">ID: #{b.acc}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

        {/* Right Side: Notifications & Theme */}
        <div className="flex-1 flex justify-end items-center gap-1">
          <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--input-bg)] transition text-[var(--subtext)]" aria-label="Toggle Theme">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--input-bg)] transition text-[var(--subtext)]" aria-label="Notifications">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Account Info Bar ── */}
      <div className={`px-4 pb-2 ${isSubscriptionTab ? 'lg:hidden' : ''}`}>
          <div className="flex items-center justify-between p-3 px-6 border border-[var(--border)] bg-[var(--sidebar-bg)] rounded-2xl shadow-sm">
            <div className="flex items-center space-x-10 md:space-x-16 overflow-x-auto no-scrollbar">
              <div className="flex flex-col shrink-0">
                <span className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-1">Balance</span>
                <span className="text-xs font-bold font-mono">${activeBroker.balance}</span>
              </div>
              <div className="flex flex-col shrink-0">
                <span className={`text-[9px] font-bold uppercase mb-1 ${isPositivePnl ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                  Net P/L
                </span>
                <span className={`text-xs font-bold font-mono ${isPositivePnl ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                  {activeBroker.pnl}
                </span>
              </div>
              <div className="flex flex-col shrink-0">
                <span className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-1">Equity</span>
                <span className="text-xs font-bold font-mono">${activeBroker.equity}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 ml-2">
              {onRefresh && activeBroker.acc !== 'none' && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-1 rounded-md hover:bg-[var(--input-bg)] text-[var(--subtext)] hover:text-[var(--text)] transition disabled:opacity-50 flex items-center justify-center mr-1"
                  title="Refresh Live Balance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
              <span
                className="status-dot"
                style={{ '--dot-color': getDotColor() } as React.CSSProperties}
                title={activeBroker.status ? `Status: ${activeBroker.status.toUpperCase()}` : undefined}
              />
            </div>
          </div>
        </div>
    </header>
  );
}
