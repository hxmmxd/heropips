import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FARM_HEADERS, sidecarUrl, resolveAccountId as resolveFarmAccountId } from '@/lib/mt5farm';

export const dynamic = 'force-dynamic';

async function resolveAccountId(brokerId: string, supabase: any): Promise<string> {
  const cleanId = brokerId.replace(/^mt5_/, '');
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let query = supabase
      .from('broker_accounts')
      .select('mt5_login, metaapi_id');
      
    if (isUuid) {
      query = query.eq('id', cleanId);
    } else {
      query = query.or(`mt5_login.eq.${cleanId},metaapi_id.eq.${cleanId},mt5_login.eq.${brokerId},metaapi_id.eq.${brokerId}`);
    }
    const { data } = await query.maybeSingle();
    if (data?.mt5_login) return String(data.mt5_login);
    if (data?.metaapi_id) return String(data.metaapi_id);
  } catch (err: any) {
    console.warn('[Positions API] resolveAccountId fallback:', err.message);
  }
  return cleanId;
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brokerId = searchParams.get('brokerId');

    if (!brokerId) {
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

    const rawAccountId = await resolveAccountId(brokerId, supabase);
    const accountId = await resolveFarmAccountId(rawAccountId);

    // Helper to gracefully retry if sidecar returns {"status":"waking"} (HTTP 202)
    const fetchWithWakeRetry = async (url: string) => {
      for (let i = 0; i < 4; i++) {
        const res = await fetch(url, { headers: FARM_HEADERS, signal: AbortSignal.timeout(45000), cache: 'no-store' });
        if (!res.ok) return res;
        const data = await res.clone().json().catch(() => null);
        if (data && data.status === 'waking') {
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        return res;
      }
      return fetch(url, { headers: FARM_HEADERS, signal: AbortSignal.timeout(45000), cache: 'no-store' });
    };

    // Fetch positions, account info, and pending orders in parallel
    const [infoRes, posRes, ordersRes] = await Promise.all([
      fetchWithWakeRetry(sidecarUrl(accountId, 'account-information')),
      fetchWithWakeRetry(sidecarUrl(accountId, 'positions')),
      fetchWithWakeRetry(sidecarUrl(accountId, 'orders')),
    ]);

    const info      = infoRes.ok   ? await infoRes.json().catch(()=>({}))   : {};
    const posData   = posRes.ok    ? await posRes.json().catch(()=>[])     : [];
    const ordersData = ordersRes.ok ? await ordersRes.json().catch(()=>[]) : [];

    console.log('[Positions API] posData:', posData);
    console.log('[Positions API] isArray?', Array.isArray(posData));

    const positions     = Array.isArray(posData)    ? posData    : [];
    const pendingOrders = Array.isArray(ordersData) ? ordersData : [];

    const balance    = info.balance    || 0;
    const equity     = info.equity     || 0;
    const margin     = info.margin     || 0;
    const freeMargin = info.marginFree || 0;
    const leverage   = info.leverage   || 0;
    const currency   = info.currency   || 'USD';

    const mtmPnl        = equity - balance;
    const mtmPnlPercent = balance > 0 ? (mtmPnl / balance) * 100 : 0;

    let totalLots = 0;
    const mappedPositions = positions.map((p: any) => {
      totalLots += p.volume || 0;
      return {
        id:           p.id,
        symbol:       p.symbol,
        type:         p.type,
        volume:       p.volume,
        openPrice:    p.openPrice,
        currentPrice: p.currentPrice,
        profit:       p.profit || 0,
        stopLoss:     p.stopLoss   || undefined,
        takeProfit:   p.takeProfit || undefined,
        openTime:     p.openTime   || p.time,
        magic:        p.magic,
        comment:      p.comment,
      };
    });

    const mappedOrders = pendingOrders.map((o: any) => ({
      id:           o.id,
      symbol:       o.symbol,
      type:         o.type,
      volume:       o.volume,
      openPrice:    o.openPrice,
      currentPrice: o.currentPrice,
      stopLoss:     o.stopLoss,
      takeProfit:   o.takeProfit,
      comment:      o.comment,
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
