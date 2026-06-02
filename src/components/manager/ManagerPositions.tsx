'use client';

import React, { useState } from 'react';
import { Position, PendingOrder, AccountInfo } from '@/types';

interface ManagerPositionsProps {
  positions: Position[];
  pendingOrders: PendingOrder[];
  accountInfo: AccountInfo;
  activeBrokerId: string;
  onRefresh: () => void;
}

// Group positions by symbol
function groupPositions(positions: Position[]) {
  const groups: Record<string, {
    symbol: string;
    type: 'POSITION_TYPE_BUY' | 'POSITION_TYPE_SELL';
    positions: Position[];
    totalVolume: number;
    totalProfit: number;
    avgEntryPrice: number;
    latestCurrentPrice: number;
    stopLoss?: number;
    takeProfit?: number;
  }> = {};

  for (const p of positions) {
    const key = `${p.symbol}-${p.type}`;
    if (!groups[key]) {
      groups[key] = {
        symbol: p.symbol,
        type: p.type,
        positions: [],
        totalVolume: 0,
        totalProfit: 0,
        avgEntryPrice: 0,
        latestCurrentPrice: p.currentPrice,
        stopLoss: p.stopLoss,
        takeProfit: p.takeProfit,
      };
    }
    groups[key].positions.push(p);
    groups[key].totalVolume += p.volume;
    groups[key].totalProfit += p.profit;
    groups[key].latestCurrentPrice = p.currentPrice;
    if (p.stopLoss) groups[key].stopLoss = p.stopLoss;
    if (p.takeProfit) groups[key].takeProfit = p.takeProfit;
  }

  // Calculate weighted average entry price
  for (const g of Object.values(groups)) {
    const totalWeightedPrice = g.positions.reduce((sum, p) => sum + p.openPrice * p.volume, 0);
    g.avgEntryPrice = g.totalVolume > 0 ? totalWeightedPrice / g.totalVolume : 0;
  }

  return Object.values(groups);
}

// Get short symbol badge (e.g., XAG, XAU, BTC)
function getSymbolBadge(symbol: string): { text: string; color: string; bg: string } {
  const s = symbol.toUpperCase();
  if (s.includes('XAG')) return { text: 'XAG', color: '#8B6914', bg: 'rgba(139,105,20,0.15)' };
  if (s.includes('XAU') || s.includes('GOLD')) return { text: 'XAU', color: '#B8860B', bg: 'rgba(184,134,11,0.15)' };
  if (s.includes('BTC')) return { text: 'BTC', color: '#F7931A', bg: 'rgba(247,147,26,0.15)' };
  if (s.includes('ETH')) return { text: 'ETH', color: '#627EEA', bg: 'rgba(98,126,234,0.15)' };
  if (s.includes('EUR')) return { text: 'EUR', color: '#003399', bg: 'rgba(0,51,153,0.15)' };
  if (s.includes('GBP')) return { text: 'GBP', color: '#1A237E', bg: 'rgba(26,35,126,0.15)' };
  if (s.includes('NAS') || s.includes('NDX')) return { text: 'NAS', color: '#0D47A1', bg: 'rgba(13,71,161,0.15)' };
  if (s.includes('US30') || s.includes('DOW')) return { text: 'DOW', color: '#1565C0', bg: 'rgba(21,101,192,0.15)' };
  return { text: s.slice(0, 3), color: '#666', bg: 'rgba(102,102,102,0.15)' };
}

export default function ManagerPositions({ positions, pendingOrders, accountInfo, activeBrokerId, onRefresh }: ManagerPositionsProps) {
  const [positionView, setPositionView] = useState<'open' | 'pending'>('open');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [modifyingId, setModifyingId] = useState<string | null>(null);
  const [modifySL, setModifySL] = useState('');
  const [modifyTP, setModifyTP] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchClosing, setBatchClosing] = useState(false);

  const grouped = groupPositions(positions);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(positions.map(p => p.id)));
  const deselectAll = () => setSelectedIds(new Set());

  // Dominant symbol for select counter
  const dominantSymbol = (() => {
    const sel = positions.filter(p => selectedIds.has(p.id));
    if (sel.length === 0) return '';
    const counts: Record<string, number> = {};
    sel.forEach(p => { counts[p.symbol] = (counts[p.symbol] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const dir = sel.filter(p => p.type === 'POSITION_TYPE_BUY').length >= sel.filter(p => p.type === 'POSITION_TYPE_SELL').length ? 'Long' : 'Short';
    return `${top[0]} ${dir}`;
  })();

  const handleBatchClose = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Close ${selectedIds.size} selected position${selectedIds.size > 1 ? 's' : ''}?`)) return;
    setBatchClosing(true);
    try {
      for (const posId of selectedIds) {
        await fetch('/api/broker/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'close', brokerId: activeBrokerId, positionId: posId }),
        });
      }
      setSelectMode(false);
      setSelectedIds(new Set());
      onRefresh();
    } catch (err: any) {
      alert('Batch close failed: ' + err.message);
    } finally {
      setBatchClosing(false);
    }
  };

  const handleClose = async (positionId: string) => {
    if (!confirm('Close this position?')) return;
    setClosingId(positionId);
    try {
      const res = await fetch('/api/broker/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', brokerId: activeBrokerId, positionId }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.error || 'Close failed');
      }
    } catch (err: any) {
      alert('Close failed: ' + err.message);
    } finally {
      setClosingId(null);
    }
  };

  const handleModify = async (positionId: string) => {
    try {
      const body: any = { action: 'modify', brokerId: activeBrokerId, positionId };
      if (modifySL) body.stopLoss = parseFloat(modifySL);
      if (modifyTP) body.takeProfit = parseFloat(modifyTP);
      const res = await fetch('/api/broker/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setModifyingId(null);
        onRefresh();
      } else {
        alert(data.error || 'Modify failed');
      }
    } catch (err: any) {
      alert('Modify failed: ' + err.message);
    }
  };

  const handleCloseAll = async () => {
    if (!confirm(`Close all ${positions.length} positions?`)) return;
    try {
      const res = await fetch('/api/broker/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'closeAll', brokerId: activeBrokerId }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch {}
  };

  return (
    <div className="mgr-positions">
      {/* Position Type Tabs */}
      <div className="mgr-pos-tabs">
        <div className="mgr-pos-tabs-left">
          <button
            onClick={() => setPositionView('open')}
            className={`mgr-pos-tab ${positionView === 'open' ? 'mgr-pos-tab-active' : ''}`}
          >
            Open <span className="mgr-pos-count">{positions.length}</span>
          </button>
          <button
            onClick={() => setPositionView('pending')}
            className={`mgr-pos-tab ${positionView === 'pending' ? 'mgr-pos-tab-active' : ''}`}
          >
            Pending <span className="mgr-pos-count mgr-pos-count-pending">{pendingOrders.length}</span>
          </button>
        </div>
        <div className="mgr-pos-view-toggle">
          <button
            onClick={() => setViewMode('card')}
            className={`mgr-view-btn ${viewMode === 'card' ? 'mgr-view-btn-active' : ''}`}
            title="Card view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 12h18" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`mgr-view-btn ${viewMode === 'list' ? 'mgr-view-btn-active' : ''}`}
            title="List view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Open Positions */}
      {positionView === 'open' && (
        <>
        <div className="mgr-pos-list">
          {positions.length === 0 ? (
            <div className="mgr-pos-empty">
              <p>No open positions</p>
            </div>
          ) : (
            <>
              {/* Summary Header */}
              {!selectMode ? (
                <div className="mgr-pos-summary">
                  <div className="mgr-pos-summary-left">
                    <span className="mgr-pos-summary-title">Open Positions</span>
                    <span className="mgr-pos-summary-net">
                      Net: {positions.reduce((a, p) => a + p.volume, 0).toFixed(2)} NET {positions.filter(p => p.type === 'POSITION_TYPE_BUY').length >= positions.filter(p => p.type === 'POSITION_TYPE_SELL').length ? 'LONG' : 'SHORT'} ·{' '}
                      <span className={positions.reduce((a, p) => a + p.profit, 0) >= 0 ? 'mgr-positive' : 'mgr-negative'}>
                        {positions.reduce((a, p) => a + p.profit, 0) >= 0 ? '+' : '-'}${Math.abs(positions.reduce((a, p) => a + p.profit, 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </span>
                  </div>
                  <div className="mgr-pos-summary-right">
                    <button className="mgr-pos-summary-btn mgr-pos-summary-btn-active">All</button>
                    <button className="mgr-pos-summary-btn" onClick={() => { setSelectMode(true); setViewMode('list'); }}>Select</button>
                  </div>
                </div>
              ) : (
                <div className="mgr-sel-header">
                  <span className="mgr-pos-summary-title">Open Positions</span>
                  <button
                    className={`mgr-sel-all-pill ${selectedIds.size === positions.length ? 'mgr-sel-all-pill-active' : ''}`}
                    onClick={() => selectedIds.size === positions.length ? deselectAll() : selectAll()}
                  >
                    All{selectedIds.size === positions.length ? ' ✓' : ''}
                  </button>
                  <span className="mgr-sel-counter">
                    {selectedIds.size}/{positions.length} {dominantSymbol}
                  </span>
                  <button className="mgr-sel-all-link" onClick={selectAll}>All</button>
                  <button className="mgr-sel-done" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>Done</button>
                </div>
              )}

              {viewMode === 'card' ? (
                /* ── CARD VIEW (grouped) ── */
                grouped.map((group) => {
                  const isBuy = group.type === 'POSITION_TYPE_BUY';
                  const badge = getSymbolBadge(group.symbol);
                  const hasSL = group.stopLoss !== undefined;
                  const hasTP = group.takeProfit !== undefined;
                  const pnlPercent = accountInfo.balance > 0 ? (group.totalProfit / accountInfo.balance) * 100 : 0;
                  const pointMultiplier = group.avgEntryPrice > 100 ? 10 : 100000;
                  const pnlPts = Math.round((group.latestCurrentPrice - group.avgEntryPrice) * pointMultiplier * (isBuy ? 1 : -1));
                  const sl = group.stopLoss || 0;
                  const tp = group.takeProfit || 0;
                  const entry = group.avgEntryPrice;
                  const mark = group.latestCurrentPrice;
                  const barMin = Math.min(sl || entry * 0.95, entry, mark);
                  const barMax = Math.max(tp || entry * 1.05, entry, mark);
                  const barRange = barMax - barMin || 1;
                  const entryPos = ((entry - barMin) / barRange) * 100;
                  const markPos = ((mark - barMin) / barRange) * 100;
                  const tpPos = tp ? ((tp - barMin) / barRange) * 100 : null;
                  const firstPositionId = group.positions[0]?.id;
                  const isModifying = modifyingId === firstPositionId;

                  return (
                    <div key={`${group.symbol}-${group.type}`} className="mgr-pos-card">
                      <div className="mgr-pos-card-header">
                        <div className="mgr-pos-symbol-group">
                          <div className="mgr-pos-badge" style={{ background: badge.bg, color: badge.color }}>
                            {badge.text}
                          </div>
                          <div className="mgr-pos-symbol-info">
                            <span className="mgr-pos-symbol">{group.symbol}</span>
                            <span className={`mgr-pos-dir ${isBuy ? 'mgr-pos-dir-buy' : 'mgr-pos-dir-sell'}`}>
                              {isBuy ? '↗' : '↘'} {isBuy ? 'BUY' : 'SELL'}
                            </span>
                          </div>
                        </div>
                        <button className="mgr-pos-menu">⋯</button>
                      </div>
                      <div className="mgr-pos-meta">
                        <span>{group.positions.length} ticket{group.positions.length > 1 ? 's' : ''} · {group.totalVolume.toFixed(2)} lot</span>
                        {!hasSL && <span className="mgr-pos-no-sl">⚠ NO SL</span>}
                      </div>
                      <div className="mgr-pos-pnl-section">
                        <div className="mgr-pos-pnl-label">OPEN P&L</div>
                        <div className={`mgr-pos-pnl-value ${group.totalProfit >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
                          {group.totalProfit >= 0 ? '+' : '-'}${Math.abs(group.totalProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="mgr-pos-pnl-sub">
                          {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}% · {pnlPts >= 0 ? '+' : ''}{pnlPts} pts
                        </div>
                      </div>
                      <div className="mgr-pos-bar-wrap">
                        <div className="mgr-pos-bar">
                          <div className="mgr-pos-bar-red" style={{ width: `${entryPos}%` }} />
                          <div className="mgr-pos-bar-green" style={{ left: `${entryPos}%`, width: `${100 - entryPos}%` }} />
                          <div className="mgr-pos-bar-entry" style={{ left: `${entryPos}%` }} />
                          <div className="mgr-pos-bar-mark" style={{ left: `${markPos}%` }} />
                          {tpPos !== null && <div className="mgr-pos-bar-tp" style={{ left: `${tpPos}%` }} />}
                        </div>
                        <div className="mgr-pos-bar-labels">
                          <span>SL {hasSL ? group.stopLoss!.toFixed(3) : '—'}</span>
                          <span>entry {entry.toFixed(3)}</span>
                          <span>mark {mark.toFixed(3)}</span>
                          <span>TP {hasTP ? group.takeProfit!.toFixed(3) : '—'}</span>
                        </div>
                      </div>
                      {isModifying && (
                        <div className="mgr-pos-modify">
                          <div className="mgr-pos-modify-row">
                            <input type="number" placeholder="Stop Loss" value={modifySL} onChange={(e) => setModifySL(e.target.value)} className="mgr-input" />
                            <input type="number" placeholder="Take Profit" value={modifyTP} onChange={(e) => setModifyTP(e.target.value)} className="mgr-input" />
                          </div>
                          <div className="mgr-pos-modify-actions">
                            <button onClick={() => setModifyingId(null)} className="mgr-pos-modify-cancel">Cancel</button>
                            <button onClick={() => handleModify(firstPositionId)} className="mgr-pos-modify-save">Apply</button>
                          </div>
                        </div>
                      )}
                      <div className="mgr-pos-actions">
                        <button className="mgr-pos-action mgr-pos-action-sl" onClick={() => { setModifyingId(firstPositionId); setModifySL(group.stopLoss?.toString() || ''); setModifyTP(group.takeProfit?.toString() || ''); }}>
                          <span className="mgr-pos-action-icon">🟠</span> SL
                        </button>
                        <button className="mgr-pos-action mgr-pos-action-tp" onClick={() => { setModifyingId(firstPositionId); setModifySL(group.stopLoss?.toString() || ''); setModifyTP(group.takeProfit?.toString() || ''); }}>
                          <span className="mgr-pos-action-icon">🚩</span> TP
                        </button>
                        <button className="mgr-pos-action mgr-pos-action-rf" disabled><span className="mgr-pos-action-icon">🔒</span> RF</button>
                        <button className="mgr-pos-action mgr-pos-action-flash" onClick={handleCloseAll}><span className="mgr-pos-action-icon">⚡</span></button>
                        <button className="mgr-pos-action mgr-pos-action-close" onClick={() => handleClose(firstPositionId)} disabled={closingId === firstPositionId}>
                          {closingId === firstPositionId ? <span className="mgr-btn-spinner" /> : <span className="mgr-pos-action-icon">✕</span>}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* ── LIST VIEW (individual positions) ── */
                positions.map((pos) => {
                  const isBuy = pos.type === 'POSITION_TYPE_BUY';
                  const hasSL = pos.stopLoss !== undefined && pos.stopLoss !== null;
                  const hasTP = pos.takeProfit !== undefined && pos.takeProfit !== null;
                  const pointMultiplier = pos.openPrice > 100 ? 10 : 100000;
                  const pnlPts = Math.round((pos.currentPrice - pos.openPrice) * pointMultiplier * (isBuy ? 1 : -1));

                  // SL progress bar (how close current price is to SL vs TP)
                  const slProgress = hasSL && hasTP
                    ? Math.max(0, Math.min(100, ((pos.currentPrice - pos.stopLoss!) / (pos.takeProfit! - pos.stopLoss!)) * 100))
                    : hasSL ? 50 : 0;

                  // R:R ratio
                  const riskPts = hasSL ? Math.abs(pos.openPrice - pos.stopLoss!) * pointMultiplier : 0;
                  const rewardPts = hasTP ? Math.abs(pos.takeProfit! - pos.openPrice) * pointMultiplier : 0;
                  const rrRatio = riskPts > 0 && rewardPts > 0 ? (rewardPts / riskPts).toFixed(1) : '—';

                  return (
                    <div
                      key={pos.id}
                      className={`mgr-lv-card ${selectMode ? 'mgr-lv-card-selectable' : ''} ${selectedIds.has(pos.id) ? 'mgr-lv-card-selected' : ''}`}
                      onClick={selectMode ? () => toggleSelect(pos.id) : undefined}
                    >
                      <div className="mgr-lv-row1">
                        {selectMode && (
                          <button
                            className={`mgr-lv-checkbox ${selectedIds.has(pos.id) ? 'mgr-lv-checkbox-checked' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleSelect(pos.id); }}
                          >
                            {selectedIds.has(pos.id) && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                        )}
                        <span className="mgr-lv-symbol">{pos.symbol}</span>
                        <div className="mgr-lv-pnl-wrap">
                          <span className={`mgr-lv-pnl ${pos.profit >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
                            {pos.profit >= 0 ? '+' : '-'}${Math.abs(pos.profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <button
                            className="mgr-lv-close"
                            onClick={(e) => { e.stopPropagation(); handleClose(pos.id); }}
                            disabled={closingId === pos.id}
                          >
                            {closingId === pos.id ? <span className="mgr-btn-spinner" /> : '×'}
                          </button>
                        </div>
                      </div>

                      <div className={`mgr-lv-row2 ${selectMode ? 'mgr-lv-row2-indent' : ''}`}>
                        <span className={`mgr-lv-badge ${isBuy ? 'mgr-lv-badge-buy' : 'mgr-lv-badge-sell'}`}>
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                        <span className="mgr-lv-lots">{pos.volume} lots</span>
                        <span className={`mgr-lv-pts ${pnlPts >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
                          {pnlPts} pts
                        </span>
                      </div>

                      <div className="mgr-lv-bar-row">
                        <span className="mgr-lv-bar-label mgr-negative">SL</span>
                        <div className="mgr-lv-bar">
                          <div className="mgr-lv-bar-fill" style={{ width: `${Math.min(slProgress, 100)}%` }} />
                          <div className="mgr-lv-bar-dot" style={{ left: `${Math.min(slProgress, 100)}%` }} />
                        </div>
                        <span className="mgr-lv-bar-label mgr-positive">TP</span>
                      </div>

                      <div className="mgr-lv-info">
                        <span>Entry <b>{pos.openPrice > 100 ? pos.openPrice.toFixed(3) : pos.openPrice.toFixed(5)}</b></span>
                        <span>{hasSL ? `SL ${pos.stopLoss!.toFixed(3)}` : 'No SL'}</span>
                        <span>TP <b className="mgr-positive">{hasTP ? (pos.takeProfit! > 100 ? pos.takeProfit!.toFixed(3) : pos.takeProfit!.toFixed(5)) : '—'}</b></span>
                        <span>R:R <b>{rrRatio}</b></span>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Sticky Batch Close Bar */}
        {selectMode && selectedIds.size > 0 && (
          <div className="mgr-batch-bar">
            <button
              className="mgr-batch-btn"
              onClick={handleBatchClose}
              disabled={batchClosing}
            >
              {batchClosing ? (
                <><span className="mgr-btn-spinner" style={{ borderTopColor: '#fff' }} /> Closing...</>
              ) : (
                `Close Selected (${selectedIds.size})`
              )}
            </button>
          </div>
        )}
        </>
      )}

      {/* Pending Orders */}
      {positionView === 'pending' && (
        <div className="mgr-pos-list">
          {pendingOrders.length === 0 ? (
            <div className="mgr-pos-empty">
              <p>No pending orders</p>
            </div>
          ) : (
            pendingOrders.map((order) => {
              const badge = getSymbolBadge(order.symbol);
              const isBuy = order.type.includes('BUY');
              return (
                <div key={order.id} className="mgr-pos-card">
                  <div className="mgr-pos-card-header">
                    <div className="mgr-pos-symbol-group">
                      <div className="mgr-pos-badge" style={{ background: badge.bg, color: badge.color }}>
                        {badge.text}
                      </div>
                      <div className="mgr-pos-symbol-info">
                        <span className="mgr-pos-symbol">{order.symbol}</span>
                        <span className={`mgr-pos-dir ${isBuy ? 'mgr-pos-dir-buy' : 'mgr-pos-dir-sell'}`}>
                          {isBuy ? '↗ BUY LIMIT' : '↘ SELL LIMIT'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mgr-pos-meta">
                    <span>{order.volume} lot @ {order.openPrice}</span>
                  </div>
                  {order.stopLoss && <div className="mgr-pos-meta"><span>SL: {order.stopLoss}</span></div>}
                  {order.takeProfit && <div className="mgr-pos-meta"><span>TP: {order.takeProfit}</span></div>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
