import { Queue, Worker, Job } from 'bullmq';
import { redis, redisSubscriber } from '../redis';
import { FARM_BASE, FARM_HEADERS } from '../mt5farm';
import { calculateRiskParams } from '../market';

const QUEUE_NAME = 'order-dispatch';

export interface OrderJobData {
  accountId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  signalEntryPrice: number;
  stopLoss: number;
  takeProfit: number;
  maxSlippagePips: number;
  signalCreatedAt: number;
  ttlMs: number;
  masterAccountId?: string;
}

export const orderQueue = new Queue<OrderJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const orderWorker = new Worker<OrderJobData>(
  QUEUE_NAME,
  async (job: Job<OrderJobData>) => {
    const data = job.data;
    const now = Date.now();

    // 1. TTL Guard (5 seconds)
    if (now - data.signalCreatedAt > data.ttlMs) {
      throw new Error(`[TTL EXPIRED] Signal is older than ${data.ttlMs}ms`);
    }

    // 2. Max Slippage Guard
    // Fetch latest tick from the specific master feed that generated the signal
    const masterAcc = data.masterAccountId || 'MASTER_VANTAGE_1';
    const streamKey = `stream:market:ticks:${masterAcc}:${data.symbol}`;
    const tickData = await redis.xrevrange(streamKey, '+', '-', 'COUNT', 1);
    if (!tickData || tickData.length === 0) {
      throw new Error(`[NO TICK DATA] Cannot verify slippage for ${data.symbol}`);
    }

    const latestTickFields = tickData[0][1];
    let bid = 0, ask = 0;
    for (let i = 0; i < latestTickFields.length; i += 2) {
      if (latestTickFields[i] === 'bid') bid = parseFloat(latestTickFields[i + 1]);
      if (latestTickFields[i] === 'ask') ask = parseFloat(latestTickFields[i + 1]);
    }

    if (!bid || !ask) {
      throw new Error(`[INVALID TICK] Missing bid/ask in stream for ${data.symbol}`);
    }

    const currentPrice = data.direction === 'BUY' ? ask : bid;
    
    // Check slippage
    // Assuming 1 pip = 0.0001 (forex) or similar, this would require standardizing pip size per symbol.
    // For simplicity, we just use raw price diff if strictly needed, or percentage drift.
    // Let's implement a safe drift check:
    const diff = Math.abs(currentPrice - data.signalEntryPrice);
    const driftPercent = (diff / data.signalEntryPrice) * 100;
    if (driftPercent > 0.05) { // 0.05% drift max as a safe generic threshold
      throw new Error(`[SLIPPAGE EXCEEDED] Current price ${currentPrice} drifted > 0.05% from ${data.signalEntryPrice}`);
    }

    // 3. Sizing / Risk Check
    const riskParams = calculateRiskParams(
      currentPrice,
      null,
      data.direction,
      10000, // Placeholder account balance
      1.5,   // Placeholder risk percent
      data.symbol
    );

    // 4. Dispatch to MT5 local Sidecar via REST
    const url = `${FARM_BASE}/accounts/${data.accountId}/proxy/trade`;
    const payload = {
      action: data.direction,
      symbol: data.symbol,
      volume: parseFloat(riskParams.lotVolume) || 0.01,
      sl: data.stopLoss,
      tp: data.takeProfit,
      type: 0 // Market execution
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: FARM_HEADERS,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`[MT5 EXECUTION FAILED] ${res.status} ${errTxt}`);
    }

    const result = await res.json();
    console.log(`[Order Dispatcher] ✅ Trade Executed: ${data.accountId} ${data.symbol}`, result);
    
    // Concurrency throttle to prevent MT5 "Trade Context Busy" (max 10 TPS per terminal -> 100ms sleep)
    await new Promise(r => setTimeout(r, 100));
    
    return result;
  },
  {
    connection: redisSubscriber,
    concurrency: 1, // Enforce strict sequential execution per worker thread
  }
);

orderWorker.on('failed', (job, err) => {
  console.error(`[Order Dispatcher] ❌ Job ${job?.id} failed:`, err.message);
});
