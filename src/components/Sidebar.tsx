'use client';

import React from 'react';
import { Terminal, Server, Receipt, Network, X } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  switchTab: (tabId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ currentTab, switchTab, isOpen, onToggle }: SidebarProps) {
  const navItems = [
    { id: 'terminal', label: 'AI Terminal', icon: Terminal },
    { id: 'brokers', label: 'Live Brokers', icon: Server },
    { id: 'history', label: 'Trade Logs', icon: Receipt },
    { id: 'referral', label: 'Referral Hub', icon: Network },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/45 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:relative z-[60] w-72 h-full bg-[var(--sidebar-bg)] border-r border-[var(--border)] shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Logo and Mobile Close */}
          <div className="flex items-center justify-between mb-8 px-2">
            <span className="font-bold text-sm tracking-tight uppercase">TradeGPT</span>
            <button
              onClick={onToggle}
              className="lg:hidden text-[var(--subtext)] p-2 hover:opacity-80 transition"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => switchTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium transition duration-200 ${
                    isActive ? 'active-nav' : 'text-[var(--subtext)]'
                  }`}
                >
                  <Icon className="w-5 h-5 text-center shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile Footer */}
          <div className="pt-6 border-t border-[var(--border)]">
            <div className="flex items-center space-x-3 p-3 bg-black/5 dark:bg-white/5 rounded-2xl">
              <img
                src="https://ui-avatars.com/api/?name=Admin&background=2563eb&color=fff"
                alt="Admin Avatar"
                className="w-8 h-8 rounded-full"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate">Premium Partner</p>
                <p className="text-[9px] uppercase font-bold text-blue-500 tracking-widest mt-1">
                  Institutional
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
