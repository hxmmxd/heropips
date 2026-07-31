import type { EventEnvelope, SignalStatus, SymbolCode } from "@heropips/contracts";
import type { NewSignal, SignalRepo, SignalRow, StatusFilter } from "../src/signals/signals.repo";

export interface OutboxRow {
  topic: string;
  payload: EventEnvelope;
}

/** In-memory SignalRepo — same semantics as the pg impl, incl. the partial unique index. */
export class MemSignalRepo implements SignalRepo {
  rows: SignalRow[] = [];
  outbox: OutboxRow[] = [];

  async insertSignal(row: NewSignal): Promise<void> {
    if (this.rows.some((r) => r.symbol === row.symbol && r.status === "active")) {
      // Mirrors signals_one_active_per_symbol_uq.
      throw new Error(`duplicate active signal for ${row.symbol}`);
    }
    this.rows.push({ ...row });
  }

  async hasActive(symbol: SymbolCode): Promise<boolean> {
    return this.rows.some((r) => r.symbol === symbol && r.status === "active");
  }

  async listActive(): Promise<SignalRow[]> {
    return this.rows.filter((r) => r.status === "active").map((r) => ({ ...r }));
  }

  async list(status: StatusFilter, limit: number): Promise<SignalRow[]> {
    const filtered = this.rows.filter((r) =>
      status === "all" ? true : status === "active" ? r.status === "active" : r.status !== "active",
    );
    return filtered
      .slice()
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }

  async markResolved(id: string, status: Exclude<SignalStatus, "active">): Promise<void> {
    const row = this.rows.find((r) => r.id === id && r.status === "active");
    if (row) row.status = status;
  }

  async insertOutbox(topic: string, payload: unknown): Promise<void> {
    this.outbox.push({ topic, payload: payload as EventEnvelope });
  }
}
