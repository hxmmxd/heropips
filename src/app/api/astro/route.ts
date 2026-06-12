import { NextResponse } from 'next/server';
import { computeAstroSnapshot, getNextCelestialEvents } from '@/lib/astro';

export const dynamic = 'force-dynamic';

/**
 * GET /api/astro
 * Query: ?symbol=XAU/USD
 * Returns: live AstroSnapshot & countdowns
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'XAU/USD';

    const snapshot = computeAstroSnapshot(symbol);
    const countdowns = getNextCelestialEvents();

    return NextResponse.json({
      success: true,
      snapshot,
      countdowns,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to compute celestial coordinates' },
      { status: 500 }
    );
  }
}
