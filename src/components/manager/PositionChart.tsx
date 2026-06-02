'use client';

import React, { useEffect, useRef, useState } from 'react';

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

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    let chart: any = null;
    let resizeObserver: ResizeObserver | null = null;

    const renderChart = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch candle data
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

        // Remove old chart
        if (chartRef.current) {
          try { chartRef.current.remove(); } catch {}
        }

        const chartHeight = 320;
        chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: chartHeight,
          layout: {
            background: { type: ColorType.Solid, color: '#0a0a0f' },
            textColor: '#6E6E73',
            fontSize: 10,
            fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
          },
          grid: {
            vertLines: { color: 'rgba(255,255,255,0.03)' },
            horzLines: { color: 'rgba(255,255,255,0.03)' },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: { color: 'rgba(184,134,11,0.4)', width: 1, style: LineStyle.Dashed, labelVisible: true, labelBackgroundColor: '#1a1a2e' },
            horzLine: { color: 'rgba(184,134,11,0.4)', width: 1, style: LineStyle.Dashed, labelVisible: true, labelBackgroundColor: '#1a1a2e' },
          },
          rightPriceScale: {
            borderVisible: false,
            scaleMargins: { top: 0.08, bottom: 0.08 },
          },
          timeScale: {
            borderVisible: false,
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 5,
          },
        });
        chartRef.current = chart;

        // Add candlestick series
        const lc = await import('lightweight-charts');
        const candleSeries = chart.addSeries(lc.CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderDownColor: '#ef4444',
          borderUpColor: '#22c55e',
          wickDownColor: 'rgba(239,68,68,0.6)',
          wickUpColor: 'rgba(34,197,94,0.6)',
        });

        // Convert to chart data
        const chartData = data.candles.map((c: any) => ({
          time: Math.floor(new Date(c.time.replace(' ', 'T') + 'Z').getTime() / 1000) as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        candleSeries.setData(chartData);

        // Add volume
        const volumeSeries = chart.addSeries(lc.HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        chart.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
        });
        if (data.candles[0]?.volume !== undefined) {
          volumeSeries.setData(data.candles.map((c: any) => ({
            time: Math.floor(new Date(c.time.replace(' ', 'T') + 'Z').getTime() / 1000) as any,
            value: c.volume || 0,
            color: c.close >= c.open ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          })));
        }

        // ── Position price lines ──

        // Entry price line
        candleSeries.createPriceLine({
          price: entryPrice,
          color: '#B8860B',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `ENTRY ${entryPrice.toFixed(entryPrice > 100 ? 2 : 5)}`,
          axisLabelColor: '#B8860B',
          axisLabelTextColor: '#fff',
        });

        // Current price line
        candleSeries.createPriceLine({
          price: currentPrice,
          color: 'rgba(255,255,255,0.5)',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `MARK`,
          axisLabelColor: '#333',
          axisLabelTextColor: '#aaa',
        });

        // Stop Loss line
        if (stopLoss && stopLoss > 0) {
          candleSeries.createPriceLine({
            price: stopLoss,
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `SL ${stopLoss.toFixed(stopLoss > 100 ? 2 : 5)}`,
            axisLabelColor: '#ef4444',
            axisLabelTextColor: '#fff',
          });
        }

        // Take Profit line
        if (takeProfit && takeProfit > 0) {
          candleSeries.createPriceLine({
            price: takeProfit,
            color: '#22c55e',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `TP ${takeProfit.toFixed(takeProfit > 100 ? 2 : 5)}`,
            axisLabelColor: '#22c55e',
            axisLabelTextColor: '#fff',
          });
        }

        chart.timeScale().fitContent();

        // Resize
        resizeObserver = new ResizeObserver((entries) => {
          if (entries[0] && containerRef.current && chart && isMounted) {
            try { chart.applyOptions({ width: containerRef.current.clientWidth }); } catch {}
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
    };
  }, [symbol, timeframe, entryPrice, currentPrice, stopLoss, takeProfit]);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];

  return (
    <div className="pos-chart-panel">
      {/* Header */}
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

      {/* Price info bar */}
      <div className="pos-chart-prices">
        <div className="pos-chart-price-item">
          <span className="pos-chart-price-label">ENTRY</span>
          <span className="pos-chart-price-val" style={{ color: '#B8860B' }}>
            {entryPrice.toFixed(entryPrice > 100 ? 2 : 5)}
          </span>
        </div>
        {stopLoss && stopLoss > 0 && (
          <div className="pos-chart-price-item">
            <span className="pos-chart-price-label">SL</span>
            <span className="pos-chart-price-val mgr-negative">
              {stopLoss.toFixed(stopLoss > 100 ? 2 : 5)}
            </span>
          </div>
        )}
        {takeProfit && takeProfit > 0 && (
          <div className="pos-chart-price-item">
            <span className="pos-chart-price-label">TP</span>
            <span className="pos-chart-price-val mgr-positive">
              {takeProfit.toFixed(takeProfit > 100 ? 2 : 5)}
            </span>
          </div>
        )}
        <div className="pos-chart-price-item">
          <span className="pos-chart-price-label">MARK</span>
          <span className="pos-chart-price-val">
            {currentPrice.toFixed(currentPrice > 100 ? 2 : 5)}
          </span>
        </div>
      </div>

      {/* Chart */}
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
  );
}
