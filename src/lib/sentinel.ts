/**
 * Sentinel — Real-time Risk Monitoring Heartbeat
 *
 * Polls MT5 account info every 10 seconds and:
 *  1. Updates portfolio_risk_states with live equity/balance
 *  2. Evaluates Gates 13–15 in real-time
 *  3. Enforces kill switch (close all) if TERMINAL/BLACK
 *  4. Auto-migrates SL to break-even after 1R profit
 *  5. Detects position closures for streak tracking
 *
 * Runs as a singleton setInterval inside the Next.js process.
 * Use startSentinel() / stopSentinel() to control.
 */

import {
  farmGetAccountInfo,
  farmGetPositions,
  farmCloseAllPositions,
  farmModifyPosition,
  type AccountInfo,
  type FarmPosition,
} from './mt5farm';
import {
  getRiskState,
  saveRiskState,
  createInitialRiskState,
  updateRiskMetrics,
  evaluateAllRiskGates,
  updateEquityCurve,
  generateDailyReport,
  type RiskState,
} from './riskGovernor';
import {
  alertZoneTransition,
  alertKillSwitch,
  alertStreakWarning,
  alertBEMigration,
  alertFlashDrop,
} from './notifier';

// ── Configuration ────────────────────────────────────────────

const HEARTBEAT_MS        = 10_000; // 10 seconds
const MAX_FAILURES        = 5;      // Stop after 5 consecutive MT5 failures
const BE_MIGRATION_BUFFER = 0.5;    // 0.5 pip buffer above entry for BE stop

// ── Sentinel State (globalThis singleton for HMR survival) ──

interface SentinelState {
  running: boolean;
  intervalId: ReturnType<typeof setInterval> | null;
  accountId: string | null;
  userId: string | null;
  lastHeartbeat: string | null;
  lastEquity: number;
  lastBalance: number;
  consecutiveFailures: number;
  tickCount: number;
  previousPositionIds: Set<string>;
  previousPositions: Map<string, FarmPosition>;
  lastZone: string;
  lastDailyTier: string;
  beMigratedPositions: Set<string>; // Positions already moved to BE
  startedAt: string | null;
  equityRingBuffer: { time: number; equity: number }[]; // 60s rolling window for flash detection
}

const SENTINEL_KEY = '__sentinel_state__';

function getState(): SentinelState {
  if (!(globalThis as any)[SENTINEL_KEY]) {
    (globalThis as any)[SENTINEL_KEY] = {
      running: false,
      intervalId: null,
      accountId: null,
      userId: null,
      lastHeartbeat: null,
      lastEquity: 0,
      lastBalance: 0,
      consecutiveFailures: 0,
      tickCount: 0,
      previousPositionIds: new Set(),
      previousPositions: new Map(),
      lastZone: 'GREEN',
      lastDailyTier: 'NORMAL',
      beMigratedPositions: new Set(),
      startedAt: null,
      equityRingBuffer: [],
    };
  }
  return (globalThis as any)[SENTINEL_KEY];
}

// Alias for convenience
const state = getState();

// ── Public API ───────────────────────────────────────────────

export function startSentinel(accountId: string, userId: string): boolean {
  if (state.running) {
    console.log(`[Sentinel] Already running for account ${state.accountId}`);
    return false;
  }

  state.accountId = accountId;
  state.userId = userId;
  state.running = true;
  state.consecutiveFailures = 0;
  state.tickCount = 0;
  state.startedAt = new Date().toISOString();
  state.previousPositionIds = new Set();
  state.previousPositions = new Map();
  state.beMigratedPositions = new Set();

  console.log(`[Sentinel] 🟢 Initializing watchdog state for account ${accountId}`);

  // Persist Sentinel config to database for auto-waking on boot/server restart
  persistSentinelConfig(accountId, userId, true).catch(() => {});

  // Seed EMA/SMA from historical data (fire-and-forget)
  seedEquityCurve(accountId).catch(err =>
    console.warn('[Sentinel] Seed equity curve failed (non-fatal):', err.message)
  );

  return true;
}

/**
 * Seed EMA₂₀ and SMA₅₀ from historical daily_snapshots.
 * Called once on sentinel startup so Gate 13 has meaningful data immediately
 * instead of defaulting to GREEN for the first 50+ ticks.
 */
async function seedEquityCurve(accountId: string): Promise<void> {
  const riskState = await getRiskState(accountId);
  if (!riskState) return;

  // Already seeded — skip
  if (riskState.equityEma20 !== null && riskState.equitySma50 !== null) {
    console.log('[Sentinel] EMA/SMA already seeded — skipping');
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const admin = createClient(url, key);

  // Try daily_snapshots first (one point per day, up to 90 days)
  const { data: snapshots } = await admin
    .from('daily_snapshots')
    .select('equity')
    .eq('user_id', riskState.userId)
    .order('date', { ascending: true })
    .limit(100);

  let equityHistory: number[] = [];

  if (snapshots && snapshots.length >= 5) {
    equityHistory = snapshots.map((s: any) => Number(s.equity)).filter((e: number) => e > 0);
  }

  // If not enough snapshots, try building from closed_deals
  if (equityHistory.length < 5) {
    const { data: deals } = await admin
      .from('closed_deals')
      .select('profit')
      .eq('user_id', riskState.userId)
      .order('close_time', { ascending: true })
      .limit(200);

    if (deals && deals.length >= 5) {
      // Reconstruct equity curve from trade profits
      const startEquity = riskState.currentEquity - deals.reduce((a: number, d: any) => a + (d.profit || 0), 0);
      let cumEquity = startEquity;
      equityHistory = deals.map((d: any) => {
        cumEquity += (d.profit || 0);
        return cumEquity;
      });
    }
  }

  if (equityHistory.length < 5) {
    console.log(`[Sentinel] Only ${equityHistory.length} equity points — not enough to seed (need ≥5)`);
    return;
  }

  // Compute EMA₂₀ and SMA₅₀
  const updated = updateEquityCurve(riskState, equityHistory);
  await saveRiskState(updated);

  console.log(
    `[Sentinel] 📊 Seeded equity curve from ${equityHistory.length} data points: ` +
    `EMA₂₀=${updated.equityEma20}, SMA₅₀=${updated.equitySma50 ?? 'null (need ≥50)'}`
  );
}

export function stopSentinel(): void {
  state.running = false;

  const acct = state.accountId;
  const user = state.userId;
  if (acct) {
    persistSentinelConfig(acct, user || 'system', false).catch(() => {});
  }

  console.log(`[Sentinel] 🔴 Stopped (ran ${state.tickCount} ticks)`);
}

export function getSentinelStatus(): {
  running: boolean;
  accountId: string | null;
  lastHeartbeat: string | null;
  lastEquity: number;
  lastBalance: number;
  tickCount: number;
  consecutiveFailures: number;
  lastZone: string;
  lastDailyTier: string;
  startedAt: string | null;
  openPositions: number;
  beMigrated: number;
} {
  return {
    running: state.running,
    accountId: state.accountId,
    lastHeartbeat: state.lastHeartbeat,
    lastEquity: state.lastEquity,
    lastBalance: state.lastBalance,
    tickCount: state.tickCount,
    consecutiveFailures: state.consecutiveFailures,
    lastZone: state.lastZone,
    lastDailyTier: state.lastDailyTier,
    startedAt: state.startedAt,
    openPositions: state.previousPositionIds.size,
    beMigrated: state.beMigratedPositions.size,
  };
}

export function isSentinelRunning(): boolean {
  return state.running;
}

// ── Heartbeat (main tick) ────────────────────────────────────

export async function heartbeat(): Promise<void> {
  if (!state.accountId || !state.running) return;
  state.tickCount++;

  try {
    // ── 1. Fetch live account info from MT5 ──
    const info = await farmGetAccountInfo(state.accountId);
    if (!info) {
      state.consecutiveFailures++;
      if (state.consecutiveFailures >= MAX_FAILURES) {
        console.warn(`[Sentinel] ⚠️ ${MAX_FAILURES} consecutive failures — auto-pausing`);
        stopSentinel();
      }
      return;
    }

    // Reset failure counter on success
    state.consecutiveFailures = 0;
    state.lastHeartbeat = new Date().toISOString();
    state.lastEquity = info.equity;
    state.lastBalance = info.balance;

    // ── 2. Load or create risk state ──
    const liveEquity = info.equity ?? info.balance ?? 0;
    const liveBalance = info.balance ?? 0;

    let riskState = await getRiskState(state.accountId);
    if (!riskState) {
      riskState = createInitialRiskState(
        state.accountId,
        state.userId || 'system',
        liveEquity,
        liveBalance
      );
      await saveRiskState(riskState);
      console.log(`[Sentinel] Created initial risk state — equity $${liveEquity.toFixed(2)}`);
    }

    // ── 3. Update risk metrics with live data ──
    const updated = updateRiskMetrics(riskState, liveEquity, liveBalance);

    // ── 4. Detect zone transitions ──
    if (updated.drawdownZone !== state.lastZone) {
      console.log(`[Sentinel] 🔔 Drawdown zone transition: ${state.lastZone} → ${updated.drawdownZone}`);
      alertZoneTransition(
        state.accountId, 'Gate 15 Drawdown',
        state.lastZone, updated.drawdownZone,
        liveEquity, updated.drawdownPct
      );
      state.lastZone = updated.drawdownZone;
    }
    if (updated.dailyTier !== state.lastDailyTier) {
      console.log(`[Sentinel] 🔔 Daily tier transition: ${state.lastDailyTier} → ${updated.dailyTier}`);
      alertZoneTransition(
        state.accountId, 'Gate 14 Daily Loss',
        state.lastDailyTier, updated.dailyTier,
        liveEquity, updated.dailyLossPct
      );
      state.lastDailyTier = updated.dailyTier;
    }

    // ── Flash equity drop detection (>2% in 60 seconds) ──
    const now = Date.now();
    state.equityRingBuffer.push({ time: now, equity: liveEquity });
    // Remove entries older than 60 seconds
    state.equityRingBuffer = state.equityRingBuffer.filter(e => now - e.time <= 60_000);
    if (state.equityRingBuffer.length >= 2) {
      const oldest = state.equityRingBuffer[0];
      if (oldest.equity > 0) {
        const dropPct = ((oldest.equity - liveEquity) / oldest.equity) * 100;
        if (dropPct >= 2.0) {
          alertFlashDrop(state.accountId, dropPct, liveEquity);
        }
      }
    }

    // ── 5. Evaluate risk gates ──
    const { multipliers } = evaluateAllRiskGates(updated);

    // ── 6. KILL SWITCH — Terminal events ──
    if (multipliers.shouldLiquidate) {
      console.error(`[Sentinel] 🚨🚨🚨 KILL SWITCH ACTIVATED — ${multipliers.riskSummary}`);
      console.error(`[Sentinel] Closing ALL positions for account ${state.accountId}`);
      alertKillSwitch(state.accountId, multipliers.riskSummary, liveEquity);
      try {
        const result = await farmCloseAllPositions(state.accountId);
        console.error(`[Sentinel] Kill switch result:`, result);
      } catch (killErr: any) {
        console.error(`[Sentinel] Kill switch FAILED:`, killErr.message);
      }
    }

    // ── 7. Persist updated risk state ──
    await saveRiskState(updated);

    // ── 8. Position monitoring ──
    const positions = await farmGetPositions(state.accountId);
    const currentIds = new Set(positions.map(p => p.id));

    // Detect closed positions (was in previous set, not in current)
    await detectClosedPositions(currentIds, positions, updated);

    // Break-even migration
    await breakEvenMigration(positions, info);

    // Update position tracking
    state.previousPositionIds = currentIds;
    state.previousPositions = new Map(positions.map(p => [p.id, p]));

    // Clean up BE tracking for positions that no longer exist
    for (const beId of state.beMigratedPositions) {
      if (!currentIds.has(beId)) {
        state.beMigratedPositions.delete(beId);
      }
    }

    // ── 9. Periodic logging (every 6 ticks = ~60 seconds) ──
    if (state.tickCount % 6 === 0) {
      console.log(
        `[Sentinel] ♥ Tick #${state.tickCount} | ` +
        `Equity: $${liveEquity.toFixed(2)} | ` +
        `Daily: ${updated.dailyLossPct.toFixed(2)}% (${updated.dailyTier}) | ` +
        `DD: ${updated.drawdownPct.toFixed(2)}% (${updated.drawdownZone}) | ` +
        `Positions: ${positions.length} | ` +
        `Mult: ${(multipliers.combinedMultiplier * 100).toFixed(0)}%`
      );
    }

  } catch (err: any) {
    state.consecutiveFailures++;
    console.error(`[Sentinel] Tick #${state.tickCount} error:`, err.message);
    if (state.consecutiveFailures >= MAX_FAILURES) {
      console.warn(`[Sentinel] ⚠️ ${MAX_FAILURES} consecutive failures — auto-pausing`);
      stopSentinel();
    }
  }
}

// ── Closed Position Detection ────────────────────────────────

async function detectClosedPositions(
  currentIds: Set<string>,
  _currentPositions: FarmPosition[],
  riskState: RiskState
): Promise<void> {
  if (state.previousPositionIds.size === 0) return; // First tick — skip

  const closedIds: string[] = [];
  for (const prevId of state.previousPositionIds) {
    if (!currentIds.has(prevId)) {
      closedIds.push(prevId);
    }
  }

  if (closedIds.length === 0) return;

  console.log(`[Sentinel] 📊 Detected ${closedIds.length} closed position(s): ${closedIds.join(', ')}`);

  // For each closed position, log the event (streaks/curves are updated via sync-deals cron)
  for (const closedId of closedIds) {
    const prevPos = state.previousPositions.get(closedId);
    if (!prevPos) continue;

    const isWin = prevPos.profit > 0;
    const emoji = isWin ? '✅' : '❌';
    console.log(
      `[Sentinel] ${emoji} Position closed: ${prevPos.symbol} ${prevPos.type === 'POSITION_TYPE_BUY' ? 'BUY' : 'SELL'} ` +
      `Est. P&L: $${prevPos.profit.toFixed(2)} (Streak/Risk curves will be updated via sync-deals cron)`
    );
  }
}

// ── Break-Even Migration ─────────────────────────────────────

async function breakEvenMigration(
  positions: FarmPosition[],
  accountInfo: AccountInfo
): Promise<void> {
  if (!state.accountId) return;

  for (const pos of positions) {
    // Skip if already migrated
    if (state.beMigratedPositions.has(pos.id)) continue;

    // Need both SL and profit data
    const hasSL = (pos as any).stopLoss && (pos as any).stopLoss > 0;
    if (!hasSL) continue;

    const stopLoss = (pos as any).stopLoss as number;
    const entry = pos.openPrice;
    const isBuy = pos.type === 'POSITION_TYPE_BUY';

    // Calculate 1R distance
    const slDistance = Math.abs(entry - stopLoss);
    if (slDistance <= 0) continue;

    // Check if SL is already at or past break-even
    if (isBuy && stopLoss >= entry) continue;
    if (!isBuy && stopLoss <= entry) continue;

    // Check if profit >= 1R (in price terms)
    const currentPriceDistance = isBuy
      ? pos.currentPrice - entry
      : entry - pos.currentPrice;

    if (currentPriceDistance < slDistance) continue; // Not yet 1R

    // ✅ 1R reached — move SL to break-even + buffer
    const newSL = isBuy
      ? entry + BE_MIGRATION_BUFFER
      : entry - BE_MIGRATION_BUFFER;

    try {
      await farmModifyPosition(state.accountId, pos.id, { stopLoss: newSL });
      state.beMigratedPositions.add(pos.id);
      console.log(
        `[Sentinel] ✅ BE migration: ${pos.symbol} ${isBuy ? 'BUY' : 'SELL'} @ ${entry.toFixed(pos.symbol.includes('JPY') ? 3 : 5)} → ` +
        `SL moved from ${stopLoss.toFixed(pos.symbol.includes('JPY') ? 3 : 5)} to ${newSL.toFixed(pos.symbol.includes('JPY') ? 3 : 5)} (1R reached)`
      );
    } catch (err: any) {
      console.warn(`[Sentinel] BE migration failed for ${pos.symbol}:`, err.message);
    }
  }
}

/**
 * Persist active Sentinel status to platform_config so it can auto-wake after server recycles.
 */
async function persistSentinelConfig(accountId: string, userId: string, running: boolean) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await sb
      .from('platform_config')
      .upsert({
        key: 'sentinel_active_state',
        value: { running, accountId, userId, updatedAt: new Date().toISOString() }
      });
  } catch (err: any) {
    console.error('[Sentinel] Failed to persist Sentinel config:', err.message);
  }
}

/**
 * Auto-wake Sentinel watchdog if registered as active in platform_config database.
 */
export async function autoWakeSentinel() {
  if (isSentinelRunning()) return;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await sb
      .from('platform_config')
      .select('value')
      .eq('key', 'sentinel_active_state')
      .maybeSingle();

    if (data && data.value && (data.value as any).running) {
      const { accountId, userId } = data.value as any;
      console.log(`[Sentinel Boot] 🔄 Auto-waking Sentinel watchdog for account ${accountId}...`);
      startSentinel(accountId, userId || 'system');
    }
  } catch (err: any) {
    console.error('[Sentinel Boot] Auto-wake failed:', err.message);
  }
}

