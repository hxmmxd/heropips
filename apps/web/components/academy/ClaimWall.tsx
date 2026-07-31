"use client";

/* =========================================================================
 * ClaimWall — the anonymous "don't lose your XP" conversion surface.
 *  variant "wall": full-size card (replaces quiz when the free limit hits)
 *  variant "banner": slim horizontal strip for the academy hub
 * Copy routes through claimCta(LAUNCH_MODE) — the single source of truth
 * for where claiming sends people (early access vs. free signup).
 * ======================================================================= */

import Link from "next/link";
import { ACADEMY_XP } from "@heropips/contracts";
import { ButtonLink, Card } from "@heropips/ui";
import { claimCta, LAUNCH_MODE } from "@/lib/academy/access";
import { fmtXp } from "@/lib/academy/xp";
import { useAcademy } from "./AcademyProvider";

/** Limit-aware banked-XP line — "first lesson" vs "first N lessons". */
const BANKED_LINE =
  ACADEMY_XP.ANON_LESSON_LIMIT === 1
    ? "Your first lesson's XP is banked on this device."
    : `Your first ${ACADEMY_XP.ANON_LESSON_LIMIT} lessons' XP is banked on this device.`;

export function ClaimWall({ variant }: { variant: "wall" | "banner" }) {
  const snap = useAcademy();
  /* Members have nothing to claim; while loading, stay silent (no flash). */
  if (snap.status !== "anon") return null;
  const cta = claimCta(LAUNCH_MODE);

  if (variant === "banner") {
    if (!snap.wallActive && snap.xp === 0) return null;
    return (
      <Card
        tone="volt"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--sp-4)",
        }}
      >
        <div style={{ display: "grid", gap: "var(--sp-1)", minWidth: 0 }}>
          <strong>{fmtXp(snap.xp)} XP banked on this device</strong>
          <span style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>
            {cta.sub}
          </span>
        </div>
        <ButtonLink href={cta.href} variant="volt" size="sm">
          {cta.label}
        </ButtonLink>
      </Card>
    );
  }

  return (
    <div className="ac-wall">
      <div className="ac-wall-xp" aria-hidden="true">{fmtXp(snap.xp)} XP</div>
      <h3>Don&apos;t lose your progress</h3>
      <p>
        {BANKED_LINE} {fmtXp(snap.xp)} XP so far — keep it, and unlock the rest of the path. {cta.sub}
      </p>
      <ButtonLink href={cta.href} variant="volt">
        {cta.label}
      </ButtonLink>
      <p>
        <Link href="/app/login">Have an access code? Sign in →</Link>
      </p>
    </div>
  );
}
