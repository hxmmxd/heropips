/**
 * MT5 Farm Client — TradeGPT Proprietary MT5 Infrastructure
 *
 * Orchestrator: http://4.224.249.231:8080  — manages all sidecar processes
 * Sidecar:      via proxy at /accounts/{id}/proxy/{path}
 *
 * All requests require X-API-Key header.
 * This is the ONLY file that knows the farm URL and API key.
 */

export const FARM_BASE = process.env.MT5_FARM_ORCHESTRATOR_URL || 'http://4.224.249.231:8080';
export const FARM_KEY  = process.env.MT5_FARM_API_KEY || '99E23B08-3BBBFA50-7EE7609F-5C0AA0C2';
export const FARM_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-API-Key':    FARM_KEY,
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface FarmHealth {
  /** Overall health status */
  status:           string;
  total_accounts:   number;
  active:           number;
  hibernated:       number;
  /** Accounts currently transitioning from hibernate → connected */
  waking:           number;
  /** Accounts currently starting up (connecting to broker) */
  starting:         number;
  /** Live probe confirmed: these are numbers, NOT strings */
  ram_used_gb:      number;
  ram_free_gb:      number;
  ram_total_gb:     number;
  ram_pct:          number;
  /** Whether Windows Sandboxie is active for MT5 isolation */
  sandboxie:        boolean;
  /** Whether auto-hibernation feature is enabled */
  hibernation_on:   boolean;
  /** Minutes of inactivity before auto-hibernate */
  idle_timeout_min: number;
}

export interface FarmAccount {
  accountId:     string;
  login:         number;
  server:        string;
  label:         string;
  port:          number;
  /**
   * Fixed: farm now properly syncs status.
   * 202 responses during wake are handled as 'starting' by our route layer.
   */
  status:        'starting' | 'connected' | 'hibernated' | 'timeout' | 'failed';
  /** Populated from last sidecar sync — now always present after fix */
  balance:       number | null;
  /** Fixed Bug 6: equity now tracked and returned per account */
  equity:        number | null;
  currency:      string | null;
  name:          string | null;
  /** Fixed: now returned after Bug 1+6 fix */
  lastSyncedAt:  string | null;
  /** Fixed Bug 6: trading permissions now populated */
  tradeAllowed:  boolean | null;
  /** Fixed Bug 6 */
  tradeExpert:   boolean | null;
  /** Live ping timestamp from watchdog */
  lastPing:      string | null;
  /** Round-trip latency to MT5 server in milliseconds */
  pingLatencyMs: number | null;
  /** Unix epoch float timestamp of last API call to this account */
  last_activity?: number;
  /** Populated when status === 'failed' */
  failureCode?:   string | null;
  failureReason?: string | null;
  failedAt?:      string | null;
}


export interface AccountInfo {
  login:         number;
  name:          string;
  server:        string;
  broker:        string;
  currency:      string;
  leverage:      number;
  balance:       number;
  credit:        number;
  profit:        number;
  equity:        number;
  margin:        number;
  marginFree:    number;
  /** Farm Fix 9: alias for marginFree (MetaAPI-compatible name) */
  freeMargin:    number;
  marginLevel:   number;
  marginCall:    number;
  marginStopOut: number;
  tradeAllowed:  boolean;
  tradeExpert:   boolean;
  accountType:   string;
  /** Farm Fix 9: live position count */
  openPositions: number;
  /** Farm Fix 9: live pending order count */
  openOrders:    number;
  /** Farm Fix 9: ISO 8601 timestamp of last MT5 sync */
  lastSyncTime:  string;
}

export interface FarmPosition {
  id:           string;
  symbol:       string;
  volume:       number;
  type:         'POSITION_TYPE_BUY' | 'POSITION_TYPE_SELL';
  openPrice:    number;
  currentPrice: number;
  profit:       number;
  openTime:     string;
}

export interface FarmOrder {
  ticket:       number;
  symbol:       string;
  type:         string;
  volume:       number;
  price:        number;
  stopLoss:     number;
  takeProfit:   number;
}

export interface TradePayload {
  actionType:   'ORDER_TYPE_BUY' | 'ORDER_TYPE_SELL' | 'ORDER_TYPE_BUY_LIMIT' | 'ORDER_TYPE_SELL_LIMIT' | 'ORDER_TYPE_BUY_STOP' | 'ORDER_TYPE_SELL_STOP';
  symbol:       string;
  volume:       number;
  price?:       number;
  stopLoss?:    number;
  takeProfit?:  number;
  comment?:     string;
}

export interface TradeResult {
  /** Farm Fix 1: success flag now explicitly present */
  success?:    boolean;
  /** Farm Fix 1: string alias of orderId */
  id?:         string;
  orderId?:    string;
  positionId?: string;
  /** Farm Fix 1: integer MT5 ticket number */
  ticket?:     number;
  symbol?:     string;
  volume?:     number;
  price?:      number;
  openPrice?:  number;
  /** Farm Fix 1: type is 'position' for market orders, 'order' for pending */
  type?:       'position' | 'order';
  /** Farm Fix 1: ISO 8601 fill timestamp */
  openTime?:   string;
  retcode?:    number;
  comment?:    string;
}

export interface FarmTradeError {
  /** Now always present — farm fix resolved */
  success:      false;
  /** MT5 numeric return code */
  retcode:      number;
  /** Human-readable string code e.g. 'TRADE_RETCODE_10027' */
  stringCode:   string;
  /** Human-readable error message */
  message:      string;
}

export interface FarmDeal {
  ticket:       number;
  /** String alias of ticket */
  id:           string;
  order:        number;
  /** Links entry deal to exit deal */
  positionId:   string;
  orderId:      string;
  symbol:       string;
  type:         string;
  /** Simple 'BUY' | 'SELL' direction */
  direction:    'BUY' | 'SELL';
  entry:        'DEAL_ENTRY_IN' | 'DEAL_ENTRY_OUT' | 'DEAL_ENTRY_INOUT';
  price:        number;
  /** Alias of price */
  openPrice:    number;
  volume:       number;
  profit:       number;
  commission:   number;
  swap:         number;
  /** ISO 8601 timestamp with milliseconds e.g. "2026-06-20T08:00:00.000Z" */
  time:         string;
  /** Alias of time */
  openTime:     string;
  /** Broker-local time for the deal */
  brokerTime:   string;
  comment:      string;
  magic:        number;
}

export interface FarmAdminKey {
  id:           string;
  label:        string;
  rateLimit:    number;
  createdAt:    string;
}

export interface FarmAdminStats {
  totalRequests: number;
  errors:        Record<string, number>;
  activeKeys:    number;
}

export interface BrokerSearchResult {
  brokers: Array<{
    broker: string;
    servers: Array<{
      server: string;
    }>;
  }>;
}

// Static mapping for special account IDs (e.g. stress test accounts)
export const STATIC_MAPPINGS: Record<string, string> = {
  '5051904701': 'stress_001',
};

let accountIdCache: Record<string, string> = { ...STATIC_MAPPINGS };
let lastCacheFetch = 0;

/**
 * Resolves a broker database ID or login number to the orchestrator accountId.
 * Handles:
 * - Supabase UUIDs -> mt5_login
 * - mt5_login -> orchestrator accountId (using cache & orchestrator accounts query)
 */
export async function resolveAccountId(loginOrId: string | number): Promise<string> {
  let loginStr = String(loginOrId).trim();

  // 1. If it looks like a Supabase UUID, resolve it to mt5_login/metaapi_id first
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(loginStr)) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await sb
        .from('broker_accounts')
        .select('mt5_login, metaapi_id')
        .eq('id', loginStr)
        .maybeSingle();
      
      if (data?.mt5_login) {
        loginStr = String(data.mt5_login);
      } else if (data?.metaapi_id) {
        loginStr = String(data.metaapi_id);
      }
    } catch (err: any) {
      console.warn('[MT5 Farm] Failed to resolve UUID to login:', err.message);
    }
  }

  // 2. Check cache / static mappings
  if (accountIdCache[loginStr]) {
    return accountIdCache[loginStr];
  }

  // 3. Query orchestrator accounts to build mapping
  const now = Date.now();
  if (now - lastCacheFetch > 10000) { // 10s TTL
    try {
      const accounts = await farmGetAccounts();
      // Reset cache with static mappings
      accountIdCache = { ...STATIC_MAPPINGS };
      for (const acc of accounts) {
        if (acc.accountId && acc.login) {
          const loginKey = String(acc.login);
          // If a static mapping already exists for this login, don't overwrite it
          if (!STATIC_MAPPINGS[loginKey]) {
            accountIdCache[loginKey] = acc.accountId;
          }
          accountIdCache[acc.accountId] = acc.accountId;
        }
      }
      lastCacheFetch = now;
    } catch (err: any) {
      console.warn('[MT5 Farm] Failed to fetch accounts for resolveAccountId cache:', err.message);
    }
  }

  return accountIdCache[loginStr] || loginStr;
}

// ── Helper: proxied sidecar path ────────────────────────────────────────────

/**
 * Builds the orchestrator proxy URL for any sidecar endpoint.
 * All sidecar calls go via: /accounts/{id}/proxy/{sidecar_path}
 */
export function proxyUrl(accountId: string, sidecarPath: string): string {
  const resolved = STATIC_MAPPINGS[accountId] || accountId;
  return `${FARM_BASE}/accounts/${resolved}/proxy/${sidecarPath}`;
}

/**
 * Builds the proxied path for a MetaAPI-compatible sidecar endpoint.
 * Convenience wrapper — the sidecar always expects account_id in the path too.
 */
export function sidecarUrl(accountId: string, endpoint: string): string {
  const resolved = STATIC_MAPPINGS[accountId] || accountId;
  return proxyUrl(resolved, `users/current/accounts/${resolved}/${endpoint}`);
}

// ── Orchestrator Endpoints ───────────────────────────────────────────────────

/** GET /health — orchestrator system health */
export async function farmHealth(): Promise<FarmHealth> {
  const res = await fetch(`${FARM_BASE}/health`, {
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`[MT5 Farm] Health check failed: ${res.status}`);
  return res.json();
}

/** GET /accounts — all registered sidecar accounts */
export async function farmGetAccounts(): Promise<FarmAccount[]> {
  const res = await fetch(`${FARM_BASE}/accounts`, {
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`[MT5 Farm] Get accounts failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** GET /accounts/{id} — single account status. */
export async function farmGetAccount(accountId: string): Promise<FarmAccount> {
  const resolved = STATIC_MAPPINGS[accountId] || accountId;
  const res = await fetch(`${FARM_BASE}/accounts/${resolved}`, {
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`[MT5 Farm] Get account ${resolved} failed: ${res.status}`);
  return res.json();
}

/** POST /accounts — connect (spin up) a new MT5 sidecar. Returns immediately; poll for status. */
export async function farmConnectAccount(
  login: string | number,
  password: string,
  server: string,
  label?: string,
): Promise<FarmAccount> {
  const res = await fetch(`${FARM_BASE}/accounts`, {
    method: 'POST',
    headers: FARM_HEADERS,
    body: JSON.stringify({
      login: Number(login),
      password,
      server,
      label: label || `${login}`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`[MT5 Farm] Connect account failed: ${res.status} — ${err.detail || err.message || "Unknown error"}`);
  }
  return res.json();
}

/** DELETE /accounts/{id} — fully remove a sidecar and kill the MT5 process */
export async function farmDisconnect(accountId: string): Promise<void> {
  const resolved = STATIC_MAPPINGS[accountId] || accountId;
  const res = await fetch(`${FARM_BASE}/accounts/${resolved}`, {
    method: 'DELETE',
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`[MT5 Farm] Disconnect ${resolved} failed: ${res.status}`);
}

/** POST /accounts/{id}/hibernate — free RAM; auto-wakes on next API call */
export async function farmHibernate(accountId: string): Promise<void> {
  const resolved = STATIC_MAPPINGS[accountId] || accountId;
  const res = await fetch(`${FARM_BASE}/accounts/${resolved}/hibernate`, {
    method: 'POST',
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`[MT5 Farm] Hibernate ${resolved} failed: ${res.status}`);
}

/** POST /accounts/{id}/wake — manually wake a hibernated account */
export async function farmWake(accountId: string): Promise<void> {
  const resolved = STATIC_MAPPINGS[accountId] || accountId;
  const res = await fetch(`${FARM_BASE}/accounts/${resolved}/wake`, {
    method: 'POST',
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`[MT5 Farm] Wake ${resolved} failed: ${res.status}`);
}

// ── Sidecar Endpoints (proxied via Orchestrator) ─────────────────────────────

/** GET /account-information — balance, equity, margin, currency, leverage */
export async function farmGetAccountInfo(accountId: string): Promise<AccountInfo | null> {
  try {
    const resolvedId = await resolveAccountId(accountId);
    const res = await fetch(sidecarUrl(resolvedId, 'account-information'), {
      headers: FARM_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** GET /positions — all open positions */
export async function farmGetPositions(accountId: string): Promise<FarmPosition[]> {
  try {
    const resolvedId = await resolveAccountId(accountId);
    const res = await fetch(sidecarUrl(resolvedId, 'positions'), {
      headers: FARM_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** GET /orders — pending orders */
export async function farmGetOrders(accountId: string): Promise<FarmOrder[]> {
  try {
    const resolvedId = await resolveAccountId(accountId);
    const res = await fetch(sidecarUrl(resolvedId, 'orders'), {
      headers: FARM_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** GET /symbols — list of tradeable symbols */
export async function farmGetSymbols(accountId: string): Promise<string[]> {
  try {
    const resolvedId = await resolveAccountId(accountId);
    const res = await fetch(sidecarUrl(resolvedId, 'symbols'), {
      headers: FARM_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** GET /symbols/{symbol}/specification — contract spec */
export async function farmGetSymbolSpec(accountId: string, symbol: string): Promise<any | null> {
  try {
    const resolvedId = await resolveAccountId(accountId);
    const res = await fetch(sidecarUrl(resolvedId, `symbols/${symbol}/specification`), {
      headers: FARM_HEADERS,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * GET /history/deals — history deals by days or timestamp range.
 * Uses new API: ?days=30 or ?from_ts=...&to_ts=...
 */
export async function farmGetDeals(
  accountId: string,
  opts: { days?: number; fromTs?: number; toTs?: number; symbol?: string } = {},
): Promise<FarmDeal[]> {
  try {
    const resolvedId = await resolveAccountId(accountId);
    const params = new URLSearchParams();
    if (opts.days) params.set('days', String(opts.days));
    if (opts.fromTs) params.set('from_ts', String(opts.fromTs));
    if (opts.toTs) params.set('to_ts', String(opts.toTs));
    if (opts.symbol) params.set('symbol', opts.symbol);
    const qs = params.toString();
    const url = sidecarUrl(resolvedId, `history/deals${qs ? '?' + qs : ''}`);
    const res = await fetch(url, {
      headers: FARM_HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * POST /trade — execute market or pending order
 * Returns TradeResult on success, FarmTradeError on failure.
 */
export async function farmExecuteTrade(
  accountId: string,
  payload: TradePayload,
): Promise<{ success: true; result: TradeResult } | { success: false; error: FarmTradeError }> {
  const resolvedId = await resolveAccountId(accountId);
  const res = await fetch(sidecarUrl(resolvedId, 'trade'), {
    method: 'POST',
    headers: FARM_HEADERS,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();

  // Farm Fix 1: check `success: true` first (most reliable after the fix).
  // Also keep orderId/positionId check as belt-and-suspenders for older responses.
  if (data.success === true || data.orderId || data.positionId || data.id) {
    return {
      success: true,
      result: {
        ...data,
        // Normalise: ensure orderId and positionId are always populated
        orderId:    data.orderId    || data.id || String(data.ticket ?? ''),
        positionId: data.positionId || data.id || String(data.ticket ?? ''),
      } as TradeResult,
    };
  }

  // Failure — Farm Fix 3: error always has success:false + stringCode + message
  return {
    success: false,
    error: {
      success:    false,
      retcode:    data.retcode    ?? 0,
      stringCode: data.stringCode ?? 'TRADE_ERROR',
      message:    typeof data.message === 'string'
        ? data.message
        : data.detail?.message || data.detail || 'Order rejected by broker',
    } as FarmTradeError,
  };
}

/**
 * DELETE /positions/{ticket} — close a position (full or partial)
 */
export async function farmClosePosition(accountId: string, positionId: string, volume?: number): Promise<any> {
  const resolvedId = await resolveAccountId(accountId);
  const qs = volume ? `?volume=${volume}` : '';
  const res = await fetch(sidecarUrl(resolvedId, `positions/${positionId}${qs}`), {
    method: 'DELETE',
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  return res.json().catch(() => ({
    success: false,
  }));
}

/**
 * DELETE /positions — close all positions (optionally filter by symbol)
 */
export async function farmCloseAllPositions(accountId: string, symbol?: string): Promise<any> {
  const resolvedId = await resolveAccountId(accountId);
  const qs = symbol ? `?symbol=${symbol}` : '';
  const res = await fetch(sidecarUrl(resolvedId, `positions${qs}`), {
    method: 'DELETE',
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(20000),
  });
  return res.json().catch(() => ({
    closed: 0,
    results: [],
  }));
}

/**
 * PUT /positions/{ticket} — modify SL/TP on an open position
 */
export async function farmModifyPosition(accountId: string, positionId: string, opts: { stopLoss?: number; takeProfit?: number }): Promise<any> {
  const resolvedId = await resolveAccountId(accountId);
  const res = await fetch(sidecarUrl(resolvedId, `positions/${positionId}`), {
    method: 'PUT',
    headers: FARM_HEADERS,
    body: JSON.stringify(opts),
    signal: AbortSignal.timeout(10000),
  });
  return res.json().catch(() => ({
    success: false,
  }));
}

/**
 * DELETE /orders/{ticket} — cancel a pending order
 */
export async function farmCancelOrder(accountId: string, orderId: string): Promise<any> {
  const resolvedId = await resolveAccountId(accountId);
  const res = await fetch(sidecarUrl(resolvedId, `orders/${orderId}`), {
    method: 'DELETE',
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  return res.json().catch(() => ({
    success: false,
  }));
}

// ── Broker Search (via sidecar) ──────────────────────────────────────────────

/**
 * GET /brokers/search — search broker registry.
 * Uses the sidecar endpoint (not orchestrator).
 * Falls back to built-in list if farm not available.
 */
export async function farmSearchBrokers(
  query: string,
  type?: 'live' | 'demo',
): Promise<string[]> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (type)  params.set('type', type);

  // GET /brokers/search on the orchestrator — no active account needed.
  // Returns real server names from the MT5 community broker registry.
  const url = `${FARM_BASE}/brokers/search?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: FARM_HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data: BrokerSearchResult = await res.json();
      const servers: string[] = [];
      for (const broker of data.brokers || []) {
        for (const s of broker.servers || []) {
          servers.push(s.server);
        }
      }
      // Farm has real data — use it
      if (servers.length > 0) return servers;
    }
  } catch {
    // farm unreachable — fall through to verified baseline
  }

  const q = query.trim().toLowerCase();
  if (!q) {
    // No query — return all
    return Object.values(VERIFIED_SERVERS).flat();
  }

  const matched: string[] = [];
  for (const [key, servers] of Object.entries(VERIFIED_SERVERS)) {
    if (key.includes(q) || servers.some(s => s.toLowerCase().includes(q))) {
      matched.push(...servers);
    }
  }
  return matched;
}

// Verified real server names — sourced from MT5 terminal scans & broker documentation Scan.
// Only used when the farm registry hasn't indexed the broker yet.
// Farm live data always takes priority.
export const VERIFIED_SERVERS: Record<string, string[]> = {
  icmarkets: [
    "ICMarkets-Live01",
    "ICMarkets-Live02",
    "ICMarkets-Live03",
    "ICMarkets-Live04",
    "ICMarkets-Demo01",
    "ICMarkets-Live05",
    "ICMarkets-Live06",
    "ICMarkets-Live07",
    "ICMarkets-Live08",
    "ICMarkets-Live09",
    "ICMarkets-Live10",
    "ICMarkets-Live11",
    "ICMarkets-Live12",
    "ICMarkets-Live13",
    "ICMarkets-Live14",
    "ICMarkets-Live15",
    "ICMarkets-Live16",
    "ICMarkets-Live17",
    "ICMarkets-Live18",
    "ICMarkets-Live19",
    "ICMarkets-Live20",
    "ICMarkets-Demo02",
    "ICMarkets-Demo03",
    "ICMarkets-Demo04",
    "ICMarkets-Demo05"
  ],
  pepperstone: [
    "Pepperstone-Live",
    "Pepperstone-Demo01",
    "Pepperstone-Demo02",
    "Pepperstone-Live01",
    "Pepperstone-Live02",
    "Pepperstone-Live03",
    "Pepperstone-Live04",
    "Pepperstone-Live05",
    "Pepperstone-Live06",
    "Pepperstone-Live07",
    "Pepperstone-Live08",
    "Pepperstone-Live09",
    "Pepperstone-Live10"
  ],
  xm: [
    "XM.COM-Real 3",
    "XM.COM-Real 4",
    "XM.COM-Real 8",
    "XM.COM-Demo"
  ],
  exness: [
    "Exness-Trial",
    "Exness-Real",
    "Exness-Real2",
    "Exness-Real3",
    "Exness-Real4",
    "Exness-Real5"
  ],
  hfm: [
    "HFMarkets-Live Server",
    "HFMarkets-Demo Server"
  ],
  tickmill: [
    "Tickmill-Live",
    "Tickmill-Demo"
  ],
  admiralmarkets: [
    "AdmiralMarkets-Live",
    "AdmiralMarkets-Demo"
  ],
  fpmarkets: [
    "FPMarkets-Live",
    "FPMarkets-Demo"
  ],
  vantage: [
    "VantageInternational-Live",
    "VantageInternational-Live 2",
    "VantageInternational-Live 3",
    "VantageInternational-Live 4",
    "VantageInternational-Live 5",
    "VantageInternational-Live 6",
    "VantageInternational-Live 7",
    "VantageInternational-Live 8",
    "VantageInternational-Live 9",
    "VantageInternational-Live 10",
    "VantageInternational-Live 11",
    "VantageInternational-Live 12",
    "VantageInternational-Live 13",
    "VantageInternational-Live 14",
    "VantageInternational-Live 15",
    "VantageInternational-Live 16",
    "VantageInternational-Live 17",
    "VantageInternational-Live 18",
    "VantageInternational-Live 19",
    "VantageInternational-Live 20",
    "VantageInternational-Demo"
  ],
  lirunex: [
    "LirunexLimited-Live-MT5",
    "LirunexLimited-Demo"
  ],
  eightcap: [
    "Eightcap-Live",
    "Eightcap-Demo"
  ],
  axitrader: [
    "AxiTrader-Live",
    "AxiTrader-Demo"
  ],
  octafx: [
    "OctaFX-Real",
    "OctaFX-Demo"
  ],
  roboforex: [
    "RoboForex-ECN",
    "RoboForex-Demo"
  ],
  fxtm: [
    "ForexTime-Live",
    "ForexTime-Demo"
  ],
  fxpro: [
    "FxPro-MT5",
    "FxPro-MT5 Demo"
  ],
  thinkmarkets: [
    "ThinkMarkets-Live",
    "ThinkMarkets-Demo"
  ],
  blackbull: [
    "BlackBull-Live",
    "BlackBull-Demo"
  ],
  fusionmarkets: [
    "FusionMarkets-Live",
    "FusionMarkets-Demo"
  ],
  tmgm: [
    "TMGM-Live",
    "TMGM-Demo"
  ],
  gomarkets: [
    "GoMarkets-Live",
    "GoMarkets-Demo"
  ],
  blueberry: [
    "Blueberrymarkets-Live",
    "Blueberrymarkets-Demo"
  ],
  oanda: [
    "OANDA-v20 Live",
    "OANDA-v20 Practice"
  ],
  fbs: [
    "FBS-Real",
    "FBS-Demo"
  ],
  deriv: [
    "Deriv-Server",
    "Deriv-Demo"
  ]
};

/**
 * Custom registry lookup to verify broker servers locally.
 * Matches exact, case-insensitive, or regex patterns for major brokers.
 */
export function verifyServerLocally(serverName: string): { reachable: boolean; broker: string; type: 'live' | 'demo'; source: string } | null {
  const name = serverName.trim();
  const nameLower = name.toLowerCase();

  // 1. Check exact/case-insensitive matches in VERIFIED_SERVERS
  for (const [brokerKey, servers] of Object.entries(VERIFIED_SERVERS)) {
    if (servers.some(s => s.toLowerCase() === nameLower)) {
      const type = nameLower.includes("demo") || nameLower.includes("trial") || nameLower.includes("practice") ? "demo" : "live";
      const broker = brokerKey === "xm" ? "XM" : brokerKey === "hfm" ? "HFM" : brokerKey.charAt(0).toUpperCase() + brokerKey.slice(1);
      return {
        reachable: true,
        broker,
        type,
        source: "local_registry"
      };
    }
  }

  // 2. Check pattern matches for known major brokers
  // Vantage
  if (/^vantageinternational-live\s*\d*$/i.test(nameLower)) {
    return { reachable: true, broker: "Vantage", type: "live", source: "local_pattern" };
  }
  if (/^vantageinternational-demo\s*\d*$/i.test(nameLower)) {
    return { reachable: true, broker: "Vantage", type: "demo", source: "local_pattern" };
  }
  // ICMarkets
  if (/^icmarkets-live\s*\d*$/i.test(nameLower)) {
    return { reachable: true, broker: "ICMarkets", type: "live", source: "local_pattern" };
  }
  if (/^icmarkets-demo\s*\d*$/i.test(nameLower)) {
    return { reachable: true, broker: "ICMarkets", type: "demo", source: "local_pattern" };
  }
  // Pepperstone
  if (/^pepperstone-live\s*\d*$/i.test(nameLower)) {
    return { reachable: true, broker: "Pepperstone", type: "live", source: "local_pattern" };
  }
  if (/^pepperstone-demo\s*\d*$/i.test(nameLower)) {
    return { reachable: true, broker: "Pepperstone", type: "demo", source: "local_pattern" };
  }
  // Exness
  if (/^exness-real\s*\d*$/i.test(nameLower) || /^exness-mt5-real\s*\d*$/i.test(nameLower)) {
    return { reachable: true, broker: "Exness", type: "live", source: "local_pattern" };
  }
  if (/^exness-trial\s*\d*$/i.test(nameLower)) {
    return { reachable: true, broker: "Exness", type: "demo", source: "local_pattern" };
  }
  // XM
  if (/^xm\.com-real\s*\d*$/i.test(nameLower)) {
    return { reachable: true, broker: "XM", type: "live", source: "local_pattern" };
  }
  if (/^xm\.com-demo\s*\d*$/i.test(nameLower)) {
    return { reachable: true, broker: "XM", type: "demo", source: "local_pattern" };
  }

  return null;
}

/** GET /brokers/count — total brokers known to the farm registry */
export async function farmBrokersCount(): Promise<{ brokers: number; servers: number }> {
  try {
    const res = await fetch(`${FARM_BASE}/brokers/count`, {
      headers: FARM_HEADERS,
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return res.json();
  } catch {}
  return { brokers: 0, servers: 0 };
}

// ── Admin — Key Management ────────────────────────────────────────────────────

/** GET /admin/keys — list all API keys with usage stats */
export async function farmAdminListKeys(): Promise<FarmAdminKey[]> {
  const res = await fetch(`${FARM_BASE}/admin/keys`, {
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`[MT5 Farm Admin] List keys failed: ${res.status}`);
  return res.json();
}

/** POST /admin/keys — create a new API key */
export async function farmAdminCreateKey(label: string, rateLimit = 100): Promise<{ id: string; key: string; label: string }> {
  const res = await fetch(`${FARM_BASE}/admin/keys`, {
    method: 'POST',
    headers: FARM_HEADERS,
    body: JSON.stringify({ label, rate_limit: rateLimit }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`[MT5 Farm Admin] Create key failed: ${res.status}`);
  return res.json();
}

/** GET /admin/keys/{id}/full — get the full unmasked key value */
export async function farmAdminGetKeyFull(keyId: string): Promise<{ id: string; key: string; label: string }> {
  const res = await fetch(`${FARM_BASE}/admin/keys/${keyId}/full`, {
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`[MT5 Farm Admin] Get key failed: ${res.status}`);
  return res.json();
}

/** DELETE /admin/keys/{id} — revoke a key instantly */
export async function farmAdminRevokeKey(keyId: string): Promise<{ revoked: string; message: string }> {
  const res = await fetch(`${FARM_BASE}/admin/keys/${keyId}`, {
    method: 'DELETE',
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`[MT5 Farm Admin] Revoke key failed: ${res.status}`);
  return res.json();
}

/** GET /admin/stats — aggregate usage statistics across all keys */
export async function farmAdminGetStats(): Promise<FarmAdminStats> {
  const res = await fetch(`${FARM_BASE}/admin/stats`, {
    headers: FARM_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`[MT5 Farm Admin] Get stats failed: ${res.status}`);
  return res.json();
}
