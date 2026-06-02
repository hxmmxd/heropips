'use client';

import React, { useState } from 'react';
import { AccountInfo, Position } from '@/types';
import { useLivePrices } from '@/hooks/useLivePrices';

interface ManagerInsightsProps {
  accountInfo: AccountInfo;
  positions: Position[];
  activeBrokerId: string;
  onRefresh: () => void;
}

type TradingMode = 'market' | 'custom' | 'lots' | 'risk';

const DEFAULT_SYMBOLS = [
  'XAUUSD.sc', 'XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD',
  'GBPUSD', 'USDJPY', 'NAS100', 'US30', 'XAGUSD.sc',
];

const VOLUMES = ['0.01', '0.02', '0.05', '0.1', '0.2', '0.5', '1.0', '2.0', '5.0', '10.0'];

export default function ManagerInsights({ accountInfo, positions, activeBrokerId, onRefresh }: ManagerInsightsProps) {
  const [tradingMode, setTradingMode] = useState<TradingMode>('market');
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOLS[0]);
  const [volume, setVolume] = useState('0.01');
  const [multiplier, setMultiplier] = useState(1);
  const [customPrice, setCustomPrice] = useState('');
  const [riskType, setRiskType] = useState<'%' | '$'>('%');
  const [riskValue, setRiskValue] = useState('1');
  const [slType, setSlType] = useState<'PTS' | 'PRICE'>('PTS');
  const [slValue, setSlValue] = useState('500');
  const [executing, setExecuting] = useState<'buy' | 'sell' | null>(null);
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [showVolumeDropdown, setShowVolumeDropdown] = useState(false);

  const { getPrice } = useLivePrices();

  // Get live bid/ask prices
  const livePrice = getPrice(symbol.replace('.sc', '').replace('USD', '')) || getPrice(symbol);
  const spread = livePrice ? (livePrice > 100 ? 0.5 : 0.0003) : 0;
  const bidPrice = livePrice ? livePrice - spread / 2 : 0;
  const askPrice = livePrice ? livePrice + spread / 2 : 0;

  const effectiveVolume = (parseFloat(volume) * multiplier).toFixed(2);

  // Risk-based lot calculation
  const riskDollar = riskType === '%'
    ? (accountInfo.balance * parseFloat(riskValue || '0')) / 100
    : parseFloat(riskValue || '0');

  const handleOrder = async (direction: 'BUY' | 'SELL') => {
    if (!activeBrokerId || activeBrokerId === 'none') return;
    setExecuting(direction === 'BUY' ? 'buy' : 'sell');
    try {
      const body: any = {
        action: 'place',
        brokerId: activeBrokerId,
        symbol,
        direction,
        volume: effectiveVolume,
      };
      if (tradingMode === 'custom' && customPrice) {
        body.price = customPrice;
      }
      const res = await fetch('/api/broker/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.error || 'Order failed');
      }
    } catch (err: any) {
      alert('Order failed: ' + err.message);
    } finally {
      setExecuting(null);
    }
  };

  const formatPrice = (p: number) => {
    if (p === 0) return '—';
    return p > 999
      ? p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : p.toFixed(p > 10 ? 2 : 5);
  };

  const fmtUsd = (v: number) => '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Stats
  const positionsWithoutSL = positions.filter(p => !p.stopLoss).length;
  const buyPositions = positions.filter(p => p.type === 'POSITION_TYPE_BUY');
  const sellPositions = positions.filter(p => p.type === 'POSITION_TYPE_SELL');
  const profitableCount = positions.filter(p => p.profit > 0).length;
  const winRate = positions.length > 0 ? Math.round((profitableCount / positions.length) * 100) : 0;

  const nearestTP = positions
    .filter(p => p.takeProfit && p.currentPrice)
    .map(p => Math.abs((p.takeProfit! - p.currentPrice) * (p.currentPrice > 100 ? 10 : 100000)))
    .sort((a, b) => a - b)[0];

  return (
    <div className="mgr-insights">
      {/* Account Info Cards — 2×2 Grid */}
      <div className="mgr-cards-grid">
        <div className="mgr-card">
          <div className="mgr-card-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M3 7v14M9 3v18M15 7v14M21 3v18" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Balance
          </div>
          <div className="mgr-card-value">${accountInfo.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="mgr-card">
          <div className="mgr-card-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Equity
          </div>
          <div className="mgr-card-value">${accountInfo.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="mgr-card-sub">
            <span className="mgr-guard-dot" />
            Guard Off
          </div>
        </div>

        <div className="mgr-card">
          <div className="mgr-card-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17l-4-4m0 0l4-4m-4 4h18" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            MTM P&L
          </div>
          <div className={`mgr-card-value ${accountInfo.mtmPnl >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
            {accountInfo.mtmPnl >= 0 ? '+' : ''}{accountInfo.mtmPnl < 0 ? '-' : ''}${Math.abs(accountInfo.mtmPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mgr-card-sub">
            <span className="mgr-pnl-dot" /> {accountInfo.mtmPnlPercent.toFixed(4)}%
            <span className="mgr-guard-label">Guard Off</span>
          </div>
        </div>

        <div className="mgr-card">
          <div className="mgr-card-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M9.76 14.24l-2.83 2.83m0-10.14l2.83 2.83m4.48 4.48l2.83 2.83"/>
            </svg>
            Lots & Positions
          </div>
          <div className="mgr-card-value-split">
            <span className="mgr-card-value">{accountInfo.totalLots}</span>
            <span className="mgr-card-value" style={{ marginLeft: '12px' }}>{accountInfo.positionCount}</span>
          </div>
          <div className="mgr-card-sub-split">
            <span>Total Lots</span>
            <span>Positions</span>
          </div>
        </div>
      </div>

      {/* ── Trading Panel ── */}
      <div className="mgr-trading-panel">
        {/* Mode Tabs */}
        <div className="mgr-mode-tabs">
          {(['lots', 'risk', 'market', 'custom'] as TradingMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTradingMode(mode)}
              className={`mgr-mode-tab ${tradingMode === mode ? 'mgr-mode-tab-active' : ''}`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Custom/Risk inputs */}
        {(tradingMode === 'custom' || tradingMode === 'risk') && (
          <div className="mgr-custom-price">
            {tradingMode === 'risk' && (
              <>
                <div className="mgr-risk-input-group">
                  <div className="mgr-risk-label">RISK</div>
                  <div className="mgr-toggle-pills">
                    <button
                      onClick={() => setRiskType('%')}
                      className={`mgr-toggle-pill ${riskType === '%' ? 'mgr-toggle-pill-active' : ''}`}
                    >%</button>
                    <button
                      onClick={() => setRiskType('$')}
                      className={`mgr-toggle-pill ${riskType === '$' ? 'mgr-toggle-pill-active' : ''}`}
                    >$</button>
                  </div>
                  <input
                    type="number"
                    value={riskValue}
                    onChange={(e) => setRiskValue(e.target.value)}
                    className="mgr-input"
                    placeholder="1"
                  />
                  {riskDollar > 0 && (
                    <div className="mgr-risk-calc">= ${riskDollar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  )}
                </div>
                <div className="mgr-risk-input-group" style={{ marginTop: '10px' }}>
                  <div className="mgr-risk-label">STOP LOSS</div>
                  <div className="mgr-toggle-pills">
                    <button
                      onClick={() => setSlType('PTS')}
                      className={`mgr-toggle-pill ${slType === 'PTS' ? 'mgr-toggle-pill-active' : ''}`}
                    >PTS</button>
                    <button
                      onClick={() => setSlType('PRICE')}
                      className={`mgr-toggle-pill ${slType === 'PRICE' ? 'mgr-toggle-pill-active' : ''}`}
                    >PRICE</button>
                  </div>
                  <input
                    type="number"
                    value={slValue}
                    onChange={(e) => setSlValue(e.target.value)}
                    className="mgr-input"
                    placeholder="500"
                  />
                </div>
                <div className="mgr-risk-hint">Enter risk & SL to compute lot size</div>
              </>
            )}
            {tradingMode === 'custom' && (
              <div className="mgr-price-stepper">
                <button onClick={() => setCustomPrice(String(Math.max(0, parseFloat(customPrice || '0') - (livePrice && livePrice > 100 ? 0.1 : 0.0001))))} className="mgr-stepper-btn">−</button>
                <input
                  type="number"
                  value={customPrice || (livePrice ? formatPrice(livePrice) : '')}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="mgr-input mgr-price-input"
                  step={livePrice && livePrice > 100 ? '0.1' : '0.0001'}
                />
                <button onClick={() => setCustomPrice(String(parseFloat(customPrice || '0') + (livePrice && livePrice > 100 ? 0.1 : 0.0001)))} className="mgr-stepper-btn">+</button>
              </div>
            )}
          </div>
        )}

        {/* Symbol + Volume + Multiplier — single compact row */}
        <div className="ins-controls-row">
          <div className="mgr-dropdown-wrap" style={{ position: 'relative' }}>
            <button
              className="mgr-dropdown-btn"
              onClick={() => { setShowSymbolDropdown(!showSymbolDropdown); setShowVolumeDropdown(false); }}
            >
              {symbol} <span className="mgr-dropdown-arrow">▾</span>
            </button>
            {showSymbolDropdown && (
              <>
                <div className="mgr-dropdown-overlay" onClick={() => setShowSymbolDropdown(false)} />
                <div className="mgr-dropdown-menu">
                  {DEFAULT_SYMBOLS.map((s) => (
                    <button key={s} onClick={() => { setSymbol(s); setShowSymbolDropdown(false); }} className="mgr-dropdown-item">
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mgr-dropdown-wrap" style={{ position: 'relative' }}>
            <button
              className="mgr-dropdown-btn"
              onClick={() => { setShowVolumeDropdown(!showVolumeDropdown); setShowSymbolDropdown(false); }}
            >
              {volume} <span className="mgr-dropdown-arrow">▾</span>
            </button>
            {showVolumeDropdown && (
              <>
                <div className="mgr-dropdown-overlay" onClick={() => setShowVolumeDropdown(false)} />
                <div className="mgr-dropdown-menu">
                  {VOLUMES.map((v) => (
                    <button key={v} onClick={() => { setVolume(v); setShowVolumeDropdown(false); }} className="mgr-dropdown-item">
                      {v}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {tradingMode !== 'risk' && (
            <div className="ins-mult-group">
              {[1, 5, 10].map((m) => (
                <button
                  key={m}
                  onClick={() => setMultiplier(m)}
                  className={`mgr-mult-pill ${multiplier === m ? 'mgr-mult-pill-active' : ''}`}
                >
                  x{m}
                </button>
              ))}
            </div>
          )}

          {tradingMode !== 'risk' && (
            <span className="ins-vol-summary">= {effectiveVolume}</span>
          )}
        </div>

        {/* Buy / Sell Buttons */}
        <div className="ins-trade-btns">
          <button
            className="ins-sell-btn"
            onClick={() => handleOrder('SELL')}
            disabled={!!executing}
          >
            {executing === 'sell' ? (
              <span className="mgr-btn-spinner" />
            ) : (
              <>
                <span className="ins-btn-label">SELL</span>
                <span className="ins-btn-price">{bidPrice ? formatPrice(bidPrice) : '—'}</span>
              </>
            )}
          </button>
          <button
            className="ins-buy-btn"
            onClick={() => handleOrder('BUY')}
            disabled={!!executing}
          >
            {executing === 'buy' ? (
              <span className="mgr-btn-spinner" />
            ) : (
              <>
                <span className="ins-btn-label">BUY</span>
                <span className="ins-btn-price">{askPrice ? formatPrice(askPrice) : '—'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Break-Even & Max Cards */}
      <div className="mgr-be-grid">
        <div className="mgr-be-card">
          <div className="mgr-be-label">Buy BE</div>
          <div className="mgr-be-value">—</div>
          <div className="mgr-be-sub">{buyPositions.reduce((a, p) => a + p.volume, 0).toFixed(2)}L</div>
        </div>
        <div className="mgr-be-card">
          <div className="mgr-be-label">Sell BE</div>
          <div className="mgr-be-value">—</div>
          <div className="mgr-be-sub">{sellPositions.reduce((a, p) => a + p.volume, 0).toFixed(2)}L</div>
        </div>
        <div className="mgr-be-card">
          <div className="mgr-be-label">Max Loss</div>
          <div className="mgr-be-value mgr-negative">—</div>
        </div>
        <div className="mgr-be-card">
          <div className="mgr-be-label">Max Profit</div>
          <div className="mgr-be-value">∞</div>
        </div>
      </div>

      {/* Account Risk Summary */}
      <div className="mgr-risk-summary">
        <div className="mgr-risk-header">
          <div className="mgr-risk-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Account Risk Summary
          </div>
          <button className="mgr-details-link">Details &gt;</button>
        </div>
        <div className="mgr-risk-stats">
          <div className="mgr-risk-stat">
            <span className="mgr-risk-stat-label">Win Rate</span>
            <span className="mgr-risk-stat-value mgr-positive">{winRate}%</span>
          </div>
          <div className="mgr-risk-stat">
            <span className="mgr-risk-stat-label">Avg R:R</span>
            <span className="mgr-risk-stat-value">N/A</span>
          </div>
          <div className="mgr-risk-stat">
            <span className="mgr-risk-stat-label">No SL</span>
            <span className="mgr-risk-stat-value mgr-warn">{positionsWithoutSL}</span>
          </div>
        </div>
        <div className="mgr-risk-stats mgr-risk-stats-2">
          <div className="mgr-risk-stat">
            <span className="mgr-risk-stat-label">Nearest SL</span>
            <span className="mgr-risk-stat-value">{positionsWithoutSL === positions.length ? 'No SL' : '—'}</span>
          </div>
          <div className="mgr-risk-stat">
            <span className="mgr-risk-stat-label">Nearest TP</span>
            <span className="mgr-risk-stat-value mgr-positive">{nearestTP ? `${Math.round(nearestTP)} pts` : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
