import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const MT_CLIENT_BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai';
const token = process.env.META_API_TOKEN || '';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes — saves MetaAPI credits

let _admin: any = null;
function getAdmin() {
  if (!_admin) {
    _admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

async function resolveMetaApiId(brokerId: string): Promise<string> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const DB_FILE = process.env.VERCEL || process.env.NODE_ENV === 'production'
      ? path.join(os.tmpdir(), 'brokers_db.json')
      : path.join(process.cwd(), 'src/lib/brokers_db.json');
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      const match = data.find((b: any) => b.id === brokerId || b.login === brokerId);
      if (match) return match.id;
    }
  } catch {}
  return brokerId;
}

function computeStats(deals: any[]) {
  if (deals.length === 0) {
    return {
      netProfit: 0, totalVolume: 0, winRate: 0, wins: 0, losses: 0,
      avgWin: 0, avgLoss: 0, bestTrade: 0, worstTrade: 0,
      maxWinStreak: 0, maxLossStreak: 0, totalCommission: 0, totalSwap: 0,
      profitFactor: 0, expectancy: 0, sharpe: 0, sortino: 0,
      maxDrawdown: 0, recoveryFactor: 0, avgTrade: 0, samples: 0,
    };
  }

  const profits = deals.map(d => d.profit || 0);
  const wins = profits.filter(p => p > 0);
  const losses = profits.filter(p => p < 0);
  const netProfit = profits.reduce((a, b) => a + b, 0);
  const totalVolume = deals.reduce((a, d) => a + (d.volume || 0), 0);
  const totalCommission = deals.reduce((a, d) => a + (d.commission || 0), 0);
  const totalSwap = deals.reduce((a, d) => a + (d.swap || 0), 0);

  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
  const worstTrade = profits.length > 0 ? Math.min(...profits) : 0;

  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
  for (const p of profits) {
    if (p > 0) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
    else if (p < 0) { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
    else { curWin = 0; curLoss = 0; }
  }

  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
  const expectancy = deals.length > 0 ? netProfit / deals.length : 0;

  const mean = profits.reduce((a, b) => a + b, 0) / profits.length;
  const variance = profits.reduce((a, p) => a + Math.pow(p - mean, 2), 0) / profits.length;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? mean / stdDev : 0;

  const downsideVariance = profits.reduce((a, p) => {
    const diff = Math.min(0, p - mean);
    return a + diff * diff;
  }, 0) / profits.length;
  const sortino = Math.sqrt(downsideVariance) > 0 ? mean / Math.sqrt(downsideVariance) : 0;

  let peak = 0, maxDD = 0, cumulative = 0;
  for (const p of profits) {
    cumulative += p;
    if (cumulative > peak) peak = cumulative;
    const dd = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  }

  // Recovery factor = net profit / max drawdown in dollars
  const maxDDDollars = peak > 0 ? peak * (maxDD / 100) : 0;
  const recoveryFactor = maxDDDollars > 0 ? netProfit / maxDDDollars : 0;

  return {
    netProfit: Math.round(netProfit * 100) / 100,
    totalVolume: Math.round(totalVolume * 100) / 100,
    winRate: deals.length > 0 ? Math.round((wins.length / deals.length) * 1000) / 10 : 0,
    wins: wins.length,
    losses: losses.length,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    bestTrade: Math.round(bestTrade * 100) / 100,
    worstTrade: Math.round(worstTrade * 100) / 100,
    maxWinStreak, maxLossStreak,
    totalCommission: Math.round(totalCommission * 100) / 100,
    totalSwap: Math.round(totalSwap * 100) / 100,
    profitFactor: profitFactor === Infinity ? Infinity : Math.round(profitFactor * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    maxDrawdown: Math.round(maxDD * 10) / 10,
    recoveryFactor: Math.round(recoveryFactor * 100) / 100,
    avgTrade: Math.round(expectancy * 100) / 100,
    samples: profits.length,
  };
}

// ── Sync deals to Supabase ──
async function syncDealsToDb(userId: string, brokerId: string, closedTrades: any[]) {
  if (closedTrades.length === 0) return;
  const admin = getAdmin();

  const rows = closedTrades.map(d => ({
    user_id: userId,
    broker_id: brokerId,
    deal_id: d.id,
    symbol: d.symbol,
    type: d.type,
    volume: d.volume,
    profit: d.profit,
    commission: d.commission,
    swap: d.swap,
    entry_price: d.entryPrice,
    exit_price: d.exitPrice,
    open_time: d.openTime || null,
    close_time: d.closeTime || null,
    position_id: d.positionId || null,
  }));

  // Upsert — skip duplicates based on deal_id
  const { error } = await admin
    .from('closed_deals')
    .upsert(rows, { onConflict: 'deal_id', ignoreDuplicates: true });

  if (error) console.error('[Deals Sync] Upsert error:', error.message);
}

// ── Save daily snapshot ──
async function saveDailySnapshot(userId: string, brokerId: string, info: any, positions: any[], closedDeals: any[]) {
  const admin = getAdmin();
  const today = new Date().toISOString().split('T')[0];
  
  const openPnl = positions.reduce((a: number, p: any) => a + (p.profit || 0), 0);
  const netProfit = closedDeals.reduce((a: number, d: any) => a + (d.profit || 0), 0);
  const winsCount = closedDeals.filter((d: any) => d.profit > 0).length;
  const winRate = closedDeals.length > 0 ? (winsCount / closedDeals.length) * 100 : 0;

  const { error } = await admin
    .from('daily_snapshots')
    .upsert({
      user_id: userId,
      broker_id: brokerId,
      date: today,
      balance: info.balance || 0,
      equity: info.equity || info.balance || 0,
      margin: info.margin || 0,
      open_positions: positions.length,
      open_pnl: Math.round(openPnl * 100) / 100,
      net_profit_closed: Math.round(netProfit * 100) / 100,
      total_trades: closedDeals.length,
      win_rate: Math.round(winRate * 10) / 10,
    }, { onConflict: 'user_id,broker_id,date' });

  if (error) console.error('[Snapshot] Error:', error.message);
}

// ── Cache stats ──
async function cacheStats(userId: string, brokerId: string, period: string, stats: any, dealsCount: number) {
  const admin = getAdmin();
  const { error } = await admin
    .from('risk_stats_cache')
    .upsert({
      user_id: userId,
      broker_id: brokerId,
      period,
      stats_json: stats,
      deals_count: dealsCount,
      last_synced: new Date().toISOString(),
    }, { onConflict: 'user_id,broker_id,period' });

  if (error) console.error('[Cache] Error:', error.message);
}

// ── Check cache freshness ──
async function getCachedStats(userId: string, brokerId: string, period: string) {
  const admin = getAdmin();
  const { data } = await admin
    .from('risk_stats_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('broker_id', brokerId)
    .eq('period', period)
    .single();

  if (!data) return null;

  const age = Date.now() - new Date(data.last_synced).getTime();
  if (age > CACHE_TTL_MS) return null; // stale

  return data;
}

// ── Get deals from DB ──
async function getDealsFromDb(userId: string, brokerId: string, startTime: string) {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('closed_deals')
    .select('*')
    .eq('user_id', userId)
    .eq('broker_id', brokerId)
    .gte('close_time', startTime)
    .order('close_time', { ascending: false });

  if (error) {
    console.error('[DB Deals] Error:', error.message);
    return [];
  }

  return (data || []).map((d: any) => ({
    id: d.deal_id,
    symbol: d.symbol,
    type: d.type,
    volume: d.volume,
    profit: d.profit,
    commission: d.commission,
    swap: d.swap,
    entryPrice: d.entry_price,
    exitPrice: d.exit_price,
    openTime: d.open_time,
    closeTime: d.close_time,
    positionId: d.position_id,
  }));
}

// ── Get equity curve from daily snapshots ──
async function getEquityCurveFromDb(userId: string, brokerId: string, startDate: string) {
  const admin = getAdmin();
  const { data } = await admin
    .from('daily_snapshots')
    .select('date, equity, balance')
    .eq('user_id', userId)
    .eq('broker_id', brokerId)
    .gte('date', startDate)
    .order('date', { ascending: true });

  return (data || []).map((d: any) => ({
    time: d.date + 'T00:00:00Z',
    equity: d.equity,
  }));
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const brokerId = searchParams.get('brokerId');
    const period = searchParams.get('period') || '7d';

    if (!brokerId || !token) {
      return NextResponse.json({ deals: [], equityCurve: [], stats: computeStats([]), liveRisk: null });
    }

    const metaApiId = await resolveMetaApiId(brokerId);

    // ── Time range ──
    const now = new Date();
    const periodMap: Record<string, number> = {
      '24h': 86400000,
      '3d': 259200000,
      '7d': 604800000,
      '30d': 2592000000,
      'all': 7776000000,
    };
    const periodMs = periodMap[period] || 604800000;
    const startTime = new Date(now.getTime() - periodMs).toISOString();
    const endTime = now.toISOString();

    // ── 1. Check cache first — ZERO MetaAPI calls ──
    const cached = await getCachedStats(user.id, brokerId, period);
    if (cached) {
      const dbDeals = await getDealsFromDb(user.id, brokerId, startTime);
      const dbEquity = await getEquityCurveFromDb(user.id, brokerId, startTime.split('T')[0]);

      return NextResponse.json({
        deals: dbDeals,
        equityCurve: dbEquity.length > 0 ? dbEquity : buildEquityCurveFromDeals(dbDeals, 0, startTime, endTime),
        stats: cached.stats_json,
        liveRisk: null, // Live risk comes from positions API (already loaded by parent)
        source: 'cache',
        cachedAt: cached.last_synced,
      });
    }

    // ── 2. Full MetaAPI sync ──
    const headers = { 'auth-token': token };
    const base = `${MT_CLIENT_BASE}/users/current/accounts/${metaApiId}`;
    const dealsUrl = `${base}/history-deals/time/${startTime}/${endTime}`;

    const [dealsRes, infoRes, posRes] = await Promise.all([
      fetch(dealsUrl, { headers, signal: AbortSignal.timeout(12000) }),
      fetch(`${base}/account-information`, { headers, signal: AbortSignal.timeout(8000) }),
      fetch(`${base}/positions`, { headers, signal: AbortSignal.timeout(8000) }),
    ]);

    const rawDeals = dealsRes.ok ? await dealsRes.json() : [];
    const info = infoRes.ok ? await infoRes.json() : {};
    const rawPositions = posRes.ok ? await posRes.json() : [];

    const allDeals = Array.isArray(rawDeals) ? rawDeals : [];
    const tradingDeals = allDeals.filter((d: any) =>
      d.type === 'DEAL_TYPE_BUY' || d.type === 'DEAL_TYPE_SELL'
    );

    // Group deals into closed trades
    const positionDeals: Record<string, any[]> = {};
    for (const d of tradingDeals) {
      const posId = d.positionId || d.id;
      if (!positionDeals[posId]) positionDeals[posId] = [];
      positionDeals[posId].push(d);
    }

    const closedTrades: any[] = [];
    for (const [, deals] of Object.entries(positionDeals)) {
      const entryDeal = deals.find((d: any) => d.entryType === 'DEAL_ENTRY_IN') || deals[0];
      const exitDeal = deals.find((d: any) => d.entryType === 'DEAL_ENTRY_OUT') || deals[deals.length - 1];

      if (exitDeal && exitDeal.profit !== undefined) {
        closedTrades.push({
          id: exitDeal.id || entryDeal.id,
          symbol: exitDeal.symbol || entryDeal.symbol,
          type: entryDeal.type || 'DEAL_TYPE_BUY',
          volume: entryDeal.volume || exitDeal.volume || 0,
          profit: exitDeal.profit || 0,
          commission: (entryDeal.commission || 0) + (exitDeal.commission || 0),
          swap: exitDeal.swap || 0,
          entryPrice: entryDeal.price || 0,
          exitPrice: exitDeal.price || 0,
          openTime: entryDeal.time || '',
          closeTime: exitDeal.time || '',
          positionId: exitDeal.positionId || entryDeal.positionId || '',
        });
      }
    }

    closedTrades.sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());

    // ── 3. Sync to database (fire-and-forget) ──
    const positions = Array.isArray(rawPositions) ? rawPositions : [];

    // Run DB operations in parallel (non-blocking)
    Promise.all([
      syncDealsToDb(user.id, brokerId, closedTrades),
      saveDailySnapshot(user.id, brokerId, info, positions, closedTrades),
    ]).catch(err => console.error('[Deals API] DB sync error:', err));

    // ── 4. Compute stats and cache ──
    const stats = computeStats(closedTrades);
    
    // Cache in background
    cacheStats(user.id, brokerId, period, stats, closedTrades.length)
      .catch(err => console.error('[Deals API] Cache error:', err));

    // ── 5. Build response ──
    const balance = info.balance || 0;
    const equity = info.equity || balance;
    const equityCurve = buildEquityCurveFromDeals(closedTrades, balance, startTime, endTime);
    // Add current equity
    if (equityCurve.length > 0) {
      equityCurve[equityCurve.length - 1].equity = equity;
    }


    return NextResponse.json({
      deals: closedTrades,
      equityCurve,
      stats,
      liveRisk: null, // Computed locally on frontend from positions props
      source: 'live',
    });
  } catch (error: any) {
    console.error('[Deals API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Helper: Build equity curve from deals ──
function buildEquityCurveFromDeals(closedTrades: any[], balance: number, startTime: string, endTime: string) {
  const sortedByTime = [...closedTrades].sort((a, b) =>
    new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
  );
  let cumPnl = 0;
  const startEquity = balance - closedTrades.reduce((a, d) => a + d.profit, 0);
  const curve = [{ time: startTime, equity: startEquity }];
  for (const deal of sortedByTime) {
    cumPnl += deal.profit;
    curve.push({ time: deal.closeTime, equity: startEquity + cumPnl });
  }
  curve.push({ time: endTime, equity: balance });
  return curve;
}

