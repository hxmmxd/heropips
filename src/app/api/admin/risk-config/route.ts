/**
 * Admin Risk Configuration API — /api/admin/risk-config
 *
 * GET  — Fetch current risk governor configuration
 * PATCH — Update risk governor configuration
 *
 * Manages all configurable parameters for Gates 13–15, Sentinel,
 * Break-Even migration, Daily Reset, and Streak thresholds.
 * Changes are persisted to `platform_config` table and audit logged.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

let _admin: any = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

// ── Default configuration ──
// These are the hardcoded defaults from riskGovernor.ts
// Admin can override them via platform_config table
const DEFAULT_CONFIG = {
  // Gate 14: Daily Circuit Breaker
  daily_caution_pct: 3.0,        // Daily loss % to enter CAUTION tier
  daily_warning_pct: 4.5,        // Daily loss % to enter WARNING tier
  daily_terminal_pct: 6.0,       // Daily loss % to trigger TERMINAL (liquidation)

  // Gate 15: Drawdown Governor
  dd_yellow_pct: 8.0,            // Drawdown % for YELLOW zone
  dd_orange_pct: 15.0,           // Drawdown % for ORANGE zone
  dd_red_pct: 20.0,              // Drawdown % for RED zone
  dd_black_pct: 25.0,            // Drawdown % for BLACK zone (shutdown)

  // Streak Management
  streak_halt_threshold: 6,       // # consecutive losses to trigger cooldown
  streak_cooldown_hours: 4,       // Hours of cooldown after streak halt

  // Sentinel
  sentinel_heartbeat_ms: 10000,   // Heartbeat interval in milliseconds
  sentinel_max_failures: 5,       // Auto-stop after N consecutive MT5 failures
  sentinel_enabled: true,         // Master enable/disable

  // Break-Even Migration
  be_migration_enabled: true,     // Auto-move SL to break-even after 1R profit
  be_migration_buffer_pips: 0.5,  // Buffer above entry for BE stop

  // Portfolio Heat
  max_portfolio_heat_pct: 4.0,    // Max total portfolio risk %
  single_trade_risk_pct: 2.0,     // Default per-trade risk %

  // Trade Limits (per drawdown zone)
  max_trades_green: 99,           // Max trades/day in GREEN zone
  max_trades_yellow: 3,           // Max trades/day in YELLOW zone
  max_trades_orange: 1,           // Max trades/day in ORANGE zone
  max_trades_red: 1,              // Max trades/day in RED zone

  // Daily Reset
  daily_reset_hour_utc: 0,       // Hour in UTC for daily reset cron
  daily_report_enabled: true,     // Generate daily risk report

  // Notifications (future)
  telegram_alerts_enabled: false,
  telegram_bot_token: '',
  telegram_chat_id: '',
  sms_alerts_enabled: false,
  alert_on_zone_change: true,
  alert_on_streak_warning: true,
  alert_on_kill_switch: true,
};

type RiskConfigKey = keyof typeof DEFAULT_CONFIG;

// Admin auth check helper
async function verifyAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: 'Unauthorized' };

  const admin = getAdmin();
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return { user: null, error: 'Forbidden' };
  return { user, error: null };
}

// ── GET: Fetch current risk configuration ──
export async function GET() {
  const { user, error } = await verifyAdmin();
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: error === 'Forbidden' ? 403 : 401 });
  }

  const admin = getAdmin();

  // Fetch all risk config keys from platform_config
  const { data: configRows } = await admin
    .from('platform_config')
    .select('key, value')
    .like('key', 'risk_%');

  // Merge DB values over defaults
  const config = { ...DEFAULT_CONFIG };
  if (configRows) {
    for (const row of configRows) {
      const cleanKey = row.key.replace('risk_', '') as RiskConfigKey;
      if (cleanKey in config) {
        const defaultValue = config[cleanKey];
        if (typeof defaultValue === 'boolean') {
          (config as any)[cleanKey] = row.value === 'true' || row.value === true;
        } else if (typeof defaultValue === 'number') {
          (config as any)[cleanKey] = Number(row.value);
        } else {
          (config as any)[cleanKey] = row.value;
        }
      }
    }
  }

  // Fetch sentinel status from database
  let sentinelStatus = null;
  try {
    const { data } = await admin
      .from('platform_config')
      .select('value')
      .eq('key', 'sentinel_worker_status')
      .maybeSingle();
    sentinelStatus = data?.value || { running: false, statusMessage: 'Worker offline' };
  } catch {}

  // Fetch latest risk state for each active account
  const { data: riskStates } = await admin
    .from('portfolio_risk_states')
    .select('account_id, current_equity, peak_equity, daily_loss_pct, drawdown_pct, consecutive_losses, daily_tier, drawdown_zone, ecp_status, last_updated')
    .order('last_updated', { ascending: false })
    .limit(10);

  // Fetch latest daily reports
  const { data: dailyReports } = await admin
    .from('daily_risk_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(7);

  return NextResponse.json({
    config,
    defaults: DEFAULT_CONFIG,
    sentinel: sentinelStatus,
    riskStates: riskStates || [],
    dailyReports: dailyReports || [],
  });
}

// ── PATCH: Update risk configuration ──
export async function PATCH(request: Request) {
  const { user, error } = await verifyAdmin();
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: error === 'Forbidden' ? 403 : 401 });
  }

  const body = await request.json();
  const admin = getAdmin();
  const updatedKeys: string[] = [];

  // Validate and save each config key
  for (const [key, value] of Object.entries(body)) {
    if (!(key in DEFAULT_CONFIG)) continue;

    // Type validation
    const defaultValue = DEFAULT_CONFIG[key as RiskConfigKey];
    if (typeof defaultValue === 'number' && typeof value !== 'number') continue;
    if (typeof defaultValue === 'boolean' && typeof value !== 'boolean') continue;

    // Persist to platform_config with risk_ prefix
    const dbKey = `risk_${key}`;
    await admin
      .from('platform_config')
      .upsert({
        key: dbKey,
        value: String(value),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    updatedKeys.push(key);
  }

  // Audit log
  if (updatedKeys.length > 0) {
    await admin.from('audit_log').insert({
      admin_id: user.id,
      action: 'risk_config_updated',
      target_type: 'risk_config',
      details: { keys: updatedKeys, values: body },
    });
  }

  // Handle sentinel control actions via desired state DB flag
  if (body._sentinel_action) {
    try {
      const running = body._sentinel_action === 'start';
      await admin
        .from('platform_config')
        .upsert({
          key: 'sentinel_active_state',
          value: {
            running,
            accountId: body._sentinel_account_id || '',
            userId: user.id,
            updatedAt: new Date().toISOString(),
          }
        });
      updatedKeys.push(running ? 'sentinel_started' : 'sentinel_stopped');
    } catch (err: any) {
      console.error('[RiskConfig] Sentinel DB action error:', err.message);
    }
  }

  // Handle manual risk state reset
  if (body._reset_risk_state && body._reset_account_id) {
    const { getRiskState, saveRiskState, performDailyReset } = await import('@/lib/riskGovernor');
    const state = await getRiskState(body._reset_account_id);
    if (state) {
      const resetState = performDailyReset(state, state.currentEquity, state.currentEquity);
      // Also reset streak if requested
      if (body._reset_streak) {
        resetState.consecutiveLosses = 0;
        resetState.consecutiveWins = 0;
      }
      await saveRiskState(resetState);
      updatedKeys.push('risk_state_reset');
      await admin.from('audit_log').insert({
        admin_id: user.id,
        action: 'risk_state_manual_reset',
        target_type: 'risk_state',
        target_id: body._reset_account_id,
        details: { resetStreak: body._reset_streak || false },
      });
    }
  }

  return NextResponse.json({
    success: true,
    updated: updatedKeys,
    timestamp: new Date().toISOString(),
  });
}
