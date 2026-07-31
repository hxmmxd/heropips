"use client";

import * as React from "react";
import type { AcademyCertRes, AcademyCertTrack } from "@heropips/contracts";
import { Button, ButtonLink, ProgressBar } from "@heropips/ui";
import { refreshProgress } from "@/lib/academy/store";

/* =========================================================================
 * Certificate claim card. The SERVER page computes thin per-track rows
 * (no curriculum content ever reaches this client bundle); a claim POSTs
 * the track, then re-syncs the store. Growth issuance is idempotent, so
 * double-clicks cannot mint duplicates.
 * ======================================================================= */

export type CertTrackRow = {
  id: AcademyCertTrack;
  name: string;
  done: number;
  total: number;
  complete: boolean;
};

export function CertClaim({
  tracks,
  certificates,
}: {
  tracks: CertTrackRow[];
  certificates: AcademyCertRes[];
}) {
  const [claimed, setClaimed] = React.useState<Partial<Record<AcademyCertTrack, boolean>>>({});
  const [busy, setBusy] = React.useState<AcademyCertTrack | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function claim(track: AcademyCertTrack) {
    setBusy(track);
    setError(null);
    try {
      const res = await fetch("/api/academy/certificates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ track }),
      });
      if (!res.ok) {
        setError("The claim didn't go through — refresh and try again.");
        return;
      }
      setClaimed((c) => ({ ...c, [track]: true }));
      void refreshProgress();
    } catch {
      setError("The claim didn't go through — refresh and try again.");
    } finally {
      setBusy(null);
    }
  }

  const levelTracks = tracks.filter((t) => t.id !== "hero-trader");
  const heroTrack = tracks.find((t) => t.id === "hero-trader");

  function action(track: CertTrackRow, complete: boolean, owned: boolean) {
    if (owned) {
      return (
        <ButtonLink variant="outline" size="sm" href="/app/academy/certificates" style={{ minHeight: "var(--ctl-md)" }}>
          View
        </ButtonLink>
      );
    }
    if (complete) {
      return (
        <Button
          variant="volt"
          size="sm"
          busy={busy === track.id}
          onClick={() => void claim(track.id)}
          style={{ minHeight: "var(--ctl-md)" }}
        >
          Claim
        </Button>
      );
    }
    return null;
  }

  return (
    <section className="ap-panel" aria-label="Certificates" style={{ display: "grid", gap: "var(--sp-3)" }}>
      <div className="ap-panel-head">
        <h2 className="ap-panel-title">Certificates</h2>
        <span className="ap-panel-side ap-note num">{tracks.length} total</span>
      </div>
      <div style={{ display: "grid", gap: "var(--sp-2)" }}>
        {levelTracks.map((track, i) => {
          const owned = claimed[track.id] === true || certificates.some((c) => c.track === track.id);
          return (
            <div
              key={track.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr) auto",
                alignItems: "center",
                gap: "var(--sp-3)",
                minHeight: "var(--ctl-md)",
                borderBottom: i < levelTracks.length - 1 ? "1px solid var(--border-1)" : "none",
                paddingBottom: i < levelTracks.length - 1 ? "var(--sp-2)" : 0,
              }}
            >
              <span
                className="num"
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: owned ? "var(--volt-400)" : "var(--text-mid)",
                  border: "1px solid var(--border-1)",
                  borderRadius: "var(--r-sm)",
                  padding: "var(--sp-1) var(--sp-2)",
                }}
              >
                L{i}
              </span>
              <div style={{ minWidth: 0, display: "grid", gap: "var(--sp-1)" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "var(--sp-2)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-hi)",
                      fontFamily: "var(--font-display)",
                      fontWeight: "var(--weight-semibold)" as React.CSSProperties["fontWeight"],
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {track.name}
                  </span>
                  <span className="ap-note num" style={{ flex: "none" }}>
                    {owned ? "Earned" : `${track.done}/${track.total}`}
                  </span>
                </div>
                {!owned && !track.complete ? (
                  <ProgressBar value={track.done} max={track.total} label={`${track.name}: ${track.done} of ${track.total} lessons`} />
                ) : null}
              </div>
              {action(track, track.complete, owned)}
            </div>
          );
        })}
      </div>

      {heroTrack ? (() => {
        const owned = claimed["hero-trader"] === true || certificates.some((c) => c.track === "hero-trader");
        return (
          <div
            style={{
              border: "1px solid var(--border-1)",
              borderRadius: "var(--r-md)",
              background: "var(--surface-2)",
              padding: "var(--sp-4)",
              display: "grid",
              gap: "var(--sp-2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-3)", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "var(--volt-400)",
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--weight-semibold)" as React.CSSProperties["fontWeight"],
                  }}
                >
                  {heroTrack.name}
                </div>
                <div className="ap-note num">
                  {owned ? "Earned — the grand finale" : `${heroTrack.done}/${heroTrack.total} lessons across all 10 levels`}
                </div>
              </div>
              {action(heroTrack, heroTrack.complete, owned)}
            </div>
            {!owned && !heroTrack.complete ? (
              <ProgressBar value={heroTrack.done} max={heroTrack.total} label={`${heroTrack.name}: ${heroTrack.done} of ${heroTrack.total} lessons`} />
            ) : null}
          </div>
        );
      })() : null}

      {error ? (
        <p className="ap-form-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
