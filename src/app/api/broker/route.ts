import { NextResponse } from 'next/server';
import { connectBroker, disconnectBroker, getAllBrokers, getBrokerDetails, searchBrokerServers, syncBrokerToSupabase } from '@/lib/broker';
import { createClient } from '@/lib/supabase/server';
import { farmGetAccount, farmGetAccountInfo, farmGetSymbols, resolveAccountId, FARM_BASE, FARM_HEADERS, sidecarUrl, syncFarmConfig } from '@/lib/mt5farm';


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await syncFarmConfig();



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
          // Increased timeout to 4s to allow waking containers enough time to complete boot sequence.
          const [farmAcctResult, farmInfoResult] = await Promise.allSettled([
            Promise.race([
              farmGetAccount(accountId),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
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

          // Sidecar proxy is live and ready
          const sidecareActuallyReady = farmInfo !== null && (farmInfo as any)?.balance != null;

          // Surface 'failed' accounts immediately (bad credentials detected)
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

          // ─── Sidecar warming up or temporary proxy timeout ─────────────────────
          // If orchestrator reports status='connected' OR we have a non-zero balance in Supabase cache/orchestrator,
          // trust status='connected' so the UI displays account balance immediately instead of stuck in 'connecting'!
          const farmBalance = (farmAcct as any)?.balance ?? b.balance ?? 0;
          const farmEquity  = (farmAcct as any)?.equity  ?? b.equity  ?? farmBalance;

          const isConnected = rawFarmStatus === 'connected' || (b.balance && Number(b.balance) > 0);

          const uiStatus = (
            rawFarmStatus === 'hibernated' ? 'disconnected' :
            rawFarmStatus === 'timeout'    ? 'timeout'      :
            rawFarmStatus === 'failed'     ? 'error'        :
            isConnected                    ? 'connected'    :
            'connecting'
          ) as 'connected' | 'disconnected' | 'connecting' | 'error' | 'timeout';

          const merged = {
            ...b,
            id:           accountId,
            balance:      farmBalance,
            equity:       farmEquity,
            pnl:          farmEquity - farmBalance,
            name:         (farmAcct as any)?.name         || b.name,
            tradeAllowed: (farmAcct as any)?.tradeAllowed ?? null,
            tradeExpert:  (farmAcct as any)?.tradeExpert  ?? null,
            lastSyncedAt: (farmAcct as any)?.lastSyncedAt ?? null,
            status:       uiStatus,
          };
          if (uiStatus !== 'error') syncBrokerToSupabase(merged, user.id).catch(() => {});
          return merged;

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
  await syncFarmConfig();
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle();

    const userPlan = profile?.plan || 'free';
    const isFree = userPlan === 'free' || userPlan === 'starter';

    const existingBrokers = await getAllBrokers(user.id);
    const maxAllowed = isFree ? 1 : 5;
    if (existingBrokers.length >= maxAllowed) {
      return NextResponse.json({
        error: `Plan limit reached. ${isFree ? 'Free' : 'Premium'} tier accounts are limited to a maximum of ${maxAllowed} connected broker account${maxAllowed > 1 ? 's' : ''}. Please upgrade to a Premium plan to connect more.`
      }, { status: 403 });
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
      // Deactivate sentinel in database
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await admin
        .from('platform_config')
        .upsert({
          key: 'sentinel_active_state',
          value: { running: false, accountId: brokerId, userId: user.id }
        });
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
