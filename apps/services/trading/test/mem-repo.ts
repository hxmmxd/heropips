import type { OrderRes } from "@heropips/contracts";
import type {
  ConnectionRow,
  EquityPoint,
  PositionRow,
  TradePage,
  TradeRow,
  TradingRepo,
} from "../src/db/repo";

export interface OutboxRow {
  topic: string;
  payload: unknown;
}

/** In-memory TradingRepo — same semantics as the pg impl, minus the locking. */
export class MemRepo implements TradingRepo {
  connections: ConnectionRow[] = [];
  positions: PositionRow[] = [];
  trades: TradeRow[] = [];
  orders = new Map<string, OrderRes>();
  snapshots: { userId: string; ts: string; equityUsdMinor: number }[] = [];
  anchors = new Map<string, number>();
  outbox: OutboxRow[] = [];

  async tx<T>(fn: (ops: TradingRepo) => Promise<T>): Promise<T> {
    return fn(this);
  }

  /* connections */

  async listConnections(userId: string): Promise<ConnectionRow[]> {
    return this.connections.filter((c) => c.userId === userId);
  }

  async getConnection(id: string): Promise<ConnectionRow | null> {
    return this.connections.find((c) => c.id === id) ?? null;
  }

  async insertConnection(row: ConnectionRow): Promise<void> {
    this.connections.push({ ...row });
  }

  async updateConnectionBalance(id: string, balanceUsdMinor: number): Promise<void> {
    const row = this.connections.find((c) => c.id === id);
    if (row) row.balanceUsdMinor = balanceUsdMinor;
  }

  async deleteConnection(id: string): Promise<void> {
    this.connections = this.connections.filter((c) => c.id !== id);
    this.positions = this.positions.filter((p) => p.connectionId !== id);
  }

  /* positions */

  async listPositionsByConnection(connectionId: string): Promise<PositionRow[]> {
    return this.positions.filter((p) => p.connectionId === connectionId).map((p) => ({ ...p }));
  }

  async listPositionsByUser(userId: string): Promise<PositionRow[]> {
    return this.positions.filter((p) => p.userId === userId).map((p) => ({ ...p }));
  }

  async getPosition(id: string): Promise<PositionRow | null> {
    const row = this.positions.find((p) => p.id === id);
    return row ? { ...row } : null;
  }

  /** Upsert keyed on (connection_id, symbol) — mirrors the pg unique index. */
  async upsertPosition(row: PositionRow): Promise<void> {
    const idx = this.positions.findIndex(
      (p) => p.connectionId === row.connectionId && p.symbol === row.symbol,
    );
    if (idx >= 0) this.positions[idx] = { ...row };
    else this.positions.push({ ...row });
  }

  async deletePosition(id: string): Promise<void> {
    this.positions = this.positions.filter((p) => p.id !== id);
  }

  async userIdsWithPositions(): Promise<string[]> {
    return [...new Set(this.positions.map((p) => p.userId))];
  }

  /* trades */

  async insertTrade(row: TradeRow): Promise<void> {
    this.trades.push({ ...row });
  }

  async listTrades(
    userId: string,
    limit: number,
    before?: { closedAt: string; id: string },
  ): Promise<TradePage> {
    let rows = this.trades
      .filter((t) => t.userId === userId)
      .sort((a, b) => (a.closedAt === b.closedAt ? (a.id < b.id ? 1 : -1) : a.closedAt < b.closedAt ? 1 : -1));
    if (before) {
      rows = rows.filter(
        (t) => t.closedAt < before.closedAt || (t.closedAt === before.closedAt && t.id < before.id),
      );
    }
    const page = rows.slice(0, limit).map((t) => ({ ...t }));
    const last = page[page.length - 1];
    return {
      rows: page,
      nextCursor: rows.length > limit && last ? { closedAt: last.closedAt, id: last.id } : null,
    };
  }

  async listTradesSince(userId: string, sinceIso: string): Promise<TradeRow[]> {
    return this.trades
      .filter((t) => t.userId === userId && t.closedAt >= sinceIso)
      .sort((a, b) => (a.closedAt < b.closedAt ? -1 : 1))
      .map((t) => ({ ...t }));
  }

  async sumRplSince(userId: string, sinceIso: string): Promise<number> {
    let total = 0;
    for (const t of this.trades) {
      if (t.userId === userId && t.closedAt >= sinceIso) total += t.rplUsdMinor;
    }
    return total;
  }

  async sumRplTotal(userId: string): Promise<number> {
    let total = 0;
    for (const t of this.trades) if (t.userId === userId) total += t.rplUsdMinor;
    return total;
  }

  /* orders (idempotency) */

  async findOrder(userId: string, idempotencyKey: string): Promise<OrderRes | null> {
    return this.orders.get(`${userId}\u0000${idempotencyKey}`) ?? null;
  }

  async insertOrder(userId: string, idempotencyKey: string, response: OrderRes): Promise<void> {
    const key = `${userId}\u0000${idempotencyKey}`;
    if (this.orders.has(key)) throw new Error("duplicate idempotency key");
    this.orders.set(key, response);
  }

  /* equity snapshots */

  async insertSnapshot(userId: string, ts: string, equityUsdMinor: number): Promise<void> {
    this.snapshots.push({ userId, ts, equityUsdMinor });
  }

  async listSnapshots(userId: string): Promise<EquityPoint[]> {
    return this.snapshots
      .filter((s) => s.userId === userId)
      .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0))
      .map((s) => ({ ts: s.ts, equityUsdMinor: s.equityUsdMinor }));
  }

  /* day anchors */

  async getDayAnchor(userId: string, day: string): Promise<number | null> {
    return this.anchors.get(`${userId}|${day}`) ?? null;
  }

  async insertDayAnchor(userId: string, day: string, equityUsdMinor: number): Promise<void> {
    const key = `${userId}|${day}`;
    if (!this.anchors.has(key)) this.anchors.set(key, equityUsdMinor);
  }

  /* outbox */

  async insertOutbox(topic: string, payload: unknown): Promise<void> {
    this.outbox.push({ topic, payload });
  }
}
