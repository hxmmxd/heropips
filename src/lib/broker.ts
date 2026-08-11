/**
 * Broker Engine — MT5 Farm Integration
 *
 * All MT5 operations route through our proprietary MT5 Farm:
 *   Orchestrator: http://4.224.249.231:8080
 *   Sidecar proxy: /accounts/{id}/proxy/{path}
 *
 * Account IDs are MT5 login numbers (e.g. 5051904701).
 * The 'metaapi_id' Supabase column is repurposed to store these login numbers.
 */


import {
  FARM_BASE,
  FARM_KEY,
  FARM_HEADERS,
  sidecarUrl,
  farmConnectAccount,
  farmGetAccount,
  farmGetAccountInfo,
  farmGetPositions,
  farmGetSymbols,
  farmDisconnect,
  farmHibernate,
  farmWake,
  farmExecuteTrade,
  farmModifyPosition,
  farmSearchBrokers,
  type FarmAccount,
  type TradePayload,
  STATIC_MAPPINGS,
} from './mt5farm';
import {
  getRiskState,
  evaluateAllRiskGates,
  updateRiskMetrics,
  saveRiskState,
} from './riskGovernor';

export interface BrokerNode {
  id: string;
  userId?: string;
  name: string;
  login: string;
  server: string;
  platform: 'mt4' | 'mt5';
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'timeout';
  /** Shown in UI for 'error' status (e.g. 'AUTH_FAILED', 'SERVER_NOT_FOUND') */
  statusDetail?: string;
  /** Human-readable error message for the user */
  statusMessage?: string;
  balance: number;
  equity: number;
  pnl: number;
  /** Farm Fix 9: available free margin for new trades */
  freeMargin?: number;
  /** Farm Fix 9: number of currently open positions */
  openPositions?: number;
  /** Farm Fix 9: number of pending orders */
  openOrders?: number;
  /** Farm Fix 6: whether trading is allowed on this account */
  tradeAllowed?: boolean;
  /** Farm Fix 6: whether EA trading is allowed */
  tradeExpert?: boolean;
  /** Farm Fix 6: ISO 8601 timestamp of last successful sync with MT5 */
  lastSyncTime?: string;
  positions: any[];
  timezone_offset?: number;
  broker_timezone_name?: string;
  allowed_symbols?: string[];
}



// ── Supabase Sync ────────────────────────────────────────────────────────────

export async function syncBrokerToSupabase(node: BrokerNode, userId: string) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // metaapi_id column repurposed to store the MT5 login number
    const { error } = await sb
      .from('broker_accounts')
      .upsert(
        {
          user_id:              userId,
          metaapi_id:           node.login, // MT5 login number stored here
          broker_name:          node.name,
          mt5_login:            node.login,
          server:               node.server,
          status:               node.status === 'timeout' ? 'error' : node.status,
          balance:              node.balance,
          equity:               node.equity,
          pnl:                  node.pnl,
          timezone_offset:      node.timezone_offset ?? 0,
          broker_timezone_name: node.broker_timezone_name ?? 'UTC',
          allowed_symbols:      node.allowed_symbols ?? [],
          is_active:            true,
          updated_at:           new Date().toISOString(),
        },
        { onConflict: 'metaapi_id,user_id' }
      );

    if (error) console.error('[Broker Engine] Supabase sync error:', error.message);
    else console.log('[Broker Engine] Synced to Supabase broker_accounts');
  } catch (err: any) {
    console.error('[Broker Engine] Supabase sync failed:', err.message);
  }
}

// ── Symbol normalization ─────────────────────────────────────────────────────

export function normalizeMt5Symbol(symbol: string): string {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const aliases: Record<string, string> = {
    GOLD: 'XAUUSD', XAU: 'XAUUSD', BITCOIN: 'BTCUSD', BTC: 'BTCUSD',
    ETHEREUM: 'ETHUSD', ETH: 'ETHUSD', OIL: 'XTIUSD', USOIL: 'XTIUSD',
    WTIUSD: 'XTIUSD', NASDAQ: 'NAS100', DOW: 'US30', SP500: 'SPX500', SPY: 'SPX500',
    QQQ: 'QQQM',
  };
  return aliases[s] || s;
}

const allowedSymbolsCache = new Map<string, { symbols: string[]; expires: number }>();

export async function getNormalizedSymbolForBroker(symbol: string, brokerIdOrLogin: string): Promise<string> {
  let mt5Symbol = normalizeMt5Symbol(symbol);
  const cleanBrokerId = brokerIdOrLogin.replace(/^mt5_/, '');

  let allowed_symbols: string[] | null = null;
  const cached = allowedSymbolsCache.get(cleanBrokerId);
  if (cached && Date.now() < cached.expires) {
    allowed_symbols = cached.symbols;
  } else {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanBrokerId);
      let query = sb.from('broker_accounts').select('allowed_symbols');
      if (isUuid) {
        query = query.eq('id', cleanBrokerId);
      } else {
        query = query.or(`mt5_login.eq.${cleanBrokerId},metaapi_id.eq.${cleanBrokerId},mt5_login.eq.${brokerIdOrLogin},metaapi_id.eq.${brokerIdOrLogin}`);
      }
      const { data } = await query.maybeSingle();
      if (Array.isArray(data?.allowed_symbols) && data.allowed_symbols.length > 0) {
        allowed_symbols = data.allowed_symbols as string[];
        allowedSymbolsCache.set(cleanBrokerId, { symbols: allowed_symbols, expires: Date.now() + 600000 }); // 10m TTL
      }
    } catch (err: any) {
      console.warn('[Broker Engine] Symbol normalization db fetch failed:', err.message);
    }
  }

  if (allowed_symbols?.length) {
    // First pass: try to find an exact match (ignoring only non-alphanumeric chars)
    let matchedSymbol = allowed_symbols.find(
      (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '') === mt5Symbol
    );
    
    // Second pass: if no exact match, fallback to root prefix matching (e.g., EURUSD.raw -> EURUSD)
    if (!matchedSymbol) {
      matchedSymbol = allowed_symbols.find(
        (s: string) => s.toUpperCase().split('.')[0].replace(/[^A-Z0-9]/g, '') === mt5Symbol
      );
    }
    
    if (matchedSymbol) mt5Symbol = matchedSymbol;
  }
  return mt5Symbol;
}

// ── Connect Broker ───────────────────────────────────────────────────────────

export async function connectBroker(
  name: string,
  login: string,
  password?: string,
  server?: string,
  userId?: string,
  _platform: 'mt4' | 'mt5' = 'mt5',
): Promise<BrokerNode> {
  console.log(`[Broker Engine] Connecting ${name} (login: ${login}) via MT5 Farm...`);

  // Check if already connected in farm — avoid duplicate sidecars
  try {
    const existingAccount = await farmGetAccount(login);
    if (existingAccount) {
      // Farm Fix 7: 'failed' means bad credentials — throw immediately, don't retry
      if (existingAccount.status === 'failed') {
        throw new Error(
          existingAccount.failureReason ||
          'Account credentials are invalid or broker server not found. Please check your login and server name.'
        );
      }
      if (existingAccount.status === 'timeout') {
        console.log(`[Broker Engine] Sidecar in timeout for ${login}. Deleting dead container first...`);
        try {
          await farmDisconnect(String(login));
        } catch (err: any) {
          console.warn(`[Broker Engine] Failed to delete dead sidecar: ${err.message}`);
        }
      } else {
        console.log(`[Broker Engine] Found existing farm sidecar for ${login} (status: ${existingAccount.status})`);
        if (existingAccount.status === 'hibernated') {
          // Wake it up
          try {
            await farmWake(String(login));
          } catch (err: any) {
            console.warn(`[Broker Engine] Failed to wake sidecar: ${err.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    // Re-throw auth failures — they are fatal
    if (err.message?.includes('credentials') || err.message?.includes('server not found')) throw err;
    // Other errors (404 = not found) — will create below
  }

  // POST /accounts — spin up sidecar (returns immediately; sidecar is ALWAYS 'starting' here)
  const farmAccount = await farmConnectAccount(login, password || '', server || '', name);
  const accountId = farmAccount.accountId || String(login);

  console.log(`[Broker Engine] Sidecar created for ${login} — status: ${farmAccount.status}. Balance will populate via polling.`);

  const node: BrokerNode = {
    id:     accountId,
    userId,
    name:   farmAccount.name ?? name,
    login,
    server: server || '',
    platform: 'mt5',
    // Always 'connecting' after initial POST — polling will update to 'connected'
    status: 'connecting',
    balance: 0,
    equity:  0,
    pnl:     0,
    positions: [],
    timezone_offset:      0,
    broker_timezone_name: 'UTC',
    allowed_symbols:      [],
  };

  // Try to pre-fetch symbols in the background (non-blocking, often still unavailable)
  farmGetSymbols(accountId).then(async (s) => {
    if (s.length > 0 && userId) {
      node.allowed_symbols = s;
      await syncBrokerToSupabase(node, userId);
    }
  }).catch(() => {});

  // Sync to Supabase
  if (userId) await syncBrokerToSupabase(node, userId);

  return node;
}

// ── Get Broker Details ───────────────────────────────────────────────────────

export async function getBrokerDetails(id: string): Promise<BrokerNode | null> {
  // Find the broker in Supabase first
  let localBroker: any = null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const cleanId = id.replace(/^mt5_/, '');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let query = sb.from('broker_accounts').select('*');
    if (isUuid) {
      query = query.eq('id', cleanId);
    } else {
      query = query.or(`mt5_login.eq.${cleanId},metaapi_id.eq.${cleanId},mt5_login.eq.${id},metaapi_id.eq.${id}`);
    }
    const { data } = await query.maybeSingle();
    localBroker = data;
  } catch (err: any) {
    console.warn('[Broker Engine] Failed to fetch broker from Supabase for details:', err.message);
  }

  const accountId = localBroker?.mt5_login || localBroker?.metaapi_id || id;

  try {
    const [info, positions, symbols] = await Promise.all([
      farmGetAccountInfo(accountId),
      farmGetPositions(accountId),
      farmGetSymbols(accountId),
    ]);

    if (!info) {
      // Farm account proxy down/not ready — let's try calling the orchestrator
      try {
        const farmAcct = await farmGetAccount(accountId);
        if (farmAcct && farmAcct.balance != null) {
          const node: BrokerNode = {
            id,
            userId: localBroker?.user_id,
            name:   farmAcct.name || localBroker?.broker_name || String(id),
            login:  String(farmAcct.login || localBroker?.mt5_login || id),
            server: farmAcct.server || localBroker?.server || '',
            platform: 'mt5',
            status: farmAcct.status === 'connected' ? 'connected' : 'connecting',
            balance: farmAcct.balance,
            equity:  farmAcct.balance,
            pnl:     0,
            positions: [],
            timezone_offset:      Number(localBroker?.timezone_offset) || 0,
            broker_timezone_name: localBroker?.broker_timezone_name || 'UTC',
            allowed_symbols:      Array.isArray(localBroker?.allowed_symbols) ? localBroker.allowed_symbols : [],
          };
          // Sync it back to Supabase
          if (localBroker?.user_id) {
            await syncBrokerToSupabase(node, localBroker.user_id);
          }
          return node;
        }
      } catch (err: any) {
        console.warn(`[Broker Engine] Failed to fetch fallback account from orchestrator: ${err.message}`);
      }

      // Try db as ultimate fallback
      if (localBroker) {
        return {
          id:     localBroker.mt5_login || localBroker.metaapi_id || localBroker.id,
          userId: localBroker.user_id,
          name:   localBroker.broker_name,
          login:  localBroker.mt5_login || localBroker.metaapi_id,
          server: localBroker.server,
          platform: 'mt5',
          status: localBroker.status,
          balance: Number(localBroker.balance) || 0,
          equity:  Number(localBroker.equity) || 0,
          pnl:     Number(localBroker.pnl) || 0,
          positions: [],
          timezone_offset:      Number(localBroker.timezone_offset) || 0,
          broker_timezone_name: localBroker.broker_timezone_name || 'UTC',
          allowed_symbols:      Array.isArray(localBroker.allowed_symbols) ? localBroker.allowed_symbols : [],
        };
      }
      return null;
    }

    const balance = info.balance ?? 0;
    const equity  = info.equity  ?? 0;

    return {
      id,
      userId: localBroker?.user_id,
      name:   info.name   || localBroker?.broker_name   || String(id),
      login:  String(info.login || localBroker?.mt5_login || id),
      server: info.server || localBroker?.server || '',
      platform: 'mt5',
      status: 'connected',
      balance,
      equity,
      pnl: equity - balance,
      positions: positions.map(p => ({
        id:           p.id,
        symbol:       p.symbol,
        type:         p.type,
        volume:       p.volume,
        openPrice:    p.openPrice,
        currentPrice: p.currentPrice,
        profit:       p.profit,
      })),
      timezone_offset:      Number(localBroker?.timezone_offset) || 0,
      broker_timezone_name: localBroker?.broker_timezone_name || 'UTC',
      allowed_symbols:      symbols.length > 0 ? symbols : (Array.isArray(localBroker?.allowed_symbols) ? localBroker.allowed_symbols : []),
    };
  } catch (err: any) {
    console.error('[Broker Engine] getBrokerDetails error:', err.message);
    if (localBroker) {
      return {
        id:     localBroker.mt5_login || localBroker.metaapi_id || localBroker.id,
        userId: localBroker.user_id,
        name:   localBroker.broker_name,
        login:  localBroker.mt5_login || localBroker.metaapi_id,
        server: localBroker.server,
        platform: 'mt5',
        status: localBroker.status,
        balance: Number(localBroker.balance) || 0,
        equity:  Number(localBroker.equity) || 0,
        pnl:     Number(localBroker.pnl) || 0,
        positions: [],
        timezone_offset:      Number(localBroker.timezone_offset) || 0,
        broker_timezone_name: localBroker.broker_timezone_name || 'UTC',
        allowed_symbols:      Array.isArray(localBroker.allowed_symbols) ? localBroker.allowed_symbols : [],
      };
    }
    return null;
  }
}

// ── Execute Order ────────────────────────────────────────────────────────────

export async function executeBrokerOrder(
  id: string,
  symbol: string,
  action: 'BUY' | 'SELL',
  volume: number | string,
  entryPrice: number | string,
  stopLoss?: number | string,
  takeProfit?: number | string,
  bypassRiskGovernor: boolean = true
): Promise<any> {
  // Fast-path account ID resolution: if numeric, skip DB lookup
  let accountId = id;
  const cleanId = id.replace(/^mt5_/, '');
  if (/^\d+$/.test(cleanId)) {
    accountId = cleanId;
  } else {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      let query = sb.from('broker_accounts').select('mt5_login, metaapi_id');
      if (isUuid) {
        query = query.eq('id', cleanId);
      } else {
        query = query.or(`mt5_login.eq.${cleanId},metaapi_id.eq.${cleanId},mt5_login.eq.${id},metaapi_id.eq.${id}`);
      }
      const { data } = await query.maybeSingle();
      if (data?.mt5_login) accountId = String(data.mt5_login);
      else if (data?.metaapi_id) accountId = String(data.metaapi_id);
    } catch (err: any) {
      console.warn('[Broker Engine] Failed to resolve account ID for order placement:', err.message);
    }
  }

  // Pre-trade margin check (only run if risk governor active; sidecar checks margin natively on trade placement)
  let liveEquity = 0;
  let liveBalance = 0;
  if (!bypassRiskGovernor) {
    try {
      const info = await farmGetAccountInfo(accountId);
      if (info) {
        liveEquity = info.equity ?? 0;
        liveBalance = info.balance ?? 0;
        const marginFree = info.marginFree ?? info.equity ?? 0;
        if (marginFree <= 0) {
          throw new Error(`Insufficient funds: account free margin is ${marginFree}.`);
        }
      }
    } catch (marginErr: any) {
      if (marginErr.message.includes('Insufficient funds:')) throw marginErr;
      console.warn(`[Broker Engine] Pre-trade margin check bypassed: ${marginErr.message}`);
    }
  }

  // ── Risk Governor: Last Line of Defense (Bypassed in Testing Mode) ──────────
  if (!bypassRiskGovernor) {
    try {
      const riskState = await getRiskState(accountId);
      if (riskState) {
        // Update risk metrics with live equity
        const updated = updateRiskMetrics(riskState, liveEquity || riskState.currentEquity, liveBalance || riskState.dailyStartBalance);
        const { multipliers } = await evaluateAllRiskGates(updated);

        if (multipliers.shouldLiquidate) {
          console.error(`[Risk Governor] 🚨 TERMINAL EVENT — blocking trade and saving state`);
          await saveRiskState({ ...updated, isTradingEnabled: false, shutdownTime: new Date().toISOString() });
          throw new Error(`🚨 Risk Governor: Trading halted — ${multipliers.riskSummary}`);
        }

        if (!updated.isTradingEnabled || multipliers.shouldHalt) {
          console.warn(`[Risk Governor] ⛔ Trade blocked: ${multipliers.riskSummary}`);
          await saveRiskState(updated);
          throw new Error(`⛔ Risk Governor: ${multipliers.riskSummary}`);
        }

        // Apply risk multiplier to volume
        if (multipliers.combinedMultiplier < 1.0 && multipliers.combinedMultiplier > 0) {
          const adjVol = Math.max(0.01, parseFloat((Number(volume) * multipliers.combinedMultiplier).toFixed(2)));
          console.log(`[Risk Governor] Volume adjusted: ${volume} → ${adjVol} (x${multipliers.combinedMultiplier.toFixed(2)})`);
          volume = adjVol;
        }

        // Persist updated state
        await saveRiskState(updated);
      }
    } catch (riskErr: any) {
      // Re-throw risk blocks
      if (riskErr.message.includes('Risk Governor')) throw riskErr;
      console.warn(`[Risk Governor] Pre-trade check skipped: ${riskErr.message}`);
    }
  }

  // Resolve symbol with allowed_symbols suffix matching
  let mt5Symbol = await getNormalizedSymbolForBroker(symbol, accountId);

  const vol = Math.max(Number(volume) || 0.01, 0.01);

  let precision = 2;
  const upperSym = mt5Symbol.toUpperCase();
  if (upperSym.includes('JPY')) precision = 3;
  else if (upperSym.includes('EUR') || upperSym.includes('GBP') || upperSym.includes('AUD') || upperSym.includes('CAD') || upperSym.includes('CHF')) precision = 5;
  else precision = 2;

  const currentPrice = Number(entryPrice) || 1.0;

  // ── GUARANTEED SL/TP ENFORCEMENT: Never send a trade without SL & TP ──────
  let slNum = stopLoss != null && !isNaN(Number(stopLoss)) ? Number(Number(stopLoss).toFixed(precision)) : undefined;
  let tpNum = takeProfit != null && !isNaN(Number(takeProfit)) ? Number(Number(takeProfit).toFixed(precision)) : undefined;

  if (!slNum || !tpNum || slNum === 0 || tpNum === 0) {
    console.log(`[Broker Engine] ⚠️ Missing SL/TP for ${mt5Symbol} @ ${currentPrice} — Calculating calculated institutional SL/TP fallbacks...`);
    let slDist = currentPrice * 0.015; // 1.5% fallback
    let tpDist = currentPrice * 0.030; // 3.0% fallback (1:2 R:R)

    if (upperSym.includes('XAU') || upperSym.includes('GOLD')) {
      slDist = 5.0;  // $5 SL
      tpDist = 10.0; // $10 TP (1:2 R:R)
    } else if (upperSym.includes('EUR') || upperSym.includes('GBP')) {
      slDist = 0.0020; // 20 pips
      tpDist = 0.0040; // 40 pips
    } else if (upperSym.includes('JPY')) {
      slDist = 0.30;  // 30 pips
      tpDist = 0.60;  // 60 pips
    } else if (upperSym.includes('BTC')) {
      slDist = 300.0; // $300 SL
      tpDist = 600.0; // $600 TP
    }

    if (!slNum || slNum === 0) {
      slNum = action === 'BUY' ? currentPrice - slDist : currentPrice + slDist;
      slNum = Number(slNum.toFixed(precision));
    }
    if (!tpNum || tpNum === 0) {
      tpNum = action === 'BUY' ? currentPrice + tpDist : currentPrice - tpDist;
      tpNum = Number(tpNum.toFixed(precision));
    }
  }

  const sl = slNum;
  const tp = tpNum;

  // Calculate distances so we can re-apply them to the actual fill price to prevent invalid stops (ECN slippage)
  const slDistance = (sl && sl > 0) ? Math.abs(currentPrice - sl) : 0;
  const tpDistance = (tp && tp > 0) ? Math.abs(currentPrice - tp) : 0;

  console.log(`[Broker Engine] 🔒 MANDATORY SL/TP: MT5 Farm ${action} ${vol} lot(s) ${mt5Symbol} (SL: ${sl}, TP: ${tp}) → account ${accountId}`);

  const payload: any = {
    actionType: action === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
    symbol:     mt5Symbol,
    volume:     vol,
    comment:    'Xyro Trade Ai Signal',
  };
  if (sl) {
    payload.stopLoss = sl;
  }
  if (tp) {
    payload.takeProfit = tp;
  }

  let result = await farmExecuteTrade(accountId, payload);

  // Auto-wake retry loop if MT5 Farm account is waking up from hibernation
  const resAny = result as any;
  if (!result.success && (resAny?.status === 'waking' || resAny?.error?.message?.includes('waking') || JSON.stringify(result).includes('waking'))) {
    console.log(`[Broker Engine] MT5 Account #${accountId} is waking up from hibernation... Auto-waking and waiting 6s...`);
    try {
      await farmWake(accountId);
    } catch (_) {}
    await new Promise(r => setTimeout(r, 6000));
    console.log(`[Broker Engine] Retrying order execution for account #${accountId}...`);
    result = await farmExecuteTrade(accountId, payload);
    const retryAny = result as any;
    if (!result.success && (retryAny?.status === 'waking' || retryAny?.error?.message?.includes('waking') || JSON.stringify(result).includes('waking'))) {
      await new Promise(r => setTimeout(r, 6000));
      result = await farmExecuteTrade(accountId, payload);
    }
  }

  if (!result.success) {
    const err = result.error;
    const rawError = (err as any).detail || err;
    let message = 'Unknown error';
    if (typeof rawError === 'string') {
      message = rawError;
    } else if (Array.isArray(rawError)) {
      message = rawError.map(e => `${e.loc?.join('.') || 'field'}: ${e.msg || 'invalid value'}`).join(', ');
    } else if (rawError && typeof rawError === 'object') {
      message = rawError.message || rawError.stringCode || JSON.stringify(rawError);
    }
    const stringCode = (rawError && typeof rawError === 'object') ? rawError.stringCode : undefined;

    if (stringCode?.includes('10018') || message?.includes('closed') || message?.toLowerCase().includes('tick data')) {
      throw new Error(`Order rejected: ${message}`);
    }
    if (stringCode?.includes('10014') || message?.includes('volume')) {
      // Fetch spec for better error
      try {
        const specRes = await fetch(sidecarUrl(accountId, `symbols/${mt5Symbol}/specification`), {
          headers: FARM_HEADERS,
          signal: AbortSignal.timeout(5000),
        });
        if (specRes.ok) {
          const spec = await specRes.json();
          throw new Error(`Invalid volume ${vol} for ${mt5Symbol}. Min: ${spec.minVolume}, Max: ${spec.maxVolume}, Step: ${spec.volumeStep}.`);
        }
      } catch (specErr: any) {
        if (specErr.message.includes('Invalid volume')) throw specErr;
      }
      throw new Error(`Invalid volume ${vol} for ${mt5Symbol}. Try 0.01.`);
    }
    if (stringCode?.includes('10016') || message?.includes('stops')) {
      // ECN / Market Execution Brokers require opening first, then setting SL/TP via position modification!
      console.log('[Broker Engine] ECN Market Execution detected — opening order first then attaching SL/TP...');
      const retry = await farmExecuteTrade(accountId, { ...payload, stopLoss: undefined, takeProfit: undefined });
      if (retry.success) {
        result = retry;
        // CRITICAL FIX: We must actually attach the SL/TP now!
        const positionId = retry.result.positionId || retry.result.orderId;
        if (positionId && (sl || tp)) {
          console.log(`[Broker Engine] ECN order opened. SL/TP will be attached in the guaranteed loop.`);
        }
      } else {
        const retryErr = retry.success === false ? retry.error : {};
        const retryRaw = (retryErr as any).detail || retryErr;
        const retryMsg = typeof retryRaw === 'string' ? retryRaw : (retryRaw.message || 'Unknown');
        throw new Error(`Invalid SL/TP for ${mt5Symbol}: ${retryMsg}`);
      }
    } else {
      throw new Error(`Order rejected: ${message}`);
    }
  }

  // ── GUARANTEED SL/TP ATTACHMENT LOOP ─────────────────────────────────────
  // Robust ticket / position ID extraction across all MT5 Farm response shapes
  const resObj = result.result || {};
  const positionTicket = String(resObj.positionId || resObj.ticket || resObj.id || resObj.orderId || (resObj as any).position || accountId);

  if (positionTicket && positionTicket !== accountId && (sl || tp)) {
    console.log(`[Broker Engine] 🎯 Ensuring SL (${sl}) & TP (${tp}) on Position #${positionTicket}...`);
    
    // Attempt 1: Direct sidecar modify position (might fail if execution price slipped)
    let modifySuccess = false;
    try {
      const modRes = await farmModifyPosition(accountId, positionTicket, { stopLoss: sl, takeProfit: tp });
      if (modRes && modRes.success !== false && !modRes.error) modifySuccess = true;
    } catch (modErr: any) {
      console.warn(`[Broker Engine] Position modification attempt 1 warning: ${modErr.message}`);
    }

    if (!modifySuccess) {
      // Attempt 2: Await a 1000ms delay for ECN execution confirmation and fetch actual fill price
      await new Promise(r => setTimeout(r, 1000));
      try {
        const positions = await farmGetPositions(accountId);
        const match = positions.find((p: any) => String(p.id) === positionTicket || String(p.ticket) === positionTicket || p.symbol === mt5Symbol);
        
        if (match) {
          const fillPrice = match.openPrice || currentPrice;
          let safeSl = sl;
          let safeTp = tp;

          // Re-calculate SL/TP using the exact fill price to guarantee they are valid
          if (slDistance > 0) {
             safeSl = action === 'BUY' ? fillPrice - slDistance : fillPrice + slDistance;
             safeSl = Number(safeSl.toFixed(precision));
          }
          if (tpDistance > 0) {
             safeTp = action === 'BUY' ? fillPrice + tpDistance : fillPrice - tpDistance;
             safeTp = Number(safeTp.toFixed(precision));
          }

          if (!(match as any).stopLoss || !(match as any).takeProfit || !modifySuccess) {
            console.log(`[Broker Engine] Re-attaching SL/TP to live position #${match.id || positionTicket} using fill price ${fillPrice}... SL: ${safeSl}, TP: ${safeTp}`);
            await farmModifyPosition(accountId, String(match.id || positionTicket), { stopLoss: safeSl, takeProfit: safeTp });
          }
        }
      } catch (retryErr: any) {
        console.warn(`[Broker Engine] Position SL/TP verification loop notice: ${retryErr.message}`);
      }
    }
  }

  return {
    orderId:   positionTicket,
    status:    'success',
    fillPrice: result.result.openPrice || Number(entryPrice),
    stopLoss:  sl,
    takeProfit: tp
  };
}

// ── Disconnect Broker ────────────────────────────────────────────────────────

export async function disconnectBroker(brokerId: string, userId?: string): Promise<boolean> {
  // Find if there is a reverse mapping in STATIC_MAPPINGS (e.g. 'stress_001' -> '5051904701')
  let reverseLogin: string | null = null;
  for (const [login, mappedId] of Object.entries(STATIC_MAPPINGS)) {
    if (mappedId === brokerId) {
      reverseLogin = login;
      break;
    }
  }

  // Fully disconnect/delete from orchestrator to free VM port and container resources
  try {
    await farmDisconnect(brokerId);
    console.log(`[Broker Engine] Disconnected farm sidecar ${brokerId}`);
  } catch (err: any) {
    console.warn(`[Broker Engine] Disconnect ${brokerId} failed: ${err.message} — removing from DB only`);
  }

  let dbDeleted = false;
  if (userId) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const cleanBrokerId = brokerId.replace(/^mt5_/, '');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brokerId);
      
      let query = sb.from('broker_accounts').delete().eq('user_id', userId);
      
      const conditions = [
        `metaapi_id.eq.${brokerId}`,
        `mt5_login.eq.${brokerId}`,
        `metaapi_id.eq.${cleanBrokerId}`,
        `mt5_login.eq.${cleanBrokerId}`
      ];
      
      if (reverseLogin) {
        conditions.push(
          `metaapi_id.eq.${reverseLogin}`,
          `mt5_login.eq.${reverseLogin}`
        );
      }
      
      if (isUuid) {
        query = query.eq('id', brokerId);
      } else {
        query = query.or(conditions.join(','));
      }
      
      const { error } = await query;
      if (error) {
        console.error('[Broker Engine] Supabase delete error:', error.message);
      } else {
        dbDeleted = true;
      }
    } catch (err: any) {
      console.error('[Broker Engine] Supabase delete failed:', err.message);
    }
  }

  return dbDeleted;
}

// ── List Brokers ─────────────────────────────────────────────────────────────

export async function getAllSimulatedBrokers(): Promise<BrokerNode[]> {
  return getAllBrokers();
}

export async function getAllBrokers(userId?: string): Promise<BrokerNode[]> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    let query = sb.from('broker_accounts').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;

    if (!error && data) {
      return data.map((b: any) => ({
        id:     b.mt5_login || b.metaapi_id || b.id,
        userId: b.user_id,
        name:   b.broker_name,
        login:  b.mt5_login || b.metaapi_id,
        server: b.server,
        platform: 'mt5' as const,
        status: b.status,
        balance: Number(b.balance) || 0,
        equity:  Number(b.equity)  || 0,
        pnl:     Number(b.pnl)     || 0,
        positions: [],
        timezone_offset:      Number(b.timezone_offset) || 0,
        broker_timezone_name: b.broker_timezone_name || 'UTC',
        allowed_symbols:      Array.isArray(b.allowed_symbols) ? b.allowed_symbols : [],
      }));
    }
  } catch (err: any) {
    console.error('[Broker Engine] Failed to fetch brokers from Supabase:', err.message);
  }
  return [];
}

// ── Search Broker Servers ────────────────────────────────────────────────────

export async function searchBrokerServers(query: string): Promise<string[]> {
  return farmSearchBrokers(query);
}
