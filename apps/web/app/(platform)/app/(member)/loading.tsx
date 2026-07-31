import { Skeleton } from "@heropips/ui";

export default function DashboardLoading() {
  return (
    <>
      <div className="ap-hero ap-hero-skeleton" aria-busy="true" aria-label="Loading dashboard" role="status">
        <Skeleton style={{ width: 64, height: 12 }} />
        <Skeleton style={{ width: 280, maxWidth: "100%", height: 58, margin: "14px 0 12px" }} />
        <Skeleton style={{ width: 160, height: 26, borderRadius: "var(--r-full)" }} />
        <Skeleton style={{ width: "100%", height: 120, marginTop: 20 }} />
        <Skeleton style={{ width: 200, height: 12, marginTop: 24 }} />
      </div>
      <div className="ap-stats">
        {[0, 1, 2, 3].map((i) => (
          <div className="ap-stat" key={i}>
            <Skeleton style={{ width: 90, height: 10 }} />
            <Skeleton style={{ width: 110, height: 24, marginTop: 10 }} />
          </div>
        ))}
      </div>
      <div className="ap-grid-2">
        <Skeleton style={{ height: 220, borderRadius: "var(--r-lg)" }} />
        <Skeleton style={{ height: 220, borderRadius: "var(--r-lg)" }} />
      </div>
    </>
  );
}
