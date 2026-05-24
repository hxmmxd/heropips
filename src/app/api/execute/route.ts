import { NextResponse } from 'next/server';
import { executeBrokerOrder } from '@/lib/broker';

/**
 * POST /api/execute
 * Manually execute a trade on the selected broker account.
 * Called when user taps "Confirm Execution" on a trade ticket.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { brokerId, symbol, action, volume, entryPrice, stopLoss, takeProfit } = body;

    if (!brokerId || !symbol || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: brokerId, symbol, action' },
        { status: 400 }
      );
    }

    const lotSize = parseFloat(volume) || 0.1;
    const entry = parseFloat(entryPrice) || 0;
    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;

    console.log(`[Execute API] Dispatching ${action} ${lotSize} lot(s) ${symbol} on broker ${brokerId}`);

    const result = await executeBrokerOrder(
      brokerId,
      symbol,
      action,
      lotSize,
      entry,
      sl,
      tp
    );

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
