'use client';

import React, { useMemo } from 'react';

interface EquityCurveProps {
  data: { time: string; equity: number }[];
  label?: string;
}

export default function EquityCurve({ data, label = 'EQUITY CURVE (7D)' }: EquityCurveProps) {
  const chart = useMemo(() => {
    if (!data || data.length < 2) return null;

    const W = 460;
    const H = 200;
    const PAD_L = 8;
    const PAD_R = 80;
    const PAD_T = 12;
    const PAD_B = 28;

    const values = data.map(d => d.equity);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;

    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    // Map data to SVG coordinates
    const points = data.map((d, i) => {
      const x = PAD_L + (i / (data.length - 1)) * chartW;
      const y = PAD_T + chartH - ((d.equity - minV) / range) * chartH;
      return { x, y, equity: d.equity, time: d.time };
    });

    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

    // Gradient fill area
    const areaPath = `M${points[0].x},${PAD_T + chartH} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${PAD_T + chartH} Z`;

    // Y-axis labels (5 ticks)
    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const val = minV + (range * i) / 4;
      const y = PAD_T + chartH - (i / 4) * chartH;
      return { val, y };
    });

    // X-axis labels (derive from time)
    const firstDate = new Date(data[0].time);
    const lastDate = new Date(data[data.length - 1].time);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const xLabels = [
      { x: PAD_L, label: `${months[firstDate.getMonth()]} ${firstDate.getDate()}` },
      { x: PAD_L + chartW, label: `${months[lastDate.getMonth()]} ${lastDate.getDate()}` },
    ];

    // Latest value tooltip
    const lastPoint = points[points.length - 1];
    const lastVal = lastPoint.equity;

    return { polyline, areaPath, yTicks, xLabels, lastPoint, lastVal, W, H, PAD_T, chartH };
  }, [data]);

  if (!chart) {
    return (
      <div className="rsk-chart-empty">
        <p>No equity data available</p>
      </div>
    );
  }

  return (
    <div className="rsk-chart-wrap">
      <div className="rsk-chart-title">{label}</div>
      <svg
        viewBox={`0 0 ${chart.W} ${chart.H}`}
        className="rsk-chart-svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B8860B" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#B8860B" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {chart.yTicks.map((t, i) => (
          <line
            key={i}
            x1={8}
            y1={t.y}
            x2={chart.W - 80}
            y2={t.y}
            stroke="var(--border)"
            strokeWidth="0.5"
            strokeDasharray="3,3"
          />
        ))}

        {/* Area fill */}
        <path d={chart.areaPath} fill="url(#eqFill)" />

        {/* Line */}
        <polyline
          points={chart.polyline}
          fill="none"
          stroke="#B8860B"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Y-axis labels */}
        {chart.yTicks.map((t, i) => (
          <text
            key={i}
            x={chart.W - 6}
            y={t.y + 3}
            textAnchor="end"
            className="rsk-chart-label"
          >
            {t.val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </text>
        ))}

        {/* X-axis labels */}
        {chart.xLabels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={chart.H - 4}
            textAnchor={i === 0 ? 'start' : 'end'}
            className="rsk-chart-label"
          >
            {l.label}
          </text>
        ))}

        {/* Current value tooltip */}
        <rect
          x={chart.lastPoint.x - 40}
          y={chart.lastPoint.y - 18}
          width="78"
          height="20"
          rx="4"
          fill="#16a34a"
          opacity="0.9"
        />
        <text
          x={chart.lastPoint.x - 1}
          y={chart.lastPoint.y - 5}
          textAnchor="middle"
          fill="white"
          fontSize="9"
          fontWeight="700"
          fontFamily="monospace"
        >
          {chart.lastVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </text>

        {/* Dot at latest point */}
        <circle cx={chart.lastPoint.x} cy={chart.lastPoint.y} r="3" fill="#B8860B" />
      </svg>
    </div>
  );
}
