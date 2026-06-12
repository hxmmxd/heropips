'use client';

import React, { useState, useEffect } from 'react';
import { X, Moon, Zap, Activity, Clock } from 'lucide-react';

interface CelestialMonitorProps {
  onClose: () => void;
  symbol?: string;
}

export default function CelestialMonitor({ onClose, symbol = 'XAU/USD' }: CelestialMonitorProps) {
  const [astroData, setAstroData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('Computing...');
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch live ephemeris from API
  useEffect(() => {
    let active = true;
    const fetchAstro = async () => {
      try {
        const res = await fetch(`/api/astro?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (data.success && active) {
          setAstroData(data.snapshot);
          setEvents(data.countdowns);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch celestial metrics:', err);
      }
    };

    fetchAstro();
    return () => { active = false; };
  }, [symbol]);

  // Real-time ticking countdown
  useEffect(() => {
    if (events.length === 0) return;

    const updateTimer = () => {
      const nextEvent = events[0];
      const diff = nextEvent.date - Date.now();
      if (diff <= 0) {
        setTimeLeft('Active');
      } else {
        const days = Math.floor(diff / (24 * 3600 * 1000));
        const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
        const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
        const secs = Math.floor((diff % (60 * 1000)) / 1000);
        setTimeLeft(`${days}d ${hours}h ${mins}m ${secs}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [events]);

  // SVG Moon Orbit Progress calculations
  const phaseValue = astroData?.moonPhase ?? 0.0;
  const angle = phaseValue * 2 * Math.PI - Math.PI / 2; // top starts at -90deg
  const radius = 28;
  const cx = 35;
  const cy = 35;
  const mx = cx + radius * Math.cos(angle);
  const my = cy + radius * Math.sin(angle);

  return (
    <div className="absolute top-full right-4 mt-2 w-72 bg-slate-950/95 border border-indigo-500/30 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.2)] p-4 text-white z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2 mb-3">
        <h4 className="text-xs font-black uppercase tracking-[0.15em] text-amber-400 flex items-center gap-1.5">
          <Moon className="w-3.5 h-3.5 fill-amber-400/20" /> Ephemeris Engine
        </h4>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-white/5 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
          <svg className="animate-spin w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <span className="text-[10px] uppercase font-bold tracking-wider">Syncing NASA Ephemeris...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Orbital Arc visualization */}
          <div className="flex items-center gap-4 bg-indigo-950/20 border border-indigo-500/10 p-2.5 rounded-xl">
            <div className="shrink-0 relative w-[70px] h-[70px]">
              <svg width="70" height="70" className="overflow-visible">
                {/* Orbit track */}
                <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" strokeDasharray="3 2" />
                {/* Earth in center */}
                <circle cx={cx} cy={cy} r={7} fill="#3b82f6" opacity="0.25" />
                <circle cx={cx} cy={cy} r={3} fill="#3b82f6" />
                {/* Moon indicator */}
                <circle cx={mx} cy={my} r={4.5} fill="#fef08a" style={{ filter: 'drop-shadow(0 0 3px #fbbf24)' }} />
              </svg>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">LUNAR PROGRESS</span>
              <p className="text-xs font-black text-amber-100 uppercase tracking-tight">
                {astroData.lunarEmoji} {astroData.lunarPhase}
              </p>
              <span className="text-[9px] font-medium text-slate-300">
                Zodiac: {astroData.moonSignName} ({astroData.moonElement.toUpperCase()})
              </span>
            </div>
          </div>

          {/* Planetary velocity / status list */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] py-1 border-b border-white/5">
              <span className="text-slate-400 uppercase font-bold tracking-wider">☿ Mercury Velocity:</span>
              <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black ${
                astroData.mercuryState === 'retrograde'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : astroData.mercuryState.includes('shadow')
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-green-500/20 text-green-300 border border-green-500/30'
              }`}>
                {astroData.mercuryState.toUpperCase()}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-[10px] py-1 border-b border-white/5">
              <span className="text-slate-400 uppercase font-bold tracking-wider">🌙 Void of Course:</span>
              <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black ${
                astroData.moonVoidOfCourse
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-950/40 text-emerald-400'
              }`}>
                {astroData.moonVoidOfCourse ? 'ACTIVE (BLOCK)' : 'INACTIVE'}
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px] py-1 border-b border-white/5">
              <span className="text-slate-400 uppercase font-bold tracking-wider">🌑 Eclipse Window:</span>
              <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black ${
                astroData.eclipseBlackout
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-emerald-950/40 text-emerald-400'
              }`}>
                {astroData.eclipseBlackout ? 'BLACKOUT' : 'CLEAR'}
              </span>
            </div>
          </div>

          {/* Real-time Countdown timer */}
          {events.length > 0 && (
            <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-2.5 space-y-1">
              <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-300 uppercase tracking-widest">
                <Clock className="w-3 h-3 text-indigo-400" /> Transit Countdown
              </div>
              <p className="text-[10px] font-bold text-amber-200">{events[0].name}</p>
              <p className="text-xs font-black font-mono text-white tracking-widest">{timeLeft}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
