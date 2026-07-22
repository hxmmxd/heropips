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
      // Query desired state from Supabase platform_config
      const { data, error } = await sb
        .from('platform_config')
        .select('value')
        .eq('key', 'sentinel_active_state')
        .maybeSingle();

      if (error) {
        console.error('[Sentinel Worker] Database query error:', error.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      const desired = data?.value as { running: boolean; accountId: string; userId: string } | null;

      if (desired && desired.running) {
        const status = getSentinelStatus();

        // If not running in-memory or account has changed, restart in-memory
        if (!status.running || status.accountId !== desired.accountId) {
          console.log(`[Sentinel Worker] 🔄 Activating sentinel: account ${desired.accountId}`);
          if (status.running) {
            stopSentinel();
          }
          startSentinel(desired.accountId, desired.userId);
        }

        // Run a single heartbeat tick cycle
        await heartbeat();

        // Update database with actual worker status and stats
        const updatedStatus = getSentinelStatus();
        await sb
          .from('platform_config')
          .upsert({
            key: 'sentinel_worker_status',
            value: {
              ...updatedStatus,
              lastCheckedAt: new Date().toISOString(),
              workerPid: process.pid,
              statusMessage: 'Worker is running normally'
            }
          });

      } else {
        // Desired state is inactive / stopped
        const status = getSentinelStatus();
        if (status.running) {
          console.log('[Sentinel Worker] 🔴 Stopping sentinel (deactivation requested by configuration)');
          stopSentinel();
        }

        // Update database with stopped status
        const updatedStatus = getSentinelStatus();
        await sb
          .from('platform_config')
          .upsert({
            key: 'sentinel_worker_status',
            value: {
              ...updatedStatus,
              lastCheckedAt: new Date().toISOString(),
              workerPid: process.pid,
              statusMessage: 'Worker is idle'
            }
          });
      }

      // ── 24/7 Background Multi-Bot Matrix Execution Loop ──
      const lastBotRun = (global as any)._lastAutoTradeRunTime || 0;
      const nowMs = Date.now();
      // Run auto-trade check every 60 seconds autonomously on backend
      if (nowMs - lastBotRun >= 60000) {
        (global as any)._lastAutoTradeRunTime = nowMs;
        try {
          const res = await fetch('http://localhost:3000/api/admin/auto-trade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'trigger_all', daemon: true })
          });
          if (res.ok) {
            const data = await res.json();
            console.log('[Sentinel Worker] 🤖 Auto-Trader background cycle executed:', data.executedCount ?? 0, 'bots evaluated.');
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
