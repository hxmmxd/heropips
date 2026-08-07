'use client';

import React, { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface InputCard {
  gate: string;
  value: string;
  status: 'pass' | 'fail' | 'checking';
  icon: string;
}

interface OutputCard {
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
const INPUT_CARDS: InputCard[] = [
  { gate: 'Confluence',       value: 'Score 87%',           status: 'pass', icon: '⚡' },
  { gate: 'SMC Confirmation', value: 'BOS + OB Detected',   status: 'pass', icon: '🔷' },
  { gate: 'MTF Stack',        value: 'W1/D1/1H Aligned',    status: 'pass', icon: '📊' },
  { gate: 'TF Alignment',     value: '1H Trend Bullish',    status: 'pass', icon: '🕐' },
  { gate: 'VWAP',             value: 'Inside ±1.5σ',        status: 'pass', icon: '📈' },
  { gate: 'Session Filter',   value: 'NY Overlap Active',   status: 'pass', icon: '🌐' },
  { gate: 'News Filter',      value: 'FOMC Clear',          status: 'pass', icon: '📰' },
  { gate: 'Volatility',       value: 'ATR 1.2× Stable',     status: 'pass', icon: '🌊' },
  { gate: 'Correlation',      value: 'DXY Bearish Align',   status: 'pass', icon: '🔗' },
  { gate: 'Candle Pattern',   value: 'H1 Hammer Conf.',     status: 'pass', icon: '🕯️' },
  { gate: 'Liquidity Sweep',  value: 'BSL Taken at 2348',   status: 'pass', icon: '💧' },
  { gate: 'Order Blocks',     value: '3 Active OBs',        status: 'pass', icon: '📦' },
  { gate: 'Cooldown',         value: 'Last trade > 12h',    status: 'pass', icon: '⏳' },
  { gate: 'Trend Strength',   value: 'ADX 38 – Strong',     status: 'pass', icon: '💪' },
];

const OUTPUT_CARDS: OutputCard[] = [
  { direction: 'BUY',  instrument: 'XAU/USD', confidence: 94, entry: '2341.50', sl: '2328.00', tp: '2368.00', rr: '2.0R', session: 'NY' },
  { direction: 'BUY',  instrument: 'EUR/USD', confidence: 88, entry: '1.08420', sl: '1.07900', tp: '1.09450', rr: '2.0R', session: 'LDN' },
  { direction: 'SELL', instrument: 'GBP/JPY', confidence: 91, entry: '196.450', sl: '197.400', tp: '194.100', rr: '2.5R', session: 'ASI' },
  { direction: 'BUY',  instrument: 'BTC/USD', confidence: 86, entry: '67,420',  sl: '65,900',  tp: '70,200',  rr: '1.8R', session: 'NY' },
  { direction: 'SELL', instrument: 'NAS100',  confidence: 92, entry: '19,840',  sl: '20,100',  tp: '19,240',  rr: '2.3R', session: 'NY' },
  { direction: 'BUY',  instrument: 'US30',    confidence: 83, entry: '38,720',  sl: '38,200',  tp: '39,760',  rr: '2.0R', session: 'NY' },
];

const LANE_INPUTS: InputCard[][] = [
  [INPUT_CARDS[0],  INPUT_CARDS[3],  INPUT_CARDS[6],  INPUT_CARDS[9],  INPUT_CARDS[12]],
  [INPUT_CARDS[1],  INPUT_CARDS[4],  INPUT_CARDS[7],  INPUT_CARDS[10], INPUT_CARDS[13]],
  [INPUT_CARDS[2],  INPUT_CARDS[5],  INPUT_CARDS[8],  INPUT_CARDS[11], INPUT_CARDS[0]],
];

const LANE_OUTPUTS: OutputCard[][] = [
  [OUTPUT_CARDS[0], OUTPUT_CARDS[3]],
  [OUTPUT_CARDS[1], OUTPUT_CARDS[4]],
  [OUTPUT_CARDS[2], OUTPUT_CARDS[5]],
];

// ─── Light-theme Input Card ──────────────────────────────────────────────────
function InputCardEl({ gate, value, icon }: InputCard) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 10,
      padding: '8px 12px',
      minWidth: 160,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{
          fontSize: 8.5, fontWeight: 700, color: 'rgba(13,13,13,0.45)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>{gate}</span>
        <span style={{
          marginLeft: 'auto',
          width: 5, height: 5, borderRadius: '50%',
          background: '#22c55e',
          boxShadow: '0 0 4px rgba(34,197,94,0.4)',
          flexShrink: 0,
        }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 650, color: 'rgba(13,13,13,0.8)', letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  );
}

// ─── Light-theme Output Card (compact, matching input card size) ──────────────
function OutputCardEl({ direction, instrument, confidence, entry, rr, session }: OutputCard) {
  const isBuy = direction === 'BUY';
  const dirColor = isBuy ? '#16a34a' : '#dc2626';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderLeft: `2.5px solid ${dirColor}`,
      borderRadius: 10,
      padding: '8px 12px',
      minWidth: 160,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontSize: 7.5, fontWeight: 800, letterSpacing: '0.1em',
          padding: '1.5px 5px', borderRadius: 3,
          background: `${dirColor}10`,
          color: dirColor,
          border: `1px solid ${dirColor}20`,
        }}>{direction}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(13,13,13,0.8)' }}>{instrument}</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 8, fontWeight: 800,
          color: dirColor,
        }}>{confidence}%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 600, color: 'rgba(13,13,13,0.6)' }}>
        <span>{entry}</span>
        <span style={{ color: 'rgba(13,13,13,0.25)' }}>·</span>
        <span>{rr}</span>
        <span style={{ color: 'rgba(13,13,13,0.25)' }}>·</span>
        <span style={{ fontSize: 8, color: 'rgba(13,13,13,0.35)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{session}</span>
      </div>
    </div>
  );
}

// ─── Streaming Lane ──────────────────────────────────────────────────────────
function StreamingLane({ cards, outputCards, laneIndex, direction, speed }: {
  cards: InputCard[];
  outputCards: OutputCard[];
  laneIndex: number;
  direction: 'input' | 'output';
  speed: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);

  const repeated = direction === 'input'
    ? [...cards, ...cards, ...cards, ...cards]
    : [...outputCards, ...outputCards, ...outputCards, ...outputCards];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const staggerOffset = laneIndex * 80;
    posRef.current = direction === 'input' ? -staggerOffset : staggerOffset;

    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      posRef.current -= (speed * dt) / 1000;

      const totalWidth = container.scrollWidth / 2;
      if (posRef.current < 0) {
        posRef.current += totalWidth;
      }

      container.style.transform = `translateX(${-posRef.current}px)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [direction, laneIndex, speed]);

  // Input lanes scroll right→left, so their RIGHT edge (facing center) needs fade.
  // Output lanes scroll left→right, so their LEFT edge (facing center) needs fade.
  const fadeBg = '#f5f3ef'; // matches .ld-hero background
  const fadeGradient = direction === 'input'
    ? `linear-gradient(90deg, ${fadeBg} 0%, transparent 18%, transparent 100%)`
    : `linear-gradient(90deg, transparent 0%, transparent 82%, ${fadeBg} 100%)`;

  return (
    <div style={{
      overflow: 'hidden',
      position: 'relative',
      width: '100%',
      height: 72,
    }}>
      {/* Outer-edge only fade — inner edge facing center is always transparent */}
      <div className="hero-lane-fade" style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: fadeGradient,
      }} />

      <div
        ref={containerRef}
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          position: 'relative',
        }}
      >
        {repeated.map((card, i) => {
          if (direction === 'input') {
            const c = card as InputCard;
            return <InputCardEl key={i} {...c} />;
          } else {
            const c = card as OutputCard;
            return <OutputCardEl key={i} {...c} />;
          }
        })}
      </div>
    </div>
  );
}

// ─── AI Core Hub (Light) ──────────────────────────────────────────────────────
function AICoreHub() {
  return (
    <div style={{
      position: 'relative',
      width: 120, height: 120,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {/* Outer rings */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          borderRadius: '50%',
          border: '1px solid rgba(232,90,36,0.2)',
          animation: `hero-hub-ring 3s ease-out ${i * 1}s infinite`,
          inset: `${i * 16}px`,
        }} />
      ))}

      {/* Glow backdrop */}
      <div style={{
        position: 'absolute',
        inset: 18,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,90,36,0.12) 0%, rgba(249,115,22,0.06) 50%, transparent 80%)',
        filter: 'blur(6px)',
      }} />

      {/* Core circle */}
      <div style={{
        position: 'relative',
        width: 70, height: 70,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 40%, #2a2a2a 100%)',
        border: '2px solid rgba(232,90,36,0.35)',
        boxShadow: '0 0 0 5px rgba(232,90,36,0.08), 0 8px 32px rgba(0,0,0,0.12), 0 0 40px rgba(232,90,36,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
        animation: 'hero-hub-pulse 2s ease-in-out infinite',
        zIndex: 2,
      }}>
        <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="rgba(255,255,255,0.9)" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 6.5, fontWeight: 900, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.14em', marginTop: 2 }}>HEROPIPS AI</span>
      </div>

      {/* Processing indicator */}
      <div style={{
        position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 999, padding: '2px 8px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <span style={{
          width: 4, height: 4, borderRadius: '50%', background: '#22c55e',
          boxShadow: '0 0 4px rgba(34,197,94,0.4)',
          animation: 'hero-hub-blink 1.2s ease infinite',
        }} />
        <span style={{ fontSize: 7.5, fontWeight: 700, color: 'rgba(13,13,13,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Processing</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HeroEngineShowcase() {
  const accentColor = 'rgba(232,90,36,'; // Orange accent for light theme
  const connectorColor = 'rgba(13,13,13,';

  return (
    <div className="hero-engine-root" style={{
      position: 'relative',
      width: '100%',
      maxWidth: 1200,
      margin: '0 auto 24px',
      padding: '0 16px',
    }}>
      <style>{`
        @keyframes hero-hub-ring {
          0%   { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes hero-hub-pulse {
          0%, 100% { box-shadow: 0 0 0 5px rgba(232,90,36,0.08), 0 8px 32px rgba(0,0,0,0.12), 0 0 40px rgba(232,90,36,0.1); }
          50%       { box-shadow: 0 0 0 8px rgba(232,90,36,0.06), 0 8px 40px rgba(0,0,0,0.15), 0 0 60px rgba(232,90,36,0.15); }
        }
        @keyframes hero-hub-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes hero-beam-l {
          0%   { left: -40px; }
          100% { left: 100%; }
        }
        @keyframes hero-beam-r {
          0%   { left: -40px; }
          100% { left: 100%; }
        }
        /* ── Base styles ── */
        .hero-engine-animation-area {
          display: flex;
          align-items: center;
          gap: 0;
          position: relative;
          min-height: 420px;
        }
        .hero-engine-center {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 170px;
          flex-shrink: 0;
          z-index: 10;
          align-self: stretch;
          background: transparent !important;
          isolation: isolate;
        }
        @media (max-width: 768px) {
          .hero-engine-animation-area {
            min-height: 280px;
          }
          .hero-engine-center {
            width: 70px;
            background: transparent !important;
          }
          .hero-engine-center .hero-engine-hub {
            transform: scale(0.65);
          }
          /* Keep outer-edge fades on mobile — inner edges are already transparent */
          .hero-engine-root {
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
        @media (max-width: 480px) {
          .hero-engine-center {
            width: 56px;
            background: transparent !important;
          }
          .hero-engine-center .hero-engine-hub {
            transform: scale(0.55);
          }
        }
      `}</style>

      {/* ── Header: Title + Subtitle + Stats ── */}
      <div style={{
        textAlign: 'center',
        marginBottom: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}>
        {/* Title */}
        <h2 style={{
          fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif",
          fontSize: 'clamp(24px, 3.5vw, 42px)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          color: '#0d0d0d',
          margin: 0,
        }}>
          12-Gate Quantitative Engine{' '}
          <span style={{
            background: 'linear-gradient(135deg, #e85a24 0%, #d97706 50%, #16a34a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>← Realtime Signals</span>
        </h2>

        {/* Subtitle */}
        <p style={{
          fontSize: 14,
          fontWeight: 400,
          lineHeight: 1.6,
          color: 'rgba(13,13,13,0.5)',
          margin: 0,
          maxWidth: 520,
        }}>
          Every market analysis passes through <strong style={{ color: 'rgba(13,13,13,0.75)', fontWeight: 600 }}>12 validation gates</strong>, converges at the HEROPIPS AI Core, and fires as an execution-ready trade signal.
        </p>

        {/* Stats Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 36,
          marginTop: 4,
        }}>
          {[
            { value: '12,940', label: 'Signals Processed', color: '#16a34a' },
            { value: '94.5%', label: 'Accuracy Rate', color: '#e85a24' },
            { value: '3', label: 'Active Lanes', color: '#6366f1' },
          ].map(({ value, label, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 22,
                fontWeight: 800,
                color,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}>{value}</div>
              <div style={{
                fontSize: 8,
                fontWeight: 700,
                color: 'rgba(13,13,13,0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: 2,
              }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Animation Area */}
      <div className="hero-engine-animation-area">

        {/* ── LEFT INPUT LANES ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
          minWidth: 0,
        }}>
          {/* Lane label */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
            justifyContent: 'flex-end', paddingRight: 12,
          }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(13,13,13,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Analysis Inputs
            </span>
            <div style={{ width: 30, height: 1, background: 'linear-gradient(90deg, transparent, rgba(232,90,36,0.3))' }} />
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
              opacity: li === 1 ? 1 : 0.7,
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

        {/* ── CENTER: AI Core with Vertical Golden Divider ── */}
        <div className="hero-engine-center" style={{ position: 'relative' }}>
          {/* Vertical Divider Line behind HEROPIPS AI Badge */}
          <div style={{
            position: 'absolute',
            top: -20,
            bottom: -20,
            left: '50%',
            width: 8,
            transform: 'translateX(-50%)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #FFB938 10%, #FF9E1B 30%, #F59E0B 70%, #D97706 90%, rgba(255,255,255,0) 100%)',
            borderRadius: 4,
            filter: 'blur(0.5px) drop-shadow(0 0 6px rgba(245,158,11,0.4))',
            zIndex: 1,
            opacity: 0.9,
          }} />

          {/* AI Core Hub */}
          <div className="hero-engine-hub" style={{ position: 'relative', zIndex: 2 }}>
            <AICoreHub />
          </div>
        </div>

        {/* ── RIGHT OUTPUT LANES ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
          minWidth: 0,
        }}>
          {/* Lane label */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
            paddingLeft: 12,
          }}>
            <div style={{ width: 30, height: 1, background: 'linear-gradient(90deg, rgba(232,90,36,0.3), transparent)' }} />
            <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(13,13,13,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
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
              opacity: li === 1 ? 1 : 0.7,
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

    </div>
  );
}
