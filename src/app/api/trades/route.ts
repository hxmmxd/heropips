import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { FARM_HEADERS, sidecarUrl, resolveAccountId } from '@/lib/mt5farm';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdmin();

    // Get the user's active broker account to fetch live positions
    const { data: broker } = await admin
      .from('broker_accounts')
      .select('mt5_login')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    // Fetch live open positions from MT5
    let liveOrderIds: Set<string> = new Set();
    let liveSymbols: Set<string> = new Set();
    if (broker?.mt5_login) {
      try {
        const accountId = await resolveAccountId(String(broker.mt5_login));
        const posRes = await fetch(sidecarUrl(accountId, 'positions'), {
          headers: FARM_HEADERS,
          signal: AbortSignal.timeout(8000),
        });
        if (posRes.ok) {
          const positions = await posRes.json();
          const posList = Array.isArray(positions) ? positions : [];
          for (const p of posList) {
            if (p.id) liveOrderIds.add(String(p.id));
            if (p.ticket) liveOrderIds.add(String(p.ticket));
            if (p.symbol) liveSymbols.add(p.symbol);
          }
        }
      } catch (err) {
        console.warn('[Trades API] Failed to fetch live positions:', err);
      }
    }

    // Fetch "open" trades from DB
    const { data: trades, error } = await admin
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allOpenTrades = trades || [];

    // Reconcile: mark trades as closed if they're not in live positions
    if (liveOrderIds.size > 0 || liveSymbols.size > 0) {
      const staleTrades = allOpenTrades.filter(t => {
        const orderId = String(t.order_id || '');
        // A trade is still live if its order_id matches a live position
        if (orderId && liveOrderIds.has(orderId)) return false;
        // Otherwise it's stale
        return true;
      });

      if (staleTrades.length > 0) {
        const staleIds = staleTrades.map(t => t.id);
        // Batch close stale trades
        await admin
          .from('trades')
          .update({ status: 'closed', updated_at: new Date().toISOString() })
          .in('id', staleIds);

        console.log(`[Trades API] Reconciled ${staleTrades.length} stale trades to closed`);
      }

      // Return only truly live trades
      const liveTrades = allOpenTrades.filter(t => {
        const orderId = String(t.order_id || '');
        return orderId && liveOrderIds.has(orderId);
      });

      return NextResponse.json({ trades: liveTrades });
    }

    // If no broker connected, return all open trades as-is
    return NextResponse.json({ trades: allOpenTrades });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
