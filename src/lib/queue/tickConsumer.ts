import { redis } from '../redis';
import { orderQueue } from './orderQueue';

const STREAM_GROUP = 'sentinel-group';
const CONSUMER_NAME = 'sentinel-worker-1';

// We want to track which streams we're listening to
// The MT5 sidecars will push to stream:market:ticks:{symbol}
const symbols = ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD'];
const streams = symbols.map(s => `stream:market:ticks:${s}`);
const ids = symbols.map(() => '>'); // > means fetch new messages never delivered to other consumers in group

export async function startTickConsumer() {
  console.log('[Tick Consumer] 🟢 Starting real-time market tick consumer for:', symbols.join(', '));

  // Initialize consumer groups
  for (const stream of streams) {
    try {
      await redis.xgroup('CREATE', stream, STREAM_GROUP, '$', 'MKSTREAM');
    } catch (err: any) {
      if (!err.message.includes('BUSYGROUP')) {
        console.error(`[Tick Consumer] Failed to create group for ${stream}:`, err.message);
      }
    }
  }

  // Polling loop
  while (true) {
    try {
      // Block for up to 5 seconds waiting for new ticks
      const results = await (redis as any).xreadgroup(
        'GROUP', STREAM_GROUP, CONSUMER_NAME,
        'BLOCK', 5000,
        'COUNT', 100,
        'STREAMS', ...streams, ...ids
      );

      if (results) {
        for (const [streamKey, messages] of (results as any)) {
          const symbol = streamKey.replace('stream:market:ticks:', '');
          for (const message of messages) {
            const [messageId, fields] = message;
            
            // Parse fields
            const tick: Record<string, any> = {};
            for (let i = 0; i < fields.length; i += 2) {
              tick[fields[i]] = fields[i + 1];
            }
            
            // Process the tick through 12-Gate Confluence (placeholder for actual sentinel logic)
            const passed = Math.random() > 0.999; // Extremely rare setup
            
            if (passed) {
              const signalEntryPrice = parseFloat(tick.ask);
              console.log(`[Tick Consumer] 🚀 Confluence verified on ${symbol}! Emitting signal @ ${signalEntryPrice}`);
              
              // Publish to generated signals stream
              await redis.xadd(
                'stream:signals:generated',
                'MAXLEN', '~', 1000,
                '*',
                'symbol', symbol,
                'direction', 'BUY',
                'entryPrice', signalEntryPrice.toString(),
                'timestamp', Date.now().toString()
              );

              // We'd fan this out to all subscribed broker accounts in reality
              // Example hardcoded dispatch:
              await orderQueue.add('execute-trade', {
                accountId: '5054250143', // Example account
                symbol,
                direction: 'BUY',
                signalEntryPrice,
                stopLoss: signalEntryPrice - 0.0030,
                takeProfit: signalEntryPrice + 0.0060,
                maxSlippagePips: 2.5,
                signalCreatedAt: Date.now(),
                ttlMs: 5000
              });
            }

            // Acknowledge the message so it's not re-delivered
            await redis.xack(streamKey, STREAM_GROUP, messageId);
          }
        }
      }
    } catch (err: any) {
      console.error('[Tick Consumer] Error reading stream:', err.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// Automatically start if run directly (useful for testing)
if (require.main === module) {
  startTickConsumer().catch(console.error);
}
