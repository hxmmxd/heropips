import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { SignalStatus, SymbolCode } from "@heropips/contracts";
import type { Db } from "../db/client";
import { outbox, signals } from "../db/schema";

export interface SignalRow {
  id: string;
  symbol: SymbolCode;
  side: "buy" | "sell";
  confidence: number;
  entry: number;
  stop: number;
  target: number;
  horizonMin: number;
  rationale: string;
  modelVersion: string;
  dataSource: string;
  status: SignalStatus;
  generatedAt: Date;
  expiresAt: Date;
}

export type NewSignal = Omit<SignalRow, "status"> & { status: "active" };

export type StatusFilter = "active" | "resolved" | "all";

/** DI seam: SignalsService depends on this, tests inject an in-memory impl. */
export interface SignalRepo {
  insertSignal(row: NewSignal): Promise<void>;
  hasActive(symbol: SymbolCode): Promise<boolean>;
  listActive(): Promise<SignalRow[]>;
  list(status: StatusFilter, limit: number): Promise<SignalRow[]>;
  /** Transition active → resolved status. No-op if the row is no longer active. */
  markResolved(id: string, status: Exclude<SignalStatus, "active">): Promise<void>;
  insertOutbox(topic: string, payload: unknown): Promise<void>;
}

export const SIGNAL_REPO = Symbol("SIGNAL_REPO");

/* ---------- drizzle/pg implementation ---------- */

export class DrizzleSignalRepo implements SignalRepo {
  constructor(private readonly db: Db) {}

  async insertSignal(row: NewSignal): Promise<void> {
    await this.db.insert(signals).values({
      id: row.id,
      symbol: row.symbol,
      side: row.side,
      confidence: row.confidence,
      entry: row.entry,
      stop: row.stop,
      target: row.target,
      horizonMin: row.horizonMin,
      rationale: row.rationale,
      modelVersion: row.modelVersion,
      dataSource: row.dataSource,
      status: row.status,
      generatedAt: row.generatedAt,
      expiresAt: row.expiresAt,
    });
  }

  async hasActive(symbol: SymbolCode): Promise<boolean> {
    const rows = await this.db
      .select({ id: signals.id })
      .from(signals)
      .where(and(eq(signals.symbol, symbol), eq(signals.status, "active")))
      .limit(1);
    return rows.length > 0;
  }

  async listActive(): Promise<SignalRow[]> {
    const rows = await this.db.select().from(signals).where(eq(signals.status, "active"));
    return rows.map(toRow);
  }

  async list(status: StatusFilter, limit: number): Promise<SignalRow[]> {
    const where =
      status === "active"
        ? eq(signals.status, "active")
        : status === "resolved"
          ? ne(signals.status, "active")
          : sql`true`;
    const rows = await this.db
      .select()
      .from(signals)
      .where(where)
      .orderBy(desc(signals.generatedAt))
      .limit(limit);
    return rows.map(toRow);
  }

  async markResolved(id: string, status: Exclude<SignalStatus, "active">): Promise<void> {
    await this.db
      .update(signals)
      .set({ status })
      .where(and(eq(signals.id, id), eq(signals.status, "active")));
  }

  async insertOutbox(topic: string, payload: unknown): Promise<void> {
    await this.db.insert(outbox).values({ topic, payload });
  }
}

function toRow(r: typeof signals.$inferSelect): SignalRow {
  return {
    id: r.id,
    symbol: r.symbol as SymbolCode,
    side: r.side as "buy" | "sell",
    confidence: r.confidence,
    entry: r.entry,
    stop: r.stop,
    target: r.target,
    horizonMin: r.horizonMin,
    rationale: r.rationale,
    modelVersion: r.modelVersion,
    dataSource: r.dataSource,
    status: r.status as SignalStatus,
    generatedAt: r.generatedAt,
    expiresAt: r.expiresAt,
  };
}
