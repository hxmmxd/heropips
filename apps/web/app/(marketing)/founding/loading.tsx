import { Skeleton } from "@heropips/ui";
import styles from "./founding.module.css";

/**
 * Route fallback for /founding.
 *
 * Mirrors the real hero (copy column + price card) using the page's own grid so
 * the swap to real content moves nothing. The previous fallback was a centered
 * spinner in a 50vh box while the page is several screens tall; replacing it
 * shifted the whole document and measured CLS 0.343 on mobile (budget 0.1).
 */
export default function FoundingLoading() {
  return (
    <div className="container section" role="status" aria-label="Loading Founding Hero" style={{ minHeight: "100vh" }}>
      <span className="sr-only">Loading Founding Hero…</span>
      <div className={styles.hero} aria-hidden="true">
        <div>
          <Skeleton style={{ width: 200, height: 12 }} />
          <Skeleton style={{ width: "min(100%, 460px)", height: 54, marginTop: "var(--sp-4)" }} />
          <Skeleton style={{ width: "100%", height: 14, marginTop: "var(--sp-6)" }} />
          <Skeleton style={{ width: "95%", height: 14, marginTop: 8 }} />
          <Skeleton style={{ width: "70%", height: 14, marginTop: 8 }} />
          <Skeleton style={{ width: "min(100%, 480px)", height: 200, marginTop: "var(--sp-8)" }} />
        </div>
        <Skeleton style={{ width: "100%", height: 380, borderRadius: "var(--r-lg)" }} />
      </div>
    </div>
  );
}
