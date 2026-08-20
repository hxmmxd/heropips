/**
 * Unified Test Context Harness for UQP E2E Test Suite
 * Coordinates mock Redis, mock Supabase, NetworkGuard, and lifecycle teardown.
 */
import { MockRedis, SharedRedisStore } from './mock-redis';
import { MockSupabaseClient, mockSupabase } from './mock-supabase';
import { NetworkGuard } from './network-guard';

export interface TestContextOptions {
  enableNetworkGuard?: boolean;
  isolatedRedisStore?: boolean;
}

export class TestContext {
  public redis: MockRedis;
  public redisSubscriber: MockRedis;
  public supabase: MockSupabaseClient;
  public store: SharedRedisStore;
  private enableNetworkGuard: boolean;

  constructor(options: TestContextOptions = {}) {
    this.enableNetworkGuard = options.enableNetworkGuard !== false;
    this.store = options.isolatedRedisStore ? new SharedRedisStore() : MockRedis.getSharedStore();
    this.redis = new MockRedis(this.store);
    this.redisSubscriber = new MockRedis(this.store);
    this.supabase = mockSupabase;
  }

  async setup(): Promise<void> {
    // Reset state
    this.reset();

    // Set test env vars
    (process.env as Record<string, string>).NODE_ENV = 'test';
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_role_key';

    (globalThis as any).__mockSupabase = this.supabase;
    (globalThis as any).__mockRedis = this.redis;

    if (this.enableNetworkGuard) {
      NetworkGuard.install();
    }
  }

  async teardown(): Promise<void> {
    if (this.enableNetworkGuard) {
      NetworkGuard.restore();
    }
    this.redis.disconnect();
    this.redisSubscriber.disconnect();
    delete (globalThis as any).__mockSupabase;
    delete (globalThis as any).__mockRedis;
    this.reset();
  }

  reset(): void {
    this.store.clear();
    this.supabase.reset();
    NetworkGuard.reset();
  }

  // --- Convenience Pipeline Helpers ---

  /**
   * Helper to simulate publishing a normalized tick into Redis stream and Pub/Sub
   */
  async injectTick(tick: {
    broker: string;
    symbol: string;
    bid: number;
    ask: number;
    mid?: number;
    spread?: number;
    time?: number;
  }): Promise<{ entryId: string; mid: number; spread: number; time: number }> {
    const time = tick.time || Date.now();
    const mid = tick.mid !== undefined ? tick.mid : Number(((tick.bid + tick.ask) / 2).toFixed(5));
    const spread = tick.spread !== undefined ? tick.spread : Number((tick.ask - tick.bid).toFixed(5));

    const streamKey = `stream:${tick.broker.toLowerCase()}:${tick.symbol.toUpperCase()}`;
    const channelKey = `channel:ticks:${tick.broker.toLowerCase()}:${tick.symbol.toUpperCase()}`;

    const entryId = await this.redis.xadd(
      streamKey,
      'MAXLEN',
      '~',
      10000,
      '*',
      'broker',
      tick.broker,
      'symbol',
      tick.symbol,
      'bid',
      String(tick.bid),
      'ask',
      String(tick.ask),
      'mid',
      String(mid),
      'spread',
      String(spread),
      'time',
      String(time)
    );

    const payload = JSON.stringify({
      broker: tick.broker,
      symbol: tick.symbol,
      bid: tick.bid,
      ask: tick.ask,
      mid,
      spread,
      time,
    });

    await this.redis.publish(channelKey, payload);

    return { entryId, mid, spread, time };
  }

  /**
   * Helper to inspect current Redis stream contents for a broker symbol
   */
  getStreamEntries(broker: string, symbol: string) {
    const streamKey = `stream:${broker.toLowerCase()}:${symbol.toUpperCase()}`;
    return this.redis.getStreamEntries(streamKey);
  }

  /**
   * Helper to read latest candle from Redis hot cache
   */
  async getHotCacheCandle(broker: string, symbol: string, timeframe: string) {
    const key = `candles:${broker.toLowerCase()}:${symbol.toUpperCase()}:${timeframe.toLowerCase()}:latest`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Helper to set latest candle in Redis hot cache
   */
  async setHotCacheCandle(
    broker: string,
    symbol: string,
    timeframe: string,
    candle: Record<string, any>
  ) {
    const key = `candles:${broker.toLowerCase()}:${symbol.toUpperCase()}:${timeframe.toLowerCase()}:latest`;
    await this.redis.set(key, JSON.stringify(candle));
  }
}

export function createTestContext(options?: TestContextOptions): TestContext {
  return new TestContext(options);
}
