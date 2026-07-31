import { describe, expect, it } from "vitest";
import { REFERRAL, ReferralConfigPatchReq, type EventEnvelope } from "@heropips/contracts";
import type { GrowthConfig } from "../src/common/config";
import { ApiHttpError } from "../src/common/errors";
import type {
  NewAncestorRow,
  NewCommissionRow,
  ReferralConfigRow,
  ReferralRepo,
  ReferralTxOps,
} from "../src/referrals/referrals.repo";
import { ReferralsService } from "../src/referrals/referrals.service";

/** In-memory ReferralRepo — same semantics as the pg impl, minus transactions. */
class MemReferralRepo implements ReferralRepo, ReferralTxOps {
  configRow: ReferralConfigRow = {
    maxLevels: REFERRAL.DEFAULT_LEVELS,
    levelRatesBps: [...REFERRAL.DEFAULT_LEVEL_RATES_BPS],
    updatedAt: new Date(),
  };
  edges = new Map<string, string>(); // child -> parent
  ancestors: NewAncestorRow[] = [];
  commissions: Array<NewCommissionRow & { status: "accrued" | "reversed" }> = [];
  outbox: Array<{ topic: string; payload: EventEnvelope }> = [];

  async tx<T>(fn: (ops: ReferralTxOps) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async getConfig(): Promise<ReferralConfigRow> {
    return { ...this.configRow, levelRatesBps: [...this.configRow.levelRatesBps] };
  }

  async updateConfig(next: { maxLevels: number; levelRatesBps: number[] }): Promise<ReferralConfigRow> {
    this.configRow = {
      maxLevels: next.maxLevels,
      levelRatesBps: [...next.levelRatesBps],
      updatedAt: new Date(),
    };
    return this.getConfig();
  }

  async hasEdge(childId: string): Promise<boolean> {
    return this.edges.has(childId);
  }

  async isAncestor(ancestorId: string, descendantId: string): Promise<boolean> {
    return this.ancestors.some((r) => r.descendantId === descendantId && r.ancestorId === ancestorId);
  }

  async ancestorsOf(descendantId: string, maxDepth: number): Promise<Array<{ ancestorId: string; depth: number }>> {
    return this.ancestors
      .filter((r) => r.descendantId === descendantId && r.depth <= maxDepth)
      .sort((a, b) => a.depth - b.depth)
      .map((r) => ({ ancestorId: r.ancestorId, depth: r.depth }));
  }

  async descendantsOf(ancestorId: string): Promise<Array<{ descendantId: string; depth: number }>> {
    return this.ancestors
      .filter((r) => r.ancestorId === ancestorId)
      .map((r) => ({ descendantId: r.descendantId, depth: r.depth }));
  }

  async insertEdge(childId: string, parentId: string): Promise<void> {
    this.edges.set(childId, parentId);
  }

  async insertAncestors(rows: NewAncestorRow[]): Promise<void> {
    for (const row of rows) {
      const dupe = this.ancestors.some(
        (r) => r.descendantId === row.descendantId && r.ancestorId === row.ancestorId,
      );
      if (!dupe) this.ancestors.push({ ...row });
    }
  }

  async insertCommission(row: NewCommissionRow): Promise<boolean> {
    const dupe = this.commissions.some(
      (c) => c.orderId === row.orderId && c.beneficiaryId === row.beneficiaryId && c.level === row.level,
    );
    if (dupe) return false;
    this.commissions.push({ ...row, status: "accrued" });
    return true;
  }

  async reverseCommissions(orderId: string): Promise<number> {
    let n = 0;
    for (const c of this.commissions) {
      if (c.orderId === orderId && c.status === "accrued") {
        c.status = "reversed";
        n += 1;
      }
    }
    return n;
  }

  async insertOutbox(topic: string, payload: unknown): Promise<void> {
    this.outbox.push({ topic, payload: payload as EventEnvelope });
  }

  /** Test helper: outbox event types in insertion order. */
  eventTypes(): string[] {
    return this.outbox.map((r) => r.payload.type);
  }
}

const ADMIN: GrowthConfig = {
  adminToken: "test-admin-token",
  internalToken: null,
  adminNotifyEmail: null,
  devVerificationCode: null,
};

function makeService(config: GrowthConfig = ADMIN): { svc: ReferralsService; repo: MemReferralRepo } {
  const repo = new MemReferralRepo();
  return { svc: new ReferralsService(repo, config), repo };
}

/** Links a root→leaf chain: chain[i+1] is referred by chain[i]. */
async function linkChain(svc: ReferralsService, chain: string[]): Promise<void> {
  for (let i = 1; i < chain.length; i++) {
    await svc.link(chain[i], chain[i - 1]);
  }
}

async function expectApiError(promise: Promise<unknown>, status: number, code: string): Promise<void> {
  try {
    await promise;
    expect.unreachable(`expected ApiHttpError ${status}/${code}`);
  } catch (err) {
    expect(err).toBeInstanceOf(ApiHttpError);
    const apiErr = err as ApiHttpError;
    expect(apiErr.status).toBe(status);
    expect(apiErr.body.error_code).toBe(code);
  }
}

describe("closure build", () => {
  it("chain A<-B<-C<-D yields ancestors with correct depths", async () => {
    const { svc, repo } = makeService();
    await linkChain(svc, ["A", "B", "C", "D"]);

    expect(await repo.ancestorsOf("D", REFERRAL.MAX_LEVELS)).toEqual([
      { ancestorId: "C", depth: 1 },
      { ancestorId: "B", depth: 2 },
      { ancestorId: "A", depth: 3 },
    ]);
    expect(await repo.ancestorsOf("B", REFERRAL.MAX_LEVELS)).toEqual([{ ancestorId: "A", depth: 1 }]);
    expect(await repo.ancestorsOf("A", REFERRAL.MAX_LEVELS)).toEqual([]);
  });

  it("propagates new ancestors to an existing subtree (link order independent)", async () => {
    const { svc, repo } = makeService();
    await svc.link("C", "B"); // subtree exists before B gets its own parent
    await svc.link("B", "A");

    expect(await repo.ancestorsOf("C", REFERRAL.MAX_LEVELS)).toEqual([
      { ancestorId: "B", depth: 1 },
      { ancestorId: "A", depth: 2 },
    ]);
  });

  it("caps closure depth at 10 for a 12-node chain", async () => {
    const { svc, repo } = makeService();
    const chain = Array.from({ length: 12 }, (_, i) => `n${i + 1}`);
    await linkChain(svc, chain);

    const leaf = await repo.ancestorsOf("n12", REFERRAL.MAX_LEVELS);
    expect(leaf).toHaveLength(10);
    expect(leaf[0]).toEqual({ ancestorId: "n11", depth: 1 });
    expect(leaf[9]).toEqual({ ancestorId: "n2", depth: 10 });
    // n1 sits at depth 11 — beyond the hard cap, never materialized.
    expect(leaf.some((a) => a.ancestorId === "n1")).toBe(false);
    expect(repo.ancestors.every((r) => r.depth >= 1 && r.depth <= 10)).toBe(true);
  });
});

describe("link guards", () => {
  it("rejects self-referral", async () => {
    const { svc } = makeService();
    await expectApiError(svc.link("A", "A"), 422, "validation_failed");
  });

  it("rejects a duplicate edge for the same child", async () => {
    const { svc } = makeService();
    await svc.link("B", "A");
    await expectApiError(svc.link("B", "C"), 409, "referral_conflict");
  });

  it("rejects cycles (parent below child)", async () => {
    const { svc } = makeService();
    await linkChain(svc, ["A", "B", "C"]);
    await expectApiError(svc.link("A", "C"), 409, "referral_cycle");
  });
});

describe("attribution", () => {
  it("default config on 49900 minor with 6 ancestors pays exactly 5 levels", async () => {
    const { svc, repo } = makeService();
    await linkChain(svc, ["P6", "P5", "P4", "P3", "P2", "P1", "buyer"]);

    const res = await svc.attribute("ord-1", "buyer", 49_900);

    expect(res.order_id).toBe("ord-1");
    expect(res.total_usd_minor).toBe(49_900);
    expect(res.entries).toEqual([
      { beneficiary_id: "P1", level: 1, rate_bps: 2000, amount_usd_minor: 9980 },
      { beneficiary_id: "P2", level: 2, rate_bps: 1000, amount_usd_minor: 4990 },
      { beneficiary_id: "P3", level: 3, rate_bps: 500, amount_usd_minor: 2495 },
      { beneficiary_id: "P4", level: 4, rate_bps: 300, amount_usd_minor: 1497 },
      { beneficiary_id: "P5", level: 5, rate_bps: 200, amount_usd_minor: 998 },
    ]);
    expect(repo.commissions).toHaveLength(5);
    expect(repo.eventTypes()).toEqual(Array(5).fill("referral.commission.accrued"));
  });

  it("is idempotent on re-call: no duplicate rows or events, same response", async () => {
    const { svc, repo } = makeService();
    await linkChain(svc, ["P2", "P1", "buyer"]);

    const first = await svc.attribute("ord-1", "buyer", 49_900);
    const second = await svc.attribute("ord-1", "buyer", 49_900);

    expect(second).toEqual(first);
    expect(repo.commissions).toHaveLength(2);
    expect(repo.eventTypes()).toEqual(Array(2).fill("referral.commission.accrued"));
  });

  it("skips levels with no ancestor (no dummy rows)", async () => {
    const { svc, repo } = makeService();
    await linkChain(svc, ["P2", "P1", "buyer"]); // only 2 of 5 levels populated

    const res = await svc.attribute("ord-1", "buyer", 49_900);

    expect(res.entries.map((e) => e.level)).toEqual([1, 2]);
    expect(repo.commissions).toHaveLength(2);
  });

  it("skips zero-amount entries", async () => {
    const { svc, repo } = makeService();
    await linkChain(svc, ["P5", "P4", "P3", "P2", "P1", "buyer"]);

    // 40 minor: L4 (300 bps) -> 1, L5 (200 bps) -> floor(0.8) = 0, skipped.
    const res = await svc.attribute("ord-1", "buyer", 40);

    expect(res.entries.map((e) => e.level)).toEqual([1, 2, 3, 4]);
    expect(repo.commissions).toHaveLength(4);
  });

  it("orders with an unreferred buyer accrue nothing", async () => {
    const { svc, repo } = makeService();
    const res = await svc.attribute("ord-1", "loner", 49_900);
    expect(res.entries).toEqual([]);
    expect(repo.commissions).toHaveLength(0);
    expect(repo.outbox).toHaveLength(0);
  });
});

describe("config", () => {
  it("GET returns the seeded defaults", async () => {
    const { svc } = makeService();
    expect(await svc.getConfig()).toEqual({
      max_levels: 5,
      level_rates_bps: [2000, 1000, 500, 300, 200],
    });
  });

  it("PATCH requires ADMIN_TOKEN to be configured (503) and to match (401)", async () => {
    const unset = makeService({ ...ADMIN, adminToken: null });
    await expectApiError(unset.svc.patchConfig("anything", {}), 503, "admin_disabled");

    const { svc } = makeService();
    await expectApiError(svc.patchConfig("wrong-token", {}), 401, "unauthorized");
    await expectApiError(svc.patchConfig(undefined, {}), 401, "unauthorized");
  });

  /**
   * M9: the compare used `!==`, which returns as soon as bytes differ and leaks
   * how much of the token is right — and the endpoint had no rate limit, so it
   * was brute-forceable at line rate. Assert the shapes that a `timingSafeEqual`
   * implementation has to survive (it throws on a length mismatch if unguarded)
   * and that only the exact token is accepted.
   */
  it("PATCH compares the admin token constant-time: prefixes, longer, shorter and unicode all 401", async () => {
    const { svc } = makeService();
    const token = ADMIN.adminToken!;
    const rejected = [
      "",
      "t",
      token.slice(0, token.length - 1), // shorter: correct prefix
      `${token}x`, // longer: correct prefix
      token.toUpperCase(),
      "tëst-admin-token", // multi-byte: different byte length, same char count
      "x".repeat(token.length), // same length, all wrong
    ];
    for (const candidate of rejected) {
      await expectApiError(svc.patchConfig(candidate, {}), 401, "unauthorized");
    }

    // The exact token still works.
    const ok = await svc.patchConfig(token, { max_levels: 2, level_rates_bps: [2000, 1000] });
    expect(ok).toEqual({ max_levels: 2, level_rates_bps: [2000, 1000] });
  });

  it("contract schema rejects more than 10 levels and out-of-range rates", () => {
    expect(ReferralConfigPatchReq.safeParse({ max_levels: 11 }).success).toBe(false);
    expect(ReferralConfigPatchReq.safeParse({ max_levels: 0 }).success).toBe(false);
    expect(ReferralConfigPatchReq.safeParse({ level_rates_bps: Array(11).fill(100) }).success).toBe(false);
    expect(ReferralConfigPatchReq.safeParse({ level_rates_bps: [10_001] }).success).toBe(false);
    expect(ReferralConfigPatchReq.safeParse({ level_rates_bps: [-1] }).success).toBe(false);
  });

  it("rejects a rate sum above 5000 bps (50% business cap)", async () => {
    const { svc } = makeService();
    await expectApiError(
      svc.patchConfig(ADMIN.adminToken!, { level_rates_bps: [3000, 1500, 400, 200, 100] }),
      422,
      "validation_failed",
    );
  });

  it("rejects a rates array whose length differs from max_levels", async () => {
    const { svc } = makeService();
    await expectApiError(
      svc.patchConfig(ADMIN.adminToken!, { level_rates_bps: [2000, 1000] }),
      422,
      "validation_failed",
    );
    await expectApiError(svc.patchConfig(ADMIN.adminToken!, { max_levels: 3 }), 422, "validation_failed");
  });

  it("accepts a valid 10-level config and attribution respects it", async () => {
    const { svc, repo } = makeService();
    const rates = Array(10).fill(500);

    const updated = await svc.patchConfig(ADMIN.adminToken!, {
      max_levels: 10,
      level_rates_bps: rates,
    });
    expect(updated).toEqual({ max_levels: 10, level_rates_bps: rates });

    const chain = Array.from({ length: 12 }, (_, i) => `n${i + 1}`);
    await linkChain(svc, chain);
    const res = await svc.attribute("ord-1", "n12", 49_900);

    expect(res.entries).toHaveLength(10);
    expect(res.entries.every((e) => e.rate_bps === 500 && e.amount_usd_minor === 2495)).toBe(true);
    expect(repo.commissions).toHaveLength(10);
  });

  it("lowering max_levels narrows attribution without touching the tree", async () => {
    const { svc } = makeService();
    await linkChain(svc, ["P5", "P4", "P3", "P2", "P1", "buyer"]);
    await svc.patchConfig(ADMIN.adminToken!, { max_levels: 2, level_rates_bps: [2000, 1000] });

    const res = await svc.attribute("ord-1", "buyer", 49_900);
    expect(res.entries.map((e) => e.level)).toEqual([1, 2]);
  });
});

describe("reverse", () => {
  it("marks all order rows reversed and emits one reversal event", async () => {
    const { svc, repo } = makeService();
    await linkChain(svc, ["P2", "P1", "buyer"]);
    await svc.attribute("ord-1", "buyer", 49_900);
    await svc.attribute("ord-2", "buyer", 49_900);

    const res = await svc.reverse("ord-1");

    expect(res).toEqual({ ok: true, reversed: 2 });
    expect(repo.commissions.filter((c) => c.orderId === "ord-1").every((c) => c.status === "reversed")).toBe(true);
    expect(repo.commissions.filter((c) => c.orderId === "ord-2").every((c) => c.status === "accrued")).toBe(true);
    expect(repo.eventTypes().filter((t) => t === "referral.commission.reversed")).toHaveLength(1);
  });

  it("is a no-op (no extra event) when nothing is left to reverse", async () => {
    const { svc, repo } = makeService();
    await linkChain(svc, ["P1", "buyer"]);
    await svc.attribute("ord-1", "buyer", 49_900);

    await svc.reverse("ord-1");
    const again = await svc.reverse("ord-1");

    expect(again).toEqual({ ok: true, reversed: 0 });
    expect(repo.eventTypes().filter((t) => t === "referral.commission.reversed")).toHaveLength(1);
  });
});
