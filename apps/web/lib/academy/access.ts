/* =========================================================================
 * Academy access model — who can EARN where, and what the lock CTA says.
 * Content visibility: `open` lessons ship full text (SEO/AEO); `member`
 * and `pro` lessons ship the first section publicly + an unlock CTA, with
 * the full player living at /app/academy/learn/[slug] behind the session.
 * Launch-mode aware: prelaunch routes locked CTAs to early access; at the
 * public launch flip NEXT_PUBLIC_LAUNCH_MODE=main and CTAs become signup.
 * ======================================================================= */

import type { AcademyAccess, LaunchMode } from "@heropips/contracts";

export const LAUNCH_MODE: LaunchMode =
  (process.env.NEXT_PUBLIC_LAUNCH_MODE as LaunchMode | undefined) ?? "prelaunch";

export type Viewer =
  | { kind: "anon" }
  | { kind: "member"; pro: boolean; displayName: string; userId: string };

/** Can this viewer earn XP / take the quiz on a lesson of this tier? */
export function canEarn(access: AcademyAccess, viewer: Viewer): boolean {
  if (access === "open") return true;
  if (viewer.kind !== "member") return false;
  return access === "member" || viewer.pro;
}

/** Tier chip copy for cards and lesson headers. */
export function tierLabel(access: AcademyAccess): "Free" | "Members" | "Pro" {
  if (access === "open") return "Free";
  return access === "member" ? "Members" : "Pro";
}

export type UnlockCta = { label: string; href: string; sub: string };

/**
 * The one place unlock copy is decided. Prelaunch: member tiers route to
 * early access, pro tiers to Founding Hero. Main launch: signup / upgrade.
 */
export function unlockCta(access: AcademyAccess, mode: LaunchMode = LAUNCH_MODE): UnlockCta {
  if (access === "pro") {
    return {
      label: "Unlock with Founding Hero",
      href: "/founding",
      sub: "Lifetime Pro includes the full Hero track, signals and automation.",
    };
  }
  if (mode === "main") {
    return {
      label: "Create a free account",
      href: "/app/login",
      sub: "Free account unlocks member lessons, streaks and the daily spin.",
    };
  }
  return {
    label: "Join the free launch list",
    href: "/early-access",
    sub: "Academy member tiers are open to early-access members while we build toward public launch.",
  };
}

/** Where the anonymous claim wall sends people to save their XP. */
export function claimCta(mode: LaunchMode = LAUNCH_MODE): UnlockCta {
  if (mode === "main") {
    return {
      label: "Create your free account",
      href: "/app/login",
      sub: "Your XP transfers the moment you sign in.",
    };
  }
  return {
    label: "Join early access",
    href: "/early-access",
    sub: "It claims into your account automatically the moment your early access opens.",
  };
}
