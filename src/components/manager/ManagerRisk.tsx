'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AccountInfo, Position, ClosedDeal, RiskStats } from '@/types';
import EquityCurve from './EquityCurve';

interface ManagerRiskProps {
  accountInfo: AccountInfo;
  positions: Position[];
  activeBrokerId: string;
  isSticky?: boolean;
}

const emptyStats: RiskStats = {
  netProfit: 0, totalVolume: 0, winRate: 0, wins: 0, losses: 0,
  avgWin: 0, avgLoss: 0, bestTrade: 0, worstTrade: 0,
  maxWinStreak: 0, maxLossStreak: 0, totalCommission: 0, totalSwap: 0,
  profitFactor: 0, expectancy: 0, sharpe: 0, sortino: 0,
  maxDrawdown: 0, recoveryFactor: 0, avgTrade: 0, samples: 0,
};

function formatPnl(v: number, showSign = true): string {
  const prefix = showSign && v > 0 ? '+' : v < 0 ? '-' : '';
  return `${prefix}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatHeld(openTime: string, closeTime: string): string {
  const ms = new Date(closeTime).getTime() - new Date(openTime).getTime();
  if (ms <= 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remMins}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

function formatTime(t: string): string {
  const d = new Date(t);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ManagerRisk({ accountInfo, positions, activeBrokerId, isSticky = true }: ManagerRiskProps) {
  const [period, setPeriod] = useState<'24h' | '3d' | '7d' | '30d' | 'all'>('7d');
  const [deals, setDeals] = useState<ClosedDeal[]>([]);
  const [stats, setStats] = useState<RiskStats>(emptyStats);
  const [equityCurve, setEquityCurve] = useState<{ time: string; equity: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lbMode, setLbMode] = useState<'net' | 'pnl'>('net');
  const [liveRisk, setLiveRisk] = useState<any>(null);
  const [sentinelData, setSentinelData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const fetchDeals = useCallback(async () => {
    if (!activeBrokerId || activeBrokerId === 'none') return;
    try {
      const res = await fetch(`/api/broker/deals?brokerId=${activeBrokerId}&period=${period}`);
      const data = await res.json();
      if (data.deals) setDeals(data.deals);
      if (data.stats) setStats(data.stats);
      if (data.equityCurve) setEquityCurve(data.equityCurve);
      // liveRisk from API only if provided, otherwise compute locally
      if (data.liveRisk) setLiveRisk(data.liveRisk);
    } catch (err) {
      console.error('[Risk] Failed to fetch deals:', err);
    } finally {
      setLoading(false);
    }
  }, [activeBrokerId, period]);

  useEffect(() => {
    setLoading(true);
    fetchDeals();
  }, [fetchDeals]);

  // Poll sentinel status every 10 seconds
  useEffect(() => {
    const fetchSentinel = async () => {
      try {
        const res = await fetch('/api/sentinel');
        const data = await res.json();
        setSentinelData(data);
      } catch {
        // Sentinel API may not exist yet — ignore
      }
    };
    fetchSentinel();
    const interval = setInterval(fetchSentinel, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch VaR / Monte Carlo analytics (once on mount + when broker changes)
  useEffect(() => {
    if (!activeBrokerId || activeBrokerId === 'none') return;
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/risk-analytics?accountId=${activeBrokerId}`);
        const data = await res.json();
        if (data.status === 'ok') setAnalyticsData(data);
      } catch {
        // Analytics API may not have data yet
      }
    };
    fetchAnalytics();
  }, [activeBrokerId]);

  // Compute liveRisk from props (no extra API call needed)
  useEffect(() => {
    if (positions.length > 0 && accountInfo.balance > 0) {
      const bal = accountInfo.balance;
      const eq = accountInfo.equity || bal;
      const totalLots = positions.reduce((a, p) => a + p.volume, 0);
      const openPnl = positions.reduce((a, p) => a + p.profit, 0);
      const withSL = positions.filter(p => p.stopLoss && p.stopLoss > 0).length;
      const withTP = positions.filter(p => p.takeProfit && p.takeProfit > 0).length;
      const margin = accountInfo.margin || 0;
      const freeMargin = accountInfo.freeMargin || 0;
      const marginLevel = margin > 0 ? (eq / margin) * 100 : 0;
      const marginUsedPct = eq > 0 ? (margin / eq) * 100 : 0;
      const currentDD = bal > 0 ? ((bal - eq) / bal) * 100 : 0;
      const buyPos = positions.filter(p => p.type === 'POSITION_TYPE_BUY');
      const sellPos = positions.filter(p => p.type === 'POSITION_TYPE_SELL');
      const worst = positions.reduce((w, p) => (!w || p.profit < w.profit) ? p : w, positions[0]);
      const best = positions.reduce((b, p) => (!b || p.profit > b.profit) ? p : b, positions[0]);

      setLiveRisk({
        openPositions: positions.length,
        totalLots: Math.round(totalLots * 100) / 100,
        openPnl: Math.round(openPnl * 100) / 100,
        openPnlPct: Math.round((openPnl / bal) * 10000) / 100,
        balance: bal, equity: Math.round(eq * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        freeMargin: Math.round(freeMargin * 100) / 100,
        marginLevel: Math.round(marginLevel * 10) / 10,
        marginUsedPct: Math.round(marginUsedPct * 100) / 100,
        currentDD: Math.round(currentDD * 100) / 100,
        withSL, withTP, noSL: positions.length - withSL,
        worstOpen: { symbol: worst.symbol, profit: Math.round(worst.profit * 100) / 100, type: worst.type },
        bestOpen: { symbol: best.symbol, profit: Math.round(best.profit * 100) / 100, type: best.type },
        buyCount: buyPos.length, sellCount: sellPos.length,
        buyPnl: Math.round(buyPos.reduce((a, p) => a + p.profit, 0) * 100) / 100,
        sellPnl: Math.round(sellPos.reduce((a, p) => a + p.profit, 0) * 100) / 100,
        leverage: accountInfo.leverage || 0,
      });
    } else {
      setLiveRisk(null);
    }
  }, [positions, accountInfo]);

  // P&L Attribution breakdown
  const longDeals = deals.filter(d => d.type === 'DEAL_TYPE_BUY');
  const shortDeals = deals.filter(d => d.type === 'DEAL_TYPE_SELL');
  const longPnl = longDeals.reduce((a, d) => a + d.profit, 0);
  const shortPnl = shortDeals.reduce((a, d) => a + d.profit, 0);
  const longWins = longDeals.filter(d => d.profit > 0).length;
  const shortWins = shortDeals.filter(d => d.profit > 0).length;
  const longBest = longDeals.length > 0 ? Math.max(...longDeals.map(d => d.profit)) : 0;
  const shortBest = shortDeals.length > 0 ? Math.max(...shortDeals.map(d => d.profit)) : 0;
  const longAvg = longDeals.length > 0 ? longPnl / longDeals.length : 0;
  const shortAvg = shortDeals.length > 0 ? shortPnl / shortDeals.length : 0;
  const totalAbsPnl = Math.abs(longPnl) + Math.abs(shortPnl);
  const longBarPct = totalAbsPnl > 0 ? (Math.abs(longPnl) / totalAbsPnl) * 100 : 0;

  // Symbol leaderboard
  const symbolMap: Record<string, { count: number; pnl: number }> = {};
  for (const d of deals) {
    if (!symbolMap[d.symbol]) symbolMap[d.symbol] = { count: 0, pnl: 0 };
    symbolMap[d.symbol].count++;
    symbolMap[d.symbol].pnl += d.profit;
  }
  const symbolBoard = Object.entries(symbolMap)
    .sort((a, b) => (lbMode === 'net' ? b[1].pnl - a[1].pnl : b[1].count - a[1].count));

  if (loading) {
    return (
      <div className="mgr-loading">
        <div className="mgr-spinner" />
      </div>
    );
  }

  return (
    <div className="rsk-page">
      {/* ── 1. Period Selector + Net P&L ── */}
      <div className="rsk-header">
        <div className="rsk-period-pills">
          {(['24h', '3d', '7d', '30d', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rsk-period-pill ${period === p ? 'rsk-period-pill-active' : ''}`}
            >
              {p === 'all' ? 'ALL' : p.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="rsk-net-pnl">
          <span className="rsk-net-pnl-label">NET P&L</span>
          <span className={`rsk-net-pnl-value ${stats.netProfit >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
            {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── RISK GOVERNOR ── */}
      {sentinelData && (
        <div className="rsk-section">
          <div className="rsk-section-header">
            <span className="rsk-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: sentinelData.sentinel?.running ? '#22c55e' : '#ef4444',
                animation: sentinelData.sentinel?.running ? 'pulse 2s infinite' : 'none',
                display: 'inline-block',
              }} />
              RISK GOVERNOR
            </span>
            <span className="rsk-section-meta">
              {sentinelData.sentinel?.running
                ? `Tick #${sentinelData.sentinel.tickCount} · ${sentinelData.sentinel.openPositions} pos`
                : 'Sentinel offline'
              }
            </span>
          </div>

          {sentinelData.risk && (
            <>
              {/* Gate Status Cards */}
              <div className="rsk-trio-cards" style={{ marginTop: '8px' }}>
                {sentinelData.risk.gates.map((gate: any, i: number) => {
                  const pct = gate.multiplier * 100;
                  const bg = gate.passed
                    ? 'rgba(16,185,129,0.06)'
                    : pct > 50
                      ? 'rgba(245,158,11,0.06)'
                      : 'rgba(239,68,68,0.06)';
                  const accent = gate.passed
                    ? '#10b981'
                    : pct > 50
                      ? '#f59e0b'
                      : '#ef4444';
                  return (
                    <div key={i} className="rsk-trio-card" style={{
                      background: bg,
                      borderLeft: `3px solid ${accent}`,
                    }}>
                      <div className="rsk-trio-label" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                        {gate.name.replace('Gate ', 'G').toUpperCase()}
                      </div>
                      <div className={`rsk-trio-value ${gate.passed ? 'mgr-positive' : 'mgr-negative'}`}
                           style={{ fontSize: '16px' }}>
                        {pct.toFixed(0)}%
                      </div>
                      <div className="rsk-trio-sub" style={{ fontSize: '10px', lineHeight: '1.3', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {gate.detail.replace(/^[✅🔴🟢🟡🟠🔶⚠️🚨] ?/, '')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gauges Row */}
              <div className="rsk-stats-grid" style={{ marginTop: '8px' }}>
                {/* Daily Loss Gauge */}
                <div className="rsk-stat-row">
                  <span className="rsk-stat-label">Daily Loss</span>
                  <span className="rsk-stat-value">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                      <span style={{
                        flex: 1, height: '6px', borderRadius: '3px',
                        background: 'rgba(255,255,255,0.08)',
                        position: 'relative' as const, overflow: 'hidden',
                      }}>
                        <span style={{
                          position: 'absolute' as const, left: 0, top: 0, bottom: 0,
                          width: `${Math.min(100, ((sentinelData.risk.multipliers?.daily !== undefined
                            ? (1 - Math.abs(sentinelData.risk.multipliers.daily)) : 0) * 100 / 6) * 100)}%`,
                          borderRadius: '3px',
                          background: sentinelData.risk.multipliers?.daily >= 1 ? '#22c55e'
                            : sentinelData.risk.multipliers?.daily >= 0.5 ? '#f59e0b'
                            : '#ef4444',
                          transition: 'width 0.5s ease',
                        }} />
                      </span>
                      <span style={{ fontSize: '11px', minWidth: '32px', textAlign: 'right' as const }}>
                        / 6%
                      </span>
                    </span>
                  </span>
                </div>

                {/* Drawdown Gauge */}
                <div className="rsk-stat-row">
                  <span className="rsk-stat-label">Drawdown</span>
                  <span className="rsk-stat-value">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                      <span style={{
                        flex: 1, height: '6px', borderRadius: '3px',
                        background: 'rgba(255,255,255,0.08)',
                        position: 'relative' as const, overflow: 'hidden',
                      }}>
                        <span style={{
                          position: 'absolute' as const, left: 0, top: 0, bottom: 0,
                          width: `${Math.min(100, (sentinelData.risk.multipliers?.drawdown !== undefined
                            ? ((1 - sentinelData.risk.multipliers.drawdown) * 100) : 0))}%`,
                          borderRadius: '3px',
                          background: sentinelData.risk.multipliers?.drawdown >= 1 ? '#22c55e'
                            : sentinelData.risk.multipliers?.drawdown >= 0.5 ? '#eab308'
                            : sentinelData.risk.multipliers?.drawdown >= 0.25 ? '#f97316'
                            : '#ef4444',
                          transition: 'width 0.5s ease',
                        }} />
                      </span>
                      <span style={{ fontSize: '11px', minWidth: '32px', textAlign: 'right' as const }}>
                        / 25%
                      </span>
                    </span>
                  </span>
                </div>

                {/* Combined Multiplier */}
                <div className="rsk-stat-row">
                  <span className="rsk-stat-label">Sizing Multiplier</span>
                  <span className={`rsk-stat-value ${sentinelData.risk.multipliers?.combined >= 0.75 ? 'mgr-positive' : sentinelData.risk.multipliers?.combined > 0 ? '' : 'mgr-negative'}`}
                        style={{ fontSize: '14px', fontWeight: 700 }}>
                    {((sentinelData.risk.multipliers?.combined || 0) * 100).toFixed(0)}%
                  </span>
                  <span className="rsk-stat-label">Streak</span>
                  <span className="rsk-stat-value">
                    {(sentinelData.risk.multipliers?.streak || 1) < 1
                      ? `⚠️ ${((sentinelData.risk.multipliers?.streak || 1) * 100).toFixed(0)}%`
                      : 'Normal'
                    }
                  </span>
                </div>
              </div>

              {/* Active Flags */}
              {(sentinelData.risk.flags?.shouldShadowTrade ||
                sentinelData.risk.flags?.shouldHalt ||
                sentinelData.risk.flags?.shouldLiquidate) && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginTop: '8px' }}>
                  {sentinelData.risk.flags?.shouldLiquidate && (
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                      background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
                    }}>🚨 KILL SWITCH</span>
                  )}
                  {sentinelData.risk.flags?.shouldHalt && !sentinelData.risk.flags?.shouldLiquidate && (
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                      background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)',
                    }}>⛔ TRADING HALTED</span>
                  )}
                  {sentinelData.risk.flags?.shouldShadowTrade && (
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                      background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)',
                    }}>📋 SHADOW MODE</span>
                  )}
                </div>
              )}

              {/* Summary Line */}
              {sentinelData.risk.summary && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontStyle: 'italic' }}>
                  {sentinelData.risk.summary}
                </div>
              )}
            </>
          )}

          {!sentinelData.risk && sentinelData.sentinel && !sentinelData.sentinel.running && (
            <div style={{ padding: '12px 0', fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
              Sentinel is offline. Connect a broker to enable real-time risk monitoring.
            </div>
          )}
        </div>
      )}

      {/* ── 2. Equity Curve ── */}
      <div className="rsk-section">
        <EquityCurve
          data={equityCurve}
          label={`EQUITY CURVE (${period.toUpperCase()})`}
        />
      </div>

      {/* ── VaR / Monte Carlo Analytics ── */}
      {analyticsData && (
        <div className="rsk-section">
          <div className="rsk-section-header">
            <span className="rsk-section-title">📊 VALUE-AT-RISK</span>
            <span className="rsk-section-meta">
              {analyticsData.var?.dataPoints || 0} day window · {analyticsData.var?.method?.replace('_', ' ')}
            </span>
          </div>

          {/* VaR Cards */}
          <div className="rsk-trio-cards">
            <div className="rsk-trio-card">
              <div className="rsk-trio-label">VaR (95%)</div>
              <div className={`rsk-trio-value ${(analyticsData.var?.varFinal95 || 0) >= 3 ? 'mgr-negative' : ''}`}>
                ${analyticsData.var?.varDollar95?.toLocaleString() || '—'}
              </div>
              <div className="rsk-trio-sub">{analyticsData.var?.varFinal95?.toFixed(2) || '—'}% of equity</div>
            </div>

            <div className="rsk-trio-card">
              <div className="rsk-trio-label">CVaR (95%)</div>
              <div className={`rsk-trio-value ${(analyticsData.var?.cvar95 || 0) >= 5 ? 'mgr-negative' : (analyticsData.var?.cvar95 || 0) >= 3 ? 'mgr-warning' : ''}`}>
                ${analyticsData.var?.cvarDollar95?.toLocaleString() || '—'}
              </div>
              <div className="rsk-trio-sub">{analyticsData.var?.cvar95?.toFixed(2) || '—'}% expected shortfall</div>
            </div>

            <div className="rsk-trio-card">
              <div className="rsk-trio-label">VaR (99%)</div>
              <div className={`rsk-trio-value ${(analyticsData.var?.varFinal99 || 0) >= 6 ? 'mgr-negative' : ''}`}>
                ${analyticsData.var?.varDollar99?.toLocaleString() || '—'}
              </div>
              <div className="rsk-trio-sub">{analyticsData.var?.varFinal99?.toFixed(2) || '—'}% tail risk</div>
            </div>
          </div>

          {/* VaR Budget Bar */}
          {analyticsData.var?.varFinal95 > 0 && (
            <div style={{ marginTop: '10px', padding: '0 4px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px'
              }}>
                <span>Daily Budget</span>
                <span style={{ marginLeft: 'auto' }}>
                  {analyticsData.var?.varFinal95?.toFixed(1)}% / 6.0% limit
                </span>
              </div>
              <div style={{
                height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)',
                position: 'relative' as const, overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute' as const, left: 0, top: 0, bottom: 0,
                  width: `${Math.min((analyticsData.var.varFinal95 / 6) * 100, 100)}%`,
                  borderRadius: '3px',
                  background: analyticsData.var.varFinal95 >= 5 ? '#ef4444' :
                              analyticsData.var.varFinal95 >= 3 ? '#f59e0b' : '#10b981',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          )}

          {/* VaR Warning */}
          {analyticsData.varWarning !== 'normal' && (
            <div style={{
              marginTop: '8px', padding: '8px 12px', borderRadius: '8px',
              background: analyticsData.varWarning === 'critical'
                ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
              border: `1px solid ${analyticsData.varWarning === 'critical'
                ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
              fontSize: '11px', color: analyticsData.varWarning === 'critical'
                ? '#fca5a5' : '#fcd34d',
            }}>
              {analyticsData.varWarning === 'critical' ? '🔴' : '⚠️'} {analyticsData.varAction}
            </div>
          )}

          {/* Monte Carlo Ruin */}
          {analyticsData.monteCarlo && (
            <div style={{ marginTop: '12px' }}>
              <div className="rsk-section-header" style={{ padding: '0 0 6px 0' }}>
                <span className="rsk-section-title" style={{ fontSize: '11px' }}>🎲 MONTE CARLO RUIN</span>
                <span className="rsk-section-meta">10K paths × 500 trades</span>
              </div>
              <div className="rsk-trio-cards">
                <div className="rsk-trio-card">
                  <div className="rsk-trio-label">P(RUIN)</div>
                  <div className={`rsk-trio-value ${
                    analyticsData.monteCarlo.ruinProbability >= 0.15 ? 'mgr-negative' :
                    analyticsData.monteCarlo.ruinProbability >= 0.05 ? 'mgr-warning' : 'mgr-positive'
                  }`} style={{ fontSize: '20px' }}>
                    {analyticsData.monteCarlo.ruinProbabilityPct}
                  </div>
                  <div className="rsk-trio-sub">{analyticsData.monteCarlo.assessment?.split('—')[0]?.trim()}</div>
                </div>

                <div className="rsk-trio-card">
                  <div className="rsk-trio-label">MEDIAN EQUITY</div>
                  <div className="rsk-trio-value">
                    ${analyticsData.monteCarlo.medianFinalEquity?.toLocaleString()}
                  </div>
                  <div className="rsk-trio-sub">after 500 trades</div>
                </div>

                <div className="rsk-trio-card">
                  <div className="rsk-trio-label">5th %ile</div>
                  <div className={`rsk-trio-value ${analyticsData.monteCarlo.percentile5Equity < accountInfo.equity * 0.75 ? 'mgr-negative' : ''}`}>
                    ${analyticsData.monteCarlo.percentile5Equity?.toLocaleString()}
                  </div>
                  <div className="rsk-trio-sub">worst-case scenario</div>
                </div>
              </div>

              {/* Trade Stats Used */}
              <div className="rsk-stats-grid" style={{ marginTop: '8px' }}>
                <div className="rsk-stat-row">
                  <span className="rsk-stat-label">Win Rate</span>
                  <span className="rsk-stat-value">{((analyticsData.monteCarlo.parameters?.winRate || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="rsk-stat-row">
                  <span className="rsk-stat-label">Avg R:R</span>
                  <span className="rsk-stat-value">1:{analyticsData.monteCarlo.parameters?.avgRewardRisk?.toFixed(1)}</span>
                </div>
                <div className="rsk-stat-row">
                  <span className="rsk-stat-label">Risk/Trade</span>
                  <span className="rsk-stat-value">{((analyticsData.monteCarlo.parameters?.riskPerTrade || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="rsk-stat-row">
                  <span className="rsk-stat-label">DD Limit</span>
                  <span className="rsk-stat-value">{((analyticsData.monteCarlo.parameters?.maxDrawdownLimit || 0) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Live Risk Exposure ── */}
      {liveRisk && (
        <div className="rsk-section">
          <div className="rsk-section-header">
            <span className="rsk-section-title">LIVE EXPOSURE</span>
            <span className="rsk-section-meta">{liveRisk.openPositions} positions · {liveRisk.totalLots} lots</span>
          </div>
          <div className="rsk-trio-cards">
            <div className="rsk-trio-card">
              <div className="rsk-trio-label">OPEN P&L</div>
              <div className={`rsk-trio-value ${liveRisk.openPnl >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
                {liveRisk.openPnl >= 0 ? '+' : ''}{liveRisk.openPnl.toFixed(2)}
              </div>
              <div className="rsk-trio-sub">{liveRisk.openPnlPct >= 0 ? '+' : ''}{liveRisk.openPnlPct.toFixed(2)}%</div>
            </div>
            <div className="rsk-trio-card">
              <div className="rsk-trio-label">MARGIN LVL</div>
              <div className={`rsk-trio-value ${liveRisk.marginLevel > 500 ? 'mgr-positive' : liveRisk.marginLevel > 200 ? '' : 'mgr-negative'}`}>
                {liveRisk.marginLevel > 0 ? `${liveRisk.marginLevel.toFixed(0)}%` : '—'}
              </div>
              <div className="rsk-trio-sub">{liveRisk.marginUsedPct.toFixed(1)}% used</div>
            </div>
            <div className="rsk-trio-card">
              <div className="rsk-trio-label">DRAWDOWN</div>
              <div className={`rsk-trio-value ${liveRisk.currentDD > 5 ? 'mgr-negative' : liveRisk.currentDD > 0 ? '' : 'mgr-positive'}`}>
                {liveRisk.currentDD > 0 ? '-' : ''}{liveRisk.currentDD.toFixed(2)}%
              </div>
              <div className="rsk-trio-sub">from balance</div>
            </div>
          </div>
          <div className="rsk-stats-grid">
            <div className="rsk-stat-row">
              <span className="rsk-stat-label">No SL</span>
              <span className={`rsk-stat-value ${liveRisk.noSL > 0 ? 'mgr-negative' : 'mgr-positive'}`}>{liveRisk.noSL} / {liveRisk.openPositions}</span>
              <span className="rsk-stat-label">With TP</span>
              <span className="rsk-stat-value">{liveRisk.withTP} / {liveRisk.openPositions}</span>
            </div>
            <div className="rsk-stat-row">
              <span className="rsk-stat-label">Long / Short</span>
              <span className="rsk-stat-value">{liveRisk.buyCount} / {liveRisk.sellCount}</span>
              <span className="rsk-stat-label">Leverage</span>
              <span className="rsk-stat-value">1:{liveRisk.leverage}</span>
            </div>
            {liveRisk.worstOpen && (
              <div className="rsk-stat-row">
                <span className="rsk-stat-label">Worst Open</span>
                <span className="rsk-stat-value mgr-negative">{liveRisk.worstOpen.symbol} {formatPnl(liveRisk.worstOpen.profit)}</span>
                <span className="rsk-stat-label">Best Open</span>
                <span className={`rsk-stat-value ${(liveRisk.bestOpen?.profit || 0) >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>{liveRisk.bestOpen?.symbol} {formatPnl(liveRisk.bestOpen?.profit || 0)}</span>
              </div>
            )}
            <div className="rsk-stat-row">
              <span className="rsk-stat-label">Free Margin</span>
              <span className="rsk-stat-value">${liveRisk.freeMargin.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              <span className="rsk-stat-label">Used Margin</span>
              <span className="rsk-stat-value">${liveRisk.margin.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Win Rate / P.Factor / Avg R:R ── */}
      <div className="rsk-trio-cards">
        <div className="rsk-trio-card">
          <div className="rsk-trio-label">WIN RATE</div>
          <div className={`rsk-trio-value ${stats.winRate > 50 ? 'mgr-positive' : stats.winRate > 0 ? 'mgr-negative' : ''}`}>
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="rsk-trio-sub">{stats.wins}W / {stats.losses}L</div>
        </div>
        <div className="rsk-trio-card">
          <div className="rsk-trio-label">P. FACTOR</div>
          <div className="rsk-trio-value">
            {stats.profitFactor == null ? '—' : stats.profitFactor === Infinity ? '∞' : stats.profitFactor === 0 ? '—' : stats.profitFactor.toFixed(2)}
          </div>
          <div className="rsk-trio-sub">gross P/L</div>
        </div>
        <div className="rsk-trio-card">
          <div className="rsk-trio-label">AVG R:R</div>
          <div className="rsk-trio-value">
            {stats.avgWin > 0 && stats.avgLoss < 0
              ? (stats.avgWin / Math.abs(stats.avgLoss)).toFixed(2)
              : '- - -'}
          </div>
          <div className="rsk-trio-sub">win / loss</div>
        </div>
      </div>

      {/* ── 4. Trade Stats Grid ── */}
      <div className="rsk-section rsk-stats-grid">
        <div className="rsk-stat-row">
          <span className="rsk-stat-label">Expectancy</span>
          <span className={`rsk-stat-value ${stats.expectancy >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
            {formatPnl(stats.expectancy)}
          </span>
          <span className="rsk-stat-label">Net Profit</span>
          <span className={`rsk-stat-value ${stats.netProfit >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
            {formatPnl(stats.netProfit)}
          </span>
        </div>
        <div className="rsk-stat-row">
          <span className="rsk-stat-label">Avg Win</span>
          <span className={`rsk-stat-value ${stats.avgWin > 0 ? 'mgr-positive' : ''}`}>
            {stats.avgWin > 0 ? formatPnl(stats.avgWin) : '- - -'}
          </span>
          <span className="rsk-stat-label">Avg Loss</span>
          <span className={`rsk-stat-value ${stats.avgLoss < 0 ? 'mgr-negative' : ''}`}>
            {stats.avgLoss < 0 ? formatPnl(stats.avgLoss) : '- - -'}
          </span>
        </div>
        <div className="rsk-stat-row">
          <span className="rsk-stat-label">Best Trade</span>
          <span className={`rsk-stat-value ${stats.bestTrade > 0 ? 'mgr-positive' : ''}`}>
            {stats.bestTrade > 0 ? formatPnl(stats.bestTrade) : '- - -'}
          </span>
          <span className="rsk-stat-label">Worst Trade</span>
          <span className={`rsk-stat-value ${stats.worstTrade < 0 ? 'mgr-negative' : ''}`}>
            {stats.worstTrade < 0 ? formatPnl(stats.worstTrade) : '- - -'}
          </span>
        </div>
        <div className="rsk-stat-row">
          <span className="rsk-stat-label">Max Win Streak</span>
          <span className="rsk-stat-value">{stats.maxWinStreak}</span>
          <span className="rsk-stat-label">Max Loss Streak</span>
          <span className="rsk-stat-value">{stats.maxLossStreak}</span>
        </div>
        <div className="rsk-stat-row">
          <span className="rsk-stat-label">Commission</span>
          <span className="rsk-stat-value">${Math.abs(stats.totalCommission).toFixed(0)}</span>
          <span className="rsk-stat-label">Swap</span>
          <span className="rsk-stat-value">${Math.abs(stats.totalSwap).toFixed(0)}</span>
        </div>
      </div>

      {/* ── 5. Risk-Adjusted Returns ── */}
      <div className="rsk-section">
        <div className="rsk-section-header">
          <span className="rsk-section-title">RISK-ADJUSTED RETURNS</span>
          <span className="rsk-section-meta">{stats.samples} samples</span>
        </div>
        <div className="rsk-trio-cards rsk-trio-cards-compact">
          <div className="rsk-trio-card">
            <div className="rsk-trio-label">SHARPE</div>
            <div className="rsk-trio-value">{stats.sharpe.toFixed(2)}</div>
          </div>
          <div className="rsk-trio-card">
            <div className="rsk-trio-label">SORTINO</div>
            <div className="rsk-trio-value">{stats.sortino.toFixed(2)}</div>
          </div>
          <div className="rsk-trio-card">
            <div className="rsk-trio-label">MAX DD</div>
            <div className={`rsk-trio-value ${stats.maxDrawdown > 0 ? 'mgr-negative' : ''}`}>
              {stats.maxDrawdown > 0 ? '-' : ''}{stats.maxDrawdown.toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="rsk-recovery-row">
          <span className="rsk-stat-label">Recovery Factor</span>
          <span className={`rsk-stat-value ${stats.recoveryFactor > 0 ? 'mgr-positive' : ''}`}>
            {stats.recoveryFactor.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── 6. Closed Deals Section ── */}
      <div className="rsk-closed-header">
        <span className="rsk-section-title">CLOSED DEALS</span>
        <span className="rsk-section-meta">
          {deals.length} trades · <span className={stats.netProfit >= 0 ? 'mgr-positive' : 'mgr-negative'}>
            {formatPnl(stats.netProfit)}
          </span>
        </span>
      </div>

      {/* P&L Attribution */}
      <div className="rsk-section">
        <div className="rsk-section-header">
          <span className="rsk-section-title">P&L ATTRIBUTION</span>
          <div className="rsk-attr-legend">
            <span className="rsk-attr-dot rsk-attr-dot-long" /> Long
            <span className="rsk-attr-dot rsk-attr-dot-short" /> Short
          </div>
        </div>
        {/* Bar */}
        <div className="rsk-attr-bar">
          {longPnl !== 0 && (
            <div className="rsk-attr-bar-long">
              <span>Long</span>
              <span>{formatPnl(longPnl)}</span>
            </div>
          )}
          {shortPnl !== 0 && (
            <div className="rsk-attr-bar-short">
              <span>Short</span>
              <span>{formatPnl(shortPnl)}</span>
            </div>
          )}
          {longPnl === 0 && shortPnl === 0 && (
            <div className="rsk-attr-bar-empty">No closed trades</div>
          )}
        </div>
        {/* Attribution stats */}
        <div className="rsk-attr-stats">
          <div className="rsk-attr-col">
            <div className="rsk-attr-stat"><span className="rsk-attr-stat-label">TRADES</span><span className="rsk-attr-stat-value">{longDeals.length}</span></div>
            <div className="rsk-attr-stat"><span className="rsk-attr-stat-label">WIN %</span><span className="rsk-attr-stat-value mgr-positive">{longDeals.length > 0 ? `${Math.round((longWins / longDeals.length) * 100)}%` : '—'}</span></div>
            <div className="rsk-attr-stat"><span className="rsk-attr-stat-label">AVG</span><span className={`rsk-attr-stat-value ${longAvg >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>{longDeals.length > 0 ? formatPnl(longAvg) : '—'}</span></div>
            <div className="rsk-attr-stat"><span className="rsk-attr-stat-label">BEST</span><span className="rsk-attr-stat-value mgr-positive">{longDeals.length > 0 ? formatPnl(longBest) : '—'}</span></div>
          </div>
          <div className="rsk-attr-col">
            <div className="rsk-attr-stat"><span className="rsk-attr-stat-label">TRADES</span><span className="rsk-attr-stat-value">{shortDeals.length}</span></div>
            <div className="rsk-attr-stat"><span className="rsk-attr-stat-label">WIN %</span><span className="rsk-attr-stat-value">{shortDeals.length > 0 ? `${Math.round((shortWins / shortDeals.length) * 100)}%` : '—'}</span></div>
            <div className="rsk-attr-stat"><span className="rsk-attr-stat-label">AVG</span><span className="rsk-attr-stat-value">{shortDeals.length > 0 ? formatPnl(shortAvg) : '—'}</span></div>
            <div className="rsk-attr-stat"><span className="rsk-attr-stat-label">BEST</span><span className="rsk-attr-stat-value">{shortDeals.length > 0 ? formatPnl(shortBest) : '—'}</span></div>
          </div>
        </div>
      </div>

      {/* Symbol Leaderboard */}
      <div className="rsk-section">
        <div className="rsk-section-header">
          <span className="rsk-section-title">SYMBOL LEADERBOARD</span>
          <div className="rsk-lb-toggle">
            <button onClick={() => setLbMode('net')} className={`rsk-lb-btn ${lbMode === 'net' ? 'rsk-lb-btn-active' : ''}`}>Net</button>
            <button onClick={() => setLbMode('pnl')} className={`rsk-lb-btn ${lbMode === 'pnl' ? 'rsk-lb-btn-active' : ''}`}>P&L</button>
          </div>
        </div>
        {symbolBoard.length === 0 ? (
          <div className="rsk-empty">No trades</div>
        ) : (
          symbolBoard.map(([sym, data], i) => (
            <div key={sym} className="rsk-lb-row">
              <span className="rsk-lb-rank">{i + 1}</span>
              <span className="rsk-lb-sym">{sym}</span>
              <span className="rsk-lb-count">{data.count} trades</span>
              <span className={`rsk-lb-pnl ${data.pnl >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
                {formatPnl(data.pnl)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ── 7. Trade History ── */}
      <div className="rsk-trades-list">
        {deals.length === 0 ? (
          <div className="rsk-empty">No closed trades in this period</div>
        ) : (
          deals.map((deal) => {
            const isBuy = deal.type === 'DEAL_TYPE_BUY';
            const heldStr = deal.openTime && deal.closeTime ? formatHeld(deal.openTime, deal.closeTime) : '';
            const pnlPct = accountInfo.balance > 0 ? (deal.profit / accountInfo.balance) * 100 : 0;
            return (
              <div key={deal.id} className={`rsk-trade-card ${deal.profit >= 0 ? 'rsk-trade-card-win' : 'rsk-trade-card-loss'}`}>
                <div className="rsk-trade-top">
                  <div className="rsk-trade-left">
                    <span className={`rsk-trade-badge ${isBuy ? 'rsk-trade-badge-buy' : 'rsk-trade-badge-sell'}`}>
                      {isBuy ? 'BUY' : 'SELL'}
                    </span>
                    <span className="rsk-trade-symbol">{deal.symbol}</span>
                    <span className="rsk-trade-sep">·</span>
                    <span className="rsk-trade-lots">{deal.volume} lots</span>
                  </div>
                  <div className="rsk-trade-right">
                    <span className={`rsk-trade-pnl ${deal.profit >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
                      {formatPnl(deal.profit)}
                    </span>
                    <span className={`rsk-trade-pct ${deal.profit >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
                      {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="rsk-trade-meta">
                  {deal.closeTime && <span>{formatTime(deal.closeTime)}</span>}
                  {heldStr && <><span className="rsk-trade-sep">·</span><span>held {heldStr}</span></>}
                  {deal.entryPrice > 0 && deal.exitPrice > 0 && (
                    <><span className="rsk-trade-sep">·</span><span>{deal.entryPrice.toFixed(3)} → {deal.exitPrice.toFixed(3)}</span></>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 8. Sticky Bottom Bar Container ── */}
      <div className="rsk-bottom-bar-container">
        <div className={`rsk-bottom-bar ${isSticky ? 'rsk-bottom-bar-sticky' : 'rsk-bottom-bar-inline'}`}>
          <div className="rsk-bottom-item">
            <span className="rsk-bottom-label">NET</span>
            <span className={`rsk-bottom-value ${stats.netProfit >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
              {formatPnl(stats.netProfit)}
            </span>
          </div>
          <div className="rsk-bottom-item">
            <span className="rsk-bottom-label">VOL</span>
            <span className="rsk-bottom-value">{stats.totalVolume.toFixed(2)}</span>
          </div>
          <div className="rsk-bottom-item">
            <span className="rsk-bottom-label">WIN %</span>
            <span className="rsk-bottom-value">{stats.winRate.toFixed(0)}</span>
          </div>
          <div className="rsk-bottom-item">
            <span className="rsk-bottom-label">AVG TRADE</span>
            <span className={`rsk-bottom-value ${stats.avgTrade >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
              {formatPnl(stats.avgTrade)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
