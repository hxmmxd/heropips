import { Inject, Injectable } from "@nestjs/common";
import type {
  EquityCurveRes,
  PnlSummaryRes,
  PositionsRes,
  SessionUserRes,
  TradesRes,
} from "@heropips/contracts";
import { TRADING_REPO, type TradingRepo } from "../db/repo";
import { CLOCK, type Clock } from "../exec/exec.service";
import { QUOTE_PROVIDER, type QuoteProvider } from "../quotes/provider";
import { computeUserAccount, markPositions, utcMidnightIso } from "./account";
import { dailyReturns, downsampleEvenly, maxDrawdownBps, sharpe, winRate } from "./metrics";

const TRADES_PAGE_SIZE = 50;
const THIRTY_DAYS_MS = 30 * 86_400_000;

@Injectable()
export class ReadService {
  constructor(
    @Inject(TRADING_REPO) private readonly repo: TradingRepo,
    @Inject(QUOTE_PROVIDER) private readonly quotes: QuoteProvider,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  async summary(user: SessionUserRes): Promise<PnlSummaryRes> {
    const now = this.now();
    const account = await computeUserAccount(user.id, this.repo, this.quotes);
    const rplToday = await this.repo.sumRplSince(user.id, utcMidnightIso(now));
    const rplTotal = await this.repo.sumRplTotal(user.id);
    const snapshots = await this.repo.listSnapshots(user.id);
    const since30 = new Date(now.getTime() - THIRTY_DAYS_MS).toISOString();
    const trades30 = await this.repo.listTradesSince(user.id, since30);

    // Drawdown runs over the full snapshot curve plus the live equity point.
    const equities = snapshots.map((s) => s.equityUsdMinor);
    equities.push(account.equityUsdMinor);

    // Daily returns from UTC day-close equities over the last 30 days.
    const closeByDay = new Map<string, number>();
    for (const s of snapshots) {
      if (s.ts >= since30) closeByDay.set(s.ts.slice(0, 10), s.equityUsdMinor);
    }
    const dayCloses = [...closeByDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([, equity]) => equity);

    return {
      equity_usd_minor: account.equityUsdMinor,
      balance_usd_minor: account.balanceUsdMinor,
      upl_usd_minor: account.uplUsdMinor,
      rpl_today_usd_minor: rplToday,
      rpl_total_usd_minor: rplTotal,
      max_drawdown_bps: maxDrawdownBps(equities),
      sharpe_30d: sharpe(dailyReturns(dayCloses)),
      win_rate_30d: winRate(trades30.map((t) => t.rplUsdMinor)),
      trades_30d: trades30.length,
      as_of: now.toISOString(),
    };
  }

  async equityCurve(user: SessionUserRes, points: number | undefined): Promise<EquityCurveRes> {
    const cap = Math.min(Math.max(Math.floor(points ?? 200), 1), 500);
    const snapshots = await this.repo.listSnapshots(user.id);
    return {
      points: downsampleEvenly(snapshots, cap).map((s) => ({
        ts: s.ts,
        equity_usd_minor: s.equityUsdMinor,
      })),
    };
  }

  async positions(user: SessionUserRes): Promise<PositionsRes> {
    const rows = await this.repo.listPositionsByUser(user.id);
    const marked = await markPositions(rows, this.quotes);
    return {
      positions: marked.map((m) => ({
        id: m.row.id,
        connection_id: m.row.connectionId,
        symbol: m.row.symbol,
        side: m.row.side,
        qty: m.row.qty,
        avg_entry: m.row.avgEntry,
        mark: m.mark,
        upl_usd_minor: m.uplUsdMinor,
        opened_at: m.row.openedAt,
      })),
    };
  }

  async trades(user: SessionUserRes, cursor: string | undefined): Promise<TradesRes> {
    let before: { closedAt: string; id: string } | undefined;
    if (cursor) {
      const decoded = Buffer.from(cursor, "base64url").toString("utf8");
      const sep = decoded.indexOf("|");
      if (sep > 0) before = { closedAt: decoded.slice(0, sep), id: decoded.slice(sep + 1) };
    }
    const page = await this.repo.listTrades(user.id, TRADES_PAGE_SIZE, before);
    return {
      trades: page.rows.map((t) => ({
        id: t.id,
        symbol: t.symbol,
        side: t.side,
        qty: t.qty,
        entry: t.entry,
        exit: t.exit,
        rpl_usd_minor: t.rplUsdMinor,
        fees_usd_minor: t.feesUsdMinor,
        signal_id: t.signalId,
        opened_at: t.openedAt,
        closed_at: t.closedAt,
      })),
      next_cursor: page.nextCursor
        ? Buffer.from(`${page.nextCursor.closedAt}|${page.nextCursor.id}`, "utf8").toString("base64url")
        : null,
    };
  }
}
