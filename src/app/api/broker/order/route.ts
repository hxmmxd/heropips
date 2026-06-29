import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNormalizedSymbolForBroker } from '@/lib/broker';
import {
  FARM_HEADERS,
  FARM_BASE,
  sidecarUrl,
  farmExecuteTrade,
  farmClosePosition,
  farmCloseAllPositions,
  farmCancelOrder,
  farmModifyPosition,
} from '@/lib/mt5farm';

export const dynamic = 'force-dynamic';

async function resolveAccountId(brokerId: string, userId: string): Promise<string> {
  // Never rely on /tmp/brokers_db.json — it is wiped on every Vercel cold start.
  // Use Supabase admin client for a reliable lookup by mt5_login.
  const cleanId = brokerId.replace(/^mt5_/, '');
  try {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let query = admin
      .from('broker_accounts')
      .select('mt5_login, metaapi_id')
      .eq('user_id', userId);
      
    if (isUuid) {
      query = query.eq('id', cleanId);
    } else {
      query = query.or(`mt5_login.eq.${cleanId},metaapi_id.eq.${cleanId},mt5_login.eq.${brokerId},metaapi_id.eq.${brokerId}`);
    }
    const { data } = await query.maybeSingle();
    if (data?.mt5_login) return String(data.mt5_login);
    if (data?.metaapi_id) return String(data.metaapi_id);
  } catch (err: any) {
    console.warn('[Order] resolveAccountId fallback:', err.message);
  }
  // brokerId itself might already be the MT5 login number
  return cleanId;
}

// Rate limiting — max 10 orders per 15 seconds per user
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 15_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId)?.filter(t => now - t < RATE_LIMIT_WINDOW_MS) || [];
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Too many requests. Max 10 orders per 15 seconds.' }, { status: 429 });
    }

    const body = await request.json();
    const { action } = body;
    let { brokerId } = body;

    if (brokerId && typeof brokerId === 'string') {
      brokerId = brokerId.replace(/^mt5_/, '');
    }

    // Verify broker belongs to this user
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brokerId);
    let query = supabase.from('broker_accounts').select('id').eq('user_id', user.id);
    if (isUuid) {
      query = query.eq('id', brokerId);
    } else {
      query = query.or(`metaapi_id.eq.${brokerId},mt5_login.eq.${brokerId}`);
    }
    const { data: brokerMatch } = await query.maybeSingle();

    if (!brokerMatch) {
      return NextResponse.json({ error: 'Broker not found or access denied' }, { status: 403 });
    }


    const accountId = await resolveAccountId(brokerId, user.id);

    switch (action) {
      case 'place': {
        const { symbol, direction, volume, price, stopLoss, takeProfit } = body;
        const normalizedSymbol = getNormalizedSymbolForBroker(symbol, accountId);
        let actionType = direction === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL';
        const payload: Record<string, any> = {
          actionType,
          symbol: normalizedSymbol,
          volume: Math.max(Number(volume) || 0.01, 0.01),
          comment: 'TradeGPT Manager',
        };
        if (price) {
          payload.actionType = direction === 'BUY' ? 'ORDER_TYPE_BUY_LIMIT' : 'ORDER_TYPE_SELL_LIMIT';
          payload.openPrice  = Number(price);
        }
        if (stopLoss)   payload.stopLoss   = Number(stopLoss);
        if (takeProfit) payload.takeProfit = Number(takeProfit);

        const result = await farmExecuteTrade(accountId, payload as any);
        if (result.success) {
          return NextResponse.json({
            success:   true,
            orderId:   result.result.orderId || result.result.positionId,
            fillPrice: result.result.openPrice,
          });
        }
        return NextResponse.json({
          error: result.error.message || 'Order rejected',
          code:  result.error.stringCode,
        }, { status: 400 });
      }

      case 'modify': {
        const { positionId, stopLoss, takeProfit } = body;
        const result = await farmModifyPosition(accountId, positionId, {
          stopLoss:   stopLoss   !== undefined ? Number(stopLoss)   : undefined,
          takeProfit: takeProfit !== undefined ? Number(takeProfit) : undefined,
        });
        if (result.success) return NextResponse.json({ success: true });
        return NextResponse.json({ error: 'Modify failed', code: result.retcode }, { status: 400 });
      }

      case 'close': {
        const { positionId } = body;
        const result = await farmClosePosition(accountId, positionId);
        if (result.success) return NextResponse.json({ success: true });
        return NextResponse.json({ error: 'Close failed', code: result.retcode }, { status: 400 });
      }

      case 'closeAll': {
        const { symbol } = body;
        const result = await farmCloseAllPositions(accountId, symbol);
        return NextResponse.json({ success: true, closed: result.closed, total: result.results.length });
      }

      case 'cancelOrder': {
        const { orderId } = body;
        const result = await farmCancelOrder(accountId, orderId);
        if (result.success) return NextResponse.json({ success: true });
        return NextResponse.json({ error: 'Cancel failed' }, { status: 400 });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Order API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
