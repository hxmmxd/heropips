import { QuotesRes, type QuoteRes, type SymbolCode } from "@heropips/contracts";
import { apiError } from "../common/errors";

/** DI seam: execution and PnL reads depend on this; tests inject scripted prices. */
export interface QuoteProvider {
  getQuote(symbol: SymbolCode): Promise<QuoteRes>;
}

export const QUOTE_PROVIDER = Symbol("QUOTE_PROVIDER");

const CACHE_TTL_MS = 5_000;

/** Pulls signal-svc GET /v1/quotes with a 5s in-memory cache. */
export class HttpQuoteProvider implements QuoteProvider {
  private cache: Map<SymbolCode, QuoteRes> = new Map();
  private fetchedAt = 0;

  constructor(
    private readonly signalUrl: string,
    private readonly now: () => number = Date.now,
  ) {}

  async getQuote(symbol: SymbolCode): Promise<QuoteRes> {
    if (this.now() - this.fetchedAt >= CACHE_TTL_MS) {
      await this.refresh();
    }
    const quote = this.cache.get(symbol);
    if (!quote) {
      throw apiError(503, "broker_unavailable", "No quote available for this symbol.", "Retry shortly.");
    }
    return quote;
  }

  private async refresh(): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${this.signalUrl}/v1/quotes`);
    } catch {
      throw apiError(503, "broker_unavailable", "Quote feed unavailable.", "Retry shortly.");
    }
    if (!res.ok) {
      throw apiError(503, "broker_unavailable", "Quote feed unavailable.", "Retry shortly.");
    }
    const parsed = QuotesRes.safeParse(await res.json().catch(() => null));
    if (!parsed.success) {
      throw apiError(503, "broker_unavailable", "Quote feed returned an invalid payload.", "Retry shortly.");
    }
    this.cache = new Map(parsed.data.quotes.map((q) => [q.symbol, q]));
    this.fetchedAt = this.now();
  }
}
