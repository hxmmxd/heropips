import { describe, expect, it } from "vitest";
import type { PaymentStatus } from "@heropips/contracts";
import { IpnService } from "../src/ipn/ipn.service";
import { signIpn } from "../src/ipn/signature";
import { MemRepo } from "./mem-repo";

const SECRET = "test-ipn-secret";
let paymentSeq = 0;

async function seedOrder(repo: MemRepo, orderId = "hp_ltd_aaaaaaaaaaaa"): Promise<string> {
  const created = await repo.createHeldOrder({
    orderId,
    email: "hero@example.com",
    priceUsdMinor: 49900,
    payCurrency: null,
    refCode: null,
    holdExpiresAt: new Date(Date.now() + 120 * 60_000),
  });
  expect(created).toBe("created");
  return orderId;
}

function deliver(
  svc: IpnService,
  orderId: string,
  status: PaymentStatus,
  extra: Record<string, unknown> = {},
) {
  const body = {
    payment_id: `pay_${++paymentSeq}`,
    payment_status: status,
    price_amount: 499,
    price_currency: "usd",
    order_id: orderId,
    ...extra,
  };
  return svc.handle(Buffer.from(JSON.stringify(body), "utf8"), signIpn(body, SECRET));
}

describe("payment status ladder", () => {
  const table: Array<{
    name: string;
    sequence: PaymentStatus[];
    final: PaymentStatus;
  }> = [
    { name: "waiting -> finished applies", sequence: ["finished"], final: "finished" },
    {
      name: "finished -> confirming (late, lower rank) is ignored",
      sequence: ["finished", "confirming"],
      final: "finished",
    },
    {
      name: "monotonic climb applies each step",
      sequence: ["confirming", "confirmed", "sending", "finished"],
      final: "finished",
    },
    {
      name: "equal rank does not reapply (failed after expired)",
      sequence: ["expired", "failed"],
      final: "expired",
    },
    {
      name: "refunded outranks finished",
      sequence: ["finished", "refunded"],
      final: "refunded",
    },
  ];

  for (const row of table) {
    it(row.name, async () => {
      const repo = new MemRepo(10);
      const svc = new IpnService(repo, SECRET);
      const orderId = await seedOrder(repo);
      for (const status of row.sequence) await deliver(svc, orderId, status);
      const order = await repo.getOrder(orderId);
      expect(order?.paymentStatus).toBe(row.final);
    });
  }

  it("partially_paid records amounts without downgrading a finished order", async () => {
    const repo = new MemRepo(10);
    const svc = new IpnService(repo, SECRET);
    const orderId = await seedOrder(repo);

    await deliver(svc, orderId, "finished");
    const res = await deliver(svc, orderId, "partially_paid", {
      actually_paid: 250.5,
      purchase_id: 987654,
      pay_currency: "usdttrc20",
    });
    expect(res).toEqual({ ok: true, ignored: true });

    const order = await repo.getOrder(orderId);
    expect(order?.paymentStatus).toBe("finished"); // no downgrade
    expect(order?.seatState).toBe("granted");
    expect(order?.actuallyPaid).toBe(250.5); // but amounts recorded
    expect(order?.purchaseId).toBe("987654");
    expect(order?.payCurrency).toBe("usdttrc20");
  });

  it("partially_paid advancing from waiting applies status and amounts", async () => {
    const repo = new MemRepo(10);
    const svc = new IpnService(repo, SECRET);
    const orderId = await seedOrder(repo);

    await deliver(svc, orderId, "partially_paid", { actually_paid: 100, purchase_id: "p1" });
    const order = await repo.getOrder(orderId);
    expect(order?.paymentStatus).toBe("partially_paid");
    expect(order?.actuallyPaid).toBe(100);
    expect(order?.seatState).toBe("held"); // seat untouched until finished
  });

  it("unknown order is acknowledged and ignored", async () => {
    const repo = new MemRepo(10);
    const svc = new IpnService(repo, SECRET);
    const res = await deliver(svc, "hp_ltd_nosuchorder1", "finished");
    expect(res).toEqual({ ok: true, ignored: true });
  });

  it("expired/failed release the hold and emit outbox events", async () => {
    const repo = new MemRepo(10);
    const svc = new IpnService(repo, SECRET);
    const orderId = await seedOrder(repo);

    await deliver(svc, orderId, "failed");
    const order = await repo.getOrder(orderId);
    expect(order?.paymentStatus).toBe("failed");
    expect(order?.seatState).toBe("released");
    expect(repo.seatsRow).toEqual({ cap: 10, granted: 0, held: 0 });
    expect(repo.eventTypes()).toEqual(["payment.failed"]);
    expect(repo.outboxRows[0]!.payload.payload).toEqual({
      order_id: orderId,
      email: "hero@example.com",
    });
  });
});
