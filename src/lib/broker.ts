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

import fs   from 'fs';
import path from 'path';
import os   from 'os';

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
  farmSearchBrokers,
  type FarmAccount,
  type TradePayload,
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

// ── Local JSON DB (fast lookup cache) ───────────────────────────────────────

const DB_FILE = process.env.VERCEL || process.env.NODE_ENV === 'production'
  ? path.join(os.tmpdir(), 'brokers_db.json')
  : path.join(process.cwd(), 'src/lib/brokers_db.json');

function readDb(): BrokerNode[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
      return [];
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeDb(brokers: BrokerNode[]) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(brokers, null, 2));
  } catch (err) {
    console.error('[Broker Engine] Failed to write brokers DB:', err);
  }
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

export function getNormalizedSymbolForBroker(symbol: string, brokerIdOrLogin: string): string {
  let mt5Symbol = normalizeMt5Symbol(symbol);
  const localDb = readDb();
  const broker = localDb.find(b => b.id === brokerIdOrLogin || b.login === brokerIdOrLogin);
  if (broker?.allowed_symbols?.length) {
    const exact = broker.allowed_symbols.find(
      s => {
        const cleanS = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const cleanRootS = s.toUpperCase().split('.')[0].replace(/[^A-Z0-9]/g, '');
        return cleanS === mt5Symbol || cleanRootS === mt5Symbol;
      }
    );
    if (exact) mt5Symbol = exact;
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

  // ── IMPORTANT: Do NOT call farmGetAccountInfo immediately after farmConnectAccount.
  // The sidecar is guaranteed to be in 'starting' state right after POST /accounts.
  // Calling account-information will return HTTP 503 or 500 every time.
  // The polling flow in page.tsx (startBalancePoll) will pick up the real balance
  // once the sidecar finishes connecting to the broker (~15-90 seconds).
  console.log(`[Broker Engine] Sidecar created for ${login} — status: ${farmAccount.status}. Balance will populate via polling.`);

  // Try to pre-fetch symbols in the background (non-blocking, often still unavailable)
  let allowedSymbols: string[] = [];
  farmGetSymbols(accountId).then(s => {
    if (s.length > 0) {
      allowedSymbols = s;
      // Update DB if we got symbols
      const list = readDb();
      const existing = list.find(b => b.id === accountId);
      if (existing) {
        writeDb(list.map(b => b.id === accountId ? { ...b, allowed_symbols: s } : b));
      }
    }
  }).catch(() => {});

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
    allowed_symbols:      allowedSymbols,
  };

  // Cache locally
  const list = readDb();
  writeDb(list.filter(b => b.id !== node.id).concat(node));

  // Sync to Supabase
  if (userId) await syncBrokerToSupabase(node, userId);

  return node;
}

// ── Get Broker Details ───────────────────────────────────────────────────────

export async function getBrokerDetails(id: string): Promise<BrokerNode | null> {
  const localDb = readDb();
  const byId = localDb.find(b => b.id === id);
  const byLogin = localDb.find(b => b.login === id);
  const accountId = byId?.login || byLogin?.login || id;

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
          const local = localDb.find(b => b.id === id || b.login === id);
          const node: BrokerNode = {
            id,
            userId: local?.userId,
            name:   farmAcct.name || local?.name || String(id),
            login:  String(farmAcct.login || local?.login || id),
            server: farmAcct.server || local?.server || '',
            platform: 'mt5',
            status: farmAcct.status === 'connected' ? 'connected' : 'connecting',
            balance: farmAcct.balance,
            equity:  farmAcct.balance,
            pnl:     0,
            positions: [],
            timezone_offset:      local?.timezone_offset ?? 0,
            broker_timezone_name: local?.broker_timezone_name ?? 'UTC',
            allowed_symbols:      local?.allowed_symbols ?? [],
          };
          // Sync it back to local DB cache
          const list = readDb();
          writeDb(list.filter(b => b.id !== id).concat(node));
          return node;
        }
      } catch (err: any) {
        console.warn(`[Broker Engine] Failed to fetch fallback account from orchestrator: ${err.message}`);
      }

      // Try local DB as ultimate fallback
      return readDb().find(b => b.id === id) || null;
    }

    const balance = info.balance ?? 0;
    const equity  = info.equity  ?? 0;

    const local = readDb().find(b => b.id === id);

    return {
      id,
      userId: local?.userId,
      name:   info.name   || local?.name   || String(id),
      login:  String(info.login || local?.login || id),
      server: info.server || local?.server || '',
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
      timezone_offset:      local?.timezone_offset ?? 0,
      broker_timezone_name: local?.broker_timezone_name ?? 'UTC',
      allowed_symbols:      symbols.length > 0 ? symbols : (local?.allowed_symbols ?? []),
    };
  } catch (err: any) {
    console.error('[Broker Engine] getBrokerDetails error:', err.message);
    return readDb().find(b => b.id === id) || null;
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
): Promise<any> {
  // Resolve account ID: might be brokerId (UUID), login, or the id itself
  const localDb  = readDb();
  const byId     = localDb.find(b => b.id === id);
  const byLogin  = localDb.find(b => b.login === id);
  const accountId = byId?.login || byLogin?.login || id;

  // Pre-trade margin check
  let liveEquity = 0;
  let liveBalance = 0;
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

  // ── Risk Governor: Last Line of Defense ──────────────────────────
  try {
    const riskState = await getRiskState(accountId);
    if (riskState) {
      // Update risk metrics with live equity
      const updated = updateRiskMetrics(riskState, liveEquity || riskState.currentEquity, liveBalance || riskState.dailyStartBalance);
      const { multipliers } = evaluateAllRiskGates(updated);

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

  // Resolve symbol with allowed_symbols suffix matching
  let mt5Symbol = getNormalizedSymbolForBroker(symbol, accountId);

  const vol = Math.max(Number(volume) || 0.01, 0.01);
  const sl  = stopLoss   != null ? Number(stopLoss)   : undefined;
  const tp  = takeProfit != null ? Number(takeProfit)  : undefined;

  console.log(`[Broker Engine] MT5 Farm ${action} ${vol} lot(s) ${mt5Symbol} → account ${accountId}`);

  const payload: TradePayload = {
    actionType: action === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
    symbol:     mt5Symbol,
    volume:     vol,
    comment:    'TradeGPT AI signal',
  };
  if (sl) payload.stopLoss   = sl;
  if (tp) payload.takeProfit = tp;

  const result = await farmExecuteTrade(accountId, payload);

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
      // Retry without SL/TP
      console.log('[Broker Engine] Invalid stops — retrying without SL/TP...');
      const retry = await farmExecuteTrade(accountId, { ...payload, stopLoss: undefined, takeProfit: undefined });
      if (retry.success) {
        return {
          orderId:   retry.result.orderId || retry.result.positionId || accountId,
          status:    'success',
          fillPrice: retry.result.openPrice || Number(entryPrice),
        };
      }
      const retryErr = retry.success === false ? retry.error : {};
      const retryRaw = (retryErr as any).detail || retryErr;
      const retryMsg = typeof retryRaw === 'string' ? retryRaw : (retryRaw.message || 'Unknown');
      throw new Error(`Invalid SL/TP for ${mt5Symbol}: ${retryMsg}`);
    }

    throw new Error(`Order rejected: ${message}`);
  }

  return {
    orderId:   result.result.orderId || result.result.positionId || accountId,
    status:    'success',
    fillPrice: result.result.openPrice || Number(entryPrice),
  };
}

// ── Disconnect Broker ────────────────────────────────────────────────────────

export async function disconnectBroker(brokerId: string, userId?: string): Promise<boolean> {
  // Fully disconnect/delete from orchestrator to free VM port and container resources
  try {
    await farmDisconnect(brokerId);
    console.log(`[Broker Engine] Disconnected farm sidecar ${brokerId}`);
  } catch (err: any) {
    console.warn(`[Broker Engine] Disconnect ${brokerId} failed: ${err.message} — removing from DB only`);
  }

  // Remove from local DB
  const list = readDb();
  const filtered = list.filter(b => {
    if (b.id !== brokerId) return true;
    if (userId && b.userId && b.userId !== userId) return true;
    return false;
  });

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
      if (isUuid) {
        query = query.eq('id', brokerId);
      } else {
        query = query.or(`metaapi_id.eq.${brokerId},mt5_login.eq.${brokerId},metaapi_id.eq.${cleanBrokerId},mt5_login.eq.${cleanBrokerId}`);
      }
      const { error } = await query;
      if (error) console.error('[Broker Engine] Supabase delete error:', error.message);
    } catch (err: any) {
      console.error('[Broker Engine] Supabase delete failed:', err.message);
    }
  }

  if (filtered.length === list.length) return false;
  writeDb(filtered);
  return true;
}

// ── List Brokers ─────────────────────────────────────────────────────────────

export function getAllSimulatedBrokers(): BrokerNode[] {
  return readDb();
}

export async function getAllBrokers(userId?: string): Promise<BrokerNode[]> {
  if (userId) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data, error } = await sb
        .from('broker_accounts')
        .select('*')
        .eq('user_id', userId);

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
  }

  const all = readDb();
  if (userId) return all.filter(b => b.userId === userId);
  return all;
}

// ── Search Broker Servers ────────────────────────────────────────────────────

export async function searchBrokerServers(query: string): Promise<string[]> {
  return farmSearchBrokers(query);
}
