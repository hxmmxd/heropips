import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MT_CLIENT_BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai';
const token = process.env.META_API_TOKEN || '';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brokerId = searchParams.get('brokerId');

    if (!brokerId || !token) {
      return NextResponse.json({
        positions: [],
        pendingOrders: [],
        accountInfo: {
          balance: 0, equity: 0, margin: 0, freeMargin: 0,
          mtmPnl: 0, mtmPnlPercent: 0, totalLots: 0,
          positionCount: 0, leverage: 0, currency: 'USD',
        },
      });
    }

    // Resolve broker MetaAPI ID from local DB
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const DB_FILE = process.env.VERCEL || process.env.NODE_ENV === 'production'
      ? path.join(os.tmpdir(), 'brokers_db.json')
      : path.join(process.cwd(), 'src/lib/brokers_db.json');

    let metaApiId = brokerId;
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const match = data.find((b: any) => b.id === brokerId || b.login === brokerId);
        if (match) metaApiId = match.id;
      }
    } catch {}

    const headers = { 'auth-token': token };
    const base = `${MT_CLIENT_BASE}/users/current/accounts/${metaApiId}`;

    // Fetch positions, account info, and pending orders in parallel
    const [infoRes, posRes, ordersRes] = await Promise.all([
      fetch(`${base}/account-information`, { headers, signal: AbortSignal.timeout(8000) }),
      fetch(`${base}/positions`, { headers, signal: AbortSignal.timeout(8000) }),
      fetch(`${base}/orders`, { headers, signal: AbortSignal.timeout(8000) }),
    ]);

    const info = infoRes.ok ? await infoRes.json() : {};
    const posData = posRes.ok ? await posRes.json() : [];
    const ordersData = ordersRes.ok ? await ordersRes.json() : [];

    const positions = Array.isArray(posData) ? posData : [];
    const pendingOrders = Array.isArray(ordersData) ? ordersData : [];

    const balance = info.balance || 0;
    const equity = info.equity || 0;
    const margin = info.margin || 0;
    const freeMargin = info.freeMargin || 0;
    const leverage = info.leverage || 0;
    const currency = info.currency || 'USD';

    const mtmPnl = equity - balance;
    const mtmPnlPercent = balance > 0 ? (mtmPnl / balance) * 100 : 0;

    // Compute totals
    let totalLots = 0;
    const mappedPositions = positions.map((p: any) => {
      totalLots += p.volume || 0;
      return {
        id: p.id,
        symbol: p.symbol,
        type: p.type,
        volume: p.volume,
        openPrice: p.openPrice,
        currentPrice: p.currentPrice,
        profit: p.profit || 0,
        stopLoss: p.stopLoss || undefined,
        takeProfit: p.takeProfit || undefined,
        openTime: p.time || p.openTime,
        magic: p.magic,
        comment: p.comment,
      };
    });

    const mappedOrders = pendingOrders.map((o: any) => ({
      id: o.id,
      symbol: o.symbol,
      type: o.type,
      volume: o.volume,
      openPrice: o.openPrice,
      currentPrice: o.currentPrice,
      stopLoss: o.stopLoss,
      takeProfit: o.takeProfit,
      comment: o.comment,
    }));

    return NextResponse.json({
      positions: mappedPositions,
      pendingOrders: mappedOrders,
      accountInfo: {
        balance,
        equity,
        margin,
        freeMargin,
        mtmPnl,
        mtmPnlPercent,
        totalLots: Math.round(totalLots * 100) / 100,
        positionCount: mappedPositions.length,
        leverage,
        currency,
      },
    });
  } catch (error: any) {
    console.error('[Positions API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
