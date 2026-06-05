import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/referral/seed
 * Creates real auth users + profiles, trade logs, wallet transactions,
 * and milestone progress so the Referral Hub has real data to display.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rootId = user.id;
  const now = new Date();
  const results: string[] = [];

  try {
    // 1. Ensure root user has referral code + pro plan
    await supabaseAdmin.from('profiles').update({
      referral_code: 'TGPT-' + rootId.replace(/-/g, '').slice(0, 8).toUpperCase(),
      plan: 'pro',
    }).eq('id', rootId);
    results.push('Root user: referral code set, plan upgraded to PRO');

    // 2. Clean previous seed data
    const { data: oldFakes } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .like('email', '%@seed.tradegpt.test');

    if (oldFakes && oldFakes.length > 0) {
      const oldIds = oldFakes.map(p => p.id);
      await supabaseAdmin.from('trade_log').delete().in('user_id', oldIds);
      await supabaseAdmin.from('wallet_transactions').delete().in('user_id', oldIds);
      for (const oid of oldIds) {
        await supabaseAdmin.auth.admin.deleteUser(oid);
      }
      results.push(`Cleaned ${oldIds.length} previous seed users`);
    }

    // Clean root's seed wallet transactions
    await supabaseAdmin.from('wallet_transactions')
      .delete().eq('user_id', rootId).like('reference_id', 'ref_SEED%');

    // 3. Create fake auth users + profiles via admin API
    const fakeUserDefs = [
      // L1 (direct referrals of root)
      { name: 'Alpha_Quant',        email: 'alpha.quant@seed.tradegpt.test',  plan: 'pro',        level: 1, parentIdx: -1 },
      { name: 'Institutional_Void', email: 'inst.void@seed.tradegpt.test',    plan: 'enterprise', level: 1, parentIdx: -1 },
      { name: 'Scalp_Hunter',       email: 'scalp.hunter@seed.tradegpt.test', plan: 'pro',        level: 1, parentIdx: -1 },
      { name: 'FX_Nomad',           email: 'fx.nomad@seed.tradegpt.test',     plan: 'free',       level: 1, parentIdx: -1 },
      // L2 (under L1[0] and L1[1])
      { name: 'Quant_Sub1',  email: 'quant.sub1@seed.tradegpt.test', plan: 'free', level: 2, parentIdx: 0 },
      { name: 'Quant_Sub2',  email: 'quant.sub2@seed.tradegpt.test', plan: 'pro',  level: 2, parentIdx: 0 },
      { name: 'Quant_Sub3',  email: 'quant.sub3@seed.tradegpt.test', plan: 'free', level: 2, parentIdx: 0 },
      { name: 'Inst_Sub1',   email: 'inst.sub1@seed.tradegpt.test',  plan: 'pro',  level: 2, parentIdx: 1 },
      { name: 'Inst_Sub2',   email: 'inst.sub2@seed.tradegpt.test',  plan: 'free', level: 2, parentIdx: 1 },
      // L3 (under L2[0])
      { name: 'Deep_Trader1', email: 'deep.t1@seed.tradegpt.test', plan: 'free', level: 3, parentIdx: 4 },
      { name: 'Deep_Trader2', email: 'deep.t2@seed.tradegpt.test', plan: 'pro',  level: 3, parentIdx: 4 },
      // L4 (under L3[0])
      { name: 'Ultra_Deep', email: 'ultra.deep@seed.tradegpt.test', plan: 'free', level: 4, parentIdx: 9 },
    ];

    const createdIds: string[] = [];

    for (const def of fakeUserDefs) {
      // Create auth user
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: def.email,
        password: 'SeedPass123!',
        email_confirm: true,
        user_metadata: { full_name: def.name },
      });

      if (authErr) {
        // User might already exist — try to find them
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existing = users?.find(u => u.email === def.email);
        if (existing) {
          createdIds.push(existing.id);
          // Update their profile
          const parentId = def.parentIdx === -1 ? rootId : createdIds[def.parentIdx];
          await supabaseAdmin.from('profiles').update({
            full_name: def.name,
            referral_code: 'TGPT-' + existing.id.replace(/-/g, '').slice(0, 8).toUpperCase(),
            referred_by: parentId,
            plan: def.plan,
            wallet_balance: 0,
          }).eq('id', existing.id);
          continue;
        }
        results.push(`Failed to create ${def.email}: ${authErr.message}`);
        createdIds.push(''); // placeholder
        continue;
      }

      const uid = authUser.user.id;
      createdIds.push(uid);

      // Update profile with referral tree
      const parentId = def.parentIdx === -1 ? rootId : createdIds[def.parentIdx];
      await supabaseAdmin.from('profiles').update({
        full_name: def.name,
        referral_code: 'TGPT-' + uid.replace(/-/g, '').slice(0, 8).toUpperCase(),
        referred_by: parentId,
        plan: def.plan,
        wallet_balance: 0,
      }).eq('id', uid);
    }

    const validIds = createdIds.filter(id => id !== '');
    results.push(`Created ${validIds.length} auth users + profiles`);

    // 4. Create trade logs for each fake user
    const symbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'USDJPY'];
    let totalTrades = 0;

    for (let i = 0; i < fakeUserDefs.length; i++) {
      const uid = createdIds[i];
      if (!uid) continue;
      const lvl = fakeUserDefs[i].level;
      const tradeCount = lvl === 1 ? 30 + Math.floor(Math.random() * 50) :
                         lvl === 2 ? 10 + Math.floor(Math.random() * 20) :
                         5 + Math.floor(Math.random() * 10);

      for (let t = 0; t < tradeCount; t++) {
        const sym = symbols[Math.floor(Math.random() * symbols.length)];
        const vol = Number((0.05 + Math.random() * 1.5).toFixed(2));
        const pnl = Number((-80 + Math.random() * 250).toFixed(2));
        const daysAgo = Math.random() * 30;

        await supabaseAdmin.from('trade_log').insert({
          user_id: uid,
          deal_id: `SEED_${uid.slice(0, 6)}_${t}`,
          symbol: sym,
          deal_type: Math.random() > 0.5 ? 'BUY' : 'SELL',
          volume: vol,
          profit: pnl,
          commission: Number((-vol * 1.2).toFixed(2)),
          hold_time_seconds: 300 + Math.floor(Math.random() * 5000),
          closed_at: new Date(now.getTime() - daysAgo * 86400000).toISOString(),
          rebate_processed: true,
        });
        totalTrades++;
      }
    }
    results.push(`Created ${totalTrades} trade log entries`);

    // 5. Create wallet transactions for root user
    let totalReferral = 0;
    let totalRebate = 0;

    for (let i = 0; i < fakeUserDefs.length; i++) {
      const uid = createdIds[i];
      if (!uid) continue;
      const lvl = fakeUserDefs[i].level;
      const pct = lvl === 1 ? 0.40 : lvl === 2 ? 0.20 : lvl === 3 ? 0.10 : 0.05;
      const txCount = lvl === 1 ? 30 : lvl === 2 ? 12 : 6;

      for (let t = 0; t < txCount; t++) {
        const vol = Number((0.1 + Math.random() * 1.2).toFixed(2));
        const gross = vol * 2.0;
        const earned = Number((gross * pct).toFixed(2));
        if (earned <= 0) continue;

        const daysAgo = Math.random() * 30;
        const sym = symbols[Math.floor(Math.random() * symbols.length)];

        await supabaseAdmin.from('wallet_transactions').insert({
          user_id: rootId,
          amount: earned,
          tx_type: 'referral',
          status: 'completed',
          reference_id: `ref_SEED_${uid.slice(0, 6)}_${t}_L${lvl}`,
          metadata: {
            source_user_id: uid,
            deal_id: `SEED_${uid.slice(0, 6)}_${t}`,
            symbol: sym, volume: vol,
            gross_rebate: gross, level: lvl,
            level_label: `Level ${lvl}`,
            percentage: pct * 100,
          },
          created_at: new Date(now.getTime() - daysAgo * 86400000).toISOString(),
        });
        totalReferral += earned;
      }
    }

    // Personal rebates
    for (let i = 0; i < 20; i++) {
      const vol = Number((0.1 + Math.random() * 1.8).toFixed(2));
      const amt = Number((vol * 2.0 * 0.80).toFixed(2));
      const sym = symbols[Math.floor(Math.random() * symbols.length)];

      await supabaseAdmin.from('wallet_transactions').insert({
        user_id: rootId,
        amount: amt,
        tx_type: 'rebate',
        status: 'completed',
        reference_id: `ref_SEED_self_${i}`,
        metadata: { symbol: sym, volume: vol },
        created_at: new Date(now.getTime() - Math.random() * 30 * 86400000).toISOString(),
      });
      totalRebate += amt;
    }

    // Pending withdrawal
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: rootId,
      amount: -100,
      tx_type: 'withdrawal_request',
      status: 'pending',
      reference_id: 'ref_SEED_wd_1',
      metadata: { currency: 'USDT', address: 'TXyz...demo' },
    });

    const balance = Number((totalRebate + totalReferral - 100).toFixed(2));
    await supabaseAdmin.from('profiles').update({
      wallet_balance: Math.max(balance, 0)
    }).eq('id', rootId);

    results.push(`Referral earnings: $${totalReferral.toFixed(2)}`);
    results.push(`Personal rebates: $${totalRebate.toFixed(2)}`);
    results.push(`Wallet balance: $${Math.max(balance, 0).toFixed(2)}`);

    // 6. Milestone progress
    const { data: milestones } = await supabaseAdmin
      .from('milestones').select('id, name, target_lots').eq('active', true).order('sort_order');

    if (milestones) {
      for (const m of milestones) {
        const target = Number(m.target_lots);
        const counted = m.name === 'Bronze' ? target + 50 :
                        m.name === 'Silver' ? Math.floor(target * 0.62) :
                        Math.floor(target * 0.15);
        const status = m.name === 'Bronze' ? 'qualified' : 'in_progress';
        const legCap = target * 0.4;

        await supabaseAdmin.from('milestone_progress').upsert({
          user_id: rootId,
          milestone_id: m.id,
          status,
          total_raw_lots: counted * 1.1,
          total_counted_lots: counted,
          legs_breakdown: validIds.slice(0, 4).map((id, i) => ({
            legUserId: id,
            legName: fakeUserDefs[i]?.name || `Leg ${i+1}`,
            rawLots: counted * [0.45, 0.35, 0.15, 0.05][i],
            cappedLots: Math.min(counted * [0.45, 0.35, 0.15, 0.05][i], legCap),
            capped: counted * [0.45, 0.35, 0.15, 0.05][i] > legCap,
          })),
          qualified_at: status === 'qualified' ? now.toISOString() : null,
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id,milestone_id' });
      }
      results.push(`Seeded ${milestones.length} milestone tiers`);
    }

    return NextResponse.json({
      success: true,
      message: 'Seed completed with real auth users',
      details: results,
      createdUserIds: validIds,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, details: results }, { status: 500 });
  }
}
