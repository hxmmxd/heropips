import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getMarketSnapshot, calculateRiskParams } from '@/lib/market';
import { executeBrokerOrder } from '@/lib/broker';
import { BotInstance, STRATEGY_PRESETS, evaluateStrategyPreset } from '@/lib/auto-trader-matrix';

export const dynamic = 'force-dynamic';

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

async function requireAdmin(request?: Request) {
  if (request) {
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get('secret');
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const secret = secretParam || authHeader;
    const CRON_SECRET = process.env.CRON_SECRET || '';

    if (CRON_SECRET && secret === CRON_SECRET) {
      return { id: 'system_daemon', email: 'daemon@system.local', isDaemon: true };
    }
  }

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!(profile as any)?.is_admin) return null;
    return user;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseAdmin = getSupabaseAdmin();

  // 1. Fetch platform configs (legacy & multi-bot matrix)
  const { data: configRows } = await supabaseAdmin
    .from('platform_config')
    .select('key, value')
    .in('key', [
      'auto_test_enabled',
      'auto_test_account',
      'auto_test_interval',
      'auto_test_symbols',
      'auto_test_lots',
      'auto_test_mode',
      'auto_test_sizing_mode',
      'auto_test_sizing_value',
      'auto_test_last_symbol',
      'auto_test_last_direction',
      'auto_trader_bots'
    ]);

  const config: Record<string, any> = {
    auto_test_enabled: false,
    auto_test_account: '',
    auto_test_interval: 15,
    auto_test_symbols: ['BTCUSD', 'XAUUSD', 'EURUSD'],
    auto_test_lots: 0.01,
    auto_test_mode: 'strict',
    auto_test_sizing_mode: 'risk_percent',
    auto_test_sizing_value: 0.5,
    auto_test_last_symbol: '',
    auto_test_last_direction: 'SELL'
  };

  let bots: BotInstance[] = [];

  (configRows || []).forEach((row: any) => {
    if (row.key === 'auto_test_enabled') config.auto_test_enabled = row.value === 'true' || row.value === true;
    else if (row.key === 'auto_test_account') config.auto_test_account = String(row.value);
    else if (row.key === 'auto_test_interval') config.auto_test_interval = Number(row.value) || 15;
    else if (row.key === 'auto_test_symbols') {
      try {
        config.auto_test_symbols = typeof row.value === 'string' ? row.value.split(',') : row.value;
      } catch {
        config.auto_test_symbols = ['BTCUSD', 'XAUUSD', 'EURUSD'];
      }
    }
    else if (row.key === 'auto_test_lots') config.auto_test_lots = Number(row.value) || 0.01;
    else if (row.key === 'auto_test_mode') config.auto_test_mode = String(row.value || 'strict');
    else if (row.key === 'auto_test_sizing_mode') config.auto_test_sizing_mode = String(row.value || 'risk_percent');
    else if (row.key === 'auto_test_sizing_value') config.auto_test_sizing_value = Number(row.value) ?? 0.5;
    else if (row.key === 'auto_test_last_symbol') config.auto_test_last_symbol = String(row.value);
    else if (row.key === 'auto_test_last_direction') config.auto_test_last_direction = String(row.value);
    else if (row.key === 'auto_trader_bots') {
      try {
        bots = typeof row.value === 'string' ? JSON.parse(row.value) : (row.value || []);
      } catch {
        bots = [];
      }
    }
  });

  // 2. Fetch all connected broker accounts for dropdowns
  const { data: brokerAccounts } = await supabaseAdmin
    .from('broker_accounts')
    .select('id, name, login, broker_server, is_active, equity, balance');

  // 3. Fetch recent auto-trade logs
  const { data: logs } = await supabaseAdmin
    .from('audit_log')
    .select('*')
    .eq('action', 'auto_test_trade')
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    config,
    bots,
    brokerAccounts: brokerAccounts || [],
    strategyPresets: STRATEGY_PRESETS,
    logs: logs || []
  });
}

export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseAdmin = getSupabaseAdmin();
  const body = await request.json().catch(() => ({}));
  const { action } = body;

  // ── Action: Save Multi-Bot Matrix Configurations ──
  if (action === 'save_bots') {
    const { bots } = body;
    if (!Array.isArray(bots)) {
      return NextResponse.json({ error: 'Invalid bots array' }, { status: 400 });
    }

    await supabaseAdmin.from('platform_config').upsert({
      key: 'auto_trader_bots',
      value: JSON.stringify(bots),
      updated_by: (user as any).isDaemon ? null : user.id,
      updated_at: new Date().toISOString()
    });

    await supabaseAdmin.from('audit_log').insert({
      admin_id: (user as any).isDaemon ? null : user.id,
      action: 'auto_test_save_bots',
      target_type: 'config',
      details: { botCount: bots.length, botIds: bots.map(b => b.id) }
    });

    return NextResponse.json({ success: true, bots });
  }

  // ── Action: Legacy Single Config Update ──
  if (action === 'configure') {
    const { enabled, accountId, interval, symbols, lots, mode, sizingMode, sizingValue } = body;

    const updates = [
      { key: 'auto_test_enabled', value: String(!!enabled) },
      { key: 'auto_test_account', value: String(accountId || '') },
      { key: 'auto_test_interval', value: String(Number(interval) || 15) },
      { key: 'auto_test_symbols', value: Array.isArray(symbols) ? symbols.join(',') : 'BTCUSD,XAUUSD,EURUSD' },
      { key: 'auto_test_lots', value: String(Number(lots) || 0.01) },
      { key: 'auto_test_mode', value: String(mode || 'strict') },
      { key: 'auto_test_sizing_mode', value: String(sizingMode || 'risk_percent') },
      { key: 'auto_test_sizing_value', value: String(sizingValue !== undefined ? Number(sizingValue) : 0.5) }
    ];

    for (const item of updates) {
      await supabaseAdmin.from('platform_config').upsert({
        key: item.key,
        value: item.value,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      });
    }

    await supabaseAdmin.from('audit_log').insert({
      admin_id: user.id,
      action: 'auto_test_configure',
      target_type: 'config',
      details: { enabled, accountId, interval, symbols, lots, mode, sizingMode, sizingValue }
    });

    return NextResponse.json({ success: true });
  }

  // ── Action: Run Specific Bot Instance or Multi-Bot Cycle ──
  if (action === 'trigger_bot' || action === 'run_cycle' || action === 'trigger') {
    // Fetch saved bots & legacy config
    const { data: configRows } = await supabaseAdmin
      .from('platform_config')
      .select('key, value')
      .in('key', ['auto_trader_bots', 'auto_test_enabled', 'auto_test_account', 'auto_test_interval', 'auto_test_symbols', 'auto_test_sizing_mode', 'auto_test_sizing_value', 'auto_test_last_symbol', 'auto_test_last_direction']);

    let bots: BotInstance[] = [];
    const legacyConfig: Record<string, any> = {
      auto_test_enabled: false,
      auto_test_account: '',
      auto_test_interval: 15,
      auto_test_symbols: ['BTCUSD', 'XAUUSD', 'EURUSD'],
      auto_test_sizing_mode: 'risk_percent',
      auto_test_sizing_value: 0.5,
      auto_test_last_symbol: '',
      auto_test_last_direction: 'SELL'
    };

    (configRows || []).forEach((row: any) => {
      if (row.key === 'auto_trader_bots') {
        try {
          bots = typeof row.value === 'string' ? JSON.parse(row.value) : (row.value || []);
        } catch { bots = []; }
      } else if (row.key === 'auto_test_enabled') legacyConfig.auto_test_enabled = row.value === 'true' || row.value === true;
      else if (row.key === 'auto_test_account') legacyConfig.auto_test_account = String(row.value);
      else if (row.key === 'auto_test_interval') legacyConfig.auto_test_interval = Number(row.value) || 15;
      else if (row.key === 'auto_test_symbols') {
        try { legacyConfig.auto_test_symbols = typeof row.value === 'string' ? row.value.split(',') : row.value; } catch { legacyConfig.auto_test_symbols = ['BTCUSD', 'XAUUSD', 'EURUSD']; }
      }
      else if (row.key === 'auto_test_sizing_mode') legacyConfig.auto_test_sizing_mode = String(row.value || 'risk_percent');
      else if (row.key === 'auto_test_sizing_value') legacyConfig.auto_test_sizing_value = Number(row.value) ?? 0.5;
      else if (row.key === 'auto_test_last_symbol') legacyConfig.auto_test_last_symbol = String(row.value);
      else if (row.key === 'auto_test_last_direction') legacyConfig.auto_test_last_direction = String(row.value);
    });

    // If bots array is empty, synthesize a default bot from legacy config
    if (bots.length === 0 && legacyConfig.auto_test_account) {
      bots = [{
        id: 'bot_default_01',
        name: 'Default 17-Gate Bot',
        accountId: legacyConfig.auto_test_account,
        strategyPreset: 'full_17_gates',
        intervalMinutes: legacyConfig.auto_test_interval,
        sizingMode: legacyConfig.auto_test_sizing_mode,
        sizingValue: legacyConfig.auto_test_sizing_value,
        symbols: legacyConfig.auto_test_symbols,
        isEnabled: legacyConfig.auto_test_enabled,
        lastSymbol: legacyConfig.auto_test_last_symbol,
        lastDirection: legacyConfig.auto_test_last_direction,
      }];
    }

    // Determine target bot(s) to run
    let targetBots: BotInstance[] = [];
    const isManual = !!body.manual;

    if (action === 'trigger_bot' && body.botId) {
      const b = bots.find(item => item.id === body.botId);
      if (b) targetBots = [b];
      else return NextResponse.json({ error: `Bot ID ${body.botId} not found` }, { status: 404 });
    } else {
      // Run cycle across all enabled bots
      targetBots = bots.filter(b => isManual || b.isEnabled);
    }

    if (targetBots.length === 0) {
      return NextResponse.json({ success: false, error: 'No active strategy bots configured or enabled.' }, { status: 400 });
    }

    const cycleResults: any[] = [];

    // Parallel Matrix Execution: evaluate target bots concurrently via Promise.all
    await Promise.all(targetBots.map(async (bot) => {
      const accountId = bot.accountId;
      if (!accountId) {
        cycleResults.push({ botId: bot.id, botName: bot.name, success: false, error: 'No MT5 account configured for this bot.' });
        return;
      }

      // Multi-Pair Scan Fallback:
      // If manual symbol specified, test only that symbol.
      // Otherwise, iterate over all bot symbols starting from next Symbol.
      // Pick the first symbol that meets the gating threshold!
      const symbolsList = bot.symbols?.length > 0 ? bot.symbols : ['BTCUSD', 'XAUUSD', 'EURUSD'];
      let candidateSymbols: string[] = [];

      if (body.symbol) {
        candidateSymbols = [body.symbol];
      } else {
        const lastIdx = symbolsList.indexOf(bot.lastSymbol || '');
        for (let i = 0; i < symbolsList.length; i++) {
          const idx = (lastIdx + 1 + i) % symbolsList.length;
          candidateSymbols.push(symbolsList[idx]);
        }
      }

      let selectedSymbol = candidateSymbols[0] || 'XAUUSD';
      let selectedQuerySymbol = 'XAU/USD';
      let selectedPrice = 0;
      let selectedSnapshot: any = null;
      let selectedEvalResult: any = { shouldTrade: false, reason: 'Snapshot not computed' };
      let bestScore = -1;

      for (const sym of candidateSymbols) {
        let qSym = sym;
        if (sym === 'XAUUSD' || sym === 'GOLD') qSym = 'XAU/USD';
        else if (sym === 'EURUSD') qSym = 'EUR/USD';
        else if (sym === 'BTCUSD') qSym = 'BTC/USD';

        try {
          const snap = await getMarketSnapshot(qSym, true);
          if (snap) {
            const ev = evaluateStrategyPreset(bot.strategyPreset, snap, bot.minConfluenceThreshold);
            const score = snap.confluenceScore || 0;

            if (ev.shouldTrade) {
              // Found a pair that meets the gating threshold! Lock it in immediately.
              selectedSymbol = sym;
              selectedQuerySymbol = qSym;
              selectedPrice = snap.price || 0;
              selectedSnapshot = snap;
              selectedEvalResult = ev;
              break;
            }

            if (score > bestScore) {
              bestScore = score;
              selectedSymbol = sym;
              selectedQuerySymbol = qSym;
              selectedPrice = snap.price || 0;
              selectedSnapshot = snap;
              selectedEvalResult = ev;
            }
          }
        } catch (symErr: any) {
          console.warn(`[Auto-Trader] Snapshot candidate scan error for ${sym}:`, symErr.message);
        }
      }

      const nextSymbol = selectedSymbol;
      const querySymbol = selectedQuerySymbol;
      let currentPrice = selectedPrice;
      const rawSnapshot = selectedSnapshot;
      const evalResult = selectedEvalResult;

      // Fallback price if provider throttles
      if (!currentPrice) {
        if (nextSymbol.includes('BTC')) currentPrice = 65000;
        else if (nextSymbol.includes('XAU') || nextSymbol.includes('GOLD')) currentPrice = 2400;
        else if (nextSymbol.includes('EUR')) currentPrice = 1.085;
        else currentPrice = 100;
      }

      let finalDirection = body.direction || null;
      if (!finalDirection) {
        const confDir = rawSnapshot?.confluenceDirection;
        if (confDir === 'BUY' || confDir === 'SELL') {
          finalDirection = confDir;
        } else {
          finalDirection = bot.lastDirection === 'BUY' ? 'SELL' : 'BUY';
        }
      }

      // Strategy Preset Gating Check
      const shouldSkipGating = !isManual && !evalResult.shouldTrade;

      let tradeResult: any = null;
      let executionError: string | null = null;
      let usedLots = 0.01;
      let stopLossVal: number | undefined;
      let takeProfitVal: number | undefined;
      let liveBalance = 100000;

      if (shouldSkipGating) {
        executionError = evalResult.reason;
      } else {
        // Dynamic balance lookup for bot's MT5 account & comprehensive risk state purge
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          const cleanAcct = accountId.replace(/^mt5_/, '');
          await sb
            .from('portfolio_risk_states')
            .update({
              is_trading_enabled: true,
              is_daily_halted: false,
              daily_tier: 'NORMAL',
              drawdown_zone: 'GREEN',
              shutdown_time: null,
              daily_halt_time: null,
              last_updated: new Date().toISOString()
            })
            .or(`account_id.eq.${accountId},account_id.eq.mt5_${cleanAcct},account_id.eq.${cleanAcct}`);

          const { farmGetAccountInfo } = await import('@/lib/mt5farm');
          const info = await farmGetAccountInfo(accountId);
          if (info && (info.balance || info.equity)) {
            liveBalance = info.balance || info.equity;
          }
        } catch (err: any) {
          console.warn(`[Auto-Trader] Balance lookup / risk reset bypassed for ${accountId}, using $${liveBalance}:`, err.message);
        }

        const sizingMode = bot.sizingMode || 'risk_percent';
        const sizingVal = Number(bot.sizingValue) ?? (sizingMode === 'fixed_dollar' ? 500 : 0.5);

        // Compute dynamic SL & TP using ATR
        let riskParams: any = null;
        if (rawSnapshot) {
          try {
            const calcRiskPercent = sizingMode === 'fixed_dollar' ? (sizingVal / liveBalance) * 100 : (sizingMode === 'risk_percent' ? sizingVal : 0.5);
            riskParams = calculateRiskParams(
              currentPrice,
              rawSnapshot.indicators?.atr || null,
              finalDirection,
              liveBalance,
              calcRiskPercent,
              querySymbol,
              bot.tpMode || 'quick_scalp',
              bot.customTpDistance
            );
            stopLossVal = parseFloat(riskParams.stopLoss);
            takeProfitVal = parseFloat(riskParams.takeProfit);
          } catch (err: any) {
            console.warn('[Auto-Trader] Failed to calculate SL/TP params:', err.message);
          }
        }

        // Sizing Engine mode calculation (with floored lots for Risk < Target Cap)
        if (sizingMode === 'fixed_lots') {
          usedLots = Math.max(0.01, sizingVal);
        } else if (sizingMode === 'risk_percent' || sizingMode === 'fixed_dollar') {
          if (riskParams?.lotVolume) {
            usedLots = parseFloat(riskParams.lotVolume);
          } else {
            usedLots = 0.01;
          }
        } else if (sizingMode === 'kelly_adaptive') {
          if (rawSnapshot?.kellySizing?.recommendedLots) {
            usedLots = Math.max(0.01, Math.floor(rawSnapshot.kellySizing.recommendedLots * sizingVal * 100) / 100);
          } else if (riskParams?.lotVolume) {
            usedLots = parseFloat(riskParams.lotVolume);
          } else {
            usedLots = 0.01;
          }
        }

        console.log(`[Multi-Bot Matrix] Bot "${bot.name}" (${bot.strategyPreset}) → ${usedLots} Lots on ${nextSymbol} at MT5 #${accountId} (Balance: $${liveBalance})`);

        // Execute trade order on designated MT5 account
        try {
          tradeResult = await executeBrokerOrder(
            accountId,
            nextSymbol,
            finalDirection,
            usedLots,
            currentPrice,
            stopLossVal,
            takeProfitVal
          );
        } catch (err: any) {
          executionError = err.message || 'Broker order execution rejected';
        }
      }

      const logDetails = {
        botId: bot.id,
        botName: bot.name,
        strategyPreset: bot.strategyPreset,
        accountId,
        symbol: nextSymbol,
        direction: finalDirection,
        lots: usedLots,
        price: currentPrice,
        stopLoss: stopLossVal || null,
        takeProfit: takeProfitVal || null,
        sizingMode: bot.sizingMode,
        sizingValue: bot.sizingValue,
        accountBalance: liveBalance,
        success: !executionError && tradeResult?.status === 'success',
        orderId: tradeResult?.orderId || null,
        error: executionError,
        triggeredBy: isManual ? 'manual_admin' : 'auto_daemon',
        confluenceScore: rawSnapshot?.confluenceScore || 0,
        signalOutcome: rawSnapshot?.signalOutcome || 'NO_TRADE',
        outcomeReason: evalResult.reason,
        isGatingSkipped: shouldSkipGating,
        testMode: 'strict',
        gateResults: rawSnapshot?.gateResults || [],
        astroGates: rawSnapshot?.astroGates || [],
        riskGates: rawSnapshot?.riskGates || []
      };

      // Write audit log
      await supabaseAdmin.from('audit_log').insert({
        admin_id: (user as any).isDaemon ? null : user.id,
        action: 'auto_test_trade',
        target_type: 'broker_account',
        target_id: accountId,
        details: logDetails
      });

      // Update Bot's last run metrics in memory
      bot.lastRunAt = new Date().toISOString();
      bot.lastSymbol = nextSymbol;
      bot.lastDirection = finalDirection;
      bot.lastOutcome = shouldSkipGating ? 'GATING_BLOCKED' : (executionError ? 'FAILED' : 'EXECUTED');
      bot.lastError = executionError || undefined;

      cycleResults.push(logDetails);
    }));

    // Persist updated bot run metadata to platform_config
    if (bots.length > 0) {
      await supabaseAdmin.from('platform_config').upsert({
        key: 'auto_trader_bots',
        value: JSON.stringify(bots),
        updated_by: (user as any).isDaemon ? null : user.id,
        updated_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true, results: cycleResults, bots });
  }

  // ── Action: Diagnostic Scan ──
  if (action === 'diagnostic') {
    const { symbol } = body;
    let querySymbol = symbol || 'XAUUSD';
    if (querySymbol === 'XAUUSD' || querySymbol === 'GOLD') querySymbol = 'XAU/USD';
    else if (querySymbol === 'EURUSD') querySymbol = 'EUR/USD';
    else if (querySymbol === 'BTCUSD') querySymbol = 'BTC/USD';

    try {
      const snap = await getMarketSnapshot(querySymbol, true);
      if (!snap) {
        return NextResponse.json({ success: false, error: `Could not fetch snapshot for ${symbol}` }, { status: 400 });
      }
      return NextResponse.json({ success: true, snapshot: snap });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
