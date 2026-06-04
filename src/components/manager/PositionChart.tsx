'use client';

import React, { useEffect, useRef, useState } from 'react';

interface PositionChartProps {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  isBuy: boolean;
  volume: number;
  activeBrokerId: string;
  onClose: () => void;
  onRefresh: () => void;
}

// ── Map MetaAPI symbols to TradingView symbols ──
function toTradingViewSymbol(symbol: string): string {
  const s = symbol.toUpperCase().replace(/[\/\.\-\s]/g, '');

  // Forex / Metals
  const forexMap: Record<string, string> = {
    'XAUUSD': 'OANDA:XAUUSD',
    'XAGUSD': 'OANDA:XAGUSD',
    'EURUSD': 'FX:EURUSD',
    'GBPUSD': 'FX:GBPUSD',
    'USDJPY': 'FX:USDJPY',
    'AUDUSD': 'FX:AUDUSD',
    'NZDUSD': 'FX:NZDUSD',
    'USDCAD': 'FX:USDCAD',
    'USDCHF': 'FX:USDCHF',
    'EURGBP': 'FX:EURGBP',
    'EURJPY': 'FX:EURJPY',
    'GBPJPY': 'FX:GBPJPY',
    'AUDJPY': 'FX:AUDJPY',
    'EURAUD': 'FX:EURAUD',
    'EURNZD': 'FX:EURNZD',
    'GBPAUD': 'FX:GBPAUD',
  };
  if (forexMap[s]) return forexMap[s];

  // Indices
  const indexMap: Record<string, string> = {
    'NAS100': 'PEPPERSTONE:NAS100',
    'USTEC': 'PEPPERSTONE:NAS100',
    'US30': 'PEPPERSTONE:US30',
    'SPX500': 'PEPPERSTONE:SPX500',
    'US500': 'PEPPERSTONE:SPX500',
    'UK100': 'PEPPERSTONE:UK100',
    'GER40': 'PEPPERSTONE:GER40',
    'DE40': 'PEPPERSTONE:GER40',
    'JP225': 'PEPPERSTONE:JP225',
  };
  if (indexMap[s]) return indexMap[s];

  // Crypto
  if (s.endsWith('USDT') || s.endsWith('USD')) {
    const base = s.replace(/USDT?$/, '');
    return `BINANCE:${base}USDT`;
  }

  // Oil
  if (s.includes('USOIL') || s.includes('WTI') || s === 'XTIUSD') return 'TVC:USOIL';
  if (s.includes('UKOIL') || s.includes('BRENT') || s === 'XBRUSD') return 'TVC:UKOIL';

  // Fallback: try OANDA
  return `OANDA:${s}`;
}

// Map timeframe to TradingView interval
function toTVInterval(tf: string): string {
  const map: Record<string, string> = {
    '1m': '1', '5m': '5', '15m': '15', '30m': '30',
    '1h': '60', '4h': '240', '1D': 'D', '1W': 'W',
  };
  return map[tf] || '15';
}

export default function PositionChart({
  symbol,
  entryPrice,
  currentPrice,
  stopLoss,
  takeProfit,
  isBuy,
  volume,
  activeBrokerId,
  onClose,
  onRefresh,
}: PositionChartProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState('15m');
  const [livePrice, setLivePrice] = useState(currentPrice);
  const [tickDirection, setTickDirection] = useState<'up' | 'down' | 'flat'>('flat');
  const [executing, setExecuting] = useState<'buy' | 'sell' | null>(null);

  const tvSymbol = toTradingViewSymbol(symbol);
  const decimals = entryPrice > 100 ? 2 : 5;
  const pnlFromEntry = livePrice - entryPrice;
  const pnlPct = entryPrice > 0 ? ((pnlFromEntry / entryPrice) * 100) * (isBuy ? 1 : -1) : 0;
  const pnlValue = isBuy ? pnlFromEntry : -pnlFromEntry;

  // Spread estimate for bid/ask
  const spreadFactor = entryPrice > 100 ? 0.3 : 0.00015;
  const bidPrice = livePrice - spreadFactor / 2;
  const askPrice = livePrice + spreadFactor / 2;

  const handleOrder = async (direction: 'BUY' | 'SELL') => {
    if (!activeBrokerId || activeBrokerId === 'none') return;
    setExecuting(direction === 'BUY' ? 'buy' : 'sell');
    try {
      const res = await fetch('/api/broker/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place',
          brokerId: activeBrokerId,
          symbol,
          direction,
          volume: volume || 0.01,
        }),
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

  // ── Embed TradingView Widget ──
  useEffect(() => {
    if (!widgetRef.current) return;

    // Clear previous widget
    widgetRef.current.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'tradingview-widget-container__widget';
    container.style.height = '100%';
    container.style.width = '100%';
    widgetRef.current.appendChild(container);

    // Determine current theme dynamically from document element
    const isDark = document.documentElement.classList.contains('dark');
    const tvTheme = isDark ? 'dark' : 'light';
    const tvBgColor = isDark ? '#08080e' : '#ffffff';
    const tvGridColor = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: toTVInterval(timeframe),
      timezone: 'Etc/UTC',
      theme: tvTheme,
      style: '1', // Candlestick
      locale: 'en',
      backgroundColor: tvBgColor,
      gridColor: tvGridColor,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      studies: [
        'MAExp@tv-basicstudies',  // EMA
      ],
    });
    widgetRef.current.appendChild(script);

    return () => {
      if (widgetRef.current) {
        widgetRef.current.innerHTML = '';
      }
    };
  }, [tvSymbol, timeframe]);

  // ── SSE live price for the ticker display ──
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;
    const normalSym = symbol.toUpperCase().replace(/[\/\.\-\s]/g, '');

    const connect = () => {
      eventSource = new EventSource('/api/price-stream');
      eventSource.onmessage = (event) => {
        try {
          const prices: Record<string, number> = JSON.parse(event.data);
          for (const [key, val] of Object.entries(prices)) {
            const normalKey = key.toUpperCase().replace(/[\/\.\-\s]/g, '');
            if (
              normalKey === normalSym ||
              (normalKey.startsWith(normalSym.slice(0, 3)) && normalSym.startsWith(normalKey.slice(0, 3)))
            ) {
              const newPrice = val as number;
              if (newPrice > 0) {
                setLivePrice(prev => {
                  setTickDirection(newPrice > prev ? 'up' : newPrice < prev ? 'down' : 'flat');
                  return newPrice;
                });
              }
              break;
            }
          }
        } catch {}
      };
      eventSource.onerror = () => {
        eventSource?.close();
        reconnectTimer = setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [symbol]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];

  return (
    <div className="pos-chart-overlay" onClick={onClose}>
      <div className="pos-chart-fullscreen" onClick={(e) => e.stopPropagation()}>

        {/* ── Top Bar ── */}
        <div className="pos-chart-header">
          <div className="pos-chart-title">
            <span className="pos-chart-symbol">{symbol}</span>
            <span className={`pos-chart-dir ${isBuy ? 'mgr-positive' : 'mgr-negative'}`}>
              {isBuy ? '↗ LONG' : '↘ SHORT'}
            </span>
          </div>
          <div className="pos-chart-actions">
            <div className="pos-chart-timeframes">
              {timeframes.map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`pos-chart-tf ${timeframe === tf ? 'pos-chart-tf-active' : ''}`}
                >
                  {tf}
                </button>
              ))}
            </div>
            <button className="pos-chart-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── Live Price + Position Info ── */}
        <div className="pos-chart-live-ticker">
          <div className="pos-chart-live-price-wrap">
            <span className="pos-chart-live-dot" />
            <span className={`pos-chart-live-price ${tickDirection === 'up' ? 'pos-chart-tick-up' : tickDirection === 'down' ? 'pos-chart-tick-down' : ''}`}>
              {livePrice.toFixed(decimals)}
            </span>
            <span className={`pos-chart-live-change ${pnlValue >= 0 ? 'mgr-positive' : 'mgr-negative'}`}>
              {pnlValue >= 0 ? '+' : ''}{pnlValue.toFixed(decimals)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
            </span>
          </div>
          <div className="pos-chart-levels">
            <span className="pos-chart-level">
              <span className="pos-chart-level-label">ENTRY</span>
              <span className="pos-chart-level-val" style={{ color: '#B8860B' }}>{entryPrice.toFixed(decimals)}</span>
            </span>
            {stopLoss && stopLoss > 0 && (
              <span className="pos-chart-level">
                <span className="pos-chart-level-label">SL</span>
                <span className="pos-chart-level-val mgr-negative">{stopLoss.toFixed(decimals)}</span>
              </span>
            )}
            {takeProfit && takeProfit > 0 && (
              <span className="pos-chart-level">
                <span className="pos-chart-level-label">TP</span>
                <span className="pos-chart-level-val mgr-positive">{takeProfit.toFixed(decimals)}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── TradingView Chart ── */}
        <div className="pos-chart-container">
          <div
            ref={widgetRef}
            className="tradingview-widget-container"
            style={{ height: '100%', width: '100%' }}
          />
        </div>

        {/* ── Buy / Sell Bar ── */}
        <div className="pos-chart-trade-bar">
          <button
            className="pos-chart-sell-btn"
            onClick={() => handleOrder('SELL')}
            disabled={!!executing}
          >
            {executing === 'sell' ? (
              <span className="mgr-btn-spinner" />
            ) : (
              <>
                <div className="pos-chart-btn-icon-circle">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="pos-chart-btn-text-group">
                  <span className="pos-chart-btn-label">SELL</span>
                  <span className="pos-chart-btn-price">{bidPrice.toFixed(decimals)}</span>
                </div>
              </>
            )}
          </button>
          <div className="pos-chart-spread-info">
            <span className="pos-chart-spread-vol">{volume.toFixed(2)} lot</span>
          </div>
          <button
            className="pos-chart-buy-btn"
            onClick={() => handleOrder('BUY')}
            disabled={!!executing}
          >
            {executing === 'buy' ? (
              <span className="mgr-btn-spinner" />
            ) : (
              <>
                <div className="pos-chart-btn-icon-circle">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="pos-chart-btn-text-group">
                  <span className="pos-chart-btn-label">BUY</span>
                  <span className="pos-chart-btn-price">{askPrice.toFixed(decimals)}</span>
                </div>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
