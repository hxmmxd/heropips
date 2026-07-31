"use client";

import * as React from "react";
import { LTD, type CheckoutRes, type ApiError } from "@heropips/contracts";
import { Button, ButtonLink, Card, Disclaimer, Input, Kicker, Badge } from "@heropips/ui";
import { FormField } from "./FormField";
import { track } from "@/lib/analytics";

type Phase = "idle" | "loading" | "redirecting" | "soldout";

export function CheckoutCard({ defaultRef }: { defaultRef?: string }) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<CheckoutRes | null>(null);
  const [email, setEmail] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhase("loading");
    try {
      const body: Record<string, string> = { email: email.trim() };
      const code = (defaultRef ?? "").trim().toUpperCase();
      if (/^[A-Z0-9]{4,12}$/.test(code)) body.ref = code;
      const res = await fetch("/api/founding/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as CheckoutRes | ApiError;
      if (res.status === 410) {
        setPhase("soldout");
        return;
      }
      if (!res.ok) {
        const err = json as ApiError;
        setError(err.message || "Checkout failed. Try again.");
        setPhase("idle");
        return;
      }
      const ok = json as CheckoutRes;
      setOrder(ok);
      setPhase("redirecting");
      track("begin_checkout", { currency: "USD", value: typeof ok.price_usd === "number" ? ok.price_usd : 499 });
      window.location.assign(ok.invoice_url);
    } catch {
      setError("Network error. Check your connection and try again.");
      setPhase("idle");
    }
  }

  if (phase === "soldout") {
    return (
      <Card raised style={{ padding: "clamp(24px, 4vw, 40px)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }} aria-live="polite">
        <Badge tone="loss">Sold out</Badge>
        <h3>All 500 Founding Hero seats are gone.</h3>
        <p style={{ color: "var(--text-mid)" }}>
          There will never be another lifetime deal. Join the free launch list for launch
          pricing and invites.
        </p>
        <ButtonLink href="/early-access" variant="volt" size="lg" style={{ alignSelf: "flex-start" }}>
          Join the free launch list
        </ButtonLink>
        <Disclaimer />
      </Card>
    );
  }

  if (phase === "redirecting" && order) {
    const statusHref = `/founding/status?token=${encodeURIComponent(order.status_token)}`;
    return (
      <Card raised style={{ padding: "clamp(24px, 4vw, 40px)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }} aria-live="polite">
        <Badge tone="volt">Seat held</Badge>
        <h3>Sending you to the crypto invoice…</h3>
        <p style={{ color: "var(--text-mid)" }}>
          Your seat is held until{" "}
          <span className="mono" style={{ color: "var(--text-hi)" }}>
            {new Date(order.expires_at).toLocaleTimeString()}
          </span>
          . If nothing happens, use the links below.
        </p>
        <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
          <ButtonLink href={order.invoice_url} variant="volt">
            Open invoice
          </ButtonLink>
          <ButtonLink href={statusHref} variant="ghost">
            Track order status
          </ButtonLink>
        </div>
        <Disclaimer />
      </Card>
    );
  }

  const loading = phase === "loading";
  return (
    <Card raised style={{ padding: "clamp(24px, 4vw, 40px)" }}>
      <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
        <Kicker tone="volt">Founding checkout · $499 one-time</Kicker>
        <FormField
          label="Email"
          htmlFor="fh-email"
          hint="Your invoice, receipt and launch access land here."
          error={error}
        >
          <Input
            id="fh-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            invalid={Boolean(error)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "fh-email-error" : undefined}
          />
        </FormField>
        <Button type="submit" variant="volt" size="lg" disabled={loading} aria-busy={loading} busy={loading}>
          {loading ? "Holding your seat…" : "Reserve seat & pay"}
        </Button>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>
          USDT by default — 300+ coins supported on the invoice. Seat held for {LTD.HOLD_TTL_MINUTES} minutes while you pay.
        </div>
        <div aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          {loading ? "Reserving your seat" : ""}
        </div>
        <Disclaimer />
      </form>
    </Card>
  );
}
