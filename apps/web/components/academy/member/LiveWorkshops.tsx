import type { CSSProperties } from "react";
import { ACADEMY_LIVE } from "@heropips/contracts";
import { LEVELS } from "@/lib/academy/curriculum";

/* =========================================================================
 * Live workshops panel — the live-class unlock economy, server-rendered.
 * Each completed level unlocks that level's monthly live workshop; finishing
 * all levels graduates you into the Hero Council masterclass, free for
 * ACADEMY_LIVE.GRAD_FREE_MONTHS months. States derive purely from the
 * member's completions — no separate entitlement store.
 * ======================================================================= */

const chipStyle = (unlocked: boolean): CSSProperties => ({
  flex: "none",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-2xs)",
  letterSpacing: "var(--track-caps)",
  textTransform: "uppercase",
  color: unlocked ? "var(--volt-400)" : "var(--text-mid)",
  border: `1px solid ${unlocked ? "var(--volt-400)" : "var(--border-1)"}`,
  borderRadius: "var(--r-full)",
  padding: "var(--sp-1) var(--sp-2)",
});

export function LiveWorkshops({ completions }: { completions: Record<string, unknown> }) {
  const rows = LEVELS.map((level) => {
    const done = level.lessons.filter((l) => completions[l.slug] !== undefined).length;
    return { level, done, total: level.lessons.length, unlocked: done === level.lessons.length };
  });
  const graduated = rows.every((r) => r.unlocked);

  return (
    <section className="ap-panel" aria-label="Live workshops" style={{ display: "grid", gap: "var(--sp-3)" }}>
      <div className="ap-panel-head">
        <h2 className="ap-panel-title">Live workshops</h2>
      </div>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)", lineHeight: "var(--leading-body)" }}>
        Every level you complete unlocks that level&apos;s monthly live workshop.
      </p>

      <div style={{ display: "grid", gap: "var(--sp-2)" }}>
        {rows.map(({ level, done, total, unlocked }) => (
          <div
            key={level.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "center",
              gap: "var(--sp-3)",
              minHeight: "var(--ctl-md)",
              borderBottom: "1px solid var(--border-1)",
              paddingBottom: "var(--sp-2)",
            }}
          >
            <div style={{ minWidth: 0, display: "grid", gap: "2px" }}>
              <span
                style={{
                  color: "var(--text-hi)",
                  fontSize: "var(--text-sm)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Level {level.number} workshop — {level.name}
              </span>
              {unlocked ? null : (
                <span className="ap-note" style={{ fontSize: "var(--text-2xs)" }}>
                  Complete Level {level.number} to unlock its monthly live workshop.
                </span>
              )}
            </div>
            <span style={chipStyle(unlocked)}>
              {unlocked ? "Unlocked" : <span className="num">{done}/{total}</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Hero Council — the graduation prize */}
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
          <span
            style={{
              color: "var(--volt-400)",
              fontFamily: "var(--font-display)",
              fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
            }}
          >
            Hero Council
          </span>
          {graduated ? <span style={chipStyle(true)}>Graduated</span> : null}
        </div>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)", lineHeight: "var(--leading-body)" }}>
          {graduated
            ? `Graduated — Hero Council free for ${ACADEMY_LIVE.GRAD_FREE_MONTHS} months.`
            : `Finish all ${LEVELS.length} levels to join Hero Council — monthly live market updates, free for ${ACADEMY_LIVE.GRAD_FREE_MONTHS} months.`}
        </p>
        <p className="ap-note">Seats and schedule are announced to early-access members first.</p>
      </div>
    </section>
  );
}
