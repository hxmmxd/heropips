import { Skeleton } from "@heropips/ui";

export default function SecurityLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }} aria-busy="true" aria-label="Loading security" role="status">
      <Skeleton style={{ height: 200, borderRadius: "var(--r-lg)" }} />
      <Skeleton style={{ height: 320, borderRadius: "var(--r-lg)" }} />
      <Skeleton style={{ height: 240, borderRadius: "var(--r-lg)" }} />
    </div>
  );
}
