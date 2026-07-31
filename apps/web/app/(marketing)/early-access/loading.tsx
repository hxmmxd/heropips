import { Skeleton } from "@heropips/ui";
import styles from "./early-access.module.css";

/**
 * Route fallback for /early-access.
 *
 * It reuses the page's own hero grid classes so the swap to real content moves
 * nothing. The previous fallback was a centered spinner in a 50vh box while the
 * real page is several screens tall — replacing it shifted the whole document
 * and measured CLS 0.343 on mobile (budget is 0.1). Shapes below stand in for
 * the eyebrow, headline, lede, live counters, trust row, gate art and the claim
 * card, in the same two-column geometry.
 */
export default function EarlyAccessLoading() {
  return (
    <section className={styles.hero} role="status" aria-label="Loading early access" style={{ minHeight: "100vh" }}>
      <span className="sr-only">Loading early access…</span>
      <div className={`container ${styles.heroGrid}`} aria-hidden="true">
        <div>
          <Skeleton style={{ width: 180, height: 12 }} />
          <Skeleton style={{ width: "min(100%, 440px)", height: 52, marginTop: 20 }} />
          <Skeleton style={{ width: "min(100%, 380px)", height: 52, marginTop: 10 }} />
          <Skeleton style={{ width: "100%", height: 14, marginTop: 24 }} />
          <Skeleton style={{ width: "94%", height: 14, marginTop: 8 }} />
          <Skeleton style={{ width: "72%", height: 14, marginTop: 8 }} />
          <div style={{ display: "flex", gap: "var(--sp-6)", marginTop: "var(--sp-7)" }}>
            <Skeleton style={{ width: 92, height: 52 }} />
            <Skeleton style={{ width: 92, height: 52 }} />
            <Skeleton style={{ width: 92, height: 52 }} />
          </div>
          <Skeleton style={{ width: "min(100%, 340px)", height: 12, marginTop: "var(--sp-6)" }} />
          <Skeleton style={{ width: "min(100%, 520px)", height: 210, marginTop: "var(--sp-8)" }} />
        </div>
        <div className={styles.heroCardCol}>
          <Skeleton style={{ width: "100%", height: 470, borderRadius: "var(--r-lg)" }} />
        </div>
      </div>
    </section>
  );
}
