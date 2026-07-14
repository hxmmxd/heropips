'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface InputCard {
  id: string;
  gate: string;
  value: string;
  status: 'pass' | 'fail' | 'checking';
  icon: string;
}

interface OutputCard {
  id: string;
  direction: 'BUY' | 'SELL';
  instrument: string;
  confidence: number;
  entry: string;
  sl: string;
  tp: string;
  rr: string;
  session: string;
}

// ─── Static Data ──────────────────────────────────────────────────────────────
const INPUT_CARDS: Omit<InputCard, 'id'>[] = [
  { gate: 'Confluence',       value: 'Score 87%',           status: 'pass',     icon: '⚡' },
  { gate: 'SMC Confirmation', value: 'BOS + OB Detected',   status: 'pass',     icon: '🔷' },
  { gate: 'MTF Stack',        value: 'W1/D1/4H Aligned',    status: 'pass',     icon: '📊' },
  { gate: 'TF Alignment',     value: '4H Trend Bullish',    status: 'pass',     icon: '🕐' },
  { gate: 'VWAP',             value: 'Inside ±1.5σ',        status: 'pass',     icon: '📈' },
  { gate: 'Session Filter',   value: 'NY Overlap Active',   status: 'pass',     icon: '🌐' },
  { gate: 'News Filter',      value: 'FOMC Clear',          status: 'pass',     icon: '📰' },
  { gate: 'Volatility',       value: 'ATR 1.2× Stable',     status: 'pass',     icon: '🌊' },
  { gate: 'Correlation',      value: 'DXY Bearish Align',   status: 'pass',     icon: '🔗' },
  { gate: 'Candle Pattern',   value: 'H1 Hammer Conf.',     status: 'pass',     icon: '🕯️' },
  { gate: 'Liquidity Sweep',  value: 'BSL Taken at 2348',   status: 'pass',     icon: '💧' },
  { gate: 'Order Blocks',     value: '3 Active OBs',        status: 'pass',     icon: '📦' },
  { gate: 'Cooldown',         value: 'Last trade > 12h',    status: 'pass',     icon: '⏳' },
  { gate: 'Trend Strength',   value: 'ADX 38 – Strong',     status: 'pass',     icon: '💪' },
];

const OUTPUT_CARDS: Omit<OutputCard, 'id'>[] = [
  { direction: 'BUY',  instrument: 'XAU/USD', confidence: 94, entry: '2341.50', sl: '2328.00', tp: '2368.00', rr: '2.0R', session: 'NY' },
  { direction: 'BUY',  instrument: 'EUR/USD', confidence: 88, entry: '1.08420', sl: '1.07900', tp: '1.09450', rr: '2.0R', session: 'LDN' },
  { direction: 'SELL', instrument: 'GBP/JPY', confidence: 91, entry: '196.450', sl: '197.400', tp: '194.100', rr: '2.5R', session: 'ASI' },
  { direction: 'BUY',  instrument: 'BTC/USD', confidence: 86, entry: '67,420',  sl: '65,900',  tp: '70,200',  rr: '1.8R', session: 'NY' },
  { direction: 'SELL', instrument: 'NAS100',  confidence: 92, entry: '19,840',  sl: '20,100',  tp: '19,240',  rr: '2.3R', session: 'NY' },
  { direction: 'BUY',  instrument: 'US30',    confidence: 83, entry: '38,720',  sl: '38,200',  tp: '39,760',  rr: '2.0R', session: 'NY' },
];

// Distribute cards across lanes
const LANE_INPUTS: Omit<InputCard, 'id'>[][] = [
  [INPUT_CARDS[0],  INPUT_CARDS[3],  INPUT_CARDS[6],  INPUT_CARDS[9],  INPUT_CARDS[12]],
  [INPUT_CARDS[1],  INPUT_CARDS[4],  INPUT_CARDS[7],  INPUT_CARDS[10], INPUT_CARDS[13]],
  [INPUT_CARDS[2],  INPUT_CARDS[5],  INPUT_CARDS[8],  INPUT_CARDS[11], INPUT_CARDS[0]],
];

const LANE_OUTPUTS: Omit<OutputCard, 'id'>[][] = [
  [OUTPUT_CARDS[0], OUTPUT_CARDS[3]],
  [OUTPUT_CARDS[1], OUTPUT_CARDS[4]],
  [OUTPUT_CARDS[2], OUTPUT_CARDS[5]],
];

let uidCounter = 0;
function uid() { return `c-${++uidCounter}`; }

// ─── Input Card Component ─────────────────────────────────────────────────────
function InputCardEl({ gate, value, status, icon, style }: Omit<InputCard, 'id'> & { style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 12,
      padding: '10px 13px',
      minWidth: 180,
      boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{
          fontSize: 9, fontWeight: 800, color: 'rgba(148,163,184,0.9)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>{gate}</span>
        <span style={{
          marginLeft: 'auto',
          width: 6, height: 6, borderRadius: '50%',
          background: status === 'pass' ? '#22c55e' : status === 'fail' ? '#ef4444' : '#f59e0b',
          boxShadow: status === 'pass' ? '0 0 6px #22c55e' : status === 'fail' ? '0 0 6px #ef4444' : '0 0 6px #f59e0b',
          flexShrink: 0,
        }} />
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(226,232,240,0.95)', letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  );
}

// ─── Output Card Component ────────────────────────────────────────────────────
function OutputCardEl({ direction, instrument, confidence, entry, sl, tp, rr, session, style }: Omit<OutputCard, 'id'> & { style?: React.CSSProperties }) {
  const isBuy = direction === 'BUY';
  const buyColor = '#22c55e';
  const sellColor = '#ef4444';
  const dirColor = isBuy ? buyColor : sellColor;

  return (
    <div style={{
      background: isBuy
        ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(15,23,42,0.6) 100%)'
        : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(15,23,42,0.6) 100%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${dirColor}30`,
      borderLeft: `3px solid ${dirColor}`,
      borderRadius: 12,
      padding: '11px 13px',
      minWidth: 196,
      boxShadow: `0 4px 28px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
      ...style,
    }}>
      {/* Direction + Instrument */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <span style={{
          fontSize: 9, fontWeight: 900, letterSpacing: '0.12em',
          padding: '2px 7px', borderRadius: 5,
          background: `${dirColor}20`,
          color: dirColor,
          border: `1px solid ${dirColor}40`,
        }}>{direction}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(226,232,240,0.95)' }}>{instrument}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 9, fontWeight: 800,
          color: dirColor, background: `${dirColor}15`, padding: '2px 6px',
          borderRadius: 5,
        }}>{confidence}%</span>
      </div>
      {/* Grid metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px' }}>
        {[
          { label: 'Entry', val: entry },
          { label: 'R:R',   val: rr },
          { label: 'SL',    val: sl },
          { label: 'TP',    val: tp },
        ].map(({ label, val }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: 'rgba(100,116,139,0.9)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(203,213,225,0.9)', fontVariantNumeric: 'tabular-nums' }}>{val}</span>
          </div>
        ))}
      </div>
      {/* Session badge */}
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{
          fontSize: 7.5, fontWeight: 800, letterSpacing: '0.08em',
          color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase',
        }}>📍 {session} Session</span>
      </div>
    </div>
  );
}

// ─── Streaming Lane Component ─────────────────────────────────────────────────
interface StreamingLaneProps {
  cards: Omit<InputCard, 'id'>[];
  outputCards: Omit<OutputCard, 'id'>[];
  laneIndex: number;
  direction: 'input' | 'output';
  speed: number; // px per second
}

function StreamingLane({ cards, outputCards, laneIndex, direction, speed }: StreamingLaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill with multiple repeats so lane is always full
  const repeated = [...cards, ...cards, ...cards, ...cards];
  const outRepeated = [...outputCards, ...outputCards, ...outputCards, ...outputCards];
  const items = direction === 'input' ? repeated : outRepeated;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // We need to wait one frame so scrollWidth is calculated
    requestAnimationFrame(() => {
      const totalWidth = container.scrollWidth / 2;
      const staggerOffset = laneIndex * 80;
      // Start offset into the strip so we have content to scroll back through
      posRef.current = totalWidth - staggerOffset;

      setInitialized(true);
      lastTimeRef.current = performance.now();

      const tick = (now: number) => {
        const dt = now - lastTimeRef.current;
        lastTimeRef.current = now;

        // Decrease position → translateX becomes less negative → strip moves RIGHT → cards flow LEFT-to-RIGHT visually
        // This reverses the original right-to-left scroll
        posRef.current -= (speed * dt) / 1000;

        const tw = container.scrollWidth / 2;
        if (posRef.current < 0) {
          posRef.current += tw;
        }

        container.style.transform = `translateX(${-posRef.current}px)`;

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [direction, laneIndex, speed]);

  return (
    <div style={{
      overflow: 'hidden',
      position: 'relative',
      width: '100%',
      height: direction === 'input' ? 82 : 130,
    }}>
      {/* Fade masks */}
      {direction === 'input' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(90deg, #050d1a 0%, transparent 18%, transparent 75%, #050d1a 100%)',
        }} />
      )}
      {direction === 'output' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(90deg, #050d1a 0%, transparent 18%, transparent 75%, #050d1a 100%)',
        }} />
      )}

      <div
        ref={containerRef}
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          position: 'relative',
        }}
      >
        {items.map((card, i) => {
          if (direction === 'input') {
            const c = card as Omit<InputCard, 'id'>;
            return <InputCardEl key={i} {...c} />;
          } else {
            const c = card as Omit<OutputCard, 'id'>;
            return <OutputCardEl key={i} {...c} />;
          }
        })}
      </div>
    </div>
  );
}

// ─── AI Core Hub ─────────────────────────────────────────────────────────────
function AICoreHub() {
  return (
    <div style={{
      position: 'relative',
      width: 140, height: 140,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {/* Outer rings */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          borderRadius: '50%',
          border: '1px solid rgba(59,130,246,0.3)',
          animation: `hub-ring 3s ease-out ${i * 1}s infinite`,
          inset: `${i * 18}px`,
        }} />
      ))}

      {/* Glow backdrop */}
      <div style={{
        position: 'absolute',
        inset: 20,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(99,102,241,0.2) 50%, transparent 80%)',
        filter: 'blur(8px)',
      }} />

      {/* Core circle */}
      <div style={{
        position: 'relative',
        width: 82, height: 82,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 40%, #6366f1 100%)',
        border: '2px solid rgba(147,197,253,0.6)',
        boxShadow: '0 0 0 6px rgba(59,130,246,0.15), 0 0 40px rgba(59,130,246,0.6), 0 0 80px rgba(99,102,241,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
        animation: 'hub-pulse 2s ease-in-out infinite',
        zIndex: 2,
      }}>
        {/* XYRO Icon */}
        <svg viewBox="0 0 24 24" fill="none" style={{ width: 26, height: 26 }}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="rgba(255,255,255,0.9)" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 7.5, fontWeight: 900, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.14em', marginTop: 3 }}>XYRO AI</span>
      </div>

      {/* Processing indicator */}
      <div style={{
        position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(59,130,246,0.15)',
        border: '1px solid rgba(59,130,246,0.3)',
        borderRadius: 999, padding: '3px 10px',
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%', background: '#22c55e',
          boxShadow: '0 0 6px #22c55e',
          animation: 'hub-blink 1.2s ease infinite',
        }} />
        <span style={{ fontSize: 8.5, fontWeight: 800, color: 'rgba(148,163,184,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Processing</span>
      </div>
    </div>
  );
}

// ─── Energy Beam ─────────────────────────────────────────────────────────────
function EnergyBeam({ side }: { side: 'left' | 'right' }) {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      [side === 'left' ? 'right' : 'left']: 0,
      width: side === 'left' ? '48%' : '48%',
      height: 2,
      transform: 'translateY(-50%)',
      zIndex: 3,
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      {/* Base glow line */}
      <div style={{
        position: 'absolute', inset: 0,
        background: side === 'left'
          ? 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.3) 60%, rgba(59,130,246,0.7) 100%)'
          : 'linear-gradient(90deg, rgba(59,130,246,0.7) 0%, rgba(99,102,241,0.3) 40%, transparent 100%)',
      }} />
      {/* Animated energy packet */}
      <div style={{
        position: 'absolute', top: '-3px', height: 8, width: 60,
        background: side === 'left'
          ? 'linear-gradient(90deg, transparent, rgba(147,197,253,0.9), white, rgba(147,197,253,0.9), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(147,197,253,0.9), white, rgba(147,197,253,0.9), transparent)',
        animation: side === 'left' ? 'beam-flow-l 2s linear infinite' : 'beam-flow-r 2s linear infinite',
        filter: 'blur(1px)',
      }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RealtimeSignalsShowcase() {
  const [stats, setStats] = useState({ processed: 12847, accuracy: 94.2, active: 3 });

  // Tick stats counter
  useEffect(() => {
    const id = setInterval(() => {
      setStats(s => ({
        ...s,
        processed: s.processed + Math.floor(Math.random() * 3) + 1,
        accuracy: Math.min(99.9, s.accuracy + (Math.random() - 0.5) * 0.1),
      }));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const laneStyles: React.CSSProperties[] = [
    { perspective: '800px', perspectiveOrigin: '50% 0%' },
    { perspective: '800px', perspectiveOrigin: '50% 50%' },
    { perspective: '800px', perspectiveOrigin: '50% 100%' },
  ];

  return (
    <section
      id="realtime-signals"
      style={{
        position: 'relative',
        padding: '100px 0 80px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #030712 0%, #050d1a 30%, #0a0f1e 60%, #050d1a 100%)',
      }}
    >
      <style>{`
        @keyframes hub-ring {
          0%   { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes hub-pulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(59,130,246,0.15), 0 0 40px rgba(59,130,246,0.6), 0 0 80px rgba(99,102,241,0.3); }
          50%       { box-shadow: 0 0 0 10px rgba(59,130,246,0.1), 0 0 60px rgba(59,130,246,0.8), 0 0 120px rgba(99,102,241,0.4); }
        }
        @keyframes hub-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes beam-flow-l {
          0%   { left: 100%; }
          100% { left: -70px; }
        }
        @keyframes beam-flow-r {
          0%   { left: 100%; }
          100% { left: -70px; }
        }
        @keyframes rs-fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes stat-pulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
        @keyframes grid-scroll {
          0%   { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes float-particles {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.4; }
          50%  { transform: translateY(-20px) scale(1.2); opacity: 0.8; }
          100% { transform: translateY(0px) scale(1);   opacity: 0.4; }
        }
      `}</style>

      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        animation: 'grid-scroll 8s linear infinite',
      }} />

      {/* Radial glow centers */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)',
      }} />

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 2 === 0 ? 3 : 2,
          height: i % 2 === 0 ? 3 : 2,
          borderRadius: '50%',
          background: i % 3 === 0 ? '#3b82f6' : i % 3 === 1 ? '#6366f1' : '#22c55e',
          left: `${10 + i * 11}%`,
          top: `${20 + (i * 7) % 60}%`,
          animation: `float-particles ${3 + i * 0.5}s ease-in-out ${i * 0.4}s infinite`,
          boxShadow: `0 0 6px currentColor`,
          zIndex: 0,
        }} />
      ))}

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 32px', position: 'relative', zIndex: 10 }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 60, animation: 'rs-fade-in 0.6s ease both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 18px', borderRadius: 999,
            border: '1.5px solid rgba(59,130,246,0.4)',
            background: 'rgba(59,130,246,0.08)',
            color: '#93c5fd', fontSize: 10.5, fontWeight: 800,
            letterSpacing: '0.13em', textTransform: 'uppercase', marginBottom: 20,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#3b82f6',
              display: 'inline-block', animation: 'hub-blink 1.8s ease infinite',
              boxShadow: '0 0 8px #3b82f6',
            }} />
            Automated Confluence Engine
          </div>

          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800,
            color: '#f8fafc', margin: '0 0 16px',
            letterSpacing: '-0.03em', lineHeight: 1.15,
          }}>
            12-Gate Quantitative Engine{' '}
            <span style={{ color: '#3b82f6' }}>←</span>{' '}
            <span style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Realtime Signals
            </span>
          </h2>

          <p style={{
            fontSize: 17, color: 'rgba(148,163,184,0.85)',
            maxWidth: 600, margin: '0 auto', lineHeight: 1.75,
          }}>
            Every market analysis passes through{' '}
            <strong style={{ color: 'rgba(226,232,240,0.9)' }}>12 validation gates</strong>,
            converges at the XYRO AI Core, and fires as an execution-ready trade signal.
          </p>

          {/* Live stats */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 32, marginTop: 28,
          }}>
            {[
              { label: 'Signals Processed', value: stats.processed.toLocaleString(), color: '#3b82f6' },
              { label: 'Accuracy Rate',     value: `${stats.accuracy.toFixed(1)}%`,  color: '#22c55e' },
              { label: 'Active Lanes',      value: `${stats.active}`,               color: '#8b5cf6' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  {value}
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(100,116,139,0.9)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main Animation Area ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          position: 'relative',
          minHeight: 520,
        }}>

          {/* ── LEFT INPUT LANES ── */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            position: 'relative',
            minWidth: 0,
          }}>
            {/* Lane label */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
              justifyContent: 'flex-end', paddingRight: 16,
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Analysis Inputs
              </span>
              <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.5))' }} />
            </div>

            {LANE_INPUTS.map((laneCards, li) => (
              <div key={li} style={{
                position: 'relative',
                transform: li === 0
                  ? 'perspective(600px) rotateY(8deg) translateZ(-10px)'
                  : li === 2
                    ? 'perspective(600px) rotateY(8deg) translateZ(-10px)'
                    : 'perspective(600px) rotateY(6deg)',
                transformOrigin: 'right center',
                opacity: li === 1 ? 1 : 0.75,
              }}>
                <StreamingLane
                  cards={laneCards}
                  outputCards={LANE_OUTPUTS[li]}
                  laneIndex={li}
                  direction="input"
                  speed={38 + li * 6}
                />
              </div>
            ))}
          </div>

          {/* ── CENTER: Energy Beams + AI Core ── */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 200,
            flexShrink: 0,
            zIndex: 10,
            alignSelf: 'stretch',
          }}>
            {/* Vertical connection line */}
            <div style={{
              position: 'absolute',
              left: '50%', top: 40, bottom: 40, width: 2,
              transform: 'translateX(-50%)',
              background: 'linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.5) 20%, rgba(59,130,246,0.8) 50%, rgba(59,130,246,0.5) 80%, transparent 100%)',
              zIndex: 0,
            }} />

            {/* Lane connector dots */}
            {[0, 1, 2].map(i => (
              <React.Fragment key={i}>
                {/* Left connector */}
                <div style={{
                  position: 'absolute',
                  left: 0, width: '40%', height: 1.5,
                  top: i === 0 ? '22%' : i === 1 ? '50%' : '78%',
                  background: 'linear-gradient(90deg, rgba(59,130,246,0.3), rgba(59,130,246,0.7))',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: '-2px', height: 5, width: 20,
                    background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.9), transparent)',
                    animation: `beam-flow-l ${1.5 + i * 0.3}s linear ${i * 0.5}s infinite`,
                  }} />
                </div>
                {/* Right connector */}
                <div style={{
                  position: 'absolute',
                  right: 0, width: '40%', height: 1.5,
                  top: i === 0 ? '22%' : i === 1 ? '50%' : '78%',
                  background: 'linear-gradient(90deg, rgba(59,130,246,0.7), rgba(99,102,241,0.3))',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: '-2px', height: 5, width: 20,
                    background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.9), transparent)',
                    animation: `beam-flow-r ${1.5 + i * 0.3}s linear ${i * 0.7}s infinite`,
                  }} />
                </div>
                {/* Junction dots */}
                <div style={{
                  position: 'absolute',
                  left: '38%',
                  top: i === 0 ? '22%' : i === 1 ? '50%' : '78%',
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: '#3b82f6',
                  boxShadow: '0 0 8px #3b82f6',
                  transform: 'translate(-50%, -50%)',
                  animation: `hub-blink ${1.5 + i * 0.4}s ease ${i * 0.3}s infinite`,
                }} />
                <div style={{
                  position: 'absolute',
                  right: '38%',
                  top: i === 0 ? '22%' : i === 1 ? '50%' : '78%',
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: '#6366f1',
                  boxShadow: '0 0 8px #6366f1',
                  transform: 'translate(50%, -50%)',
                  animation: `hub-blink ${1.5 + i * 0.4}s ease ${i * 0.5}s infinite`,
                }} />
              </React.Fragment>
            ))}

            {/* AI Core */}
            <AICoreHub />

            {/* Gate count badge */}
            <div style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 8,
              padding: '5px 12px',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(12px)',
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#93c5fd', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                12 Gates Active
              </span>
            </div>
          </div>

          {/* ── RIGHT OUTPUT LANES ── */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            position: 'relative',
            minWidth: 0,
          }}>
            {/* Lane label */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
              paddingLeft: 16,
            }}>
              <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, rgba(99,102,241,0.5), transparent)' }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Signal Output
              </span>
            </div>

            {LANE_OUTPUTS.map((laneCards, li) => (
              <div key={li} style={{
                position: 'relative',
                transform: li === 0
                  ? 'perspective(600px) rotateY(-8deg) translateZ(-10px)'
                  : li === 2
                    ? 'perspective(600px) rotateY(-8deg) translateZ(-10px)'
                    : 'perspective(600px) rotateY(-6deg)',
                transformOrigin: 'left center',
                opacity: li === 1 ? 1 : 0.75,
              }}>
                <StreamingLane
                  cards={LANE_INPUTS[li]}
                  outputCards={laneCards}
                  laneIndex={li}
                  direction="output"
                  speed={40 + li * 5}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom Stats Bar ── */}
        <div style={{
          marginTop: 56,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          animation: 'rs-fade-in 0.8s ease 0.3s both',
        }}>
          {[
            { icon: '⚡', label: 'Avg Processing', value: '< 50ms', sub: 'Per signal validation', color: '#3b82f6' },
            { icon: '🎯', label: 'Win Rate',        value: '94.2%',  sub: 'Live tracked trades',   color: '#22c55e' },
            { icon: '🔀', label: 'Pairs Covered',   value: '28+',    sub: 'Forex, Crypto, Indices', color: '#8b5cf6' },
            { icon: '🏦', label: 'Institutional',   value: 'Grade',  sub: 'SMC + Quant fusion',    color: '#f59e0b' },
          ].map(({ icon, label, value, sub, color }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '20px 22px',
              backdropFilter: 'blur(12px)',
              transition: 'border-color 0.3s, background 0.3s',
            }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(100,116,139,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', marginTop: 5, fontWeight: 500 }}>
                {sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
