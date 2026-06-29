import { NextResponse } from 'next/server';
import { executeBrokerOrder } from '@/lib/broker';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/execute
 * Manually execute a trade on the selected broker account.
 * Called when user taps "Confirm Execution" on a trade ticket.
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { brokerId } = body;
    const { symbol, action, volume, entryPrice, stopLoss, takeProfit } = body;

    if (!brokerId || !symbol || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: brokerId, symbol, action' },
        { status: 400 }
      );
    }

    if (typeof brokerId === 'string') {
      brokerId = brokerId.replace(/^mt5_/, '');
    }

    const lotSize = parseFloat(volume) || 0.1;
    const entry = parseFloat(entryPrice) || 0;
    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;

    console.log(`[Execute API] Dispatching ${action} ${lotSize} lot(s) ${symbol} on broker ${brokerId} for user ${user.id}`);

    const result = await executeBrokerOrder(
      brokerId,
      symbol,
      action,
      lotSize,
      entry,
      sl,
      tp
    );

    // Resolve database broker_accounts UUID if possible
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brokerId);
    let query = supabase.from('broker_accounts').select('id').eq('user_id', user.id);
    if (isUuid) {
      query = query.eq('id', brokerId);
    } else {
      query = query.or(`metaapi_id.eq.${brokerId},mt5_login.eq.${brokerId}`);
    }
    const { data: brokerAccount } = await query.maybeSingle();


    // Log the trade in Supabase database
    const { error: insertError } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        broker_id: brokerAccount?.id || null,
        symbol,
        action,
        volume: lotSize,
        entry_price: result.fillPrice || entry,
        stop_loss: sl || null,
        take_profit: tp || null,
        status: 'open',
        order_id: String(result.orderId),
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[Execute API] Supabase trade logging error:', insertError.message);
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      fillPrice: result.fillPrice,
      status: result.status,
    });
  } catch (error: any) {
    console.error('[Execute API] Execution failed:', error);
    return NextResponse.json(
      { error: error.message || 'Trade execution failed' },
      { status: 500 }
    );
  }
}
