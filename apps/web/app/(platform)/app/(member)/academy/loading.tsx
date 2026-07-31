import { Skeleton } from "@heropips/ui";

export default function AcademyLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }} aria-busy="true" aria-label="Loading academy" role="status">
      <Skeleton style={{ height: 220, borderRadius: "var(--r-xl)" }} />
      <Skeleton style={{ height: 72, borderRadius: "var(--r-md)" }} />
      <div className="ac-grid">
        <div className="ac-span-7" style={{ display: "grid", gap: "var(--sp-4)" }}>
          <Skeleton style={{ height: 280, borderRadius: "var(--r-lg)" }} />
          <Skeleton style={{ height: 180, borderRadius: "var(--r-lg)" }} />
        </div>
        <div className="ac-span-5" style={{ display: "grid", gap: "var(--sp-4)" }}>
          <Skeleton style={{ height: 320, borderRadius: "var(--r-lg)" }} />
          <Skeleton style={{ height: 160, borderRadius: "var(--r-lg)" }} />
          <Skeleton style={{ height: 200, borderRadius: "var(--r-lg)" }} />
        </div>
      </div>
    </div>
  );
}
