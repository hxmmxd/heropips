/**
 * Telegram Bot Webhook — POST /api/telegram
 *
 * Receives incoming messages from Telegram Bot API.
 * Handles commands: /status, /halt, /resume, /approve, /reject
 *
 * Setup: Set webhook URL via:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_DOMAIN>/api/telegram
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AUTHORIZED_IDS = (process.env.TELEGRAM_ADMIN_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

async function sendReply(botToken: string, chatId: string | number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body?.message;
    if (!message?.text || !message?.from?.id) {
      return NextResponse.json({ ok: true });
    }

    const userId = String(message.from.id);
    const chatId = message.chat.id;
    const text = message.text.trim();
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

    if (!botToken) {
      return NextResponse.json({ ok: true });
    }

    // Security: only respond to authorized users
    if (AUTHORIZED_IDS.length > 0 && !AUTHORIZED_IDS.includes(userId)) {
      await sendReply(botToken, chatId, '🔒 Unauthorized. This bot is private.');
      return NextResponse.json({ ok: true });
    }

    const command = text.split(' ')[0].toLowerCase();

    // ── /status — Current risk state ──
    if (command === '/status') {
      try {
        const { getSentinelStatus } = await import('@/lib/sentinel');
        const sentinel = getSentinelStatus();

        if (!sentinel.running) {
          await sendReply(botToken, chatId,
            '🔴 <b>Sentinel is STOPPED</b>\n\nNo active monitoring.'
          );
          return NextResponse.json({ ok: true });
        }

        const { getRiskState, evaluateAllRiskGates } = await import('@/lib/riskGovernor');
        const riskState = sentinel.accountId ? await getRiskState(sentinel.accountId) : null;

        let statusText = `🟢 <b>Sentinel Active</b>\n`;
        statusText += `Account: <code>${sentinel.accountId}</code>\n`;
        statusText += `Equity: <code>$${sentinel.lastEquity.toFixed(2)}</code>\n`;
        statusText += `Ticks: ${sentinel.tickCount}\n\n`;

        if (riskState) {
          const { multipliers } = evaluateAllRiskGates(riskState);
          statusText += `📊 <b>Risk State</b>\n`;
          statusText += `• Daily Loss: <code>${riskState.dailyLossPct.toFixed(2)}%</code> (${riskState.dailyTier})\n`;
          statusText += `• Drawdown: <code>${riskState.drawdownPct.toFixed(2)}%</code> (${riskState.drawdownZone})\n`;
          statusText += `• ECP: ${riskState.ecpStatus}\n`;
          statusText += `• Streak: ${riskState.consecutiveLosses}L / ${riskState.consecutiveWins}W\n`;
          statusText += `• Sizing: <code>${(multipliers.combinedMultiplier * 100).toFixed(0)}%</code>\n`;
          statusText += `• Trades Today: ${riskState.tradesToday}\n`;
          statusText += `\n${multipliers.riskSummary}`;
        }

        await sendReply(botToken, chatId, statusText);
      } catch (err: any) {
        await sendReply(botToken, chatId, `❌ Error fetching status: ${err.message}`);
      }
      return NextResponse.json({ ok: true });
    }

    // ── /halt — Emergency kill switch ──
    if (command === '/halt') {
      try {
        const { getSentinelStatus } = await import('@/lib/sentinel');
        const sentinel = getSentinelStatus();

        if (!sentinel.accountId) {
          await sendReply(botToken, chatId, '⚠️ No active account to halt.');
          return NextResponse.json({ ok: true });
        }

        const { farmCloseAllPositions } = await import('@/lib/mt5farm');
        const result = await farmCloseAllPositions(sentinel.accountId);

        await sendReply(botToken, chatId,
          `🚨 <b>EMERGENCY HALT EXECUTED</b>\n\n` +
          `Account: <code>${sentinel.accountId}</code>\n` +
          `All positions closed.\n` +
          `Result: <code>${JSON.stringify(result)}</code>\n\n` +
          `Use /resume to re-enable trading.`
        );

        // Log to audit
        const { createClient } = await import('@supabase/supabase-js');
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
          const admin = createClient(url, key);
          await admin.from('audit_log').insert({
            admin_id: null,
            action: 'telegram_halt',
            target_type: 'kill_switch',
            target_id: sentinel.accountId,
            details: { triggeredBy: userId, username: message.from.username },
          });
        }
      } catch (err: any) {
        await sendReply(botToken, chatId, `❌ Halt failed: ${err.message}`);
      }
      return NextResponse.json({ ok: true });
    }

    // ── /resume — Resume trading ──
    if (command === '/resume') {
      try {
        const { getSentinelStatus } = await import('@/lib/sentinel');
        const sentinel = getSentinelStatus();

        if (!sentinel.accountId) {
          await sendReply(botToken, chatId, '⚠️ No account configured.');
          return NextResponse.json({ ok: true });
        }

        // Reset daily halt flags
        const { getRiskState, saveRiskState } = await import('@/lib/riskGovernor');
        const state = await getRiskState(sentinel.accountId);
        if (state) {
          state.isDailyHalted = false;
          state.isTradingEnabled = true;
          state.dailyHaltTime = null;
          await saveRiskState(state);
        }

        await sendReply(botToken, chatId,
          `✅ <b>Trading Resumed</b>\n\n` +
          `Account: <code>${sentinel.accountId}</code>\n` +
          `Daily halt cleared. Sentinel continues monitoring.`
        );
      } catch (err: any) {
        await sendReply(botToken, chatId, `❌ Resume failed: ${err.message}`);
      }
      return NextResponse.json({ ok: true });
    }

    // ── /help — Show available commands ──
    if (command === '/help' || command === '/start') {
      await sendReply(botToken, chatId,
        `🤖 <b>TradeGPT Risk Bot</b>\n\n` +
        `Available commands:\n\n` +
        `/status — Current risk state & equity\n` +
        `/halt — Emergency close all positions\n` +
        `/resume — Re-enable trading after halt\n` +
        `/help — Show this help message\n\n` +
        `🔔 You will receive automatic alerts for:\n` +
        `• Zone transitions (Gate 14/15)\n` +
        `• Kill switch activations\n` +
        `• Loss streak warnings\n` +
        `• Flash equity drops`
      );
      return NextResponse.json({ ok: true });
    }

    // Unknown command
    await sendReply(botToken, chatId, `❓ Unknown command. Type /help for available commands.`);
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error('[Telegram Webhook] Error:', err.message);
    return NextResponse.json({ ok: true }); // Always 200 to Telegram
  }
}

// GET endpoint for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'TradeGPT Telegram Bot' });
}
