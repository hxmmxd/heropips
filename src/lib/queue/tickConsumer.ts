import fs from 'fs';
import path from 'path';

// Synchronously load env first before any other imports to ensure credentials are ready
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const firstEqual = trimmed.indexOf('=');
      if (firstEqual > 0) {
        const key = trimmed.slice(0, firstEqual).trim();
        const val = trimmed.slice(firstEqual + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

import { redis } from '../redis';
import { orderQueue } from './orderQueue';
import { FARM_BASE, FARM_HEADERS, sidecarUrl, resolveAccountId } from '../mt5farm';
import { getMarketSnapshot } from '../market';
import { createClient } from '@supabase/supabase-js';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  
  for (const rawAccountId of MASTER_ACCOUNTS) {
    for (const symbol of symbols) {
      try {
        const accountId = await resolveAccountId(rawAccountId);
        const url = sidecarUrl(accountId, 'stream/subscribe');
        console.log(`[Tick Consumer] Debug: fetching url = ${url}`);
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
        console.error(`[Tick Consumer] ❌ Network error subscribing ${symbol} on master ${rawAccountId}:`, err.message);
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
            
            // Process the tick through 12-Gate Confluence
            const snapshot = await getMarketSnapshot(symbol);
            const passed = snapshot?.signalOutcome === 'SIGNAL';
            
            if (passed && snapshot) {
              const signalEntryPrice = snapshot.confluenceDirection === 'BUY' ? parseFloat(tick.ask) : parseFloat(tick.bid);
              console.log(`[Tick Consumer] 🚀 Confluence verified on ${symbol}! Emitting signal @ ${signalEntryPrice}`);
              
              // Publish to generated signals stream
              await redis.xadd(
                'stream:signals:generated',
                'MAXLEN', '~', 1000,
                '*',
                'symbol', symbol || '',
                'masterAccountId', accountId || '',
                'direction', snapshot.confluenceDirection,
                'entryPrice', signalEntryPrice.toString(),
                'timestamp', Date.now().toString()
              );

              // Supabase Fan-Out Dispatch
              try {
                // Fetch ALL active broker accounts to fan-out the trade to everyone
                const { data: activeAccounts, error: accountsErr } = await supabase
                  .from('broker_accounts')
                  .select('mt5_login, user_id, equity, balance')
                  .eq('is_active', true);
                  
                if (accountsErr) throw accountsErr;
                
                if (activeAccounts && activeAccounts.length > 0) {
                  console.log(`[Tick Consumer] 🌐 Fanning out ${snapshot.confluenceDirection} execution to ${activeAccounts.length} global accounts.`);
                  
                  for (const account of activeAccounts) {
                    await orderQueue.add('execute-trade', {
                      accountId: account.mt5_login, // Use mt5_login as the accountId
                      symbol,
                      direction: snapshot.confluenceDirection as 'BUY'|'SELL',
                      signalEntryPrice,
                      // Note: Risk engine will dynamically calculate SL/TP during dispatch
                      stopLoss: snapshot.confluenceDirection === 'BUY' ? signalEntryPrice - 0.0030 : signalEntryPrice + 0.0030,
                      takeProfit: snapshot.confluenceDirection === 'BUY' ? signalEntryPrice + 0.0060 : signalEntryPrice - 0.0060,
                      maxSlippagePips: 2.5,
                      signalCreatedAt: Date.now(),
                      ttlMs: 5000,
                      masterAccountId: accountId
                    });
                  }
                } else {
                  console.log(`[Tick Consumer] ℹ️ No active global broker accounts found for ${symbol}.`);
                }
              } catch (err: any) {
                console.error(`[Tick Consumer] ❌ Supabase fan-out dispatch failed:`, err.message);
              }
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
