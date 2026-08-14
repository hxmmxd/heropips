import { redis } from '../redis';
import { createClient } from '@supabase/supabase-js';

const STREAM_GROUP = 'telemetry-sink-group';
const CONSUMER_NAME = 'sink-worker-1';
const BATCH_SIZE = 50;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function startTelemetrySink() {
  console.log('[Telemetry Sink] 🟢 Starting async Supabase telemetry sink worker');

  const streamName = 'stream:signals:generated';

  try {
    await redis.xgroup('CREATE', streamName, STREAM_GROUP, '$', 'MKSTREAM');
  } catch (err: any) {
    if (!err.message.includes('BUSYGROUP')) {
      console.error(`[Telemetry Sink] Failed to create group:`, err.message);
    }
  }

  while (true) {
    try {
      const results = await redis.xreadgroup(
        'GROUP', STREAM_GROUP, CONSUMER_NAME,
        'BLOCK', 5000,
        'COUNT', BATCH_SIZE,
        'STREAMS', streamName, '>'
      );

      if (results) {
        for (const [streamKey, messages] of (results as any)) {
          const insertPayloads = [];
          const messageIds = [];

          for (const message of messages) {
            const [messageId, fields] = message;
            const data: Record<string, any> = {};
            for (let i = 0; i < fields.length; i += 2) {
              data[fields[i]] = fields[i + 1];
            }

            insertPayloads.push({
              symbol: data.symbol,
              direction: data.direction,
              entry_price: parseFloat(data.entryPrice),
              created_at: new Date(parseInt(data.timestamp)).toISOString(),
              status: 'generated'
            });
            messageIds.push(messageId);
          }

          if (insertPayloads.length > 0) {
            // Bulk insert to Supabase
            const { error } = await supabase.from('signals').insert(insertPayloads);
            
            if (error) {
              console.error(`[Telemetry Sink] ❌ Supabase insert failed:`, error.message);
              // Retry logic or push to DLQ could go here
            } else {
              console.log(`[Telemetry Sink] ✅ Flushed ${insertPayloads.length} signals to Supabase`);
              // Acknowledge processed messages
              if (messageIds.length > 0) {
                await redis.xack(streamKey, STREAM_GROUP, ...messageIds);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[Telemetry Sink] Error reading stream:', err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

if (require.main === module) {
  startTelemetrySink().catch(console.error);
}
