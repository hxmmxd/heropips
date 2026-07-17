import { NextResponse } from 'next/server';
import { FARM_BASE, FARM_HEADERS, verifyServerLocally, syncFarmConfig } from '@/lib/mt5farm';
import dns from 'dns';

export async function POST(req: Request) {
  await syncFarmConfig();
  try {
    const { server } = await req.json();
    if (!server || typeof server !== 'string') {
      return NextResponse.json({ error: 'server is required' }, { status: 400 });
    }
    const serverName = server.trim();

    // ── 1. Farm native endpoint (primary) ──
    try {
      const farmRes = await fetch(`${FARM_BASE}/brokers/verify-server`, {
        method: 'POST',
        headers: { ...FARM_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: serverName }),
        signal: AbortSignal.timeout(12000),
      });

      if (farmRes.ok) {
        const data = await farmRes.json();
        // If farm verified successfully, return it. Otherwise fall back to local/DNS check.
        if (data.verified === true) {
          return NextResponse.json({
            reachable: true,
            server:    serverName,
            broker:    data.broker   ?? null,
            country:   data.country  ?? null,
            type:      data.type     ?? null,
            source:    data.source   ?? 'farm',
            note:      data.note     ?? null,
          });
        }
      }
    } catch (e: any) {
      console.warn('[verify-server] Farm error, falling back to local registry & DNS:', e.message);
    }

    // ── 2. Local Registry/Pattern Matching (secondary fallback) ──
    const localResult = verifyServerLocally(serverName);
    if (localResult && localResult.reachable) {
      return NextResponse.json({
        reachable: true,
        server:    serverName,
        broker:    localResult.broker,
        country:   null,
        type:      localResult.type,
        source:    localResult.source,
        note:      'Verified via local custom registry fallback.',
      });
    }

    // ── 3. DNS fallback (if farm and local registry checks fail) ──
    const resolver = new dns.promises.Resolver();
    const cleanServerName = serverName.replace(/\s+/g, '-');
    const candidates = [
      `${cleanServerName}.sr1.metatrader.com`,
      `${cleanServerName}.pro.metatrader.com`,
      `${cleanServerName}.sr2.metatrader.com`,
    ];
    let reachable = false;
    for (const host of candidates) {
      try {
        const addrs = await resolver.resolve4(host);
        if (addrs.length > 0) { reachable = true; break; }
      } catch { /* try next */ }
    }

    return NextResponse.json({
      reachable,
      server: serverName,
      broker: null,
      country: null,
      type: serverName.toLowerCase().includes('demo') || serverName.toLowerCase().includes('trial') || serverName.toLowerCase().includes('practice') ? 'demo' : 'live',
      source: 'dns_lookup',
      ...(reachable ? { note: 'Verified via DNS check.' } : { note: 'Server not found in MT5 registry or DNS. You can still attempt a direct connection.' }),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

