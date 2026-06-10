/**
 * Broker Engine — MetaAPI MT4/MT5 integration
 *
 * Uses metaapi.cloud-sdk v29.x
 * - Account provisioning: createAccount → deploy → waitConnected
 * - RPC connection: getRPCConnection → connect → waitSynchronized
 * - Server search: REST API (SDK doesn't expose this method)
 */

import MetaApi from 'metaapi.cloud-sdk/node';

const token = process.env.META_API_TOKEN || '';
let metaApiInstance: any = null;

function getMetaApi() {
  if (!metaApiInstance && token) {
    try {
      metaApiInstance = new MetaApi(token);
      console.log('[Broker Engine] MetaAPI SDK initialized successfully.');
    } catch (error) {
      console.error('[Broker Engine] Failed to initialize MetaAPI SDK:', error);
    }
  }
  return metaApiInstance;
}

// Initialize immediately if token exists
getMetaApi();

export interface BrokerNode {
  id: string;
  userId?: string;
  name: string;
  login: string;
  server: string;
  platform: 'mt4' | 'mt5';
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  balance: number;
  equity: number;
  pnl: number;
  positions: any[];
  timezone_offset?: number;
  broker_timezone_name?: string;
  allowed_symbols?: string[];
}

import fs from 'fs';
import path from 'path';
import os from 'os';

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
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read brokers DB:', err);
    return [];
  }
}

function writeDb(brokers: BrokerNode[]) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(brokers, null, 2));
  } catch (err) {
    console.error('Failed to write brokers DB:', err);
  }
}

export async function syncBrokerToSupabase(node: BrokerNode, userId: string) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Use upsert keyed on (metaapi_id, user_id) to prevent duplicate rows.
    // Requires a UNIQUE constraint on (metaapi_id, user_id) in the DB.
    const { error } = await sb
      .from('broker_accounts')
      .upsert(
        {
          user_id: userId,
          metaapi_id: node.id,
          broker_name: node.name,
          mt5_login: node.login,
          server: node.server,
          status: node.status,
          balance: node.balance,
          equity: node.equity,
          pnl: node.pnl,
          timezone_offset: node.timezone_offset ?? 0.00,
          broker_timezone_name: node.broker_timezone_name ?? 'UTC',
          allowed_symbols: node.allowed_symbols ?? [],
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'metaapi_id,user_id' }
      );

    if (error) console.error('[Broker Engine] Supabase sync error:', error.message);
    else console.log('[Broker Engine] Synced to Supabase broker_accounts');
  } catch (syncErr: any) {
    console.error('[Broker Engine] Supabase sync failed:', syncErr.message);
  }
}

// ── Connect Broker ──────────────────────────────────────────

export async function connectBroker(
  name: string,
  login: string,
  password?: string,
  server?: string,
  userId?: string,
  platform: 'mt4' | 'mt5' = 'mt5',
): Promise<BrokerNode> {
  const api = getMetaApi();

  if (api) {
    try {
      console.log(`[Broker Engine] Connecting ${name} to ${platform.toUpperCase()} via MetaAPI...`);

      // Check if we already have an account with this login to avoid duplicates.
      // NOTE: AccountsFilter does NOT support login/server fields — use query string search
      // and filter client-side to match the specific login.
      const allAccounts = await api.metatraderAccountApi.getAccountsWithInfiniteScrollPagination({
        query: login, // searches over name, login, server
      });
      const existingMatch = allAccounts.find((a: any) => a.login === login);

      let account: any;

      if (existingMatch) {
        // Reuse existing account
        account = existingMatch;
        console.log(`[Broker Engine] Found existing account ${account.id}, reusing...`);

        // Redeploy if not deployed
        if (account.state !== 'DEPLOYED') {
          await account.deploy();
          await account.waitDeployed();
        }
      } else {
        // Create new account
        account = await api.metatraderAccountApi.createAccount({
          name: name,
          type: 'cloud-g2',   // faster and cheaper
          platform: platform, // 'mt4' | 'mt5' — valid Platform type
          login: login,
          password: password || '',
          server: server || '',
          magic: 0,           // must be 0 when manualTrades is true
          manualTrades: true,
          // reliability defaults to 'high' — no need to pass it explicitly
        });

        console.log(`[Broker Engine] Account created (${account.id}). Deploying...`);
        await account.deploy();
      }

      // ── Non-blocking REST approach ────────────────────────────────────────────
      // waitConnected() + waitSynchronized() block for 1–3 min on new accounts
      // and will always timeout on Vercel serverless (10–60s limit).
      // Instead: save immediately with 'connecting' status, then try to fetch
      // account info via the MetaAPI REST API (same as trade execution — no streaming needed).
      console.log(`[Broker Engine] Account deployed (${account.id}). Fetching info via REST...`);

      let balance = 0, equity = 0, brokerName = name;
      let timezoneOffset = 0;
      let brokerTimezoneName = 'UTC';
      let allowedSymbols: string[] = [];

      try {
        // Use REST endpoint — works without streaming sync, responds in ~1-2s
        const infoRes = await fetch(
          `${MT_CLIENT_BASE}/users/current/accounts/${account.id}/account-information`,
          { headers: { 'auth-token': token }, signal: AbortSignal.timeout(8000) }
        );
        if (infoRes.ok) {
          const info = await infoRes.json();
          balance = info.balance || 0;
          equity = info.equity || 0;
          brokerName = info.broker || name;
          console.log(`[Broker Engine] REST account info fetched — balance: ${balance}`);
        } else {
          // Account may still be initialising — non-fatal, status will be 'connecting'
          console.warn(`[Broker Engine] REST info not ready yet (${infoRes.status}), saving as connecting`);
        }
      } catch (restErr: any) {
        console.warn(`[Broker Engine] REST info fetch failed: ${restErr.message} — saving as connecting`);
      }

      try {
        const [timeRes, symbolsRes] = await Promise.all([
          fetch(
            `${MT_CLIENT_BASE}/users/current/accounts/${account.id}/server-time`,
            { headers: { 'auth-token': token }, signal: AbortSignal.timeout(8000) }
          ),
          fetch(
            `${MT_CLIENT_BASE}/users/current/accounts/${account.id}/symbols`,
            { headers: { 'auth-token': token }, signal: AbortSignal.timeout(10000) }
          )
        ]);

        if (timeRes.ok) {
          const timeInfo = await timeRes.json();
          if (timeInfo && timeInfo.brokerTime && timeInfo.time) {
            const brokerDate = new Date(timeInfo.brokerTime.replace(' ', 'T') + 'Z');
            const utcDate = new Date(timeInfo.time);
            const diffMs = brokerDate.getTime() - utcDate.getTime();
            timezoneOffset = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
            const sign = timezoneOffset >= 0 ? '+' : '';
            brokerTimezoneName = `UTC${sign}${timezoneOffset}`;
          }
        }

        if (symbolsRes.ok) {
          allowedSymbols = await symbolsRes.json();
        }
      } catch (restFetchErr: any) {
        console.warn(`[Broker Engine] Failed to fetch server time or symbols: ${restFetchErr.message}`);
      }

      const isConnected = balance > 0 || equity > 0;

      const node: BrokerNode = {
        id: account.id,
        userId,
        name,
        login,
        server: server || '',
        platform,
        status: isConnected ? 'connected' : 'connecting',
        balance,
        equity,
        pnl: equity - balance,
        positions: [],
        timezone_offset: timezoneOffset,
        broker_timezone_name: brokerTimezoneName,
        allowed_symbols: allowedSymbols,
      };

      // Persist to local DB for quick lookups
      const currentList = readDb();
      const updatedList = currentList.filter(b => b.id !== node.id).concat(node);
      writeDb(updatedList);

      // Sync to Supabase broker_accounts if userId provided
      if (userId) {
        await syncBrokerToSupabase(node, userId);
      }

      return node;
    } catch (err: any) {
      let errMsg: string;
      if (Array.isArray(err?.details)) {
        // MetaAPI returns details as an array of objects — extract readable messages
        errMsg = err.details
          .map((d: any) => d?.message || d?.type || JSON.stringify(d))
          .join('; ');
      } else {
        errMsg = err?.message || String(err);
      }
      console.error('[Broker Engine] Live connection failed:', errMsg, err);
      throw new Error(`Broker connection failed: ${errMsg}`);
    }
  }

  // ── No token / fallback simulation ──
  console.log(`[Broker Engine] No META_API_TOKEN — cannot connect to live broker.`);
  throw new Error('MetaAPI token not configured. Set META_API_TOKEN in environment.');
}

// ── Get Broker Details ──────────────────────────────────────

export async function getBrokerDetails(id: string): Promise<BrokerNode | null> {
  const api = getMetaApi();

  if (api) {
    try {
      const account = await api.metatraderAccountApi.getAccount(id);

      if (account.state !== 'DEPLOYED') {
        return {
          id,
          name: account.name,
          login: account.login,
          server: account.server,
          platform: account.platform || 'mt5',
          status: 'disconnected',
          balance: 0,
          equity: 0,
          pnl: 0,
          positions: [],
        };
      }

      // ── REST API — no streaming sync needed ──────────────────────────────────
      const headers = { 'auth-token': token };
      const base = `${MT_CLIENT_BASE}/users/current/accounts/${id}`;

      const [infoRes, posRes, timeRes, symbolsRes] = await Promise.all([
        fetch(`${base}/account-information`, { headers, signal: AbortSignal.timeout(8000) }),
        fetch(`${base}/positions`,           { headers, signal: AbortSignal.timeout(8000) }),
        fetch(`${base}/server-time`,         { headers, signal: AbortSignal.timeout(8000) }),
        fetch(`${base}/symbols`,             { headers, signal: AbortSignal.timeout(10000) }),
      ]);

      const info = infoRes.ok ? await infoRes.json() : {};
      const posData = posRes.ok ? await posRes.json() : [];
      const positions = Array.isArray(posData) ? posData : [];

      let timezoneOffset = 0;
      let brokerTimezoneName = 'UTC';
      let allowedSymbols: string[] = [];

      if (timeRes.ok) {
        const timeInfo = await timeRes.json();
        if (timeInfo && timeInfo.brokerTime && timeInfo.time) {
          const brokerDate = new Date(timeInfo.brokerTime.replace(' ', 'T') + 'Z');
          const utcDate = new Date(timeInfo.time);
          const diffMs = brokerDate.getTime() - utcDate.getTime();
          timezoneOffset = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
          const sign = timezoneOffset >= 0 ? '+' : '';
          brokerTimezoneName = `UTC${sign}${timezoneOffset}`;
        }
      }

      if (symbolsRes.ok) {
        allowedSymbols = await symbolsRes.json();
      }

      const balance = info.balance || 0;
      const equity  = info.equity  || 0;

      return {
        id,
        name:     account.name,
        login:    account.login,
        server:   account.server,
        platform: account.platform || 'mt5',
        status:   'connected',
        balance,
        equity,
        pnl: equity - balance,
        positions: positions.map((p: any) => ({
          id:           p.id,
          symbol:       p.symbol,
          type:         p.type,
          volume:       p.volume,
          openPrice:    p.openPrice,
          currentPrice: p.currentPrice,
          profit:       p.profit,
        })),
        timezone_offset: timezoneOffset,
        broker_timezone_name: brokerTimezoneName,
        allowed_symbols: allowedSymbols,
      };
    } catch (err) {
      console.error('[Broker Engine] Failed to get broker details:', err);
      return null;
    }
  }

  // Fallback to local DB
  return readDb().find(b => b.id === id) || null;
}

// ── Symbol normalization ─────────────────────────────────────

function normalizeMt5Symbol(symbol: string): string {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const aliases: Record<string, string> = {
    GOLD: 'XAUUSD', XAU: 'XAUUSD', BITCOIN: 'BTCUSD', BTC: 'BTCUSD',
    ETHEREUM: 'ETHUSD', ETH: 'ETHUSD', OIL: 'XTIUSD', USOIL: 'XTIUSD',
    WTIUSD: 'XTIUSD', NASDAQ: 'NAS100', DOW: 'US30', SP500: 'SPX500', SPY: 'SPX500',
  };
  return aliases[s] || s;
}

// ── Execute Order via REST API ───────────────────────────────
// Uses MetaAPI REST endpoint directly — no SDK streaming sync needed.
// This is ~2 seconds vs potentially 120s for streaming sync.

const MT_CLIENT_BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai';

async function restTrade(metaApiId: string, payload: object): Promise<any> {
  const res = await fetch(`${MT_CLIENT_BASE}/users/current/accounts/${metaApiId}/trade`, {
    method: 'POST',
    headers: { 'auth-token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, data };
}

export async function executeBrokerOrder(
  id: string,
  symbol: string,
  action: 'BUY' | 'SELL',
  volume: number | string,
  entryPrice: number | string,
  stopLoss?: number | string,
  takeProfit?: number | string,
): Promise<any> {
  if (!token) throw new Error('MetaAPI not configured — cannot execute orders.');

  // Resolve id: MetaAPI UUID or login number
  let metaapi_id = id;
  const localDb = readDb();
  const byId    = localDb.find(b => b.id === id);
  const byLogin = localDb.find(b => b.login === id);
  if (byId)         metaapi_id = byId.id;
  else if (byLogin) metaapi_id = byLogin.id;

  // Resolve exact symbol suffix/pattern from allowed_symbols
  let mt5Symbol = normalizeMt5Symbol(symbol);
  if (byId?.allowed_symbols && Array.isArray(byId.allowed_symbols)) {
    const normalizedBase = mt5Symbol;
    const exactMatch = byId.allowed_symbols.find(
      s => s.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalizedBase
    );
    if (exactMatch) {
      mt5Symbol = exactMatch;
    }
  }

  // Pre-trade margin check
  try {
    const infoRes = await fetch(
      `${MT_CLIENT_BASE}/users/current/accounts/${metaapi_id}/account-information`,
      { headers: { 'auth-token': token }, signal: AbortSignal.timeout(5000) }
    );
    if (infoRes.ok) {
      const info = await infoRes.json();
      const marginFree = info.marginFree ?? info.equity ?? 0;
      if (marginFree <= 0) {
        throw new Error(`Insufficient funds: account free margin/equity is ${marginFree}. Deposits or leverage adjustments are required.`);
      }
    }
  } catch (marginErr: any) {
    if (marginErr.message.includes('Insufficient funds:')) throw marginErr;
    console.warn(`[Broker Engine] Pre-trade margin check bypassed: ${marginErr.message}`);
  }

  const vol = Math.max(Number(volume) || 0.01, 0.01);
  const sl  = stopLoss   != null ? Number(stopLoss)   : undefined;
  const tp  = takeProfit != null ? Number(takeProfit)  : undefined;

  console.log(`[Broker Engine] REST ${action} ${vol} lot(s) ${mt5Symbol} → account ${metaapi_id}`);
  if (sl) console.log(`  SL: ${sl}  TP: ${tp}`);

  const payload: Record<string, any> = {
    actionType: action === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
    symbol: mt5Symbol,
    volume: vol,
    comment: 'TradeGPT AI signal',
  };
  if (sl)  payload.stopLoss   = sl;
  if (tp)  payload.takeProfit = tp;

  const { status, data } = await restTrade(metaapi_id, payload);

  console.log(`[Broker Engine] REST response (${status}):`, JSON.stringify(data));

  // Handle error response codes from MT5
  if (data?.stringCode && data.stringCode !== 'TRADE_RETCODE_DONE') {
    const code = data.stringCode;
    const msg  = data.message || code;

    if (code === 'TRADE_RETCODE_MARKET_CLOSED') {
      throw new Error(`Market is closed for ${mt5Symbol}. Forex/Gold/Stocks close on weekends (Sat–Sun UTC). Crypto pairs (BTCUSD) are open 24/7 — try a crypto signal.`);
    }
    if (code === 'SYMBOL_TRADE_MODE_DISABLED') {
      throw new Error(`Trading is disabled for ${mt5Symbol} on this account. Try a different instrument.`);
    }
    if (code === 'TRADE_RETCODE_INVALID_VOLUME' || msg.includes('volume') || msg.includes('Volume')) {
      try {
        const specRes = await fetch(
          `${MT_CLIENT_BASE}/users/current/accounts/${metaapi_id}/symbols/${mt5Symbol}/specification`,
          { headers: { 'auth-token': token }, signal: AbortSignal.timeout(5000) }
        );
        if (specRes.ok) {
          const spec = await specRes.json();
          throw new Error(`Invalid volume ${vol} for ${mt5Symbol}. Broker limits: Minimum lot is ${spec.minVolume || 0.01}, Maximum lot is ${spec.maxVolume || 100}, Volume step size is ${spec.volumeStep || 0.01}.`);
        }
      } catch (specErr: any) {
        if (specErr.message.includes('Broker limits:')) throw specErr;
      }
      throw new Error(`Invalid volume ${vol} for ${mt5Symbol}. Minimum lot size may be different — try 0.01.`);
    }
    if (code === 'TRADE_RETCODE_INVALID_STOPS') {
      // Retry without SL/TP if stops are invalid
      console.log('[Broker Engine] Invalid stops, retrying without SL/TP...');
      delete payload.stopLoss;
      delete payload.takeProfit;
      const retry = await restTrade(metaapi_id, payload);
      if (retry.data?.stringCode === 'TRADE_RETCODE_DONE') {
        return {
          orderId: retry.data.orderId || retry.data.positionId || metaapi_id,
          status: 'success',
          fillPrice: retry.data.openPrice || Number(entryPrice),
        };
      }
      throw new Error(`Invalid stop-loss/take-profit levels for ${mt5Symbol}: ${retry.data?.message}`);
    }
    throw new Error(`Order rejected: ${msg} (${code})`);
  }

  if (status !== 200 && status !== 201) {
    throw new Error(`Broker API error ${status}: ${data?.message || JSON.stringify(data).slice(0, 100)}`);
  }

  return {
    orderId: data.orderId || data.positionId || metaapi_id,
    status: 'success',
    fillPrice: data.openPrice || Number(entryPrice),
  };
}

// ── Disconnect Broker ───────────────────────────────────────


export async function disconnectBroker(brokerId: string, userId?: string): Promise<boolean> {
  const api = getMetaApi();

  if (api) {
    try {
      const account = await api.metatraderAccountApi.getAccount(brokerId);
      if (account) {
        // Undeploy stops the cloud server (saves credits)
        await account.undeploy();
        console.log(`[Broker Engine] Undeployed MetaAPI account ${brokerId}`);
      }
    } catch (err) {
      console.error('[Broker Engine] Failed to undeploy account:', err);
    }
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
      const { error } = await sb
        .from('broker_accounts')
        .delete()
        .eq('metaapi_id', brokerId)
        .eq('user_id', userId);
      if (error) console.error('[Broker Engine] Supabase delete error:', error.message);
      else console.log('[Broker Engine] Deleted from Supabase broker_accounts');
    } catch (err: any) {
      console.error('[Broker Engine] Supabase delete failed:', err.message);
    }
  }

  if (filtered.length === list.length) return false;
  writeDb(filtered);
  console.log(`[Broker Engine] Removed broker ${brokerId} from local DB`);
  return true;
}

// ── List Brokers ────────────────────────────────────────────

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
          id: b.metaapi_id || b.id,
          userId: b.user_id,
          name: b.broker_name,
          login: b.mt5_login,
          server: b.server,
          platform: 'mt5',
          status: b.status,
          balance: Number(b.balance) || 0,
          equity: Number(b.equity) || 0,
          pnl: Number(b.pnl) || 0,
          positions: [],
          timezone_offset: Number(b.timezone_offset) || 0,
          broker_timezone_name: b.broker_timezone_name || 'UTC',
          allowed_symbols: Array.isArray(b.allowed_symbols) ? b.allowed_symbols : [],
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

// ── Search Broker Servers ───────────────────────────────────

/**
 * Search for MT4/MT5 broker servers.
 * The SDK doesn't have a `searchServers` method, so we use the REST API directly.
 */
export async function searchBrokerServers(query: string): Promise<string[]> {
  if (token && query.trim().length >= 2) {
    try {
      console.log(`[Broker Engine] Searching MetaAPI for servers matching: ${query}`);

      // Use the provisioning REST API directly
      const res = await fetch(
        `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/servers/mt5?searchQuery=${encodeURIComponent(query)}`,
        { headers: { 'auth-token': token } },
      );

      if (res.ok) {
        const data = await res.json();
        // Response is an array of { name, ... } objects or just strings
        if (Array.isArray(data)) {
          return data.map((s: any) => typeof s === 'string' ? s : s.name).filter(Boolean);
        }
      }

      // Try mt4 as well
      const res4 = await fetch(
        `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/servers/mt4?searchQuery=${encodeURIComponent(query)}`,
        { headers: { 'auth-token': token } },
      );

      if (res4.ok) {
        const data = await res4.json();
        if (Array.isArray(data)) {
          return data.map((s: any) => typeof s === 'string' ? s : s.name).filter(Boolean);
        }
      }
    } catch (err) {
      console.error('[Broker Engine] Server search failed:', err);
    }
  }

  // Fallback: curated server list
  const SUGGESTED_SERVERS = [
    'VantageInternational-Live', 'VantageInternational-Demo',
    'ICMarketsSC-Live', 'ICMarketsSC-Demo',
    'AxiTrader-Live', 'AxiTrader-Demo',
    'Pepperstone-Live', 'Pepperstone-Demo',
    'MetaQuotes-Demo',
    'OANDA-Live', 'OANDA-Demo',
    'XM.COM-Live', 'XM.COM-Demo',
    'Exness-Live', 'Exness-Demo',
    'FBS-Live', 'FBS-Demo',
    'FxPro-Live-01', 'FxPro-Demo-01',
    'RoboForex-Live', 'RoboForex-Demo',
    'AdmiralMarkets-Live', 'AdmiralMarkets-Demo',
    'FPMarkets-Live', 'FPMarkets-Demo',
    'Tickmill-Live', 'Tickmill-Demo',
    'FXTM-Live', 'FXTM-Demo',
    'AvaTrade-Act-Live', 'AvaTrade-Act-Demo',
    'OctaFX-Real-1', 'OctaFX-Demo-1',
    'ThinkMarkets-Live', 'ThinkMarkets-Demo',
    'Swissquote-Live', 'Swissquote-Demo',
    'Deriv-Server', 'Deriv-Demo',
    'FXChoice-Live', 'FXChoice-Demo',
    'Hantec-Live', 'Hantec-Demo',
    'VTMarkets-Live', 'VTMarkets-Demo',
    'ACY-Live', 'ACY-Demo',
    'BlackBull-Live', 'BlackBull-Demo',
    'Eightcap-Live', 'Eightcap-Demo',
    'InteractiveBrokers-Live', 'InteractiveBrokers-Demo',
  ];

  if (!query.trim()) return SUGGESTED_SERVERS;
  return SUGGESTED_SERVERS.filter(srv => srv.toLowerCase().includes(query.toLowerCase()));
}
