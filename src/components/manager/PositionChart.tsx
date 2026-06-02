'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface PositionChartProps {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  isBuy: boolean;
  onClose: () => void;
}

export default function PositionChart({
  symbol,
  entryPrice,
  currentPrice,
  stopLoss,
  takeProfit,
  isBuy,
  onClose,
}: PositionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('15m');
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const lastCandleRef = useRef<any>(null);
  const [livePrice, setLivePrice] = useState(currentPrice);
  const [prevPrice, setPrevPrice] = useState(currentPrice);
  const [tickDirection, setTickDirection] = useState<'up' | 'down' | 'flat'>('flat');
  const livePriceLineRef = useRef<any>(null);
  const pnlFromEntry = livePrice - entryPrice;
  const pnlPct = entryPrice > 0 ? ((pnlFromEntry / entryPrice) * 100) * (isBuy ? 1 : -1) : 0;
  const pnlValue = isBuy ? pnlFromEntry : -pnlFromEntry;

  // ── Connect to SSE price stream for live updates ──
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;

    const connect = () => {
      eventSource = new EventSource('/api/price-stream');

      eventSource.onmessage = (event) => {
        try {
          const prices = JSON.parse(event.data);
          // Match symbol — try exact, then fuzzy
          const sym = symbol.toUpperCase();
          let newPrice: number | null = null;

          // Direct match
          for (const [key, val] of Object.entries(prices)) {
            const k = key.toUpperCase().replace('/', '');
            const s = sym.replace('/', '').replace('.', '');
            if (k === s || k.includes(s) || s.includes(k)) {
              newPrice = val as number;
              break;
            }
          }

          if (newPrice && newPrice > 0) {
            setPrevPrice(prev => {
              setTickDirection(newPrice! > prev ? 'up' : newPrice! < prev ? 'down' : 'flat');
              return prev;
            });
            setLivePrice(newPrice);
            setPrevPrice(newPrice);

            // Update the last candle on the chart
            if (candleSeriesRef.current && lastCandleRef.current) {
              const last = { ...lastCandleRef.current };
              last.close = newPrice;
              if (newPrice > last.high) last.high = newPrice;
              if (newPrice < last.low) last.low = newPrice;
              lastCandleRef.current = last;
              candleSeriesRef.current.update(last);
            }

            // Update live price line position
            if (livePriceLineRef.current) {
              try {
                livePriceLineRef.current.applyOptions({
                  price: newPrice,
                  axisLabelColor: newPrice >= entryPrice ? '#16a34a' : '#ef4444',
                });
              } catch {}
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
  }, [symbol, entryPrice]);

  // ── Render chart ──
  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    let chart: any = null;
    let resizeObserver: ResizeObserver | null = null;

    const renderChart = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&interval=${timeframe}`);
        const data = await res.json();

        if (!isMounted || !containerRef.current) return;

        if (!data.candles || data.candles.length === 0) {
          setError('No chart data available');
          setLoading(false);
          return;
        }

        const { createChart, ColorType, CrosshairMode, LineStyle } = await import('lightweight-charts');

        if (!isMounted || !containerRef.current) return;

        if (chartRef.current) {
          try { chartRef.current.remove(); } catch {}
        }

        const chartHeight = containerRef.current.clientHeight || (window.innerHeight - 140);
        chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: chartHeight,
          layout: {
            background: { type: ColorType.Solid, color: '#08080e' },
            textColor: '#555',
            fontSize: 10,
            fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
          },
          grid: {
            vertLines: { color: 'rgba(255,255,255,0.025)' },
            horzLines: { color: 'rgba(255,255,255,0.025)' },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: { color: 'rgba(184,134,11,0.3)', width: 1, style: LineStyle.Dashed, labelVisible: true, labelBackgroundColor: '#1a1a2e' },
            horzLine: { color: 'rgba(184,134,11,0.3)', width: 1, style: LineStyle.Dashed, labelVisible: true, labelBackgroundColor: '#1a1a2e' },
          },
          rightPriceScale: {
            borderVisible: false,
            scaleMargins: { top: 0.06, bottom: 0.06 },
            entireTextOnly: true,
          },
          timeScale: {
            borderVisible: false,
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 8,
          },
        });
        chartRef.current = chart;

        const lc = await import('lightweight-charts');
        const candleSeries = chart.addSeries(lc.CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderDownColor: '#dc2626',
          borderUpColor: '#16a34a',
          wickDownColor: 'rgba(220,38,38,0.5)',
          wickUpColor: 'rgba(22,163,74,0.5)',
        });
        candleSeriesRef.current = candleSeries;

        const chartData = data.candles.map((c: any) => ({
          time: Math.floor(new Date(c.time.replace(' ', 'T') + 'Z').getTime() / 1000) as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        candleSeries.setData(chartData);
        lastCandleRef.current = chartData[chartData.length - 1];

        // Volume
        const volumeSeries = chart.addSeries(lc.HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        chart.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.88, bottom: 0 },
        });
        if (data.candles[0]?.volume !== undefined) {
          volumeSeries.setData(data.candles.map((c: any) => ({
            time: Math.floor(new Date(c.time.replace(' ', 'T') + 'Z').getTime() / 1000) as any,
            value: c.volume || 0,
            color: c.close >= c.open ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          })));
        }

        // ── Entry line ──
        candleSeries.createPriceLine({
          price: entryPrice,
          color: '#B8860B',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `▸ ENTRY`,
          axisLabelColor: '#B8860B',
          axisLabelTextColor: '#fff',
        });

        // ── SL line ──
        if (stopLoss && stopLoss > 0) {
          candleSeries.createPriceLine({
            price: stopLoss,
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `✕ SL`,
            axisLabelColor: '#ef4444',
            axisLabelTextColor: '#fff',
          });
        }

        // ── TP line ──
        if (takeProfit && takeProfit > 0) {
          candleSeries.createPriceLine({
            price: takeProfit,
            color: '#22c55e',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `◆ TP`,
            axisLabelColor: '#22c55e',
            axisLabelTextColor: '#fff',
          });
        }

        // ── Live price line ──
        livePriceLineRef.current = candleSeries.createPriceLine({
          price: currentPrice,
          color: 'rgba(255,255,255,0.5)',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: '',
          axisLabelColor: currentPrice >= entryPrice ? '#16a34a' : '#ef4444',
          axisLabelTextColor: '#fff',
        });

        chart.timeScale().fitContent();

        // Resize
        resizeObserver = new ResizeObserver((entries) => {
          if (entries[0] && containerRef.current && chart && isMounted) {
            try {
              const h = containerRef.current.clientHeight || (window.innerHeight - 140);
              chart.applyOptions({ width: containerRef.current.clientWidth, height: h });
            } catch {}
          }
        });
        resizeObserver.observe(containerRef.current);

        setLoading(false);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Chart failed');
          setLoading(false);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
      if (resizeObserver) resizeObserver.disconnect();
      if (chart) { try { chart.remove(); } catch {} }
      chartRef.current = null;
      candleSeriesRef.current = null;
      livePriceLineRef.current = null;
    };
  }, [symbol, timeframe, entryPrice, stopLoss, takeProfit]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Keyboard close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];
  const decimals = entryPrice > 100 ? 2 : 5;

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

        {/* ── Live Price Ticker ── */}
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

        {/* ── Chart ── */}
        <div className="pos-chart-container">
          {loading && (
            <div className="pos-chart-loading">
              <div className="mgr-spinner" />
            </div>
          )}
          {error && (
            <div className="pos-chart-error">{error}</div>
          )}
          <div ref={containerRef} className="pos-chart-canvas" />
        </div>
      </div>
    </div>
  );
}
