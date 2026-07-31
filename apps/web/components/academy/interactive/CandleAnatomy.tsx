"use client";

/* =========================================================================
 * CandleAnatomy — tap the parts of a candle to learn what each one says.
 * Left: a large annotated candle with hotspot buttons layered over the
 * regions (real <button>s for keyboard + touch). Right: the explanation
 * panel plus a chip row that mirrors the hotspots for small screens.
 * ======================================================================= */

import { useState, type CSSProperties } from "react";
import { Button } from "@heropips/ui";

type PartId = "body" | "high" | "low" | "close";

const PARTS: { id: PartId; label: string; heading: string; copy: string }[] = [
  {
    id: "body",
    label: "Body",
    heading: "The body — open to close",
    copy: "The body is the result of the open-to-close battle: the ground price actually held between the first trade and the last. A green body means the close finished above the open; a red one means it finished below.",
  },
  {
    id: "high",
    label: "Upper wick",
    heading: "The upper wick — the highest attempt",
    copy: "Price traded all the way up here during the period, then got sold back down before the close. A long upper wick tells you buyers pushed and sellers answered.",
  },
  {
    id: "low",
    label: "Lower wick",
    heading: "The lower wick — the deepest dip",
    copy: "This is the lowest price printed before buyers stepped in and bought it back. A long lower wick under a green body is a classic sign of demand below the market.",
  },
  {
    id: "close",
    label: "Close",
    heading: "The close — the verdict",
    copy: "Where the period actually settled. Highs and lows are attempts; the close is where conviction shows, which is why most traders read closes before anything else.",
  },
];

/** Hotspot bands over the figure, in % of the stage (viewBox 0 0 100 140). */
const HOTSPOT_BASE: CSSProperties = {
  position: "absolute",
  left: "0",
  width: "100%",
  background: "transparent",
  border: "none",
  padding: 0,
};
const HOTSPOT_STYLE: Record<PartId, CSSProperties> = {
  high: { ...HOTSPOT_BASE, top: "0%", height: "30%" },
  close: { ...HOTSPOT_BASE, top: "30%", height: "14%" },
  body: { ...HOTSPOT_BASE, top: "44%", height: "30%" },
  low: { ...HOTSPOT_BASE, top: "74%", height: "26%" },
};

export function CandleAnatomy() {
  const [active, setActive] = useState<PartId>("body");
  const part = PARTS.find((p) => p.id === active) ?? PARTS[0];

  return (
    <div className="ac-anatomy">
      <div style={{ position: "relative" }}>
        <svg viewBox="0 0 100 140" role="img" aria-label="Anatomy of a single candlestick" style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}>
          {/* subtle price grid */}
          {[20, 50, 80, 110].map((gy) => (
            <line key={gy} x1={4} x2={96} y1={gy} y2={gy} stroke="var(--border-1)" strokeWidth={0.4} />
          ))}

          {/* upper wick: high 14 → body top 48 */}
          <g className="ac-anatomy-hot" data-active={active === "high" ? "true" : "false"}>
            <line x1={50} x2={50} y1={14} y2={48} stroke="var(--profit-500)" strokeWidth={2} />
            <line x1={45} x2={55} y1={14} y2={14} stroke="var(--profit-400)" strokeWidth={1} />
          </g>

          {/* lower wick: body bottom 100 → low 126 */}
          <g className="ac-anatomy-hot" data-active={active === "low" ? "true" : "false"}>
            <line x1={50} x2={50} y1={100} y2={126} stroke="var(--profit-500)" strokeWidth={2} />
            <line x1={45} x2={55} y1={126} y2={126} stroke="var(--profit-400)" strokeWidth={1} />
          </g>

          {/* body: open 100 (bottom) → close 48 (top), green */}
          <g className="ac-anatomy-hot" data-active={active === "body" ? "true" : "false"}>
            <rect x={38} y={48} width={24} height={52} rx={1.5} fill="var(--profit-500)" />
            {/* open tick */}
            <line x1={30} x2={38} y1={100} y2={100} stroke="var(--profit-400)" strokeWidth={1.4} />
          </g>

          {/* close level: dashed verdict line */}
          <g className="ac-anatomy-hot" data-active={active === "close" ? "true" : "false"}>
            <line x1={8} x2={92} y1={48} y2={48} stroke="var(--volt-400)" strokeWidth={0.7} strokeDasharray="2.4 2" />
            <line x1={62} x2={70} y1={48} y2={48} stroke="var(--volt-400)" strokeWidth={1.4} />
          </g>

          {/* open/high/low/close labels — anchored inward with a background
              halo so they stay legible and never clip at any render width */}
          <text x={58} y={16} fill="var(--text-low)" fontSize={5} fontFamily="var(--font-mono)" stroke="var(--bg-app)" strokeWidth={1} style={{ paintOrder: "stroke" }}>high</text>
          <text x={27} y={102} textAnchor="end" fill="var(--text-low)" fontSize={5} fontFamily="var(--font-mono)" stroke="var(--bg-app)" strokeWidth={1} style={{ paintOrder: "stroke" }}>open</text>
          <text x={72} y={44} fill="var(--volt-400)" fontSize={5} fontFamily="var(--font-mono)" stroke="var(--bg-app)" strokeWidth={1} style={{ paintOrder: "stroke" }}>close</text>
          <text x={58} y={128} fill="var(--text-low)" fontSize={5} fontFamily="var(--font-mono)" stroke="var(--bg-app)" strokeWidth={1} style={{ paintOrder: "stroke" }}>low</text>
        </svg>

        {/* transparent hotspot buttons over the figure regions */}
        {PARTS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="ac-anatomy-hot"
            data-active={active === p.id ? "true" : "false"}
            aria-pressed={active === p.id}
            aria-label={`Highlight the ${p.label.toLowerCase()}`}
            style={HOTSPOT_STYLE[p.id]}
            onClick={() => setActive(p.id)}
          />
        ))}
      </div>

      <div style={{ display: "grid", gap: "var(--sp-3)", alignContent: "start" }}>
        <div className="ac-anatomy-label" aria-live="polite">
          <h4>{part.heading}</h4>
          <p>{part.copy}</p>
        </div>
        <div className="ac-anatomy-tabs" role="group" aria-label="Candle parts">
          {PARTS.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant={active === p.id ? "outline" : "ghost"}
              size="sm"
              aria-pressed={active === p.id}
              onClick={() => setActive(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
