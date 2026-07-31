import { describe, expect, it } from "vitest";
import type { BillingConfig } from "../src/common/config";
import { ApiException } from "../src/common/errors";
import { FoundingService } from "../src/founding/founding.service";
import { IpnService } from "../src/ipn/ipn.service";
import { signIpn } from "../src/ipn/signature";
import type { Invoice, InvoiceClient, InvoiceRequest } from "../src/nowpayments/client";
import { signStatusToken } from "../src/common/token";
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

class FakeInvoices implements InvoiceClient {
  calls: InvoiceRequest[] = [];
  fail = false;
  async createInvoice(req: InvoiceRequest): Promise<Invoice> {
    this.calls.push(req);
    if (this.fail) throw new Error("np down");
    return { id: `inv_${this.calls.length}`, invoiceUrl: `http://np.local/invoice/${this.calls.length}` };
  }
}

function makeService(cap = 500): { svc: FoundingService; repo: MemRepo; invoices: FakeInvoices } {
  const repo = new MemRepo(cap);
  const invoices = new FakeInvoices();
  return { svc: new FoundingService(repo, invoices, { ...CFG, ltdSeatCap: cap }), repo, invoices };
}

let paymentSeq = 0;
function finishOrder(ipnSvc: IpnService, orderId: string) {
  const body = {
    payment_id: `pay_seat_${++paymentSeq}`,
    payment_status: "finished",
    price_amount: 499,
    price_currency: "usd",
    order_id: orderId,
  };
  return ipnSvc.handle(Buffer.from(JSON.stringify(body), "utf8"), signIpn(body, CFG.npIpnSecret));
}

describe("seat accounting", () => {
  it("500 cap, 600 checkouts -> exactly 500 holds and 100 sold_out; oversell impossible", async () => {
    const { svc, repo } = makeService(500);
    let created = 0;
    let soldOut = 0;
    for (let i = 0; i < 600; i++) {
      try {
        const res = await svc.checkout({ email: `buyer${i}@example.com` });
        expect(res.order_id).toMatch(/^hp_ltd_[0-9a-f]{12}$/);
        created += 1;
      } catch (err) {
        expect(err).toBeInstanceOf(ApiException);
        expect((err as ApiException).getStatus()).toBe(410);
        soldOut += 1;
      }
    }
    expect(created).toBe(500);
    expect(soldOut).toBe(100);
    expect(repo.seatsRow).toEqual({ cap: 500, granted: 0, held: 500 });
    expect(await svc.seats()).toEqual({ cap: 500, remaining: 0, held: 500 });
  });

  it("invoice failure rolls the hold back (no leak) and surfaces 502", async () => {
    const { svc, repo, invoices } = makeService(5);
    invoices.fail = true;
    await expect(svc.checkout({ email: "x@example.com" })).rejects.toMatchObject({
      status: 502,
    });
    expect(repo.seatsRow).toEqual({ cap: 5, granted: 0, held: 0 });
    expect(await svc.seats()).toEqual({ cap: 5, remaining: 5, held: 0 });
  });

  it("hold expiry releases the seat and marks the order expired", async () => {
    const { svc, repo } = makeService(5);
    const res = await svc.checkout({ email: "x@example.com" });
    expect(repo.seatsRow.held).toBe(1);
    expect(repo.eventTypes()).toEqual(["order.created"]);
    const createdEvent = repo.outboxRows[0]!.payload;
    expect(createdEvent.payload).toEqual({
      order_id: res.order_id,
      email: "x@example.com",
      sku: "ltd_founding",
      price_usd: 499,
      expires_at: res.expires_at,
    });

    // Not yet expired: nothing released.
    expect(await repo.expireHolds(new Date())).toBe(0);
    // Past the TTL (20min by contract): released.
    const past = new Date(Date.now() + 121 * 60_000);
    expect(await repo.expireHolds(past)).toBe(1);
    expect(repo.seatsRow).toEqual({ cap: 5, granted: 0, held: 0 });
    expect(repo.eventTypes()).toEqual(["order.created", "order.hold_expired"]);
    expect(repo.outboxRows[1]!.payload.payload).toEqual({
      order_id: res.order_id,
      email: "x@example.com",
    });
    const order = await repo.getOrder(res.order_id);
    expect(order?.seatState).toBe("released");
    expect(order?.paymentStatus).toBe("expired");
    // A released seat is available again.
    await svc.checkout({ email: "y@example.com" });
    expect(repo.seatsRow.held).toBe(1);
  });

  /**
   * M6: unauthenticated checkout could take seats off the shelf faster than
   * they came back, so `remaining` hit 0 and the storefront reported sold out
   * to real buyers. The caps below are what stop that; each one is set so a
   * genuine buyer never meets it.
   */
  it("caps concurrent holds per email (a retrying buyer is fine, a hoarder is not)", async () => {
    const { svc, repo } = makeService(50);
    await svc.checkout({ email: "buyer@example.com" });
    await svc.checkout({ email: "buyer@example.com" }); // retry after switching coin
    await expect(svc.checkout({ email: "buyer@example.com" })).rejects.toMatchObject({ status: 429 });
    expect(repo.seatsRow.held).toBe(2);

    // A different address is unaffected …
    await svc.checkout({ email: "someone-else@example.com" });
    expect(repo.seatsRow.held).toBe(3);

    // … and once a hold expires the address can reserve again.
    expect(await repo.expireHolds(new Date(Date.now() + 21 * 60_000))).toBe(3);
    await expect(svc.checkout({ email: "buyer@example.com" })).resolves.toMatchObject({
      price_usd: 499,
    });
  });

  it("caps hold creations per client IP, and a verified email is exempt", async () => {
    const { svc, repo } = makeService(50);
    const ip = "203.0.113.44";
    for (let i = 0; i < 5; i++) {
      await svc.checkout({ email: `drain${i}@example.com` }, { ip });
    }
    await expect(svc.checkout({ email: "drain9@example.com" }, { ip })).rejects.toMatchObject({
      status: 429,
    });
    // Another network still buys …
    await svc.checkout({ email: "elsewhere@example.com" }, { ip: "198.51.100.9" });
    // … and a verified buyer behind the same (shared/NAT) address is not blocked.
    const verified = signStatusToken({ e: "verified@example.com" }, CFG.statusTokenSecret);
    await expect(
      svc.checkout({ email: "verified@example.com" }, { ip, verifyToken: verified }),
    ).resolves.toMatchObject({ price_usd: 499 });
    expect(repo.seatsRow.held).toBe(7);
  });

  it("LTD_REQUIRE_VERIFIED_CHECKOUT gates checkout on a verified-email token when enabled", async () => {
    const repo = new MemRepo(50);
    const svc = new FoundingService(repo, new FakeInvoices(), {
      ...CFG,
      requireVerifiedCheckout: true,
    });

    await expect(svc.checkout({ email: "nobody@example.com" })).rejects.toMatchObject({
      status: 401,
    });
    // A token for a DIFFERENT address does not count.
    const wrong = signStatusToken({ e: "other@example.com" }, CFG.statusTokenSecret);
    await expect(
      svc.checkout({ email: "nobody@example.com" }, { verifyToken: wrong }),
    ).rejects.toMatchObject({ status: 401 });
    // Nor does one signed with the wrong secret.
    const forged = signStatusToken({ e: "nobody@example.com" }, "not-the-secret");
    await expect(
      svc.checkout({ email: "nobody@example.com" }, { verifyToken: forged }),
    ).rejects.toMatchObject({ status: 401 });

    const good = signStatusToken({ e: "nobody@example.com" }, CFG.statusTokenSecret);
    await expect(
      svc.checkout({ email: "nobody@example.com" }, { verifyToken: good }),
    ).resolves.toMatchObject({ price_usd: 499 });
  });

  /**
   * The shortened TTL is only safe because a hold with a payment in flight is
   * never reclaimed: taking money and handing back nothing is worse than the
   * availability problem M6 describes.
   */
  it("never expires a hold once the payment is in flight, however slow the chain", async () => {
    const { svc, repo } = makeService(5);
    const ipnSvc = new IpnService(repo, CFG.npIpnSecret);
    const res = await svc.checkout({ email: "slow-chain@example.com" });

    const confirming = {
      payment_id: `pay_seat_${++paymentSeq}`,
      payment_status: "confirming",
      price_amount: 499,
      price_currency: "usd",
      order_id: res.order_id,
    };
    await ipnSvc.handle(
      Buffer.from(JSON.stringify(confirming), "utf8"),
      signIpn(confirming, CFG.npIpnSecret),
    );

    // Hours past the TTL: the seat is still theirs.
    expect(await repo.expireHolds(new Date(Date.now() + 600 * 60_000))).toBe(0);
    expect(repo.seatsRow).toEqual({ cap: 5, granted: 0, held: 1 });

    // And the late payment still grants the seat.
    expect(await finishOrder(ipnSvc, res.order_id)).toEqual({ ok: true });
    expect(repo.seatsRow).toEqual({ cap: 5, granted: 1, held: 0 });
  });

  it("finished converts hold to grant; double-finished is idempotent", async () => {
    const { svc, repo } = makeService(5);
    const ipnSvc = new IpnService(repo, CFG.npIpnSecret);
    const res = await svc.checkout({ email: "x@example.com" });

    expect(await finishOrder(ipnSvc, res.order_id)).toEqual({ ok: true });
    expect(repo.seatsRow).toEqual({ cap: 5, granted: 1, held: 0 });
    expect(repo.eventTypes()).toEqual(["order.created", "payment.finished"]);

    // Different payment_id, same finished status: equal rank -> ignored, seats unchanged.
    expect(await finishOrder(ipnSvc, res.order_id)).toEqual({ ok: true, ignored: true });
    expect(repo.seatsRow).toEqual({ cap: 5, granted: 1, held: 0 });
    expect(repo.eventTypes()).toEqual(["order.created", "payment.finished"]);

    // Granted seat consumes capacity permanently: expiry does not touch it.
    expect(await repo.expireHolds(new Date(Date.now() + 999 * 60_000))).toBe(0);
    expect(repo.seatsRow.granted).toBe(1);
  });

  it("refund after grant releases the seat and emits payment.refunded", async () => {
    const { svc, repo } = makeService(5);
    const ipnSvc = new IpnService(repo, CFG.npIpnSecret);
    const res = await svc.checkout({ email: "x@example.com" });
    await finishOrder(ipnSvc, res.order_id);

    const body = {
      payment_id: `pay_seat_refund_${++paymentSeq}`,
      payment_status: "refunded",
      price_amount: 499,
      price_currency: "usd",
      order_id: res.order_id,
    };
    await ipnSvc.handle(Buffer.from(JSON.stringify(body), "utf8"), signIpn(body, CFG.npIpnSecret));

    const order = await repo.getOrder(res.order_id);
    expect(order?.paymentStatus).toBe("refunded");
    expect(order?.seatState).toBe("released");
    expect(repo.seatsRow).toEqual({ cap: 5, granted: 0, held: 0 });
    expect(repo.eventTypes()).toEqual(["order.created", "payment.finished", "payment.refunded"]);
  });

  it("checkout validates input and builds NOWPayments invoice request per contract", async () => {
    const { svc, invoices } = makeService(5);
    await expect(svc.checkout({ email: "not-an-email" })).rejects.toMatchObject({ status: 422 });

    const res = await svc.checkout({ email: "Hero@Example.com", pay_currency: "usdttrc20", ref: "abcd12" });
    expect(res.price_usd).toBe(499);
    expect(res.invoice_url).toBe("http://np.local/invoice/1");
    expect(Date.parse(res.expires_at)).toBeGreaterThan(Date.now());

    const call = invoices.calls[0]!;
    expect(call.price_amount).toBe(499);
    expect(call.price_currency).toBe("usd");
    expect(call.order_id).toBe(res.order_id);
    expect(call.order_description).toBe("HeroPips Founding Hero — lifetime access");
    expect(call.ipn_callback_url).toBe(CFG.ipnCallbackUrl);
    expect(call.success_url).toBe(
      `${CFG.publicOrigin}/founding/status?token=${encodeURIComponent(res.status_token)}`,
    );
    expect(call.cancel_url).toBe(`${CFG.publicOrigin}/founding`);
    expect(call.pay_currency).toBe("usdttrc20");

    // Status endpoint resolves the freshly minted token.
    const status = await svc.status(res.status_token);
    expect(status.order_id).toBe(res.order_id);
    expect(status.seat_state).toBe("held");
    expect(status.price_usd).toBe(499);
    await expect(svc.status("garbage.token")).rejects.toMatchObject({ status: 401 });
  });
});
