"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAcademy } from "@/components/academy/AcademyProvider";

/**
 * The member dashboard is server-rendered from growth progress; when the
 * client store claims device-banked XP after first paint (sync), the hero
 * ring/leaderboard/resume strip are stale. Re-render server components
 * exactly once per claim.
 */
export function ClaimRefresh() {
  const { claimSeq } = useAcademy();
  const router = useRouter();
  const seen = useRef(0);
  useEffect(() => {
    if (claimSeq > seen.current) {
      seen.current = claimSeq;
      router.refresh();
    }
  }, [claimSeq, router]);
  return null;
}
