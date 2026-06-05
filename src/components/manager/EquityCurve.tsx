'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SingleValueData, Time } from 'lightweight-charts';

interface EquityCurveProps {
  data: { time: string; equity: number }[];
  label?: string;
}

export default function EquityCurve({ data, label = 'EQUITY CURVE' }: EquityCurveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Process data once
  const chartData = useMemo(() => {
    if (!data || data.length < 1) return null;

    // Sort by time and deduplicate
    const sorted = [...data]
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // Convert to lightweight-charts format (unix timestamps)
    const points: SingleValueData[] = [];
    const seen = new Set<number>();

    for (const d of sorted) {
      const ts = Math.floor(new Date(d.time).getTime() / 1000) as Time;
      const numTs = ts as number;
      if (!seen.has(numTs)) {
        seen.add(numTs);
        points.push({ time: ts, value: d.equity });
      }
    }

    if (points.length < 2) return null;

    const values = points.map(p => p.value);
    const startVal = values[0];
    const endVal = values[values.length - 1];
    const change = endVal - startVal;
    const changePercent = startVal > 0 ? (change / startVal) * 100 : 0;
    const isPositive = change >= 0;

    return { points, startVal, endVal, change, changePercent, isPositive };
  }, [data]);

  useEffect(() => {
    if (!containerRef.current || !chartData) return;

    // Get computed CSS variables
    const cs = getComputedStyle(document.documentElement);
    const bgColor = cs.getPropertyValue('--bg').trim() || '#0a0e14';
    const textColor = cs.getPropertyValue('--subtext').trim() || '#6b7280';
    const borderColor = cs.getPropertyValue('--border').trim() || '#1e2530';

    // Determine colors based on performance
    const lineColor = chartData.isPositive ? '#16a34a' : '#dc2626';
    const topGradient = chartData.isPositive ? 'rgba(22, 163, 74, 0.28)' : 'rgba(220, 38, 38, 0.28)';
    const bottomGradient = chartData.isPositive ? 'rgba(22, 163, 74, 0.01)' : 'rgba(220, 38, 38, 0.01)';

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 220,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: textColor,
        fontSize: 10,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      },
      grid: {
        vertLines: { color: borderColor, style: LineStyle.Dotted },
        horzLines: { color: borderColor, style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: 'rgba(184, 134, 11, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelVisible: true,
          labelBackgroundColor: '#8B6914',
        },
        horzLine: {
          color: 'rgba(184, 134, 11, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelVisible: true,
          labelBackgroundColor: '#8B6914',
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 3,
        barSpacing: Math.max(4, containerRef.current.clientWidth / (chartData.points.length * 1.5)),
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: { vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: false },
    });

    chartRef.current = chart;

    // Area Series
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: lineColor,
      lineWidth: 2,
      topColor: topGradient,
      bottomColor: bottomGradient,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBackgroundColor: lineColor,
      crosshairMarkerBorderColor: '#fff',
      crosshairMarkerBorderWidth: 2,
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineWidth: 1,
      priceLineColor: lineColor,
      priceLineStyle: LineStyle.Dashed,
    });

    areaSeries.setData(chartData.points);
    seriesRef.current = areaSeries;

    // Baseline marker at start equity
    areaSeries.createPriceLine({
      price: chartData.startVal,
      color: 'rgba(184, 134, 11, 0.35)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Start',
      lineVisible: true,
    });

    chart.timeScale().fitContent();

    // Tooltip
    const tooltip = tooltipRef.current;
    if (tooltip) {
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
          tooltip.style.display = 'none';
          return;
        }

        const seriesData = param.seriesData.get(areaSeries);
        if (!seriesData || !('value' in seriesData)) {
          tooltip.style.display = 'none';
          return;
        }

        const value = (seriesData as SingleValueData).value;
        const diff = value - chartData.startVal;
        const pct = chartData.startVal > 0 ? (diff / chartData.startVal) * 100 : 0;
        const isUp = diff >= 0;

        const date = new Date((param.time as number) * 1000);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        tooltip.innerHTML = `
          <div class="eq-tt-date">${dateStr}</div>
          <div class="eq-tt-val">$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="eq-tt-chg ${isUp ? 'mgr-positive' : 'mgr-negative'}">${isUp ? '+' : ''}$${diff.toFixed(2)} (${isUp ? '+' : ''}${pct.toFixed(2)}%)</div>
        `;
        tooltip.style.display = 'block';

        // Position tooltip
        const containerRect = containerRef.current!.getBoundingClientRect();
        let left = param.point.x + 12;
        if (left + 160 > containerRect.width) left = param.point.x - 165;
        let top = param.point.y - 10;
        if (top < 0) top = 10;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      });
    }

    // ResizeObserver
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) chart.applyOptions({ width });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [chartData]);

  if (!chartData) {
    return (
      <div className="eq-wrap">
        <div className="eq-header">
          <span className="eq-label">{label}</span>
        </div>
        <div className="eq-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--subtext)" strokeWidth="1.5" opacity="0.3">
            <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 16l4-8 4 4 5-9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>No equity data yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="eq-wrap">
      <div className="eq-header">
        <div className="eq-header-left">
          <span className="eq-label">{label}</span>
          <span className="eq-pts">{chartData.points.length} points</span>
        </div>
        <div className="eq-header-right">
          <span className="eq-val">
            ${chartData.endVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`eq-chg ${chartData.isPositive ? 'mgr-positive' : 'mgr-negative'}`}>
            {chartData.isPositive ? '▲' : '▼'} {chartData.isPositive ? '+' : ''}{chartData.change.toFixed(2)} ({chartData.isPositive ? '+' : ''}{chartData.changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>
      <div className="eq-chart-container" ref={containerRef}>
        <div className="eq-tooltip" ref={tooltipRef} />
      </div>
    </div>
  );
}
