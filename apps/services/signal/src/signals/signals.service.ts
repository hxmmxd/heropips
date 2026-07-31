import { randomUUID } from "node:crypto";
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import {
  SIGNAL_EVENTS,
  SYMBOLS,
  TOPICS,
  type SignalListRes,
  type SignalRes,
  type SignalStatus,
  type SymbolCode,
} from "@heropips/contracts";
import { SIGNAL_CONFIG, type SignalConfig } from "../common/config";
import { spreadAbs } from "../market/quotes";
import { QUANT_SOURCE, type QuantSource } from "../market/source";
import { evaluate } from "../quant/model";
import { makeEnvelope } from "../outbox/outbox.service";
import { SIGNAL_REPO, type SignalRepo, type SignalRow, type StatusFilter } from "./signals.repo";

/** Candle history requested per evaluation — covers the 60-return vol window. */
const LOOKBACK = 120;

@Injectable()
export class SignalsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger("signals");
  private timer: NodeJS.Timeout | undefined;

  /** Injectable clock — tests pin it for deterministic timestamps/expiry. */
  now: () => Date = () => new Date();

  constructor(
    @Inject(SIGNAL_REPO) private readonly repo: SignalRepo,
    @Inject(QUANT_SOURCE) private readonly source: QuantSource,
    @Inject(SIGNAL_CONFIG) private readonly config: SignalConfig,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.intervalSec <= 0) return; // disabled (tests)
    const run = (): void => {
      void this.tick().catch((err: unknown) => {
        this.logger.warn(`tick failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    };
    this.timer = setInterval(run, this.config.intervalSec * 1000);
    run(); // first sweep immediately after boot
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  /** One engine tick: resolve finished signals first, then scan for new ones. */
  async tick(): Promise<void> {
    await this.resolveSweep();
    await this.generateSweep();
  }

  /**
   * Scan every symbol; at most one ACTIVE signal per symbol. A passing model
   * evaluation inserts the row and emits signal.generated on the outbox.
   */
  async generateSweep(): Promise<void> {
    for (const symbol of Object.keys(SYMBOLS) as SymbolCode[]) {
      if (await this.repo.hasActive(symbol)) continue;

      const candles = await this.source.getCandles(symbol, LOOKBACK);
      if (candles.length === 0) continue;
      const mid = candles[candles.length - 1].c;
      const proposal = evaluate(symbol, candles, spreadAbs(symbol, mid));
      if (!proposal) continue;

      const generatedAt = this.now();
      const row: SignalRow = {
        id: randomUUID(),
        symbol,
        side: proposal.side,
        confidence: proposal.confidence,
        entry: proposal.entry,
        stop: proposal.stop,
        target: proposal.target,
        horizonMin: proposal.horizon_min,
        rationale: proposal.rationale,
        modelVersion: proposal.model_version,
        dataSource: this.source.dataSource(symbol),
        status: "active",
        generatedAt,
        expiresAt: new Date(generatedAt.getTime() + proposal.horizon_min * 60_000),
      };
      await this.repo.insertSignal({ ...row, status: "active" });
      await this.repo.insertOutbox(
        TOPICS.signalEvents,
        makeEnvelope(SIGNAL_EVENTS.generated, toRes(row)),
      );
    }
  }

  /**
   * Resolution sweep: latest price crossed target ⇒ target_hit, crossed stop
   * ⇒ stopped, expiry passed ⇒ expired. Emits signal.resolved with outcome.
   */
  async resolveSweep(): Promise<void> {
    const active = await this.repo.listActive();
    for (const row of active) {
      const { price } = await this.source.getLatest(row.symbol);
      const dir = row.side === "buy" ? 1 : -1;

      let outcome: Exclude<SignalStatus, "active"> | null = null;
      if (dir * (price - row.target) >= 0) outcome = "target_hit";
      else if (dir * (price - row.stop) <= 0) outcome = "stopped";
      else if (row.expiresAt.getTime() <= this.now().getTime()) outcome = "expired";
      if (!outcome) continue;

      await this.repo.markResolved(row.id, outcome);
      await this.repo.insertOutbox(
        TOPICS.signalEvents,
        makeEnvelope(SIGNAL_EVENTS.resolved, { ...toRes({ ...row, status: outcome }), outcome }),
      );
    }
  }

  async list(status: StatusFilter, limit: number): Promise<SignalListRes> {
    const rows = await this.repo.list(status, limit);
    return { signals: rows.map(toRes) };
  }
}

function toRes(row: SignalRow): SignalRes {
  return {
    id: row.id,
    symbol: row.symbol,
    side: row.side,
    confidence: row.confidence,
    entry: row.entry,
    stop: row.stop,
    target: row.target,
    horizon_min: row.horizonMin,
    rationale: row.rationale,
    model_version: row.modelVersion,
    data_source: row.dataSource,
    status: row.status,
    generated_at: row.generatedAt.toISOString(),
    expires_at: row.expiresAt.toISOString(),
  };
}
