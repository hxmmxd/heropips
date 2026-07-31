import { beforeEach, describe, expect, it } from "vitest";
import {
  PAPER_STARTING_BALANCE_USD_MINOR,
  TRADE_EVENTS,
  type EventEnvelope,
  type OrderReq,
} from "@heropips/contracts";
import { BrokerAdapters } from "../src/brokers/adapters";
import { loadConfig } from "../src/common/config";
import { ConnectionsService } from "../src/connections/connections.service";
import { ExecService } from "../src/exec/exec.service";
import { ReadService } from "../src/pnl/read.service";
import { FakeQuotes, makeUser } from "./fakes";
import { MemRepo } from "./mem-repo";

describe("ExecService — order pipeline", () => {
  const user = makeUser();
  let repo: MemRepo;
  let quotes: FakeQuotes;
  let now: Date;
  let conns: ConnectionsService;
  let exec: ExecService;
  let reads: ReadService;
  let paperId: string;
  let keySeq = 0;

  function order(overrides: Partial<OrderReq> = {}): OrderReq {
    return {
      connection_id: paperId,
      symbol: "BTCUSDT",
      side: "buy",
      type: "market",
      qty: 0.1,
      idempotency_key: `test-key-${keySeq++}`,
      ...overrides,
    };
  }

  function outboxTypes(): string[] {
    return repo.outbox.map((r) => (r.payload as EventEnvelope).type);
  }

  beforeEach(async () => {
    repo = new MemRepo();
    quotes = new FakeQuotes();
    quotes.set("EURUSD", 1.1);
    quotes.set("GBPUSD", 1.27);
    quotes.set("USDJPY", 155);
    quotes.set("XAUUSD", 2400);
    quotes.set("BTCUSDT", 50_000);
    quotes.set("ETHUSDT", 3000);
    quotes.set("SOLUSDT", 150);
    now = new Date("2026-07-28T10:00:00.000Z");
    const clock = () => now;
    conns = new ConnectionsService(repo, new BrokerAdapters(quotes), loadConfig({}), clock);
    exec = new ExecService(repo, quotes, clock);
    reads = new ReadService(repo, quotes, clock);
    paperId = (await conns.list(user)).connections[0].id;
  });

  it("fills buys at ask, sells at bid, with the exact 8bps fee", async () => {
    quotes.set("BTCUSDT", 49_990, 50_000); // real spread
    const res = await exec.placeOrder(user, order({ qty: 0.1 }));
    expect(res.status).toBe("filled");
    expect(res.fill).toEqual({
      price: 50_000,
      qty: 0.1,
      fee_usd_minor: 400, // 8bps of 500,000¢
      ts: now.toISOString(),
    });
    expect(repo.positions).toHaveLength(1);
    expect(repo.positions[0]).toMatchObject({ side: "long", qty: 0.1, avgEntry: 50_000 });
    // Entry fee is carried on the position; balance only moves on reduces.
    expect(repo.connections[0].balanceUsdMinor).toBe(PAPER_STARTING_BALANCE_USD_MINOR);
    // Snapshot after the fill, marked at bid: upl = 0.1 × (49,990−50,000) × 100 = −100¢
    expect(repo.snapshots).toHaveLength(1);
    expect(repo.snapshots[0].equityUsdMinor).toBe(PAPER_STARTING_BALANCE_USD_MINOR - 100);
    expect(outboxTypes()).toContain(TRADE_EVENTS.orderFilled);
  });

  it("round trip reconciles: equity == balance when flat (exact cents)", async () => {
    quotes.set("BTCUSDT", 49_990, 50_000);
    await exec.placeOrder(user, order({ qty: 0.1 }));
    const close = await exec.placeOrder(user, order({ side: "sell", qty: 0.1 }));
    // gross = 0.1 × (49,990−50,000) × 100 = −100¢; close fee 400¢; entry share 400¢
    expect(close.status).toBe("filled");
    expect(repo.positions).toHaveLength(0);
    expect(repo.trades).toHaveLength(1);
    expect(repo.trades[0].rplUsdMinor).toBe(-100 - 400 - 400);
    const expectedBalance = PAPER_STARTING_BALANCE_USD_MINOR - 900;
    expect(repo.connections[0].balanceUsdMinor).toBe(expectedBalance);

    const summary = await reads.summary(user);
    expect(summary.balance_usd_minor).toBe(expectedBalance);
    expect(summary.upl_usd_minor).toBe(0);
    expect(summary.equity_usd_minor).toBe(expectedBalance); // ZERO cent drift
    expect(summary.rpl_today_usd_minor).toBe(-900);
    expect(summary.rpl_total_usd_minor).toBe(-900);
    expect(outboxTypes()).toContain(TRADE_EVENTS.positionClosed);
  });

  it("sizes by risk_pct exactly per the documented formula", async () => {
    // $10,000 equity, 1% = $100 risk; |1.10−1.09| × 100,000 = $1,000/qty → 0.1
    const res = await exec.placeOrder(
      user,
      order({ symbol: "EURUSD", qty: undefined, risk_pct: 1, stop: 1.09 }),
    );
    expect(res.status).toBe("filled");
    expect(res.fill?.qty).toBe(0.1);
  });

  it("sizes USDJPY risk_pct in USD (JPY stop distance converted at entry)", async () => {
    quotes.set("USDJPY", 151.363);
    // $10,000 equity, 1% = $100; dist 0.045 JPY = $0.000297…/unit → 3.3636 lots → floor 3.363
    const res = await exec.placeOrder(
      user,
      order({ symbol: "USDJPY", side: "buy", qty: undefined, risk_pct: 1, stop: 151.408 }),
    );
    expect(res.status).toBe("filled");
    expect(res.fill?.qty).toBe(3.363);
    // fee = 8bps of the USD notional (3.363 × $100,000/lot... = qty × contract_size)
    expect(res.fill?.fee_usd_minor).toBe(26_904);
  });

  it("requires a stop when sizing with risk_pct", async () => {
    await expect(
      exec.placeOrder(user, order({ symbol: "EURUSD", qty: undefined, risk_pct: 1 })),
    ).rejects.toMatchObject({ status: 422, body: { error_code: "validation_failed" } });
  });

  it("rejects risk_pct orders whose computed quantity is zero", async () => {
    await repo.updateConnectionBalance(paperId, 100); // $1 equity
    const res = await exec.placeOrder(
      user,
      order({ symbol: "EURUSD", qty: undefined, risk_pct: 0.1, stop: 1.09 }),
    );
    expect(res.status).toBe("rejected");
    expect(res.reason).toBe("quantity_too_small");
    expect(res.fill).toBeNull();
  });

  it("guard: blocks risk above 2% of equity", async () => {
    const res = await exec.placeOrder(user, order({ symbol: "EURUSD", qty: 0.5, stop: 1.09 }));
    expect(res.status).toBe("blocked_by_guard");
    expect(res.reason).toBe("max_risk_per_trade");
    expect(res.fill).toBeNull();
    expect(repo.positions).toHaveLength(0);
    expect(outboxTypes()).toContain(TRADE_EVENTS.orderBlocked);
  });

  it("guard: blocks the 6th concurrent position on a connection", async () => {
    await exec.placeOrder(user, order({ symbol: "BTCUSDT", qty: 0.01 }));
    await exec.placeOrder(user, order({ symbol: "ETHUSDT", qty: 0.1 }));
    await exec.placeOrder(user, order({ symbol: "SOLUSDT", qty: 1 }));
    await exec.placeOrder(user, order({ symbol: "EURUSD", qty: 0.01 }));
    await exec.placeOrder(user, order({ symbol: "GBPUSD", qty: 0.01 }));
    expect(repo.positions).toHaveLength(5);

    const res = await exec.placeOrder(user, order({ symbol: "XAUUSD", qty: 0.01 }));
    expect(res.status).toBe("blocked_by_guard");
    expect(res.reason).toBe("max_open_positions");
    // …but adding to an EXISTING symbol is still allowed
    const add = await exec.placeOrder(user, order({ symbol: "BTCUSDT", qty: 0.01 }));
    expect(add.status).toBe("filled");
  });

  it("guard: daily-loss breaker blocks new entries, then unblocks next UTC day", async () => {
    await exec.placeOrder(user, order({ qty: 0.1 })); // buy 0.1 @ 50,000
    quotes.set("BTCUSDT", 40_000); // market tanks 20%
    await exec.placeOrder(user, order({ side: "sell", qty: 0.1 })); // realize −$1,007.20

    // −100,720¢ realized today ≤ −5% × 1,000,000¢ day-start equity → breaker trips
    const blocked = await exec.placeOrder(user, order({ qty: 0.01 }));
    expect(blocked.status).toBe("blocked_by_guard");
    expect(blocked.reason).toBe("daily_loss_breaker");
    // closing/reducing stays allowed even while tripped (nothing open here, so
    // verify via a fresh position the next day instead)

    now = new Date("2026-07-29T10:00:00.000Z"); // next UTC day → new anchor, rpl_today resets
    const unblocked = await exec.placeOrder(user, order({ qty: 0.01 }));
    expect(unblocked.status).toBe("filled");
  });

  it("replays idempotent orders verbatim without double-filling", async () => {
    const req = order({ qty: 0.1, idempotency_key: "fixed-key-123" });
    const first = await exec.placeOrder(user, req);
    const replay = await exec.placeOrder(user, req);
    expect(replay).toEqual(first);
    expect(replay.order_id).toBe(first.order_id);
    expect(repo.positions).toHaveLength(1);
    expect(repo.positions[0].qty).toBe(0.1); // not 0.2
    expect(repo.snapshots).toHaveLength(1); // no second snapshot
  });

  it("rejects orders on foreign or missing connections", async () => {
    await expect(
      exec.placeOrder(makeUser({ id: "intruder" }), order()),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      exec.placeOrder(user, order({ connection_id: "nope" })),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects orders on pending (live) connections with remediation", async () => {
    const live = await conns.create(user, {
      broker: "binance",
      label: "live",
      // secret-scan:allow — fake fixture credentials
      credentials: { api_key: "AKIA1234567890SECRETKEY", api_secret: "sk_live_1234567890abcdef" },
    });
    await expect(
      exec.placeOrder(user, order({ connection_id: live.id })),
    ).rejects.toMatchObject({ status: 409, body: { error_code: "order_rejected" } });
  });

  it("POST /positions/:id/close fully closes at market through the same pipeline", async () => {
    await exec.placeOrder(user, order({ symbol: "ETHUSDT", qty: 0.2 }));
    const pos = repo.positions[0];
    const res = await exec.closePosition(user, pos.id);
    expect(res.status).toBe("filled");
    expect(res.fill?.qty).toBe(0.2);
    expect(repo.positions).toHaveLength(0);
    expect(repo.trades).toHaveLength(1);
    // flat round-trip at 3,000: rpl = 0 − 48 − 48 = −96¢ (two 8bps fees)
    expect(repo.trades[0].rplUsdMinor).toBe(-96);
    expect(repo.connections[0].balanceUsdMinor).toBe(PAPER_STARTING_BALANCE_USD_MINOR - 96);

    await expect(exec.closePosition(user, pos.id)).rejects.toMatchObject({ status: 404 });
  });

  it("paginates trades newest-first with an opaque cursor", async () => {
    for (let i = 0; i < 60; i++) {
      await repo.insertTrade({
        id: `t${String(i).padStart(3, "0")}`,
        userId: user.id,
        connectionId: paperId,
        symbol: "BTCUSDT",
        side: "long",
        qty: 0.1,
        entry: 50_000,
        exit: 50_100,
        rplUsdMinor: i % 2 === 0 ? 500 : -500,
        feesUsdMinor: 80,
        signalId: null,
        openedAt: "2026-07-28T09:00:00.000Z",
        closedAt: `2026-07-28T09:${String(i % 60).padStart(2, "0")}:00.000Z`,
      });
    }
    const page1 = await reads.trades(user, undefined);
    expect(page1.trades).toHaveLength(50);
    expect(page1.next_cursor).not.toBeNull();
    const page2 = await reads.trades(user, page1.next_cursor as string);
    expect(page2.trades).toHaveLength(10);
    expect(page2.next_cursor).toBeNull();
    const ids = new Set([...page1.trades, ...page2.trades].map((t) => t.id));
    expect(ids.size).toBe(60);
  });

  it("downsamples the equity curve to the requested points", async () => {
    for (let i = 0; i < 600; i++) {
      await repo.insertSnapshot(user.id, new Date(1753600000000 + i * 60_000).toISOString(), 1_000_000 + i);
    }
    const curve = await reads.equityCurve(user, 100);
    expect(curve.points).toHaveLength(100);
    expect(curve.points[0].equity_usd_minor).toBe(1_000_000);
    expect(curve.points[99].equity_usd_minor).toBe(1_000_599);
    // cap clamps at 500
    const capped = await reads.equityCurve(user, 10_000);
    expect(capped.points).toHaveLength(500);
  });

  it("summary reports drawdown/sharpe/win-rate windows", async () => {
    quotes.set("BTCUSDT", 50_000);
    await exec.placeOrder(user, order({ qty: 0.1 }));
    quotes.set("BTCUSDT", 51_000);
    await exec.placeOrder(user, order({ side: "sell", qty: 0.1 }));
    const summary = await reads.summary(user);
    expect(summary.trades_30d).toBe(1);
    expect(summary.win_rate_30d).toBe(1);
    expect(summary.sharpe_30d).toBeNull(); // < 5 daily returns
    expect(summary.max_drawdown_bps).toBeGreaterThanOrEqual(0);
    expect(summary.as_of).toBe(now.toISOString());
  });
});
