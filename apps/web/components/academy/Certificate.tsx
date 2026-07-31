/* =========================================================================
 * Certificate — poster-grade, theme-invariant (always ink) completion
 * certificate. SERVER component: pure markup + tokens, no hooks.
 * Print-safe: academy.css @media print keeps the ink card on a white page.
 * ======================================================================= */

import type { CSSProperties } from "react";
import type { AcademyCertRes, AcademyCertTrack } from "@heropips/contracts";
import { LevelUpMark } from "@heropips/ui";
import { TRACKS } from "@/lib/academy/curriculum";
import { rankFor } from "@/lib/academy/xp";

/** One-clause syllabus summary per track, for the mastery statement. */
const TRACK_COVERAGE: Record<AcademyCertTrack, string> = {
  "level-0":
    "what markets really are, how currency pairs are quoted, and how brokers, orders and spread actually fill a trade",
  "level-1":
    "reading price in pips, decoding candlesticks and following trends across timeframes on a live chart",
  "level-2":
    "the 1% rule, stop-losses and take-profits, leverage handled with respect, and exact position sizing",
  "level-3":
    "market structure, support and resistance, liquidity, and the chart patterns that actually repeat",
  "level-4":
    "trading sessions and timing, stacking confluence, and writing a trading plan that can be followed under pressure",
  "level-5":
    "using indicators as context, choosing between breakout and pullback entries, and building a first testable strategy",
  "level-6":
    "honest backtesting, journaling like a professional, and a verified paper-trading capstone",
  "level-7":
    "the psychology of streaks, defusing tilt, revenge and FOMO, and the daily habits of consistent traders",
  "level-8":
    "decision intelligence over tip-chasing, automation with guardrails, and turning written rules into safe execution",
  "level-9":
    "a going-live checklist, prop firms and funded accounts, and scaling that survives losing streaks",
  "hero-trader":
    "market mechanics, price reading, professional risk control, trade planning, honest backtesting and a verified paper-trading capstone",
};

function VerifiedSeal() {
  return (
    <div className="ac-seal" aria-hidden="true">
      <svg viewBox="0 0 92 92" focusable="false">
        <defs>
          {/* full circle starting at 12 o'clock, for the ring text */}
          <path id="ac-seal-arc" d="M 46 11 A 35 35 0 1 1 45.99 11" fill="none" />
        </defs>
        <circle cx="46" cy="46" r="45" fill="none" stroke="var(--ink-600)" strokeWidth="1" />
        <g className="ac-seal-ring">
          {/* 12 user units in a 92-unit box rendered at 92px = 12 CSS px, the
              legibility floor. The ring string is trimmed to 27 characters so
              it still fits the 220-unit circumference at that size. */}
          <text
            fill="var(--text-low)"
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 0.4 }}
          >
            <textPath href="#ac-seal-arc">VERIFIED · HEROPIPS ACADEMY</textPath>
          </text>
        </g>
        <circle
          cx="46"
          cy="46"
          r="27"
          fill="none"
          stroke="var(--volt-500)"
          strokeOpacity="0.5"
          strokeWidth="1"
        />
        {/* Centred in the inner ring. The old "EST. MMXXV" flourish under this
            glyph rendered 5.5 CSS px at 2.15:1 and duplicated nothing — the
            issue date is in .ac-cert-meta — so it is gone rather than shrunk. */}
        <g
          transform="translate(33.5 33) scale(0.78)"
          stroke="var(--volt-400)"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 19.5 16 12l8 7.5" />
          <path d="M8 25 16 17.5 24 25" opacity="0.55" />
        </g>
      </svg>
    </div>
  );
}

export function Certificate({
  cert,
  verifyUrl,
  draft = false,
}: {
  cert: AcademyCertRes;
  verifyUrl: string;
  /** Public sample mode: overlays a diagonal DRAFT ribbon over the card. */
  draft?: boolean;
}) {
  const track = TRACKS.find((t) => t.id === cert.track) ?? TRACKS[0];
  const trackShortName = track.name.replace(" Certificate", "");
  const issued = new Date(cert.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const rank = rankFor(cert.xp_at_issue);
  const bareVerifyUrl = verifyUrl.replace(/^https?:\/\//, "");

  return (
    <article
      className="ac-cert"
      aria-label={
        draft
          ? `Draft sample certificate — ${track.name}`
          : `Certificate of completion — ${cert.recipient}, ${track.name}`
      }
    >
      <div className="ac-cert-inner">
        <header className="ac-cert-head">
          <div className="ac-cert-brand">
            <LevelUpMark size={26} />
            <span>HEROPIPS ACADEMY</span>
          </div>
          <VerifiedSeal />
        </header>

        <div style={{ display: "grid", gap: "var(--sp-2)" }}>
          <p className="ac-cert-label">Certificate of completion</p>
          <p className="ac-cert-name">{cert.recipient}</p>
          <p className="ac-cert-track">{track.name}</p>
        </div>

        <p className="ac-cert-body">
          has completed the {track.slugs.length}-lesson {trackShortName} track at HeroPips
          Academy — passing every lesson quiz, covering {TRACK_COVERAGE[cert.track]}.
        </p>

        <footer className="ac-cert-foot">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-6)" }}>
            <div className="ac-cert-meta">
              <span>Issued</span>
              <strong>
                <time dateTime={cert.issued_at}>{issued}</time>
              </strong>
            </div>
            <div className="ac-cert-meta">
              <span>XP at issue</span>
              <strong>{cert.xp_at_issue.toLocaleString("en-US")} XP</strong>
            </div>
            <div className="ac-cert-meta">
              <span>Rank</span>
              <strong>{rank.name}</strong>
            </div>
          </div>
          <div className="ac-cert-meta" style={{ justifyItems: "end", textAlign: "right" }}>
            <span className="ac-cert-code">CODE {cert.code}</span>
            <span>Verify at {bareVerifyUrl}</span>
          </div>
        </footer>
      </div>

      {draft ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              transform: "rotate(-16deg)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(var(--text-xs), 2.8vw, var(--text-lg))",
              fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
              letterSpacing: "var(--track-caps)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              color: "var(--volt-400)",
              border: "1px dashed color-mix(in srgb, var(--volt-400) 45%, transparent)",
              borderRadius: "var(--r-sm)",
              padding: "var(--sp-2) var(--sp-4)",
              background: "color-mix(in srgb, var(--ink-950) 55%, transparent)",
            }}
          >
            Draft — earn it in the Academy
          </span>
        </div>
      ) : null}

      {/* oversized watermark chevrons, cropped by the card */}
      <svg className="ac-cert-watermark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path
          d="M8 19.5 16 12l8 7.5"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 25 16 17.5 24 25"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
      </svg>
    </article>
  );
}
