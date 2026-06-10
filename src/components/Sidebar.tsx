'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, Server, Receipt, Network, X, LogOut, Settings, ChevronDown, BarChart3, GraduationCap, Star } from 'lucide-react';
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

  const bottomLinks = [
    { id: 'profile', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:relative z-[60] w-[272px] h-full bg-[var(--sidebar-bg)] border-r border-[var(--border)] shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          
          {/* ── Workspace / User selector ── */}
          <div className="px-3 pt-4 pb-1 relative">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="sb-workspace-btn flex-1"
              >
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-6 h-6 rounded-full shrink-0 object-cover"
                />
                <span className="sb-workspace-name">{userName}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--subtext)] shrink-0 transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {/* Mobile-only close button */}
              <button
                onClick={onToggle}
                className="sb-icon-btn"
                aria-label="Close sidebar"
                style={{ display: 'var(--sb-close-display, flex)' }}
              >
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>

            {/* Dropdown popup */}
            {profileMenuOpen && (
              <>
                <div className="fixed inset-0 z-[69]" onClick={() => setProfileMenuOpen(false)} />
                <div className="sb-profile-popup absolute top-full left-2 right-2 mt-1 z-[70] bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-[13px] font-semibold truncate text-[var(--text)]">{userName}</p>
                    <p className="text-[11px] text-[var(--subtext)] truncate mt-0.5">{userEmail}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { switchTab('profile'); setProfileMenuOpen(false); }}
                      className="sb-dropdown-item"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="sb-dropdown-item sb-dropdown-danger"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Main Navigation ── */}
          <nav className="flex-1 overflow-y-auto no-scrollbar px-3 pt-2">
            <div className="space-y-[2px]">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { switchTab(item.id); if (isOpen) onToggle(); }}
                    className={`sb-nav-item ${isActive ? 'sb-active' : ''}`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                    <span className="sb-nav-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ── Bottom Section ── */}
          <div className="px-3 pb-2 pt-2 space-y-[2px]">
            {/* Settings link */}
            <button
              onClick={() => { switchTab('profile'); if (isOpen) onToggle(); }}
              className={`sb-nav-item ${currentTab === 'profile' ? 'sb-active' : ''}`}
            >
              <Settings className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
              <span className="sb-nav-label">Settings</span>
            </button>
          </div>

          {/* ── Plan Footer ── */}
          <div className="px-4 pb-4 pt-2 border-t border-[var(--border)]">
            <p className="text-[12px] font-bold text-[var(--text)] mb-2.5">Your Free Plan</p>
            
            {/* Usage bars */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-[var(--subtext)] shrink-0" strokeWidth={1.6} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[var(--text)] font-medium">AI signals</span>
                    <span className="text-[11px] text-[var(--subtext)]">0% used</span>
                  </div>
                  <div className="sb-progress-track">
                    <div className="sb-progress-bar" style={{ width: '0%' }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-[var(--subtext)] shrink-0" strokeWidth={1.6} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[var(--text)] font-medium">Broker nodes</span>
                    <span className="text-[11px] text-[var(--subtext)]">0% used</span>
                  </div>
                  <div className="sb-progress-track">
                    <div className="sb-progress-bar" style={{ width: '0%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade button */}
            <button
              onClick={() => { switchTab('subscription'); if (isOpen) onToggle(); }}
              className="sb-upgrade-btn"
            >
              <Star className="w-4 h-4" strokeWidth={2} />
              Upgrade
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
