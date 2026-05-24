'use client';

import React, { useState } from 'react';
import { Menu, ChevronDown, Sun, Moon } from 'lucide-react';
import { Broker } from '../types';

interface HeaderProps {
  brokers: Broker[];
  activeBroker: Broker;
  onSelectBroker: (name: string) => void;
  onToggleSidebar: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Header({
  brokers,
  activeBroker,
  onSelectBroker,
  onToggleSidebar,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleBrokerClick = (name: string) => {
    onSelectBroker(name);
    setDropdownOpen(false);
  };

  const isPositivePnl = activeBroker.pnl.startsWith('+');

  return (
    <header className="flex flex-col z-40 bg-[var(--bg)] shrink-0 pt-[env(safe-area-inset-top)]">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={onToggleSidebar}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--input-bg)] transition text-[var(--subtext)]"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Broker Dropdown Selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center px-4 py-1.5 rounded-lg hover:bg-[var(--input-bg)] font-bold text-sm transition"
          >
            <span>{activeBroker.name}</span>
            <ChevronDown className="w-3.5 h-3.5 ml-2 opacity-50 shrink-0" />
          </button>

          {dropdownOpen && (
            <>
              {/* Overlay to close dropdown on click outside */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-xl shadow-xl p-2 z-50">
                <div className="space-y-1">
                  {brokers.map((b) => (
                    <button
                      key={b.name}
                      onClick={() => handleBrokerClick(b.name)}
                      className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 transition"
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--input-bg)] transition text-[var(--subtext)]"
          aria-label="Toggle Theme Mode"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Account Info Cards */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between p-3 px-6 border border-[var(--border)] bg-[var(--sidebar-bg)] rounded-xl shadow-sm">
          <div className="flex items-center space-x-10 md:space-x-16 overflow-x-auto no-scrollbar">
            <div className="flex flex-col shrink-0">
              <span className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-1">Balance</span>
              <span className="text-xs font-bold font-mono">${activeBroker.balance}</span>
            </div>
            <div className="flex flex-col shrink-0">
              <span className={`text-[9px] font-bold uppercase mb-1 ${isPositivePnl ? 'text-green-600' : 'text-red-500'}`}>
                Net P/L
              </span>
              <span className={`text-xs font-bold font-mono ${isPositivePnl ? 'text-green-600' : 'text-red-500'}`}>
                {activeBroker.pnl}
              </span>
            </div>
            <div className="flex flex-col shrink-0">
              <span className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-1">Equity</span>
              <span className="text-xs font-bold font-mono">${activeBroker.equity}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 ml-2">
            <span className="status-dot"></span>
          </div>
        </div>
      </div>
    </header>
  );
}
