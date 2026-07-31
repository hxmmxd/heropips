import { Skeleton } from "@heropips/ui";

export default function SettingsLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }} aria-busy="true" aria-label="Loading settings" role="status">
      <Skeleton style={{ height: 220, borderRadius: "var(--r-lg)" }} />
      <Skeleton style={{ height: 120, borderRadius: "var(--r-lg)" }} />
      <Skeleton style={{ height: 140, borderRadius: "var(--r-lg)" }} />
    </div>
  );
}
