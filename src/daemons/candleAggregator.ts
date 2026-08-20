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
        console.warn(`[Candle Aggregator] Warning: Could not read ${file}:`, err.message);
      }
    }
  }
}

loadEnv();

import { redis, redisSubscriber } from '../lib/redis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  IngestionTick,
  DEFAULT_SYMBOLS,
  DEFAULT_BROKERS,
  normalizeBrokerSlug,
  normalizeSymbol,
  getStreamKey,
  getPubSubChannel,
} from './tickIngestion';

// ============================================================================
// Types, Interfaces & Constants
// ============================================================================

export type CandleTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface CandleData {
  broker: string;
  symbol: string;
  timeframe: string;
  time: number; // UTC Epoch ms strictly aligned to timeframe boundary
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  is_closed: boolean;
  created_at?: string;
  updated_at?: string;
}

export const TIMEFRAME_MS: Record<string, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

export const DEFAULT_TIMEFRAMES: CandleTimeframe[] = ['1m', '5m', '1h'];
export const OHLC_CONSUMER_GROUP = 'ohlc-aggregator-group';
export const DEFAULT_CONSUMER_NAME = `ohlc-aggregator-worker-${process.pid || 1}`;

/**
 * Returns canonical Redis hot cache key for a candle
 * Key Pattern: candles:{broker}:{symbol}:{timeframe}:latest
 */
export function getCandleHotCacheKey(broker: string, symbol: string, timeframe: string): string {
  return `candles:${normalizeBrokerSlug(broker)}:${normalizeSymbol(symbol)}:${timeframe.toLowerCase()}:latest`;
}

/**
 * Validates strict mathematical invariants for any OHLC candle:
 * 1. High >= max(Open, Close, Low)
 * 2. Low <= min(Open, Close, High)
 * 3. High >= Low
 * 4. Volume >= 0 and finite
 * 5. Time > 0 and aligned to intervalMs
 */
export function verifyCandleInvariants(
  candle: CandleData,
  timeframe?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (candle.high < Math.max(candle.open, candle.close, candle.low)) {
    errors.push(
      `Invariant violated: High (${candle.high}) < max(Open: ${candle.open}, Close: ${candle.close}, Low: ${candle.low})`
    );
  }

  if (candle.low > Math.min(candle.open, candle.close, candle.high)) {
    errors.push(
      `Invariant violated: Low (${candle.low}) > min(Open: ${candle.open}, Close: ${candle.close}, High: ${candle.high})`
    );
  }

  if (candle.high < candle.low) {
    errors.push(`Invariant violated: High (${candle.high}) < Low (${candle.low})`);
  }

  if (candle.volume < 0 || !Number.isFinite(candle.volume)) {
    errors.push(`Invariant violated: Volume (${candle.volume}) must be non-negative finite number`);
  }

  if (candle.time <= 0 || !Number.isFinite(candle.time)) {
    errors.push(`Invariant violated: Time (${candle.time}) must be a positive timestamp`);
  }

  const tf = timeframe || candle.timeframe;
  if (tf && TIMEFRAME_MS[tf]) {
    const interval = TIMEFRAME_MS[tf];
    if (candle.time % interval !== 0) {
      errors.push(`Invariant violated: Time (${candle.time}) is not aligned to ${tf} boundary (${interval}ms)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Candle Aggregator Daemon Class
// ============================================================================

export interface CandleAggregatorOptions {
  redisClient?: any;
  subscriberClient?: any;
  supabaseClient?: SupabaseClient | null;
  timeframes?: string[];
  symbols?: string[];
  brokers?: string[];
  consumerName?: string;
  flushIntervalMs?: number;
  streamBatchSize?: number;
}

export class CandleAggregatorDaemon {
  private redisClient: any;
  private subscriberClient: any;
  private supabase: SupabaseClient | null = null;

  private timeframes: string[];
  private symbols: string[];
  private brokers: string[];
  private consumerName: string;
  private flushIntervalMs: number;
  private streamBatchSize: number;

  private isRunning: boolean = false;
  private isProcessingStreams: boolean = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private streamLoopTimer: NodeJS.Timeout | null = null;
  private pubsubMessageHandler: ((channel: string, message: string) => void) | null = null;

  // In-memory state: key = `${broker}:${symbol}:${timeframe}`
  private activeCandles: Map<string, CandleData> = new Map();
  private dirtyKeys: Set<string> = new Set();
  private finalizedQueue: CandleData[] = [];

  private stats = {
    totalTicksProcessed: 0,
    candlesFormed1m: 0,
    candlesFormed5m: 0,
    candlesFormed1h: 0,
    candlesPersisted: 0,
    hotCacheUpdates: 0,
    streamReadErrors: 0,
    dbErrors: 0,
    startTime: 0,
    lastTickTime: 0,
  };

  constructor(options?: CandleAggregatorOptions) {
    this.redisClient = options?.redisClient || redis;
    this.subscriberClient = options?.subscriberClient || redisSubscriber;
    this.timeframes = options?.timeframes || [...DEFAULT_TIMEFRAMES];
    this.symbols = options?.symbols ? options.symbols.map(normalizeSymbol) : [...DEFAULT_SYMBOLS];
    this.brokers = options?.brokers ? options.brokers.map(normalizeBrokerSlug) : [...DEFAULT_BROKERS];
    this.consumerName = options?.consumerName || DEFAULT_CONSUMER_NAME;
    this.flushIntervalMs = options?.flushIntervalMs || 5000;
    this.streamBatchSize = options?.streamBatchSize || 50;

    if (options?.supabaseClient !== undefined) {
      this.supabase = options.supabaseClient;
    } else {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      }
    }
  }

  private getStateKey(broker: string, symbol: string, timeframe: string): string {
    return `${normalizeBrokerSlug(broker)}:${normalizeSymbol(symbol)}:${timeframe.toLowerCase()}`;
  }

  /**
   * Deterministic time bucket calculation: floor(timestamp / intervalMs) * intervalMs
   */
  public alignBucketTime(timestamp: number, timeframe: string): number {
    const interval = TIMEFRAME_MS[timeframe] || 60000;
    return Math.floor(timestamp / interval) * interval;
  }

  /**
   * Updates Redis hot cache with the latest candle JSON object
   */
  public async updateHotCache(candle: CandleData): Promise<void> {
    try {
      const cacheKey = getCandleHotCacheKey(candle.broker, candle.symbol, candle.timeframe);
      const payload = JSON.stringify({
        broker: candle.broker,
        symbol: candle.symbol,
        timeframe: candle.timeframe,
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        is_closed: candle.is_closed,
        updated_at: candle.updated_at || new Date().toISOString(),
      });
      await this.redisClient.set(cacheKey, payload);
      this.stats.hotCacheUpdates++;
    } catch (err: any) {
      console.warn(`[Candle Aggregator] Error updating hot cache for ${candle.broker}:${candle.symbol}:${candle.timeframe}:`, err.message);
    }
  }

  /**
   * Processes a single tick mid-price into active multi-timeframe candles (1m, 5m, 1h)
   */
  public async ingestTick(rawTick: IngestionTick | {
    broker: string;
    symbol: string;
    bid?: number;
    ask?: number;
    mid?: number;
    spread?: number;
    time?: number;
    source?: string;
  }): Promise<void> {
    const broker = normalizeBrokerSlug(rawTick.broker);
    const symbol = normalizeSymbol(rawTick.symbol);

    let mid = rawTick.mid;
    if (mid === undefined || isNaN(mid)) {
      const bid = Number(rawTick.bid) || 1.0;
      const ask = Number(rawTick.ask) || bid;
      mid = Number(((bid + ask) / 2).toFixed(6));
    } else {
      mid = Number(mid);
    }

    const time = rawTick.time && Number(rawTick.time) > 0 ? Number(rawTick.time) : Date.now();

    this.stats.totalTicksProcessed++;
    this.stats.lastTickTime = time;

    // Process against each active timeframe
    for (const tf of this.timeframes) {
      const intervalMs = TIMEFRAME_MS[tf] || 60000;
      const bucketTime = Math.floor(time / intervalMs) * intervalMs;
      const stateKey = this.getStateKey(broker, symbol, tf);
      const existing = this.activeCandles.get(stateKey);

      if (!existing) {
        // Initial candle for this timeframe
        const newCandle: CandleData = {
          broker,
          symbol,
          timeframe: tf,
          time: bucketTime,
          open: mid,
          high: mid,
          low: mid,
          close: mid,
          volume: 1,
          is_closed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.activeCandles.set(stateKey, newCandle);
        this.dirtyKeys.add(stateKey);
        await this.updateHotCache(newCandle);
      } else if (time >= existing.time + intervalMs) {
        // Rollover: Previous candle has closed
        const finalizedCandle: CandleData = {
          ...existing,
          is_closed: true,
          updated_at: new Date().toISOString(),
        };

        // Queue finalized candle for Supabase persistence
        this.finalizedQueue.push(finalizedCandle);
        await this.updateHotCache(finalizedCandle);

        if (tf === '1m') this.stats.candlesFormed1m++;
        else if (tf === '5m') this.stats.candlesFormed5m++;
        else if (tf === '1h') this.stats.candlesFormed1h++;

        // Initialize new open candle
        const nextCandle: CandleData = {
          broker,
          symbol,
          timeframe: tf,
          time: bucketTime,
          open: mid,
          high: mid,
          low: mid,
          close: mid,
          volume: 1,
          is_closed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.activeCandles.set(stateKey, nextCandle);
        this.dirtyKeys.add(stateKey);
        await this.updateHotCache(nextCandle);
      } else if (time >= existing.time && time < existing.time + intervalMs) {
        // Standard in-progress tick within the open bar
        existing.high = Math.max(existing.high, mid);
        existing.low = Math.min(existing.low, mid);
        existing.close = mid;
        existing.volume += 1;
        existing.updated_at = new Date().toISOString();
        this.dirtyKeys.add(stateKey);
        await this.updateHotCache(existing);
      } else {
        // Late arriving out-of-order tick for open bar
        existing.high = Math.max(existing.high, mid);
        existing.low = Math.min(existing.low, mid);
        existing.volume += 1;
        existing.updated_at = new Date().toISOString();
        this.dirtyKeys.add(stateKey);
        await this.updateHotCache(existing);
      }
    }
  }

  /**
   * Flushes finalized and dirty in-progress candles to Supabase market_candles table
   */
  public async flushPendingToDatabase(forceAll: boolean = false): Promise<number> {
    const candlesToUpsert: CandleData[] = [];

    // 1. Drain finalized candles queue
    while (this.finalizedQueue.length > 0) {
      const c = this.finalizedQueue.shift();
      if (c) candlesToUpsert.push(c);
    }

    // 2. Add dirty open candles if requested or periodic flush
    if (forceAll || candlesToUpsert.length === 0) {
      for (const key of Array.from(this.dirtyKeys)) {
        const c = this.activeCandles.get(key);
        if (c) {
          candlesToUpsert.push({ ...c, is_closed: forceAll ? true : c.is_closed });
        }
      }
      this.dirtyKeys.clear();
    }

    if (candlesToUpsert.length === 0) {
      return 0;
    }

    if (!this.supabase) {
      // Offline / mock mode
      this.stats.candlesPersisted += candlesToUpsert.length;
      return candlesToUpsert.length;
    }

    try {
      const { error } = await this.supabase
        .from('market_candles')
        .upsert(candlesToUpsert, { onConflict: 'broker,symbol,timeframe,time' });

      if (error) {
        this.stats.dbErrors++;
        console.error('[Candle Aggregator] Supabase upsert error:', error.message);
        // Re-queue finalized candles on error to prevent data loss
        for (const c of candlesToUpsert) {
          if (c.is_closed) {
            this.finalizedQueue.push(c);
          }
        }
        return 0;
      }

      this.stats.candlesPersisted += candlesToUpsert.length;
      return candlesToUpsert.length;
    } catch (err: any) {
      this.stats.dbErrors++;
      console.error('[Candle Aggregator] Exception during database flush:', err.message);
      return 0;
    }
  }

  /**
   * Initializes Redis Stream consumer groups for all active broker & symbol streams
   */
  public async setupConsumerGroups(): Promise<void> {
    for (const broker of this.brokers) {
      for (const symbol of this.symbols) {
        const streamKey = getStreamKey(broker, symbol);
        try {
          // XGROUP CREATE streamKey group $ MKSTREAM
          await this.redisClient.xgroup('CREATE', streamKey, OHLC_CONSUMER_GROUP, '$', 'MKSTREAM');
          console.log(`[Candle Aggregator] 📦 Created consumer group ${OHLC_CONSUMER_GROUP} on ${streamKey}`);
        } catch (err: any) {
          if (err.message && err.message.includes('BUSYGROUP')) {
            // Group already exists, which is normal and expected
          } else {
            console.warn(`[Candle Aggregator] Consumer group setup note on ${streamKey}:`, err.message);
          }
        }
      }
    }
  }

  /**
   * Starts Pub/Sub fallback listener for real-time tick consumption
   */
  private setupPubSubListener(): void {
    if (!this.subscriberClient) return;

    this.pubsubMessageHandler = async (channel: string, message: string) => {
      try {
        if (channel.startsWith('channel:ticks:')) {
          const tick: IngestionTick = JSON.parse(message);
          await this.ingestTick(tick);
        }
      } catch (err: any) {
        // Ignore unparseable pub/sub payloads
      }
    };

    try {
      this.subscriberClient.on('message', this.pubsubMessageHandler);
      // Subscribe to all tick channels via pattern
      if (typeof this.subscriberClient.psubscribe === 'function') {
        this.subscriberClient.psubscribe('channel:ticks:*').catch(() => {});
      } else {
        for (const broker of this.brokers) {
          for (const symbol of this.symbols) {
            const channel = getPubSubChannel(broker, symbol);
            this.subscriberClient.subscribe(channel).catch(() => {});
          }
        }
      }
    } catch (err: any) {
      console.warn('[Candle Aggregator] Pub/Sub subscription warning:', err.message);
    }
  }

  /**
   * Reads and processes pending entries from Redis Streams
   */
  private async processStreamBatch(): Promise<void> {
    if (!this.isRunning || this.isProcessingStreams) return;
    this.isProcessingStreams = true;

    try {
      const streamKeys: string[] = [];
      const streamIds: string[] = [];

      for (const broker of this.brokers) {
        for (const symbol of this.symbols) {
          streamKeys.push(getStreamKey(broker, symbol));
          streamIds.push('>'); // Read new undelivered messages
        }
      }

      if (streamKeys.length === 0) {
        this.isProcessingStreams = false;
        return;
      }

      // XREADGROUP GROUP group consumer COUNT count BLOCK block STREAMS key... id...
      const response = await this.redisClient.xreadgroup(
        'GROUP',
        OHLC_CONSUMER_GROUP,
        this.consumerName,
        'COUNT',
        this.streamBatchSize,
        'BLOCK',
        200,
        'STREAMS',
        ...streamKeys,
        ...streamIds
      );

      if (response && Array.isArray(response)) {
        for (const streamResult of response) {
          const [streamKey, entries] = streamResult;
          if (Array.isArray(entries)) {
            for (const entry of entries) {
              const [messageId, fields] = entry;
              const fieldMap: Record<string, string> = {};
              for (let i = 0; i < fields.length; i += 2) {
                fieldMap[fields[i]] = fields[i + 1];
              }

              const tick: IngestionTick = {
                broker: fieldMap['broker'] || 'vantage',
                symbol: fieldMap['symbol'] || 'XAUUSD',
                bid: parseFloat(fieldMap['bid'] || '0'),
                ask: parseFloat(fieldMap['ask'] || '0'),
                mid: parseFloat(fieldMap['mid'] || '0'),
                spread: parseFloat(fieldMap['spread'] || '0'),
                time: parseInt(fieldMap['time'] || String(Date.now()), 10),
                source: (fieldMap['source'] as any) || 'mt5',
              };

              await this.ingestTick(tick);

              // Acknowledge processed message
              await this.redisClient.xack(streamKey, OHLC_CONSUMER_GROUP, messageId);
            }
          }
        }
      }
    } catch (err: any) {
      this.stats.streamReadErrors++;
      // Suppress timeout / non-fatal errors during normal polling
      if (!err.message?.includes('Connection is closed')) {
        // Log sparingly
      }
    } finally {
      this.isProcessingStreams = false;
    }
  }

  /**
   * Starts the OHLC Aggregator Daemon
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.stats.startTime = Date.now();

    console.log('[Candle Aggregator] 🚀 Starting OHLC Aggregator Daemon...');

    // 1. Verify Redis connectivity
    try {
      const ping = await this.redisClient.ping();
      console.log(`[Candle Aggregator] 🟢 Redis connected successfully: ${ping}`);
    } catch (err: any) {
      console.error('[Candle Aggregator] 🔴 Redis connection error:', err.message);
    }

    // 2. Setup Redis Stream Consumer Groups
    await this.setupConsumerGroups();

    // 3. Setup Pub/Sub listener
    this.setupPubSubListener();

    // 4. Start periodic database flush timer (every 5000ms)
    this.flushTimer = setInterval(async () => {
      if (!this.isRunning) return;
      await this.flushPendingToDatabase(false);
    }, this.flushIntervalMs);

    // 5. Start Redis Stream consumption poll loop
    this.streamLoopTimer = setInterval(async () => {
      if (!this.isRunning) return;
      await this.processStreamBatch();
    }, 100);

    console.log(`[Candle Aggregator] ⚡ Aggregating timeframes [${this.timeframes.join(', ')}] across brokers [${this.brokers.join(', ')}] and symbols [${this.symbols.join(', ')}]`);
  }

  /**
   * Graceful shutdown: flushes in-memory candles to database and clears timers
   */
  public async stop(): Promise<void> {
    this.isRunning = false;

    if (this.streamLoopTimer) {
      clearInterval(this.streamLoopTimer);
      this.streamLoopTimer = null;
    }

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.subscriberClient && this.pubsubMessageHandler) {
      try {
        this.subscriberClient.off('message', this.pubsubMessageHandler);
        this.pubsubMessageHandler = null;
      } catch (err) {
        // Clean teardown
      }
    }

    // Final flush of all open and finalized candles
    console.log('[Candle Aggregator] 💾 Flushing final candles to database...');
    await this.flushPendingToDatabase(true);

    console.log(
      `[Candle Aggregator] 🛑 Daemon stopped cleanly. Processed ${this.stats.totalTicksProcessed} ticks, formed ${this.stats.candlesFormed1m} 1m bars, persisted ${this.stats.candlesPersisted} candles.`
    );
  }

  /**
   * Returns in-memory candle for a specific broker, symbol, and timeframe
   */
  public getLatestCandle(broker: string, symbol: string, timeframe: string): CandleData | null {
    const key = this.getStateKey(broker, symbol, timeframe);
    const candle = this.activeCandles.get(key);
    return candle ? { ...candle } : null;
  }

  /**
   * Returns all active in-memory candles
   */
  public getAllOpenCandles(): CandleData[] {
    return Array.from(this.activeCandles.values()).map((c) => ({ ...c }));
  }

  /**
   * Returns operational statistics and metrics
   */
  public getStats() {
    return {
      ...this.stats,
      uptimeSeconds: Math.floor((Date.now() - (this.stats.startTime || Date.now())) / 1000),
      activeCandlesCount: this.activeCandles.size,
      timeframes: this.timeframes,
      brokers: this.brokers,
      symbols: this.symbols,
    };
  }
}

// ============================================================================
// Singleton Instance & CLI Entrypoint
// ============================================================================

export const candleAggregatorDaemon = new CandleAggregatorDaemon();

// Auto-run if executed directly as a script
if (
  process.argv[1]?.includes('candleAggregator') ||
  process.argv[1]?.endsWith('candleAggregator.ts') ||
  process.argv[1]?.endsWith('candleAggregator.js')
) {
  candleAggregatorDaemon.start().catch((err) => {
    console.error('[Candle Aggregator] Fatal error starting daemon:', err);
    process.exit(1);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[Candle Aggregator] Received ${signal}. Initiating graceful shutdown...`);
    await candleAggregatorDaemon.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
