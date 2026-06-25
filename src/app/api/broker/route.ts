import { NextResponse } from 'next/server';
import { connectBroker, disconnectBroker, getAllBrokers, getBrokerDetails, searchBrokerServers, syncBrokerToSupabase } from '@/lib/broker';
import { createClient } from '@/lib/supabase/server';
import { farmGetAccount, farmGetAccountInfo, farmGetSymbols, resolveAccountId, FARM_BASE, FARM_HEADERS, sidecarUrl } from '@/lib/mt5farm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (query !== null) {
      const servers = await searchBrokerServers(query);
      const isSimulation = !process.env.MT5_FARM_ORCHESTRATOR_URL;
      return NextResponse.json({ servers, isSimulation });
    }

    // Get current user — only return their brokers
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ brokers: [] });
    }

    const cached = await getAllBrokers(user.id);

    const live = await Promise.all(
      cached.map(async (b) => {
        // Use the MT5 login number as the farm account ID — never the Supabase UUID.
        const loginOrId = b.login || b.id;
        const accountId = await resolveAccountId(loginOrId);
        try {
          // Fetch orchestrator status + sidecar account info in parallel.
          // 4s timeout on both — sidecar may be slow waking up.
          const [farmAcctResult, farmInfoResult] = await Promise.allSettled([
            Promise.race([
              farmGetAccount(accountId),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
            ]),
            Promise.race([
              farmGetAccountInfo(accountId),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
            ]),
          ]);

          const farmAcct = farmAcctResult.status === 'fulfilled' ? farmAcctResult.value : null;
          const farmInfo = farmInfoResult.status === 'fulfilled' ? farmInfoResult.value : null;

          // The raw status string from the orchestrator
          const rawFarmStatus = (farmAcct as any)?.status ?? null;

          // ─── CRITICAL FIX: Status Inconsistency Bug ────────────────────────
          // The farm orchestrator sometimes reports status='connected' even when
          // the sidecar is still in 'starting' state. We detect this by checking:
          //   1. Did the sidecar proxy call (farmInfo) actually succeed?
          //   2. If farmInfo is null (503 from proxy), the account is NOT truly connected.
          //
          // Trust the SIDECAR response, not the orchestrator status string.
          // Only mark as 'connected' when we have real data from the sidecar proxy.
          const sidecareActuallyReady = farmInfo !== null && (farmInfo as any)?.balance != null;

          // Farm Fix 7: surface 'failed' accounts immediately — bad credentials detected
          if (rawFarmStatus === 'failed') {
            return {
              ...b,
              id:            accountId,
              status:        'error' as const,
              statusDetail:  (farmAcct as any).failureCode   ?? 'AUTH_FAILED',
              statusMessage: (farmAcct as any).failureReason ?? 'Invalid credentials or server not found',
              balance:       b.balance ?? 0,
              equity:        b.equity  ?? 0,
              pnl:           0,
            };
          }

          // ─── Sidecar is live and ready — use fresh data from sidecar proxy
          if (sidecareActuallyReady) {
            const balance = farmInfo!.balance ?? 0;
            const equity  = farmInfo!.equity  ?? balance;
            const pnl     = equity - balance;

            let allowed_symbols = b.allowed_symbols || [];
            if (allowed_symbols.length === 0) {
              try {
                const symbols = await farmGetSymbols(accountId);
                if (symbols && symbols.length > 0) {
                  allowed_symbols = symbols;
                }
              } catch (err) {
                console.error('[Broker API] Failed to fetch allowed symbols inside GET:', err);
              }
            }

            const node = {
              ...b,
              id:            accountId,
              login:         String(farmInfo!.login || accountId),
              name:          farmInfo!.broker || farmInfo!.name || b.name,
              server:        farmInfo!.server || b.server,
              balance,
              equity,
              pnl,
              freeMargin:    farmInfo!.freeMargin  ?? (farmInfo as any).marginFree ?? 0,
              openPositions: farmInfo!.openPositions ?? 0,
              openOrders:    farmInfo!.openOrders    ?? 0,
              tradeAllowed:  farmInfo!.tradeAllowed,
              tradeExpert:   farmInfo!.tradeExpert,
              lastSyncTime:  farmInfo!.lastSyncTime,
              status:        'connected' as const,
              allowed_symbols,
            };
            // Fire-and-forget sync; don't block the response
            syncBrokerToSupabase(node, user.id).catch(() => {});
            return node;
          }

          // ─── Sidecar NOT ready (503 / starting / wake in progress) ──────────
          // Use orchestrator last-known balance as fallback. Show as 'connecting'.
          // DO NOT show 'connected' — the sidecar is not accepting proxy requests yet.
          if (farmAcct && (farmAcct as any).balance != null) {
            const farmBalance = (farmAcct as any).balance as number;
            // equity may not exist in current farm response — use balance as fallback
            const farmEquity = ((farmAcct as any).equity as number | null) ?? farmBalance;

            // Map ALL non-connected statuses to 'connecting' for the UI
            // (starting, waking, hibernated-waking all look the same to the user)
            const uiStatus = (
              rawFarmStatus === 'hibernated' ? 'disconnected' :
              rawFarmStatus === 'timeout'    ? 'timeout'      :
              rawFarmStatus === 'failed'     ? 'error'        :
              // 'connected', 'starting', 'waking', anything else → 'connecting'
              // because if sidecar was truly ready, we'd have farmInfo above
              'connecting'
            ) as 'connected' | 'disconnected' | 'connecting' | 'error' | 'timeout';

            const merged = {
              ...b,
              id:           accountId,
              balance:      farmBalance,
              equity:       farmEquity,
              pnl:          farmEquity - farmBalance,
              name:         (farmAcct as any).name         || b.name,
              tradeAllowed: (farmAcct as any).tradeAllowed ?? null,
              tradeExpert:  (farmAcct as any).tradeExpert  ?? null,
              lastSyncedAt: (farmAcct as any).lastSyncedAt ?? null,
              status:       uiStatus,
            };
            // Only sync to Supabase if we have a real balance and a known-good status
            if (uiStatus !== 'error') syncBrokerToSupabase(merged, user.id).catch(() => {});
            return merged;
          }

          // Farm account not found at all — return Supabase cached data as-is
          return { ...b, id: accountId };
        } catch {
          return { ...b, id: accountId };
        }
      })
    );

    return NextResponse.json({ brokers: live });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { login, password, server } = body;

    if (!server || !login || !password) {
      return NextResponse.json({ error: 'Server, Login ID, and Password are required.' }, { status: 400 });
    }

    const derivedName = server.split('-')[0] || server;
    const name = `${derivedName}-${login}`;

    const node = await connectBroker(name, login, password, server, user.id);
    return NextResponse.json({ success: true, broker: node });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brokerId } = await request.json();
    if (!brokerId) {
      return NextResponse.json({ error: 'brokerId is required' }, { status: 400 });
    }

    const success = await disconnectBroker(brokerId, user.id);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
