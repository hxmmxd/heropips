import type { EquityPointRes } from "@heropips/contracts";

/**
 * Server-rendered equity sparkline-area. Pure SVG, no chart lib, no client
 * JS — the curve is in the first HTML byte. Downsamples to ≤200 points.
 */
const W = 640;
const H = 120;
const MAX_POINTS = 200;

function downsample(points: EquityPointRes[]): EquityPointRes[] {
  if (points.length <= MAX_POINTS) return points;
  const out: EquityPointRes[] = [];
  const step = (points.length - 1) / (MAX_POINTS - 1);
  for (let i = 0; i < MAX_POINTS; i++) out.push(points[Math.round(i * step)]);
  return out;
}

export function EquitySpark({ points, title }: { points: EquityPointRes[]; title: string }) {
  if (points.length < 2) return null;
  const pts = downsample(points);
  let min = pts[0].equity_usd_minor;
  let max = min;
  for (const p of pts) {
    if (p.equity_usd_minor < min) min = p.equity_usd_minor;
    if (p.equity_usd_minor > max) max = p.equity_usd_minor;
  }
  const span = max - min || 1;
  const pad = 6;
  const n = pts.length - 1;
  const coords = pts.map((p, i) => {
    const x = (i / n) * W;
    const y = pad + (1 - (p.equity_usd_minor - min) / span) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = coords.join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  const up = pts[pts.length - 1].equity_usd_minor >= pts[0].equity_usd_minor;
  const stroke = up ? "var(--profit-400)" : "var(--loss-400)";
  const fill = up ? "var(--profit-tint)" : "var(--loss-tint)";

  return (
    <svg
      className="ap-spark"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={title}
    >
      <polygon points={area} fill={fill} stroke="none" />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
