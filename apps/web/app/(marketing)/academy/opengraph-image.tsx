/* =========================================================================
 * /academy social card. Satori JSX: no remote fonts (default font, branded
 * with geometry + color). Hex values mirror packages/ui/tokens.css.
 * ======================================================================= */

import { ImageResponse } from "next/og";
import { ACADEMY_LESSONS, ACADEMY_LEVELS } from "@heropips/contracts";

export const alt = "HeroPips Academy — curious trader to confident trader. Trading, taught properly.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#07080C"; // --ink-950
const VOLT = "#C6FF2E"; // --volt-500
const ON_VOLT = "#0D0F07"; // --on-volt
const TEXT = "#F3F5FA"; // --text-hi
const MID = "#9BA4B8"; // --text-mid

export default function Image() {
  const chips = [
    `${ACADEMY_LEVELS.length} levels · ${ACADEMY_LESSONS.length} lessons`,
    "XP + streaks",
    `${ACADEMY_LEVELS.length + 1} verified certificates`,
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* thin volt frame */}
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: "1px solid rgba(198,255,46,0.45)", // --volt-500 @ 45%
            borderRadius: 12,
          }}
        />
        {/* oversized chevron watermark, half-cropped bottom-right */}
        <svg
          width="560"
          height="560"
          viewBox="0 0 32 32"
          style={{ position: "absolute", right: -150, bottom: -170, opacity: 0.08 }}
        >
          <path d="M8 19.5 16 12l8 7.5" stroke={VOLT} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 25 16 17.5 24 25" stroke={VOLT} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        </svg>

        {/* wordmark row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="44" height="44" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill={VOLT} />
            <path d="M8 19.5 16 12l8 7.5" stroke={ON_VOLT} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 25 16 17.5 24 25" stroke={ON_VOLT} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
          </svg>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: VOLT }}>HEROPIPS ACADEMY</div>
        </div>

        {/* display */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 84, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.08 }}>
            <div style={{ display: "flex" }}>Curious trader to</div>
            <div style={{ display: "flex" }}>confident trader.</div>
          </div>
          <div style={{ display: "flex", fontSize: 46, color: MID }}>Trading, taught properly.</div>
        </div>

        {/* chips */}
        <div style={{ display: "flex", gap: 16 }}>
          {chips.map((chip, i) => (
            <div
              key={chip}
              style={{
                display: "flex",
                border: `1px solid ${i === 0 ? "rgba(198,255,46,0.5)" : "rgba(155,164,184,0.35)"}`, // volt / --text-mid
                borderRadius: 999,
                padding: "10px 24px",
                fontSize: 24,
                color: i === 0 ? VOLT : MID,
              }}
            >
              {chip}
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, background: VOLT }} />
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 2, color: MID }}>heropips.com/academy</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
