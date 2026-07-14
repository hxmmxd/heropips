'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'quant' | 'astro' | 'webhook';

interface Gate   { num: string; name: string; val: string }
interface Cfg {
  label: string; color: string; rgb: string;
  asset: string; price: string; change: string;
  rows: Gate[][];
  confluence: string;
  rsi: string; rsiTag: string; rsiColor: string;
  macd: string; macdTag: string; macdColor: string;
  ema: string; emaTag: string; emaColor: string;
  atr: string; atrTag: string; atrColor: string;
  trend1: string; trend1Color: string;
  trend2: string; trend2Color: string;
  smc: string[];
  failedGateIndex: number | null; // 0-based index of which gate in the flat array fails
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const MODES: Record<Mode, Cfg> = {
  quant: {
    label: 'Quant Scanner', color: '#0ea5e9', rgb: '14,165,233',
    asset: 'XAU/USD', price: '2342.10', change: '-0.38%',
    failedGateIndex: 5, // Gate 6 fails ("No Conflict")
    confluence: '56%',
    rsi: '71.6', rsiTag: 'OVERBOUGHT', rsiColor: '#ef4444',
    macd: '+4.17', macdTag: 'BULLISH', macdColor: '#10b981',
    ema: '$2,345', emaTag: 'ABOVE', emaColor: '#10b981',
    atr: '19.23', atrTag: 'VOLATILITY', atrColor: '#64748b',
    trend1: '↓ 4H BEARISH', trend1Color: '#fef2f2',
    trend2: '📊 NEUTRAL', trend2Color: '#f1f5f9',
    smc: ['BOS bullish', '6 active FVG(s)', '5 Order Block(s)', 'Liquidity Sweep detected'],
    rows: [
      [
        { num:'01', name:'Confluence',     val:'Score 68% ≥ 45%'   },
        { num:'02', name:'SMC Confirm',    val:'Bullish BOS & OB'  },
        { num:'03', name:'TF Alignment',   val:'4H Trend Bullish'  },
        { num:'04', name:'Session Filter', val:'NY Overlap Active' },
      ],
      [
        { num:'05', name:'Volatility',     val:'ATR Stable 1.2×'  },
        { num:'06', name:'No Conflict',    val:'Consensus Conflict'}, // Failed gate
        { num:'07', name:'Cooldown',       val:'Last trade > 12h'  },
        { num:'08', name:'News Event',     val:'FOMC Clear'        },
      ],
      [
        { num:'09', name:'Correlation',    val:'DXY Bearish Align' },
        { num:'10', name:'MTF Stack',      val:'W1/D1/4H EMA ✓'   },
        { num:'11', name:'VWAP',           val:'Inside Deviation'  },
        { num:'12', name:'Candle Pattern', val:'H1 Hammer'         },
      ],
    ],
  },
  astro: {
    label: 'Astro Telemetry', color: '#fbbf24', rgb: '251,191,36',
    asset: 'BTC/USD', price: '67,420.50', change: '+1.42%',
    failedGateIndex: 7, // Gate 8 fails ("Mercury Retro")
    confluence: '48%',
    rsi: '74.2', rsiTag: 'OVERBOUGHT', rsiColor: '#ef4444',
    macd: '-12.4', macdTag: 'BEARISH', macdColor: '#ef4444',
    ema: '$66,800', emaTag: 'ABOVE', emaColor: '#10b981',
    atr: '420.5', atrTag: 'HIGH VOL', atrColor: '#f97316',
    trend1: '↓ 4H BEARISH', trend1Color: '#fef2f2',
    trend2: '🪐 RETROGRADE', trend2Color: '#fffbeb',
    smc: ['HTF Moon Align', 'Outer Transit Conf.', 'Mercury Rx Block', 'Lunar Tide High'],
    rows: [
      [
        { num:'01', name:'Phase Angle',   val:'Synodic 72% Bull'  },
        { num:'02', name:'Declination',   val:'Peak Lat. Reverse' },
        { num:'03', name:'Apogee/Perigee',val:'Perigee High ATR'  },
        { num:'04', name:'Node Align',    val:'Eclipse Clear'     },
        { num:'05', name:'Session Vol',   val:'NY overlap active' },
        { num:'06', name:'Harmonics',     val:'Jupiter Trine OK'  },
      ],
      [
        { num:'07', name:'Discordance',   val:'Square Conflict 0' },
        { num:'08', name:'Mercury Retro', val:'Cancer (25.1°) Rx'  }, // Failed gate
        { num:'09', name:'Venus Speed',   val:'Acceleration High' },
        { num:'10', name:'Outer Transit', val:'Macro Risk-On'     },
        { num:'11', name:'Midheaven MC',  val:'Local Peak Align'  },
        { num:'12', name:'Solar Flares',  val:'K-Index 2 (Safe)'  },
      ],
      [
        { num:'13', name:'SMC BOS',       val:'Bullish Breakout'  },
        { num:'14', name:'OB/FVG Mit.',   val:'OB Entry Cleared'  },
        { num:'15', name:'MTF EMA',       val:'1H/4H Bull Trend'  },
        { num:'16', name:'VWAP Dev.',     val:'Inside 1.5 Deviation'},
        { num:'17', name:'Seasonal Qtr',  val:'Q4 Trend Concur'   },
      ],
    ],
  },
  webhook: {
    label: 'API Webhook', color: '#f87171', rgb: '248,113,113',
    asset: 'EUR/USD', price: '1.08450', change: '+0.05%',
    failedGateIndex: null, // All pass!
    confluence: '88%',
    rsi: '52.4', rsiTag: 'NEUTRAL', rsiColor: '#64748b',
    macd: '+0.00015', macdTag: 'BULLISH', macdColor: '#10b981',
    ema: '$1.0838', emaTag: 'ABOVE', emaColor: '#10b981',
    atr: '0.0042', atrTag: 'STABLE', atrColor: '#10b981',
    trend1: '↑ 4H BULLISH', trend1Color: '#f0fdf4',
    trend2: '📊 STABLE', trend2Color: '#f1f5f9',
    smc: ['Payload Validated', 'BOS confirmed', 'Broker Account Synced', 'Execution Ready'],
    rows: [
      [
        { num:'01', name:'Confluence',     val:'API Score 62%'  },
        { num:'02', name:'SMC Confirm',    val:'BOS Detected'   },
        { num:'03', name:'TF Alignment',   val:'1H/4H Aligned'  },
        { num:'04', name:'Session Filter', val:'London Open'    },
      ],
      [
        { num:'05', name:'Volatility',     val:'ATR 0.8× Stable' },
        { num:'06', name:'No Conflict',    val:'Consensus OK'    },
        { num:'07', name:'Cooldown',       val:'Rate Limit Clear' },
        { num:'08', name:'News Event',     val:'Calendar Clear'  },
      ],
      [
        { num:'09', name:'Correlation',    val:'Currency Index ✓' },
        { num:'10', name:'MTF Stack',      val:'MTF Verified'     },
        { num:'11', name:'VWAP',           val:'Value Zone OK'    },
        { num:'12', name:'Candle Pattern', val:'1H Confirm'       },
      ],
    ],
  },
};

// ─── Easing ───────────────────────────────────────────────────────────────────
function eio(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PipelineShowcase() {
  const [mode, setMode]           = useState<Mode>('quant');
  const [litCol, setLitCol]       = useState(-1);
  const [hubActive, setHubActive] = useState(false);
  const [sigsActive, setSigsActive] = useState(false);

  const pL    = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const pR    = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const rowEl = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const hubEl = useRef<HTMLDivElement | null>(null);
  const gateRefs = useRef<(HTMLDivElement | null)[][]>([[], [], []]);

  const cancelFns = useRef<(() => void)[]>([]);
  const timerIds  = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = useCallback(() => {
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];
    cancelFns.current.forEach(fn => fn());
    cancelFns.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timerIds.current.push(id);
  }, []);

  const shootParticle = useCallback((
    el: HTMLDivElement,
    rowWidth: number,
    fromFrac: number,
    toFrac: number,
    durationMs: number,
    color: string,
    onDone?: () => void,
  ): (() => void) => {
    let cancelled = false;
    let rafId = 0;

    const fromPx = rowWidth * fromFrac;
    const toPx   = rowWidth * toFrac;
    const tail   = toPx > fromPx ? -1 : 1;

    el.style.transform  = `translateX(${fromPx}px)`;
    el.style.opacity    = '1';
    el.style.background = `radial-gradient(circle at 35% 35%, #ffffff 0%, ${color} 45%, ${color}44 80%, transparent 100%)`;
    el.style.boxShadow = `0 0 5px 2px #fff, 0 0 14px 6px ${color}cc, ${tail * 14}px 0 22px 10px ${color}44`;

    const t0 = performance.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min((now - t0) / durationMs, 1);
      const e = eio(t);
      el.style.transform = `translateX(${fromPx + (toPx - fromPx) * e}px)`;
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        el.style.opacity = '0';
        onDone?.();
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      el.style.opacity = '0';
    };
  }, []);

  const runSequence = useCallback((cfg: Cfg) => {
    clearAll();

    setLitCol(-1);
    setHubActive(false);
    setSigsActive(false);

    [0, 1, 2].forEach(i => {
      [pL, pR].forEach(ref => {
        const el = ref.current[i];
        if (el) { el.style.opacity = '0'; el.style.transform = 'translateX(0px)'; }
      });
    });

    gateRefs.current.forEach((row) => {
      row.forEach((el) => {
        if (!el) return;
        el.style.opacity = '0.2';
        el.style.transform = 'scale(0.97)';
        el.style.borderLeft = '3px solid #e2e8f0';
        el.style.boxShadow = 'none';
      });
    });

    const widths = rowEl.current.map(el => el?.getBoundingClientRect().width ?? 1100);
    const maxCols = Math.max(...cfg.rows.map(r => r.length));

    // ── PHASE 1: Column scan ──
    for (let col = 0; col < maxCols; col++) {
      schedule(() => {
        setLitCol(col);
        [0, 1, 2].forEach(rowIdx => {
          const el = gateRefs.current[rowIdx]?.[col];
          if (!el) return;

          // Gate failing logic
          let isFailed = false;
          if (cfg.failedGateIndex !== null) {
            const flatIndex = rowIdx * maxCols + col;
            if (flatIndex === cfg.failedGateIndex) isFailed = true;
          }

          if (isFailed) {
            el.style.opacity = '1';
            el.style.transform = 'translateX(2px) scale(1.02)';
            el.style.borderLeft = '3px solid #ef4444';
            el.style.boxShadow = '0 4px 18px -4px rgba(239,68,68,0.45)';
          } else {
            el.style.opacity = '1';
            el.style.transform = 'translateX(2px) scale(1.01)';
            el.style.borderLeft = `3px solid ${cfg.color}`;
            el.style.boxShadow = `0 4px 16px -4px rgba(${cfg.rgb},0.22)`;
          }
        });
      }, col * 180);
    }
    const SCAN_DONE = maxCols * 180;

    // ── PHASE 2: LEFT particles ──
    const T_FLOW_IN = SCAN_DONE + 120;
    schedule(() => {
      [0, 1, 2].forEach(i => {
        const el = pL.current[i];
        if (!el) return;
        const cancel = shootParticle(el, widths[i], 0.00, 0.44, 700, cfg.color);
        cancelFns.current.push(cancel);
      });
    }, T_FLOW_IN);

    // ── PHASE 3: Hub ──
    const T_HUB = T_FLOW_IN + 750;
    schedule(() => setHubActive(true), T_HUB);

    schedule(() => {
      const hub = hubEl.current;
      if (!hub) return;
      hub.style.transition = 'transform 0.2s ease-out';
      hub.style.transform  = 'scale(1.15)';
      setTimeout(() => {
        hub.style.transform = 'scale(1)';
        setTimeout(() => { hub.style.transition = ''; }, 200);
      }, 200);
    }, T_HUB + 20);

    // ── PHASE 4: RIGHT particles ──
    const T_FLOW_OUT = T_HUB + 380;
    schedule(() => {
      [0, 1, 2].forEach(i => {
        const el = pR.current[i];
        if (!el) return;
        const cancel = shootParticle(el, widths[i], 0.56, 0.985, 650, cfg.color);
        cancelFns.current.push(cancel);
      });
    }, T_FLOW_OUT);

    // ── PHASE 5: Signals ──
    const T_SIGS = T_FLOW_OUT + 700;
    schedule(() => setSigsActive(true), T_SIGS);

  }, [clearAll, schedule, shootParticle, mode]);

  useEffect(() => {
    const id = setTimeout(() => runSequence(MODES[mode]), 80);
    return () => { clearTimeout(id); clearAll(); };
  }, [mode, runSequence, clearAll]);

  // Auto-cycle modes
  useEffect(() => {
    if (!sigsActive) return;
    const modes: Mode[] = ['quant', 'astro', 'webhook'];
    const id = setTimeout(() => {
      setMode(m => modes[(modes.indexOf(m) + 1) % 3]);
    }, 7000);
    return () => clearTimeout(id);
  }, [sigsActive]);

  const onTab = (m: Mode) => {
    if (m === mode) runSequence(MODES[m]);
    else setMode(m);
  };

  const C = MODES[mode];
  const isAstro = mode === 'astro';
  const totalGatesCount = isAstro ? 17 : 12;

  // Compute how many gates passed
  const passedGatesCount = C.failedGateIndex !== null ? totalGatesCount - 1 : totalGatesCount;
  const isSignalPass = C.failedGateIndex === null;

  return (
    <section
      id="pipeline-showcase"
      style={{
        position: 'relative',
        padding: '88px 0 80px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg,#f8fafc 0%,#ffffff 55%,#f1f5f9 100%)',
      }}
    >
      <style>{`
        @keyframes ps-ring  { 0%{transform:scale(1);opacity:.72} 100%{transform:scale(2.3);opacity:0} }
        @keyframes ps-blink { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes ps-march { 0%{background-position:0 0} 100%{background-position:28px 0} }
        @keyframes ps-sigin { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px', position: 'relative', zIndex: 10 }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 18px', borderRadius: 999,
            border: `1.5px solid ${C.color}55`,
            background: `${C.color}0e`,
            color: C.color, fontSize: 10.5, fontWeight: 800,
            letterSpacing: '0.13em', textTransform: 'uppercase', marginBottom: 18,
            transition: 'all 0.5s',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: C.color,
              display: 'inline-block', animation: 'ps-blink 1.8s ease infinite',
              transition: 'background 0.5s',
            }} />
            Automated Confluence Engine
          </div>

          <h2 style={{
            fontSize: 38, fontWeight: 800, color: '#0f172a',
            margin: '0 0 14px', letterSpacing: '-0.025em', lineHeight: 1.15,
          }}>
            {isAstro ? '17-Gate Celestial' : '12-Gate Quantitative'} Engine{' '}
            <span style={{ color: C.color, transition: 'color 0.5s' }}>→</span>
            {' '}Realtime Signals
          </h2>

          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 580, margin: '0 auto', lineHeight: 1.7 }}>
            Every market signal passes through{' '}
            <strong style={{ color: '#334155' }}>{isAstro ? '17 validation gates' : '12 validation gates'}</strong>,
            converges at the Core Hub, and fires as an execution-ready trade signal.
          </p>
        </div>

        {/* ── Desktop layout ── */}
        <div className="hidden lg:block" style={{ position: 'relative' }}>

          {/* ── Center spine & Hub ── */}
          <div style={{
            position: 'absolute', left: '44%', width: '12%',
            top: 0, bottom: 0, pointerEvents: 'none', zIndex: 20,
          }}>
            {/* Vertical glow spine */}
            <div style={{
              position: 'absolute', left: '50%', top: 12, bottom: 12, width: 2,
              transform: 'translateX(-50%)',
              background: hubActive
                ? `linear-gradient(180deg,${C.color}00 0%,${C.color}88 25%,${C.color} 50%,${C.color}88 75%,${C.color}00 100%)`
                : 'linear-gradient(180deg,#e2e8f000 0%,#e2e8f0 30%,#e2e8f0 70%,#e2e8f000 100%)',
              transition: 'background 0.6s',
            }} />

            {/* Hub badge */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
              <div
                ref={hubEl}
                style={{
                  position: 'relative',
                  width: 80, height: 80, borderRadius: 24,
                  background: '#ffffff',
                  border: `2px solid ${hubActive ? C.color : '#e2e8f0'}`,
                  boxShadow: hubActive
                    ? `0 0 0 8px ${C.color}14, 0 8px 36px rgba(${C.rgb},0.24)`
                    : '0 2px 14px rgba(0,0,0,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.5s, box-shadow 0.5s',
                  zIndex: 2,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none"
                  stroke={hubActive ? C.color : '#94a3b8'} strokeWidth="1.8"
                  style={{ width: 32, height: 32, transition: 'stroke 0.5s' }}
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
                  <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12" strokeLinecap="round" />
                </svg>
                {hubActive && [0, 1, 2].map(i => (
                  <span key={i} style={{
                    position: 'absolute', inset: 0, borderRadius: 24,
                    border: `1.5px solid ${C.color}`,
                    animation: `ps-ring 1.8s ease-out ${i * 0.55}s infinite`,
                  }} />
                ))}
              </div>

              {/* Status pill */}
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', left: '50%',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap', background: '#fff',
                border: '1px solid #e2e8f0', borderRadius: 999,
                padding: '3px 12px', fontSize: 9, fontWeight: 800,
                color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: hubActive ? C.color : '#cbd5e1',
                  animation: hubActive ? 'ps-blink 1s ease infinite' : 'none',
                  transition: 'background 0.5s',
                }} />
                {!hubActive ? 'Scanning' : sigsActive ? (isSignalPass ? 'Validated' : 'Blocked') : 'Processing'}
              </div>
            </div>
          </div>

          {/* ── 3 rows of grid ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {C.rows.map((rowGates, ri) => {
              const gridCols = isAstro ? 6 : 4;

              return (
                <div
                  key={ri}
                  ref={el => { rowEl.current[ri] = el; }}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 110 }}
                >
                  {/* Left track */}
                  <div style={{
                    position: 'absolute', left: '44%', width: '6%',
                    height: 2, top: '50%', marginTop: -1,
                    borderRadius: 2, pointerEvents: 'none', zIndex: 6,
                    background: hubActive
                      ? `repeating-linear-gradient(90deg,${C.color} 0,${C.color} 5px,transparent 5px,transparent 12px)`
                      : 'repeating-linear-gradient(90deg,#cbd5e1 0,#cbd5e1 4px,transparent 4px,transparent 11px)',
                    animation: hubActive ? 'ps-march 0.35s linear infinite' : 'none',
                    transition: 'background 0.4s',
                  }} />

                  {/* Right track */}
                  <div style={{
                    position: 'absolute', left: '50%', width: '6%',
                    height: 2, top: '50%', marginTop: -1,
                    borderRadius: 2, pointerEvents: 'none', zIndex: 6,
                    background: sigsActive
                      ? `repeating-linear-gradient(90deg,${C.color} 0,${C.color} 5px,transparent 5px,transparent 12px)`
                      : 'repeating-linear-gradient(90deg,#cbd5e1 0,#cbd5e1 4px,transparent 4px,transparent 11px)',
                    animation: sigsActive ? 'ps-march 0.35s linear infinite' : 'none',
                    transition: 'background 0.4s',
                  }} />

                  {/* LEFT particle */}
                  <div
                    ref={el => { pL.current[ri] = el; }}
                    style={{
                      position: 'absolute',
                      top: 'calc(50% - 9px)',
                      left: 0,
                      width: 18, height: 18,
                      borderRadius: '50%',
                      opacity: 0,
                      pointerEvents: 'none',
                      zIndex: 30,
                      willChange: 'transform, opacity',
                    }}
                  />

                  {/* RIGHT particle */}
                  <div
                    ref={el => { pR.current[ri] = el; }}
                    style={{
                      position: 'absolute',
                      top: 'calc(50% - 9px)',
                      left: 0,
                      width: 18, height: 18,
                      borderRadius: '50%',
                      opacity: 0,
                      pointerEvents: 'none',
                      zIndex: 30,
                      willChange: 'transform, opacity',
                    }}
                  />

                  {/* Gate cards — 44% width, dynamic cols ── */}
                  <div style={{
                    width: '44%',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                    gap: 8, position: 'relative', zIndex: 10,
                  }}>
                    {rowGates.map((gate, ci) => {
                      const active = litCol >= ci;
                      const flatIdx = ri * gridCols + ci;
                      const isFailedGate = C.failedGateIndex !== null && flatIdx === C.failedGateIndex;

                      return (
                        <div
                          key={ci}
                          ref={el => {
                            if (!gateRefs.current[ri]) gateRefs.current[ri] = [];
                            gateRefs.current[ri][ci] = el;
                          }}
                          style={{
                            background: active
                              ? (isFailedGate
                                  ? 'rgba(254,242,242,0.95)'
                                  : 'rgba(255,255,255,0.94)')
                              : 'rgba(248,250,252,0.6)',
                            borderRadius: 12,
                            border: active
                              ? (isFailedGate
                                  ? '1px solid rgba(239, 68, 68, 0.45)'
                                  : `1px solid ${C.color}44`)
                              : '1px solid rgba(226, 232, 240, 0.8)',
                            borderLeft: `3px solid ${active ? (isFailedGate ? '#ef4444' : C.color) : '#e2e8f0'}`,
                            padding: isAstro ? '8px 9px' : '10px 11px',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            opacity: active ? 1 : 0.2,
                            transform: active ? 'translateX(2px) scale(1.01)' : 'scale(0.97)',
                            boxShadow: active
                              ? (isFailedGate
                                  ? '0 4px 18px -4px rgba(239,68,68,0.45)'
                                  : `0 4px 16px -4px rgba(${C.rgb},0.22)`)
                              : 'none',
                            transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 7.5, fontWeight: 900, color: isFailedGate && active ? '#ef4444' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Gate {gate.num}
                            </span>
                            <span style={{
                              fontSize: 7, fontWeight: 800, padding: '1px 4px',
                              borderRadius: 4, textTransform: 'uppercase',
                              background: active ? (isFailedGate ? 'rgba(239, 68, 68, 0.15)' : `${C.color}18`) : '#f1f5f9',
                              color: active ? (isFailedGate ? '#ef4444' : C.color) : '#94a3b8',
                              transition: 'all 0.3s',
                            }}>
                              {active ? (isFailedGate ? 'FAIL' : 'OK') : '…'}
                            </span>
                          </div>
                          <div style={{
                            fontSize: isAstro ? 10.5 : 11.5, fontWeight: 700, color: isFailedGate && active ? '#b91c1c' : '#0f172a',
                            marginTop: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                          }}>
                            {gate.name}
                          </div>
                          <div style={{
                            fontSize: 8.5, color: isFailedGate && active ? '#ef4444' : '#64748b',
                            marginTop: 1.5, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                          }}>
                            {gate.val}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Centre spacer */}
                  <div style={{ width: '12%' }} />

                  {/* Right side: Unified high-fidelity Dashboard Card inside Row 1 (center) */}
                  <div style={{ width: '44%', paddingLeft: 20, position: 'relative', zIndex: 10 }}>
                    {ri === 1 ? (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        left: 20,
                        right: 0,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '24px',
                        boxShadow: sigsActive ? '0 15px 45px -10px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.03)' : 'none',
                        opacity: sigsActive ? 1 : 0.12,
                        animation: sigsActive ? 'ps-sigin 0.65s cubic-bezier(0.16,1,0.3,1) both' : 'none',
                        transition: 'box-shadow 0.5s, opacity 0.5s',
                        overflow: 'hidden',
                        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                        zIndex: 25,
                      }}>
                        {/* 1. Mini Candlestick Chart Header */}
                        <div style={{ padding: '16px 20px 8px', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{C.asset}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981' }}>{C.change}</span>
                          </div>
                          
                          {/* Mini SVG candlestick chart representation */}
                          <div style={{ height: '62px', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '4px 0' }}>
                            <svg width="100%" height="100%" viewBox="0 0 320 60" style={{ overflow: 'visible' }}>
                              {/* Candlestick bars */}
                              <line x1="20" y1="10" x2="20" y2="40" stroke="#f87171" strokeWidth="1.5" />
                              <rect x="15" y="18" width="10" height="18" fill="#f87171" rx="1" />

                              <line x1="50" y1="15" x2="50" y2="45" stroke="#f87171" strokeWidth="1.5" />
                              <rect x="45" y="22" width="10" height="15" fill="#f87171" rx="1" />

                              <line x1="80" y1="20" x2="80" y2="50" stroke="#f87171" strokeWidth="1.5" />
                              <rect x="75" y="25" width="10" height="20" fill="#f87171" rx="1" />

                              <line x1="110" y1="12" x2="110" y2="35" stroke="#10b981" strokeWidth="1.5" />
                              <rect x="105" y="16" width="10" height="15" fill="#10b981" rx="1" />

                              <line x1="140" y1="8" x2="140" y2="30" stroke="#10b981" strokeWidth="1.5" />
                              <rect x="135" y="10" width="10" height="14" fill="#10b981" rx="1" />

                              <line x1="170" y1="20" x2="170" y2="45" stroke="#f87171" strokeWidth="1.5" />
                              <rect x="165" y="24" width="10" height="16" fill="#f87171" rx="1" />

                              <line x1="200" y1="25" x2="200" y2="52" stroke="#10b981" strokeWidth="1.5" />
                              <rect x="195" y="28" width="10" height="18" fill="#10b981" rx="1" />

                              <line x1="230" y1="18" x2="230" y2="42" stroke="#10b981" strokeWidth="1.5" />
                              <rect x="225" y="20" width="10" height="16" fill="#10b981" rx="1" />

                              <line x1="260" y1="15" x2="260" y2="35" stroke="#10b981" strokeWidth="1.5" />
                              <rect x="255" y="17" width="10" height="14" fill="#10b981" rx="1" />

                              <line x1="290" y1="10" x2="290" y2="28" stroke="#10b981" strokeWidth="1.5" />
                              <rect x="285" y="12" width="10" height="12" fill="#10b981" rx="1" />

                              {/* Price horizontal line */}
                              <line x1="0" y1="22" x2="320" y2="22" stroke="#10b981" strokeDasharray="3 3" strokeWidth="1" />
                            </svg>

                            {/* Floating Price Indicator */}
                            <div style={{
                              position: 'absolute', right: 8, top: '42px',
                              background: '#10b981', color: '#fff', fontSize: '9.5px', fontWeight: 'bold',
                              padding: '2px 6px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                            }}>
                              {C.price}
                            </div>
                          </div>
                        </div>

                        {/* 2. Gate Validation Bar */}
                        <div style={{
                          background: isSignalPass ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                          borderLeft: `4px solid ${isSignalPass ? '#10b981' : '#ef4444'}`,
                          padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          borderBottom: '1px solid #f1f5f9'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              width: 7, height: 7, borderRadius: '50%',
                              background: isSignalPass ? '#10b981' : '#ef4444',
                              animation: 'ps-blink 1.5s ease infinite'
                            }} />
                            <span style={{ fontSize: '10.5px', fontWeight: '900', color: isSignalPass ? '#10b981' : '#ef4444', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              {isSignalPass ? 'SIGNAL' : 'NO SIGNAL'}
                            </span>
                            <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '500', marginLeft: 4 }}>
                              {isSignalPass
                                ? 'All parameters met — high confluence'
                                : `${passedGatesCount}/${totalGatesCount} gates passed — parameter failed`}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '9.5px', fontWeight: 'bold',
                            background: isSignalPass ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isSignalPass ? '#10b981' : '#ef4444',
                            padding: '2px 8px', borderRadius: '20px'
                          }}>
                            {passedGatesCount}/{totalGatesCount}
                          </span>
                        </div>

                        {/* 3. Metric 2x2 Grid */}
                        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderBottom: '1px solid #f1f5f9' }}>
                          {/* Box 1: RSI */}
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f088', borderRadius: '12px', padding: '8px 12px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8' }}>RSI (14)</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{C.rsi}</span>
                              <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: C.rsiColor, background: `${C.rsiColor}12`, padding: '1px 5px', borderRadius: '4px' }}>
                                {C.rsiTag}
                              </span>
                            </div>
                          </div>

                          {/* Box 2: MACD */}
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f088', borderRadius: '12px', padding: '8px 12px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8' }}>MACD</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{C.macd}</span>
                              <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: C.macdColor, background: `${C.macdColor}12`, padding: '1px 5px', borderRadius: '4px' }}>
                                {C.macdTag}
                              </span>
                            </div>
                          </div>

                          {/* Box 3: EMA */}
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f088', borderRadius: '12px', padding: '8px 12px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8' }}>EMA (50)</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{C.ema}</span>
                              <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: C.emaColor, background: `${C.emaColor}12`, padding: '1px 5px', borderRadius: '4px' }}>
                                {C.emaTag}
                              </span>
                            </div>
                          </div>

                          {/* Box 4: ATR */}
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f088', borderRadius: '12px', padding: '8px 12px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8' }}>ATR (14)</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{C.atr}</span>
                              <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: C.atrColor, background: `${C.atrColor}12`, padding: '1px 5px', borderRadius: '4px' }}>
                                {C.atrTag}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 4. Trend Pills + SMC Pills */}
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                            <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', color: '#ef4444', background: C.trend1Color }}>{C.trend1}</span>
                            <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', color: '#475569', background: C.trend2Color }}>{C.trend2}</span>
                          </div>

                          {/* SMC section */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: '8px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SMC Confluences</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {C.smc.map((item, idx) => (
                                <span key={idx} style={{
                                  fontSize: '8.5px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px',
                                  border: '1px solid #cbd5e1', color: '#4f46e5', background: '#fff',
                                  display: 'inline-flex', alignItems: 'center', gap: 4
                                }}>
                                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#4f46e5' }} />
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 5. Gate Dot Array */}
                        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {Array.from({ length: totalGatesCount }).map((_, idx) => {
                              const isFailed = C.failedGateIndex !== null && idx === C.failedGateIndex;
                              return (
                                <span key={idx} style={{
                                  width: 8, height: 8, borderRadius: '50%',
                                  background: isFailed ? '#f87171' : '#10b981',
                                  border: isFailed ? '1px solid #ef4444' : 'none'
                                }} />
                              );
                            })}
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {passedGatesCount}/{totalGatesCount} gates passed
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M2.5 1.5 L5 4 L2.5 6.5" />
                            </svg>
                          </span>
                        </div>

                        {/* 6. Bottom Confluence & Action Button */}
                        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ fontSize: '8.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Confluence</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                              {/* Small custom bar chart indicator */}
                              <div style={{ width: '60px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: C.confluence, height: '100%', background: isSignalPass ? '#10b981' : '#fbbf24', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }}>{C.confluence}</span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button style={{
                            background: isSignalPass ? '#b3926c' : '#e2e8f0',
                            color: isSignalPass ? '#ffffff' : '#94a3b8',
                            border: 'none', borderRadius: '12px', padding: '10px 16px',
                            fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em',
                            display: 'flex', alignItems: 'center', gap: 6,
                            cursor: isSignalPass ? 'pointer' : 'not-allowed',
                            boxShadow: isSignalPass ? '0 4px 12px rgba(179,146,108,0.25)' : 'none',
                            textTransform: 'uppercase'
                          }}>
                            {isSignalPass ? (
                              <>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                                  <path d="M5.5 0 L1.5 5.5 L4.5 5.5 L3.5 10 L8.5 4.5 L5.5 4.5 Z" />
                                </svg>
                                Generate Signal
                              </>
                            ) : (
                              <>
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="6" cy="6" r="5" />
                                  <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" />
                                </svg>
                                Blocked
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Mobile fallback ── */}
        <div className="lg:hidden flex flex-col gap-6">
          {C.rows.map((rowGates, ri) => (
            <div key={ri}>
              <p style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                Row {ri + 1} Gates
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {rowGates.map((g, ci) => {
                  const flatIdx = ri * (isAstro ? 6 : 4) + ci;
                  const isFailedGate = C.failedGateIndex !== null && flatIdx === C.failedGateIndex;
                  return (
                    <div
                      key={ci}
                      style={{
                        background: '#fff',
                        border: `1px solid ${isFailedGate ? '#ef4444' : C.color + '44'}`,
                        borderLeft: `3px solid ${isFailedGate ? '#ef4444' : C.color}`,
                        borderRadius: 12,
                        padding: '8px 10px'
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: isFailedGate ? '#b91c1c' : '#0f172a' }}>
                        {g.name} {isFailedGate && '(FAIL)'}
                      </div>
                      <div style={{ fontSize: 9, color: isFailedGate ? '#ef4444' : '#64748b', marginTop: 2 }}>{g.val}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Unified mobile card */}
          {sigsActive && (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 18, marginTop: 10,
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{C.asset} — Output Status</span>
                <span style={{
                  fontSize: '9.5px', fontWeight: 'bold',
                  background: isSignalPass ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: isSignalPass ? '#10b981' : '#ef4444',
                  padding: '2px 8px', borderRadius: '20px'
                }}>
                  {isSignalPass ? 'SIGNAL MET' : 'BLOCKED'} ({passedGatesCount}/{totalGatesCount})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                {Array.from({ length: totalGatesCount }).map((_, idx) => {
                  const isFailed = C.failedGateIndex !== null && idx === C.failedGateIndex;
                  return (
                    <span key={idx} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: isFailed ? '#f87171' : '#10b981'
                    }} />
                  );
                })}
              </div>
              <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5' }}>
                {isSignalPass
                  ? 'All confluences are satisfied. Execution order issued.'
                  : 'Parameter check failed. System blocked order routing to terminal.'}
              </p>
            </div>
          )}
        </div>

        {/* ── Tab dock ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 64 }}>
          <div style={{
            display: 'flex', gap: 4, padding: '6px 8px',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(226,232,240,0.9)', borderRadius: 999,
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>
            {(Object.keys(MODES) as Mode[]).map(m => {
              const mc = MODES[m];
              const active = m === mode;
              return (
                <button key={m} onClick={() => onTab(m)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '11px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: active ? '#fff' : 'transparent',
                  boxShadow: active ? '0 2px 10px rgba(0,0,0,0.09)' : 'none',
                  color: active ? '#0f172a' : '#94a3b8',
                  fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                  transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: mc.color,
                    opacity: active ? 1 : 0.3,
                    boxShadow: active ? `0 0 8px 2px ${mc.color}88` : 'none',
                    transition: 'all 0.3s',
                  }} />
                  {mc.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '40%', left: -80, width: 500, height: 500, borderRadius: '50%', background: `rgba(${C.rgb},0.06)`, filter: 'blur(90px)', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'background 0.8s' }} />
      <div style={{ position: 'absolute', top: '60%', right: -80, width: 500, height: 500, borderRadius: '50%', background: `rgba(${C.rgb},0.05)`, filter: 'blur(90px)', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'background 0.8s' }} />
    </section>
  );
}
