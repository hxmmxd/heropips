import { NextResponse } from 'next/server';
import { detectSymbol, fetchCandles } from '@/lib/market';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolInput = searchParams.get('symbol') || 'gold';
  const interval = searchParams.get('interval') || '1h';

  const broker = searchParams.get('broker') || 'vantage';

  const symbol = detectSymbol(symbolInput) || symbolInput;
  const candles = await fetchCandles(symbol, interval, 200, broker);

  return NextResponse.json({ candles });
}
