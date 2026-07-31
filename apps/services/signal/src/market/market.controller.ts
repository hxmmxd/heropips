import { Controller, Get, Inject, Query } from "@nestjs/common";
import { SYMBOLS, type QuotesRes, type SymbolCode } from "@heropips/contracts";
import { apiError } from "../common/errors";
import { perMinute, RateLimit } from "../common/rate-limit";
import { quoteFromMid } from "./quotes";
import { QUANT_SOURCE, type QuantSource } from "./source";

/** No auth by design: quotes are platform-gated at the web BFF; trading-svc consumes this. */
@Controller("v1/quotes")
export class MarketController {
  // Explicit token: tsx/esbuild does not emit decorator design:paramtypes metadata.
  constructor(@Inject(QUANT_SOURCE) private readonly source: QuantSource) {}

  /**
   * 600/min/session, 1200/min/IP. Every miss can fan out to Binance, so an
   * unlimited caller burns a third-party quota, not just our CPU. The dashboard
   * polls quotes on a short timer and trading-svc calls this per order, so this
   * is set ~10x above the busiest legitimate pattern.
   */
  @Get()
  @RateLimit(perMinute(600, "principal"), perMinute(1200, "ip"))
  async quotes(@Query("symbols") symbols?: string): Promise<QuotesRes> {
    const requested =
      symbols === undefined || symbols.trim().length === 0
        ? (Object.keys(SYMBOLS) as SymbolCode[])
        : symbols.split(",").map((s) => s.trim().toUpperCase());

    const quotes = [];
    for (const raw of requested) {
      if (!(raw in SYMBOLS)) {
        throw apiError(422, "symbol_unknown", `Unknown symbol: ${raw}.`, "Use symbols from the tradable universe.");
      }
      const symbol = raw as SymbolCode;
      const { price, ts } = await this.source.getLatest(symbol);
      quotes.push(quoteFromMid(symbol, price, ts));
    }
    return { quotes };
  }
}
