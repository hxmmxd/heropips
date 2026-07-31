import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NestFactory } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { createAppModule, rawBodyFastifyAdapter } from "../src/app.module";
import type { BillingConfig } from "../src/common/config";
import { signIpn } from "../src/ipn/signature";
import type { Invoice, InvoiceRequest } from "../src/nowpayments/client";
import { MemRepo } from "./mem-repo";

const CFG: BillingConfig = {
  port: 0,
  databaseUrl: "",
  kafkaBrokers: [],
  npApiUrl: "http://np.local",
  npApiKey: "k",
  npIpnSecret: "test-ipn-secret",
  statusTokenSecret: "test-status-secret",
  publicOrigin: "http://localhost:3000",
  ipnCallbackUrl: "http://billing:4002/v1/billing/ipn",
  ltdPriceUsd: 499,
  ltdSeatCap: 500,
  holdTtlMinutes: 20,
  maxHoldsPerEmail: 2,
  maxHoldsPerIp: 5,
  requireVerifiedCheckout: false,
};

describe("HTTP endpoints (fastify inject, raw-body HMAC)", () => {
  let app: NestFastifyApplication;
  let repo: MemRepo;
  let orderId: string;

  beforeAll(async () => {
    repo = new MemRepo(3);
    const invoices = {
      async createInvoice(req: InvoiceRequest): Promise<Invoice> {
        return { id: "inv_1", invoiceUrl: `http://np.local/invoice/${req.order_id}` };
      },
    };
    app = await NestFactory.create<NestFastifyApplication>(
      createAppModule({ repo, invoices, config: CFG }),
      rawBodyFastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /healthz -> {ok:true}", async () => {
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("POST /v1/founding/checkout -> 200 CheckoutRes; GET seats reflects the hold", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/founding/checkout",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ email: "hero@example.com" }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.order_id).toMatch(/^hp_ltd_[0-9a-f]{12}$/);
    expect(body.invoice_url).toBe(`http://np.local/invoice/${body.order_id}`);
    orderId = body.order_id;

    const seats = await app.inject({ method: "GET", url: "/v1/founding/seats" });
    expect(seats.json()).toEqual({ cap: 3, remaining: 2, held: 1 });

    const status = await app.inject({
      method: "GET",
      url: `/v1/founding/status?token=${encodeURIComponent(body.status_token)}`,
    });
    expect(status.statusCode).toBe(200);
    expect(status.json().order_id).toBe(orderId);

    const bad = await app.inject({ method: "GET", url: "/v1/founding/status?token=nope.nope" });
    expect(bad.statusCode).toBe(401);
    expect(bad.json().error_code).toBe("invalid_token");
  });

  it("POST /v1/billing/ipn with a valid signature over the exact raw bytes -> 200", async () => {
    const body = {
      payment_id: 5551001,
      payment_status: "finished",
      price_amount: 499,
      price_currency: "usd",
      order_id: orderId,
      actually_paid: 499,
      pay_currency: "btc",
    };
    const raw = JSON.stringify(body);
    const res = await app.inject({
      method: "POST",
      url: "/v1/billing/ipn",
      headers: {
        "content-type": "application/json",
        "x-nowpayments-sig": signIpn(body, CFG.npIpnSecret),
      },
      payload: raw,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    const order = await repo.getOrder(orderId);
    expect(order?.paymentStatus).toBe("finished");
    expect(order?.seatState).toBe("granted");
    expect(repo.seatsRow).toEqual({ cap: 3, granted: 1, held: 0 });
  });

  it("POST /v1/billing/ipn duplicate delivery -> 200 {ok:true,duplicate:true}", async () => {
    const body = {
      payment_id: 5551001,
      payment_status: "finished",
      price_amount: 499,
      price_currency: "usd",
      order_id: orderId,
      actually_paid: 499,
      pay_currency: "btc",
    };
    const res = await app.inject({
      method: "POST",
      url: "/v1/billing/ipn",
      headers: {
        "content-type": "application/json",
        "x-nowpayments-sig": signIpn(body, CFG.npIpnSecret),
      },
      payload: JSON.stringify(body),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, duplicate: true });
  });

  it("POST /v1/billing/ipn with a bad signature -> 403 ipn_signature_invalid", async () => {
    const body = {
      payment_id: 5551002,
      payment_status: "failed",
      price_amount: 499,
      price_currency: "usd",
      order_id: orderId,
    };
    const res = await app.inject({
      method: "POST",
      url: "/v1/billing/ipn",
      headers: {
        "content-type": "application/json",
        "x-nowpayments-sig": signIpn({ ...body, payment_id: 666 }, CFG.npIpnSecret),
      },
      payload: JSON.stringify(body),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error_code).toBe("ipn_signature_invalid");

    const missing = await app.inject({
      method: "POST",
      url: "/v1/billing/ipn",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify(body),
    });
    expect(missing.statusCode).toBe(403);
  });

  it("POST /v1/founding/checkout with invalid body -> 422 validation_failed", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/founding/checkout",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ email: "nope" }),
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error_code).toBe("validation_failed");
  });

  it("checkout returns 410 ltd_sold_out once the cap is exhausted", async () => {
    // cap 3: one granted already; take the remaining two, then overflow.
    for (let i = 0; i < 2; i++) {
      const ok = await app.inject({
        method: "POST",
        url: "/v1/founding/checkout",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({ email: `late${i}@example.com` }),
      });
      expect(ok.statusCode).toBe(200);
    }
    const full = await app.inject({
      method: "POST",
      url: "/v1/founding/checkout",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ email: "toolate@example.com" }),
    });
    expect(full.statusCode).toBe(410);
    expect(full.json().error_code).toBe("ltd_sold_out");
  });
});
