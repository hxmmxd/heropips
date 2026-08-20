/**
 * Synthetic Tick Fixtures & Generators for UQP E2E Testing
 */

export interface RawSidecarTick {
  symbol: string;
  time_msc: number;
  bid: number;
  ask: number;
  volume?: number;
  flags?: number;
}

export interface NormalizedTick {
  broker: string;
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  time: number;
}

/**
 * Normalizes raw tick into standard UQP tick payload
 */
export function normalizeTick(broker: string, raw: RawSidecarTick): NormalizedTick {
  const mid = Number(((raw.bid + raw.ask) / 2).toFixed(5));
  const spread = Number((raw.ask - raw.bid).toFixed(5));
  return {
    broker,
    symbol: raw.symbol,
    bid: raw.bid,
    ask: raw.ask,
    mid,
    spread,
    time: raw.time_msc,
  };
}

/**
 * Generates a realistic sequence of normal Bid/Ask ticks with valid spread
 */
export function generateNormalTicks(
  symbol: string = 'XAUUSD',
  broker: string = 'vantage',
  startPrice: number = 2735.5,
  count: number = 20,
  intervalMs: number = 100,
  spreadAmount: number = 0.2,
  startTime: number = 1724000000000
): NormalizedTick[] {
  const ticks: NormalizedTick[] = [];
  let currentPrice = startPrice;

  for (let i = 0; i < count; i++) {
    const delta = (Math.sin(i / 3) * 0.15) + ((i % 2 === 0 ? 1 : -1) * 0.05);
    currentPrice = Number((currentPrice + delta).toFixed(5));
    const bid = Number((currentPrice - spreadAmount / 2).toFixed(5));
    const ask = Number((currentPrice + spreadAmount / 2).toFixed(5));
    const mid = Number(((bid + ask) / 2).toFixed(5));
    const spread = Number((ask - bid).toFixed(5));
    const time = startTime + i * intervalMs;

    ticks.push({
      broker,
      symbol,
      bid,
      ask,
      mid,
      spread,
      time,
    });
  }

  return ticks;
}

/**
 * Generates a flash spike / flash crash tick pattern
 */
export function generateSpikeTicks(
  symbol: string = 'XAUUSD',
  broker: string = 'vantage',
  basePrice: number = 2735.0,
  spikePrice: number = 2710.0,
  startTime: number = 1724000000000
): NormalizedTick[] {
  return [
    { broker, symbol, bid: basePrice, ask: basePrice + 0.2, mid: basePrice + 0.1, spread: 0.2, time: startTime },
    { broker, symbol, bid: basePrice - 5, ask: basePrice - 3, mid: basePrice - 4, spread: 2.0, time: startTime + 100 },
    { broker, symbol, bid: spikePrice, ask: spikePrice + 4.0, mid: spikePrice + 2.0, spread: 4.0, time: startTime + 200 }, // Spike trough
    { broker, symbol, bid: basePrice - 10, ask: basePrice - 8, mid: basePrice - 9, spread: 2.0, time: startTime + 300 },
    { broker, symbol, bid: basePrice, ask: basePrice + 0.2, mid: basePrice + 0.1, spread: 0.2, time: startTime + 400 }, // Recovery
  ];
}

/**
 * Generates boundary ticks with zero spread (Bid === Ask)
 */
export function generateZeroSpreadTicks(
  symbol: string = 'EURUSD',
  broker: string = 'xm',
  price: number = 1.085,
  count: number = 5,
  startTime: number = 1724000000000
): NormalizedTick[] {
  const ticks: NormalizedTick[] = [];
  for (let i = 0; i < count; i++) {
    ticks.push({
      broker,
      symbol,
      bid: price,
      ask: price,
      mid: price,
      spread: 0,
      time: startTime + i * 50,
    });
  }
  return ticks;
}

/**
 * Generates sub-millisecond arrival ticks (identical timestamp or bursting)
 */
export function generateSubMillisecondTicks(
  symbol: string = 'XAUUSD',
  broker: string = 'atfx',
  basePrice: number = 2735.0,
  count: number = 10,
  timestamp: number = 1724000000000
): NormalizedTick[] {
  const ticks: NormalizedTick[] = [];
  for (let i = 0; i < count; i++) {
    const p = basePrice + i * 0.01;
    ticks.push({
      broker,
      symbol,
      bid: Number(p.toFixed(5)),
      ask: Number((p + 0.1).toFixed(5)),
      mid: Number((p + 0.05).toFixed(5)),
      spread: 0.1,
      time: timestamp, // Exact same timestamp
    });
  }
  return ticks;
}

/**
 * Generates multi-broker interleaved ticks across Vantage, XM, and ATFX
 */
export function generateMultiBrokerTicks(
  symbols: string[] = ['XAUUSD', 'EURUSD'],
  brokers: string[] = ['vantage', 'xm', 'atfx'],
  countPerBroker: number = 10,
  startTime: number = 1724000000000
): NormalizedTick[] {
  const ticks: NormalizedTick[] = [];
  const basePrices: Record<string, number> = {
    XAUUSD: 2735.0,
    EURUSD: 1.085,
    GBPUSD: 1.295,
  };

  for (let i = 0; i < countPerBroker; i++) {
    for (const broker of brokers) {
      for (const sym of symbols) {
        const base = basePrices[sym] || 100.0;
        // Broker-specific spread adjustments to verify isolation
        const brokerOffset = broker === 'vantage' ? 0.0 : broker === 'xm' ? 0.05 : -0.05;
        const bid = Number((base + i * 0.02 + brokerOffset).toFixed(5));
        const spread = broker === 'vantage' ? 0.2 : broker === 'xm' ? 0.3 : 0.25;
        const ask = Number((bid + spread).toFixed(5));
        const mid = Number(((bid + ask) / 2).toFixed(5));

        ticks.push({
          broker,
          symbol: sym,
          bid,
          ask,
          mid,
          spread,
          time: startTime + i * 50,
        });
      }
    }
  }

  return ticks;
}

// Pre-baked fixture sets
export const SAMPLE_TICKS_XAUUSD = generateNormalTicks('XAUUSD', 'vantage', 2735.45, 10, 100, 0.25, 1724000000000);
export const SAMPLE_TICKS_EURUSD = generateNormalTicks('EURUSD', 'xm', 1.0852, 10, 100, 0.00015, 1724000000000);
export const SAMPLE_TICKS_USDJPY = generateNormalTicks('USDJPY', 'vantage', 155.35, 10, 100, 0.02, 1724000000000);
export const SAMPLE_TICKS_BTCUSD = generateNormalTicks('BTCUSD', 'vantage', 65420.5, 10, 100, 2.5, 1724000000000);

export const FLASH_CRASH_TICKS = generateSpikeTicks('XAUUSD', 'vantage', 2735.0, 2705.0, 1724000000000);

export const MALFORMED_TICKS = [
  { broker: '', symbol: 'XAUUSD', bid: 2735.0, ask: 2735.2, mid: 2735.1, spread: 0.2, time: 1724000000000 },
  { broker: 'vantage', symbol: '', bid: 2735.0, ask: 2735.2, mid: 2735.1, spread: 0.2, time: 1724000000000 },
  { broker: 'vantage', symbol: 'XAUUSD', bid: NaN, ask: 2735.2, mid: 2735.1, spread: 0.2, time: 1724000000000 },
  { broker: 'vantage', symbol: 'XAUUSD', bid: 2735.0, ask: 2730.0, mid: 2732.5, spread: -5.0, time: 1724000000000 }, // Inverted bid/ask
  { broker: 'vantage', symbol: 'XAUUSD', bid: 2735.0, ask: 2735.2, mid: 2735.1, spread: 0.2, time: -1 }, // Negative time
];
