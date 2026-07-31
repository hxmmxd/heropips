"use client";

import * as React from "react";
import { Button } from "@heropips/ui";
import { consentGranted, readConsent, writeConsent } from "@/lib/analytics";

/* =========================================================================
 * Compact consent banner — shows only when analytics is configured AND the
 * visitor hasn't chosen yet. Fixed overlay (zero CLS), keyboard operable,
 * safe-area aware. Denied = GA4 stays in Consent Mode denied, Clarity
 * never loads.
 * ======================================================================= */

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

export function ConsentBanner() {
  const [open, setOpen] = React.useState(false);

  // Decided client-side after mount: localStorage is unreachable during SSR
  // and reading it in render would desync hydration.
  React.useEffect(() => {
    if (GA4_ID && readConsent() === null) setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        zIndex: 90,
        width: "min(560px, calc(100vw - 24px))",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "var(--sp-3)",
        padding: "var(--sp-4)",
        background: "var(--surface-2)",
        border: "1px solid var(--border-2)",
        borderRadius: 12,
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35)",
      }}
    >
      <p style={{ margin: 0, flex: "1 1 260px", fontSize: "var(--text-sm)", color: "var(--text-hi)" }}>
        We use privacy-friendly analytics to improve HeroPips. No ads, no data resale.
      </p>
      <div style={{ display: "flex", gap: "var(--sp-2)", flexShrink: 0 }}>
        <Button
          size="sm"
          variant="volt"
          onClick={() => {
            consentGranted();
            setOpen(false);
          }}
        >
          Allow
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            writeConsent("denied");
            setOpen(false);
          }}
        >
          Essential only
        </Button>
      </div>
    </div>
  );
}
