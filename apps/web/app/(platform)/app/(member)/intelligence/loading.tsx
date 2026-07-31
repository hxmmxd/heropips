import { Skeleton } from "@heropips/ui";

export default function IntelligenceLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }} aria-busy="true" aria-label="Loading intelligence" role="status">
      {[0, 1].map((i) => (
        <div className="ap-signal" key={i}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Skeleton style={{ width: 84, height: 20 }} />
            <Skeleton style={{ width: 52, height: 20, borderRadius: "var(--r-full)" }} />
            <Skeleton style={{ width: 140, height: 4, borderRadius: "var(--r-full)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <Skeleton style={{ height: 34 }} />
            <Skeleton style={{ height: 34 }} />
            <Skeleton style={{ height: 34 }} />
          </div>
          <Skeleton style={{ width: "70%", height: 14 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Skeleton style={{ width: 110, height: 36, borderRadius: "var(--r-full)" }} />
            <Skeleton style={{ width: 150, height: 10, marginLeft: "auto" }} />
          </div>
        </div>
      ))}
      <Skeleton style={{ height: 240, borderRadius: "var(--r-lg)" }} />
    </div>
  );
}
