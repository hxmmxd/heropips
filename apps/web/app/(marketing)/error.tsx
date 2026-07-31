"use client";

import { Button, ButtonLink, Kicker } from "@heropips/ui";
import { LostArt } from "@/components/art/Art";

/**
 * Error boundary for every public route. Marketing pages fetch live data
 * (founding seat counts, queue position, academy progress) on the server, so a
 * cold upstream used to bubble past this group into the global boundary — which
 * renders Next's unstyled default, with no nav, no footer and no way out.
 *
 * Deliberately not `components/app/ErrorState`: that panel is built from the
 * platform shell's `ap-*` surfaces, which do not exist on the marketing side.
 */
export default function MarketingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container section" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center", maxWidth: 560 }} role="alert">
        <LostArt style={{ maxWidth: 460, margin: "0 auto 8px" }} />
        <Kicker style={{ marginBottom: 12 }}>connection · retry safe</Kicker>
        <h1 style={{ fontSize: "clamp(var(--text-3xl), 5vw, var(--text-5xl))", marginBottom: 16 }}>
          That didn&apos;t load.
        </h1>
        <p style={{ color: "var(--text-mid)", marginBottom: 32 }}>
          A service behind this page didn&apos;t answer. Nothing was submitted and nothing was
          charged — retrying is safe.
        </p>
        <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "center", flexWrap: "wrap" }}>
          <Button variant="volt" onClick={reset}>
            Try again
          </Button>
          <ButtonLink href="/" variant="ghost">
            Back home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
