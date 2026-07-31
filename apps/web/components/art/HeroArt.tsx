import * as React from "react";
import { Beacon, Box, Chip, Core, Gate, GShadow, Spark, TopGrid, iso } from "./iso";
import { Scene } from "./Art";

/* =========================================================================
 * HeroConsoleArt — the landing hero visual. One dimensional "decision
 * machine" scene in the site's isometric language (art.css + iso.tsx):
 *
 *   market slab ──▶ AI core ──▶ intelligence brief ──▶ trade guard gate
 *                                                          └──▶ broker fill
 *
 * Zero network weight, zero CLS, theme-aware via tokens, CSS-only motion
 * (static under prefers-reduced-motion). Decorative: aria-hidden, all copy
 * repeated in real text elsewhere on the page.
 * ======================================================================= */

/* candles on the market slab: [worldX, height, up?] */
const CANDLES: Array<[number, number, boolean]> = [
  [12, 34, false],
  [41, 56, true],
  [70, 42, false],
  [99, 72, true],
  [128, 90, true],
  [157, 118, true],
];

/* screen-space candle-top points (slab cluster at 168,236 — see below) */
const LINE_PTS: Array<[number, number]> = CANDLES.map(([x, h]) => {
  const [sx, sy] = iso(x + 10, 56, 14 + h + 6);
  return [sx + 168, sy + 236];
});

const FLOW_PATH = [
  `M${LINE_PTS[0][0]} ${LINE_PTS[0][1]}`,
  ...LINE_PTS.slice(1).map(([x, y]) => `L${x} ${y}`),
  "L398 152", // AI core
  "L538 152", // brief card
  "L538 290", // down the card edge
  "L530 326", // into the gate sheet
  "L508 408", // out of the gate
  "L382 446", // broker rail
].join(" ");

const BRIEF_ROWS: Array<[string, string]> = [
  ["var(--hp3-volt)", "ENTRY — 1.0904"],
  ["var(--loss-400)", "STOP — 1.0878"],
  ["var(--profit-400)", "TARGET — 1.0952"],
];

const BROKERS: Array<[number, string]> = [
  [240, "MT5"],
  [362, "BINANCE"],
  [484, "KUCOIN"],
];

export function HeroConsoleArt({ className, ...rest }: Omit<React.SVGProps<SVGSVGElement>, "viewBox" | "children">) {
  return (
    <Scene
      {...rest}
      className={className}
      artClassName="hp-hero-console"
      viewBox="0 0 640 520"
      caption="Simulated preview of the decision console · pre-launch data"
    >
      {/* ---------------- ground shadows ---------------- */}
      <GShadow cx={200} cy={398} rx={142} ry={22} opacity={0.8} />
      <GShadow cx={516} cy={424} rx={80} ry={14} opacity={0.7} />
      {BROKERS.map(([x]) => (
        <GShadow key={x} cx={x + 40} cy={496} rx={52} ry={10} opacity={0.6} />
      ))}

      {/* ---------------- energy beams (behind the solids) ---------------- */}
      <path className="hp3-beam hp3-beam--pulse" d="M414 152 L446 148" />
      <path className="hp3-beam" d="M538 236 L538 290 L530 326" />
      {BROKERS.map(([x]) => (
        <path key={x} className="hp3-beam" d={`M508 408 L${x + 20} 446`} />
      ))}

      {/* ---------------- market slab ---------------- */}
      <g transform="translate(168 236)">
        <Box x={0} y={0} z={0} w={190} d={112} h={14} f="var(--surface-3)" />
        <TopGrid x={0} y={0} z={14} w={190} d={112} step={28} />
        {CANDLES.map(([x, h, up], i) => {
          const tone = up ? "var(--profit-500)" : "var(--loss-500)";
          const [wx, wy] = iso(x + 10, 56, 14 + h);
          return (
            <g key={x}>
              <line x1={wx} y1={wy} x2={wx} y2={wy - (i === CANDLES.length - 1 ? 16 : 11)} stroke={tone} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
              <Box x={x} y={46} z={14} w={20} d={20} h={h} f={tone} />
            </g>
          );
        })}
      </g>
      {/* the price line rides the candle tops and feeds the core */}
      <polyline
        points={[...LINE_PTS, [320, 190], [370, 164], [392, 154]].map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke="var(--hp3-volt)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hp3-draw"
        style={{ "--len": 400, filter: "drop-shadow(0 0 5px var(--hp3-glass))" } as React.CSSProperties}
      />
      <Chip cx={118} cy={402} label="EURUSD · M15 · SIM" tone="ghost" size="sm" />

      {/* ---------------- status ---------------- */}
      <Beacon x={40} y={54} r={3.5} />
      <Chip cx={131} cy={54} label="LIVE FEED · SIM" tone="volt" size="sm" />

      {/* ---------------- AI core ---------------- */}
      <Core cx={398} cy={152} />
      <Chip cx={330} cy={216} label="QUANT-ML-V1 · AI" tone="pulse" size="sm" />

      {/* ---------------- intelligence brief ---------------- */}
      <g className="hp3-card">
        <g className="hp3-float" style={{ animationDelay: "0.9s" }}>
          <rect className="hp3-card-bg" x="430" y="52" width="196" height="186" rx="14" />
          <text x="446" y="78" className="hp-art-mono hp-art-mono--xs hp-art-mono--pulse">INTELLIGENCE BRIEF</text>
          <text x="446" y="108" className="hp-art-mono hp-art-mono--lg hp-art-mono--hi">LONG · EURUSD</text>
          <text x="446" y="132" className="hp-art-mono hp-art-mono--xs">CONFIDENCE</text>
          <text x="614" y="132" textAnchor="end" className="hp-art-mono hp-art-mono--sm hp-art-mono--pulse">0.82</text>
          <rect x="446" y="140" width="168" height="6" rx="3" fill="var(--border-1)" />
          <rect x="446" y="140" width="138" height="6" rx="3" fill="var(--pulse-500)" />
          <line x1="446" y1="158" x2="614" y2="158" stroke="var(--border-1)" strokeWidth="1" />
          {BRIEF_ROWS.map(([tone, label], i) => (
            <g key={label}>
              <circle cx="451" cy={176 + i * 20 - 4} r="3.5" fill={tone} />
              <text x="464" y={176 + i * 20} className="hp-art-mono hp-art-mono--xs hp-art-mono--mid">{label}</text>
            </g>
          ))}
          <text x="446" y="233" className="hp-art-mono hp-art-mono--xs">REASONING ATTACHED</text>
        </g>
      </g>

      {/* ---------------- trade guard gate ---------------- */}
      <g transform="translate(470 348)">
        <Gate f="var(--surface-raised)" />
      </g>
      <Chip cx={512} cy={258} label="TRADE GUARD · 9/9 ✓" tone="volt" />

      {/* ---------------- broker pedestals ---------------- */}
      {BROKERS.map(([x, label], i) => {
        const [tx, ty] = iso(32, 22, 22);
        return (
          <g key={label}>
            <g transform={`translate(${x} 452)`}>
              <Box x={0} y={0} z={0} w={64} d={44} h={22} f="var(--surface-3)" />
            </g>
            <Beacon x={x + tx} y={452 + ty} r={3} tone="var(--profit-400)" delay={`${i * 0.6}s`} />
            <Chip cx={x + 9} cy={414} label={label} size="sm" />
          </g>
        );
      })}
      <Chip cx={126} cy={450} label="AUTO-EXECUTED · 0.4s" tone="profit" />

      {/* ---------------- ambience ---------------- */}
      <g transform="translate(60 120)">
        <g className="hp3-float--deep hp3-float">
          <Box x={0} y={0} z={0} w={18} d={18} h={18} f="var(--surface-raised)" />
        </g>
      </g>
      <g transform="translate(336 62)">
        <g className="hp3-float" style={{ animationDelay: "1.6s" }}>
          <Box x={0} y={0} z={0} w={12} d={12} h={12} f="color-mix(in srgb, var(--volt-500) 26%, var(--surface-3))" />
        </g>
      </g>
      <Beacon x={60} y={332} r={3} tone="var(--hp3-pulse)" delay="1.2s" />

      {/* ---------------- the journey spark ---------------- */}
      <Spark path={FLOW_PATH} dur={7} />
      <Spark path={FLOW_PATH} dur={7} delay={3.5} r={2.5} />

    </Scene>
  );
}
