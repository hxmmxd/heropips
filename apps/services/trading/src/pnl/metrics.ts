/* =========================================================================
 * PURE account metrics over equity curves and closed trades.
 * ======================================================================= */

/**
 * Max drawdown in integer bps (floored) from the running peak over the
 * equity series, in order. 0 for empty/monotone-up curves.
 */
export function maxDrawdownBps(equities: readonly number[]): number {
  let peak = Number.NEGATIVE_INFINITY;
  let maxDd = 0;
  for (const e of equities) {
    if (e > peak) peak = e;
    if (peak > 0) {
      const dd = Math.floor(((peak - e) / peak) * 10_000);
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

/** Simple daily returns from consecutive day-close equities. */
export function dailyReturns(dayCloses: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < dayCloses.length; i++) {
    const prev = dayCloses[i - 1];
    if (prev > 0) out.push(dayCloses[i] / prev - 1);
  }
  return out;
}

/**
 * Annualized Sharpe (rf = 0): mean/stdev of daily returns × √365.
 * One-pass Welford; sample stdev (n−1). Null when < 5 points or stdev = 0.
 */
export function sharpe(returns: readonly number[]): number | null {
  const n = returns.length;
  if (n < 5) return null;
  let mean = 0;
  let m2 = 0;
  let count = 0;
  for (const r of returns) {
    count += 1;
    const delta = r - mean;
    mean += delta / count;
    m2 += delta * (r - mean);
  }
  const stdev = Math.sqrt(m2 / (count - 1));
  if (stdev === 0) return null;
  return (mean / stdev) * Math.sqrt(365);
}

/** Fraction of closed trades with rpl > 0. Null when there are no trades. */
export function winRate(rplsUsdMinor: readonly number[]): number | null {
  if (rplsUsdMinor.length === 0) return null;
  let wins = 0;
  for (const r of rplsUsdMinor) if (r > 0) wins += 1;
  return wins / rplsUsdMinor.length;
}

/**
 * Evenly downsample a series to at most `points` entries, always keeping the
 * first and last points.
 */
export function downsampleEvenly<T>(series: readonly T[], points: number): T[] {
  const n = series.length;
  const cap = Math.max(1, Math.floor(points));
  if (n <= cap) return [...series];
  if (cap === 1) return [series[n - 1]];
  const out: T[] = [];
  for (let i = 0; i < cap; i++) {
    out.push(series[Math.round((i * (n - 1)) / (cap - 1))]);
  }
  return out;
}
