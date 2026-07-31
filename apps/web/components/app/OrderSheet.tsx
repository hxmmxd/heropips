"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  OrderRes,
  SYMBOLS,
  type ConnectionRes,
  type SignalRes,
} from "@heropips/contracts";
import { Button, ButtonLink, Input, Kicker } from "@heropips/ui";
import { fmtPrice } from "@/components/app/format";
import { IconClose } from "@/components/app/icons";
import { useSheet } from "@/components/app/useSheet";

type Phase =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "filled"; price: number; qty: number }
  | { kind: "blocked"; reason: string }
  | { kind: "failed"; message: string };

/** "Trade this" → pre-filled order sheet. Risk % sizing defaults to 1%. */
export function TradeThisButton({ signal, connections }: { signal: SignalRes; connections: ConnectionRes[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>({ kind: "form" });
  const [sizing, setSizing] = React.useState<"risk" | "qty">("risk");
  const idemRef = React.useRef<string>("");
  const sheetRef = React.useRef<HTMLDivElement>(null);

  // Escape/scroll-lock/focus-trap; a submitting order must not be dismissed.
  useSheet(open, () => phase.kind !== "submitting" && setOpen(false), sheetRef);

  const usable = connections.filter((c) => c.status === "active");
  const precision = SYMBOLS[signal.symbol].precision;

  function openSheet() {
    idemRef.current = crypto.randomUUID();
    setPhase({ kind: "form" });
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const stop = Number(form.get("stop"));
    const body: Record<string, unknown> = {
      connection_id: String(form.get("connection_id") ?? ""),
      symbol: signal.symbol,
      side: signal.side,
      type: "market",
      stop: Number.isFinite(stop) && stop > 0 ? stop : undefined,
      signal_id: signal.id,
      idempotency_key: idemRef.current,
    };
    if (sizing === "risk") body.risk_pct = Number(form.get("risk_pct"));
    else body.qty = Number(form.get("qty"));

    setPhase({ kind: "submitting" }); // optimistic: sheet locks into pending state
    try {
      const res = await fetch("/api/app/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        const order = OrderRes.parse(json);
        if (order.status === "filled" && order.fill) {
          setPhase({ kind: "filled", price: order.fill.price, qty: order.fill.qty });
          router.refresh();
          return;
        }
        if (order.status === "blocked_by_guard") {
          setPhase({ kind: "blocked", reason: order.reason ?? "Trade Guard blocked this order." });
          return;
        }
        setPhase({ kind: "failed", message: order.reason ?? "Order rejected." });
        return;
      }
      const parsed = ApiError.safeParse(json);
      setPhase({ kind: "failed", message: parsed.success ? parsed.data.message : "Order failed. Try again." });
    } catch {
      setPhase({ kind: "failed", message: "Network error — the order was NOT confirmed. Check Positions before retrying." });
    }
  }

  return (
    <>
      <Button size="sm" onClick={openSheet}>Trade this</Button>
      {open ? (
        <>
          <div className="ap-sheet-backdrop" onClick={() => phase.kind !== "submitting" && setOpen(false)} aria-hidden />
          <div className="ap-sheet" role="dialog" aria-modal="true" aria-label={`Trade ${signal.symbol}`} ref={sheetRef} tabIndex={-1}>
            <div className="ap-sheet-head">
              <div>
                <Kicker tone="volt">order · market</Kicker>
                <h2 className="ap-sheet-title">
                  {signal.side === "buy" ? "Buy" : "Sell"} {signal.symbol}
                </h2>
              </div>
              <span className={`ap-pill ap-pill--${signal.side}`}>{signal.side}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={phase.kind === "submitting"}
                aria-label="Close"
                style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-mid)", cursor: "pointer", minWidth: 44, minHeight: 44 }}
              >
                <IconClose size={20} />
              </button>
            </div>

            <div aria-live="polite">
              {phase.kind === "filled" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                  <p className="ap-form-ok">
                    Filled {phase.qty} {signal.symbol} @ {fmtPrice(signal.symbol, phase.price)}.
                  </p>
                  <div className="ap-actions">
                    <ButtonLink href="/app/positions" size="sm">View position</ButtonLink>
                    <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Done</Button>
                  </div>
                </div>
              ) : phase.kind === "blocked" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                  <p className="ap-form-error" role="alert">Trade Guard blocked this order: {phase.reason}</p>
                  <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                  {phase.kind === "failed" ? (
                    <p className="ap-form-error" role="alert">{phase.message}</p>
                  ) : null}

                  {usable.length === 0 ? (
                    <div className="ap-empty" style={{ padding: 0 }}>
                      <p>You need an active connection first.</p>
                      <ButtonLink href="/app/connect" size="sm">Connect a broker</ButtonLink>
                    </div>
                  ) : (
                    <>
                      <div className="ap-field">
                        <label htmlFor={`conn-${signal.id}`}>Connection</label>
                        <select
                          id={`conn-${signal.id}`}
                          name="connection_id"
                          required
                          defaultValue={usable[0]?.id}
                          style={{
                            height: "var(--ctl-md)", width: "100%", padding: "0 12px",
                            background: "var(--surface-2)", color: "var(--text-hi)",
                            border: "1px solid var(--border-2)", borderRadius: "var(--r-md)",
                            fontSize: "var(--text-md)", fontFamily: "var(--font-body)",
                          }}
                        >
                          {usable.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label} ({c.broker}, {c.mode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="ap-field">
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-hi)" }}>
                          Sizing
                        </span>
                        <div className="ap-actions" role="radiogroup" aria-label="Sizing mode">
                          <Button type="button" size="sm" variant={sizing === "risk" ? "outline" : "ghost"}
                            role="radio" aria-checked={sizing === "risk"} onClick={() => setSizing("risk")}>
                            Risk %
                          </Button>
                          <Button type="button" size="sm" variant={sizing === "qty" ? "outline" : "ghost"}
                            role="radio" aria-checked={sizing === "qty"} onClick={() => setSizing("qty")}>
                            Quantity
                          </Button>
                        </div>
                      </div>

                      {sizing === "risk" ? (
                        <div className="ap-field">
                          <label htmlFor={`risk-${signal.id}`}>Risk % of equity</label>
                          <Input id={`risk-${signal.id}`} name="risk_pct" type="number" mono
                            defaultValue={1} min={0.1} max={2} step={0.1} required inputMode="decimal"
                            aria-describedby={`risk-hint-${signal.id}`} />
                          <p className="ap-field-hint" id={`risk-hint-${signal.id}`}>
                            Trade Guard sizes the position so a stop-out loses this much. 0.1–2%.
                          </p>
                        </div>
                      ) : (
                        <div className="ap-field">
                          <label htmlFor={`qty-${signal.id}`}>Quantity</label>
                          <Input id={`qty-${signal.id}`} name="qty" type="number" mono
                            min={0} step="any" required inputMode="decimal" />
                        </div>
                      )}

                      <div className="ap-field">
                        <label htmlFor={`stop-${signal.id}`}>Stop</label>
                        <Input id={`stop-${signal.id}`} name="stop" type="number" mono
                          defaultValue={signal.stop.toFixed(precision)} step="any" required={sizing === "risk"}
                          inputMode="decimal" />
                        <p className="ap-field-hint">Pre-filled from the signal. Required for risk-% sizing.</p>
                      </div>

                      <Button type="submit" disabled={phase.kind === "submitting"} aria-busy={phase.kind === "submitting"} busy={phase.kind === "submitting"}>
                        {phase.kind === "submitting" ? "Submitting…" : `Submit market ${signal.side}`}
                      </Button>
                      <p className="ap-note">
                        Market order on your own account. Self-directed — HeroPips never holds funds.
                      </p>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

