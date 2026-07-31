import { SYMBOLS, type SymbolCode } from "@heropips/contracts";
import type { Candle } from "../market/source";
import { atr14, clamp, logReturns, momentum, regimeRatio, roundTo, rsi14, zScore } from "./features";

export const MODEL_VERSION = "quant-ml-v1";

/**
 * quant-ml-v1 — logistic ensemble over the feature pipeline.
 *
 *   p = σ(w·f), fixed documented weights:
 *     momentum ((EMA10−EMA30)/ATR)            +1.10  (trend following)
 *     zScore (price vs EWMA mean λ=0.97)      −0.55  (mean reversion)
 *     rsi extreme ((rsi−50)/50 iff |rsi−50|>20) −0.90 (fade overbought/oversold)
 *     regime dampener (clamp(regime−1, 0, 1.5)) −0.35 (distrust vol expansion)
 *
 * Direction: buy iff p > 0.5. confidence = |2p − 1|.
 * Emission gate: confidence ≥ 0.10 AND spread-adjusted expectancy positive —
 *   |edge| = confidence × ATR14 × 0.8 must exceed 2 × spread.
 * Levels: stop = entry ∓ 1.2×ATR14, target = entry ± 1.8×ATR14 (R = 1.5).
 * Horizon: clamp(round(90 × regime), 30, 240) minutes.
 */
export const WEIGHTS = {
  momentum: 1.1,
  zScore: -0.55,
  rsi: -0.9,
  regime: -0.35,
} as const;

export const MIN_CONFIDENCE = 0.1;
export const EDGE_ATR_FACTOR = 0.8;
export const SPREAD_EDGE_MULT = 2;
export const STOP_ATR_MULT = 1.2;
export const TARGET_ATR_MULT = 1.8; // R = 1.8 / 1.2 = 1.5

export interface SignalProposal {
  side: "buy" | "sell";
  confidence: number;
  entry: number;
  stop: number;
  target: number;
  horizon_min: number;
  rationale: string;
  model_version: string;
}

/**
 * Evaluate one symbol. `spread` is the absolute full spread (ask − bid) at the
 * current mid. Returns null when the gate fails — no signal is emitted.
 */
export function evaluate(symbol: SymbolCode, candles: Candle[], spread: number): SignalProposal | null {
  if (candles.length < 61) return null; // need a full long vol window

  const closes = candles.map((c) => c.c);
  const returns = logReturns(closes);

  const atr = atr14(candles);
  if (atr <= 0) return null;

  const mom = momentum(closes, atr);
  const z = zScore(closes);
  const rsi = rsi14(closes);
  const regime = regimeRatio(returns);

  const rsiFeature = Math.abs(rsi - 50) > 20 ? (rsi - 50) / 50 : 0;
  const regimeFeature = clamp(regime - 1, 0, 1.5);

  const contributions = [
    {
      w: WEIGHTS.momentum * mom,
      text: `momentum ${fmtSigned(mom)} ${mom >= 0 ? "above" : "below"} trend`,
    },
    {
      w: WEIGHTS.zScore * z,
      text: `z-score ${fmtSigned(z)} vs EWMA mean`,
    },
    {
      w: WEIGHTS.rsi * rsiFeature,
      text: `RSI ${Math.round(rsi)} ${rsi >= 70 ? "overbought" : rsi <= 30 ? "oversold" : "neutral"}`,
    },
    {
      w: WEIGHTS.regime * regimeFeature,
      text: `vol regime ${regime.toFixed(2)}x baseline`,
    },
  ];

  const score = contributions.reduce((a, c) => a + c.w, 0);
  const p = 1 / (1 + Math.exp(-score));
  const side: "buy" | "sell" = p > 0.5 ? "buy" : "sell";
  const confidence = Math.abs(2 * p - 1);

  // Emission gate: minimum conviction + spread-adjusted expectancy positive.
  if (confidence < MIN_CONFIDENCE) return null;
  const edge = confidence * atr * EDGE_ATR_FACTOR;
  if (edge <= SPREAD_EDGE_MULT * spread) return null;

  const precision = SYMBOLS[symbol].precision;
  const entry = closes[closes.length - 1];
  const dir = side === "buy" ? 1 : -1;

  const rationale = contributions
    .slice()
    .sort((a, b) => Math.abs(b.w) - Math.abs(a.w))
    .slice(0, 2)
    .map((c) => c.text)
    .join("; ");

  return {
    side,
    confidence: roundTo(confidence, 4),
    entry: roundTo(entry, precision),
    stop: roundTo(entry - dir * STOP_ATR_MULT * atr, precision),
    target: roundTo(entry + dir * TARGET_ATR_MULT * atr, precision),
    horizon_min: clamp(Math.round(90 * regime), 30, 240),
    rationale,
    model_version: MODEL_VERSION,
  };
}

function fmtSigned(x: number): string {
  const r = x.toFixed(2);
  return x >= 0 ? `+${r}` : r;
}
