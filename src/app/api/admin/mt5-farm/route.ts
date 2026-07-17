import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  farmHealth,
  farmGetAccounts,
  farmGetAccount,
  farmDisconnect,
  farmHibernate,
  farmWake,
  farmAdminListKeys,
  farmAdminCreateKey,
  farmAdminRevokeKey,
  farmAdminGetStats,
  FARM_BASE,
  FARM_HEADERS,
  syncFarmConfig,
} from '@/lib/mt5farm';

export const dynamic = 'force-dynamic';



// Service-role client (bypasses RLS — never exposed to client)
let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

async function requireAdmin(_request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Use service role to bypass RLS on is_admin column
  const supabaseAdmin = getSupabaseAdmin();
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!(profile as any)?.is_admin) return null;
  return user;
}

export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await syncFarmConfig();

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'overview';

  try {
    switch (action) {
      case 'overview': {
        const [health, accounts] = await Promise.all([
          farmHealth().catch(() => null),
          farmGetAccounts().catch(() => []),
        ]);
        return NextResponse.json({ health, accounts, orchestratorUrl: FARM_BASE });
      }

      case 'account': {
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        const account = await farmGetAccount(id);
        return NextResponse.json({ account });
      }

      case 'keys': {
        const keys = await farmAdminListKeys();
        return NextResponse.json(keys);
      }

      case 'stats': {
        const stats = await farmAdminGetStats();
        return NextResponse.json(stats);
      }

      case 'latency': {
        // Fetch latency from a connected account if available
        const accounts = await farmGetAccounts().catch(() => []);
        const connected = accounts.find(a => a.status === 'connected');
        if (!connected) return NextResponse.json({ error: 'No connected accounts for latency test' }, { status: 404 });

        const accountId = connected.accountId;
        const url = `${FARM_BASE}/accounts/${accountId}/proxy/users/current/accounts/${accountId}/latency`;
        const res = await fetch(url, { headers: FARM_HEADERS, signal: AbortSignal.timeout(15000) });
        const data = res.ok ? await res.json() : { error: 'Latency test failed' };
        return NextResponse.json(data);
      }

      case 'test-connection': {
        const results: Record<string, any> = {};
        const t0 = Date.now();

        // 1. Orchestrator health
        try {
          const healthRes = await fetch(`${FARM_BASE}/health`, { headers: FARM_HEADERS, signal: AbortSignal.timeout(8000) });
          const latency = Date.now() - t0;
          if (healthRes.ok) {
            const health = await healthRes.json();
            results.orchestrator = { ok: true, latencyMs: latency, detail: health };
          } else {
            results.orchestrator = { ok: false, latencyMs: latency, detail: `HTTP ${healthRes.status}` };
          }
        } catch (e: any) {
          results.orchestrator = { ok: false, latencyMs: Date.now() - t0, detail: e.message };
        }

        // 2. Accounts list
        try {
          const t1 = Date.now();
          const accsRes = await fetch(`${FARM_BASE}/accounts`, { headers: FARM_HEADERS, signal: AbortSignal.timeout(8000) });
          const latency = Date.now() - t1;
          if (accsRes.ok) {
            const accs = await accsRes.json();
            const list = Array.isArray(accs) ? accs : [];
            const connected = list.filter((a: any) => a.status === 'connected');
            results.accounts = { ok: true, latencyMs: latency, total: list.length, connected: connected.length };

            // 3. Sidecar ping via first connected account
            if (connected.length > 0) {
              const acc = connected[0];
              const t2 = Date.now();
              try {
                const infoUrl = `${FARM_BASE}/accounts/${acc.accountId}/proxy/users/current/accounts/${acc.accountId}/account-information`;
                const infoRes = await fetch(infoUrl, { headers: FARM_HEADERS, signal: AbortSignal.timeout(10000) });
                const sl = Date.now() - t2;
                if (infoRes.ok) {
                  const info = await infoRes.json();
                  results.sidecar = { ok: true, latencyMs: sl, account: acc.login, balance: info.balance, currency: info.currency };
                } else {
                  results.sidecar = { ok: false, latencyMs: sl, detail: `HTTP ${infoRes.status}` };
                }
              } catch (e: any) {
                results.sidecar = { ok: false, latencyMs: Date.now() - t2, detail: e.message };
              }
            } else {
              results.sidecar = { ok: null, detail: 'No connected accounts available for sidecar test' };
            }
          } else {
            results.accounts = { ok: false, latencyMs: latency, detail: `HTTP ${accsRes.status}` };
          }
        } catch (e: any) {
          results.accounts = { ok: false, detail: e.message };
        }

        const overall = results.orchestrator?.ok && results.accounts?.ok;
        return NextResponse.json({ overall, results, testedAt: new Date().toISOString() });
      }


      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await syncFarmConfig();

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'hibernate': {
        await farmHibernate(body.accountId);
        return NextResponse.json({ success: true });
      }

      case 'wake': {
        await farmWake(body.accountId);
        return NextResponse.json({ success: true });
      }

      case 'disconnect': {
        await farmDisconnect(body.accountId);
        return NextResponse.json({ success: true });
      }

      case 'createKey': {
        const key = await farmAdminCreateKey(body.label, body.rateLimit);
        return NextResponse.json(key);
      }

      case 'revokeKey': {
        const result = await farmAdminRevokeKey(body.keyId);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
