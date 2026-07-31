import * as React from "react";
import { Beacon, Box, Chip, chipW, Core, Gate, GShadow, Shield, Spark, TopGrid, iso } from "./iso";

/* =========================================================================
 * Contextual brand art — server-safe dimensional SVG scenes, zero client JS.
 *
 * One drawing system for the whole site (art.css + iso.tsx):
 *   solids → extruded, three-face shading (works in both themes)
 *   labels → flat JetBrains chips floating over the scene
 *   volt   → the money path · pulse → AI only · profit/loss → markets only
 *
 * The SVG itself is decorative — aria-hidden, never load-bearing for meaning.
 * The scene's one-line thesis is NOT: it ships as a real <figcaption> beside
 * the drawing. It used to be an 8.5-unit <text> inside the aria-hidden svg,
 * which rendered around 6.6 CSS px and was invisible to assistive tech and to
 * crawlers alike. As HTML it inherits the site type scale and stays readable.
 * ======================================================================= */

type ArtProps = Omit<React.SVGProps<SVGSVGElement>, "viewBox" | "children">;

/** A scene: the decorative drawing plus its readable caption. Layout props
 *  (className/style) land on the <figure> so callers keep sizing the block;
 *  `artClassName` reaches the <svg> for scene-specific paint (shadows, aura). */
export function Scene({
  viewBox,
  caption,
  artClassName,
  className,
  style,
  children,
  ...rest
}: ArtProps & {
  viewBox: string;
  caption: string;
  artClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className={["hp-artfig", className].filter(Boolean).join(" ")} style={style}>
      <svg
        viewBox={viewBox}
        className={["hp-art", artClassName].filter(Boolean).join(" ")}
        aria-hidden
        focusable={false}
        {...rest}
      >
        {children}
      </svg>
      <figcaption className="hp-artfig-cap">{caption}</figcaption>
    </figure>
  );
}

/* ---------- GateArt — the early-access journey: queue → gate → platform ---------- */
export function GateArt(props: ArtProps) {
  const { className, ...rest } = props;
  return (
    <Scene
      {...rest}
      className={className}
      viewBox="0 0 560 260"
      caption="Invites roll out in cohorts — your place in the queue is numbered."
    >
      <GShadow cx={105} cy={232} rx={80} ry={11} opacity={0.7} />
      <GShadow cx={285} cy={218} rx={72} ry={11} opacity={0.8} />
      <GShadow cx={440} cy={228} rx={68} ry={10} opacity={0.7} />

      {/* journey beams (behind the solids) */}
      <path className="hp3-beam" d="M174 205 L258 158" />
      <path className="hp3-beam" d="M316 188 L373 162" />

      {/* the queue — you are the lit block */}
      <g transform="translate(70 150)">
        <Box x={0} y={0} z={0} w={120} d={40} h={10} f="var(--surface-3)" />
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} x={10 + i * 24} y={14} z={10} w={12} d={12} h={8} f="var(--surface-raised)" />
        ))}
        <Box x={104} y={12} z={10} w={14} d={14} h={14} f="var(--volt-500)" />
      </g>
      <Beacon x={150} y={186} r={3} />
      <Chip cx={150} cy={156} label="YOU" tone="volt" size="sm" />

      {/* the cohort gate */}
      <g transform="translate(240 140)">
        <Gate f="var(--surface-raised)" />
      </g>
      <Chip cx={285} cy={46} label="COHORT GATE" />

      {/* beyond the gate — the platform skyline */}
      <g transform="translate(408 150)">
        <Box x={0} y={0} z={0} w={110} d={40} h={8} f="var(--surface-3)" />
        <Box x={6} y={6} z={8} w={26} d={22} h={30} f="var(--surface-raised)" />
        <Box x={40} y={10} z={8} w={26} d={22} h={52} f="var(--surface-raised)" />
        <Box x={74} y={14} z={8} w={26} d={22} h={74} f="var(--surface-raised)" rim="color-mix(in srgb, var(--volt-500) 65%, transparent)" />
      </g>
      <Beacon x={462} y={118} r={3.5} />
      <Chip cx={440} cy={92} label="THE PLATFORM" tone="ghost" size="sm" />

      <Spark path="M66 150 L148 197 L258 158 L316 188 L373 162 L462 120" dur={6} />
    </Scene>
  );
}

/* ---------- SignalArt — a dimensional chart, the model firing a brief ---------- */
export function SignalArt(props: ArtProps) {
  const { className, ...rest } = props;
  /* candles: [worldX, height, up?] */
  const candles: Array<[number, number, boolean]> = [
    [10, 30, false],
    [40, 48, true],
    [70, 38, false],
    [100, 64, true],
    [130, 84, true],
  ];
  const tops = candles.map(([x, h]) => {
    const [sx, sy] = iso(x + 9, 45, 12 + h + 6);
    return [sx + 150, sy + 120] as [number, number];
  });
  const line = [...tops, [280, 96], [318, 88]] as Array<[number, number]>;
  return (
    <Scene
      {...rest}
      className={className}
      viewBox="0 0 560 260"
      caption="Entry · stop · target · reasoning — on every brief"
    >
      <GShadow cx={175} cy={250} rx={112} ry={10} opacity={0.75} />

      <g transform="translate(150 120)">
        <Box x={0} y={0} z={0} w={170} d={84} h={12} f="var(--surface-3)" />
        <TopGrid x={0} y={0} z={12} w={170} d={84} step={25} />
        {candles.map(([x, h, up]) => {
          const tone = up ? "var(--profit-500)" : "var(--loss-500)";
          const [wx, wy] = iso(x + 9, 45, 12 + h);
          return (
            <g key={x}>
              <line x1={wx} y1={wy} x2={wx} y2={wy - 10} stroke={tone} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
              <Box x={x} y={36} z={12} w={18} d={18} h={h} f={tone} />
            </g>
          );
        })}
      </g>
      <polyline
        points={line.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke="var(--hp3-volt)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hp3-draw"
        style={{ "--len": 280, filter: "drop-shadow(0 0 5px var(--hp3-glass))" } as React.CSSProperties}
      />

      {/* the model fires */}
      <Core cx={338} cy={84} s={0.8} />
      <path className="hp3-beam hp3-beam--pulse" d="M356 84 L362 84" />
      <g className="hp3-card">
        <g className="hp3-float" style={{ animationDelay: "0.7s" }}>
          <rect className="hp3-card-bg" x="364" y="46" width="196" height="88" rx="12" />
          <text x="380" y="76" className="hp-art-mono hp-art-mono--lg hp-art-mono--hi">LONG · EURUSD</text>
          <text x="380" y="98" className="hp-art-mono hp-art-mono--xs hp-art-mono--pulse">CONF 0.82 · PASS</text>
          <text x="380" y="118" className="hp-art-mono hp-art-mono--xs">REASONING ATTACHED</text>
        </g>
      </g>

      {/* the levels every brief ships with */}
      <Chip cx={452} cy={162} label="ENTRY 1.0904" tone="volt" />
      <Chip cx={452} cy={192} label="STOP 1.0878" tone="loss" />
      <Chip cx={452} cy={222} label="TARGET 1.0952" tone="profit" />

      <Spark path="M127 104 L153 101 L179 126 L205 115 L231 110 L318 88 L386 84" dur={5} />
    </Scene>
  );
}

/* ---------- GuardArt — orders meet the gate; one passes, one bounces ---------- */
export function GuardArt(props: ArtProps) {
  const { className, ...rest } = props;
  return (
    <Scene
      {...rest}
      className={className}
      viewBox="0 0 560 260"
      caption="Nine rules · any veto blocks the order · fail-closed"
    >
      <GShadow cx={275} cy={226} rx={80} ry={12} opacity={0.8} />
      <GShadow cx={157} cy={234} rx={24} ry={5} opacity={0.7} />

      {/* rails (behind the gate) */}
      <path className="hp3-beam" d="M28 184 L238 163" />
      <path className="hp3-beam" d="M312 196 L452 176 L530 176" />
      <path className="hp3-beam hp3-beam--loss" d="M206 168 C238 182 238 204 208 216" opacity="0.8" />

      {/* incoming order riding the rail */}
      <g transform="translate(120 152)">
        <g className="hp3-float" style={{ animationDelay: "0.4s" }}>
          <Box x={0} y={0} z={0} w={16} d={16} h={12} f="var(--volt-500)" />
        </g>
      </g>
      <Chip cx={120} cy={132} label="RISK 0.8%" tone="volt" size="sm" />

      {/* the gate */}
      <g transform="translate(230 148)">
        <Gate f="var(--surface-raised)" />
      </g>
      <Chip cx={275} cy={54} label="TRADE GUARD" tone="volt" />

      {/* passed */}
      <Beacon x={536} y={176} r={3} tone="var(--profit-400)" />
      <Chip cx={452} cy={150} label="PASSED → FILLED" tone="profit" />

      {/* blocked */}
      <g transform="translate(150 216)">
        <Box x={0} y={0} z={0} w={14} d={14} h={10} f="var(--loss-500)" />
      </g>
      <g stroke="var(--loss-400)" strokeWidth="2.4" strokeLinecap="round">
        <line x1="162" y1="204" x2="174" y2="216" />
        <line x1="174" y1="204" x2="162" y2="216" />
      </g>
      <Chip cx={120} cy={246} label="2.4% · BLOCKED" tone="loss" size="sm" />

      <Spark path="M28 184 L238 163 L275 178 L312 196 L452 176 L530 176" dur={5.5} />
    </Scene>
  );
}

/* ---------- RailArt — one decision executes on your brokers, keys stay yours ---------- */
export function RailArt(props: ArtProps) {
  const { className, ...rest } = props;
  const towers: Array<{ tx: number; ty: number; h: number; label: string }> = [
    { tx: 372, ty: 128, h: 66, label: "MT5" },
    { tx: 450, ty: 164, h: 50, label: "BINANCE" },
    { tx: 520, ty: 200, h: 58, label: "KUCOIN" },
  ];
  return (
    <Scene
      {...rest}
      className={className}
      viewBox="0 0 560 260"
      caption="One decision · every connected broker · trade-scope keys only"
    >
      <GShadow cx={233} cy={208} rx={42} ry={8} opacity={0.75} />
      {towers.map(({ tx, ty }) => (
        <GShadow key={tx} cx={tx + 7} cy={ty + 44} rx={38} ry={7} opacity={0.7} />
      ))}

      {/* rails (behind the solids) */}
      <path className="hp3-beam hp3-beam--pulse" d="M208 130 L226 142" />
      {towers.map(({ tx, ty }) => (
        <path key={tx} className="hp3-beam" d={`M244 148 L${tx - 31} ${ty + 18}`} />
      ))}

      {/* the signal */}
      <g className="hp3-card">
        <g className="hp3-float" style={{ animationDelay: "0.5s" }}>
          <rect className="hp3-card-bg" x="24" y="88" width="184" height="82" rx="12" />
          <text x="40" y="114" className="hp-art-mono hp-art-mono--sm hp-art-mono--pulse">SIGNAL</text>
          <text x="40" y="138" className="hp-art-mono hp-art-mono--lg hp-art-mono--hi">LONG · EURUSD</text>
          <text x="40" y="158" className="hp-art-mono hp-art-mono--xs">quant-ml-v1</text>
        </g>
      </g>
      <Chip cx={100} cy={48} label="KEYS STAY YOURS" tone="volt" size="sm" />

      {/* the guard check */}
      <g transform="translate(230 160)">
        <Box x={0} y={0} z={0} w={44} d={36} h={16} f="var(--surface-raised)" rim="color-mix(in srgb, var(--volt-500) 65%, transparent)" />
      </g>
      <Shield cx={233} cy={146} s={0.9} />
      <Chip cx={233} cy={224} label="GUARD CHECK" tone="ghost" size="sm" />

      {/* broker towers */}
      {towers.map(({ tx, ty, h, label }, i) => {
        const [bx, by] = iso(22, 18, h);
        return (
          <g key={label}>
            <g transform={`translate(${tx} ${ty})`}>
              <Box x={0} y={0} z={0} w={44} d={36} h={h} f="var(--surface-3)" />
            </g>
            <Beacon x={tx + bx} y={ty + by - 4} r={3} tone="var(--profit-400)" delay={`${i * 0.5}s`} />
            <Chip cx={tx + 4} cy={ty + by - 26} label={label} size="sm" />
          </g>
        );
      })}

      {towers.map(({ tx, ty }, i) => (
        <Spark key={tx} path={`M208 130 L226 142 L244 148 L${tx - 31} ${ty + 18}`} dur={4.5} delay={i * 1.4} />
      ))}
    </Scene>
  );
}

/* ---------- PathArt — the academy track: four steps up to live ---------- */
export function PathArt(props: ArtProps) {
  const { className, ...rest } = props;
  const steps: Array<{ label: string; volt?: boolean }> = [
    { label: "01 · PIPS" },
    { label: "02 · RISK" },
    { label: "03 · PAPER" },
    { label: "04 · LIVE", volt: true },
  ];
  /* label anchors ride the ridge — above each step's back edge, where no
     taller neighbor can occlude them (cluster at 120,100) */
  const anchors = steps.map((_, i) => {
    const [sx, sy] = iso(i * 60 + 8, 4, 22 + i * 36);
    return { cx: sx + 120, y: sy + 100 };
  });
  return (
    <Scene
      {...rest}
      className={className}
      viewBox="0 0 560 260"
      caption="Pips → risk → paper → live. Four levels, then you are trading."
    >
      <GShadow cx={190} cy={252} rx={150} ry={8} opacity={0.75} />

      <g transform="translate(120 100)">
        {steps.map(({ volt }, i) => (
          <Box
            key={i}
            x={i * 60}
            y={0}
            z={0}
            w={60}
            d={64}
            h={22 + i * 36}
            f={i % 2 ? "var(--surface-raised)" : "var(--surface-3)"}
            rim={volt ? "color-mix(in srgb, var(--volt-500) 65%, transparent)" : undefined}
          />
        ))}
        {/* the climber — on step 03 */}
        <Box x={142} y={24} z={94} w={14} d={14} h={12} f="var(--volt-500)" />
      </g>

      {anchors.map(({ cx, y }, i) =>
        steps[i].volt ? (
          <Chip key={i} cx={cx + 10} cy={y - 26} label={steps[i].label} tone="volt" size="sm" />
        ) : (
          <g key={i}>
            <text x={cx} y={y - 24} textAnchor="middle" className="hp-art-mono hp-art-mono--lg hp-art-mono--hi">
              {steps[i].label.slice(0, 2)}
            </text>
            <text x={cx} y={y - 8} textAnchor="middle" className="hp-art-mono hp-art-mono--xs">
              {steps[i].label.slice(5)}
            </text>
          </g>
        ),
      )}
      <Beacon x={274} y={91} r={3.5} />

      {/* ambience. The "PIPS → RISK → PAPER → LIVE" chip that used to sit here
          is gone: it repeated the figcaption word for word, and at 306 units it
          was the widest object in a 560-unit scene — it clipped the viewBox from
          561px up. Long strings belong in the caption, not in a chip. */}
      <g transform="translate(500 84)">
        <g className="hp3-float" style={{ animationDelay: "1s" }}>
          <Box x={0} y={0} z={0} w={14} d={14} h={14} f="var(--surface-raised)" />
        </g>
      </g>

      {/* XP meter */}
      <rect x="120" y="236" width="320" height="8" rx="4" fill="var(--border-1)" />
      <rect x="120" y="236" width="200" height="8" rx="4" fill="var(--volt-500)" />
      <Beacon x={320} y={240} r={3} />
      <text x="452" y="245" className="hp-art-mono hp-art-mono--sm">XP</text>
    </Scene>
  );
}

/* ---------- SeatsArt — 500 lifetime seats as a filling floor ---------- */
export function SeatsArt(props: ArtProps) {
  const { className, ...rest } = props;
  const cols = 10;
  const rows = 5;
  const filled = 34; /* of 50 tiles — illustrative, the live meter is data-driven */
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  return (
    <Scene
      {...rest}
      className={className}
      viewBox="0 0 560 240"
      caption="One tile = 10 seats · lifetime · one time"
    >
      <GShadow cx={215} cy={226} rx={128} ry={9} opacity={0.75} />

      <g transform="translate(160 60)">
        <Box x={0} y={0} z={0} w={216} d={116} h={12} f="var(--surface-3)" />
        {cells.map((i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const x = 10 + c * 20;
          const y = 10 + r * 20;
          if (i === filled) {
            /* the next open seat — yours */
            return <Box key={i} x={x} y={y} z={12} w={16} d={16} h={26} f="var(--volt-500)" />;
          }
          if (i < filled) {
            return <Box key={i} x={x} y={y} z={12} w={16} d={16} h={5} f="color-mix(in srgb, var(--volt-500) 45%, var(--surface-3))" />;
          }
          return (
            <polygon
              key={i}
              points={[iso(x, y, 12), iso(x + 16, y, 12), iso(x + 16, y + 16, 12), iso(x, y + 16, 12)]
                .map((p) => p.join(","))
                .join(" ")}
              fill="none"
              stroke="var(--border-2)"
              strokeWidth="1"
            />
          );
        })}
      </g>
      <Beacon x={177} y={106} r={4} />
      <Chip cx={177} cy={84} label="YOUR SEAT" tone="volt" size="sm" />

      <Chip cx={105} cy={30} label="500 SEATS · EVER" />

      {/* the offer, at a glance */}
      <g className="hp3-card">
        <g className="hp3-float" style={{ animationDelay: "0.8s" }}>
          <rect className="hp3-card-bg" x="368" y="96" width="188" height="88" rx="12" />
          <text x="384" y="122" className="hp-art-mono hp-art-mono--sm hp-art-mono--volt">FOUNDING HERO</text>
          <text x="384" y="146" className="hp-art-mono hp-art-mono--md hp-art-mono--hi">LIFETIME · PRO</text>
          <text x="384" y="168" className="hp-art-mono hp-art-mono--xs">PAID ONCE · DAY-0</text>
        </g>
      </g>
      <g transform="translate(470 202)">
        <g className="hp3-float" style={{ animationDelay: "1.4s" }}>
          <Box x={0} y={0} z={0} w={14} d={14} h={14} f="color-mix(in srgb, var(--volt-500) 26%, var(--surface-3))" />
        </g>
      </g>

    </Scene>
  );
}

/* ---------- NetworkArt — referral levels, commissions flow up to you ---------- */
export function NetworkArt(props: ArtProps) {
  const { className, ...rest } = props;
  const l1: Array<[number, number]> = [
    [120, 140],
    [252, 156],
    [384, 140],
  ];
  const l2: Array<[number, number]> = [
    [80, 216],
    [200, 224],
    [320, 224],
    [440, 216],
  ];
  const l2edges: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
    [2, 2],
    [3, 2],
  ];
  return (
    <Scene
      {...rest}
      className={className}
      viewBox="0 0 560 260"
      caption="Commissions up to 10 levels · transparent ledger"
    >
      <GShadow cx={256} cy={102} rx={42} ry={7} opacity={0.75} />
      {l1.map(([x, y]) => (
        <GShadow key={x} cx={x + 5} cy={y + 22} rx={30} ry={5} opacity={0.65} />
      ))}

      {/* connections — commissions flow toward you */}
      {l2edges.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          x1={l2[from][0]}
          y1={l2[from][1]}
          x2={l1[to][0] + 3}
          y2={l1[to][1] - 8}
          className="hp3-wire"
          strokeDasharray="3 5"
          opacity="0.7"
        />
      ))}
      {l1.map(([x, y]) => (
        <path key={x} className="hp3-beam" d={`M${x + 3} ${y - 10} L256 96`} />
      ))}

      {/* level-2 members */}
      {l2.map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r={4.5} fill="none" stroke="var(--border-3)" strokeWidth="1.5" />
      ))}

      {/* level-1 members on pedestals */}
      {l1.map(([x, y]) => (
        <g key={x}>
          <g transform={`translate(${x} ${y})`}>
            <Box x={0} y={0} z={0} w={32} d={26} h={10} f="var(--surface-3)" />
          </g>
          <circle cx={x + 3} cy={y - 9} r={6.5} fill="var(--surface-raised)" stroke="var(--border-3)" strokeWidth="1.5" />
        </g>
      ))}

      {/* you */}
      <g transform="translate(252 64)">
        <Box x={0} y={0} z={0} w={40} d={32} h={12} f="var(--surface-raised)" rim="color-mix(in srgb, var(--volt-500) 65%, transparent)" />
      </g>
      <Beacon x={256} y={52} r={6} />
      <Chip cx={256} cy={24} label="YOU" tone="volt" size="sm" />

      <Chip cx={44} cy={134} label="L1" tone="ghost" size="sm" />
      <Chip cx={44} cy={218} label="L2" tone="ghost" size="sm" />
      <Chip cx={500} cy={218} label="→ L10" tone="ghost" size="sm" />

      <Spark path="M200 224 L123 132 L256 96" dur={4} r={3} />
      <Spark path="M320 224 L387 132 L256 96" dur={4} delay={2} r={3} />
    </Scene>
  );
}

/* ---------- LostArt — 404: the route ran off the chart ---------- */
export function LostArt(props: ArtProps) {
  const { className, ...rest } = props;
  return (
    <Scene {...rest} className={className} viewBox="0 0 560 220" caption="The route ran off the chart.">
      <text x="400" y="158" fontSize="120" textAnchor="middle" className="hp3-ghost">404</text>
      <GShadow cx={165} cy={208} rx={118} ry={11} opacity={0.75} />

      <g transform="translate(140 84)">
        <Box x={0} y={0} z={0} w={180} d={72} h={12} f="var(--surface-3)" />
        <TopGrid x={0} y={0} z={12} w={180} d={72} step={24} />
      </g>

      {/* the route — printed on the slab, lost beyond its edge */}
      <polyline
        points="100,108 138,118 168,104 205,130 245,122 284,152"
        fill="none"
        stroke="var(--hp3-volt)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hp3-draw"
        style={{ "--len": 240, filter: "drop-shadow(0 0 5px var(--hp3-glass))" } as React.CSSProperties}
      />
      <path
        d="M284 152 C 320 140, 356 148, 392 172 L 428 190"
        fill="none"
        stroke="var(--loss-400)"
        strokeWidth="2"
        strokeDasharray="4 7"
        strokeLinecap="round"
        opacity="0.85"
      />
      <Beacon x={430} y={191} r={3} tone="var(--loss-400)" />
      <Chip cx={390} cy={118} label="OFF-CHART" tone="loss" size="sm" />

      {/* debris where the slab ends */}
      <g transform="translate(330 156)">
        <g className="hp3-float" style={{ animationDelay: "0.3s" }}>
          <Box x={0} y={0} z={0} w={14} d={14} h={12} f="var(--surface-raised)" />
        </g>
      </g>
      <g transform="translate(360 186)" opacity="0.75">
        <g className="hp3-float--deep hp3-float">
          <Box x={0} y={0} z={0} w={9} d={9} h={8} f="var(--surface-raised)" />
        </g>
      </g>
      <g transform="translate(312 196)" opacity="0.55">
        <g className="hp3-float" style={{ animationDelay: "1.4s" }}>
          <Box x={0} y={0} z={0} w={7} d={7} h={6} f="var(--surface-raised)" />
        </g>
      </g>
    </Scene>
  );
}

/* ---------- StackArt — the platform, end to end ---------- */
export function StackArt(props: ArtProps) {
  const { className, ...rest } = props;
  const layers: Array<{ k: number; label: string; tone?: "pulse" | "volt" }> = [
    { k: 3, label: "01 · QUANT DATA" },
    { k: 2, label: "02 · ML MODEL", tone: "pulse" },
    { k: 1, label: "03 · TRADE GUARD", tone: "volt" },
    { k: 0, label: "04 · YOUR BROKER" },
  ];
  return (
    <Scene
      {...rest}
      className={className}
      viewBox="0 0 560 300"
      caption="Quant data → ML model → Trade Guard → your broker. One stack, end to end."
    >
      <GShadow cx={200} cy={290} rx={118} ry={10} opacity={0.8} />


      {[0, 1, 2, 3].map((k) => {
        const z = k * 46;
        const tone = k === 2 ? "var(--pulse-500)" : k === 1 ? "var(--volt-500)" : null;
        return (
          <g key={k}>
            <Box x={0} y={0} z={z} w={130} d={130} h={14} f="var(--surface-3)" transform="translate(200 158)" />
            {tone ? (
              <Box
                x={12}
                y={12}
                z={z + 14}
                w={106}
                d={106}
                h={4}
                f={`color-mix(in srgb, ${tone} 38%, var(--surface-3))`}
                transform="translate(200 158)"
              />
            ) : null}
          </g>
        );
      })}
      <Beacon x={200} y={62} r={3.5} tone="var(--hp3-pulse)" />
      <Beacon x={200} y={270} r={3.5} tone="var(--profit-400)" delay="1s" />

      {/* layer labels */}
      {layers.map(({ k, label, tone }) => {
        const y = 209 - k * 46;
        return (
          <g key={label}>
            <line x1={313} y1={y} x2={348} y2={y} className="hp3-wire" strokeDasharray="2 4" />
            {/* chip is centered, so offset by half its own measured width —
                never a hand-tuned magic number that drifts with the scale */}
            <Chip cx={352 + Math.round(chipW(label) / 2)} cy={y} label={label} tone={tone ?? "ghost"} />
          </g>
        );
      })}
    </Scene>
  );
}
