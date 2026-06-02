/**
 * Trading Engine Types
 * Shared types for broker adapters (MetaTrader, Crypto).
 */

export interface ConnectionCredentials {
  provider_id: string;
  provider_type: 'metatrader' | 'ctrader' | 'binance' | 'bybit' | 'okx';
  api_key: string;
  api_secret?: string;
  base_url?: string;
  login?: string;
  password?: string;
  server?: string;
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
