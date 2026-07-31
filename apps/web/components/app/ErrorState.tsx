"use client";

import { Button, Kicker } from "@heropips/ui";
import { EmptyMark, IconClose } from "@/components/app/icons";

/** Shared retry panel for route error boundaries. */
export function ErrorState({ reset, what }: { reset: () => void; what: string }) {
  return (
    <div className="ap-panel">
      <div className="ap-empty" role="alert">
        <EmptyMark />
        <span className="ap-empty-ico" aria-hidden="true" style={{ background: "var(--loss-tint)", color: "var(--loss-400)" }}>
          <IconClose />
        </span>
        <Kicker>connection · retry safe</Kicker>
        <h2 className="ap-empty-title">Couldn&apos;t load {what}</h2>
        <p>The service didn&apos;t answer. Your account and data are fine — this is a connection hiccup.</p>
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
