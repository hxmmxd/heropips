import { redis } from '../redis';
import { orderQueue } from './orderQueue';
import { FARM_BASE, FARM_HEADERS } from '../mt5farm';

const STREAM_GROUP = 'sentinel-group';
const CONSUMER_NAME = 'sentinel-worker-1';

// We track streams by accountId and symbol
const symbols = ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD'];
const MASTER_ACCOUNTS = process.env.MASTER_ACCOUNT_IDS ? process.env.MASTER_ACCOUNT_IDS.split(',') : ['MASTER_VANTAGE_1'];

const streams: string[] = [];
for (const acc of MASTER_ACCOUNTS) {
  for (const sym of symbols) {
    streams.push(`stream:market:ticks:${acc}:${sym}`);
  }
}
const ids = streams.map(() => '>'); // > means fetch new messages

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

  // Master Price Oracle Subscription
  console.log(`[Tick Consumer] 📡 Subscribing Master Feeds: ${MASTER_ACCOUNTS.join(', ')}`);
  
  for (const accountId of MASTER_ACCOUNTS) {
    for (const symbol of symbols) {
      try {
        const url = `${FARM_BASE}/users/current/accounts/${accountId}/stream/subscribe`;
        const res = await fetch(url, {
          method: 'POST',
          headers: FARM_HEADERS,
          body: JSON.stringify({ symbol })
        });
        if (!res.ok) {
          console.warn(`[Tick Consumer] ⚠️ Failed to subscribe ${symbol} on master ${accountId}: ${res.status}`);
        } else {
          console.log(`[Tick Consumer] ✅ Subscribed master ${accountId} to ${symbol}`);
        }
      } catch (err: any) {
        console.error(`[Tick Consumer] ❌ Network error subscribing ${symbol} on master ${accountId}:`, err.message);
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
          // Extract symbol and account from streamKey (e.g. stream:market:ticks:MASTER_VANTAGE_1:XAUUSD)
          const parts = streamKey.split(':');
          const symbol = parts.pop();
          const accountId = parts.pop();
          
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
                'symbol', symbol || '',
                'masterAccountId', accountId || '',
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
