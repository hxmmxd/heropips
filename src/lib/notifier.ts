/**
 * Notifier — Unified Alert Dispatch System
 *
 * Sends real-time alerts via Telegram Bot API when risk events occur.
 * Rate-limited to prevent spam during rapid zone oscillation.
 *
 * Usage:
 *   import { sendAlert, AlertSeverity } from '@/lib/notifier';
 *   await sendAlert('zone_change', 'WARNING', 'Drawdown zone: GREEN → YELLOW (8.2%)');
 */

// ── Types ────────────────────────────────────────────────────

export type AlertSeverity = 'INFO' | 'WARNING' | 'URGENT' | 'CRITICAL' | 'EMERGENCY';

export interface AlertPayload {
  eventType: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Record<string, any>;
  accountId?: string;
}

// ── Rate Limiter (per event type, 5-minute window) ──────────

const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const lastAlertTimes = new Map<string, number>();

function isRateLimited(eventKey: string): boolean {
  const now = Date.now();
  const lastTime = lastAlertTimes.get(eventKey) || 0;
  if (now - lastTime < RATE_LIMIT_MS) return true;
  lastAlertTimes.set(eventKey, now);
  return false;
}

// ── Severity Emojis ──────────────────────────────────────────

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  INFO: 'ℹ️',
  WARNING: '⚠️',
  URGENT: '🔶',
  CRITICAL: '🔴',
  EMERGENCY: '🚨',
};

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  INFO: 'Info',
  WARNING: 'Warning',
  URGENT: 'Urgent',
  CRITICAL: 'Critical',
  EMERGENCY: 'EMERGENCY',
};

// ── Config Loader ────────────────────────────────────────────

interface NotifierConfig {
  telegramEnabled: boolean;
  botToken: string;
  chatId: string;
  alertOnZoneChange: boolean;
  alertOnStreakWarning: boolean;
  alertOnKillSwitch: boolean;
}

let _configCache: NotifierConfig | null = null;
let _configCacheTime = 0;
const CONFIG_CACHE_TTL = 60_000; // 1 minute

async function getConfig(): Promise<NotifierConfig> {
  const now = Date.now();
  if (_configCache && now - _configCacheTime < CONFIG_CACHE_TTL) {
    return _configCache;
  }

  const defaults: NotifierConfig = {
    telegramEnabled: false,
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    alertOnZoneChange: true,
    alertOnStreakWarning: true,
    alertOnKillSwitch: true,
  };

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return defaults;

    const admin = createClient(url, key);
    const { data: rows } = await admin
      .from('platform_config')
      .select('key, value')
      .like('key', 'risk_telegram%');

    if (rows) {
      for (const row of rows) {
        const k = row.key.replace('risk_', '');
        if (k === 'telegram_alerts_enabled') defaults.telegramEnabled = row.value === 'true';
        if (k === 'telegram_bot_token') defaults.botToken = row.value || defaults.botToken;
        if (k === 'telegram_chat_id') defaults.chatId = row.value || defaults.chatId;
      }

      // Also check alert toggles
      for (const row of rows) {
        const k = row.key.replace('risk_', '');
        if (k === 'alert_on_zone_change') defaults.alertOnZoneChange = row.value !== 'false';
        if (k === 'alert_on_streak_warning') defaults.alertOnStreakWarning = row.value !== 'false';
        if (k === 'alert_on_kill_switch') defaults.alertOnKillSwitch = row.value !== 'false';
      }
    }

    // Also load from broader platform_config
    const { data: alertRows } = await admin
      .from('platform_config')
      .select('key, value')
      .like('key', 'risk_alert%');

    if (alertRows) {
      for (const row of alertRows) {
        const k = row.key.replace('risk_', '');
        if (k === 'alert_on_zone_change') defaults.alertOnZoneChange = row.value !== 'false';
        if (k === 'alert_on_streak_warning') defaults.alertOnStreakWarning = row.value !== 'false';
        if (k === 'alert_on_kill_switch') defaults.alertOnKillSwitch = row.value !== 'false';
      }
    }
  } catch (err) {
    console.warn('[Notifier] Failed to load config from DB:', (err as Error).message);
  }

  _configCache = defaults;
  _configCacheTime = now;
  return defaults;
}

// ── Telegram Sender ──────────────────────────────────────────

async function sendTelegram(botToken: string, chatId: string, text: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Notifier] Telegram API error:', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Notifier] Telegram send failed:', (err as Error).message);
    return false;
  }
}

// ── Format Alert Message ─────────────────────────────────────

function formatTelegramMessage(alert: AlertPayload): string {
  const emoji = SEVERITY_EMOJI[alert.severity];
  const label = SEVERITY_LABEL[alert.severity];
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    timeZone: 'UTC',
  });

  let msg = `${emoji} <b>${alert.title}</b>\n`;
  msg += `<i>${label} • ${timestamp} UTC</i>\n\n`;
  msg += alert.message;

  if (alert.accountId) {
    msg += `\n\n📋 Account: <code>${alert.accountId}</code>`;
  }

  if (alert.data) {
    const entries = Object.entries(alert.data);
    if (entries.length > 0) {
      msg += '\n\n';
      for (const [k, v] of entries) {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        msg += `• ${label}: <code>${v}</code>\n`;
      }
    }
  }

  return msg;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Send an alert via configured channels.
 * Fire-and-forget — never throws, never blocks.
 */
export async function sendAlert(
  eventType: string,
  severity: AlertSeverity,
  message: string,
  options?: {
    title?: string;
    data?: Record<string, any>;
    accountId?: string;
    bypassRateLimit?: boolean;
  }
): Promise<void> {
  try {
    // Rate limit check
    const eventKey = `${eventType}_${options?.accountId || 'global'}`;
    if (!options?.bypassRateLimit && isRateLimited(eventKey)) {
      return;
    }

    const config = await getConfig();

    // Check if this alert type is enabled
    if (eventType.includes('zone') && !config.alertOnZoneChange) return;
    if (eventType.includes('streak') && !config.alertOnStreakWarning) return;
    if (eventType.includes('kill') && !config.alertOnKillSwitch) return;

    const alert: AlertPayload = {
      eventType,
      severity,
      title: options?.title || eventType.replace(/_/g, ' ').toUpperCase(),
      message,
      data: options?.data,
      accountId: options?.accountId,
    };

    // Telegram
    if (config.telegramEnabled && config.botToken && config.chatId) {
      const text = formatTelegramMessage(alert);
      sendTelegram(config.botToken, config.chatId, text).catch(() => {});
    }

    // Console log (always)
    console.log(`[Notifier] ${SEVERITY_EMOJI[severity]} ${alert.title}: ${message}`);

    // Persist to audit log
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        const admin = createClient(url, key);
        await admin.from('audit_log').insert({
          admin_id: null,
          action: `alert_${eventType}`,
          target_type: 'risk_alert',
          target_id: options?.accountId || null,
          details: {
            severity,
            message,
            ...options?.data,
            telegramSent: config.telegramEnabled,
          },
        });
      }
    } catch {}

  } catch (err) {
    // Never crash the caller
    console.error('[Notifier] sendAlert error:', (err as Error).message);
  }
}

/**
 * Send a test Telegram message to verify configuration.
 */
export async function sendTestAlert(botToken: string, chatId: string): Promise<{ success: boolean; error?: string }> {
  const text = [
    '✅ <b>TradeGPT Alert Test</b>',
    '',
    'Your Telegram alert channel is configured correctly.',
    '',
    `⏱ ${new Date().toISOString()}`,
    '🔔 Risk alerts will be delivered here.',
  ].join('\n');

  try {
    const ok = await sendTelegram(botToken, chatId, text);
    if (ok) return { success: true };
    return { success: false, error: 'Telegram API returned error' };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Pre-built Alert Helpers ──────────────────────────────────

export function alertZoneTransition(
  accountId: string,
  gate: string,
  from: string,
  to: string,
  equity: number,
  metric: number,
) {
  const severityMap: Record<string, AlertSeverity> = {
    YELLOW: 'WARNING',
    ORANGE: 'URGENT',
    RED: 'CRITICAL',
    BLACK: 'EMERGENCY',
    CAUTION: 'WARNING',
    WARNING: 'URGENT',
    TERMINAL: 'EMERGENCY',
    AMBER: 'WARNING',
  };
  const severity = severityMap[to] || 'INFO';

  sendAlert('zone_transition', severity, `${gate}: ${from} → ${to}`, {
    title: `${gate} TRANSITION`,
    accountId,
    data: {
      from,
      to,
      equity: `$${equity.toFixed(2)}`,
      metric: `${metric.toFixed(2)}%`,
    },
    bypassRateLimit: severity === 'EMERGENCY',
  });
}

export function alertKillSwitch(accountId: string, reason: string, equity: number) {
  sendAlert('kill_switch', 'EMERGENCY', reason, {
    title: '🚨 KILL SWITCH ACTIVATED',
    accountId,
    data: { equity: `$${equity.toFixed(2)}`, action: 'All positions closed' },
    bypassRateLimit: true,
  });
}

export function alertStreakWarning(accountId: string, losses: number) {
  sendAlert('streak_warning', 'WARNING', `${losses} consecutive losses — cooldown activated`, {
    title: 'LOSS STREAK WARNING',
    accountId,
    data: { consecutiveLosses: losses },
  });
}

export function alertBEMigration(accountId: string, symbol: string, direction: string, entryPrice: number) {
  sendAlert('be_migration', 'INFO', `SL moved to break-even on ${symbol} ${direction} @ ${entryPrice}`, {
    title: 'Break-Even Migration',
    accountId,
  });
}

export function alertFlashDrop(accountId: string, dropPct: number, equity: number) {
  sendAlert('flash_drop', 'CRITICAL', `Equity dropped ${dropPct.toFixed(2)}% in 60 seconds`, {
    title: '⚡ FLASH EQUITY DROP',
    accountId,
    data: { drop: `${dropPct.toFixed(2)}%`, equity: `$${equity.toFixed(2)}` },
    bypassRateLimit: true,
  });
}
