import { Logger } from "@nestjs/common";
import { SYMBOLS, type SymbolCode } from "@heropips/contracts";
import type { Candle, LatestTick, QuantSource } from "./source";
import type { SimQuantSource } from "./sim.source";

export const BINANCE_DATA_SOURCE = "binance-public";

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * Public Binance klines for crypto symbols (SOURCE=binance). Non-crypto
 * symbols and any network failure fall back to the deterministic sim — the
 * fallback is logged once per symbol and reflected in dataSource() so signals
 * never claim live provenance for simulated bars.
 */
export class BinancePublicSource implements QuantSource {
  private readonly logger = new Logger("binance-source");
  private readonly warned = new Set<SymbolCode>();
  private readonly live = new Set<SymbolCode>();

  constructor(
    private readonly fallback: SimQuantSource,
    private readonly fetchFn: FetchLike = (url) => fetch(url),
    private readonly baseUrl = "https://api.binance.com",
  ) {}

  dataSource(symbol: SymbolCode): string {
    return this.live.has(symbol) ? BINANCE_DATA_SOURCE : this.fallback.dataSource(symbol);
  }

  async getCandles(symbol: SymbolCode, n: number): Promise<Candle[]> {
    if (SYMBOLS[symbol].market !== "crypto") return this.fallback.getCandles(symbol, n);
    try {
      const url = `${this.baseUrl}/api/v3/klines?symbol=${symbol}&interval=1m&limit=${n}`;
      const res = await this.fetchFn(url);
      if (!res.ok) throw new Error(`klines HTTP ${res.status}`);
      const rows = (await res.json()) as [number, string, string, string, string, string][];
      this.live.add(symbol);
      return rows.map((r) => ({
        ts: new Date(r[0]).toISOString(),
        o: Number(r[1]),
        h: Number(r[2]),
        l: Number(r[3]),
        c: Number(r[4]),
        v: Number(r[5]),
      }));
    } catch (err) {
      this.live.delete(symbol);
      if (!this.warned.has(symbol)) {
        this.warned.add(symbol);
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`binance klines unavailable for ${symbol}, falling back to sim: ${message}`);
      }
      return this.fallback.getCandles(symbol, n);
    }
  }

  async getLatest(symbol: SymbolCode): Promise<LatestTick> {
    if (SYMBOLS[symbol].market !== "crypto") return this.fallback.getLatest(symbol);
    const candles = await this.getCandles(symbol, 1);
    const last = candles[candles.length - 1];
    return { price: last.c, ts: last.ts };
  }
}
