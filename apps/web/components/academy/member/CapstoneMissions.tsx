"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Skeleton } from "@heropips/ui";
import { getSnapshot, refreshProgress } from "@/lib/academy/store";

/* =========================================================================
 * Paper-trading capstone card. Missions come from the member's REAL trading
 * account via /api/academy/capstone — nothing here is self-reported. When
 * the route reports a fresh completion, the store re-syncs so the HUD and
 * ring pick up the awarded XP without a reload.
 * ======================================================================= */

type Mission = { id: string; label: string; done: boolean };
type CapstoneRes = { missions: Mission[]; completed: boolean };

const CAPSTONE_SLUG = "paper-trading-capstone";

type State = { status: "loading" } | { status: "error" } | ({ status: "ready" } & CapstoneRes);

export function CapstoneMissions() {
  const [state, setState] = React.useState<State>({ status: "loading" });

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/academy/capstone", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as CapstoneRes;
        if (!alive) return;
        setState({ status: "ready", ...data });
        // Completed flipped true on this very check → pull the award into the store.
        if (data.completed && getSnapshot().completions[CAPSTONE_SLUG] === undefined) {
          void refreshProgress();
        }
      } catch {
        if (alive) setState({ status: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="ap-panel" aria-label="Paper-trading capstone" style={{ display: "grid", gap: "var(--sp-3)" }}>
      <div className="ap-panel-head">
        <h2 className="ap-panel-title">Capstone missions</h2>
        {state.status === "ready" && state.completed ? (
          <span className="ap-panel-side">
            <Badge tone="profit">Verified</Badge>
          </span>
        ) : null}
      </div>

      {state.status === "loading" ? (
        <div style={{ display: "grid", gap: "var(--sp-2)" }} aria-busy="true" aria-label="Checking your paper account" role="status">
          <Skeleton style={{ height: 52, borderRadius: "var(--r-md)" }} />
          <Skeleton style={{ height: 52, borderRadius: "var(--r-md)" }} />
        </div>
      ) : state.status === "error" ? (
        <p className="ap-note" role="status">
          Couldn&apos;t reach your trading account just now — reload to re-check your missions.
        </p>
      ) : (
        <>
          <div className="ac-missions">
            {state.missions.map((m, i) => (
              <div key={m.id} className="ac-mission" data-done={m.done}>
                <span className="ac-mission-check" aria-hidden="true">
                  {m.done ? "✓" : i + 1}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "var(--text-hi)", fontSize: "var(--text-sm)" }}>{m.label}</div>
                  {m.id === "paper-connect" && !m.done ? (
                    <Link href="/app/connect" style={{ fontSize: "var(--text-sm)" }}>
                      Open a paper account →
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <p className="ap-note">Missions verified automatically from your paper account.</p>
        </>
      )}
    </section>
  );
}
