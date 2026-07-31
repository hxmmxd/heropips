import { describe, expect, it } from "vitest";
import { SIGNAL_EVENTS, TOPICS, type SymbolCode } from "@heropips/contracts";
import type { SignalConfig } from "../src/common/config";
import { SIM_DATA_SOURCE, SimQuantSource } from "../src/market/sim.source";
import type { Candle, LatestTick, QuantSource } from "../src/market/source";
import type { SignalRow } from "../src/signals/signals.repo";
import { SignalsService } from "../src/signals/signals.service";
import { MemSignalRepo } from "./mem-repo";

const T0 = Date.UTC(2026, 0, 1);
const CONFIG: SignalConfig = { source: "sim", simSeed: 42, intervalSec: 0 };

function simSetup(seed: number): { repo: MemSignalRepo; svc: SignalsService; clock: { t: number } } {
  const clock = { t: T0 };
  const repo = new MemSignalRepo();
  const source = new SimQuantSource(seed, () => clock.t);
  const svc = new SignalsService(repo, source, { ...CONFIG, simSeed: seed });
  svc.now = () => new Date(clock.t);
  return { repo, svc, clock };
}

/** Price-controllable source for resolution tests; never generates. */
class StubSource implements QuantSource {
  price = 0;
  async getCandles(_symbol: SymbolCode, _n: number): Promise<Candle[]> {
    return []; // generateSweep skips symbols with no candles
  }
  async getLatest(_symbol: SymbolCode): Promise<LatestTick> {
    return { price: this.price, ts: new Date(T0).toISOString() };
  }
  dataSource(_symbol: SymbolCode): string {
    return SIM_DATA_SOURCE;
  }
}

function activeRow(over: Partial<SignalRow>): SignalRow {
  return {
    id: "sig-1",
    symbol: "BTCUSDT",
    side: "buy",
    confidence: 0.5,
    entry: 118000,
    stop: 117800,
    target: 118300,
    horizonMin: 90,
    rationale: "test",
    modelVersion: "quant-ml-v1",
    dataSource: SIM_DATA_SOURCE,
    status: "active",
    generatedAt: new Date(T0),
    expiresAt: new Date(T0 + 90 * 60_000),
    ...over,
  };
}

function stubSetup(row: SignalRow): { repo: MemSignalRepo; svc: SignalsService; source: StubSource } {
  const repo = new MemSignalRepo();
  repo.rows.push({ ...row });
  const source = new StubSource();
  const svc = new SignalsService(repo, source, CONFIG);
  svc.now = () => new Date(T0);
  return { repo, svc, source };
}

describe("SignalsService generation", () => {
  it("emits signals with full disclosure and an outbox event", async () => {
    const { repo, svc } = simSetup(42);
    await svc.tick();

    expect(repo.rows.length).toBeGreaterThan(0);
    for (const row of repo.rows) {
      expect(row.dataSource).toBe("institutional-composite-sim");
      expect(row.modelVersion).toBe("quant-ml-v1");
      expect(row.rationale.length).toBeGreaterThan(0);
      expect(row.status).toBe("active");
      expect(row.expiresAt.getTime()).toBe(row.generatedAt.getTime() + row.horizonMin * 60_000);
    }

    expect(repo.outbox).toHaveLength(repo.rows.length);
    for (const evt of repo.outbox) {
      expect(evt.topic).toBe(TOPICS.signalEvents);
      expect(evt.payload.type).toBe(SIGNAL_EVENTS.generated);
    }

    // Seed 42 fixture: the USDJPY sell clears both gates.
    const jpy = repo.rows.find((r) => r.symbol === "USDJPY");
    expect(jpy).toMatchObject({ side: "sell", entry: 151.372, stop: 151.408, target: 151.318 });
  });

  it("same SIM_SEED ⇒ identical signals", async () => {
    const a = simSetup(42);
    const b = simSetup(42);
    await a.svc.tick();
    await b.svc.tick();

    const strip = (rows: typeof a.repo.rows) => rows.map(({ id: _id, ...rest }) => rest);
    expect(strip(a.repo.rows)).toEqual(strip(b.repo.rows));
    expect(a.repo.rows.length).toBeGreaterThan(0);
  });

  it("keeps at most one ACTIVE signal per symbol across ticks", async () => {
    const { repo, svc, clock } = simSetup(42);
    await svc.tick();
    const after1 = repo.rows.length;

    await svc.tick(); // same clock: nothing resolves, nothing duplicates
    expect(repo.rows.length).toBe(after1);

    for (let i = 0; i < 10; i++) {
      clock.t += 60_000;
      await svc.tick();
      const perSymbol = new Map<string, number>();
      for (const row of repo.rows.filter((r) => r.status === "active")) {
        perSymbol.set(row.symbol, (perSymbol.get(row.symbol) ?? 0) + 1);
      }
      for (const count of perSymbol.values()) expect(count).toBe(1);
    }
  });
});

describe("SignalsService resolution", () => {
  it("buy: latest price crossing target ⇒ target_hit", async () => {
    const { repo, svc, source } = stubSetup(activeRow({ side: "buy", target: 118300 }));
    source.price = 118350;
    await svc.tick();

    expect(repo.rows[0].status).toBe("target_hit");
    expect(repo.outbox).toHaveLength(1);
    expect(repo.outbox[0].payload.type).toBe(SIGNAL_EVENTS.resolved);
    expect(repo.outbox[0].payload.payload).toMatchObject({ outcome: "target_hit", status: "target_hit" });
  });

  it("buy: latest price crossing stop ⇒ stopped", async () => {
    const { repo, svc, source } = stubSetup(activeRow({ side: "buy", stop: 117800 }));
    source.price = 117700;
    await svc.tick();
    expect(repo.rows[0].status).toBe("stopped");
    expect(repo.outbox[0].payload.payload).toMatchObject({ outcome: "stopped" });
  });

  it("sell: target below entry, stop above entry", async () => {
    const sell = activeRow({ side: "sell", entry: 118000, target: 117700, stop: 118200 });

    const hit = stubSetup(sell);
    hit.source.price = 117650;
    await hit.svc.tick();
    expect(hit.repo.rows[0].status).toBe("target_hit");

    const stopped = stubSetup(sell);
    stopped.source.price = 118250;
    await stopped.svc.tick();
    expect(stopped.repo.rows[0].status).toBe("stopped");
  });

  it("expiry passing ⇒ expired (price still between stop and target)", async () => {
    const { repo, svc, source } = stubSetup(
      activeRow({ expiresAt: new Date(T0 - 1) }), // already past
    );
    source.price = 118000; // between stop 117800 and target 118300
    await svc.tick();
    expect(repo.rows[0].status).toBe("expired");
    expect(repo.outbox[0].payload.payload).toMatchObject({ outcome: "expired" });
  });

  it("in-range, unexpired signals stay active", async () => {
    const { repo, svc, source } = stubSetup(activeRow({}));
    source.price = 118000;
    await svc.tick();
    expect(repo.rows[0].status).toBe("active");
    expect(repo.outbox).toHaveLength(0);
  });
});

describe("SignalsService list", () => {
  it("filters by status and serializes the SignalRes contract", async () => {
    const resolved = activeRow({ id: "sig-2", symbol: "ETHUSDT" });
    const { repo, svc } = stubSetup(activeRow({}));
    repo.rows.push({ ...resolved, status: "target_hit" });

    const active = await svc.list("active", 50);
    expect(active.signals.map((s) => s.id)).toEqual(["sig-1"]);
    expect(active.signals[0]).toMatchObject({
      symbol: "BTCUSDT",
      data_source: "institutional-composite-sim",
      model_version: "quant-ml-v1",
      generated_at: new Date(T0).toISOString(),
    });

    const resolvedList = await svc.list("resolved", 50);
    expect(resolvedList.signals.map((s) => s.id)).toEqual(["sig-2"]);

    const all = await svc.list("all", 50);
    expect(all.signals).toHaveLength(2);
    expect(await svc.list("all", 1).then((r) => r.signals)).toHaveLength(1);
  });
});
