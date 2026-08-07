'use client';

import React, { useState, useEffect, useRef } from 'react';

// Sub-components
import ModesNav from './pipeline/ModesNav';
import MetricsSidebar from './pipeline/MetricsSidebar';
import DataflowCanvas from './pipeline/DataflowCanvas';

type Mode = 'quant' | 'webhook';

interface Gate { num: string; name: string; val: string }
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
  failedGateIndex: number | null;
}

const MODES: Record<Mode, Cfg> = {
  quant: {
    label: 'Quant Scanner', color: '#0ea5e9', rgb: '14,165,233',
    asset: 'XAU/USD', price: '2342.10', change: '-0.38%',
    failedGateIndex: 5,
    confluence: '56%',
    rsi: '71.6', rsiTag: 'OVERBOUGHT', rsiColor: '#ef4444',
    macd: '+4.17', macdTag: 'BULLISH', macdColor: '#10b981',
    ema: '$2,345', emaTag: 'ABOVE', emaColor: '#10b981',
    atr: '19.23', atrTag: 'VOLATILITY', atrColor: '#64748b',
    trend1: '↓ 1H BEARISH', trend1Color: '#fef2f2',
    trend2: '📊 NEUTRAL', trend2Color: '#f1f5f9',
    smc: ['BOS bullish', '6 active FVG(s)', '5 Order Block(s)', 'Liquidity Sweep detected'],
    rows: [
      [
        { num:'01', name:'Confluence',     val:'Score 68% ≥ 45%'   },
        { num:'02', name:'SMC Confirm',    val:'Bullish BOS & OB'  },
        { num:'03', name:'TF Alignment',   val:'1H Trend Bullish'  },
        { num:'04', name:'Session Filter', val:'NY Overlap Active' },
      ],
      [
        { num:'05', name:'Volatility',     val:'ATR Stable 1.2×'  },
        { num:'06', name:'No Conflict',    val:'Consensus Conflict'},
        { num:'07', name:'Cooldown',       val:'Last trade > 12h'  },
        { num:'08', name:'News Event',     val:'FOMC Clear'        },
      ],
      [
        { num:'09', name:'Correlation',    val:'DXY Bearish Align' },
        { num:'10', name:'MTF Stack',      val:'W1/D1/1H EMA ✓'   },
        { num:'11', name:'VWAP',           val:'Inside Deviation'  },
        { num:'12', name:'Candle Pattern', val:'H1 Hammer'         },
      ],
    ],
  },
  webhook: {
    label: 'API Webhook', color: '#f87171', rgb: '248,113,113',
    asset: 'EUR/USD', price: '1.08450', change: '+0.05%',
    failedGateIndex: null,
    confluence: '88%',
    rsi: '52.4', rsiTag: 'NEUTRAL', rsiColor: '#64748b',
    macd: '+0.00015', macdTag: 'BULLISH', macdColor: '#10b981',
    ema: '$1.0838', emaTag: 'ABOVE', emaColor: '#10b981',
    atr: '0.0042', atrTag: 'STABLE', atrColor: '#10b981',
    trend1: '↑ 1H BULLISH', trend1Color: '#f0fdf4',
    trend2: '📊 STABLE', trend2Color: '#f1f5f9',
    smc: ['Payload Validated', 'BOS confirmed', 'Broker Account Synced', 'Execution Ready'],
    rows: [
      [
        { num:'01', name:'Confluence',     val:'API Score 62%'  },
        { num:'02', name:'SMC Confirm',    val:'BOS Detected'   },
        { num:'03', name:'TF Alignment',   val:'15M/1H Aligned'  },
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

export default function PipelineShowcase() {
  const [mode, setMode] = useState<Mode>('quant');
  const [litCol, setLitCol] = useState(-1);
  const [hubActive, setHubActive] = useState(false);
  const [sigsActive, setSigsActive] = useState(false);

  const hubEl = useRef<HTMLDivElement | null>(null);

  // Auto-cycle modes
  useEffect(() => {
    if (!sigsActive) return;
    const modesList: Mode[] = ['quant', 'webhook'];
    const id = setTimeout(() => {
      setMode(m => modesList[(modesList.indexOf(m) + 1) % 2]);
    }, 7000);
    return () => clearTimeout(id);
  }, [sigsActive]);

  const C = MODES[mode];
  const totalGatesCount = 12;
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
        {/* Header */}
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
            12-Gate Quantitative Engine{' '}
            <span style={{ color: C.color, transition: 'color 0.5s' }}>→</span>
            {' '}Realtime Signals
          </h2>

          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 580, margin: '0 auto', lineHeight: 1.7 }}>
            Every market signal passes through{' '}
            <strong style={{ color: '#334155' }}>12 validation gates</strong>,
            converges at the Core Hub, and fires as an execution-ready trade signal.
          </p>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block" style={{ position: 'relative' }}>
          {/* Spine & Center Hub */}
          <div style={{
            position: 'absolute', left: '44%', width: '12%',
            top: 0, bottom: 0, pointerEvents: 'none', zIndex: 20,
          }}>
            <div style={{
              position: 'absolute', left: '50%', top: 12, bottom: 12, width: 2,
              transform: 'translateX(-50%)',
              background: hubActive
                ? `linear-gradient(180deg,${C.color}00 0%,${C.color}88 25%,${C.color} 50%,${C.color}88 75%,${C.color}00 100%)`
                : 'linear-gradient(180deg,#e2e8f000 0%,#e2e8f0 30%,#e2e8f0 70%,#e2e8f000 100%)',
              transition: 'background 0.6s',
            }} />

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

          {/* SVG Pipelines & Visualized Nodes */}
          <DataflowCanvas
            mode={mode}
            config={C}
            litCol={litCol}
            setLitCol={setLitCol}
            hubActive={hubActive}
            setHubActive={setHubActive}
            sigsActive={sigsActive}
            setSigsActive={setSigsActive}
            hubEl={hubEl}
          />

          {/* Metrics Sidebar Details Overlay */}
          <MetricsSidebar
            config={C}
            sigsActive={sigsActive}
            totalGatesCount={totalGatesCount}
            passedGatesCount={passedGatesCount}
            isSignalPass={isSignalPass}
          />
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col gap-6">
          {C.rows.map((rowGates, ri) => (
            <div key={ri}>
              <p style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                Row {ri + 1} Gates
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {rowGates.map((g, ci) => {
                  const flatIdx = ri * 4 + ci;
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

          {sigsActive && (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 18, marginTop: 10,
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{C.asset} — Status</span>
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

        {/* Dynamic Mode Navigation Tab Dock */}
        <ModesNav
          modes={MODES}
          activeMode={mode}
          onModeChange={(m) => {
            if (m === mode) setMode(m); // force reload trigger if needed
            else setMode(m);
          }}
        />
      </div>

      {/* Glow backgrounds */}
      <div style={{ position: 'absolute', top: '40%', left: -80, width: 500, height: 500, borderRadius: '50%', background: `rgba(${C.rgb},0.06)`, filter: 'blur(90px)', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'background 0.8s' }} />
      <div style={{ position: 'absolute', top: '60%', right: -80, width: 500, height: 500, borderRadius: '50%', background: `rgba(${C.rgb},0.05)`, filter: 'blur(90px)', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'background 0.8s' }} />
    </section>
  );
}
