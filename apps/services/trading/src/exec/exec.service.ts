import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  SYMBOLS,
  TOPICS,
  TRADE_EVENTS,
  type OrderReq,
  type OrderRes,
  type SessionUserRes,
} from "@heropips/contracts";
import { apiError } from "../common/errors";
import { TRADING_REPO, type TradingRepo } from "../db/repo";
import { makeEnvelope } from "../outbox/outbox.service";
import { computeUserAccount, markPositions, utcDayOf, utcMidnightIso } from "../pnl/account";
import { QTY_EPS, applyFill, evaluateGuards, feeUsdMinor, sizeByRisk } from "../pnl/engine";
import { QUOTE_PROVIDER, type QuoteProvider } from "../quotes/provider";

export const CLOCK = Symbol("CLOCK");
export type Clock = () => Date;

/**
 * Order pipeline: idempotency replay → resolve connection (active, owned) →
 * symbol check → sizing (explicit qty | risk_pct with required stop) →
 * Trade Guard (fail-closed) → fill at current quote (buy@ask, sell@bid,
 * fee = max(1¢, 8 bps of notional)) → average-cost position math →
 * trades + balance + equity snapshot + outbox events, all in one tx.
 */
@Injectable()
export class ExecService {
  constructor(
    @Inject(TRADING_REPO) private readonly repo: TradingRepo,
    @Inject(QUOTE_PROVIDER) private readonly quotes: QuoteProvider,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  async placeOrder(user: SessionUserRes, req: OrderReq): Promise<OrderRes> {
    return this.repo.tx(async (ops) => this.execute(ops, user, req));
  }

  /** Full close at market — same pipeline, always a pure reduce. */
  async closePosition(user: SessionUserRes, positionId: string): Promise<OrderRes> {
    const pos = await this.repo.getPosition(positionId);
    if (!pos || pos.userId !== user.id) {
      throw apiError(404, "validation_failed", "Position not found.");
    }
    return this.placeOrder(user, {
      connection_id: pos.connectionId,
      symbol: pos.symbol,
      side: pos.side === "long" ? "sell" : "buy",
      type: "market",
      qty: pos.qty,
      idempotency_key: `close-${positionId}-${randomUUID()}`,
    });
  }

  private async execute(ops: TradingRepo, user: SessionUserRes, req: OrderReq): Promise<OrderRes> {
    // Idempotency: same (user, key) replays the ORIGINAL response verbatim.
    const replay = await ops.findOrder(user.id, req.idempotency_key);
    if (replay) return replay;

    const conn = await ops.getConnection(req.connection_id);
    if (!conn || conn.userId !== user.id) {
      throw apiError(404, "validation_failed", "Connection not found.");
    }
    if (conn.status !== "active") {
      throw apiError(
        409,
        "order_rejected",
        "This connection is not active yet.",
        conn.statusDetail ?? "Live execution has not been enabled for this connection.",
      );
    }

    // Defense in depth: the contract enum already rejects unknown symbols.
    if (!(req.symbol in SYMBOLS)) {
      throw apiError(422, "symbol_unknown", `Unknown symbol: ${String(req.symbol)}.`);
    }

    const quote = await this.quotes.getQuote(req.symbol);
    const entry = req.side === "buy" ? quote.ask : quote.bid;
    const now = this.now();
    const ts = now.toISOString();

    // Connection-scope equity (sizing + risk guard operate per connection).
    const connPositions = await ops.listPositionsByConnection(conn.id);
    const markedConn = await markPositions(connPositions, this.quotes);
    let connUpl = 0;
    for (const m of markedConn) connUpl += m.uplUsdMinor;
    const connEquity = conn.balanceUsdMinor + connUpl;

    // Sizing: explicit qty XOR risk_pct (enforced by the contract schema).
    let qty: number;
    if (req.risk_pct !== undefined) {
      if (req.stop === undefined) {
        throw apiError(422, "validation_failed", "stop is required when sizing with risk_pct.");
      }
      qty = sizeByRisk(connEquity, req.risk_pct, entry, req.stop, req.symbol);
      if (qty <= QTY_EPS) {
        const res: OrderRes = {
          order_id: randomUUID(),
          status: "rejected",
          reason: "quantity_too_small",
          fill: null,
        };
        await ops.insertOrder(user.id, req.idempotency_key, res);
        return res;
      }
    } else {
      qty = req.qty as number;
    }

    // User-scope state for the daily-loss breaker.
    const account = await computeUserAccount(user.id, ops, this.quotes);
    const day = utcDayOf(now);
    let dayStart = await ops.getDayAnchor(user.id, day);
    if (dayStart === null) {
      dayStart = account.equityUsdMinor;
      await ops.insertDayAnchor(user.id, day, dayStart);
    }
    const rplToday = await ops.sumRplSince(user.id, utcMidnightIso(now));

    const existing = connPositions.find((p) => p.symbol === req.symbol) ?? null;
    const reason = evaluateGuards({
      equityUsdMinor: connEquity,
      openPositionsOnConnection: connPositions.length,
      existing,
      side: req.side,
      qty,
      entry,
      stop: req.stop,
      symbol: req.symbol,
      rplTodayUsdMinor: rplToday,
      uplNowUsdMinor: account.uplUsdMinor,
      dayStartEquityUsdMinor: dayStart,
    });
    if (reason) {
      const res: OrderRes = {
        order_id: randomUUID(),
        status: "blocked_by_guard",
        reason,
        fill: null,
      };
      await ops.insertOrder(user.id, req.idempotency_key, res);
      await ops.insertOutbox(
        TOPICS.tradeEvents,
        makeEnvelope(TRADE_EVENTS.orderBlocked, {
          order_id: res.order_id,
          user_id: user.id,
          connection_id: conn.id,
          symbol: req.symbol,
          side: req.side,
          qty,
          reason,
        }),
      );
      return res;
    }

    // Fill: market order at the current quote; fee = max(1¢, 8 bps notional).
    const price = entry;
    const fee = feeUsdMinor(qty, price, req.symbol);
    const result = applyFill(existing, {
      symbol: req.symbol,
      side: req.side,
      qty,
      price,
      feeUsdMinor: fee,
      ts,
      signalId: req.signal_id ?? null,
      newPositionId: randomUUID(),
    });

    if (result.position) {
      await ops.upsertPosition({ ...result.position, userId: user.id, connectionId: conn.id });
    } else if (existing) {
      await ops.deletePosition(existing.id);
    }

    if (result.balanceDeltaUsdMinor !== 0) {
      await ops.updateConnectionBalance(conn.id, conn.balanceUsdMinor + result.balanceDeltaUsdMinor);
    }

    for (const t of result.trades) {
      const tradeId = randomUUID();
      await ops.insertTrade({
        id: tradeId,
        userId: user.id,
        connectionId: conn.id,
        symbol: t.symbol,
        side: t.side,
        qty: t.qty,
        entry: t.entry,
        exit: t.exit,
        rplUsdMinor: t.rplUsdMinor,
        feesUsdMinor: t.feesUsdMinor,
        signalId: t.signalId,
        openedAt: t.openedAt,
        closedAt: t.closedAt,
      });
      await ops.insertOutbox(
        TOPICS.tradeEvents,
        makeEnvelope(TRADE_EVENTS.positionClosed, {
          trade_id: tradeId,
          position_id: t.positionId,
          user_id: user.id,
          connection_id: conn.id,
          symbol: t.symbol,
          side: t.side,
          qty: t.qty,
          entry: t.entry,
          exit: t.exit,
          rpl_usd_minor: t.rplUsdMinor,
          fees_usd_minor: t.feesUsdMinor,
          signal_id: t.signalId,
        }),
      );
    }

    const orderId = randomUUID();
    const res: OrderRes = {
      order_id: orderId,
      status: "filled",
      reason: null,
      fill: { price, qty, fee_usd_minor: fee, ts },
    };
    await ops.insertOrder(user.id, req.idempotency_key, res);
    await ops.insertOutbox(
      TOPICS.tradeEvents,
      makeEnvelope(TRADE_EVENTS.orderFilled, {
        order_id: orderId,
        user_id: user.id,
        connection_id: conn.id,
        symbol: req.symbol,
        side: req.side,
        qty,
        price,
        fee_usd_minor: fee,
        signal_id: req.signal_id ?? null,
      }),
    );

    // Equity snapshot after every fill.
    const post = await computeUserAccount(user.id, ops, this.quotes);
    await ops.insertSnapshot(user.id, ts, post.equityUsdMinor);

    return res;
  }
}
