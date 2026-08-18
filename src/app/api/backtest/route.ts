import { NextResponse } from 'next/server';
import { fetchHistoricalCandlesPG } from '@/lib/historicalDatabase';
import { runBacktest, BacktestParams } from '@/lib/backtestEngine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, timeframe, initialBalance, preset, riskPercent, startDate, endDate, minConfluence, spreadPips } = body;
    
    if (!symbol || !timeframe) {
      return NextResponse.json({ error: 'Missing symbol or timeframe' }, { status: 400 });
    }
    
    // Fetch historical data
    // If date filters are provided, increase limit to 250,000 to allow full year simulations 
    // (1 year of 5m data = ~105,000 candles). If no dates, default to 5,000 for quick recent scan.
    const safeLimit = (startDate || endDate) ? 250000 : 5000;
    const candles = await fetchHistoricalCandlesPG(symbol, timeframe, safeLimit, startDate, endDate);
    
    if (!candles || candles.length < 100) {
      return NextResponse.json({ error: 'Insufficient historical data returned for backtest' }, { status: 400 });
    }
    
    const params: BacktestParams = {
      symbol,
      timeframe,
      initialBalance: initialBalance || 10000,
      preset: preset || 'full_15_gates',
      riskPercent: riskPercent || 1.5,
      minConfluence,
      spreadPips: spreadPips !== undefined ? spreadPips : 1.5,
    };
    
    const result = await runBacktest(candles, params);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Backtest API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
