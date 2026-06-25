'use client';

import React, { useState } from 'react';
import { Menu, ChevronDown, RefreshCw } from 'lucide-react';
import { Broker } from '../types';
import { cleanBrokerName } from '@/utils/broker';
import CelestialMonitor from './CelestialMonitor';

interface HeaderProps {
  brokers: Broker[];
  activeBroker: Broker;
  onSelectBroker: (acc: string) => void;
  onToggleSidebar: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  astroMode?: boolean;
  onToggleAstroMode?: () => void;
}

// Cosmic chime for Astro Mode toggle
const playAstroSound = (on: boolean) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const notes = on ? [528, 660, 792] : [792, 660, 528];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.3);
    });
  } catch (e) {
    console.warn('Astro audio failed:', e);
  }
};

export default function Header({
  brokers,
  activeBroker,
  onSelectBroker,
  onToggleSidebar,
  onRefresh,
  isRefreshing = false,
  astroMode = false,
  onToggleAstroMode,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);

  const getDotColor = () => {
    if (!activeBroker || activeBroker.acc === 'none') return '#ef4444'; // red when not connected
    const s = (activeBroker.status || '').toLowerCase();
    if (s === 'connected') return '#22c55e'; // green
    if (s === 'connecting' || s === 'starting' || s === 'waking') return '#f59e0b'; // amber
    return '#ef4444'; // red (timeout, error, disconnected)
  };

  const handleToggleAstro = () => {
    playAstroSound(!astroMode);
    onToggleAstroMode?.();
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

  return (
    <header className="flex flex-col z-40 bg-[var(--bg)] shrink-0 pt-[env(safe-area-inset-top)]">

      {/* ── Top Navbar ── */}
      <div className="flex items-center justify-between px-4 py-2">

        {/* Hamburger (mobile) */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--input-bg)] transition text-[var(--subtext)]"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Broker Dropdown */}
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
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-xl shadow-xl p-2 z-50">
                <div className="space-y-1">
                  {brokers.map((b) => (
                    <button
                      key={b.acc}
                      onClick={() => handleBrokerClick(b.acc)}
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

        {/* ── ASTRO Planet Pill Toggle ── */}
        <div className="flex items-center space-x-1.5 relative">
          <button
            onClick={handleToggleAstro}
            aria-label={astroMode ? 'Astro Mode ON — click to disable' : 'Enable Astro Mode'}
            title={astroMode
              ? 'Astro Mode ON — celestial cycles layered into signals. Click to disable.'
              : 'Astro Mode — overlays lunar cycles, Mercury retrograde & planetary aspects. Not financial advice.'
            }
            style={{ width: 72, height: 30 }}
            className={`relative flex items-center shrink-0 rounded-full px-[3px] border transition-all duration-300 cursor-pointer ${
              astroMode
                ? 'border-amber-500/50 bg-gradient-to-r from-amber-600/20 to-yellow-500/10 astro-toggle-on'
                : 'border-[var(--border)] bg-[var(--input-bg)] hover:border-amber-400/40'
            }`}
          >
            {/* ASTRO label — flips side based on state */}
            <span
              className={`absolute text-[8.5px] font-bold tracking-[0.12em] transition-all duration-300 select-none ${
                astroMode
                  ? 'left-[8px] text-amber-400'
                  : 'right-[8px] text-[var(--subtext)] opacity-60'
              }`}
            >
              ASTRO
            </span>

            {/* Sliding planet thumb */}
            <div
              className="relative z-10 flex items-center justify-center rounded-full transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                width: 24,
                height: 24,
                transform: astroMode ? 'translateX(42px)' : 'translateX(0px)',
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ overflow: 'visible' }}>
                <defs>
                  <radialGradient id="pill-planet-grad" cx="36%" cy="30%" r="68%">
                    {astroMode ? (
                      <>
                        <stop offset="0%"   stopColor="#fef9c3" />
                        <stop offset="45%"  stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#78350f" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%"   stopColor="#cbd5e1" />
                        <stop offset="45%"  stopColor="#64748b" />
                        <stop offset="100%" stopColor="#1e293b" />
                      </>
                    )}
                  </radialGradient>
                  <clipPath id="pill-ring-front">
                    <rect x="0" y="11.5" width="24" height="13" />
                  </clipPath>
                  <clipPath id="pill-ring-back">
                    <rect x="0" y="0" width="24" height="12.5" />
                  </clipPath>
                </defs>

                {/* Back ring arc */}
                <ellipse cx="12" cy="12" rx="10.5" ry="3.4"
                  fill="none"
                  stroke={astroMode ? '#d97706' : '#94a3b8'}
                  strokeWidth="1.4"
                  opacity={astroMode ? 0.35 : 0.2}
                  transform="rotate(-18 12 12)"
                  clipPath="url(#pill-ring-back)"
                />

                {/* Planet body */}
                <circle cx="12" cy="12" r="5.8" fill="url(#pill-planet-grad)" />

                {/* Atmospheric band */}
                <path d="M 8.2 10.2 Q 12 8.8 15.8 10.2"
                  fill="none"
                  stroke={astroMode ? 'rgba(254,243,199,0.3)' : 'rgba(255,255,255,0.12)'}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />

                {/* Specular spot */}
                <circle cx="9.8" cy="9.2" r="2" fill="white"
                  opacity={astroMode ? 0.22 : 0.15}
                />

                {/* Front ring arc */}
                <ellipse cx="12" cy="12" rx="10.5" ry="3.4"
                  fill="none"
                  stroke={astroMode ? '#fbbf24' : '#94a3b8'}
                  strokeWidth="1.5"
                  opacity={astroMode ? 0.9 : 0.3}
                  transform="rotate(-18 12 12)"
                  clipPath="url(#pill-ring-front)"
                  className={astroMode ? 'astro-planet-ring' : 'astro-planet-ring-off'}
                />

                {/* Orbiting moon */}
                <circle
                  cx="12" cy="12"
                  r={astroMode ? 1.6 : 1.3}
                  fill={astroMode ? '#fbbf24' : '#94a3b8'}
                  style={astroMode
                    ? { filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.9))' }
                    : { opacity: 0.6 }
                  }
                  className={astroMode ? 'astro-toggle-moon' : 'astro-toggle-moon-slow'}
                />
              </svg>
            </div>
          </button>

          {astroMode && (
            <button
              onClick={() => setMonitorOpen(!monitorOpen)}
              className="w-[28px] h-[28px] flex items-center justify-center rounded-full bg-indigo-950/80 border border-amber-500/30 text-amber-400 hover:bg-indigo-900 transition-colors shrink-0 animate-pulse text-xs font-bold"
              title="Open Celestial Ephemeris Monitor"
            >
              ☄
            </button>
          )}

          {astroMode && monitorOpen && (
            <CelestialMonitor onClose={() => setMonitorOpen(false)} />
          )}
        </div>

      </div>

      {/* ── Account Info Bar ── */}
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
