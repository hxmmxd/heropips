import { Skeleton } from "@heropips/ui";

export default function PositionsLoading() {
  return (
    <div className="ap-panel" aria-busy="true" aria-label="Loading positions" role="status">
      <div className="ap-panel-head">
        <Skeleton style={{ width: 140, height: 18 }} />
      </div>
      <div style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ height: 40 }} />
        ))}
      </div>
    </div>
  );
}
