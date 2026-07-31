"use client";

import * as React from "react";
import { isRedeemable, type OrderStatusRes } from "@heropips/contracts";
import { Badge, Button, ButtonLink, Card, Disclaimer, Kicker, LevelLoader } from "@heropips/ui";
import { StatusTimeline } from "./StatusTimeline";
import { track } from "@/lib/analytics";

const TERMINAL: Record<string, true> = { finished: true, failed: true, refunded: true, expired: true };

const SEAT_TONE: Record<OrderStatusRes["seat_state"], "warn" | "profit" | "loss"> = {
  held: "warn",
  granted: "profit",
  released: "loss",
};

const SEAT_LABEL: Record<OrderStatusRes["seat_state"], string> = {
  held: "Seat held",
  granted: "Seat granted",
  released: "Seat released",
};

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)", color: "var(--text-hi)" };

export function OrderStatusPanel({ initial, token }: { initial: OrderStatusRes; token: string }) {
  const [order, setOrder] = React.useState<OrderStatusRes>(initial);
  const [refreshing, setRefreshing] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/founding/status?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      if (res.ok) setOrder((await res.json()) as OrderStatusRes);
    } catch {
      /* keep last snapshot */
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  const terminal = TERMINAL[order.payment_status] === true;

  React.useEffect(() => {
    if (terminal) return;
    const id = setInterval(refresh, 8_000);
    return () => clearInterval(id);
  }, [terminal, refresh]);

  const payable = order.invoice_url !== null && !terminal;
  // `confirmed` is redeemable too — billing verifies against it, so the claim
  // CTA must appear as soon as the chain accepts, not only at `finished`.
  const claimable = isRedeemable(order.payment_status);
  const finished = order.payment_status === "finished";

  // GA4 purchase: exactly once per mount, when the order reaches finished
  // (whether it arrived finished or transitioned while polling).
  const purchaseSent = React.useRef(false);
  React.useEffect(() => {
    if (!finished || purchaseSent.current) return;
    purchaseSent.current = true;
    track("purchase", { transaction_id: order.order_id, currency: "USD", value: order.price_usd });
  }, [finished, order.order_id, order.price_usd]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }} aria-live="polite">
      {claimable ? (
        <Card
          raised
          tone="volt"
          style={{
            padding: "clamp(24px, 4vw, 40px)",
            boxShadow: "var(--glow-volt-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--sp-4)",
          }}
        >
          <Badge tone={order.seat_state === "granted" ? "profit" : "volt"}>
            {order.seat_state === "granted" ? "Granted" : "Payment accepted"}
          </Badge>
          <h2>You are a Founding Hero.</h2>
          <p style={{ color: "var(--text-mid)" }}>
            One of 500, ever. Your lifetime Pro entitlement is locked to{" "}
            <span style={mono}>{order.email}</span> — claim it with that address.
          </p>
          <div>
            <Kicker tone="volt" style={{ marginBottom: "var(--sp-2)" }}>Claim it now</Kicker>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--sp-2)", color: "var(--text-mid)" }}>
              <li>→ The claim link below carries your order id and email, so there is nothing to retype.</li>
              <li>→ The live platform and the HeroPips Learn Academy unlock the moment you redeem.</li>
              <li>→ Founding badge and profile flair, permanent.</li>
            </ul>
          </div>
          <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
            <ButtonLink href={`/app/redeem?token=${encodeURIComponent(token)}`} variant="volt">
              Claim your seat →
            </ButtonLink>
            <ButtonLink href="/app/login" variant="ghost">
              Already redeemed? Sign in
            </ButtonLink>
          </div>
        </Card>
      ) : null}

      {order.payment_status === "partially_paid" ? (
        <Card
          style={{
            padding: "var(--sp-5)",
            background: "var(--warn-tint)",
            border: "1px solid color-mix(in srgb, var(--warn-400) 40%, transparent)",
          }}
          role="status"
        >
          <div style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-semibold)", color: "var(--warn-400)", marginBottom: 4 }}>
            Partial payment received
          </div>
          <div style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)" }}>
            Complete the remainder from your invoice — your seat stays held until the hold expires.
            {order.actually_paid !== null ? (
              <>
                {" "}Paid so far: <span style={mono}>{order.actually_paid} {order.pay_currency ?? ""}</span>.
              </>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card raised style={{ padding: "clamp(24px, 4vw, 40px)", display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--sp-3)", flexWrap: "wrap" }}>
          <div>
            <Kicker>Order</Kicker>
            <div style={{ ...mono, fontSize: "var(--text-md)" }}>{order.order_id}</div>
          </div>
          <Badge tone={SEAT_TONE[order.seat_state]}>{SEAT_LABEL[order.seat_state]}</Badge>
        </div>

        <StatusTimeline status={order.payment_status} />

        {order.payment_status === "waiting" || order.payment_status === "confirming" ? (
          <LevelLoader size="sm" label="Waiting for network confirmation…" showLabel />
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--sp-4)" }}>
          <div>
            <Kicker>Price</Kicker>
            <div style={{ ...mono, fontSize: "var(--text-lg)" }}>${order.price_usd} USD</div>
          </div>
          {order.actually_paid !== null ? (
            <div>
              <Kicker>Paid</Kicker>
              <div style={{ ...mono, fontSize: "var(--text-lg)" }}>
                {order.actually_paid} {order.pay_currency ?? ""}
              </div>
            </div>
          ) : null}
          <div>
            <Kicker>Updated</Kicker>
            <div style={{ ...mono, fontSize: "var(--text-sm)" }}>{new Date(order.updated_at).toLocaleString()}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
          {payable && order.invoice_url ? (
            <ButtonLink href={order.invoice_url} variant="volt">
              Open invoice
            </ButtonLink>
          ) : null}
          <Button variant="ghost" onClick={() => void refresh()} disabled={refreshing} aria-busy={refreshing} busy={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {order.payment_status === "expired" ? (
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>
            This hold expired before payment completed. Seats permitting, you can{" "}
            <a href="/founding">reserve again</a>.
          </div>
        ) : null}
        {order.payment_status === "failed" ? (
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>
            Payment failed. No funds were captured on our side —{" "}
            <a href="/founding">start a fresh checkout</a>.
          </div>
        ) : null}
        {order.payment_status === "refunded" ? (
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>
            This order was refunded. The seat has returned to the pool.
          </div>
        ) : null}

        <Disclaimer />
      </Card>
    </div>
  );
}
