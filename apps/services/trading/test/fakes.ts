import type { QuoteRes, SessionUserRes, SymbolCode } from "@heropips/contracts";
import type { Introspector } from "../src/auth/introspect";
import type { QuoteProvider } from "../src/quotes/provider";

/** Scripted prices; tests mutate `set()` between orders to move the market. */
export class FakeQuotes implements QuoteProvider {
  private readonly prices = new Map<SymbolCode, { bid: number; ask: number }>();

  set(symbol: SymbolCode, bid: number, ask: number = bid): void {
    this.prices.set(symbol, { bid, ask });
  }

  async getQuote(symbol: SymbolCode): Promise<QuoteRes> {
    const p = this.prices.get(symbol);
    if (!p) throw new Error(`no scripted quote for ${symbol}`);
    return { symbol, bid: p.bid, ask: p.ask, ts: "2026-07-28T00:00:00.000Z" };
  }
}

export class FakeIntrospector implements Introspector {
  readonly users = new Map<string, SessionUserRes>();

  async introspect(token: string): Promise<SessionUserRes | null> {
    return this.users.get(token) ?? null;
  }
}

export function makeUser(overrides: Partial<SessionUserRes> = {}): SessionUserRes {
  return {
    id: "u1",
    email: "hero@heropips.com",
    display_name: "Hero",
    role: "member",
    founding: true,
    created_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}
