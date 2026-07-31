import { Skeleton } from "@heropips/ui";

export default function PackagesLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }} aria-busy="true" aria-label="Loading package" role="status">
      <Skeleton style={{ height: 220, borderRadius: "var(--r-lg)" }} />
      <div className="ap-grid-2">
        <Skeleton style={{ height: 180, borderRadius: "var(--r-lg)" }} />
        <Skeleton style={{ height: 180, borderRadius: "var(--r-lg)" }} />
      </div>
    </div>
  );
}
