import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MT_CLIENT_BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai';
const token = process.env.META_API_TOKEN || '';

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

  // Streaks
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
  const avgTrade = expectancy;

  // Sharpe & Sortino (using per-trade returns)
  const mean = profits.reduce((a, b) => a + b, 0) / profits.length;
  const variance = profits.reduce((a, p) => a + Math.pow(p - mean, 2), 0) / profits.length;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? mean / stdDev : 0;

  const downsideVariance = profits.reduce((a, p) => {
    const diff = Math.min(0, p - mean);
    return a + diff * diff;
  }, 0) / profits.length;
  const downsideDev = Math.sqrt(downsideVariance);
  const sortino = downsideDev > 0 ? mean / downsideDev : 0;

  // Max Drawdown (from cumulative P&L curve)
  let peak = 0, maxDD = 0, cumulative = 0;
  for (const p of profits) {
    cumulative += p;
    if (cumulative > peak) peak = cumulative;
    const dd = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  }

  const recoveryFactor = maxDD > 0 ? netProfit / (maxDD * netProfit / 100) : 0;

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
    avgTrade: Math.round(avgTrade * 100) / 100,
    samples: profits.length,
  };
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
      return NextResponse.json({ deals: [], equityCurve: [], stats: computeStats([]) });
    }

    const metaApiId = await resolveMetaApiId(brokerId);
    const headers = { 'auth-token': token };
    const base = `${MT_CLIENT_BASE}/users/current/accounts/${metaApiId}`;

    // Calculate time range
    const now = new Date();
    const periodMs = period === '24h' ? 86400000 : period === '3d' ? 259200000 : 604800000;
    const startTime = new Date(now.getTime() - periodMs).toISOString();
    const endTime = now.toISOString();

    // Fetch deals and account info in parallel
    const [dealsRes, infoRes] = await Promise.all([
      fetch(`${base}/history-deals-by-time-range?startTime=${startTime}&endTime=${endTime}`, {
        headers, signal: AbortSignal.timeout(10000),
      }),
      fetch(`${base}/account-information`, { headers, signal: AbortSignal.timeout(8000) }),
    ]);

    const rawDeals = dealsRes.ok ? await dealsRes.json() : [];
    const info = infoRes.ok ? await infoRes.json() : {};

    // Filter to only balance-affecting deals (exclude deposits, etc.)
    const allDeals = Array.isArray(rawDeals) ? rawDeals : [];
    const tradingDeals = allDeals.filter((d: any) =>
      d.type === 'DEAL_TYPE_BUY' || d.type === 'DEAL_TYPE_SELL'
    );

    // Group entry+exit deals into pairs for closed trades
    // MetaAPI returns individual deals; we pair them by positionId
    const positionDeals: Record<string, any[]> = {};
    for (const d of tradingDeals) {
      const posId = d.positionId || d.id;
      if (!positionDeals[posId]) positionDeals[posId] = [];
      positionDeals[posId].push(d);
    }

    const closedTrades: any[] = [];
    for (const [, deals] of Object.entries(positionDeals)) {
      // A closed trade has entry (IN) + exit (OUT) deals
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
        });
      }
    }

    // Sort by close time descending
    closedTrades.sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());

    // Build equity curve from deals (cumulative P&L)
    const balance = info.balance || 0;
    const sortedByTime = [...closedTrades].sort((a, b) =>
      new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    );
    let cumPnl = 0;
    const startEquity = balance - closedTrades.reduce((a, d) => a + d.profit, 0);
    const equityCurve = [{ time: startTime, equity: startEquity }];
    for (const deal of sortedByTime) {
      cumPnl += deal.profit;
      equityCurve.push({ time: deal.closeTime, equity: startEquity + cumPnl });
    }
    equityCurve.push({ time: endTime, equity: balance });

    const stats = computeStats(closedTrades);

    return NextResponse.json({ deals: closedTrades, equityCurve, stats });
  } catch (error: any) {
    console.error('[Deals API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
