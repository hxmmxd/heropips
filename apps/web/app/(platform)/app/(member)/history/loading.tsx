import { Skeleton } from "@heropips/ui";

export default function HistoryLoading() {
  return (
    <div className="ap-panel" aria-busy="true" aria-label="Loading trade history" role="status">
      <div className="ap-panel-head">
        <Skeleton style={{ width: 130, height: 18 }} />
        <div className="ap-panel-side">
          <Skeleton style={{ width: 90, height: 30, borderRadius: "var(--r-full)" }} />
        </div>
      </div>
      <div style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} style={{ height: 36 }} />
        ))}
      </div>
    </div>
  );
}
