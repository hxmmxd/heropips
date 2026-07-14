'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';

interface HistoryTabProps {
  logs: any[];
  activeBrokerId?: string;
}

interface ClosedDeal {
  id: string;
  symbol: string;
  type: string;
  direction: string;
  volume: number;
  profit: number;
  commission: number;
  swap: number;
  entryPrice: number;
  exitPrice: number;
  openTime: string;
  closeTime: string;
  positionId: string;
}

type TabMode = 'closed' | 'open';

// ── Helper: compute trade analysis from a deal ──
function analyzeTrade(deal: ClosedDeal) {
  const isBuy = deal.direction === 'BUY' || deal.type?.includes('BUY');
  const pips = isBuy
    ? deal.exitPrice - deal.entryPrice
    : deal.entryPrice - deal.exitPrice;
  const isGold = deal.symbol?.includes('XAU');
  const isJpy = deal.symbol?.includes('JPY');
  const pipMultiplier = isGold ? 10 : isJpy ? 100 : 10000;
  const pipsFormatted = (pips * pipMultiplier).toFixed(1);

  const openDate = new Date(deal.openTime);
  const closeDate = new Date(deal.closeTime);
  const durationMs = closeDate.getTime() - openDate.getTime();
  const durationMins = Math.floor(durationMs / 60000);
  const durationHrs = Math.floor(durationMins / 60);
  const durationDays = Math.floor(durationHrs / 24);
  let durationStr = '';
  if (durationDays > 0) durationStr = `${durationDays}d ${durationHrs % 24}h`;
  else if (durationHrs > 0) durationStr = `${durationHrs}h ${durationMins % 60}m`;
  else durationStr = `${durationMins}m`;

  const netPnl = deal.profit + (deal.commission || 0) + (deal.swap || 0);
  const costBasis = deal.entryPrice * deal.volume * (isGold ? 100 : 100000);
  const returnPct = costBasis > 0 ? ((deal.profit / costBasis) * 100).toFixed(3) : '0.000';

  const pnlPerLot = deal.volume > 0 ? (deal.profit / deal.volume).toFixed(2) : '0.00';
  const priceChange = ((deal.exitPrice - deal.entryPrice) / deal.entryPrice * 100).toFixed(4);

  // Classify trade quality
  let grade = 'C';
  let gradeColor = 'var(--subtext)';
  const absPips = Math.abs(parseFloat(pipsFormatted));
  if (deal.profit > 0 && absPips > 50) { grade = 'A+'; gradeColor = 'var(--positive)'; }
  else if (deal.profit > 0 && absPips > 20) { grade = 'A'; gradeColor = 'var(--positive)'; }
  else if (deal.profit > 0) { grade = 'B'; gradeColor = '#f59e0b'; }
  else if (deal.profit === 0) { grade = 'B-'; gradeColor = 'var(--subtext)'; }
  else if (absPips < 20) { grade = 'C'; gradeColor = '#f59e0b'; }
  else { grade = 'D'; gradeColor = 'var(--negative)'; }

  return {
    isBuy,
    pips: pipsFormatted,
    duration: durationStr,
    netPnl,
    returnPct,
    pnlPerLot,
    priceChange,
    grade,
    gradeColor,
    commission: deal.commission || 0,
    swap: deal.swap || 0,
    openDate,
    closeDate,
  };
}

export default function HistoryTab({ logs, activeBrokerId }: HistoryTabProps) {
  const [tab, setTab] = useState<TabMode>('closed');
  const [closedDeals, setClosedDeals] = useState<ClosedDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('7d');
  const [stats, setStats] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openPositions, setOpenPositions] = useState<any[]>([]);
  const [openLoading, setOpenLoading] = useState(false);

  const fetchDeals = useCallback(async () => {
    if (!activeBrokerId || activeBrokerId === 'none') return;
    setLoading(true);
    try {
      const res = await fetch(`/api/broker/deals?brokerId=${activeBrokerId}&period=${period}`);
      const data = await res.json();
      if (data.deals) setClosedDeals(data.deals);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch closed deals:', err);
    } finally {
      setLoading(false);
    }
  }, [activeBrokerId, period]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const fetchOpenPositions = useCallback(async () => {
    if (!activeBrokerId || activeBrokerId === 'none') return;
    setOpenLoading(true);
    try {
      const res = await fetch(`/api/broker/positions?brokerId=${activeBrokerId}`);
      const data = await res.json();
      if (data.positions) setOpenPositions(data.positions);
      else if (Array.isArray(data)) setOpenPositions(data);
    } catch (err) {
      console.error('Failed to fetch open positions:', err);
    } finally {
      setOpenLoading(false);
    }
  }, [activeBrokerId]);

  useEffect(() => { if (tab === 'open') fetchOpenPositions(); }, [tab, fetchOpenPositions]);

  const displayList = tab === 'closed' ? closedDeals : openPositions;

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatFullTime = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const formatPrice = (price: number, symbol?: string) => {
    if (!price) return '–';
    const isJpy = symbol?.includes('JPY');
    const isForex = symbol && !symbol.includes('XAU') && !symbol.includes('BTC') && !symbol.includes('NAS') && !symbol.includes('US30');
    if (isJpy) return price.toFixed(3);
    if (isForex) return price.toFixed(5);
    return price.toFixed(2);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="rsk-page" style={{ padding: '12px 14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
          Trade History
        </h2>
        <button onClick={() => { fetchDeals(); if (tab === 'open') fetchOpenPositions(); }} disabled={loading || openLoading} style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
          color: 'var(--subtext)', fontSize: '11px', fontWeight: 700,
        }}>
          <RefreshCw size={12} className={(loading || openLoading) ? 'animate-spin' : ''} /> Sync
        </button>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '8px' }}>
        <button onClick={() => setTab('closed')}
          className={`rsk-period-pill ${tab === 'closed' ? 'rsk-period-pill-active' : ''}`}
          style={{ borderRadius: '8px 0 0 8px', flex: 1, textAlign: 'center' }}>
          Closed ({closedDeals.length})
        </button>
        <button onClick={() => setTab('open')}
          className={`rsk-period-pill ${tab === 'open' ? 'rsk-period-pill-active' : ''}`}
          style={{ borderRadius: '0 8px 8px 0', flex: 1, textAlign: 'center' }}>
          Open ({openPositions.length})
        </button>
      </div>

      {/* Period Selector */}
      {tab === 'closed' && (
        <div className="rsk-period-pills" style={{ marginBottom: '8px' }}>
          {(['24h', '3d', '7d', '30d', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rsk-period-pill ${period === p ? 'rsk-period-pill-active' : ''}`}>
              {p === 'all' ? 'ALL' : p.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {tab === 'closed' && stats && closedDeals.length > 0 && (
        <div className="rsk-trio-cards" style={{ marginBottom: '8px' }}>
          <div className="rsk-trio-card">
            <div className="rsk-trio-label">NET P&L</div>
            <div className={`rsk-trio-value ${stats.netProfit >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
              {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit?.toFixed(2)}
            </div>
          </div>
          <div className="rsk-trio-card">
            <div className="rsk-trio-label">WIN RATE</div>
            <div className="rsk-trio-value">{stats.winRate}%</div>
          </div>
          <div className="rsk-trio-card">
            <div className="rsk-trio-label">TRADES</div>
            <div className="rsk-trio-value">{stats.samples || closedDeals.length}</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--subtext)', fontSize: '12px' }}>
          <RefreshCw size={16} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          Syncing deals from MT5…
        </div>
      )}

      {/* Empty State */}
      {!loading && displayList.length === 0 && (
        <div className="rsk-empty">
          {tab === 'closed'
            ? `No closed deals found for ${period.toUpperCase()} period.`
            : 'No open trades.'
          }
        </div>
      )}

      {/* ── Trade List ── */}
      {!loading && displayList.length > 0 && (
        <div className="rsk-trades-list">
          {tab === 'closed'
            ? closedDeals.map((deal) => {
                const analysis = analyzeTrade(deal);
                const isExpanded = expandedId === (deal.id || deal.positionId);
                const win = deal.profit > 0;
                const cardId = deal.id || deal.positionId;

                return (
                  <div
                    key={cardId}
                    className={`rsk-trade-card ${win ? 'rsk-trade-card-win' : 'rsk-trade-card-loss'}`}
                    onClick={() => toggleExpand(cardId)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Collapsed Summary */}
                    <div className="rsk-trade-top">
                      <div className="rsk-trade-left">
                        <span className={`rsk-trade-badge ${analysis.isBuy ? 'rsk-trade-badge-buy' : 'rsk-trade-badge-sell'}`}>
                          {analysis.isBuy ? 'BUY' : 'SELL'}
                        </span>
                        <span className="rsk-trade-symbol">{deal.symbol}</span>
                        <span className="rsk-trade-lots">{deal.volume?.toFixed(2)}L</span>
                      </div>
                      <div className="rsk-trade-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div>
                          <span className={`rsk-trade-pnl ${win ? 'mgr-positive' : 'mgr-negative'}`}>
                            {win ? '+' : ''}{deal.profit.toFixed(2)}
                          </span>
                          <span className="rsk-trade-pct">{analysis.pips}p · {analysis.duration}</span>
                        </div>
                        <ChevronDown size={14} style={{
                          color: 'var(--subtext)', opacity: 0.4,
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }} />
                      </div>
                    </div>
                    <div className="rsk-trade-meta">
                      <span>{formatPrice(deal.entryPrice, deal.symbol)} → {formatPrice(deal.exitPrice, deal.symbol)}</span>
                      <span className="rsk-trade-sep">·</span>
                      <span>{formatTime(deal.closeTime)}</span>
                    </div>

                    {/* ── Expanded Analysis Panel ── */}
                    {isExpanded && (
                      <div className="trade-analysis" onClick={(e) => e.stopPropagation()}>
                        {/* Grade Badge */}
                        <div className="ta-grade-row">
                          <div className="ta-grade" style={{ borderColor: analysis.gradeColor, color: analysis.gradeColor }}>
                            {analysis.grade}
                          </div>
                          <div className="ta-grade-label">
                            Trade Grade
                            <span className="ta-grade-sub">
                              {analysis.grade.startsWith('A') ? 'Excellent execution'
                                : analysis.grade === 'B' ? 'Profitable trade'
                                : analysis.grade === 'B-' ? 'Breakeven'
                                : analysis.grade === 'C' ? 'Small loss — acceptable'
                                : 'Review this trade'}
                            </span>
                          </div>
                        </div>

                        {/* P&L Breakdown */}
                        <div className="ta-section">
                          <div className="ta-section-title">P&L BREAKDOWN</div>
                          <div className="ta-grid">
                            <div className="ta-row">
                              <span className="ta-label">Gross P&L</span>
                              <span className={`ta-value ${deal.profit >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
                                {deal.profit >= 0 ? '+' : ''}{deal.profit.toFixed(2)}
                              </span>
                            </div>
                            <div className="ta-row">
                              <span className="ta-label">Commission</span>
                              <span className="ta-value" style={{ color: 'var(--negative)' }}>
                                {analysis.commission.toFixed(2)}
                              </span>
                            </div>
                            <div className="ta-row">
                              <span className="ta-label">Swap</span>
                              <span className={`ta-value ${analysis.swap >= 0 ? '' : ''}`} style={{ color: analysis.swap >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                                {analysis.swap >= 0 ? '+' : ''}{analysis.swap.toFixed(2)}
                              </span>
                            </div>
                            <div className="ta-row ta-row-total">
                              <span className="ta-label">Net P&L</span>
                              <span className={`ta-value ${analysis.netPnl >= 0 ? 'mgr-positive' : 'mgr-negative'}`} style={{ fontWeight: 900 }}>
                                {analysis.netPnl >= 0 ? '+' : ''}{analysis.netPnl.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Trade Metrics */}
                        <div className="ta-section">
                          <div className="ta-section-title">TRADE METRICS</div>
                          <div className="ta-metrics-grid">
                            <div className="ta-metric">
                              <span className="ta-metric-value">{analysis.pips}</span>
                              <span className="ta-metric-label">Pips</span>
                            </div>
                            <div className="ta-metric">
                              <span className="ta-metric-value">{analysis.duration}</span>
                              <span className="ta-metric-label">Duration</span>
                            </div>
                            <div className="ta-metric">
                              <span className="ta-metric-value">{analysis.returnPct}%</span>
                              <span className="ta-metric-label">Return</span>
                            </div>
                            <div className="ta-metric">
                              <span className="ta-metric-value">${analysis.pnlPerLot}</span>
                              <span className="ta-metric-label">P&L/Lot</span>
                            </div>
                          </div>
                        </div>

                        {/* Execution Details */}
                        <div className="ta-section">
                          <div className="ta-section-title">EXECUTION</div>
                          <div className="ta-grid">
                            <div className="ta-row">
                              <span className="ta-label">Direction</span>
                              <span className={`ta-value ${analysis.isBuy ? 'mgr-positive' : 'mgr-negative'}`} style={{ fontWeight: 700 }}>
                                {analysis.isBuy ? '↑ LONG' : '↓ SHORT'}
                              </span>
                            </div>
                            <div className="ta-row">
                              <span className="ta-label">Volume</span>
                              <span className="ta-value">{deal.volume?.toFixed(2)} lots</span>
                            </div>
                            <div className="ta-row">
                              <span className="ta-label">Entry</span>
                              <span className="ta-value" style={{ fontFamily: 'monospace' }}>{formatPrice(deal.entryPrice, deal.symbol)}</span>
                            </div>
                            <div className="ta-row">
                              <span className="ta-label">Exit</span>
                              <span className="ta-value" style={{ fontFamily: 'monospace' }}>{formatPrice(deal.exitPrice, deal.symbol)}</span>
                            </div>
                            <div className="ta-row">
                              <span className="ta-label">Price Δ</span>
                              <span className={`ta-value ${parseFloat(analysis.priceChange) >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
                                {parseFloat(analysis.priceChange) >= 0 ? '+' : ''}{analysis.priceChange}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Timestamps */}
                        <div className="ta-section">
                          <div className="ta-section-title">TIMELINE</div>
                          <div className="ta-timeline">
                            <div className="ta-timeline-item">
                              <div className="ta-timeline-dot ta-dot-open" />
                              <div>
                                <span className="ta-timeline-label">Opened</span>
                                <span className="ta-timeline-time">{formatFullTime(analysis.openDate)}</span>
                              </div>
                            </div>
                            <div className="ta-timeline-line" />
                            <div className="ta-timeline-item">
                              <div className={`ta-timeline-dot ${win ? 'ta-dot-win' : 'ta-dot-loss'}`} />
                              <div>
                                <span className="ta-timeline-label">Closed</span>
                                <span className="ta-timeline-time">{formatFullTime(analysis.closeDate)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="ta-id">
                          ID: {deal.positionId || deal.id}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            : openPositions.map((pos) => {
                const isBuy = String(pos.type).includes('BUY');
                const pnlVal = pos.profit || 0;
                return (
                  <div key={pos.id} className="rsk-trade-card rsk-trade-card-live">
                    <div className="rsk-trade-top">
                      <div className="rsk-trade-left">
                        <span className={`rsk-trade-badge ${isBuy ? 'rsk-trade-badge-buy' : 'rsk-trade-badge-sell'}`}>
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                        <span className="rsk-trade-symbol">{pos.symbol}</span>
                        <span className="rsk-trade-lots">{Number(pos.volume || 0.01).toFixed(2)}L</span>
                      </div>
                      <div className="rsk-trade-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`rsk-trade-pnl ${pnlVal >= 0 ? 'mgr-positive' : 'mgr-negative'}`} style={{ fontSize: '13px', fontWeight: 700 }}>
                          {pnlVal >= 0 ? '+' : ''}{pnlVal.toFixed(2)}
                        </span>
                        <span className="rsk-trade-badge rsk-trade-badge-live">
                          <span className="live-dot" />
                          LIVE
                        </span>
                      </div>
                    </div>
                    <div className="rsk-trade-meta">
                      <span>Entry {formatPrice(Number(pos.openPrice), pos.symbol)}</span>
                      {pos.currentPrice && (
                        <>
                          <span className="rsk-trade-sep">·</span>
                          <span>Now {formatPrice(Number(pos.currentPrice), pos.symbol)}</span>
                        </>
                      )}
                      {pos.stopLoss && (
                        <>
                          <span className="rsk-trade-sep">·</span>
                          <span className="rsk-trade-sl">SL {formatPrice(Number(pos.stopLoss), pos.symbol)}</span>
                        </>
                      )}
                      {pos.takeProfit && (
                        <>
                          <span className="rsk-trade-sep">·</span>
                          <span className="rsk-trade-tp">TP {formatPrice(Number(pos.takeProfit), pos.symbol)}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
}
