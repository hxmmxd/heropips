import { Skeleton } from "@heropips/ui";

/**
 * Route fallback for /founding/status. Stands in for the eyebrow, headline and
 * the OrderStatusPanel card at roughly their real heights, so settling the real
 * order doesn't shift the page — the previous centered spinner in a 50vh box
 * did (same defect measured at CLS 0.343 on /founding).
 */
export default function FoundingStatusLoading() {
  return (
    <div className="container section" role="status" aria-label="Checking your order" style={{ minHeight: "100vh" }}>
      <span className="sr-only">Checking your order…</span>
      <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: "var(--sp-5)" }} aria-hidden="true">
        <Skeleton style={{ width: 180, height: 12 }} />
        <Skeleton style={{ width: "min(100%, 420px)", height: 46 }} />
        <Skeleton style={{ width: "100%", height: 460, borderRadius: "var(--r-lg)" }} />
      </div>
    </div>
  );
}
