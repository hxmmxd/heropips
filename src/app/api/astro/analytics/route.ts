import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/astro/analytics
 * Query: ?symbol=XAU/USD (optional, filters by symbol)
 * Returns: Aggregated win rates by moon phase, mercury state, aspects, and seasonal data.
 */
export async function GET(request: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbolFilter = searchParams.get('symbol');

    // Build base query
    let query = supabase
      .from('astro_signal_log')
      .select('*')
      .eq('user_id', user.id)
      .order('signal_time', { ascending: false });

    if (symbolFilter) {
      query = query.eq('symbol', symbolFilter);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('[Astro Analytics] Query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const allLogs = logs || [];
    const withResults = allLogs.filter(l => l.trade_result);

    // ── 1. Moon Phase Win Rate ──
    const moonPhaseStats: Record<string, { wins: number; total: number }> = {};
    for (const log of withResults) {
      const phase = log.moon_phase_name || 'Unknown';
      if (!moonPhaseStats[phase]) moonPhaseStats[phase] = { wins: 0, total: 0 };
      moonPhaseStats[phase].total++;
      if (log.trade_result === 'win') moonPhaseStats[phase].wins++;
    }
    const moonPhaseWinRates = Object.entries(moonPhaseStats).map(([phase, s]) => ({
      phase,
      winRate: s.total > 0 ? Math.round((s.wins / s.total) * 1000) / 10 : 0,
      totalTrades: s.total,
      wins: s.wins,
    })).sort((a, b) => b.winRate - a.winRate);

    // ── 2. Mercury State Performance ──
    const mercuryStats: Record<string, { wins: number; total: number; pnl: number }> = {};
    for (const log of withResults) {
      const state = log.mercury_state || 'unknown';
      if (!mercuryStats[state]) mercuryStats[state] = { wins: 0, total: 0, pnl: 0 };
      mercuryStats[state].total++;
      if (log.trade_result === 'win') mercuryStats[state].wins++;
      mercuryStats[state].pnl += parseFloat(log.pnl || '0');
    }
    const mercuryPerformance = Object.entries(mercuryStats).map(([state, s]) => ({
      state,
      winRate: s.total > 0 ? Math.round((s.wins / s.total) * 1000) / 10 : 0,
      avgPnl: s.total > 0 ? Math.round((s.pnl / s.total) * 100) / 100 : 0,
      totalTrades: s.total,
    }));

    // ── 3. Best Performing Aspects ──
    const aspectStats: Record<string, { wins: number; total: number; pnl: number }> = {};
    for (const log of withResults) {
      if (log.aspects && Array.isArray(log.aspects)) {
        for (const aspect of log.aspects) {
          if (!aspectStats[aspect]) aspectStats[aspect] = { wins: 0, total: 0, pnl: 0 };
          aspectStats[aspect].total++;
          if (log.trade_result === 'win') aspectStats[aspect].wins++;
          aspectStats[aspect].pnl += parseFloat(log.pnl || '0');
        }
      }
    }
    const bestAspects = Object.entries(aspectStats).map(([aspect, s]) => ({
      aspect,
      winRate: s.total > 0 ? Math.round((s.wins / s.total) * 1000) / 10 : 0,
      avgPnl: s.total > 0 ? Math.round((s.pnl / s.total) * 100) / 100 : 0,
      totalTrades: s.total,
    })).sort((a, b) => b.avgPnl - a.avgPnl);

    // ── 4. Astro vs No-Astro comparison ──
    const astroOn = withResults.filter(l => l.astro_mode_on);
    const astroOnWins = astroOn.filter(l => l.trade_result === 'win').length;
    const astroOnWinRate = astroOn.length > 0 ? Math.round((astroOnWins / astroOn.length) * 1000) / 10 : 0;

    // ── 5. Seasonal monthly heatmap ──
    const monthlyStats: Record<number, { wins: number; total: number; pnl: number }> = {};
    for (const log of withResults) {
      const month = new Date(log.signal_time).getMonth();
      if (!monthlyStats[month]) monthlyStats[month] = { wins: 0, total: 0, pnl: 0 };
      monthlyStats[month].total++;
      if (log.trade_result === 'win') monthlyStats[month].wins++;
      monthlyStats[month].pnl += parseFloat(log.pnl || '0');
    }
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const seasonalHeatmap = MONTH_NAMES.map((name, i) => ({
      month: name,
      winRate: monthlyStats[i]?.total ? Math.round((monthlyStats[i].wins / monthlyStats[i].total) * 1000) / 10 : null,
      totalTrades: monthlyStats[i]?.total || 0,
      pnl: Math.round((monthlyStats[i]?.pnl || 0) * 100) / 100,
    }));

    // ── 6. Overview stats ──
    const totalSignals = allLogs.length;
    const totalWithResults = withResults.length;
    const overallWinRate = totalWithResults > 0
      ? Math.round((withResults.filter(l => l.trade_result === 'win').length / totalWithResults) * 1000) / 10
      : 0;
    const totalPnl = Math.round(withResults.reduce((sum, l) => sum + parseFloat(l.pnl || '0'), 0) * 100) / 100;

    return NextResponse.json({
      success: true,
      overview: {
        totalSignals,
        totalWithResults,
        overallWinRate,
        totalPnl,
        astroOnWinRate,
        astroOnTrades: astroOn.length,
      },
      moonPhaseWinRates,
      mercuryPerformance,
      bestAspects: bestAspects.slice(0, 10),
      seasonalHeatmap,
      recentSignals: allLogs.slice(0, 20).map(l => ({
        id: l.id,
        symbol: l.symbol,
        direction: l.direction,
        outcome: l.outcome,
        moonPhase: l.moon_phase_name,
        mercuryState: l.mercury_state,
        result: l.trade_result,
        pnl: l.pnl,
        time: l.signal_time,
      })),
    });
  } catch (err: any) {
    console.error('[Astro Analytics] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to compute analytics' },
      { status: 500 }
    );
  }
}
