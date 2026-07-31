import * as React from "react";

/* =========================================================================
 * iso — shared isometric geometry for the brand art (art.css).
 *
 * Classic 2:1 axonometric projection:
 *   screen.x = (x − y) · cos30°     +x runs to the lower-right
 *   screen.y = (x + y) · sin30° − z +y runs to the lower-left, +z straight up
 *
 * Everything here is a pure server-safe function — zero client JS.
 * ======================================================================= */

export const IX = 0.866; // cos 30°
export const IY = 0.5; //   sin 30°

export type P3 = readonly [number, number, number];

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Project one world point to screen space. */
export function iso(x: number, y: number, z: number): [number, number] {
  return [r1((x - y) * IX), r1((x + y) * IY - z)];
}

/** Project a list of world points into an SVG `points` string. */
export function pts(list: P3[]): string {
  return list.map(([x, y, z]) => iso(x, y, z).join(",")).join(" ");
}

// `d` is omitted: SVGAttributes declares path-data `d?: string`, which would
// intersect our numeric depth prop into `never`.
type GProps = Omit<React.SVGProps<SVGGElement>, "d">;

/* ---------------------------------------------------------------- Box */
/** An extruded slab/pylon: top + left + right faces, shaded via `--f`.
 *  `rim` overrides the top-face rim stroke (e.g. a volt edge glow). */
export function Box({
  x,
  y,
  z = 0,
  w,
  d,
  h,
  f,
  rim,
  ...g
}: {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  /** CSS color for the base face (any expression, tokens welcome) */
  f?: string;
  /** CSS color for the top rim stroke */
  rim?: string;
} & GProps) {
  const t = z + h;
  const vars = { "--f": f, "--rim": rim } as React.CSSProperties;
  return (
    <g {...g} style={{ ...vars, ...g.style }}>
      <polygon
        className="hp3-r"
        points={pts([
          [x + w, y, t],
          [x + w, y + d, t],
          [x + w, y + d, z],
          [x + w, y, z],
        ])}
      />
      <polygon
        className="hp3-l"
        points={pts([
          [x, y + d, t],
          [x + w, y + d, t],
          [x + w, y + d, z],
          [x, y + d, z],
        ])}
      />
      <polygon
        className="hp3-t"
        points={pts([
          [x, y, t],
          [x + w, y, t],
          [x + w, y + d, t],
          [x, y + d, t],
        ])}
      />
    </g>
  );
}

/* ------------------------------------------------------------ TopGrid */
/** Faint iso grid lines drawn on a slab's top face. */
export function TopGrid({
  x,
  y,
  z,
  w,
  d,
  step = 24,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  step?: number;
}) {
  const lines: React.ReactNode[] = [];
  for (let gx = x + step; gx < x + w; gx += step) {
    const [x1, y1] = iso(gx, y, z);
    const [x2, y2] = iso(gx, y + d, z);
    lines.push(<line key={`x${gx}`} className="hp3-grid" x1={x1} y1={y1} x2={x2} y2={y2} />);
  }
  for (let gy = y + step; gy < y + d; gy += step) {
    const [x1, y1] = iso(x, gy, z);
    const [x2, y2] = iso(x + w, gy, z);
    lines.push(<line key={`y${gy}`} className="hp3-grid" x1={x1} y1={y1} x2={x2} y2={y2} />);
  }
  return <g aria-hidden>{lines}</g>;
}

/* ----------------------------------------------------------- GShadow */
/** Soft blurred ground-contact shadow (screen space). */
export function GShadow({
  cx,
  cy,
  rx,
  ry,
  opacity = 1,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  opacity?: number;
}) {
  return <ellipse className="hp3-gs" cx={cx} cy={cy} rx={rx} ry={ry} opacity={opacity} />;
}

/* -------------------------------------------------------------- Chip */
export type ChipTone = "base" | "volt" | "pulse" | "profit" | "loss" | "ghost";

/** Art label scale in SVG user units. Mirrors `--al-*` in art.css. Chip sizes
 *  its own backing rect from these numbers and renders the glyphs through the
 *  matching `.hp-art-mono--*` class, so label and rect cannot drift apart. */
export const AL = { xs: 15, sm: 16, md: 17, lg: 19, xl: 22 } as const;

/** Chip width — JetBrains Mono advance 0.6em plus the 0.05em art tracking.
 *
 *  An ESTIMATE, and it under-reports for glyphs the mono face does not cover:
 *  `→`, box-drawing and most symbols fall back to a proportional font and can
 *  run 1.2x wider per character. Keep chip labels short and ASCII-ish; a long
 *  sentence belongs in the scene's figcaption, where it is real HTML. */
export function chipW(label: string, size: "sm" | "md" = "md"): number {
  const fs = size === "sm" ? AL.sm : AL.md;
  return Math.round(label.length * fs * 0.65 + (size === "sm" ? 20 : 26));
}

/** Flat mono label chip floating over the scene (screen space, centered). */
export function Chip({
  cx,
  cy,
  label,
  tone = "base",
  size = "md",
}: {
  cx: number;
  cy: number;
  label: string;
  tone?: ChipTone;
  size?: "sm" | "md";
}) {
  const fs = size === "sm" ? AL.sm : AL.md;
  const w = chipW(label, size);
  const h = size === "sm" ? 26 : 29;
  return (
    <g className={`hp3-chip${tone === "base" ? "" : ` hp3-chip--${tone}`}`}>
      <rect x={r1(cx - w / 2)} y={r1(cy - h / 2)} width={w} height={h} rx={9} />
      <text x={cx} y={r1(cy + fs * 0.35)} textAnchor="middle" className={`hp-art-mono hp-art-mono--${size}`}>
        {label}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------ Beacon */
/** Breathing glow dot (screen space). `tone` = any CSS color. */
export function Beacon({
  x,
  y,
  r = 4,
  tone,
  delay,
}: {
  x: number;
  y: number;
  r?: number;
  tone?: string;
  delay?: string;
}) {
  return (
    <g style={tone ? ({ "--bc": tone } as React.CSSProperties) : undefined}>
      <circle className="hp3-beacon-halo" cx={x} cy={y} r={r * 3.2} style={delay ? { animationDelay: delay } : undefined} />
      <circle className="hp3-beacon-core" cx={x} cy={y} r={r} />
    </g>
  );
}

/* ------------------------------------------------------------- Spark */
/** A glowing dot riding an SVG path. Geometry stays at the origin — cx/cy
 *  would compound with offset-path motion. Hidden when offset-path is
 *  unsupported (art.css keeps base opacity at 0; the ride reveals it). */
export function Spark({
  path,
  dur = 5.5,
  delay = 0,
  r = 3.5,
}: {
  path: string;
  dur?: number;
  delay?: number;
  r?: number;
}) {
  return (
    <circle
      r={r}
      className="hp3-spark"
      style={
        {
          offsetPath: `path("${path}")`,
          offsetRotate: "0deg",
          animationDuration: `${dur}s`,
          animationDelay: delay ? `${delay}s` : undefined,
        } as React.CSSProperties
      }
    />
  );
}

/* -------------------------------------------------------------- Gate */
/** A guard gate: two pylons + lintel + a volt energy sheet with the shield
 *  emblem. World-space; wrap in a positioned <g>. Opening spans x∈[pw..span−pw]. */
export function Gate({
  span = 124,
  pw = 20,
  ph = 58,
  depth = 20,
  f,
}: {
  span?: number;
  pw?: number;
  ph?: number;
  depth?: number;
  f?: string;
}) {
  const sheet: P3[] = [
    [pw + 2, depth / 2, 6],
    [span - pw - 2, depth / 2, 6],
    [span - pw - 2, depth / 2, ph - 6],
    [pw + 2, depth / 2, ph - 6],
  ];
  const [scx, scy] = iso(span / 2, depth / 2, ph / 2);
  return (
    <g>
      <polygon className="hp3-glass-halo" points={pts(sheet)} />
      <Box x={0} y={0} z={0} w={pw} d={depth} h={ph} f={f} />
      <polygon className="hp3-glass" points={pts(sheet)} />
      <Shield cx={scx} cy={scy} s={0.8} />
      <Box x={span - pw} y={0} z={0} w={pw} d={depth} h={ph} f={f} />
      <Box
        x={-10}
        y={-3}
        z={ph}
        w={span + 20}
        d={depth + 6}
        h={12}
        f={f}
        rim="color-mix(in srgb, var(--volt-500) 65%, transparent)"
      />
    </g>
  );
}

/** Flat volt shield emblem with a check (screen space, billboard). */
export function Shield({ cx, cy, s = 1 }: { cx: number; cy: number; s?: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <path
        d="M0 -19 L15 -12.5 V2 C15 12.5 8 20 0 24.5 C-8 20 -15 12.5 -15 2 V-12.5 Z"
        fill="var(--on-volt)"
        opacity="0.85"
      />
      <path
        d="M0 -19 L15 -12.5 V2 C15 12.5 8 20 0 24.5 C-8 20 -15 12.5 -15 2 V-12.5 Z"
        fill="none"
        stroke="var(--volt-500)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <polyline
        points="-6.5,2 -1.5,7.5 7.5,-4.5"
        fill="none"
        stroke="var(--volt-500)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/* --------------------------------------------------------------- Core */
/** Floating AI octahedron with an orbit ring (screen-space center). */
export function Core({ cx, cy, s = 1, tone = "var(--pulse-500)" }: { cx: number; cy: number; s?: number; tone?: string }) {
  const a = 15 * s; // half base
  const hh = 24 * s; // apex height
  const base: P3[] = [
    [-a, -a, 0],
    [a, -a, 0],
    [a, a, 0],
    [-a, a, 0],
  ];
  const top: P3 = [0, 0, hh];
  const bot: P3 = [0, 0, -hh];
  return (
    <g transform={`translate(${cx} ${cy})`} style={{ "--f": tone } as React.CSSProperties}>
      <g className="hp3-float">
        <ellipse className="hp3-orbit" cx="0" cy="2" rx={a * 3} ry={a * 1.15} fill="none" stroke="var(--hp3-pulse)" strokeWidth="1.2" strokeDasharray="2 7" opacity="0.75" />
        {/* rear-left top + bottom faces (darker, drawn first) */}
        <polygon className="hp3-l" points={pts([top, base[0], base[1]])} />
        <polygon className="hp3-d" points={pts([bot, base[1], base[2]])} />
        {/* front faces */}
        <polygon className="hp3-t" points={pts([top, base[1], base[2]])} />
        <polygon className="hp3-t" points={pts([top, base[3], base[2]])} opacity="0.92" />
        <polygon className="hp3-d" points={pts([bot, base[2], base[3]])} opacity="0.9" />
        <circle cx="0" cy="0" r={3 * s} fill="var(--pulse-300)" className="hp3-core-pulse" />
      </g>
    </g>
  );
}
