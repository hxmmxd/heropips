'use client';

import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// Categorical palette, fixed assignment order — validated for CVD separation,
// normal-vision separation, chroma, and contrast against the #0A0A0A surface.
// Volt green leads as the brand anchor; slice gaps + labeled legend carry
// identity alongside color.
const COLORS = ['#C6FF2E', '#0D9488', '#3B82F6', '#D97706', '#A855F7', '#EF4444'];

const SURFACE = '#0A0A0A';
const CARD_BORDER = '#1F1F23';
const HAIRLINE = '#26262B';
const INK_HI = '#F4F4F5';
const INK_MID = '#A1A1AA';
const INK_BODY = '#D4D4D8';
const MONO = "'JetBrains Mono', 'SF Mono', ui-monospace, monospace";

type Slice = { name: string; value: number };

export default function InstitutionalPieChart({
  dataStr,
  title,
}: {
  dataStr: string;
  title?: string;
}) {
  const data = useMemo<Slice[]>(() => {
    try {
      const parsed = JSON.parse(dataStr.replace(/&quot;/g, '"'));
      return Array.isArray(parsed)
        ? parsed.filter((d) => d && typeof d.value === 'number' && d.value > 0)
        : [];
    } catch {
      return [];
    }
  }, [dataStr]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const valuesArePercents = Math.abs(total - 100) < 0.5;

  if (data.length === 0 || total === 0) return null;

  const share = (value: number) => (value / total) * 100;
  const formatShare = (value: number) => {
    const pct = share(value);
    return `${pct >= 10 || Number.isInteger(pct) ? Math.round(pct) : pct.toFixed(1)}%`;
  };

  const largestIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const focusIndex = activeIndex ?? largestIndex;
  const focus = data[focusIndex];

  return (
    <div
      role="figure"
      aria-label={title || 'Chart'}
      style={{
        width: '100%',
        margin: '2rem 0',
        background: SURFACE,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 14,
        padding: '22px 24px 18px',
        // The markdown pipeline mounts this inside a <pre>; reset its inherited
        // white-space and monospace so titles wrap and text uses the body font.
        whiteSpace: 'normal',
        fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif",
      }}
    >
      {title && (
        <div style={{ marginBottom: 18 }}>
          <h3
            style={{
              color: INK_HI,
              fontSize: 15,
              fontWeight: 650,
              letterSpacing: '0.01em',
              margin: 0,
              paddingBottom: 14,
              borderBottom: `1px solid ${HAIRLINE}`,
            }}
          >
            {title}
          </h3>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px 28px',
        }}
      >
        <div
          style={{ position: 'relative', flex: '1 1 250px', minWidth: 230, height: 265 }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="66%"
                outerRadius="94%"
                paddingAngle={1.2}
                cornerRadius={4}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke={SURFACE}
                strokeWidth={2}
                isAnimationActive={false}
                onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                    style={{ transition: 'fill-opacity 0.2s ease', outline: 'none' }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center readout: largest slice by default, hovered slice on hover */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              textAlign: 'center',
              padding: '0 18%',
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 27,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: INK_HI,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
              }}
            >
              {formatShare(focus.value)}
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: INK_MID,
                lineHeight: 1.5,
              }}
            >
              {focus.name}
            </div>
          </div>
        </div>

        <div
          style={{ flex: '1 1 230px', minWidth: 220, padding: '6px 0' }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {data.map((entry, index) => {
            const isActive = activeIndex === index;
            const isDimmed = activeIndex !== null && !isActive;
            return (
              <div
                key={`legend-${index}`}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: isActive ? '#151519' : 'transparent',
                  opacity: isDimmed ? 0.45 : 1,
                  transition: 'background 0.15s ease, opacity 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    flexShrink: 0,
                    background: COLORS[index % COLORS.length],
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    color: INK_BODY,
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {entry.name}
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: INK_HI,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {valuesArePercents ? formatShare(entry.value) : entry.value.toLocaleString()}
                </span>
                {!valuesArePercents && (
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 11.5,
                      color: INK_MID,
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: 42,
                      textAlign: 'right',
                    }}
                  >
                    {formatShare(entry.value)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
