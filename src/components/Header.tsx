'use client';

import React, { useState } from 'react';
import { Menu, ChevronDown, Lightbulb, RefreshCw } from 'lucide-react';
import { Broker } from '../types';
import { cleanBrokerName } from '@/utils/broker';

interface HeaderProps {
  brokers: Broker[];
  activeBroker: Broker;
  onSelectBroker: (name: string) => void;
  onToggleSidebar: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRefresh?: () => Promise<void>;
}

// Programmatic synthesizer for physical switch toggle sounds using Web Audio API
const playSwitchSound = (isLight: boolean) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // 1. Mechanical switch click (high pass noise)
    const bufferSize = ctx.sampleRate * 0.04; // 40ms transient buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // 2. Sine tone chime (ON chime vs OFF deep click)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sine';
    if (isLight) {
      // Switch ON: bright, rising chime tone
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.05);
      oscGain.gain.setValueAtTime(0.04, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    } else {
      // Switch OFF: deeper, falling off tone
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.05);
      oscGain.gain.setValueAtTime(0.04, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    }

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start();
    osc.start();
    noise.stop(ctx.currentTime + 0.04);
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.warn("AudioContext not allowed or supported:", e);
  }
};

export default function Header({
  brokers,
  activeBroker,
  onSelectBroker,
  onToggleSidebar,
  theme,
  onToggleTheme,
  onRefresh,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBrokerClick = (name: string) => {
    onSelectBroker(name);
    setDropdownOpen(false);
  };

  const handleToggleTheme = () => {
    // Play lightbulb click sound effect (switching to light mode if current theme is dark)
    playSwitchSound(theme === 'dark');
    onToggleTheme();
  };

  const isPositivePnl = activeBroker.pnl.startsWith('+');

  return (
    <header className="flex flex-col z-40 bg-[var(--bg)] shrink-0 pt-[env(safe-area-inset-top)]">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--input-bg)] transition text-[var(--subtext)]"
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
            <span>{cleanBrokerName(activeBroker.name)}</span>
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
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-[var(--accent)] hover:text-white transition flex flex-col items-start gap-0.5"
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

        {/* Theme Toggle Button (Lightbulb) */}
        <button
          onClick={handleToggleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--input-bg)] transition text-[var(--subtext)]"
          aria-label="Toggle Theme Mode"
        >
          <Lightbulb
            className={`w-5 h-5 transition-all duration-300 ${
              theme === 'dark'
                ? 'text-yellow-500 fill-yellow-500/20 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]'
                : 'text-[var(--subtext)]'
            }`}
          />
        </button>
      </div>

      {/* Account Info Cards */}
      <div className="px-4 pb-2">
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
                disabled={refreshing}
                className="p-1 rounded-md hover:bg-[var(--input-bg)] text-[var(--subtext)] hover:text-[var(--text)] transition disabled:opacity-50 flex items-center justify-center mr-1"
                title="Refresh Live Balance"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            <span className="status-dot"></span>
          </div>
        </div>
      </div>
    </header>
  );
}
