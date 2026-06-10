'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, Server, Receipt, Network, X, LogOut, Settings, ChevronUp, BarChart3, GraduationCap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUserAvatar } from '@/lib/avatar';

interface SidebarProps {
  currentTab: string;
  switchTab: (tabId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ currentTab, switchTab, isOpen, onToggle }: SidebarProps) {
  const [user, setUser] = useState<any>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const avatarUrl = getUserAvatar({
    avatar_url: user?.user_metadata?.avatar_url,
    id: user?.id,
    full_name: userName,
    email: userEmail,
  });

  const navItems = [
    { id: 'terminal', label: 'AI Terminal', icon: Terminal },
    { id: 'manager', label: 'Manager', icon: BarChart3 },
    { id: 'brokers', label: 'Live Brokers', icon: Server },
    { id: 'history', label: 'Trade Logs', icon: Receipt },
    { id: 'referral', label: 'Referral Hub', icon: Network },
    { id: 'courses', label: 'Courses', icon: GraduationCap },
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
          <div className="pt-6 border-t border-[var(--border)] relative">
            {/* Profile popup menu */}
            {profileMenuOpen && (
              <>
                <div className="fixed inset-0 z-[69]" onClick={() => setProfileMenuOpen(false)} />
                <div className="absolute bottom-full left-3 right-3 mb-2 z-[70] bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
                  <div className="p-3 border-b border-[var(--border)]">
                    <p className="text-xs font-semibold truncate">{userName}</p>
                    <p className="text-[10px] text-[var(--subtext)] truncate mt-0.5">{userEmail}</p>
                  </div>
                  <button
                    onClick={() => { switchTab('profile'); setProfileMenuOpen(false); }}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-[var(--subtext)] hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/5 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-full flex items-center space-x-3 p-3 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/8 dark:hover:bg-white/8 transition cursor-pointer"
            >
              <img
                src={avatarUrl}
                alt={`${userName} Avatar`}
                className="w-8 h-8 rounded-full shrink-0"
              />
              <div className="overflow-hidden flex-1 text-left">
                <p className="text-xs font-semibold truncate">{userName}</p>
                <p className="text-[9px] uppercase font-bold text-emerald-500 tracking-widest mt-0.5">
                  Free Plan
                </p>
              </div>
              <ChevronUp className={`w-4 h-4 text-[var(--subtext)] shrink-0 transition-transform ${profileMenuOpen ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
