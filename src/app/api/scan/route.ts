import { NextResponse } from 'next/server';
import { fullScan, type Candle } from '@/lib/scanner';

export const dynamic = 'force-dynamic';

/**
 * POST /api/scan
 * Body: { symbol, timeframe, candles: Candle[] }
 * Returns: full SMC scan report with signals
 */
export async function POST(request: Request) {
  try {
    const { symbol, timeframe, candles } = await request.json();

    if (!symbol || !candles || !Array.isArray(candles) || candles.length < 20) {
      return NextResponse.json(
        { error: 'Need symbol and at least 20 candles' },
        { status: 400 }
      );
    }

    const report = fullScan(symbol, timeframe || '1H', candles as Candle[]);

    return NextResponse.json({
      ...report,
      summary: {
        totalPatterns: report.structureBreaks.length + report.fvgs.length + report.orderBlocks.length + report.liquiditySweeps.length,
        activeFVGs: report.fvgs.length,
        activeOrderBlocks: report.orderBlocks.length,
        recentSweeps: report.liquiditySweeps.length,
        structureBreaks: report.structureBreaks.length,
        signalCount: report.signals.length,
        bias: report.marketBias,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scan failed' }, { status: 500 });
  }
}
