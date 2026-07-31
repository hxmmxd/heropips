import { Skeleton } from "@heropips/ui";

/**
 * Route fallback for /early-access/status. Matches the eyebrow, headline and
 * status card geometry so resolving the queue position doesn't shift the page,
 * replacing a centered spinner in a 50vh box (the same pattern measured CLS
 * 0.343 on /early-access).
 */
export default function EarlyAccessStatusLoading() {
  return (
    <div className="container section" role="status" aria-label="Checking your place in line" style={{ minHeight: "100vh" }}>
      <span className="sr-only">Checking your place in line…</span>
      <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: "var(--sp-5)" }} aria-hidden="true">
        <Skeleton style={{ width: 170, height: 12 }} />
        <Skeleton style={{ width: "min(100%, 400px)", height: 46 }} />
        <Skeleton style={{ width: "100%", height: 420, borderRadius: "var(--r-lg)" }} />
      </div>
    </div>
  );
}
