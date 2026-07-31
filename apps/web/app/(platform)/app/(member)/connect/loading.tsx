import { Skeleton } from "@heropips/ui";

export default function ConnectLoading() {
  return (
    <div className="ap-panel" aria-busy="true" aria-label="Loading connections" role="status">
      <div className="ap-panel-head">
        <Skeleton style={{ width: 170, height: 18 }} />
        <div className="ap-panel-side">
          <Skeleton style={{ width: 110, height: 14 }} />
          <Skeleton style={{ width: 80, height: 34, borderRadius: "var(--r-full)" }} />
        </div>
      </div>
      <div style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 40 }} />
        ))}
      </div>
    </div>
  );
}
