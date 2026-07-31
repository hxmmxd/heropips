"use client";

/* =========================================================================
 * AcademyProvider — thin React binding over the academy client store.
 * The store (lib/academy/store.ts) is framework-free; components read it
 * through useAcademy(), and XpHud — the one runtime mount per page —
 * kicks server hydration once via useAcademyHydration().
 * ======================================================================= */

import { useEffect, useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  hydrateProgress,
  subscribe,
  type AcademySnapshot,
} from "@/lib/academy/store";

/** Live academy snapshot — safe in any client component. */
export function useAcademy(): AcademySnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Fire membership/server hydration once on mount. Idempotent on the store
 * side (concurrent calls share one in-flight fetch), so nested mounts are
 * harmless — but by convention only XpHud calls this.
 */
export function useAcademyHydration(): void {
  useEffect(() => {
    void hydrateProgress();
  }, []);
}
