"use client";

/* =========================================================================
 * CandleReplay — animated candle-by-candle chart scenario for lessons.
 * CSS in academy.css drives the stagger (`--d` per candle) once the root
 * carries data-play="true"; this component owns the narration clock and
 * outcome flash. Reduced motion: CSS finishes instantly, and the clock
 * jumps straight to the final beat.
 * ======================================================================= */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@heropips/ui";
import { findReplay } from "@/lib/academy/scenarios";
import { CANDLE_TICK_MS, CHART_H, CHART_W, chartGeom, fmtChartPrice, prefersReducedMotion } from "./chart";

const MARKER_COLOR: Record<string, string> = {
  entry: "var(--volt-400)",
  stop: "var(--loss-400)",
  target: "var(--profit-400)",
  note: "var(--text-low)",
};

type Phase = "idle" | "playing" | "done";

export function CandleReplay({ scenarioId, autoPlay }: { scenarioId: string; autoPlay?: boolean }) {
  const scenario = findReplay(scenarioId);
  const [phase, setPhase] = useState<Phase>("idle");
  const [idx, setIdx] = useState(0);
  const [run, setRun] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const autoStartedRef = useRef(false);

  const count = scenario?.candles.length ?? 0;

  // Narration clock — one interval while playing, 180ms per candle.
  useEffect(() => {
    if (phase !== "playing" || count === 0) return;
    if (prefersReducedMotion()) {
      setIdx(count - 1);
      setPhase("done");
      return;
    }
    const timer = setInterval(() => {
      setIdx((i) => {
        const next = i + 1;
        if (next >= count - 1) {
          clearInterval(timer);
          setPhase("done");
          return count - 1;
        }
        return next;
      });
    }, CANDLE_TICK_MS);
    return () => clearInterval(timer);
  }, [phase, run, count]);

  // autoPlay: start once when at least half the stage is on screen.
  useEffect(() => {
    if (!autoPlay || autoStartedRef.current) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          autoStartedRef.current = true;
          io.disconnect();
          setIdx(0);
          setRun((r) => r + 1);
          setPhase("playing");
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay]);

  if (!scenario) return null;

  const geom = chartGeom(scenario.candles);
  const started = phase !== "idle";
  const beats = scenario.narration.filter((b) => b.atCandle <= idx);
  const caption = started && beats.length > 0 ? beats[beats.length - 1].text : scenario.narration[0]?.text ?? "";
  const flash = phase === "done" && scenario.outcome !== "neutral";

  const startPlayback = () => {
    autoStartedRef.current = true;
    setIdx(0);
    setRun((r) => r + 1);
    setPhase("playing");
  };

  return (
    <div ref={rootRef} className="ac-replay" data-play={started ? "true" : "false"}>
      <div className="ac-replay-head">
        <span className="ac-replay-pair">
          {scenario.pair}
          <span className="ac-replay-tf">{scenario.timeframe}</span>
        </span>
        <div className="ac-replay-controls">
          <Button variant="ghost" size="sm" onClick={startPlayback}>
            {started ? "Replay" : "Play"}
          </Button>
        </div>
      </div>

      <svg
        key={run}
        className="ac-replay-stage"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        role="img"
        aria-label={`${scenario.title} — animated chart scenario`}
      >
        {scenario.candles.map((c, i) => {
          const bull = c.c >= c.o;
          const color = bull ? "var(--profit-500)" : "var(--loss-500)";
          const cx = geom.xCenter(i);
          const bodyTop = geom.y(Math.max(c.o, c.c));
          const bodyH = Math.max(Math.abs(geom.y(c.c) - geom.y(c.o)), 0.5);
          return (
            <g
              key={i}
              className="ac-candle"
              style={{ "--d": `${i * CANDLE_TICK_MS}ms` } as CSSProperties}
            >
              <line x1={cx} x2={cx} y1={geom.y(c.h)} y2={geom.y(c.l)} stroke={color} strokeWidth={0.35} />
              <rect
                className="ac-candle-body"
                x={cx - geom.bodyW / 2}
                y={bodyTop}
                width={geom.bodyW}
                height={bodyH}
                rx={0.3}
                fill={color}
                style={{ "--d": `${i * CANDLE_TICK_MS}ms`, "--org": `${geom.y(c.o)}px` } as CSSProperties}
              />
            </g>
          );
        })}

        {scenario.markers.map((m, i) => {
          const color = MARKER_COLOR[m.kind] ?? "var(--text-low)";
          const my = geom.y(m.price);
          const mx = geom.xCenter(m.at);
          return (
            <g
              key={`m-${i}`}
              className="ac-replay-marker"
              style={{ "--d": `${m.at * CANDLE_TICK_MS}ms` } as CSSProperties}
            >
              <line
                x1={mx}
                x2={CHART_W - 1}
                y1={my}
                y2={my}
                stroke={color}
                strokeWidth={0.3}
                strokeDasharray="1.4 1.2"
              />
              {/* The label itself lives in .ac-replay-legend below — at
                  fontSize 2.2 in this 100-unit stage it rendered ~6 CSS px. */}
            </g>
          );
        })}
      </svg>

      <div
        className="ac-replay-flash"
        data-tone={scenario.outcome === "target" ? "profit" : "loss"}
        data-show={flash ? "true" : "false"}
        aria-hidden="true"
      >
        {scenario.outcome === "target" ? "TARGET HIT" : "STOPPED OUT"}
      </div>

      {scenario.markers.length > 0 ? (
        <ol className="ac-replay-legend">
          {scenario.markers.map((m, i) => (
            <li key={`lg-${i}`}>
              <i aria-hidden="true" style={{ color: MARKER_COLOR[m.kind] ?? "var(--text-mid)" }} />
              <span>
                {m.label} <b>{fmtChartPrice(scenario.pair, m.price)}</b>
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <p className="ac-replay-caption" aria-live="polite">
        {caption}
      </p>
    </div>
  );
}
