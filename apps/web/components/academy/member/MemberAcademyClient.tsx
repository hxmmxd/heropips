"use client";

import * as React from "react";
import { Button } from "@heropips/ui";

/* =========================================================================
 * Small client atoms for member academy surfaces. Server pages stay server-
 * rendered; only these leaves ship interactivity.
 * ======================================================================= */

/** Certificates are print-styled (academy.css @media print) — one click to PDF. */
export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      Print / save PDF
    </Button>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard denied — the visible link can be copied manually */
        }
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
