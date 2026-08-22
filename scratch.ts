// Mock redis BEFORE importing anything else
process.env.REDIS_URL = 'redis://invalid';
(globalThis as any).__mockRedis = {
  get: async () => null,
  set: async () => 'OK',
  on: () => {},
};

import { getMarketSnapshot } from './src/lib/market';
import { executeBrokerOrder } from './src/lib/broker';

// Stub the subscriber to prevent crash
import { redisSubscriber } from './src/lib/redis';
redisSubscriber.on('error', () => {});

async function testStatus() {
  console.log("=== Testing Signal Generation ===");
  try {
    const snapshot = await getMarketSnapshot('XAUUSD', 'mt5_25822553');
    console.log("Signal Gen Success! Snapshot retrieved.");
  } catch (err: any) {
    console.error("Signal Gen Failed:", err.message);
  }

  console.log("\n=== Testing Order Execution ===");
  try {
    const result = await executeBrokerOrder('mt5_25822553', 'XAUUSD', 'BUY', 0.01, 0);
    console.log("Order Execution Success! OrderID:", result.orderId);
  } catch (err: any) {
    console.error("Order Execution Failed:", err.message);
  }
  process.exit(0);
}

testStatus();
