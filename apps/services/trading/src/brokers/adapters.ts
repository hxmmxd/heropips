import type { BrokerKind, ConnectionCreateReq, QuoteRes, SymbolCode } from "@heropips/contracts";
import type { QuoteProvider } from "../quotes/provider";

/* v1 execution is INTERNAL: the paper engine marks against live quotes for
 * every connection. Live-key adapters only validate key shape and store
 * credentials (encrypted) for the live rollout — they never call brokers. */

export type Credentials = ConnectionCreateReq["credentials"];

export interface BrokerValidation {
  ok: boolean;
  /** Human-readable reason when !ok. NEVER contains credential material. */
  detail?: string;
}

export interface IBrokerAdapter {
  readonly kind: BrokerKind;
  validate(credentials: Credentials): Promise<BrokerValidation>;
  quote(symbol: SymbolCode): Promise<QuoteRes>;
}

export const LIVE_PENDING_DETAIL =
  "Keys stored — live execution rolls out to Founding members in waves";

const API_KEY_CHARSET = /^[A-Za-z0-9\-_]+$/;

export class PaperAdapter implements IBrokerAdapter {
  readonly kind = "paper" as const;
  constructor(private readonly quotes: QuoteProvider) {}

  async validate(): Promise<BrokerValidation> {
    return { ok: true };
  }

  async quote(symbol: SymbolCode): Promise<QuoteRes> {
    return this.quotes.getQuote(symbol);
  }
}

export class BinanceAdapter implements IBrokerAdapter {
  readonly kind = "binance" as const;
  constructor(private readonly quotes: QuoteProvider) {}

  async validate(credentials: Credentials): Promise<BrokerValidation> {
    const { api_key, api_secret } = credentials;
    if (!api_key || api_key.length < 16 || !API_KEY_CHARSET.test(api_key)) {
      return { ok: false, detail: "api_key must be at least 16 characters (letters, digits, - or _)." };
    }
    if (!api_secret || api_secret.length < 16 || !API_KEY_CHARSET.test(api_secret)) {
      return { ok: false, detail: "api_secret must be at least 16 characters (letters, digits, - or _)." };
    }
    return { ok: true };
  }

  async quote(symbol: SymbolCode): Promise<QuoteRes> {
    return this.quotes.getQuote(symbol);
  }
}

export class KucoinAdapter implements IBrokerAdapter {
  readonly kind = "kucoin" as const;
  constructor(private readonly quotes: QuoteProvider) {}

  async validate(credentials: Credentials): Promise<BrokerValidation> {
    const { api_key, api_secret, passphrase } = credentials;
    if (!api_key || api_key.length < 16 || !API_KEY_CHARSET.test(api_key)) {
      return { ok: false, detail: "api_key must be at least 16 characters (letters, digits, - or _)." };
    }
    if (!api_secret || api_secret.length < 16 || !API_KEY_CHARSET.test(api_secret)) {
      return { ok: false, detail: "api_secret must be at least 16 characters (letters, digits, - or _)." };
    }
    if (!passphrase || passphrase.length < 6) {
      return { ok: false, detail: "passphrase must be at least 6 characters." };
    }
    return { ok: true };
  }

  async quote(symbol: SymbolCode): Promise<QuoteRes> {
    return this.quotes.getQuote(symbol);
  }
}

export class Mt5Adapter implements IBrokerAdapter {
  readonly kind = "mt5" as const;
  constructor(private readonly quotes: QuoteProvider) {}

  async validate(credentials: Credentials): Promise<BrokerValidation> {
    const { mt5_login, mt5_password, mt5_server } = credentials;
    if (!mt5_login || !/^\d{4,20}$/.test(mt5_login)) {
      return { ok: false, detail: "mt5_login must be a 4-20 digit account number." };
    }
    if (!mt5_server || mt5_server.trim().length < 3) {
      return { ok: false, detail: "mt5_server is required." };
    }
    if (!mt5_password || mt5_password.length < 6) {
      return { ok: false, detail: "mt5_password must be at least 6 characters." };
    }
    return { ok: true };
  }

  async quote(symbol: SymbolCode): Promise<QuoteRes> {
    return this.quotes.getQuote(symbol);
  }
}

export class BrokerAdapters {
  private readonly byKind: Record<BrokerKind, IBrokerAdapter>;

  constructor(quotes: QuoteProvider) {
    this.byKind = {
      paper: new PaperAdapter(quotes),
      binance: new BinanceAdapter(quotes),
      kucoin: new KucoinAdapter(quotes),
      mt5: new Mt5Adapter(quotes),
    };
  }

  for(kind: BrokerKind): IBrokerAdapter {
    return this.byKind[kind];
  }
}

export const BROKER_ADAPTERS = Symbol("BROKER_ADAPTERS");
