/**
 * MetaTrader Adapter — MT5 Farm Edition
 * Replaces MetaAPI SDK with direct MT5 Farm HTTP calls.
 */

import type {
  TradingAdapter, ConnectionCredentials, AccountInfo,
  BalanceInfo, Position, OrderRequest, OrderResult,
} from './types';

import {
  farmHealth,
  farmConnectAccount,
  farmGetAccountInfo,
  farmGetPositions,
  farmExecuteTrade,
  farmClosePosition,
} from '../mt5farm';

import { getNormalizedSymbolForBroker } from '../broker';

export class MetaTraderAdapter implements TradingAdapter {
  name = 'MetaTrader (MT5 Farm)';
  type = 'metatrader';

  /** Test connection by hitting the orchestrator health endpoint */
  async testConnection(_apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const health = await farmHealth();
      if (health && typeof health.total_accounts === 'number') {
        return { success: true };
      }
      return { success: false, error: 'Farm health check returned unexpected response' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'MT5 Farm unreachable' };
    }
  }

  async connect(credentials: ConnectionCredentials): Promise<AccountInfo> {
    const farmAccount = await farmConnectAccount(
      credentials.login || '',
      credentials.password || '',
      credentials.server || '',
      credentials.login || 'MT5 Account',
    );

    const accountId = farmAccount.accountId;
    const info      = await farmGetAccountInfo(accountId);

    return {
      id:       accountId,
      name:     credentials.login || 'MT5',
      type:     'metatrader',
      balance:  info?.balance  ?? 0,
      equity:   info?.equity   ?? 0,
      currency: info?.currency ?? 'USD',
      status:   farmAccount.status === 'connected' ? 'connected' : 'disconnected',
    };
  }

  async getBalance(accountId: string, _credentials: ConnectionCredentials): Promise<BalanceInfo> {
    const info = await farmGetAccountInfo(accountId);
    return {
      balance:        info?.balance  ?? 0,
      equity:         info?.equity   ?? 0,
      unrealizedPnl:  (info?.equity ?? 0) - (info?.balance ?? 0),
      currency:       info?.currency ?? 'USD',
    };
  }

  async getPositions(accountId: string, _credentials: ConnectionCredentials): Promise<Position[]> {
    const positions = await farmGetPositions(accountId);
    return positions.map(p => ({
      id:           p.id,
      symbol:       p.symbol,
      side:         p.type === 'POSITION_TYPE_BUY' ? 'BUY' as const : 'SELL' as const,
      volume:       p.volume,
      entryPrice:   p.openPrice,
      currentPrice: p.currentPrice,
      pnl:          p.profit,
      timestamp:    p.openTime || new Date().toISOString(),
    }));
  }

  async executeOrder(accountId: string, order: OrderRequest, _credentials: ConnectionCredentials): Promise<OrderResult> {
    const cleanSymbol = order.symbol.replace('/', '');
    const normalizedSymbol = getNormalizedSymbolForBroker(cleanSymbol, accountId);
    const result = await farmExecuteTrade(accountId, {
      actionType: order.side === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
      symbol:     normalizedSymbol,
      volume:     order.volume,
      stopLoss:   order.stopLoss,
      takeProfit: order.takeProfit,
      comment:    'TradeGPT',
    });

    if (!result.success) {
      return { orderId: '', status: 'error', message: result.error.message };
    }
    return {
      orderId:      result.result.orderId || result.result.positionId || '',
      status:       'filled',
      fillPrice:    result.result.openPrice || order.price || 0,
      filledVolume: order.volume,
    };
  }

  async closePosition(accountId: string, positionId: string, _credentials: ConnectionCredentials): Promise<OrderResult> {
    try {
      const result = await farmClosePosition(accountId, positionId);
      return {
        orderId: positionId,
        status:  result.success ? 'filled' : 'error',
        message: result.success ? undefined : `Close failed (retcode: ${result.retcode})`,
      };
    } catch (err: any) {
      return { orderId: '', status: 'error', message: err?.message || 'Close failed' };
    }
  }
}

export const metatraderAdapter = new MetaTraderAdapter();
