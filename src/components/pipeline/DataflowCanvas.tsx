'use client';

import React, { useRef, useEffect, useCallback } from 'react';

type Mode = 'quant' | 'astro' | 'webhook';

interface Gate {
  num: string;
  name: string;
  val: string;
}

interface Cfg {
  label: string;
  color: string;
  rgb: string;
  asset: string;
  price: string;
  change: string;
  rows: Gate[][];
  confluence: string;
  failedGateIndex: number | null;
}

interface DataflowCanvasProps {
  mode: Mode;
  config: Cfg;
  litCol: number;
  setLitCol: (col: number) => void;
  hubActive: boolean;
  setHubActive: (active: boolean) => void;
  sigsActive: boolean;
  setSigsActive: (active: boolean) => void;
  hubEl: React.RefObject<HTMLDivElement>;
}

function eio(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function DataflowCanvas({
  mode,
  config,
  litCol,
  setLitCol,
  hubActive,
  setHubActive,
  sigsActive,
  setSigsActive,
  hubEl,
}: DataflowCanvasProps) {
  const pL = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const pR = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const rowEl = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const gateRefs = useRef<(HTMLDivElement | null)[][]>([[], [], []]);

  const cancelFns = useRef<(() => void)[]>([]);
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    const toPx = rowWidth * toFrac;
    const tail = toPx > fromPx ? -1 : 1;

    el.style.transform = `translateX(${fromPx}px)`;
    el.style.opacity = '1';
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
        if (el) {
          el.style.opacity = '0';
          el.style.transform = 'translateX(0px)';
        }
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

    // Column scan
    for (let col = 0; col < maxCols; col++) {
      schedule(() => {
        setLitCol(col);
        [0, 1, 2].forEach(rowIdx => {
          const el = gateRefs.current[rowIdx]?.[col];
          if (!el) return;

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

    // LEFT particles
    const T_FLOW_IN = SCAN_DONE + 120;
    schedule(() => {
      [0, 1, 2].forEach(i => {
        const el = pL.current[i];
        if (!el) return;
        const cancel = shootParticle(el, widths[i], 0.00, 0.44, 700, cfg.color);
        cancelFns.current.push(cancel);
      });
    }, T_FLOW_IN);

    // Hub scale
    const T_HUB = T_FLOW_IN + 750;
    schedule(() => setHubActive(true), T_HUB);

    schedule(() => {
      const hub = hubEl.current;
      if (!hub) return;
      hub.style.transition = 'transform 0.2s ease-out';
      hub.style.transform = 'scale(1.15)';
      setTimeout(() => {
        hub.style.transform = 'scale(1)';
        setTimeout(() => {
          hub.style.transition = '';
        }, 200);
      }, 200);
    }, T_HUB + 20);

    // RIGHT particles
    const T_FLOW_OUT = T_HUB + 380;
    schedule(() => {
      [0, 1, 2].forEach(i => {
        const el = pR.current[i];
        if (!el) return;
        const cancel = shootParticle(el, widths[i], 0.56, 0.985, 650, cfg.color);
        cancelFns.current.push(cancel);
      });
    }, T_FLOW_OUT);

    // Signals activation
    const T_SIGS = T_FLOW_OUT + 700;
    schedule(() => setSigsActive(true), T_SIGS);
  }, [clearAll, schedule, shootParticle, setLitCol, setHubActive, setSigsActive, hubEl]);

  useEffect(() => {
    const id = setTimeout(() => runSequence(config), 80);
    return () => {
      clearTimeout(id);
      clearAll();
    };
  }, [mode, config, runSequence, clearAll]);

  const isAstro = mode === 'astro';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {config.rows.map((rowGates, ri) => {
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
                ? `repeating-linear-gradient(90deg,${config.color} 0,${config.color} 5px,transparent 5px,transparent 12px)`
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
                ? `repeating-linear-gradient(90deg,${config.color} 0,${config.color} 5px,transparent 5px,transparent 12px)`
                : 'repeating-linear-gradient(90deg,#cbd5e1 0,#cbd5e1 4px,transparent 4px,transparent 11px)',
              animation: sigsActive ? 'ps-march 0.35s linear infinite' : 'none',
              transition: 'background 0.4s',
            }} />

            {/* Left particles */}
            <div
              ref={el => { pL.current[ri] = el; }}
              style={{
                position: 'absolute', left: 0, top: '50%', marginTop: -8,
                width: 16, height: 16, borderRadius: '50%',
                pointerEvents: 'none', zIndex: 12, opacity: 0,
              }}
            />

            {/* Right particles */}
            <div
              ref={el => { pR.current[ri] = el; }}
              style={{
                position: 'absolute', left: 0, top: '50%', marginTop: -8,
                width: 16, height: 16, borderRadius: '50%',
                pointerEvents: 'none', zIndex: 12, opacity: 0,
              }}
            />

            {/* Left grid */}
            <div style={{
              width: '44%',
              display: 'grid',
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gap: 12,
              position: 'relative',
              zIndex: 10,
            }}>
              {rowGates.map((gate, ci) => {
                const flatIdx = ri * gridCols + ci;
                const active = litCol >= ci;
                const isFailedGate = config.failedGateIndex !== null && flatIdx === config.failedGateIndex;

                return (
                  <div
                    key={ci}
                    ref={el => {
                      if (!gateRefs.current[ri]) gateRefs.current[ri] = [];
                      gateRefs.current[ri][ci] = el;
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid rgba(226,232,240,0.8)',
                      borderLeft: '3px solid #cbd5e1',
                      borderRadius: 14,
                      padding: '12px 14px',
                      opacity: 0.2,
                      transform: 'scale(0.97)',
                      boxShadow: 'none',
                      transition: 'opacity 0.4s, transform 0.4s, border-color 0.4s, box-shadow 0.4s',
                      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                      minHeight: 82,
                    }}
                  >
                    <div style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      color: isFailedGate && active ? '#ef4444' : '#94a3b8',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}>
                      {gate.num} {gate.name}
                    </div>
                    <div style={{
                      fontWeight: 800,
                      fontSize: 11.5,
                      color: isFailedGate && active ? '#ef4444' : '#1e293b',
                      letterSpacing: '-0.02em',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}>
                      {gate.val}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Centre spacer */}
            <div style={{ width: '12%' }} />

            {/* Right spacer (occupied by sidebar for row 1 in showcase layout) */}
            <div style={{ width: '44%' }} />
          </div>
        );
      })}
    </div>
  );
}
