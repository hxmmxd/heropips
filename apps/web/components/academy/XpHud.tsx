"use client";

/* =========================================================================
 * XpHud — the single academy runtime mount per page.
 *  (a) sticky rank/XP/streak pill (.ac-hud) with count-up XP
 *  (b) global award layer: floating +XP burst, rank-up toast + confetti
 *  (c) kicks server hydration once (useAcademyHydration)
 * Reduced motion: count-up jumps instantly; CSS keyframes end visible.
 * ======================================================================= */

import * as React from "react";
import { ProgressBar, Skeleton } from "@heropips/ui";
import { fmtXp, rankFor } from "@/lib/academy/xp";
import { consumeAward } from "@/lib/academy/store";
import { useAcademy, useAcademyHydration } from "./AcademyProvider";

const AWARD_TTL_MS = 1600;
const COUNT_UP_MS = 400;
const CONFETTI_PIECES = 28;

/* Brand chevron (LevelUpMark geometry, currentColor for .ac-hud-chevron). */
function Chevron({ size }: { size: number }) {
  return (
    <svg className="ac-hud-chevron" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M8 19.5 16 12l8 7.5" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 25 16 17.5 24 25" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
    </svg>
  );
}

function Flame({ live }: { live: boolean }) {
  return (
    <svg
      className={live ? "ac-hud-flame" : undefined}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3.5c.7 2.9-3.2 4.6-3.2 8.1a4.4 4.4 0 0 0 8.8 0c0-1.8-.9-3.2-2-4.3-.2 1.2-.7 2-1.6 2.5.3-2.2-.4-4.6-2-6.3Z" />
    </svg>
  );
}

/** Animate a number toward `value` over ~400ms; jump when motion is reduced. */
function useCountUp(value: number): number {
  const [shown, setShown] = React.useState(value);
  const fromRef = React.useRef(value);
  React.useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;
    if (from === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now: number) {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - (1 - t) * (1 - t); // ease-out quad
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

export function XpHud() {
  useAcademyHydration();
  const snap = useAcademy();
  const loading = snap.status === "loading";
  const rank = rankFor(snap.xp);
  const shownXp = useCountUp(snap.xp);
  const award = snap.lastAward;

  /* Auto-dismiss the award overlay after the burst animation lands. */
  React.useEffect(() => {
    if (!award) return;
    const t = window.setTimeout(() => consumeAward(award.id), AWARD_TTL_MS);
    return () => window.clearTimeout(t);
  }, [award]);

  /* Confetti pieces — random per award, memoized so re-renders don't reshuffle. */
  const confetti = React.useMemo(() => {
    if (!award?.rankUp) return null;
    return Array.from({ length: CONFETTI_PIECES }, (_, i) => {
      const style: React.CSSProperties & Record<"--x" | "--d" | "--r", string> = {
        "--x": `${Math.round(Math.random() * 100)}vw`,
        "--d": `${Math.round(Math.random() * 500)}ms`,
        "--r": `${360 + Math.round(Math.random() * 540)}deg`,
      };
      return <i key={i} style={style} />;
    });
  }, [award]);

  const barLabel = loading
    ? "Loading XP progress"
    : rank.next
      ? `${fmtXp(rank.next.at - snap.xp)} XP to ${rank.next.name}`
      : "Top rank reached";

  return (
    <>
      <div className="ac-hud">
        <span className="ac-hud-rank">
          <Chevron size={18} />
          <span>{loading ? <Skeleton style={{ width: "8ch", height: "1em" }} /> : rank.name}</span>
        </span>
        <span className="ac-hud-xp">
          {loading ? <Skeleton style={{ width: "6ch", height: "1em" }} /> : `${fmtXp(shownXp)} XP`}
        </span>
        <ProgressBar
          className="ac-hud-bar"
          value={loading ? 0 : snap.xp - rank.at}
          max={loading ? 1 : rank.next ? rank.next.at - rank.at : 1}
          label={barLabel}
          showValue={false}
        />
        {/* role="img": `aria-label` is PROHIBITED on a role-less <span> (axe
            `aria-prohibited-attr`) and is not reliably announced there. The
            flame plus "5d" reads as one composite glyph, so role="img" with the
            spelled-out label is the permitted pattern and replaces both. */}
        <span
          className="ac-hud-streak"
          role="img"
          data-cold={!loading && snap.streakDays === 0 ? "true" : undefined}
          aria-label={loading ? "Loading streak" : `${snap.streakDays}-day streak`}
        >
          <Flame live={!loading && snap.streakDays > 0} />
          {loading ? <Skeleton style={{ width: "2ch", height: "1em" }} /> : `${snap.streakDays}d`}
        </span>
      </div>

      {award ? (
        <div className="ac-burst-layer" aria-hidden="true">
          <div className="ac-burst" key={award.id}>+{fmtXp(award.xp)} XP</div>
        </div>
      ) : null}
      {award?.rankUp ? (
        <>
          <div className="ac-toast" data-kind="rankup">
            <Chevron size={20} />
            <span>Rank up — {award.rankUp}</span>
          </div>
          <div className="ac-confetti" aria-hidden="true">{confetti}</div>
        </>
      ) : null}
      <div className="ac-sr" aria-live="polite" role="status">
        {award ? `Earned ${award.xp} XP${award.rankUp ? `, rank up to ${award.rankUp}` : ""}` : ""}
      </div>
    </>
  );
}
