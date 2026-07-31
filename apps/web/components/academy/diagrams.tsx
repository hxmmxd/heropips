/* =========================================================================
 * Academy diagrams — one crisp, theme-aware inline SVG per FigureKind.
 * Server component: pure markup, zero JS shipped. Every drawing is
 * viewBox-based (fluid width, height auto via .ac-figure CSS), colored
 * ONLY with design tokens so it reads in both light and dark themes.
 * Design rule: each figure teaches exactly ONE idea at a glance; every label
 * is >= TXT_MIN viewBox units in the 560-wide stage. .ac-figure-stage never
 * renders the stage below 338px, so the measured floor is 12.1 CSS px.
 * ======================================================================= */

import type { ReactElement, ReactNode } from "react";
import type { FigureKind } from "@/lib/academy/curriculum";

/* ---------- palette + type (tokens only) ---------- */

const HI = "var(--text-hi)";
const MID = "var(--text-mid)";
const LOW = "var(--text-low)";
const B1 = "var(--border-1)";
const B2 = "var(--border-2)";
const B3 = "var(--border-3)";
const S2 = "var(--surface-2)";
const S3 = "var(--surface-3)";
const VOLT = "var(--volt-400)";
const VOLT5 = "var(--volt-500)";
const VOLT_TINT = "var(--volt-tint)";
const PRO = "var(--profit-400)";
const PRO5 = "var(--profit-500)";
const PRO_TINT = "var(--profit-tint)";
const LOSS = "var(--loss-400)";
const LOSS5 = "var(--loss-500)";
const LOSS_TINT = "var(--loss-tint)";
const WARN = "var(--warn-400)";
const WARN_TINT = "var(--warn-tint)";
const PULSE = "var(--pulse-300)";
const FB = "var(--font-body)";
const FM = "var(--font-mono)";

const W = 560;

/**
 * Type floor in viewBox units. 20 units across a 560-unit stage rendered at
 * the .ac-figure-stage minimum of 338px is 12.1 CSS px; anything smaller drops
 * under the legibility floor on a phone, so `size` is clamped up to this.
 */
const TXT_MIN = 20;

/* ---------- tiny drawing helpers ---------- */

function Txt({
  x,
  y,
  children,
  fill = MID,
  size = TXT_MIN,
  mono = false,
  anchor = "start",
  bold = false,
}: {
  x: number;
  y: number;
  children: ReactNode;
  fill?: string;
  size?: number;
  mono?: boolean;
  anchor?: "start" | "middle" | "end";
  bold?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={Math.max(size, TXT_MIN)}
      textAnchor={anchor}
      fontFamily={mono ? FM : FB}
      fontWeight={bold ? 600 : 400}
    >
      {children}
    </text>
  );
}

/** Straight arrow with a computed triangular head — no <marker> ids needed. */
function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = LOW,
  width = 2,
  dash,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  dash?: string;
}) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const s = 8;
  const wing = (off: number) =>
    `${(x2 - s * Math.cos(a + off)).toFixed(1)},${(y2 - s * Math.sin(a + off)).toFixed(1)}`;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeDasharray={dash} />
      <polygon points={`${x2},${y2} ${wing(0.45)} ${wing(-0.45)}`} fill={color} />
    </g>
  );
}

/** Rounded box with a centered main label and optional sub-label. */
function Box({
  x,
  y,
  w,
  h,
  label,
  sub,
  fill = S2,
  stroke = B2,
  color = HI,
  mono = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  fill?: string;
  stroke?: string;
  color?: string;
  mono?: boolean;
}) {
  const cx = x + w / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <Txt x={cx} y={sub ? y + h / 2 - 4 : y + h / 2 + 7} anchor="middle" fill={color} bold mono={mono}>
        {label}
      </Txt>
      {sub ? (
        <Txt x={cx} y={y + h / 2 + 19} anchor="middle" fill={MID} size={19}>
          {sub}
        </Txt>
      ) : null}
    </g>
  );
}

/**
 * `role="img"` collapses the figure to one node, so the <text> labels inside
 * are never read out piecemeal. `<title>` supplies the accessible name and
 * `aria-label` repeats it — Safari/VoiceOver has historically skipped a bare
 * SVG <title>, and every figure also ships a visible <figcaption> below.
 */
function Frame({ title, h, children }: { title: string; h: number; children: ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${h}`}
      role="img"
      aria-label={title}
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/* ---------- the 20 figures ---------- */

function SpreadAnatomy() {
  return (
    <Frame title="The spread: you buy at the ask, sell at the bid, and the gap is the toll" h={190}>
      <rect x={40} y={78} width={480} height={64} fill={VOLT_TINT} />
      <line x1={40} y1={78} x2={520} y2={78} stroke={HI} strokeWidth={2.5} />
      <line x1={40} y1={142} x2={520} y2={142} stroke={HI} strokeWidth={2.5} />
      <Txt x={40} y={66}>you buy at this price</Txt>
      <Txt x={520} y={66} anchor="end" fill={HI} mono bold>ASK 1.0851</Txt>
      <Txt x={40} y={168}>you sell at this price</Txt>
      <Txt x={520} y={168} anchor="end" fill={HI} mono bold>BID 1.0850</Txt>
      <Txt x={280} y={104} anchor="middle" fill={VOLT} size={22} mono bold>SPREAD = 1 PIP</Txt>
      <Txt x={280} y={130} anchor="middle">the toll you pay to enter</Txt>
    </Frame>
  );
}

function PipScale() {
  const digits = ["1", ".", "0", "8", "5", "2", "7"];
  const cx = (i: number) => 170 + i * 36;
  return (
    <Frame title="Which digit is the pip: the fourth decimal place, with the pipette one step smaller" h={248}>
      <Txt x={170} y={44} fill={LOW} mono>EUR/USD</Txt>
      <rect x={331} y={60} width={38} height={64} rx={6} fill={VOLT_TINT} stroke={VOLT5} strokeWidth={2} />
      <rect x={369} y={64} width={34} height={56} rx={6} fill="none" stroke={B3} strokeWidth={1.5} strokeDasharray="4 3" />
      {digits.map((d, i) => (
        <Txt
          key={i}
          x={cx(i)}
          y={112}
          anchor="middle"
          size={56}
          mono
          bold
          fill={i === 5 ? VOLT : i === 6 ? LOW : HI}
        >
          {d}
        </Txt>
      ))}
      <Txt x={386} y={48} anchor="middle" fill={LOW} size={19}>pipette = 1/10 pip</Txt>
      <Arrow x1={350} y1={168} x2={350} y2={132} color={VOLT5} />
      <Txt x={350} y={196} anchor="middle" fill={VOLT} bold>the pip — 4th decimal place</Txt>
      <Txt x={280} y={234} anchor="middle" size={19}>on USD/JPY the pip is the 2nd decimal (154.32)</Txt>
    </Frame>
  );
}

function CandleAnatomyFig() {
  return (
    <Frame title="Two candles labeled with open, high, low and close: green closed up, red closed down" h={312}>
      {/* bull candle */}
      <line x1={170} y1={40} x2={170} y2={90} stroke={PRO5} strokeWidth={3} />
      <line x1={170} y1={230} x2={170} y2={268} stroke={PRO5} strokeWidth={3} />
      <rect x={146} y={90} width={48} height={140} rx={3} fill={PRO5} />
      <line x1={136} y1={42} x2={166} y2={42} stroke={LOW} strokeWidth={1} />
      <line x1={132} y1={90} x2={144} y2={90} stroke={LOW} strokeWidth={1} />
      <line x1={132} y1={230} x2={144} y2={230} stroke={LOW} strokeWidth={1} />
      <line x1={136} y1={266} x2={166} y2={266} stroke={LOW} strokeWidth={1} />
      <Txt x={128} y={48} anchor="end">high</Txt>
      <Txt x={128} y={96} anchor="end">close</Txt>
      <Txt x={128} y={236} anchor="end">open</Txt>
      <Txt x={128} y={272} anchor="end">low</Txt>
      <Txt x={170} y={298} anchor="middle" fill={PRO} bold>buyers won</Txt>
      {/* bear candle */}
      <line x1={390} y1={55} x2={390} y2={100} stroke={LOSS5} strokeWidth={3} />
      <line x1={390} y1={220} x2={390} y2={262} stroke={LOSS5} strokeWidth={3} />
      <rect x={366} y={100} width={48} height={120} rx={3} fill={LOSS5} />
      <line x1={394} y1={57} x2={424} y2={57} stroke={LOW} strokeWidth={1} />
      <line x1={416} y1={100} x2={428} y2={100} stroke={LOW} strokeWidth={1} />
      <line x1={416} y1={220} x2={428} y2={220} stroke={LOW} strokeWidth={1} />
      <line x1={394} y1={260} x2={424} y2={260} stroke={LOW} strokeWidth={1} />
      <Txt x={432} y={63}>high</Txt>
      <Txt x={432} y={106}>open</Txt>
      <Txt x={432} y={226}>close</Txt>
      <Txt x={432} y={266}>low</Txt>
      <Txt x={390} y={298} anchor="middle" fill={LOSS} bold>sellers won</Txt>
    </Frame>
  );
}

function TrendStructure() {
  const upPeaks: [number, number, string][] = [[75, 150, "H"], [145, 108, "HH"], [215, 68, "HH"]];
  const upTroughs: [number, number, string][] = [[100, 182, "HL"], [170, 142, "HL"]];
  const dnPeaks: [number, number, string][] = [[400, 105, "LH"], [470, 148, "LH"]];
  const dnTroughs: [number, number, string][] = [[375, 135, "L"], [445, 175, "LL"], [515, 215, "LL"]];
  return (
    <Frame title="Uptrend making higher highs and higher lows beside a downtrend making lower highs and lower lows" h={250}>
      <Txt x={135} y={34} anchor="middle" fill={PRO} bold>uptrend — HH + HL</Txt>
      <Txt x={415} y={34} anchor="middle" fill={LOSS} bold>downtrend — LH + LL</Txt>
      <line x1={280} y1={44} x2={280} y2={230} stroke={B1} strokeWidth={1.5} />
      <polyline points="30,215 75,150 100,182 145,108 170,142 215,68" fill="none" stroke={PRO5} strokeWidth={3} />
      {upPeaks.map(([x, y, t]) => (
        <g key={`up-${x}`}>
          <circle cx={x} cy={y} r={5} fill={PRO5} />
          <Txt x={x} y={y - 12} anchor="middle" fill={PRO} mono size={19}>{t}</Txt>
        </g>
      ))}
      {upTroughs.map(([x, y, t]) => (
        <g key={`ut-${x}`}>
          <circle cx={x} cy={y} r={5} fill={PRO5} />
          <Txt x={x} y={y + 26} anchor="middle" fill={PRO} mono size={19}>{t}</Txt>
        </g>
      ))}
      <polyline points="330,70 375,135 400,105 445,175 470,148 515,215" fill="none" stroke={LOSS5} strokeWidth={3} />
      {dnPeaks.map(([x, y, t]) => (
        <g key={`dp-${x}`}>
          <circle cx={x} cy={y} r={5} fill={LOSS5} />
          <Txt x={x} y={y - 12} anchor="middle" fill={LOSS} mono size={19}>{t}</Txt>
        </g>
      ))}
      {dnTroughs.map(([x, y, t]) => (
        <g key={`dt-${x}`}>
          <circle cx={x} cy={y} r={5} fill={LOSS5} />
          <Txt x={x} y={y + 26} anchor="middle" fill={LOSS} mono size={19}>{t}</Txt>
        </g>
      ))}
    </Frame>
  );
}

function MarketStructure() {
  return (
    <Frame title="A break of structure through a prior high, then a liquidity sweep that pokes a high and rejects" h={260}>
      <polyline
        points="30,235 70,175 120,150 160,190 210,118 255,148 300,95 340,125 390,60 420,135 470,180 510,160"
        fill="none"
        stroke={HI}
        strokeWidth={2.5}
      />
      {/* break of structure */}
      <line x1={120} y1={150} x2={230} y2={150} stroke={B3} strokeWidth={1.5} strokeDasharray="5 4" />
      <Txt x={122} y={140} fill={LOW} size={19}>prior high</Txt>
      <circle cx={192} cy={150} r={7} fill="none" stroke={VOLT5} strokeWidth={2.5} />
      <Txt x={205} y={92} anchor="middle" fill={VOLT} bold>break of structure</Txt>
      {/* sweep */}
      <line x1={300} y1={95} x2={460} y2={95} stroke={B3} strokeWidth={1.5} strokeDasharray="5 4" />
      <Txt x={456} y={116} anchor="end" fill={LOW} size={19}>the high everyone sees</Txt>
      <circle cx={390} cy={62} r={7} fill="none" stroke={LOSS5} strokeWidth={2.5} />
      <Txt x={390} y={36} anchor="middle" fill={LOSS} bold>sweep — poke and reject</Txt>
    </Frame>
  );
}

function SupportResistance() {
  return (
    <Frame title="Price bounces off support twice, breaks it, then retests the same level as resistance" h={272}>
      <line x1={30} y1={165} x2={530} y2={165} stroke={B3} strokeWidth={2} />
      {/* Right end of the level: at x=34 the price line crossed the glyphs and
          the first bounce marker sat on top of them. */}
      <Txt x={526} y={158} anchor="end" fill={LOW} size={19}>support</Txt>
      <polyline
        points="40,60 90,157 135,95 190,157 240,105 285,160 320,235 365,200 405,168 450,240 490,250"
        fill="none"
        stroke={HI}
        strokeWidth={2.5}
      />
      <circle cx={90} cy={160} r={6} fill={PRO5} />
      <circle cx={190} cy={160} r={6} fill={PRO5} />
      <Txt x={90} y={192} anchor="middle" fill={PRO} size={19}>bounce</Txt>
      <Txt x={190} y={192} anchor="middle" fill={PRO} size={19}>bounce</Txt>
      <circle cx={289} cy={168} r={6} fill={LOSS5} />
      <Txt x={320} y={140} anchor="middle" fill={LOSS} size={19}>break</Txt>
      <circle cx={405} cy={168} r={6} fill="none" stroke={WARN} strokeWidth={2.5} />
      <Txt x={430} y={132} anchor="middle" fill={WARN} size={19}>retest from below</Txt>
      <Txt x={280} y={264} anchor="middle">support, once broken, becomes resistance</Txt>
    </Frame>
  );
}

function SupplyDemand() {
  return (
    <Frame title="Price reacting inside a supply zone above and a demand zone below: zones are areas, not lines" h={258}>
      <rect x={40} y={42} width={480} height={44} fill={LOSS_TINT} stroke={LOSS5} strokeWidth={1.5} strokeDasharray="5 4" />
      <Txt x={52} y={70} fill={LOSS} size={19}>supply zone — sellers left orders here</Txt>
      <rect x={40} y={178} width={480} height={44} fill={PRO_TINT} stroke={PRO5} strokeWidth={1.5} strokeDasharray="5 4" />
      <Txt x={52} y={206} fill={PRO} size={19}>demand zone — buyers left orders here</Txt>
      <polyline
        points="60,150 100,205 155,120 200,60 255,145 305,205 360,90 400,58 445,150 490,205 520,170"
        fill="none"
        stroke={HI}
        strokeWidth={2.5}
      />
      <Txt x={280} y={248} anchor="middle">zones are areas, not lines — price reacts inside them</Txt>
    </Frame>
  );
}

function ChartPatterns() {
  return (
    <Frame title="The three patterns that matter: a range, a flag, and a false break" h={250}>
      <line x1={190} y1={30} x2={190} y2={210} stroke={B1} strokeWidth={1.5} />
      <line x1={370} y1={30} x2={370} y2={210} stroke={B1} strokeWidth={1.5} />
      {/* range */}
      <line x1={30} y1={70} x2={170} y2={70} stroke={B3} strokeWidth={1.5} strokeDasharray="5 4" />
      <line x1={30} y1={150} x2={170} y2={150} stroke={B3} strokeWidth={1.5} strokeDasharray="5 4" />
      <polyline points="30,145 55,75 80,145 105,75 130,145 155,75 170,100" fill="none" stroke={HI} strokeWidth={2} />
      <Txt x={100} y={236} anchor="middle" fill={HI} bold>range</Txt>
      {/* flag */}
      <line x1={215} y1={195} x2={255} y2={70} stroke={HI} strokeWidth={2.5} />
      <line x1={253} y1={65} x2={325} y2={98} stroke={B3} strokeWidth={1.5} strokeDasharray="5 4" />
      <line x1={253} y1={92} x2={325} y2={125} stroke={B3} strokeWidth={1.5} strokeDasharray="5 4" />
      <polyline points="255,72 272,95 288,80 305,103 320,90" fill="none" stroke={HI} strokeWidth={2} />
      <Arrow x1={322} y1={88} x2={347} y2={46} color={VOLT5} width={2.5} />
      <Txt x={280} y={236} anchor="middle" fill={HI} bold>flag</Txt>
      {/* false break */}
      <line x1={390} y1={80} x2={530} y2={80} stroke={B3} strokeWidth={1.5} strokeDasharray="5 4" />
      <line x1={390} y1={155} x2={530} y2={155} stroke={B3} strokeWidth={1.5} strokeDasharray="5 4" />
      <polyline points="390,90 415,145 440,95 465,150 490,175 505,120 525,85" fill="none" stroke={HI} strokeWidth={2} />
      <circle cx={490} cy={173} r={6} fill={LOSS5} />
      <Txt x={490} y={205} anchor="middle" fill={LOSS} size={19}>trap</Txt>
      <Txt x={460} y={236} anchor="middle" fill={HI} bold>false break</Txt>
    </Frame>
  );
}

function RiskReward() {
  return (
    <Frame title="A trade risking 20 pips to make 40: one unit of risk against two units of reward" h={288}>
      <rect x={40} y={60} width={480} height={105} fill={PRO_TINT} />
      <rect x={40} y={165} width={480} height={60} fill={LOSS_TINT} />
      <line x1={40} y1={60} x2={520} y2={60} stroke={PRO5} strokeWidth={2} />
      <line x1={40} y1={165} x2={520} y2={165} stroke={B3} strokeWidth={2} strokeDasharray="6 4" />
      <line x1={40} y1={225} x2={520} y2={225} stroke={LOSS5} strokeWidth={2} />
      <Txt x={514} y={52} anchor="end" fill={PRO} mono>target 1.0890</Txt>
      <Txt x={514} y={157} anchor="end" fill={HI} mono>entry 1.0850</Txt>
      <Txt x={514} y={247} anchor="end" fill={LOSS} mono>stop 1.0830</Txt>
      <Txt x={280} y={118} anchor="middle" fill={PRO} bold>reward: +40 pips = 2R ($20)</Txt>
      <Txt x={280} y={202} anchor="middle" fill={LOSS} bold>risk: −20 pips = 1R ($10)</Txt>
      <Txt x={280} y={276} anchor="middle">at 2R, winning 1 trade in 3 breaks even</Txt>
    </Frame>
  );
}

function PositionSizeMath() {
  return (
    <Frame title="Position sizing flow: 1,000 dollar account, 1 percent risk, 20 pip stop, 0.05 lots" h={370}>
      <Box x={40} y={20} w={360} h={54} label="Account: $1,000" mono />
      <Arrow x1={220} y1={78} x2={220} y2={108} />
      <Txt x={240} y={99}>risk 1% per trade</Txt>
      <Box x={40} y={112} w={360} h={54} label="Max risk: $10" mono />
      <Arrow x1={220} y1={170} x2={220} y2={200} />
      <Txt x={240} y={191}>your stop is 20 pips away</Txt>
      <Box x={40} y={204} w={360} h={54} label="$10 ÷ 20 pips = $0.50 per pip" mono />
      <Arrow x1={220} y1={262} x2={220} y2={292} />
      <Txt x={240} y={283}>round down, never up</Txt>
      <Box x={40} y={296} w={360} h={54} label="Position size: 0.05 lots" mono fill={VOLT_TINT} stroke={VOLT5} />
    </Frame>
  );
}

function LeverageDoubleEdge() {
  const groups: { cx: number; label: string; pct: string; h: number }[] = [
    { cx: 140, label: "1×", pct: "1%", h: 4 },
    { cx: 280, label: "10×", pct: "10%", h: 22 },
    { cx: 420, label: "50×", pct: "50%", h: 110 },
  ];
  const axis = 190;
  return (
    <Frame title="The same one percent market move at 1x, 10x and 50x leverage, mirrored up and down" h={360}>
      <Txt x={280} y={28} anchor="middle">the same 1% price move, three leverage settings</Txt>
      {groups.map((g) => (
        <g key={g.label}>
          <Txt x={g.cx} y={52} anchor="middle" fill={HI} mono bold>{g.label}</Txt>
          <rect x={g.cx - 26} y={axis - g.h} width={52} height={g.h} fill={PRO5} />
          <rect x={g.cx - 26} y={axis} width={52} height={g.h} fill={LOSS5} />
          <Txt x={g.cx} y={axis - g.h - 10} anchor="middle" fill={PRO} mono size={19}>+{g.pct}</Txt>
          <Txt x={g.cx} y={axis + g.h + 24} anchor="middle" fill={LOSS} mono size={19}>−{g.pct}</Txt>
        </g>
      ))}
      <line x1={50} y1={axis} x2={510} y2={axis} stroke={B3} strokeWidth={2} />
      <Txt x={280} y={350} anchor="middle">it multiplies both directions — against you too</Txt>
    </Frame>
  );
}

function SessionClock() {
  const x = (h: number) => 50 + h * 20;
  const rows: { y: number; label: string; spans: [number, number][] }[] = [
    { y: 62, label: "Sydney", spans: [[21, 24], [0, 6]] },
    { y: 100, label: "Tokyo", spans: [[0, 9]] },
    { y: 138, label: "London", spans: [[7, 16]] },
    { y: 176, label: "New York", spans: [[12, 21]] },
  ];
  return (
    <Frame title="The four trading sessions across 24 UTC hours, with the London and New York overlap highlighted" h={256}>
      <line x1={50} y1={52} x2={530} y2={52} stroke={B2} strokeWidth={1.5} />
      {[0, 6, 12, 18, 24].map((h) => (
        <g key={h}>
          <line x1={x(h)} y1={46} x2={x(h)} y2={56} stroke={LOW} strokeWidth={1.5} />
          <Txt x={x(h)} y={36} anchor={h === 24 ? "end" : h === 0 ? "start" : "middle"} fill={LOW} mono size={19}>
            {h === 24 ? "24 UTC" : String(h).padStart(2, "0")}
          </Txt>
        </g>
      ))}
      {rows.map((r) => (
        <g key={r.label}>
          {r.spans.map(([a, b]) => (
            <rect key={a} x={x(a)} y={r.y} width={x(b) - x(a)} height={30} rx={6} fill={S3} stroke={B2} strokeWidth={1} />
          ))}
          <Txt x={x(r.spans[r.spans.length - 1][0]) + 8} y={r.y + 21} fill={HI} size={19}>{r.label}</Txt>
        </g>
      ))}
      <rect x={x(12)} y={132} width={x(16) - x(12)} height={80} fill={VOLT_TINT} stroke={VOLT5} strokeWidth={1.5} strokeDasharray="5 4" />
      <line x1={330} y1={212} x2={330} y2={228} stroke={VOLT5} strokeWidth={1.5} />
      <Txt x={290} y={246} anchor="middle" fill={VOLT} size={19}>London + New York overlap — the busiest four hours</Txt>
    </Frame>
  );
}

function OrderTypes() {
  return (
    <Frame title="Where each order type sits around the current price: stops and limits above and below" h={320}>
      <line x1={40} y1={70} x2={520} y2={70} stroke={B3} strokeWidth={1.5} strokeDasharray="6 4" />
      <line x1={40} y1={250} x2={520} y2={250} stroke={B3} strokeWidth={1.5} strokeDasharray="6 4" />
      <line x1={120} y1={160} x2={120} y2={78} stroke={B2} strokeWidth={1.5} />
      <line x1={440} y1={160} x2={440} y2={78} stroke={B2} strokeWidth={1.5} />
      <line x1={120} y1={160} x2={120} y2={242} stroke={B2} strokeWidth={1.5} />
      <line x1={440} y1={160} x2={440} y2={242} stroke={B2} strokeWidth={1.5} />
      <line x1={40} y1={160} x2={520} y2={160} stroke={HI} strokeWidth={2.5} />
      <Txt x={280} y={150} anchor="middle" fill={HI} mono bold>now: 1.0850</Txt>
      <Txt x={280} y={182} anchor="middle" size={19}>a market order fills here, instantly</Txt>
      <circle cx={120} cy={70} r={7} fill={PRO5} />
      <Txt x={120} y={22} anchor="middle" fill={PRO} bold>buy stop</Txt>
      <Txt x={120} y={46} anchor="middle" size={19}>join a breakout up</Txt>
      <circle cx={440} cy={70} r={7} fill={LOSS5} />
      <Txt x={440} y={22} anchor="middle" fill={LOSS} bold>sell limit</Txt>
      <Txt x={440} y={46} anchor="middle" size={19}>sell into strength</Txt>
      <circle cx={120} cy={250} r={7} fill={PRO5} />
      <Txt x={120} y={284} anchor="middle" fill={PRO} bold>buy limit</Txt>
      <Txt x={120} y={308} anchor="middle" size={19}>wait to buy lower</Txt>
      <circle cx={440} cy={250} r={7} fill={LOSS5} />
      <Txt x={440} y={284} anchor="middle" fill={LOSS} bold>sell stop</Txt>
      <Txt x={440} y={308} anchor="middle" size={19}>exit on a breakdown</Txt>
    </Frame>
  );
}

function EquityCurve() {
  return (
    <Frame title="Two equity curves through the same losing streak: 1 percent risk dips, 10 percent risk craters" h={280}>
      <line x1={40} y1={120} x2={520} y2={120} stroke={B2} strokeWidth={1.5} strokeDasharray="5 4" />
      <Txt x={44} y={108} fill={LOW} mono size={19}>start: $1,000</Txt>
      <polyline
        points="70,120 130,113 190,107 250,103 305,108 360,113 440,103 520,95"
        fill="none"
        stroke={PRO5}
        strokeWidth={3}
      />
      <polyline
        points="70,120 130,99 190,127 250,101 276,120 302,139 328,158 354,177 380,195 450,190 520,185"
        fill="none"
        stroke={LOSS5}
        strokeWidth={3}
      />
      <Txt x={400} y={76} anchor="middle" fill={PRO} size={19}>1% risk: the streak is a dent</Txt>
      <Txt x={350} y={232} anchor="middle" fill={LOSS} size={19}>the same streak at 10% risk: −41%</Txt>
      <Txt x={350} y={258} anchor="middle" fill={LOW} size={19}>(it takes +56% just to climb back)</Txt>
    </Frame>
  );
}

function ConfluenceStack() {
  const reasons: [number, string][] = [
    [30, "a level that held"],
    [96, "trend agrees"],
    [162, "a signal candle"],
    [228, "the right session"],
  ];
  const targets = [148, 163, 178, 193];
  return (
    <Frame title="Four independent reasons stacking into one A-plus setup" h={304}>
      {reasons.map(([y, label], i) => {
        const cy = y + 23;
        return (
          <g key={label}>
            <rect x={40} y={y} width={230} height={46} rx={10} fill={S2} stroke={B2} strokeWidth={1.5} />
            <polyline
              points={`${54},${cy} ${60},${cy + 7} ${72},${cy - 8}`}
              fill="none"
              stroke={VOLT5}
              strokeWidth={3}
            />
            <Txt x={84} y={cy + 7} fill={HI} size={19}>{label}</Txt>
            <Arrow x1={274} y1={cy} x2={326} y2={targets[i]} width={1.5} />
          </g>
        );
      })}
      <rect x={330} y={126} width={200} height={84} rx={12} fill={VOLT_TINT} stroke={VOLT5} strokeWidth={2} />
      <Txt x={430} y={162} anchor="middle" fill={HI} size={22} bold>one A+ setup</Txt>
      <Txt x={430} y={190} anchor="middle" size={19}>four independent reasons</Txt>
      <Txt x={280} y={292} anchor="middle">one reason is a guess — stacked reasons are a setup</Txt>
    </Frame>
  );
}

function StrategyLoop() {
  const nodes: { cx: number; cy: number; w: number; label: string; accent?: boolean }[] = [
    { cx: 280, cy: 55, w: 100, label: "idea" },
    { cx: 389, cy: 128, w: 110, label: "rules" },
    { cx: 356, cy: 245, w: 130, label: "backtest" },
    { cx: 204, cy: 245, w: 150, label: "forward test" },
    { cx: 171, cy: 128, w: 130, label: "live, small", accent: true },
  ];
  return (
    <Frame title="The strategy loop: idea, rules, backtest, forward test, then live and back to idea" h={285}>
      <Arrow x1={322} y1={72} x2={362} y2={108} width={1.5} />
      <Arrow x1={392} y1={148} x2={368} y2={224} width={1.5} />
      <Arrow x1={330} y1={274} x2={238} y2={274} width={1.5} />
      <Arrow x1={192} y1={224} x2={174} y2={150} width={1.5} />
      <Arrow x1={188} y1={108} x2={236} y2={70} color={VOLT5} width={2} />
      {nodes.map((n) => (
        <g key={n.label}>
          <rect
            x={n.cx - n.w / 2}
            y={n.cy - 18}
            width={n.w}
            height={36}
            rx={18}
            fill={n.accent ? VOLT_TINT : S2}
            stroke={n.accent ? VOLT5 : B2}
            strokeWidth={1.5}
          />
          <Txt x={n.cx} y={n.cy + 7} anchor="middle" fill={HI} size={19} bold>{n.label}</Txt>
        </g>
      ))}
      <Txt x={280} y={166} anchor="middle" fill={LOW} size={19}>repeat until the edge is real</Txt>
    </Frame>
  );
}

function EmotionCycle() {
  return (
    <Frame title="The tilt spiral: a loss, revenge, bigger size, a bigger loss, and the volt exit ramp out" h={330}>
      <Arrow x1={292} y1={98} x2={322} y2={158} color={LOSS5} width={2} />
      <Arrow x1={318} y1={202} x2={288} y2={258} color={LOSS5} width={2} />
      <Arrow x1={168} y1={258} x2={138} y2={202} color={LOSS5} width={2} />
      <Arrow x1={142} y1={158} x2={172} y2={98} color={LOSS5} width={2} />
      <rect x={155} y={63} width={150} height={34} rx={17} fill={S2} stroke={B2} strokeWidth={1.5} />
      <Txt x={230} y={86} anchor="middle" fill={HI} size={19}>a losing trade</Txt>
      <rect x={260} y={163} width={140} height={34} rx={17} fill={S2} stroke={B2} strokeWidth={1.5} />
      <Txt x={330} y={186} anchor="middle" fill={HI} size={19}>{"\u201Cwin it back\u201D"}</Txt>
      <rect x={120} y={263} width={220} height={34} rx={17} fill={S2} stroke={B2} strokeWidth={1.5} />
      <Txt x={230} y={286} anchor="middle" fill={HI} size={19}>bigger size, worse entry</Txt>
      <rect x={60} y={163} width={140} height={34} rx={17} fill={LOSS_TINT} stroke={LOSS5} strokeWidth={1.5} />
      <Txt x={130} y={186} anchor="middle" fill={LOSS} size={19} bold>a bigger loss</Txt>
      {/* Titles the cycle from the free top-left corner. Centred at (230,185)
          it sat inside both mid-row pills and was unreadable. */}
      <Txt x={20} y={30} fill={LOW} size={19}>the tilt spiral</Txt>
      {/* exit ramp */}
      <Arrow x1={372} y1={155} x2={438} y2={92} color={VOLT5} width={2} dash="6 4" />
      <rect x={385} y={46} width={160} height={34} rx={17} fill={VOLT_TINT} stroke={VOLT5} strokeWidth={1.5} />
      <Txt x={465} y={69} anchor="middle" fill={HI} size={19} bold>walk away</Txt>
      <Txt x={455} y={116} anchor="middle" fill={MID} size={19}>step away, size down</Txt>
      <Txt x={280} y={322} anchor="middle">the spiral only spins if you feed it</Txt>
    </Frame>
  );
}

function AutomationPipeline() {
  return (
    <Frame title="The automation pipeline: market data, AI signal, Trade Guard veto, consented order, journal" h={400}>
      <Box x={40} y={20} w={290} h={54} label="Market data" sub="prices, sessions, news" />
      <Arrow x1={185} y1={78} x2={185} y2={94} />
      <Box x={40} y={98} w={290} h={54} label="Signal" sub="the AI writes its case" stroke={PULSE} />
      <Arrow x1={185} y1={156} x2={185} y2={172} />
      <Box x={40} y={176} w={290} h={54} label="Trade Guard" sub="risk rules can veto" fill={WARN_TINT} stroke={WARN} />
      <Arrow x1={334} y1={203} x2={382} y2={203} color={LOSS5} />
      <Box x={386} y={176} w={160} h={54} label="Blocked" sub="no trade happens" fill={LOSS_TINT} stroke={LOSS5} />
      <Arrow x1={185} y1={234} x2={185} y2={250} />
      <Box x={40} y={254} w={290} h={54} label="Order" sub="sent only with your consent" />
      <Arrow x1={185} y1={312} x2={185} y2={328} />
      <Box x={40} y={332} w={290} h={54} label="Journal" sub="every decision on the record" />
    </Frame>
  );
}

function PropFunnel() {
  const stages: { top: number; wTop: number; wBot: number; label: string; sub: string; fill: string; stroke: string }[] = [
    { top: 24, wTop: 480, wBot: 380, label: "Challenge", sub: "hit the target without breaking a rule", fill: S2, stroke: B2 },
    { top: 96, wTop: 380, wBot: 290, label: "Verification", sub: "prove it again, calmer", fill: S2, stroke: B2 },
    { top: 168, wTop: 290, wBot: 210, label: "Funded", sub: "trade the firm\u2019s capital", fill: VOLT_TINT, stroke: VOLT5 },
    { top: 240, wTop: 210, wBot: 170, label: "Payout split", sub: "you keep ~80%", fill: PRO_TINT, stroke: PRO5 },
  ];
  return (
    <Frame title="The prop firm funnel: challenge, verification, funded account, payout split" h={332}>
      {stages.map((s) => {
        const bot = s.top + 60;
        const pts = `${280 - s.wTop / 2},${s.top} ${280 + s.wTop / 2},${s.top} ${280 + s.wBot / 2},${bot} ${280 - s.wBot / 2},${bot}`;
        return (
          <g key={s.label}>
            <polygon points={pts} fill={s.fill} stroke={s.stroke} strokeWidth={1.5} />
            <Txt x={280} y={s.top + 26} anchor="middle" fill={HI} bold>{s.label}</Txt>
            <Txt x={280} y={s.top + 48} anchor="middle" size={19}>{s.sub}</Txt>
          </g>
        );
      })}
      <Txt x={280} y={324} anchor="middle">most attempts fail on rule breaks, not bad ideas</Txt>
    </Frame>
  );
}

function CompoundingCurve() {
  // $1,000 at +3%/month; y maps $1,000..$3,000 onto 260..60.
  const pts: [number, number][] = [
    [80, 260],
    [153, 241],
    [227, 217],
    [300, 190],
    [373, 157],
    [447, 117],
    [520, 70],
  ];
  return (
    <Frame title="1,000 dollars compounding at 3 percent a month for 36 months versus a flat 30 dollars a month" h={300}>
      <Txt x={300} y={32} anchor="middle">3% a month, reinvested — almost 3× in 36 months</Txt>
      <line x1={80} y1={50} x2={80} y2={260} stroke={B2} strokeWidth={1.5} />
      <line x1={80} y1={260} x2={530} y2={260} stroke={B2} strokeWidth={1.5} />
      <line x1={80} y1={260} x2={520} y2={152} stroke={B3} strokeWidth={2} strokeDasharray="6 4" />
      {/* Sits in the band between the dashed line and the x-axis. Centred at
          (350,222) the $1,426 marker dot landed on top of the glyphs. */}
      <Txt x={210} y={252} fill={LOW} size={19}>flat $30/month — no compounding</Txt>
      <polyline points={pts.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke={PRO5} strokeWidth={3} />
      <circle cx={227} cy={217} r={5} fill={PRO5} />
      <circle cx={373} cy={157} r={5} fill={PRO5} />
      <circle cx={520} cy={70} r={5} fill={PRO5} />
      <Txt x={227} y={201} anchor="middle" fill={PRO} mono size={19}>$1,426</Txt>
      <Txt x={373} y={141} anchor="middle" fill={PRO} mono size={19}>$2,033</Txt>
      <Txt x={530} y={56} anchor="end" fill={PRO} mono size={19}>$2,898</Txt>
      <Txt x={72} y={266} anchor="end" fill={LOW} mono size={19}>$1,000</Txt>
      <Txt x={80} y={284} anchor="middle" fill={LOW} mono size={19}>0</Txt>
      <Txt x={227} y={284} anchor="middle" fill={LOW} mono size={19}>12</Txt>
      <Txt x={373} y={284} anchor="middle" fill={LOW} mono size={19}>24</Txt>
      <Txt x={510} y={284} anchor="middle" fill={LOW} mono size={19}>36 mo</Txt>
    </Frame>
  );
}

/* ---------- registry + public component ---------- */

const FIGURES: Record<FigureKind, () => ReactElement> = {
  "spread-anatomy": SpreadAnatomy,
  "pip-scale": PipScale,
  "candle-anatomy": CandleAnatomyFig,
  "trend-structure": TrendStructure,
  "market-structure": MarketStructure,
  "support-resistance": SupportResistance,
  "supply-demand": SupplyDemand,
  "chart-patterns": ChartPatterns,
  "risk-reward": RiskReward,
  "position-size-math": PositionSizeMath,
  "leverage-double-edge": LeverageDoubleEdge,
  "session-clock": SessionClock,
  "order-types": OrderTypes,
  "equity-curve": EquityCurve,
  "confluence-stack": ConfluenceStack,
  "strategy-loop": StrategyLoop,
  "emotion-cycle": EmotionCycle,
  "automation-pipeline": AutomationPipeline,
  "prop-funnel": PropFunnel,
  "compounding-curve": CompoundingCurve,
};

export function Figure({ kind, caption }: { kind: FigureKind; caption: string }) {
  const Draw = FIGURES[kind];
  return (
    <figure className="ac-figure">
      <div className="ac-figure-stage">
        <Draw />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
