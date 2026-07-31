import { and, asc, desc, eq, gte, lt, or, sql } from "drizzle-orm";
import type { BrokerKind, OrderRes, SymbolCode } from "@heropips/contracts";
import type { EnginePosition } from "../pnl/engine";
import type { Db } from "./client";
import {
  connections,
  dayAnchors,
  equitySnapshots,
  orders,
  outbox,
  positions,
  trades,
} from "./schema";

export interface ConnectionRow {
  id: string;
  userId: string;
  broker: BrokerKind;
  label: string;
  mode: "paper" | "live";
  status: "active" | "pending" | "error";
  statusDetail: string | null;
  balanceUsdMinor: number;
  credCipher: string | null;
  createdAt: string;
}

export interface PositionRow extends EnginePosition {
  userId: string;
  connectionId: string;
}

export interface TradeRow {
  id: string;
  userId: string;
  connectionId: string;
  symbol: SymbolCode;
  side: "long" | "short";
  qty: number;
  entry: number;
  exit: number;
  rplUsdMinor: number;
  feesUsdMinor: number;
  signalId: string | null;
  openedAt: string;
  closedAt: string;
}

export interface EquityPoint {
  ts: string;
  equityUsdMinor: number;
}

export interface TradePage {
  rows: TradeRow[];
  nextCursor: { closedAt: string; id: string } | null;
}

/** DI seam: services depend on this; tests inject an in-memory impl. */
export interface TradingRepo {
  /** Run `fn` atomically; ops mirrors the full repo surface. */
  tx<T>(fn: (ops: TradingRepo) => Promise<T>): Promise<T>;

  listConnections(userId: string): Promise<ConnectionRow[]>;
  getConnection(id: string): Promise<ConnectionRow | null>;
  insertConnection(row: ConnectionRow): Promise<void>;
  updateConnectionBalance(id: string, balanceUsdMinor: number): Promise<void>;
  deleteConnection(id: string): Promise<void>;

  listPositionsByConnection(connectionId: string): Promise<PositionRow[]>;
  listPositionsByUser(userId: string): Promise<PositionRow[]>;
  getPosition(id: string): Promise<PositionRow | null>;
  upsertPosition(row: PositionRow): Promise<void>;
  deletePosition(id: string): Promise<void>;
  userIdsWithPositions(): Promise<string[]>;

  insertTrade(row: TradeRow): Promise<void>;
  /** Newest-first page; `before` is the exclusive (closedAt, id) cursor. */
  listTrades(userId: string, limit: number, before?: { closedAt: string; id: string }): Promise<TradePage>;
  listTradesSince(userId: string, sinceIso: string): Promise<TradeRow[]>;
  sumRplSince(userId: string, sinceIso: string): Promise<number>;
  sumRplTotal(userId: string): Promise<number>;

  findOrder(userId: string, idempotencyKey: string): Promise<OrderRes | null>;
  insertOrder(userId: string, idempotencyKey: string, response: OrderRes): Promise<void>;

  insertSnapshot(userId: string, ts: string, equityUsdMinor: number): Promise<void>;
  listSnapshots(userId: string): Promise<EquityPoint[]>;

  getDayAnchor(userId: string, day: string): Promise<number | null>;
  insertDayAnchor(userId: string, day: string, equityUsdMinor: number): Promise<void>;

  insertOutbox(topic: string, payload: unknown): Promise<void>;
}

export const TRADING_REPO = Symbol("TRADING_REPO");

/* ---------- drizzle/pg implementation ---------- */

export class DrizzleTradingRepo implements TradingRepo {
  constructor(private readonly db: Db) {}

  async tx<T>(fn: (ops: TradingRepo) => Promise<T>): Promise<T> {
    return this.db.transaction(async (t) => fn(new DrizzleTradingRepo(t as unknown as Db)));
  }

  /* connections */

  async listConnections(userId: string): Promise<ConnectionRow[]> {
    const rows = await this.db
      .select()
      .from(connections)
      .where(eq(connections.userId, userId))
      .orderBy(asc(connections.createdAt));
    return rows.map(toConnectionRow);
  }

  async getConnection(id: string): Promise<ConnectionRow | null> {
    const rows = await this.db.select().from(connections).where(eq(connections.id, id)).limit(1);
    return rows.length ? toConnectionRow(rows[0]) : null;
  }

  async insertConnection(row: ConnectionRow): Promise<void> {
    await this.db.insert(connections).values({
      id: row.id,
      userId: row.userId,
      broker: row.broker,
      label: row.label,
      mode: row.mode,
      status: row.status,
      statusDetail: row.statusDetail,
      balanceUsdMinor: row.balanceUsdMinor,
      credCipher: row.credCipher,
      createdAt: new Date(row.createdAt),
    });
  }

  async updateConnectionBalance(id: string, balanceUsdMinor: number): Promise<void> {
    await this.db.update(connections).set({ balanceUsdMinor }).where(eq(connections.id, id));
  }

  async deleteConnection(id: string): Promise<void> {
    await this.db.delete(connections).where(eq(connections.id, id));
  }

  /* positions */

  async listPositionsByConnection(connectionId: string): Promise<PositionRow[]> {
    const rows = await this.db.select().from(positions).where(eq(positions.connectionId, connectionId));
    return rows.map(toPositionRow);
  }

  async listPositionsByUser(userId: string): Promise<PositionRow[]> {
    const rows = await this.db.select().from(positions).where(eq(positions.userId, userId));
    return rows.map(toPositionRow);
  }

  async getPosition(id: string): Promise<PositionRow | null> {
    const rows = await this.db.select().from(positions).where(eq(positions.id, id)).limit(1);
    return rows.length ? toPositionRow(rows[0]) : null;
  }

  async upsertPosition(row: PositionRow): Promise<void> {
    await this.db
      .insert(positions)
      .values({
        id: row.id,
        userId: row.userId,
        connectionId: row.connectionId,
        symbol: row.symbol,
        side: row.side,
        qty: row.qty,
        avgEntry: row.avgEntry,
        entryFeesUsdMinor: row.entryFeesUsdMinor,
        openedAt: new Date(row.openedAt),
        signalId: row.signalId,
      })
      .onConflictDoUpdate({
        target: [positions.connectionId, positions.symbol],
        set: {
          id: row.id,
          side: row.side,
          qty: row.qty,
          avgEntry: row.avgEntry,
          entryFeesUsdMinor: row.entryFeesUsdMinor,
          openedAt: new Date(row.openedAt),
          signalId: row.signalId,
        },
      });
  }

  async deletePosition(id: string): Promise<void> {
    await this.db.delete(positions).where(eq(positions.id, id));
  }

  async userIdsWithPositions(): Promise<string[]> {
    const rows = await this.db.selectDistinct({ userId: positions.userId }).from(positions);
    return rows.map((r) => r.userId);
  }

  /* trades */

  async insertTrade(row: TradeRow): Promise<void> {
    await this.db.insert(trades).values({
      id: row.id,
      userId: row.userId,
      connectionId: row.connectionId,
      symbol: row.symbol,
      side: row.side,
      qty: row.qty,
      entry: row.entry,
      exit: row.exit,
      rplUsdMinor: row.rplUsdMinor,
      feesUsdMinor: row.feesUsdMinor,
      signalId: row.signalId,
      openedAt: new Date(row.openedAt),
      closedAt: new Date(row.closedAt),
    });
  }

  async listTrades(
    userId: string,
    limit: number,
    before?: { closedAt: string; id: string },
  ): Promise<TradePage> {
    const cursorCond = before
      ? or(
          lt(trades.closedAt, new Date(before.closedAt)),
          and(eq(trades.closedAt, new Date(before.closedAt)), lt(trades.id, before.id)),
        )
      : undefined;
    const rows = await this.db
      .select()
      .from(trades)
      .where(cursorCond ? and(eq(trades.userId, userId), cursorCond) : eq(trades.userId, userId))
      .orderBy(desc(trades.closedAt), desc(trades.id))
      .limit(limit + 1);
    const page = rows.slice(0, limit).map(toTradeRow);
    const last = page[page.length - 1];
    return {
      rows: page,
      nextCursor: rows.length > limit && last ? { closedAt: last.closedAt, id: last.id } : null,
    };
  }

  async listTradesSince(userId: string, sinceIso: string): Promise<TradeRow[]> {
    const rows = await this.db
      .select()
      .from(trades)
      .where(and(eq(trades.userId, userId), gte(trades.closedAt, new Date(sinceIso))))
      .orderBy(asc(trades.closedAt));
    return rows.map(toTradeRow);
  }

  async sumRplSince(userId: string, sinceIso: string): Promise<number> {
    const rows = await this.db
      .select({ total: sql<string>`coalesce(sum(${trades.rplUsdMinor}), 0)` })
      .from(trades)
      .where(and(eq(trades.userId, userId), gte(trades.closedAt, new Date(sinceIso))));
    return Number(rows[0]?.total ?? 0);
  }

  async sumRplTotal(userId: string): Promise<number> {
    const rows = await this.db
      .select({ total: sql<string>`coalesce(sum(${trades.rplUsdMinor}), 0)` })
      .from(trades)
      .where(eq(trades.userId, userId));
    return Number(rows[0]?.total ?? 0);
  }

  /* orders (idempotency) */

  async findOrder(userId: string, idempotencyKey: string): Promise<OrderRes | null> {
    const rows = await this.db
      .select({ response: orders.response })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.idempotencyKey, idempotencyKey)))
      .limit(1);
    return rows.length ? (rows[0].response as OrderRes) : null;
  }

  async insertOrder(userId: string, idempotencyKey: string, response: OrderRes): Promise<void> {
    await this.db.insert(orders).values({ userId, idempotencyKey, response });
  }

  /* equity snapshots */

  async insertSnapshot(userId: string, ts: string, equityUsdMinor: number): Promise<void> {
    await this.db.insert(equitySnapshots).values({ userId, ts: new Date(ts), equityUsdMinor });
  }

  async listSnapshots(userId: string): Promise<EquityPoint[]> {
    const rows = await this.db
      .select({ ts: equitySnapshots.ts, equityUsdMinor: equitySnapshots.equityUsdMinor })
      .from(equitySnapshots)
      .where(eq(equitySnapshots.userId, userId))
      .orderBy(asc(equitySnapshots.ts), asc(equitySnapshots.id));
    return rows.map((r) => ({ ts: r.ts.toISOString(), equityUsdMinor: r.equityUsdMinor }));
  }

  /* day anchors */

  async getDayAnchor(userId: string, day: string): Promise<number | null> {
    const rows = await this.db
      .select({ equity: dayAnchors.dayStartEquityUsdMinor })
      .from(dayAnchors)
      .where(and(eq(dayAnchors.userId, userId), eq(dayAnchors.day, day)))
      .limit(1);
    return rows.length ? rows[0].equity : null;
  }

  async insertDayAnchor(userId: string, day: string, equityUsdMinor: number): Promise<void> {
    await this.db
      .insert(dayAnchors)
      .values({ userId, day, dayStartEquityUsdMinor: equityUsdMinor })
      .onConflictDoNothing();
  }

  /* outbox */

  async insertOutbox(topic: string, payload: unknown): Promise<void> {
    await this.db.insert(outbox).values({ topic, payload });
  }
}

/* row mappers (drizzle Date → ISO string at the repo boundary) */

type DbConnection = typeof connections.$inferSelect;
type DbPosition = typeof positions.$inferSelect;
type DbTrade = typeof trades.$inferSelect;

function toConnectionRow(r: DbConnection): ConnectionRow {
  return {
    id: r.id,
    userId: r.userId,
    broker: r.broker as BrokerKind,
    label: r.label,
    mode: r.mode as ConnectionRow["mode"],
    status: r.status as ConnectionRow["status"],
    statusDetail: r.statusDetail,
    balanceUsdMinor: r.balanceUsdMinor,
    credCipher: r.credCipher,
    createdAt: r.createdAt.toISOString(),
  };
}

function toPositionRow(r: DbPosition): PositionRow {
  return {
    id: r.id,
    userId: r.userId,
    connectionId: r.connectionId,
    symbol: r.symbol as SymbolCode,
    side: r.side as PositionRow["side"],
    qty: r.qty,
    avgEntry: r.avgEntry,
    entryFeesUsdMinor: r.entryFeesUsdMinor,
    openedAt: r.openedAt.toISOString(),
    signalId: r.signalId,
  };
}

function toTradeRow(r: DbTrade): TradeRow {
  return {
    id: r.id,
    userId: r.userId,
    connectionId: r.connectionId,
    symbol: r.symbol as SymbolCode,
    side: r.side as TradeRow["side"],
    qty: r.qty,
    entry: r.entry,
    exit: r.exit,
    rplUsdMinor: r.rplUsdMinor,
    feesUsdMinor: r.feesUsdMinor,
    signalId: r.signalId,
    openedAt: r.openedAt.toISOString(),
    closedAt: r.closedAt.toISOString(),
  };
}
