/**
 * MetaTrader Adapter
 * Wraps MetaAPI SDK for MT4/MT5 broker connectivity.
 */

import type {
  TradingAdapter, ConnectionCredentials, AccountInfo,
  BalanceInfo, Position, OrderRequest, OrderResult,
} from '../engine';

export class MetaTraderAdapter implements TradingAdapter {
  name = 'MetaTrader (MetaAPI)';
  type = 'metatrader';

  private async getApi(apiKey: string) {
    const MetaApi = (await import('metaapi.cloud-sdk/node')).default;
    return new MetaApi(apiKey);
  }

  async testConnection(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const api = await this.getApi(apiKey);
      await api.metatraderAccountApi.getAccountsWithInfiniteScrollPagination();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Invalid MetaAPI token' };
    }
  }

  async connect(credentials: ConnectionCredentials): Promise<AccountInfo> {
    const api = await this.getApi(credentials.api_key);

    const account = await api.metatraderAccountApi.createAccount({
      name: credentials.login || 'MT5 Account',
      type: 'cloud-g1',
      platform: 'mt5',
      login: credentials.login || '',
      password: credentials.password || '',
      server: credentials.server || 'DemoServer',
      magic: 0,
      reliability: 'regular',
    });

    await account.deploy();
    await account.waitConnected();

    const connection = account.getRPCConnection();
    await connection.connect();
    await connection.waitSynchronized();

    const details = await connection.getAccountInformation();

    return {
      id: account.id,
      name: credentials.login || 'MT5',
      type: 'metatrader',
      balance: details.balance || 0,
      equity: details.equity || 0,
      currency: details.currency || 'USD',
      status: 'connected',
    };
  }

  async getBalance(accountId: string, credentials: ConnectionCredentials): Promise<BalanceInfo> {
    const api = await this.getApi(credentials.api_key);
    const account = await api.metatraderAccountApi.getAccount(accountId);
    const connection = account.getRPCConnection();
    await connection.connect();
    await connection.waitSynchronized();
    const details = await connection.getAccountInformation();

    return {
      balance: details.balance || 0,
      equity: details.equity || 0,
      unrealizedPnl: (details.equity || 0) - (details.balance || 0),
      currency: details.currency || 'USD',
    };
  }

  async getPositions(accountId: string, credentials: ConnectionCredentials): Promise<Position[]> {
    const api = await this.getApi(credentials.api_key);
    const account = await api.metatraderAccountApi.getAccount(accountId);
    const connection = account.getRPCConnection();
    await connection.connect();
    await connection.waitSynchronized();
    const positions = await connection.getPositions();

    return positions.map((p: any) => ({
      id: p.id,
      symbol: p.symbol,
      side: p.type === 'POSITION_TYPE_BUY' ? 'BUY' as const : 'SELL' as const,
      volume: p.volume,
      entryPrice: p.openPrice,
      currentPrice: p.currentPrice,
      pnl: p.profit,
      timestamp: p.time || new Date().toISOString(),
    }));
  }

  async executeOrder(accountId: string, order: OrderRequest, credentials: ConnectionCredentials): Promise<OrderResult> {
    try {
      const api = await this.getApi(credentials.api_key);
      const account = await api.metatraderAccountApi.getAccount(accountId);
      const connection = account.getRPCConnection();
      await connection.connect();
      await connection.waitSynchronized();

      const symbol = order.symbol.replace('/', '');
      let result;

      if (order.side === 'BUY') {
        result = await connection.createMarketBuyOrder(symbol, order.volume, order.stopLoss, order.takeProfit);
      } else {
        result = await connection.createMarketSellOrder(symbol, order.volume, order.stopLoss, order.takeProfit);
      }

      return {
        orderId: (result as any).orderId || (result as any).positionId || '',
        status: 'filled',
        fillPrice: (result as any).openPrice || order.price || 0,
        filledVolume: order.volume,
      };
    } catch (err: any) {
      return { orderId: '', status: 'error', message: err?.message || 'Execution failed' };
    }
  }

  async closePosition(accountId: string, positionId: string, credentials: ConnectionCredentials): Promise<OrderResult> {
    try {
      const api = await this.getApi(credentials.api_key);
      const account = await api.metatraderAccountApi.getAccount(accountId);
      const connection = account.getRPCConnection();
      await connection.connect();
      await connection.waitSynchronized();
      await (connection as any).closePosition(positionId, undefined);
      return { orderId: positionId, status: 'filled' };
    } catch (err: any) {
      return { orderId: '', status: 'error', message: err?.message || 'Close failed' };
    }
  }
}

export const metatraderAdapter = new MetaTraderAdapter();
