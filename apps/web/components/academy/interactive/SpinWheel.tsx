"use client";

/* =========================================================================
 * SpinWheel — the member daily reward. Prize is decided server-side by
 * the store's spinWheel(); this component only lands the wheel on the
 * returned segment. Anonymous visitors get the launch-aware claim CTA.
 * Reduced motion: no rotation transition — the prize shows instantly.
 * ======================================================================= */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ACADEMY_XP } from "@heropips/contracts";
import { Button, ButtonLink, Kicker } from "@heropips/ui";
import { useAcademy } from "@/components/academy/AcademyProvider";
import { claimCta } from "@/lib/academy/access";
import { spinWheel } from "@/lib/academy/store";
import { utcDay } from "@/lib/academy/xp";
import { prefersReducedMotion } from "./chart";

const PRIZES = ACADEMY_XP.SPIN_PRIZES;
const SEG_DEG = 360 / PRIZES.length;
const FULL_TURNS = 5;
/** Fallback in case transitionend never fires (hidden tab): 3.2s + slack. */
const SPIN_FALLBACK_MS = 3600;

const SEG_COLORS = [
  "color-mix(in srgb, var(--volt-500) 24%, var(--surface-2))",
  "color-mix(in srgb, var(--pulse-500) 20%, var(--surface-2))",
  "var(--surface-3)",
];

const WHEEL_BG = `conic-gradient(from ${-SEG_DEG / 2}deg, ${PRIZES.map(
  (_, i) => `${SEG_COLORS[i % SEG_COLORS.length]} ${i * SEG_DEG}deg ${(i + 1) * SEG_DEG}deg`,
).join(", ")})`;

const NOTE_COPY: Record<"used" | "unavailable", string> = {
  used: "Today's spin is already used — come back tomorrow.",
  unavailable: "The wheel is unavailable right now. Try again in a moment.",
};

export function SpinWheel() {
  const snap = useAcademy();
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const pendingPrizeRef = useRef<number | null>(null);
  const fallbackRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      clearTimeout(fallbackRef.current ?? undefined);
    };
  }, []);

  if (snap.status === "anon") {
    const cta = claimCta();
    return (
      <div className="ac-wall">
        <Kicker tone="volt">Daily spin</Kicker>
        <h3>Daily spin is a member reward</h3>
        <p>
          Members spin once per UTC day for {Math.min(...PRIZES)}–{Math.max(...PRIZES)} XP.
        </p>
        <ButtonLink href={cta.href}>{cta.label}</ButtonLink>
      </div>
    );
  }

  const usedToday = snap.spinLast === utcDay();

  const landPrize = () => {
    setSpinning(false);
    if (pendingPrizeRef.current !== null) {
      setPrize(pendingPrizeRef.current);
      pendingPrizeRef.current = null;
    }
  };

  const spin = async () => {
    if (spinning || usedToday || snap.status !== "member") return;
    setNote(null);
    setPrize(null);
    const res = await spinWheel();
    if ("error" in res) {
      setNote(res.error === "used" ? NOTE_COPY.used : NOTE_COPY.unavailable);
      return;
    }
    const idx = Math.max(PRIZES.indexOf(res.prize), 0);
    // Land the segment center under the top pointer, always spinning
    // forward: current heading → segment heading + FULL_TURNS whole turns.
    const current = ((rot % 360) + 360) % 360;
    const target = (360 - idx * SEG_DEG) % 360;
    const delta = (target - current + 360) % 360;
    const nextRot = rot + FULL_TURNS * 360 + delta;

    if (prefersReducedMotion()) {
      setRot(nextRot);
      setPrize(res.prize);
      return;
    }
    pendingPrizeRef.current = res.prize;
    setSpinning(true);
    setRot(nextRot);
    fallbackRef.current = window.setTimeout(() => {
      fallbackRef.current = null;
      landPrize();
    }, SPIN_FALLBACK_MS);
  };

  return (
    <div className="ac-wheel-wrap">
      <div className="ac-wheel-stage">
        <span className="ac-wheel-pointer" aria-hidden="true" />
        <div
          className="ac-wheel"
          data-spinning={spinning ? "true" : "false"}
          aria-hidden="true"
          style={{ position: "relative", background: WHEEL_BG, "--ac-wheel-rot": `${rot}deg` } as CSSProperties}
          onTransitionEnd={() => {
            if (!spinning) return;
            clearTimeout(fallbackRef.current ?? undefined);
            fallbackRef.current = null;
            landPrize();
          }}
        >
          {PRIZES.map((p, i) => (
            <span key={p} style={{ position: "absolute", inset: 0, transform: `rotate(${i * SEG_DEG}deg)` }}>
              <span
                style={{
                  position: "absolute",
                  top: "7%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  letterSpacing: "0.06em",
                  color: "var(--text-hi)",
                }}
              >
                {p}
              </span>
            </span>
          ))}
        </div>
        <span className="ac-wheel-hub" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 14l6-6 6 6" />
            <path d="M6 20l6-6 6 6" />
          </svg>
        </span>
      </div>

      <div role="status" aria-live="polite">
        {prize !== null ? <p className="ac-wheel-prize">+{prize} XP</p> : null}
        {note !== null ? <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)" }}>{note}</p> : null}
      </div>

      <Button
        variant="volt"
        busy={spinning}
        disabled={spinning || usedToday || snap.status !== "member"}
        onClick={() => void spin()}
      >
        {usedToday ? "Come back tomorrow" : spinning ? "Spinning…" : "Spin for XP"}
      </Button>
      <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>
        One spin per UTC day · prizes {Math.min(...PRIZES)}–{Math.max(...PRIZES)} XP
      </p>
    </div>
  );
}
