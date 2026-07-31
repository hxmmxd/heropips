import { SYMBOLS, type QuoteRes, type SymbolCode } from "@heropips/contracts";

/* =========================================================================
 * PURE position / PnL engine. No I/O, no clocks, no randomness — every
 * function here is a deterministic mapping from inputs to outputs so the
 * money math can be tested exhaustively.
 *
 * MONEY MODEL
 * - All balances/fees/realized PnL are integer USD minor units (cents).
 * - Prices are floats (per-symbol precision from SYMBOLS); internal math is
 *   float64 with explicit rounding to cents ONLY at accounting boundaries.
 * - Rounding is half-away-from-zero so long/short mirrors stay symmetric.
 * - PnL is first computed in the symbol's QUOTE currency, then converted to
 *   USD at the engine boundary via usdPerQuote(symbol, price): USD/USDT
 *   quotes are 1:1; a JPY quote (USDJPY, base_is_usd) converts at 1/price
 *   of the pair itself. The rate is taken from the SAME price that produced
 *   the amount (fill price for realized, mark for unrealized), so each
 *   converted integer is a pure function of one observed price.
 *
 * ACCOUNTING MODEL (average cost per (connection, symbol))
 * - Same-direction fill:  new_avg = (qty*avg + fill_qty*price) / (qty+fill_qty).
 *   The fill's fee is NOT charged to balance yet; it is carried on the
 *   position (entryFeesUsdMinor) and consumed pro-rata as the position is
 *   reduced. This makes balance change ONLY on reducing fills, and makes
 *   Σ trade.rpl == balance delta EXACT (zero-cent reconciliation).
 * - Opposite-direction fill reduces first:
 *     gross = roundMoney(closed_qty * (exit - avg_entry) * contract_size
 *             * dir * usd_per_quote(exit) * 100)
 *   The quote→USD rate is the FILL price that realizes the chunk, so the
 *   trade row and the balance mutation share one converted integer.
 *     rpl   = gross - close_fee_share - entry_fee_share          (dir: +1 long, -1 short)
 *   Crossing through zero closes the trade row and opens the remainder at
 *   the fill price as a NEW position (the fill fee is split pro-rata by qty).
 * - Entry-fee shares round pro-rata but the FINAL close takes the exact
 *   remainder, so fee cents never leak.
 * ======================================================================= */

/** Fee: 8 bps of notional, 1¢ minimum. */
export const FEE_BPS = 8;
export const GUARD_MAX_RISK_PCT = 2;
export const GUARD_MAX_OPEN_POSITIONS = 5;
export const GUARD_DAILY_LOSS_LIMIT_PCT = 5;

export const QTY_EPS = 1e-9;

/** Round to integer cents, half away from zero (symmetric for shorts). */
export function roundMoney(x: number): number {
  const r = Math.round(Math.abs(x));
  return x < 0 ? -r : r;
}

/** Kill float residue on quantities (8 decimal places is beyond any step). */
export function roundQty(q: number): number {
  return Math.round(q * 1e8) / 1e8;
}

export type PositionSide = "long" | "short";

export interface EnginePosition {
  id: string;
  symbol: SymbolCode;
  side: PositionSide;
  qty: number;
  avgEntry: number;
  /** Entry fees paid but not yet realized; consumed pro-rata on reduces. */
  entryFeesUsdMinor: number;
  openedAt: string;
  signalId: string | null;
}

export interface FillSpec {
  symbol: SymbolCode;
  side: "buy" | "sell";
  qty: number;
  price: number;
  feeUsdMinor: number;
  ts: string;
  signalId: string | null;
  /** Used when the fill opens a (new or flipped) position. */
  newPositionId: string;
}

/** A closed chunk — one row per reducing fill (drives trades + rpl_today). */
export interface ClosedTrade {
  positionId: string;
  symbol: SymbolCode;
  side: PositionSide;
  qty: number;
  entry: number;
  exit: number;
  /** Net of close-fee share AND entry-fee share — the exact balance delta. */
  rplUsdMinor: number;
  feesUsdMinor: number;
  signalId: string | null;
  openedAt: string;
  closedAt: string;
}

export interface FillResult {
  position: EnginePosition | null;
  /** Exact cents to add to the connection balance (Σ trades[].rplUsdMinor). */
  balanceDeltaUsdMinor: number;
  trades: ClosedTrade[];
}

/**
 * USD per 1 unit of the symbol's quote currency, at the given price of the
 * pair. USD/USDT quotes convert 1:1. A JPY quote means the pair itself IS
 * the USDJPY rate (base_is_usd), so 1 JPY = 1/price USD.
 */
export function usdPerQuote(symbol: SymbolCode, price: number): number {
  return SYMBOLS[symbol].quote === "JPY" ? 1 / price : 1;
}

/**
 * Notional in USD cents. base_is_usd (USDJPY): qty × contract_size is
 * already USD, so the price term is dropped — multiplying by a JPY price
 * would inflate the notional ~150×. Otherwise qty × price × contract_size.
 */
export function notionalUsdMinor(qty: number, price: number, symbol: SymbolCode): number {
  const spec = SYMBOLS[symbol];
  const notionalUsd = spec.base_is_usd ? qty * spec.contract_size : qty * price * spec.contract_size;
  return roundMoney(notionalUsd * 100);
}

/** fee = max(1¢, roundMoney(notional_usd_minor × 8 bps)). */
export function feeUsdMinor(qty: number, price: number, symbol: SymbolCode): number {
  return Math.max(1, roundMoney(notionalUsdMinor(qty, price, symbol) * (FEE_BPS / 10_000)));
}

/** Conservative mark: longs exit at bid, shorts exit at ask. */
export function markPrice(side: PositionSide, quote: Pick<QuoteRes, "bid" | "ask">): number {
  return side === "long" ? quote.bid : quote.ask;
}

/** upl = roundMoney(qty × (mark − avg_entry) × contract_size × dir × usd_per_quote(mark) × 100). */
export function uplUsdMinor(pos: EnginePosition, mark: number): number {
  const dir = pos.side === "long" ? 1 : -1;
  return roundMoney(
    pos.qty * (mark - pos.avgEntry) * SYMBOLS[pos.symbol].contract_size * dir * usdPerQuote(pos.symbol, mark) * 100,
  );
}

/**
 * RISK-BASED SIZING (documented formula, tested exactly):
 *   risk_usd  = (equity_usd_minor / 100) × (risk_pct / 100)
 *   per_unit  = |entry − stop| × usd_per_quote(entry) × contract_size
 *               (USD risked per 1.0 qty — the stop distance is in the QUOTE
 *                currency, converted at the entry price)
 *   step      = 10^(−precision)                       (symbol price precision)
 *   qty       = floor(risk_usd / per_unit / step) × step   — floored to step
 * Returns 0 when the stop equals entry or equity is too small for one step.
 */
export function sizeByRisk(
  equityUsdMinor: number,
  riskPct: number,
  entry: number,
  stop: number,
  symbol: SymbolCode,
): number {
  const spec = SYMBOLS[symbol];
  const perUnit = Math.abs(entry - stop) * usdPerQuote(symbol, entry) * spec.contract_size;
  if (perUnit <= 0 || equityUsdMinor <= 0) return 0;
  const riskUsd = (equityUsdMinor / 100) * (riskPct / 100);
  const step = Math.pow(10, -spec.precision);
  // Float slack: |entry−stop| carries ~1e-16 relative error, which at 1e4
  // steps shows up as ~1e-12 absolute — a 1e-6 nudge cannot jump a step
  // unless the true value sits within a millionth of the boundary.
  const steps = Math.floor(riskUsd / perUnit / step + 1e-6);
  return roundQty(Math.max(0, steps) * step);
}

/** Apply one market fill to the (at most one) position on (connection, symbol). */
export function applyFill(position: EnginePosition | null, fill: FillSpec): FillResult {
  const spec = SYMBOLS[fill.symbol];
  const fillDir = fill.side === "buy" ? 1 : -1;

  // No position → open.
  if (!position || position.qty <= QTY_EPS) {
    return {
      position: {
        id: fill.newPositionId,
        symbol: fill.symbol,
        side: fillDir > 0 ? "long" : "short",
        qty: roundQty(fill.qty),
        avgEntry: fill.price,
        entryFeesUsdMinor: fill.feeUsdMinor,
        openedAt: fill.ts,
        signalId: fill.signalId,
      },
      balanceDeltaUsdMinor: 0,
      trades: [],
    };
  }

  const posDir = position.side === "long" ? 1 : -1;

  // Same direction → weighted-average add.
  if (posDir === fillDir) {
    const newQty = roundQty(position.qty + fill.qty);
    const newAvg = (position.qty * position.avgEntry + fill.qty * fill.price) / newQty;
    return {
      position: {
        ...position,
        qty: newQty,
        avgEntry: newAvg,
        entryFeesUsdMinor: position.entryFeesUsdMinor + fill.feeUsdMinor,
      },
      balanceDeltaUsdMinor: 0,
      trades: [],
    };
  }

  // Opposite direction → reduce first, flip remainder.
  const closedQty = Math.min(position.qty, fill.qty);
  const crossing = fill.qty > position.qty + QTY_EPS;
  const fullClose = fill.qty >= position.qty - QTY_EPS;

  // Fill-fee split between the closing part and any flipped remainder.
  const feeClose = crossing
    ? roundMoney(fill.feeUsdMinor * (closedQty / fill.qty))
    : fill.feeUsdMinor;
  const feeOpen = fill.feeUsdMinor - feeClose;

  // Entry-fee share: pro-rata, but the final close takes the exact remainder.
  const entryShare = fullClose
    ? position.entryFeesUsdMinor
    : roundMoney(position.entryFeesUsdMinor * (closedQty / position.qty));

  const gross = roundMoney(
    closedQty *
      (fill.price - position.avgEntry) *
      spec.contract_size *
      posDir *
      usdPerQuote(fill.symbol, fill.price) *
      100,
  );
  const rpl = gross - feeClose - entryShare;

  const trade: ClosedTrade = {
    positionId: position.id,
    symbol: position.symbol,
    side: position.side,
    qty: roundQty(closedQty),
    entry: position.avgEntry,
    exit: fill.price,
    rplUsdMinor: rpl,
    feesUsdMinor: feeClose + entryShare,
    signalId: position.signalId ?? fill.signalId,
    openedAt: position.openedAt,
    closedAt: fill.ts,
  };

  let next: EnginePosition | null = null;
  if (!fullClose) {
    next = {
      ...position,
      qty: roundQty(position.qty - closedQty),
      entryFeesUsdMinor: position.entryFeesUsdMinor - entryShare,
    };
  } else if (crossing) {
    const remainder = roundQty(fill.qty - closedQty);
    next = {
      id: fill.newPositionId,
      symbol: fill.symbol,
      side: fillDir > 0 ? "long" : "short",
      qty: remainder,
      avgEntry: fill.price,
      entryFeesUsdMinor: feeOpen,
      openedAt: fill.ts,
      signalId: fill.signalId,
    };
  }

  return { position: next, balanceDeltaUsdMinor: rpl, trades: [trade] };
}

/* ---------- Trade Guard (fail-closed, pure) ---------- */

export type GuardReason = "max_risk_per_trade" | "max_open_positions" | "daily_loss_breaker";

export interface GuardInput {
  /** Equity of the connection placing the order, in cents. */
  equityUsdMinor: number;
  /** Open position count on the connection BEFORE this order. */
  openPositionsOnConnection: number;
  /** Existing position on (connection, symbol), if any. */
  existing: EnginePosition | null;
  side: "buy" | "sell";
  qty: number;
  entry: number;
  stop: number | undefined;
  symbol: SymbolCode;
  /** User-level realized PnL since UTC midnight, cents. */
  rplTodayUsdMinor: number;
  /** User-level unrealized PnL right now, cents. */
  uplNowUsdMinor: number;
  /** User-level equity stored at first touch of the UTC day, cents. */
  dayStartEquityUsdMinor: number;
}

/** True when the order purely reduces an existing opposite position. */
export function isPureReduce(existing: EnginePosition | null, side: "buy" | "sell", qty: number): boolean {
  if (!existing) return false;
  const opposite = (existing.side === "long") === (side === "sell");
  return opposite && qty <= existing.qty + QTY_EPS;
}

/**
 * Evaluate guards in spec order: risk per trade → max open positions →
 * daily-loss breaker. Pure reduces (closing/derisking) are always allowed.
 * Returns the blocking reason or null.
 */
export function evaluateGuards(g: GuardInput): GuardReason | null {
  if (isPureReduce(g.existing, g.side, g.qty)) return null;

  // 1) Max risk per trade: 2% of connection equity (needs a stop to be defined).
  //    Stop distance is in the quote currency → convert at the entry price so
  //    the comparison is USD vs USD (JPY distances would otherwise inflate ~150×).
  if (g.stop !== undefined) {
    const riskUsdMinor = roundMoney(
      g.qty * Math.abs(g.entry - g.stop) * SYMBOLS[g.symbol].contract_size * usdPerQuote(g.symbol, g.entry) * 100,
    );
    if (riskUsdMinor > roundMoney(g.equityUsdMinor * (GUARD_MAX_RISK_PCT / 100))) {
      return "max_risk_per_trade";
    }
  }

  // 2) Max 5 concurrent positions per connection (only a brand-new symbol adds one).
  if (!g.existing && g.openPositionsOnConnection >= GUARD_MAX_OPEN_POSITIONS) {
    return "max_open_positions";
  }

  // 3) Daily-loss breaker: today's realized + current unrealized ≤ −5% of
  //    day-start equity blocks NEW entries until the next UTC day.
  if (g.dayStartEquityUsdMinor > 0) {
    const limit = -roundMoney(g.dayStartEquityUsdMinor * (GUARD_DAILY_LOSS_LIMIT_PCT / 100));
    if (g.rplTodayUsdMinor + g.uplNowUsdMinor <= limit) return "daily_loss_breaker";
  }

  return null;
}
