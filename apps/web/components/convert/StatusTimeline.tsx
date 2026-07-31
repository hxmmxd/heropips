import * as React from "react";
import type { PaymentStatus } from "@heropips/contracts";

const LADDER: readonly { key: PaymentStatus; num: string; label: string }[] = [
  { key: "waiting", num: "01", label: "Waiting for payment" },
  { key: "confirming", num: "02", label: "Confirming on-chain" },
  { key: "confirmed", num: "03", label: "Payment confirmed" },
  { key: "sending", num: "04", label: "Settling" },
  { key: "finished", num: "05", label: "Seat locked" },
];

const TERMINAL_BAD: Record<string, true> = { failed: true, refunded: true, expired: true };

/** Vertical payment ladder drawn in the landing-pipeline vocabulary: mono
 *  step numbers in tinted square nodes. Done/current = volt, upcoming = neutral.
 *  partially_paid sits at "confirming"; failed/refunded/expired dim the whole ladder. */
export function StatusTimeline({ status }: { status: PaymentStatus }) {
  const dead = TERMINAL_BAD[status] === true;
  const effective: PaymentStatus = status === "partially_paid" ? "confirming" : status;
  const idx = dead ? -1 : LADDER.findIndex((s) => s.key === effective);

  return (
    <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 0 }}>
      {LADDER.map((step, i) => {
        const done = idx >= 0 && (i < idx || (i === idx && effective === "finished"));
        const current = !done && i === idx;
        const lit = done || current;
        return (
          <li key={step.key} aria-current={current ? "step" : undefined} style={{ display: "flex", gap: "var(--sp-3)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  width: 32,
                  height: 32,
                  borderRadius: "var(--r-sm)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-semibold)",
                  background: lit ? "var(--volt-tint)" : "transparent",
                  border: lit
                    ? `1px solid color-mix(in srgb, var(--volt-400) ${current ? "55%" : "32%"}, transparent)`
                    : "1px solid var(--border-2)",
                  color: lit ? "var(--volt-400)" : "var(--text-low)",
                  boxShadow: current ? "var(--glow-volt)" : "none",
                  flexShrink: 0,
                }}
              >
                {step.num}
              </span>
              {i < LADDER.length - 1 ? (
                <span
                  aria-hidden="true"
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 18,
                    margin: "4px 0",
                    borderRadius: "var(--r-full)",
                    background: done
                      ? "color-mix(in srgb, var(--volt-400) 45%, transparent)"
                      : "var(--border-1)",
                  }}
                />
              ) : null}
            </div>
            <div style={{ paddingBottom: i < LADDER.length - 1 ? "var(--sp-4)" : 0, paddingTop: 5 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-md)",
                  fontWeight: "var(--weight-semibold)",
                  color: done || current ? "var(--text-hi)" : dead ? "var(--text-low)" : "var(--text-mid)",
                }}
              >
                {step.label}
              </div>
              {current && effective !== "finished" ? (
                <div
                  className="mono"
                  style={{
                    fontSize: "var(--text-2xs)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--volt-400)",
                    marginTop: 2,
                  }}
                >
                  In progress
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
