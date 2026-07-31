"use client";

import * as React from "react";
import type { SeatsRes } from "@heropips/contracts";
import { ProgressBar, Skeleton } from "@heropips/ui";

/** Live Founding Hero seats bar. Server passes the first snapshot; polls /api/founding/seats every 10s. */
export function SeatsMeter({ initial }: { initial: SeatsRes | null }) {
  const [seats, setSeats] = React.useState<SeatsRes | null>(initial);

  React.useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/founding/seats", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as SeatsRes;
        if (alive) setSeats(json);
      } catch {
        /* keep last snapshot */
      }
    };
    if (!initial) void tick();
    const id = setInterval(tick, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [initial]);

  if (!seats) {
    return (
      <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
        <Skeleton style={{ height: 12, width: "100%" }} />
        <Skeleton style={{ height: 14, width: 180 }} />
      </div>
    );
  }

  const taken = Math.max(0, seats.cap - seats.remaining);

  return (
    <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
      <ProgressBar
        variant="volt"
        value={taken}
        max={seats.cap}
        label={`${taken} of ${seats.cap} founding seats claimed or on hold`}
      />
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--sp-3)", flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: "var(--text-sm)", color: "var(--text-hi)" }}>
          <strong style={{ color: "var(--volt-400)" }}>{seats.remaining}</strong> of {seats.cap} remaining
        </span>
        {seats.held > 0 ? (
          <span className="mono" style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>
            {seats.held} on hold right now
          </span>
        ) : null}
      </div>
    </div>
  );
}
