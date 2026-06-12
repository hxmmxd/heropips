'use client';

import React, { useState, useEffect } from 'react';

interface AstroAnalyticsData {
  overview: {
    totalSignals: number;
    totalWithResults: number;
    overallWinRate: number;
    totalPnl: number;
    astroOnWinRate: number;
    astroOnTrades: number;
  };
  moonPhaseWinRates: { phase: string; winRate: number; totalTrades: number; wins: number }[];
  mercuryPerformance: { state: string; winRate: number; avgPnl: number; totalTrades: number }[];
  bestAspects: { aspect: string; winRate: number; avgPnl: number; totalTrades: number }[];
  seasonalHeatmap: { month: string; winRate: number | null; totalTrades: number; pnl: number }[];
  recentSignals: any[];
}

export default function AstroPerformanceTab() {
  const [data, setData] = useState<AstroAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/astro/analytics')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d);
        } else {
          setError(d.error || 'Failed to load analytics');
        }
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <svg className="animate-spin w-6 h-6 text-amber-500 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <p className="text-[10px] text-[var(--subtext)] uppercase tracking-widest font-bold">Loading Astro Telemetry...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2 max-w-sm">
          <p className="text-sm font-bold text-red-500">Failed to load analytics</p>
          <p className="text-[11px] text-[var(--subtext)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.overview.totalSignals === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3 max-w-md">
          <span className="text-4xl">🪐</span>
          <h3 className="text-lg font-black text-amber-400 uppercase tracking-wider">No Astro Signals Yet</h3>
          <p className="text-xs text-[var(--subtext)] leading-relaxed">
            Enable Astro Mode and generate trade signals to start building your celestial performance history.
            Analytics will appear here once you have signal data.
          </p>
        </div>
      </div>
    );
  }

  const ov = data.overview;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🪐</span>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider">Astro Performance</h2>
            <p className="text-[10px] text-[var(--subtext)] uppercase tracking-widest">Celestial Telemetry Analytics</p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Signals" value={ov.totalSignals.toString()} />
          <StatCard label="Win Rate" value={`${ov.overallWinRate}%`} color={ov.overallWinRate >= 50 ? 'green' : 'red'} />
          <StatCard label="Net P&L" value={`$${ov.totalPnl.toLocaleString()}`} color={ov.totalPnl >= 0 ? 'green' : 'red'} />
          <StatCard label="Astro Win Rate" value={`${ov.astroOnWinRate}%`} color={ov.astroOnWinRate >= 50 ? 'green' : 'amber'} subtitle={`${ov.astroOnTrades} trades`} />
        </div>

        {/* Moon Phase Win Rates */}
        <Panel title="🌙 Moon Phase Win Rate">
          {data.moonPhaseWinRates.length === 0 ? (
            <EmptyState text="No moon phase data yet" />
          ) : (
            <div className="space-y-2">
              {data.moonPhaseWinRates.map(mp => (
                <div key={mp.phase} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-[var(--subtext)] w-32 shrink-0 uppercase tracking-wide">{mp.phase}</span>
                  <div className="flex-1 h-5 bg-[var(--input-bg)] rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${mp.winRate >= 60 ? 'bg-green-500' : mp.winRate >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.max(mp.winRate, 3)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white mix-blend-difference">
                      {mp.winRate}% ({mp.totalTrades})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Mercury Performance */}
        <Panel title="☿ Mercury State Performance">
          {data.mercuryPerformance.length === 0 ? (
            <EmptyState text="No Mercury state data yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.mercuryPerformance.map(mp => (
                <div key={mp.state} className={`p-3 rounded-xl border ${
                  mp.state === 'retrograde' ? 'border-red-500/20 bg-red-500/5'
                  : mp.state === 'direct' ? 'border-green-500/20 bg-green-500/5'
                  : 'border-amber-500/20 bg-amber-500/5'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      mp.state === 'retrograde' ? 'text-red-500' : mp.state === 'direct' ? 'text-green-500' : 'text-amber-500'
                    }`}>
                      ☿ {mp.state}
                    </span>
                    <span className="text-[9px] text-[var(--subtext)]">{mp.totalTrades} trades</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] text-[var(--subtext)] uppercase">Win Rate</p>
                      <p className="text-sm font-bold font-mono">{mp.winRate}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-[var(--subtext)] uppercase">Avg P&L</p>
                      <p className={`text-sm font-bold font-mono ${mp.avgPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {mp.avgPnl >= 0 ? '+' : ''}${mp.avgPnl}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Seasonal Heatmap */}
        <Panel title="📅 Seasonal Calendar Heatmap">
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
            {data.seasonalHeatmap.map(m => {
              const intensity = m.winRate !== null
                ? m.winRate >= 65 ? 'bg-green-500/40 border-green-500/30'
                : m.winRate >= 50 ? 'bg-green-500/20 border-green-500/15'
                : m.winRate >= 35 ? 'bg-amber-500/20 border-amber-500/15'
                : 'bg-red-500/20 border-red-500/15'
                : 'bg-[var(--input-bg)] border-[var(--border)]';
              return (
                <div key={m.month} className={`p-2 rounded-lg border text-center ${intensity}`}>
                  <p className="text-[9px] font-bold text-[var(--subtext)] uppercase">{m.month}</p>
                  <p className="text-[10px] font-bold font-mono mt-0.5">
                    {m.winRate !== null ? `${m.winRate}%` : '—'}
                  </p>
                  <p className="text-[8px] text-[var(--subtext)]">{m.totalTrades}t</p>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Best Aspects */}
        {data.bestAspects.length > 0 && (
          <Panel title="♃ Best Performing Aspects">
            <div className="space-y-1.5">
              {data.bestAspects.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                  <span className="text-[11px] font-medium text-[var(--text)]">{a.aspect}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-[var(--subtext)]">{a.totalTrades} trades</span>
                    <span className="text-[10px] font-bold font-mono">{a.winRate}%</span>
                    <span className={`text-[10px] font-bold font-mono ${a.avgPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {a.avgPnl >= 0 ? '+' : ''}${a.avgPnl}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Recent Signals Log */}
        {data.recentSignals.length > 0 && (
          <Panel title="📋 Recent Astro Signals">
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 font-bold text-[var(--subtext)] uppercase tracking-wider">Symbol</th>
                    <th className="text-left py-2 font-bold text-[var(--subtext)] uppercase tracking-wider">Direction</th>
                    <th className="text-left py-2 font-bold text-[var(--subtext)] uppercase tracking-wider">Moon</th>
                    <th className="text-left py-2 font-bold text-[var(--subtext)] uppercase tracking-wider">Mercury</th>
                    <th className="text-left py-2 font-bold text-[var(--subtext)] uppercase tracking-wider">Result</th>
                    <th className="text-right py-2 font-bold text-[var(--subtext)] uppercase tracking-wider">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSignals.map((s: any) => (
                    <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 font-bold uppercase">{s.symbol}</td>
                      <td className={`py-2 font-bold ${s.direction === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>{s.direction}</td>
                      <td className="py-2 text-[var(--subtext)]">{s.moonPhase || '—'}</td>
                      <td className="py-2 text-[var(--subtext)]">{s.mercuryState || '—'}</td>
                      <td className={`py-2 font-bold ${s.result === 'win' ? 'text-green-500' : s.result === 'loss' ? 'text-red-500' : 'text-[var(--subtext)]'}`}>
                        {s.result || 'Pending'}
                      </td>
                      <td className={`py-2 text-right font-mono font-bold ${parseFloat(s.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {s.pnl ? `$${parseFloat(s.pnl).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

      </div>
    </div>
  );
}

// ── Reusable Sub-Components ──

function StatCard({ label, value, color, subtitle }: { label: string; value: string; color?: string; subtitle?: string }) {
  const colorClass = color === 'green' ? 'text-green-500' : color === 'red' ? 'text-red-500' : color === 'amber' ? 'text-amber-500' : 'text-[var(--text)]';
  return (
    <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)]">
      <p className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-lg font-black font-mono ${colorClass}`}>{value}</p>
      {subtitle && <p className="text-[9px] text-[var(--subtext)] mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)]">
      <h3 className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-[11px] text-[var(--subtext)] text-center py-4 italic">{text}</p>
  );
}
