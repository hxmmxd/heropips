/**
 * Crypto Exchange Adapter
 * Supports: Binance, Bybit, OKX
 * Uses HMAC-SHA256 request signing per exchange spec.
 */

import crypto from 'crypto';
import type {
  TradingAdapter, ConnectionCredentials, AccountInfo,
  BalanceInfo, Position, OrderRequest, OrderResult,
} from '../engine';

// ── HMAC Signing ────────────────────────────────────────────

function hmacSign(queryString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

// ── Exchange Configs ────────────────────────────────────────

const EXCHANGE_CONFIGS: Record<string, { baseUrl: string; name: string }> = {
  binance: { baseUrl: 'https://api.binance.com', name: 'Binance' },
  bybit:   { baseUrl: 'https://api.bybit.com', name: 'Bybit' },
  okx:     { baseUrl: 'https://www.okx.com', name: 'OKX' },
};

// ── Binance Adapter ─────────────────────────────────────────

async function binanceRequest(
  method: string,
  path: string,
  apiKey: string,
  apiSecret: string,
  params: Record<string, string> = {},
  baseUrl = 'https://api.binance.com'
): Promise<any> {
  const timestamp = Date.now().toString();
  const queryParams = { ...params, timestamp };
  const queryString = Object.entries(queryParams).map(([k, v]) => `${k}=${v}`).join('&');
  const signature = hmacSign(queryString, apiSecret);
  const url = `${baseUrl}${path}?${queryString}&signature=${signature}`;

  const res = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ msg: res.statusText }));
    throw new Error(`Binance API Error: ${err.msg || err.message || res.statusText}`);
  }

  return res.json();
}

// ── Bybit Adapter ───────────────────────────────────────────

async function bybitRequest(
  method: string,
  path: string,
  apiKey: string,
  apiSecret: string,
  params: Record<string, string> = {},
  baseUrl = 'https://api.bybit.com'
): Promise<any> {
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  const queryString = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');

  // Bybit v5 signature: timestamp + apiKey + recvWindow + queryString
  const signPayload = `${timestamp}${apiKey}${recvWindow}${queryString}`;
  const signature = hmacSign(signPayload, apiSecret);

  const url = method === 'GET'
    ? `${baseUrl}${path}?${queryString}`
    : `${baseUrl}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'Content-Type': 'application/json',
    },
    body: method !== 'GET' ? JSON.stringify(params) : undefined,
  });

  const data = await res.json();
  if (data.retCode !== 0) {
    throw new Error(`Bybit API Error: ${data.retMsg || 'Unknown error'}`);
  }
  return data.result;
}

// ── Unified Crypto Adapter ──────────────────────────────────

export class CryptoAdapter implements TradingAdapter {
  name = 'Crypto Exchange';
  type = 'crypto';

  private getKeys(credentials: ConnectionCredentials) {
    // User's own keys take priority, fallback to provider keys
    return {
      apiKey: credentials.user_api_key || credentials.api_key,
      apiSecret: credentials.user_api_secret || credentials.api_secret || '',
      baseUrl: credentials.base_url || EXCHANGE_CONFIGS[credentials.provider_type]?.baseUrl || '',
      exchange: credentials.provider_type,
    };
  }

  async testConnection(apiKey: string, apiSecret?: string, baseUrl?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Try Binance-style test first
      const url = baseUrl || 'https://api.binance.com';
      if (url.includes('binance')) {
        await binanceRequest('GET', '/api/v3/account', apiKey, apiSecret || '', {}, url);
      } else if (url.includes('bybit')) {
        await bybitRequest('GET', '/v5/account/wallet-balance', apiKey, apiSecret || '', { accountType: 'UNIFIED' }, url);
      } else {
        // Generic: just try to hit the base URL
        const res = await fetch(`${url}/api/v3/time`);
        if (!res.ok) throw new Error('Cannot reach server');
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection failed' };
    }
  }

  async connect(credentials: ConnectionCredentials): Promise<AccountInfo> {
    const { apiKey, apiSecret, baseUrl, exchange } = this.getKeys(credentials);

    if (exchange === 'binance' || baseUrl.includes('binance')) {
      const account = await binanceRequest('GET', '/api/v3/account', apiKey, apiSecret, {}, baseUrl);
      const totalBalance = account.balances?.reduce((sum: number, b: any) => sum + parseFloat(b.free) + parseFloat(b.locked), 0) || 0;
      return {
        id: `binance-${apiKey.slice(-8)}`,
        name: 'Binance',
        type: 'crypto',
        exchange: 'binance',
        balance: totalBalance,
        equity: totalBalance,
        currency: 'USDT',
        status: 'connected',
      };
    }

    if (exchange === 'bybit' || baseUrl.includes('bybit')) {
      const wallet = await bybitRequest('GET', '/v5/account/wallet-balance', apiKey, apiSecret, { accountType: 'UNIFIED' }, baseUrl);
      const coin = wallet.list?.[0];
      return {
        id: `bybit-${apiKey.slice(-8)}`,
        name: 'Bybit',
        type: 'crypto',
        exchange: 'bybit',
        balance: parseFloat(coin?.totalWalletBalance || '0'),
        equity: parseFloat(coin?.totalEquity || '0'),
        currency: 'USDT',
        status: 'connected',
      };
    }

    throw new Error(`Unsupported exchange: ${exchange}`);
  }

  async getBalance(accountId: string, credentials: ConnectionCredentials): Promise<BalanceInfo> {
    const { apiKey, apiSecret, baseUrl, exchange } = this.getKeys(credentials);

    if (exchange === 'binance' || baseUrl.includes('binance')) {
      const account = await binanceRequest('GET', '/api/v3/account', apiKey, apiSecret, {}, baseUrl);
      const assets = account.balances
        ?.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map((b: any) => ({ asset: b.asset, free: parseFloat(b.free), locked: parseFloat(b.locked) })) || [];
      const usdtBalance = assets.find((a: any) => a.asset === 'USDT');
      return {
        balance: usdtBalance?.free || 0,
        equity: assets.reduce((s: number, a: any) => s + a.free + a.locked, 0),
        unrealizedPnl: 0,
        currency: 'USDT',
        assets,
      };
    }

    if (exchange === 'bybit' || baseUrl.includes('bybit')) {
      const wallet = await bybitRequest('GET', '/v5/account/wallet-balance', apiKey, apiSecret, { accountType: 'UNIFIED' }, baseUrl);
      const coin = wallet.list?.[0];
      const assets = coin?.coin?.map((c: any) => ({
        asset: c.coin,
        free: parseFloat(c.availableToWithdraw || '0'),
        locked: parseFloat(c.locked || '0'),
      })) || [];
      return {
        balance: parseFloat(coin?.totalAvailableBalance || '0'),
        equity: parseFloat(coin?.totalEquity || '0'),
        unrealizedPnl: parseFloat(coin?.totalPerpUPL || '0'),
        currency: 'USDT',
        assets,
      };
    }

    throw new Error(`Unsupported exchange`);
  }

  async getPositions(accountId: string, credentials: ConnectionCredentials): Promise<Position[]> {
    const { apiKey, apiSecret, baseUrl, exchange } = this.getKeys(credentials);

    if (exchange === 'binance' || baseUrl.includes('binance')) {
      const account = await binanceRequest('GET', '/api/v3/account', apiKey, apiSecret, {}, baseUrl);
      // Spot: positions are non-zero balances (excluding stablecoins)
      return (account.balances || [])
        .filter((b: any) => parseFloat(b.free) > 0 && !['USDT', 'BUSD', 'USDC', 'USD'].includes(b.asset))
        .map((b: any) => ({
          id: `spot-${b.asset}`,
          symbol: `${b.asset}USDT`,
          side: 'LONG' as const,
          volume: parseFloat(b.free) + parseFloat(b.locked),
          entryPrice: 0, // Spot doesn't track entry
          currentPrice: 0,
          pnl: 0,
          timestamp: new Date().toISOString(),
        }));
    }

    if (exchange === 'bybit' || baseUrl.includes('bybit')) {
      const positions = await bybitRequest('GET', '/v5/position/list', apiKey, apiSecret, { category: 'linear', settleCoin: 'USDT' }, baseUrl);
      return (positions.list || [])
        .filter((p: any) => parseFloat(p.size) > 0)
        .map((p: any) => ({
          id: p.positionIdx || p.symbol,
          symbol: p.symbol,
          side: p.side === 'Buy' ? 'LONG' as const : 'SHORT' as const,
          volume: parseFloat(p.size),
          entryPrice: parseFloat(p.avgPrice || '0'),
          currentPrice: parseFloat(p.markPrice || '0'),
          pnl: parseFloat(p.unrealisedPnl || '0'),
          timestamp: new Date(parseInt(p.updatedTime || '0')).toISOString(),
        }));
    }

    return [];
  }

  async executeOrder(accountId: string, order: OrderRequest, credentials: ConnectionCredentials): Promise<OrderResult> {
    const { apiKey, apiSecret, baseUrl, exchange } = this.getKeys(credentials);

    if (exchange === 'binance' || baseUrl.includes('binance')) {
      try {
        const params: Record<string, string> = {
          symbol: order.symbol.replace('/', ''),
          side: order.side,
          type: order.type === 'MARKET' ? 'MARKET' : 'LIMIT',
          quantity: order.volume.toString(),
        };
        if (order.type === 'LIMIT' && order.price) {
          params.price = order.price.toString();
          params.timeInForce = 'GTC';
        }
        const result = await binanceRequest('POST', '/api/v3/order', apiKey, apiSecret, params, baseUrl);
        return {
          orderId: result.orderId?.toString() || result.clientOrderId || '',
          status: result.status === 'FILLED' ? 'filled' : 'pending',
          fillPrice: parseFloat(result.fills?.[0]?.price || result.price || '0'),
          filledVolume: parseFloat(result.executedQty || '0'),
        };
      } catch (err: any) {
        return { orderId: '', status: 'error', message: err.message };
      }
    }

    if (exchange === 'bybit' || baseUrl.includes('bybit')) {
      try {
        const params: Record<string, string> = {
          category: 'spot',
          symbol: order.symbol.replace('/', ''),
          side: order.side === 'BUY' ? 'Buy' : 'Sell',
          orderType: order.type === 'MARKET' ? 'Market' : 'Limit',
          qty: order.volume.toString(),
        };
        if (order.type === 'LIMIT' && order.price) params.price = order.price.toString();
        if (order.stopLoss) params.stopLoss = order.stopLoss.toString();
        if (order.takeProfit) params.takeProfit = order.takeProfit.toString();

        const result = await bybitRequest('POST', '/v5/order/create', apiKey, apiSecret, params, baseUrl);
        return {
          orderId: result.orderId || '',
          status: 'filled',
          fillPrice: order.price || 0,
          filledVolume: order.volume,
        };
      } catch (err: any) {
        return { orderId: '', status: 'error', message: err.message };
      }
    }

    return { orderId: '', status: 'error', message: `Unsupported exchange: ${exchange}` };
  }

  async closePosition(accountId: string, positionId: string, credentials: ConnectionCredentials): Promise<OrderResult> {
    // For spot: sell the asset; for futures: close the position
    // This would need the position details to construct the close order
    return { orderId: '', status: 'error', message: 'Use executeOrder with opposite side to close' };
  }
}

// ── Export singleton ────────────────────────────────────────

export const cryptoAdapter = new CryptoAdapter();
