'use client';

import React, { useState, useEffect } from 'react';
import { AccountInfo, Position } from '@/types';
import { useLivePrices } from '@/hooks/useLivePrices';
import { ManagerConfigValues } from './ManagerConfig';
import { useSignal } from '@/contexts/SignalContext';
import SlideToExecute from './SlideToExecute';

interface ManagerInsightsProps {
  accountInfo: AccountInfo;
  positions: Position[];
  activeBrokerId: string;
  onRefresh: () => void;
  config?: ManagerConfigValues;
  onNavigateToRisk?: () => void;
}

type TradingMode = 'market' | 'custom' | 'lots' | 'risk' | 'signal';

const DEFAULT_SYMBOLS = [
  'XAUUSD.sc', 'XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD',
  'GBPUSD', 'USDJPY', 'NAS100', 'US30', 'XAGUSD.sc',
];

const VOLUMES = ['0.01', '0.02', '0.05', '0.1', '0.2', '0.5', '1.0', '2.0', '5.0', '10.0'];

export default function ManagerInsights({ accountInfo, positions, activeBrokerId, onRefresh, config, onNavigateToRisk }: ManagerInsightsProps) {
  const [tradingMode, setTradingMode] = useState<TradingMode>('market');
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOLS[0]);
  const [volume, setVolume] = useState(config?.defaultLot || '0.01');
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
  const { pendingSignal, clearSignal, hasSignal } = useSignal();

  // Auto-switch to signal mode when a signal arrives
  useEffect(() => {
    if (pendingSignal) {
      setTradingMode('signal');
      setSymbol(pendingSignal.symbol);
      setVolume(pendingSignal.lotSize.toFixed(2));
      setSignalSL(pendingSignal.stopLoss.toFixed(2));
      setSignalTP(pendingSignal.takeProfit.toFixed(2));
      setSignalLot(pendingSignal.lotSize);
    }
  }, [pendingSignal]);

  // Signal mode editable params
  const [signalSL, setSignalSL] = useState('');
  const [signalTP, setSignalTP] = useState('');
  const [signalLot, setSignalLot] = useState(0.01);

  // Get live bid/ask prices — improved symbol resolution (MGR-011)
  const normalizedSymbol = symbol.replace('.sc', '');
  const livePrice = getPrice(normalizedSymbol) || getPrice(symbol) || getPrice(normalizedSymbol.replace('USD', ''));

  // Better per-asset spread estimates (MGR-010)
  const getTypicalSpread = (sym: string, price: number): number => {
    const s = sym.toUpperCase();
    if (s.includes('XAU')) return 0.30;
    if (s.includes('XAG')) return 0.03;
    if (s.includes('BTC')) return 25;
    if (s.includes('ETH')) return 2;
    if (s.includes('NAS') || s.includes('US30') || s.includes('SP')) return 1.5;
    if (s.includes('OIL') || s.includes('XTI')) return 0.04;
    if (price > 100) return 0.5;
    return 0.00015;
  };
  const spread = livePrice ? getTypicalSpread(symbol, livePrice) : 0;
  const bidPrice = livePrice ? livePrice - spread / 2 : 0;
  const askPrice = livePrice ? livePrice + spread / 2 : 0;

  const effectiveVolume = (parseFloat(volume) * multiplier).toFixed(2);

  // Risk-based lot calculation
  const riskDollar = riskType === '%'
    ? (accountInfo.balance * parseFloat(riskValue || '0')) / 100
    : parseFloat(riskValue || '0');

  // Compute lot size from risk parameters
  const computeRiskLot = (): { lot: number; slPrice: number } => {
    if (!livePrice || riskDollar <= 0) return { lot: 0, slPrice: 0 };
    const slNum = parseFloat(slValue || '0');
    if (slNum <= 0) return { lot: 0, slPrice: 0 };

    // Point value depends on the instrument class
    const isForex = livePrice < 10 && !symbol.toUpperCase().includes('XAG');
    const isMetals = symbol.toUpperCase().includes('XAU') || symbol.toUpperCase().includes('XAG');
    const pipValue = isForex ? 100000 : isMetals ? 100 : 1;

    let slDistance: number;
    if (slType === 'PTS') {
      slDistance = slNum / pipValue;
    } else {
      slDistance = Math.abs(livePrice - slNum);
    }
    if (slDistance <= 0) return { lot: 0, slPrice: 0 };

    const dollarPerLot = slDistance * pipValue;
    const lot = Math.max(0.01, Math.round((riskDollar / dollarPerLot) * 100) / 100);
    const slPrice = slType === 'PTS' ? 0 : slNum; // 0 = use pts, API will calc
    return { lot, slPrice };
  };

  const riskLot = tradingMode === 'risk' ? computeRiskLot() : { lot: 0, slPrice: 0 };
  const orderVolume = tradingMode === 'risk' ? riskLot.lot.toFixed(2) : effectiveVolume;

  const handleOrder = async (direction: 'BUY' | 'SELL') => {
    if (!activeBrokerId || activeBrokerId === 'none') return;
    if (tradingMode === 'risk' && riskLot.lot <= 0) {
      alert('Set valid risk amount and stop loss to compute lot size.');
      return;
    }
    setExecuting(direction === 'BUY' ? 'buy' : 'sell');
    try {
      const body: any = {
        action: 'place',
        brokerId: activeBrokerId,
        symbol,
        direction,
        volume: orderVolume,
      };
      if (tradingMode === 'custom') {
        const price = customPrice || (livePrice ? String(livePrice) : '');
        if (price) body.price = price;
      }
      // Auto-attach SL when in risk mode
      if (tradingMode === 'risk' && parseFloat(slValue || '0') > 0) {
        if (slType === 'PRICE') {
          body.stopLoss = parseFloat(slValue);
        } else if (livePrice) {
          const slPts = parseFloat(slValue) / (livePrice < 10 ? 100000 : livePrice > 1000 ? 100 : 1);
          body.stopLoss = direction === 'BUY' ? livePrice - slPts : livePrice + slPts;
        }
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

  // Break-Even calculation (MGR-008): volume-weighted average entry
  const computeBE = (posArr: Position[]) => {
    if (posArr.length === 0) return null;
    const totalVol = posArr.reduce((a, p) => a + p.volume, 0);
    if (totalVol <= 0) return null;
    return posArr.reduce((a, p) => a + p.openPrice * p.volume, 0) / totalVol;
  };
  const buyBE = computeBE(buyPositions);
  const sellBE = computeBE(sellPositions);

  // Max Loss: sum of worst-case P&L if all SL hit (MGR-008)
  const maxLoss = positions.reduce((total, p) => {
    if (!p.stopLoss) return total; // no SL = unlimited risk, skip
    const isBuy = p.type === 'POSITION_TYPE_BUY';
    const pipMult = p.currentPrice > 100 ? 10 : 100000;
    const slLoss = Math.abs(p.openPrice - p.stopLoss) * p.volume * pipMult;
    return total + (isBuy ? (p.stopLoss < p.openPrice ? slLoss : -slLoss) : (p.stopLoss > p.openPrice ? slLoss : -slLoss));
  }, 0);

  // Nearest SL calculation (MGR-009)
  const nearestSL = positions
    .filter(p => p.stopLoss && p.currentPrice)
    .map(p => Math.abs((p.currentPrice - p.stopLoss!) * (p.currentPrice > 100 ? 10 : 100000)))
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

          {tradingMode === 'risk' ? (
            <span className="ins-vol-summary">
              = {riskLot.lot > 0 ? `${riskLot.lot.toFixed(2)} lot (risk: $${riskDollar.toFixed(2)})` : 'Set SL'}
            </span>
          ) : (
            <span className="ins-vol-summary">= {effectiveVolume}</span>
          )}
        </div>

        {/* Buy / Sell Buttons — or Signal Mode */}
        {tradingMode === 'signal' && pendingSignal ? (
          <div className="signal-panel" style={{ '--ste-color': pendingSignal.direction === 'BUY' ? '34, 197, 94' : '239, 68, 68' } as React.CSSProperties}>
            {/* Signal Header */}
            <div className="signal-panel-header">
              <span className={`signal-panel-badge ${pendingSignal.direction.toLowerCase()}`}>
                {pendingSignal.direction === 'BUY' ? '▲' : '▼'} {pendingSignal.direction}
              </span>
              <span className="signal-panel-title">{pendingSignal.symbol}</span>
              <span className="signal-panel-confluence">
                {pendingSignal.confluenceScore}% • {pendingSignal.confidenceGrade}
              </span>
            </div>

            {/* SMC Patterns */}
            {pendingSignal.smcPatterns.length > 0 && (
              <div className="signal-smc-tags">
                {pendingSignal.smcPatterns.map((p, i) => (
                  <span key={i} className="signal-smc-tag">{p}</span>
                ))}
              </div>
            )}

            {/* Editable Params — 2×2 grid */}
            <div className="signal-panel-grid">
              <div className="signal-param">
                <span className="signal-param-label">Entry Price</span>
                <span className="signal-param-value">${pendingSignal.entryPrice.toFixed(2)}</span>
              </div>
              <div className="signal-param">
                <span className="signal-param-label">Lot Size</span>
                <input
                  type="number"
                  value={signalLot}
                  onChange={(e) => setSignalLot(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                  className="signal-param-input"
                  step="0.01"
                  min="0.01"
                  max="10"
                />
              </div>
              <div className="signal-param">
                <span className="signal-param-label">Stop Loss</span>
                <input
                  type="number"
                  value={signalSL}
                  onChange={(e) => setSignalSL(e.target.value)}
                  className="signal-param-input"
                  step="0.01"
                />
              </div>
              <div className="signal-param">
                <span className="signal-param-label">Take Profit</span>
                <input
                  type="number"
                  value={signalTP}
                  onChange={(e) => setSignalTP(e.target.value)}
                  className="signal-param-input"
                  step="0.01"
                />
              </div>
            </div>

            {/* Lot Slider */}
            <input
              type="range"
              min="0.01"
              max="5"
              step="0.01"
              value={signalLot}
              onChange={(e) => setSignalLot(parseFloat(e.target.value))}
              className="signal-lot-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--subtext)', fontWeight: 700, marginBottom: 10 }}>
              <span>0.01</span>
              <span>{signalLot.toFixed(2)} lots • R:R {pendingSignal.rrRatio}</span>
              <span>5.00</span>
            </div>

            {/* Slide to Execute */}
            <SlideToExecute
              direction={pendingSignal.direction}
              loading={!!executing}
              onExecute={async () => {
                setExecuting(pendingSignal.direction === 'BUY' ? 'buy' : 'sell');
                try {
                  const body: any = {
                    action: 'place',
                    brokerId: activeBrokerId,
                    symbol,
                    direction: pendingSignal.direction,
                    volume: signalLot.toFixed(2),
                  };
                  if (signalSL) body.stopLoss = parseFloat(signalSL);
                  if (signalTP) body.takeProfit = parseFloat(signalTP);
                  const res = await fetch('/api/broker/order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                  });
                  const data = await res.json();
                  if (data.success) {
                    onRefresh();
                    clearSignal();
                    setTradingMode('market');
                  } else {
                    alert(data.error || 'Order failed');
                  }
                } catch (err: any) {
                  alert('Order failed: ' + err.message);
                } finally {
                  setExecuting(null);
                }
              }}
            />

            <button className="signal-dismiss" onClick={() => { clearSignal(); setTradingMode('market'); }}>
              Dismiss signal & return to manual
            </button>
          </div>
        ) : (
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
                <div className="ins-btn-icon-circle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="ins-btn-text-group">
                  <span className="ins-btn-label">SELL</span>
                  <span className="ins-btn-price">{bidPrice ? formatPrice(bidPrice) : '—'}</span>
                </div>
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
                <div className="ins-btn-icon-circle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="ins-btn-text-group">
                  <span className="ins-btn-label">BUY</span>
                  <span className="ins-btn-price">{askPrice ? formatPrice(askPrice) : '—'}</span>
                </div>
              </>
            )}
          </button>
        </div>
        )}
      </div>

      {/* Break-Even & Max Cards */}
      <div className="mgr-be-grid">
        <div className="mgr-be-card">
          <div className="mgr-be-label">Buy BE</div>
          <div className="mgr-be-value">{buyBE ? formatPrice(buyBE) : '—'}</div>
          <div className="mgr-be-sub">{buyPositions.reduce((a, p) => a + p.volume, 0).toFixed(2)}L</div>
        </div>
        <div className="mgr-be-card">
          <div className="mgr-be-label">Sell BE</div>
          <div className="mgr-be-value">{sellBE ? formatPrice(sellBE) : '—'}</div>
          <div className="mgr-be-sub">{sellPositions.reduce((a, p) => a + p.volume, 0).toFixed(2)}L</div>
        </div>
        <div className="mgr-be-card">
          <div className="mgr-be-label">Max Loss</div>
          <div className="mgr-be-value mgr-negative">
            {positionsWithoutSL < positions.length && maxLoss > 0 ? `-$${maxLoss.toFixed(2)}` : '—'}
          </div>
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
          <button className="mgr-details-link" onClick={onNavigateToRisk}>Details &gt;</button>
        </div>
        <div className="mgr-risk-stats">
          <div className="mgr-risk-stat">
            <span className="mgr-risk-stat-label">Open P&L Rate</span>
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
            <span className="mgr-risk-stat-value">{nearestSL ? `${Math.round(nearestSL)} pts` : (positionsWithoutSL === positions.length ? 'No SL' : '—')}</span>
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
