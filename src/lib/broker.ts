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

      // Check if we already have an account with this login+server to avoid duplicates
      const existing = await api.metatraderAccountApi.getAccountsWithInfiniteScrollPagination({
        login: login,
        server: server,
      });

      let account: any;

      if (existing && existing.length > 0) {
        // Reuse existing account
        account = existing[0];
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
          type: 'cloud-g2',         // g2 is faster and cheaper per SDK docs
          platform: platform,
          login: login,
          password: password || '',
          server: server || '',
          magic: 0,                   // 0 = manual trades
          manualTrades: true,
          reliability: 'high',        // recommended for production
        });

        console.log(`[Broker Engine] Account created (${account.id}). Deploying...`);
        await account.deploy();
      }

      // Wait for connection to broker
      console.log(`[Broker Engine] Waiting for broker connection...`);
      await account.waitConnected();
      console.log(`[Broker Engine] Connected to ${platform.toUpperCase()} server.`);

      // Get account details via RPC
      const connection = account.getRPCConnection();
      await connection.connect();
      await connection.waitSynchronized();

      const details = await connection.getAccountInformation();

      const node: BrokerNode = {
        id: account.id,
        userId,
        name,
        login,
        server: server || '',
        platform,
        status: 'connected',
        balance: details.balance || 0,
        equity: details.equity || 0,
        pnl: (details.equity || 0) - (details.balance || 0),
        positions: [],
      };

      // Persist to local DB for quick lookups
      const currentList = readDb();
      const updatedList = currentList.filter(b => b.id !== node.id).concat(node);
      writeDb(updatedList);

      // Sync to Supabase broker_accounts if userId provided
      if (userId) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          // Upsert by metaapi_id to avoid duplicates
          const { error } = await sb.from('broker_accounts').upsert({
            user_id: userId,
            broker_name: details.broker || name,
            mt5_login: login,
            server: server || '',
            metaapi_id: account.id,
            status: 'connected',
            balance: details.balance || 0,
            equity: details.equity || 0,
            pnl: (details.equity || 0) - (details.balance || 0),
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'metaapi_id' });
          if (error) console.error('[Broker Engine] Supabase sync error:', error.message);
          else console.log('[Broker Engine] Synced to Supabase broker_accounts');
        } catch (syncErr: any) {
          console.error('[Broker Engine] Supabase sync failed:', syncErr.message);
          // Non-fatal — local DB still has the record
        }
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

      // Ensure it's deployed and connected
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

      const connection = account.getRPCConnection();
      await connection.connect();
      await connection.waitSynchronized();

      const details = await connection.getAccountInformation();
      const positions = await connection.getPositions();

      return {
        id,
        name: account.name,
        login: account.login,
        server: account.server,
        platform: account.platform || 'mt5',
        status: 'connected',
        balance: details.balance || 0,
        equity: details.equity || 0,
        pnl: (details.equity || 0) - (details.balance || 0),
        positions: positions.map((p: any) => ({
          id: p.id,
          symbol: p.symbol,
          type: p.type,
          volume: p.volume,
          openPrice: p.openPrice,
          currentPrice: p.currentPrice,
          profit: p.profit,
        })),
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
  let metaApiId = id;
  const localDb = readDb();
  const byId    = localDb.find(b => b.id === id);
  const byLogin = localDb.find(b => b.login === id);
  if (byId)         metaApiId = byId.id;
  else if (byLogin) metaApiId = byLogin.id;

  const mt5Symbol = normalizeMt5Symbol(symbol);
  const vol = Math.max(Number(volume) || 0.01, 0.01);
  const sl  = stopLoss   != null ? Number(stopLoss)   : undefined;
  const tp  = takeProfit != null ? Number(takeProfit)  : undefined;

  console.log(`[Broker Engine] REST ${action} ${vol} lot(s) ${mt5Symbol} → account ${metaApiId}`);
  if (sl) console.log(`  SL: ${sl}  TP: ${tp}`);

  const payload: Record<string, any> = {
    actionType: action === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
    symbol: mt5Symbol,
    volume: vol,
    comment: 'TradeGPT AI signal',
  };
  if (sl)  payload.stopLoss   = sl;
  if (tp)  payload.takeProfit = tp;

  const { status, data } = await restTrade(metaApiId, payload);

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
    if (code === 'TRADE_RETCODE_INVALID_VOLUME') {
      throw new Error(`Invalid volume ${vol} for ${mt5Symbol}. Minimum lot size may be different — try 0.01.`);
    }
    if (code === 'TRADE_RETCODE_INVALID_STOPS') {
      // Retry without SL/TP if stops are invalid
      console.log('[Broker Engine] Invalid stops, retrying without SL/TP...');
      delete payload.stopLoss;
      delete payload.takeProfit;
      const retry = await restTrade(metaApiId, payload);
      if (retry.data?.stringCode === 'TRADE_RETCODE_DONE') {
        return {
          orderId: retry.data.orderId || retry.data.positionId || metaApiId,
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
    orderId: data.orderId || data.positionId || metaApiId,
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
