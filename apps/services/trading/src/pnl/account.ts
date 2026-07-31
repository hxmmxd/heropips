import type { ConnectionRow, PositionRow, TradingRepo } from "../db/repo";
import type { QuoteProvider } from "../quotes/provider";
import { markPrice, uplUsdMinor } from "./engine";

/* Account-state assembly shared by execution, PnL reads, and the mark
 * sweeper: positions marked live at read time using latest quotes. */

export interface MarkedPosition {
  row: PositionRow;
  mark: number;
  uplUsdMinor: number;
}

export async function markPositions(rows: PositionRow[], quotes: QuoteProvider): Promise<MarkedPosition[]> {
  const out: MarkedPosition[] = [];
  for (const row of rows) {
    const quote = await quotes.getQuote(row.symbol);
    const mark = markPrice(row.side, quote);
    out.push({ row, mark, uplUsdMinor: uplUsdMinor(row, mark) });
  }
  return out;
}

export interface UserAccount {
  connections: ConnectionRow[];
  marked: MarkedPosition[];
  balanceUsdMinor: number;
  uplUsdMinor: number;
  equityUsdMinor: number;
}

/** Equity = Σ connection balances + Σ live-marked unrealized PnL. */
export async function computeUserAccount(
  userId: string,
  repo: TradingRepo,
  quotes: QuoteProvider,
): Promise<UserAccount> {
  const conns = await repo.listConnections(userId);
  const rows = await repo.listPositionsByUser(userId);
  const marked = await markPositions(rows, quotes);
  let balance = 0;
  for (const c of conns) balance += c.balanceUsdMinor;
  let upl = 0;
  for (const m of marked) upl += m.uplUsdMinor;
  return {
    connections: conns,
    marked,
    balanceUsdMinor: balance,
    uplUsdMinor: upl,
    equityUsdMinor: balance + upl,
  };
}

/** UTC calendar day ("YYYY-MM-DD") — the day-anchor / breaker reset key. */
export function utcDayOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO instant of the current UTC midnight — rpl_today lower bound. */
export function utcMidnightIso(d: Date): string {
  return `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
}
