/**
 * Universal Trading Engine
 * Routes orders to the correct adapter based on provider type.
 */

// ── Shared Types ────────────────────────────────────────────

export interface ConnectionCredentials {
  provider_id: string;
  provider_type: 'metatrader' | 'ctrader' | 'binance' | 'bybit' | 'okx';
  api_key: string;
  api_secret?: string;
  base_url?: string;
  // User-specific (MT5)
  login?: string;
  password?: string;
  server?: string;
  // User-specific (Crypto)
  user_api_key?: string;
  user_api_secret?: string;
}

export interface AccountInfo {
  id: string;
  name: string;
  type: 'metatrader' | 'ctrader' | 'crypto';
  exchange?: string;
  balance: number;
  equity: number;
  currency: string;
  status: 'connected' | 'disconnected' | 'error';
}

export interface BalanceInfo {
  balance: number;
  equity: number;
  unrealizedPnl: number;
  currency: string;
  assets?: { asset: string; free: number; locked: number }[];
}

export interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  volume: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  timestamp: string;
}

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  volume: number;
  type: 'MARKET' | 'LIMIT' | 'STOP';
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface OrderResult {
  orderId: string;
  status: 'filled' | 'pending' | 'rejected' | 'error';
  fillPrice?: number;
  filledVolume?: number;
  message?: string;
}

// ── Adapter Interface ───────────────────────────────────────

export interface TradingAdapter {
  readonly name: string;
  readonly type: string;

  testConnection(apiKey: string, apiSecret?: string, baseUrl?: string): Promise<{ success: boolean; error?: string }>;
  connect(credentials: ConnectionCredentials): Promise<AccountInfo>;
  getBalance(accountId: string, credentials: ConnectionCredentials): Promise<BalanceInfo>;
  getPositions(accountId: string, credentials: ConnectionCredentials): Promise<Position[]>;
  executeOrder(accountId: string, order: OrderRequest, credentials: ConnectionCredentials): Promise<OrderResult>;
  closePosition(accountId: string, positionId: string, credentials: ConnectionCredentials): Promise<OrderResult>;
}

// ── Adapter Registry ────────────────────────────────────────

const adapters: Map<string, TradingAdapter> = new Map();

export function registerAdapter(type: string, adapter: TradingAdapter) {
  adapters.set(type, adapter);
  console.log(`[Engine] Registered adapter: ${adapter.name} (${type})`);
}

export function getAdapter(type: string): TradingAdapter | undefined {
  return adapters.get(type);
}

export function getAllAdapters(): { type: string; name: string }[] {
  return Array.from(adapters.entries()).map(([type, adapter]) => ({
    type,
    name: adapter.name,
  }));
}

// ── Symbol Detection ────────────────────────────────────────

const CRYPTO_SYMBOLS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX', 'MATIC',
  'LINK', 'UNI', 'ATOM', 'LTC', 'FIL', 'APT', 'ARB', 'OP', 'SUI', 'NEAR',
  'PEPE', 'SHIB', 'WIF', 'BONK', 'RENDER', 'INJ', 'TIA', 'SEI', 'JUP',
];

const FOREX_PAIRS = [
  'EUR', 'USD', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF',
  'XAU', 'XAG', 'US30', 'NAS100', 'SPX500', 'UK100', 'GER40',
  'USOIL', 'UKOIL',
];

export function detectMarketType(symbol: string): 'crypto' | 'forex' {
  const upper = symbol.toUpperCase().replace('/', '');
  // Check if it contains crypto base currencies paired with USDT/BUSD/USD
  if (CRYPTO_SYMBOLS.some(c => upper.startsWith(c) && (upper.endsWith('USDT') || upper.endsWith('BUSD') || upper.endsWith('USD') || upper.endsWith('USDC')))) {
    return 'crypto';
  }
  // Check forex patterns
  if (FOREX_PAIRS.some(f => upper.includes(f))) {
    return 'forex';
  }
  // Default: if it ends with USDT it's probably crypto
  if (upper.endsWith('USDT') || upper.endsWith('BUSD')) return 'crypto';
  return 'forex';
}

// ── Universal Execute ───────────────────────────────────────

export async function routeOrder(
  order: OrderRequest,
  userAccounts: { accountId: string; credentials: ConnectionCredentials }[]
): Promise<OrderResult> {
  const market = detectMarketType(order.symbol);

  // Find the right account based on market type
  const account = userAccounts.find(a => {
    if (market === 'crypto') return ['binance', 'bybit', 'okx'].includes(a.credentials.provider_type);
    return ['metatrader', 'ctrader'].includes(a.credentials.provider_type);
  });

  if (!account) {
    return { orderId: '', status: 'error', message: `No ${market} account connected` };
  }

  const adapter = getAdapter(account.credentials.provider_type);
  if (!adapter) {
    return { orderId: '', status: 'error', message: `No adapter for ${account.credentials.provider_type}` };
  }

  return adapter.executeOrder(account.accountId, order, account.credentials);
}
