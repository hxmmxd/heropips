import fs from 'fs';
import path from 'path';

// 1. Synchronously load env first before any other imports to ensure credentials are ready
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
  console.log('[Sentinel Worker] Loaded environment variables from .env.local');
}

import { createClient } from '@supabase/supabase-js';
import { heartbeat, getSentinelStatus, startSentinel, stopSentinel } from '../src/lib/sentinel';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('[Sentinel Worker] 🟢 Sentinel background daemon initialized.');

  while (true) {
    try {
      // ── 24/7 Background Multi-Bot Matrix Execution Loop ──
      const lastBotRun = (global as any)._lastAutoTradeRunTime || 0;
      const nowMs = Date.now();
      // Run auto-trade check every 60 seconds autonomously on backend
      if (nowMs - lastBotRun >= 55000) {
        (global as any)._lastAutoTradeRunTime = nowMs;
        try {
          const port = process.env.PORT || 3000;
          const cronSecret = process.env.CRON_SECRET || '';
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          if (cronSecret) {
            headers['Authorization'] = `Bearer ${cronSecret}`;
          }

          let res = await fetch(`http://127.0.0.1:${port}/api/admin/auto-trade`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'trigger_all', daemon: true })
          }).catch(() => null);

          if (!res || !res.ok) {
            res = await fetch(`http://localhost:${port}/api/admin/auto-trade`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ action: 'trigger_all', daemon: true })
            }).catch(() => null);
          }

          if (res && res.ok) {
            const data = await res.json();
            console.log('[Sentinel Worker] 🤖 Auto-Trader background cycle executed:', data.results?.length ?? 0, 'bots evaluated.');
          } else {
            console.warn('[Sentinel Worker] Auto-trader cycle returned status:', res?.status ?? 'No response');
          }
        } catch (botErr: any) {
          console.warn('[Sentinel Worker] Auto-trader cycle call error:', botErr.message);
        }
      }

    } catch (err: any) {
      console.error('[Sentinel Worker] Loop execution error:', err.message);
    }

    // Sleep for 10 seconds before the next loop iteration
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

main().catch(err => {
  console.error('[Sentinel Worker] 🛑 Fatal crash:', err);
  process.exit(1);
});
