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

async function restTrade(metaApiId: string, payload: object): Promise<any> {
  const res = await fetch(`${MT_CLIENT_BASE}/users/current/accounts/${metaApiId}/trade`, {
    method: 'POST',
    headers: { 'auth-token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, data: await res.json() };
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!token) {
      return NextResponse.json({ error: 'MetaAPI not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { action, brokerId } = body;
    const metaApiId = await resolveMetaApiId(brokerId);

    switch (action) {
      case 'place': {
        const { symbol, direction, volume, price, stopLoss, takeProfit } = body;
        const payload: Record<string, any> = {
          actionType: direction === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
          symbol,
          volume: Math.max(Number(volume) || 0.01, 0.01),
          comment: 'TradeGPT Manager',
        };
        if (price) {
          payload.actionType = direction === 'BUY' ? 'ORDER_TYPE_BUY_LIMIT' : 'ORDER_TYPE_SELL_LIMIT';
          payload.openPrice = Number(price);
        }
        if (stopLoss) payload.stopLoss = Number(stopLoss);
        if (takeProfit) payload.takeProfit = Number(takeProfit);

        const { status, data } = await restTrade(metaApiId, payload);
        if (data?.stringCode === 'TRADE_RETCODE_DONE') {
          return NextResponse.json({ success: true, orderId: data.orderId || data.positionId, fillPrice: data.openPrice });
        }
        return NextResponse.json({ error: data?.message || 'Order rejected', code: data?.stringCode }, { status: 400 });
      }

      case 'modify': {
        const { positionId, stopLoss, takeProfit } = body;
        const payload: Record<string, any> = {
          actionType: 'POSITION_MODIFY',
          positionId,
        };
        if (stopLoss !== undefined) payload.stopLoss = Number(stopLoss);
        if (takeProfit !== undefined) payload.takeProfit = Number(takeProfit);

        const { data } = await restTrade(metaApiId, payload);
        if (data?.stringCode === 'TRADE_RETCODE_DONE') {
          return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: data?.message || 'Modify failed', code: data?.stringCode }, { status: 400 });
      }

      case 'close': {
        const { positionId } = body;
        const payload = {
          actionType: 'POSITION_CLOSE_ID',
          positionId,
        };

        const { data } = await restTrade(metaApiId, payload);
        if (data?.stringCode === 'TRADE_RETCODE_DONE') {
          return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: data?.message || 'Close failed', code: data?.stringCode }, { status: 400 });
      }

      case 'closeAll': {
        // Fetch all positions and close them
        const headers = { 'auth-token': token };
        const posRes = await fetch(`${MT_CLIENT_BASE}/users/current/accounts/${metaApiId}/positions`, { headers });
        const positions = posRes.ok ? await posRes.json() : [];

        if (!Array.isArray(positions) || positions.length === 0) {
          return NextResponse.json({ success: true, closed: 0 });
        }

        const results = await Promise.allSettled(
          positions.map((p: any) =>
            restTrade(metaApiId, { actionType: 'POSITION_CLOSE_ID', positionId: p.id })
          )
        );

        const closed = results.filter(r => r.status === 'fulfilled' && (r as any).value?.data?.stringCode === 'TRADE_RETCODE_DONE').length;
        return NextResponse.json({ success: true, closed, total: positions.length });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Order API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
