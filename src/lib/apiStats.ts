/**
 * apiStats.ts
 * In-memory API call tracker shared across server routes.
 * Records calls, errors, latency, and active connection status per API.
 *
 * Note: On serverless platforms (Vercel), each function instance has its
 * own memory — stats reflect the current warm instance's activity.
 * On persistent servers (local / Railway / Render), stats accumulate normally.
 */

export type ApiName = 'twelve_data' | 'nvidia' | 'groq' | 'binance' | 'yahoo_finance' | 'metaapi';

export interface ApiStat {
  name: ApiName;
  label: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  // Sliding 60-second window timestamps for calls/min calculation
  recentTimestamps: number[];
  lastCallAt: number | null;      // epoch ms
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastErrorMsg: string | null;
  avgLatencyMs: number;
  lastLatencyMs: number | null;
  status: 'active' | 'error' | 'idle' | 'unconfigured' | 'disabled';
  // Quota info
  quotaPerMin: number | null;     // null = unlimited
  quotaPerDay: number | null;
}

// Initialise stat records
const STATS: Record<ApiName, ApiStat> = {
  twelve_data: {
    name: 'twelve_data', label: 'Twelve Data',
    totalCalls: 0, successCalls: 0, errorCalls: 0,
    recentTimestamps: [], lastCallAt: null, lastSuccessAt: null,
    lastErrorAt: null, lastErrorMsg: null,
    avgLatencyMs: 0, lastLatencyMs: null,
    status: 'idle',
    quotaPerMin: 55,     // Grow plan
    quotaPerDay: null,   // No daily limit on Grow
  },
  nvidia: {
    name: 'nvidia', label: 'NVIDIA NIM',
    totalCalls: 0, successCalls: 0, errorCalls: 0,
    recentTimestamps: [], lastCallAt: null, lastSuccessAt: null,
    lastErrorAt: null, lastErrorMsg: null,
    avgLatencyMs: 0, lastLatencyMs: null,
    status: 'idle',
    quotaPerMin: null,
    quotaPerDay: null,
  },
  groq: {
    name: 'groq', label: 'Groq (LPU)',
    totalCalls: 0, successCalls: 0, errorCalls: 0,
    recentTimestamps: [], lastCallAt: null, lastSuccessAt: null,
    lastErrorAt: null, lastErrorMsg: null,
    avgLatencyMs: 0, lastLatencyMs: null,
    status: 'idle',
    quotaPerMin: 30,       // Free tier: 30 req/min
    quotaPerDay: 14400,    // Free tier: 14,400 req/day
  },
  binance: {
    name: 'binance', label: 'Binance (BTC/ETH)',
    totalCalls: 0, successCalls: 0, errorCalls: 0,
    recentTimestamps: [], lastCallAt: null, lastSuccessAt: null,
    lastErrorAt: null, lastErrorMsg: null,
    avgLatencyMs: 0, lastLatencyMs: null,
    status: 'idle',
    quotaPerMin: null,   // Effectively unlimited
    quotaPerDay: null,
  },
  yahoo_finance: {
    name: 'yahoo_finance', label: 'Yahoo Finance',
    totalCalls: 0, successCalls: 0, errorCalls: 0,
    recentTimestamps: [], lastCallAt: null, lastSuccessAt: null,
    lastErrorAt: null, lastErrorMsg: null,
    avgLatencyMs: 0, lastLatencyMs: null,
    status: 'idle',
    quotaPerMin: null,   // Unofficial — soft rate limited
    quotaPerDay: null,
  },
  metaapi: {
    name: 'metaapi', label: 'MetaAPI (MT5)',
    totalCalls: 0, successCalls: 0, errorCalls: 0,
    recentTimestamps: [], lastCallAt: null, lastSuccessAt: null,
    lastErrorAt: null, lastErrorMsg: null,
    avgLatencyMs: 0, lastLatencyMs: null,
    status: 'idle',
    quotaPerMin: null,
    quotaPerDay: null,
  },
};

// Rolling latency samples (last 20 calls)
const LATENCY_SAMPLES: Record<ApiName, number[]> = {
  twelve_data: [], nvidia: [], groq: [], binance: [], yahoo_finance: [], metaapi: [],
};

/** Record a completed API call */
export function recordApiCall(
  api: ApiName,
  success: boolean,
  latencyMs: number,
  errorMsg?: string
) {
  const stat = STATS[api];
  const now = Date.now();

  stat.totalCalls++;
  stat.lastCallAt = now;
  stat.lastLatencyMs = latencyMs;

  // Sliding 60-second window
  stat.recentTimestamps.push(now);
  stat.recentTimestamps = stat.recentTimestamps.filter(t => now - t < 60_000);

  // Latency rolling average
  const samples = LATENCY_SAMPLES[api];
  samples.push(latencyMs);
  if (samples.length > 20) samples.shift();
  stat.avgLatencyMs = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);

  if (success) {
    stat.successCalls++;
    stat.lastSuccessAt = now;
    stat.status = 'active';
  } else {
    stat.errorCalls++;
    stat.lastErrorAt = now;
    stat.lastErrorMsg = errorMsg || 'Unknown error';
    stat.status = 'error';
  }
}

/** Mark an API as unconfigured (no key) */
export function markUnconfigured(api: ApiName) {
  STATS[api].status = 'unconfigured';
}

/** Mark an API as disabled by admin toggle */
export function markDisabled(api: ApiName) {
  STATS[api].status = 'disabled';
}

/** Get a snapshot of all stats (safe to serialise) */
export function getApiStats(): ApiStat[] {
  const now = Date.now();
  return Object.values(STATS).map(s => ({
    ...s,
    // Recalculate fresh calls/min count in snapshot
    recentTimestamps: s.recentTimestamps.filter(t => now - t < 60_000),
  }));
}
