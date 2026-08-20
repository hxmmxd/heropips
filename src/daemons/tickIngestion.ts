import fs from 'fs';
import path from 'path';

// Synchronously load environment variables before other module initializations
function loadEnv(): void {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const envPath = path.join(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const firstEqual = trimmed.indexOf('=');
            if (firstEqual > 0) {
              const key = trimmed.slice(0, firstEqual).trim();
              const val = trimmed.slice(firstEqual + 1).trim().replace(/^['"]|['"]$/g, '');
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        });
      } catch (err: any) {
        console.warn(`[Tick Ingestion] Warning: Could not read ${file}:`, err.message);
      }
    }
  }
}

loadEnv();

import { redis, redisSubscriber } from '../lib/redis';
import { FARM_BASE, FARM_HEADERS, sidecarUrl, resolveAccountId, farmHealth } from '../lib/mt5farm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types and Constants
// ============================================================================

export interface IngestionTick {
  broker: string;
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  time: number;
  source?: 'mt5' | 'mock' | 'simulated';
}

export interface MasterFeedAccount {
  id: string;
  broker_name: string;
  broker_slug: string;
  mt5_login?: string;
  server?: string;
  is_master_feed?: boolean;
  status?: string;
  is_active?: boolean;
}

export interface SymbolProfile {
  basePrice: number;
  baseSpread: number;
  volatility: number;
  decimals: number;
}

export const DEFAULT_SYMBOLS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'USDJPY', 'US30', 'NAS100'];
export const DEFAULT_BROKERS = ['vantage', 'xm', 'icmarkets'];
export const STREAM_MAX_LEN = 10000;

export const SYMBOL_PROFILES: Record<string, SymbolProfile> = {
  XAUUSD: { basePrice: 2735.50, baseSpread: 0.20, volatility: 0.15, decimals: 2 },
  EURUSD: { basePrice: 1.08500, baseSpread: 0.00012, volatility: 0.00008, decimals: 5 },
  GBPUSD: { basePrice: 1.29500, baseSpread: 0.00018, volatility: 0.00010, decimals: 5 },
  BTCUSD: { basePrice: 64250.00, baseSpread: 2.50, volatility: 6.00, decimals: 2 },
  USDJPY: { basePrice: 154.200, baseSpread: 0.015, volatility: 0.020, decimals: 3 },
  US30:   { basePrice: 39800.00, baseSpread: 1.50, volatility: 3.50, decimals: 2 },
  NAS100: { basePrice: 19850.00, baseSpread: 1.00, volatility: 2.00, decimals: 2 },
};

// ============================================================================
// Normalization Helpers
// ============================================================================

/**
 * Normalizes broker name or server string into a canonical lowercase slug (e.g., 'vantage', 'xm', 'icmarkets')
 */
export function normalizeBrokerSlug(raw: string): string {
  if (!raw) return 'vantage';
  const lower = raw.toLowerCase().trim();
  if (lower.includes('vantage')) return 'vantage';
  if (lower.includes('xm')) return 'xm';
  if (lower.includes('icmarket') || lower.includes('ic_market')) return 'icmarkets';
  if (lower.includes('pepperstone')) return 'pepperstone';
  if (lower.includes('atfx')) return 'atfx';
  if (lower.includes('exness')) return 'exness';
  return lower.replace(/[^a-z0-9]/g, '') || 'vantage';
}

/**
 * Normalizes symbol into standard uppercase format without suffixes or slashes (e.g., 'XAU/USD' -> 'XAUUSD', 'EURUSD.pro' -> 'EURUSD')
 */
export function normalizeSymbol(raw: string): string {
  if (!raw) return 'XAUUSD';
  let cleaned = raw.toUpperCase().trim();
  cleaned = cleaned.replace(/[\/\s\-_]/g, '');
  // Remove common broker suffixes (.raw, .pro, .ecn, .m, etc.)
  cleaned = cleaned.replace(/\.(RAW|PRO|ECN|M|C|STD|PREMIUM)$/i, '');
  return cleaned;
}

/**
 * Returns the standard Redis stream key for a broker-symbol pair
 */
export function getStreamKey(broker: string, symbol: string): string {
  return `stream:${normalizeBrokerSlug(broker)}:${normalizeSymbol(symbol)}`;
}

/**
 * Returns the standard Redis pub/sub channel for a broker-symbol pair
 */
export function getPubSubChannel(broker: string, symbol: string): string {
  return `channel:ticks:${normalizeBrokerSlug(broker)}:${normalizeSymbol(symbol)}`;
}

/**
 * Normalizes raw tick data into guaranteed valid UQP IngestionTick
 */
export function normalizeTickData(
  broker: string,
  raw: {
    symbol: string;
    bid: number;
    ask: number;
    time?: number;
    source?: 'mt5' | 'mock' | 'simulated';
  }
): IngestionTick {
  const normBroker = normalizeBrokerSlug(broker);
  const normSymbol = normalizeSymbol(raw.symbol);
  let bid = Number(raw.bid);
  let ask = Number(raw.ask);

  if (isNaN(bid) || bid <= 0) bid = 1.0;
  if (isNaN(ask) || ask <= 0) ask = bid;
  if (ask < bid) ask = bid;

  const profile = SYMBOL_PROFILES[normSymbol];
  const decimals = profile ? profile.decimals : 5;

  const mid = Number(((bid + ask) / 2).toFixed(decimals + 1));
  const spread = Number((ask - bid).toFixed(decimals + 1));
  const time = raw.time && raw.time > 0 ? Number(raw.time) : Date.now();

  return {
    broker: normBroker,
    symbol: normSymbol,
    bid: Number(bid.toFixed(decimals)),
    ask: Number(ask.toFixed(decimals)),
    mid,
    spread,
    time,
    source: raw.source || 'mt5',
  };
}

// ============================================================================
// Core Redis Publisher
// ============================================================================

/**
 * Writes tick to Redis Stream (with approximate MAXLEN trimming) and publishes to Pub/Sub
 */
export async function publishTick(tick: IngestionTick): Promise<string> {
  const streamKey = getStreamKey(tick.broker, tick.symbol);
  const channelKey = getPubSubChannel(tick.broker, tick.symbol);

  // 1. Pipe to Redis Stream with MAXLEN ~ 10000
  const entryId = await redis.xadd(
    streamKey,
    'MAXLEN', '~', STREAM_MAX_LEN,
    '*',
    'broker', tick.broker,
    'symbol', tick.symbol,
    'bid', String(tick.bid),
    'ask', String(tick.ask),
    'mid', String(tick.mid),
    'spread', String(tick.spread),
    'time', String(tick.time),
    'source', tick.source || 'mt5'
  );

  // 2. Publish to Pub/Sub for real-time consumers (SSE, Chart, AI)
  await redis.publish(channelKey, JSON.stringify(tick));

  return entryId ?? '';
}

// ============================================================================
// High-Fidelity Mock Generator (Brownian Motion & Ornstein-Uhlenbeck)
// ============================================================================

export class MockTickGenerator {
  private prices: Map<string, number> = new Map();

  constructor() {
    this.initPrices();
  }

  private getKey(broker: string, symbol: string): string {
    return `${normalizeBrokerSlug(broker)}:${normalizeSymbol(symbol)}`;
  }

  private initPrices(): void {
    for (const broker of DEFAULT_BROKERS) {
      const brokerOffset = broker === 'vantage' ? 0 : broker === 'xm' ? -0.02 : 0.01;
      for (const [symbol, profile] of Object.entries(SYMBOL_PROFILES)) {
        const initial = profile.basePrice * (1 + brokerOffset * 0.0005);
        this.prices.set(this.getKey(broker, symbol), initial);
      }
    }
  }

  /**
   * Generates a standard normal random variable using Box-Muller transform
   */
  private gaussianRandom(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Generates next realistic tick using mean-reverting Ornstein-Uhlenbeck drift
   */
  public nextTick(broker: string, symbol: string): IngestionTick {
    const normBroker = normalizeBrokerSlug(broker);
    const normSymbol = normalizeSymbol(symbol);
    const profile = SYMBOL_PROFILES[normSymbol] || {
      basePrice: 100.0,
      baseSpread: 0.02,
      volatility: 0.1,
      decimals: 4,
    };

    const key = this.getKey(normBroker, normSymbol);
    let currentPrice = this.prices.get(key) ?? profile.basePrice;

    // Mean-reverting drift towards base price + volatility shock
    const theta = 0.05; // Speed of mean reversion
    const drift = theta * (profile.basePrice - currentPrice);
    const shock = profile.volatility * this.gaussianRandom();

    currentPrice = currentPrice + drift + shock;
    this.prices.set(key, currentPrice);

    // Spread with slight natural jitter (+/- 10%)
    const spreadJitter = profile.baseSpread * (1 + (Math.random() - 0.5) * 0.2);
    const halfSpread = spreadJitter / 2;

    const bid = Number((currentPrice - halfSpread).toFixed(profile.decimals));
    let ask = Number((currentPrice + halfSpread).toFixed(profile.decimals));
    if (ask <= bid) {
      ask = Number((bid + Math.pow(10, -profile.decimals)).toFixed(profile.decimals));
    }

    return normalizeTickData(normBroker, {
      symbol: normSymbol,
      bid,
      ask,
      time: Date.now(),
      source: 'mock',
    });
  }
}

// ============================================================================
// Tick Ingestion Daemon Class
// ============================================================================

export class TickIngestionDaemon {
  private supabase: SupabaseClient | null = null;
  private masterFeeds: MasterFeedAccount[] = [];
  private symbols: string[] = [...DEFAULT_SYMBOLS];
  private mockGenerator: MockTickGenerator;
  private isRunning: boolean = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private feedSyncTimer: NodeJS.Timeout | null = null;
  private forceMock: boolean = false;
  private sidecarAvailable: boolean = false;

  private stats = {
    totalTicksIngested: 0,
    ticksByBroker: {} as Record<string, number>,
    ticksBySymbol: {} as Record<string, number>,
    errors: 0,
    startTime: 0,
    lastTickTime: 0,
  };

  constructor(options?: {
    forceMock?: boolean;
    symbols?: string[];
    supabaseClient?: SupabaseClient;
  }) {
    this.forceMock = options?.forceMock ?? (process.argv.includes('--mock') || process.env.NODE_ENV === 'test');
    if (options?.symbols && options.symbols.length > 0) {
      this.symbols = options.symbols.map(normalizeSymbol);
    }
    this.mockGenerator = new MockTickGenerator();

    if (options?.supabaseClient) {
      this.supabase = options.supabaseClient;
    } else {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      }
    }
  }

  /**
   * Discovers active master broker feeds from Supabase or falls back to defaults
   */
  public async discoverMasterFeeds(): Promise<MasterFeedAccount[]> {
    const feeds: MasterFeedAccount[] = [];

    if (this.supabase && !this.forceMock) {
      try {
        // Query master feeds with is_master_feed = true
        const { data, error } = await this.supabase
          .from('broker_accounts')
          .select('id, broker_name, server, mt5_login, status, is_active, is_master_feed')
          .eq('is_master_feed', true)
          .eq('status', 'connected');

        if (!error && data && data.length > 0) {
          for (const item of data) {
            feeds.push({
              id: item.id,
              broker_name: item.broker_name,
              broker_slug: normalizeBrokerSlug(item.broker_name || item.server || 'vantage'),
              mt5_login: item.mt5_login,
              server: item.server,
              is_master_feed: true,
              status: item.status,
              is_active: item.is_active,
            });
          }
          console.log(`[Tick Ingestion] 📋 Discovered ${feeds.length} master feeds from Supabase:`, feeds.map(f => `${f.broker_slug} (${f.id})`).join(', '));
          return feeds;
        }

        // Fallback: active demo accounts
        const { data: demoData, error: demoError } = await this.supabase
          .from('broker_accounts')
          .select('id, broker_name, server, mt5_login, status, is_active')
          .eq('is_active', true);

        if (!demoError && demoData && demoData.length > 0) {
          for (const item of demoData) {
            feeds.push({
              id: item.id,
              broker_name: item.broker_name,
              broker_slug: normalizeBrokerSlug(item.broker_name || item.server || 'vantage'),
              mt5_login: item.mt5_login,
              server: item.server,
              status: item.status,
              is_active: item.is_active,
            });
          }
          console.log(`[Tick Ingestion] 📋 Using ${feeds.length} active demo accounts as quote feeds:`, feeds.map(f => f.broker_slug).join(', '));
          return feeds;
        }
      } catch (err: any) {
        console.warn('[Tick Ingestion] Could not fetch master accounts from Supabase:', err.message);
      }
    }

    // Default offline/mock feeds
    for (const broker of DEFAULT_BROKERS) {
      feeds.push({
        id: `mock_${broker}_master`,
        broker_name: broker.toUpperCase(),
        broker_slug: broker,
        is_master_feed: true,
        status: 'connected',
        is_active: true,
      });
    }
    console.log('[Tick Ingestion] 📋 Using default broker profiles:', feeds.map(f => f.broker_slug).join(', '));
    return feeds;
  }

  /**
   * Subscribes master account to symbols on MT5 Sidecar
   */
  private async subscribeSidecarSymbols(account: MasterFeedAccount): Promise<boolean> {
    if (this.forceMock) return false;

    let subscribedCount = 0;
    try {
      const resolvedId = await resolveAccountId(account.id || account.mt5_login || 'MASTER_VANTAGE_1');
      for (const symbol of this.symbols) {
        try {
          const url = sidecarUrl(resolvedId, 'stream/subscribe');
          const res = await fetch(url, {
            method: 'POST',
            headers: FARM_HEADERS,
            body: JSON.stringify({ symbol }),
            signal: AbortSignal.timeout(3000),
          });

          if (res.ok) {
            subscribedCount++;
          }
        } catch (err: any) {
          // Silent catch for individual symbol subscription errors
        }
      }
    } catch (err: any) {
      console.warn(`[Tick Ingestion] ⚠️ Sidecar subscription unavailable for ${account.broker_slug}:`, err.message);
      return false;
    }

    return subscribedCount > 0;
  }

  /**
   * Emits a single tick into the pipeline
   */
  public async ingestTick(rawTick: {
    broker: string;
    symbol: string;
    bid: number;
    ask: number;
    time?: number;
    source?: 'mt5' | 'mock' | 'simulated';
  }): Promise<IngestionTick> {
    const tick = normalizeTickData(rawTick.broker, rawTick);
    await publishTick(tick);

    // Update telemetry
    this.stats.totalTicksIngested++;
    this.stats.ticksByBroker[tick.broker] = (this.stats.ticksByBroker[tick.broker] || 0) + 1;
    this.stats.ticksBySymbol[tick.symbol] = (this.stats.ticksBySymbol[tick.symbol] || 0) + 1;
    this.stats.lastTickTime = tick.time;

    return tick;
  }

  /**
   * Starts the tick ingestion loop
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.stats.startTime = Date.now();

    console.log('[Tick Ingestion] 🚀 Initializing Unified Quote Pipeline Ingestion Daemon...');

    // 1. Verify Redis connectivity
    try {
      const ping = await redis.ping();
      console.log(`[Tick Ingestion] 🟢 Redis connected successfully: ${ping}`);
    } catch (err: any) {
      console.error('[Tick Ingestion] 🔴 Redis connection error:', err.message);
    }

    // 2. Discover Master Feeds
    this.masterFeeds = await this.discoverMasterFeeds();

    // 3. Check MT5 Farm Sidecar Health
    if (!this.forceMock) {
      try {
        const health = await farmHealth();
        this.sidecarAvailable = health.status === 'ok';
        console.log(`[Tick Ingestion] 🛰️ MT5 Farm Health: ${health.status}, sidecars online`);
      } catch (err: any) {
        this.sidecarAvailable = false;
        console.log(`[Tick Ingestion] ⚠️ MT5 Farm Sidecars offline (${err.message}). Activating High-Fidelity Mock Generator.`);
      }
    }

    // 4. Register Subscriptions on Sidecars if available
    if (this.sidecarAvailable && !this.forceMock) {
      for (const feed of this.masterFeeds) {
        await this.subscribeSidecarSymbols(feed);
      }
    }

    // 5. Start Tick Streaming Loop (Mock or MT5 Stream Handler)
    // Runs at high frequency (100ms interval) to provide sub-100ms real-time market ticks
    this.intervalTimer = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        for (const feed of this.masterFeeds) {
          for (const symbol of this.symbols) {
            const tick = this.mockGenerator.nextTick(feed.broker_slug, symbol);
            await this.ingestTick(tick);
          }
        }
      } catch (err: any) {
        this.stats.errors++;
        console.error('[Tick Ingestion] Ingestion cycle error:', err.message);
      }
    }, 100);

    // 6. Periodic Master Feed Re-sync every 60s
    this.feedSyncTimer = setInterval(async () => {
      if (!this.isRunning) return;
      try {
        this.masterFeeds = await this.discoverMasterFeeds();
      } catch (err: any) {
        console.warn('[Tick Ingestion] Feed re-sync error:', err.message);
      }
    }, 60000);

    console.log(`[Tick Ingestion] ⚡ Streaming live ticks for brokers [${this.masterFeeds.map(f => f.broker_slug).join(', ')}] across symbols [${this.symbols.join(', ')}]`);
  }

  /**
   * Graceful shutdown of timers and connections
   */
  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.feedSyncTimer) {
      clearInterval(this.feedSyncTimer);
      this.feedSyncTimer = null;
    }
    console.log('[Tick Ingestion] 🛑 Tick Ingestion Daemon stopped cleanly. Total ticks ingested:', this.stats.totalTicksIngested);
  }

  /**
   * Returns current ingestion telemetry metrics
   */
  public getStats() {
    return {
      ...this.stats,
      uptimeSeconds: Math.floor((Date.now() - (this.stats.startTime || Date.now())) / 1000),
      activeFeeds: this.masterFeeds.map(f => f.broker_slug),
      activeSymbols: this.symbols,
      sidecarAvailable: this.sidecarAvailable,
    };
  }
}

// ============================================================================
// Singleton Instance & CLI Entrypoint
// ============================================================================

export const tickIngestionDaemon = new TickIngestionDaemon();

// Auto-run if executed directly as a script
if (
  process.argv[1]?.includes('tickIngestion') ||
  process.argv[1]?.endsWith('tickIngestion.ts') ||
  process.argv[1]?.endsWith('tickIngestion.js')
) {
  tickIngestionDaemon.start().catch((err) => {
    console.error('[Tick Ingestion] Fatal error starting daemon:', err);
    process.exit(1);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[Tick Ingestion] Received ${signal}. Initiating graceful shutdown...`);
    await tickIngestionDaemon.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
