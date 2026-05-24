'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface MiniChartProps {
  symbol: string; // API symbol (e.g., XAU/USD)
  height?: number;
}

export default function MiniChart({ symbol, height = 120 }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch candles
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (data.candles?.length > 0) {
          setCandles(data.candles);
        }
      } catch (e) {
        console.error('Failed to fetch candle data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [symbol]);

  // Render chart
  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    let isMounted = true;

    const renderChart = async () => {
      const { createChart, ColorType, CrosshairMode } = await import('lightweight-charts');

      if (!isMounted || !containerRef.current) return;

      // Clear previous chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: height,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#6E6E73',
          fontSize: 9,
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.03)' },
          horzLines: { color: 'rgba(255,255,255,0.03)' },
        },
        crosshair: {
          mode: CrosshairMode.Magnet,
          vertLine: { color: 'rgba(255,255,255,0.1)', width: 1, style: 2, labelVisible: false },
          horzLine: { color: 'rgba(255,255,255,0.1)', width: 1, style: 2, labelVisible: true },
        },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderVisible: false,
          timeVisible: true,
          secondsVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: false,
        handleScale: false,
      });

      chartRef.current = chart;

      // Determine color from price direction
      const firstClose = candles[0]?.close || 0;
      const lastClose = candles[candles.length - 1]?.close || 0;
      const isBullish = lastClose >= firstClose;

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
      });

      // Convert datetime strings to chart-compatible format
      const chartData = candles.map((c) => ({
        time: c.time.replace(' ', 'T') as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      candleSeries.setData(chartData);
      chart.timeScale().fitContent();

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries[0] && containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    };

    renderChart();

    return () => {
      isMounted = false;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [candles, height]);

  if (loading) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (candles.length === 0) {
    return null; // Don't show chart section if no data
  }

  return <div ref={containerRef} style={{ height }} className="w-full" />;
}
