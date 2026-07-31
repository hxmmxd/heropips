import { describe, expect, it } from "vitest";
import type { BillingConfig } from "../src/common/config";
import { FoundingService } from "../src/founding/founding.service";
import type { Invoice, InvoiceClient, InvoiceRequest } from "../src/nowpayments/client";
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
  async createInvoice(req: InvoiceRequest): Promise<Invoice> {
    this.calls.push(req);
    return { id: `inv_${this.calls.length}`, invoiceUrl: `http://np.local/invoice/${this.calls.length}` };
  }
}

async function makePaidOrder(
  svc: FoundingService,
  repo: MemRepo,
  email: string,
  status: "finished" | "confirmed" | "waiting",
): Promise<string> {
  const res = await svc.checkout({ email, pay_currency: "btc" });
  if (status !== "waiting") {
    await repo.updatePayment(res.order_id, { paymentStatus: status });
  }
  return res.order_id;
}

describe("POST /v1/founding/verify (identity-svc redeem check)", () => {
  function makeService(): { svc: FoundingService; repo: MemRepo } {
    const repo = new MemRepo(500);
    return { svc: new FoundingService(repo, new FakeInvoices(), CFG), repo };
  }

  it("finished order + matching email -> {ok:true, sku}", async () => {
    const { svc, repo } = makeService();
    const orderId = await makePaidOrder(svc, repo, "hero@example.com", "finished");
    const res = await svc.verifyPurchase({ email: "hero@example.com", order_id: orderId });
    expect(res).toEqual({ ok: true, sku: "ltd_founding" });
  });

  it("confirmed order counts; email match is case-insensitive", async () => {
    const { svc, repo } = makeService();
    const orderId = await makePaidOrder(svc, repo, "Hero@Example.com", "confirmed");
    const res = await svc.verifyPurchase({ email: "HERO@example.COM", order_id: orderId });
    expect(res).toEqual({ ok: true, sku: "ltd_founding" });
  });

  it("waiting order -> {ok:false}", async () => {
    const { svc, repo } = makeService();
    const orderId = await makePaidOrder(svc, repo, "hero@example.com", "waiting");
    expect(await svc.verifyPurchase({ email: "hero@example.com", order_id: orderId })).toEqual({ ok: false });
  });

  it("wrong email -> {ok:false}", async () => {
    const { svc, repo } = makeService();
    const orderId = await makePaidOrder(svc, repo, "hero@example.com", "finished");
    expect(await svc.verifyPurchase({ email: "other@example.com", order_id: orderId })).toEqual({ ok: false });
  });

  it("unknown order id -> {ok:false}", async () => {
    const { svc } = makeService();
    expect(await svc.verifyPurchase({ email: "hero@example.com", order_id: "hp_ltd_nope" })).toEqual({ ok: false });
  });

  it("malformed body -> {ok:false}, never throws", async () => {
    const { svc } = makeService();
    expect(await svc.verifyPurchase({})).toEqual({ ok: false });
    expect(await svc.verifyPurchase(null)).toEqual({ ok: false });
    expect(await svc.verifyPurchase({ email: 42, order_id: [] })).toEqual({ ok: false });
  });
});
