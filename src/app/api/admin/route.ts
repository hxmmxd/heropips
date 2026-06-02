import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Admin API — uses service role to bypass RLS (lazy init to avoid build-time crash)
let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  // Verify calling user is admin
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin status using service role (bypasses RLS)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!(profile as any)?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all data
  const [usersRes, brokersRes, tradesRes, announcementsRes, configRes, auditRes, riskRes, providersRes, tradeCountsRes, rebateRulesRes, rebateRiskRes, rebatePromosRes, rebateTiersRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('broker_accounts').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('trades').select('*').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('announcements').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('platform_config').select('*'),
    supabaseAdmin.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('risk_rules').select('*').order('created_at', { ascending: true }),
    supabaseAdmin.from('broker_providers').select('*').order('created_at', { ascending: true }),
    supabaseAdmin.from('trades').select('broker_id'),
    supabaseAdmin.from('rebate_rules').select('*').order('created_at', { ascending: true }),
    supabaseAdmin.from('rebate_risk_settings').select('*').limit(1).maybeSingle(),
    supabaseAdmin.from('rebate_promotions').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('rebate_volume_tiers').select('*').order('min_monthly_lots', { ascending: true }),
  ]);

  const users: any[] = usersRes.data || [];
  
  // Calculate trade counts per broker account
  const tradeCounts = tradeCountsRes.data || [];
  const brokerTradeCounts: Record<string, number> = {};
  tradeCounts.forEach((t: any) => {
    if (t.broker_id) {
      brokerTradeCounts[t.broker_id] = (brokerTradeCounts[t.broker_id] || 0) + 1;
    }
  });

  const brokers: any[] = (brokersRes.data || []).map((b: any) => ({
    ...b,
    trade_count: brokerTradeCounts[b.id] || 0,
  }));
  const trades: any[] = tradesRes.data || [];
  const announcements: any[] = announcementsRes.data || [];
  const config: Record<string, any> = {};
  ((configRes.data || []) as any[]).forEach((c: any) => { config[c.key] = c.value; });
  const auditLog: any[] = auditRes.data || [];
  const riskRules: any[] = riskRes.data || [];
  // Mask API keys for providers before sending to frontend
  const brokerProviders = (providersRes.data || []).map((p: any) => ({
    ...p,
    api_key: p.api_key ? '••••' + p.api_key.slice(-4) : null,
    api_secret: p.api_secret ? '••••' + p.api_secret.slice(-4) : null,
  }));

  // Compute monthly signup trends (last 6 months)
  const now = new Date();
  const signupTrends: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    const count = users.filter(u => {
      const created = new Date(u.created_at);
      return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
    }).length;
    signupTrends.push({ month: label, count });
  }

  // Revenue by month (last 6 months)
  const revenueTrends: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    // Approximate: users who existed by that month
    const rev = users.filter(u => new Date(u.created_at) <= new Date(d.getFullYear(), d.getMonth() + 1, 0)).reduce((sum, u) => {
      if (u.plan === 'pro') return sum + 50;
      if (u.plan === 'enterprise') return sum + 100;
      return sum;
    }, 0);
    revenueTrends.push({ month: label, revenue: rev });
  }

  // Trade stats
  const closedTrades = trades.filter(t => t.status === 'closed' || t.close_price);
  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length * 100) : 0;
  const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);

  // Top symbols
  const symbolMap: Record<string, number> = {};
  trades.forEach(t => { if (t.symbol) symbolMap[t.symbol] = (symbolMap[t.symbol] || 0) + 1; });
  const topSymbols = Object.entries(symbolMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([symbol, count]) => ({ symbol, count }));

  const stats = {
    totalUsers: users.length,
    proUsers: users.filter(u => u.plan === 'pro').length,
    enterpriseUsers: users.filter(u => u.plan === 'enterprise').length,
    freeUsers: users.filter(u => !u.plan || u.plan === 'free').length,
    totalBrokers: brokers.length,
    activeBrokers: brokers.filter(b => b.status === 'connected').length,
    totalTrades: trades.length,
    openTrades: trades.filter(t => t.status === 'open').length,
    suspendedUsers: users.filter(u => u.status === 'suspended').length,
    winRate: Math.round(winRate * 10) / 10,
    totalPnl: Math.round(totalPnl * 100) / 100,
    revenue: users.reduce((sum, u) => {
      if (u.plan === 'pro') return sum + 50;
      if (u.plan === 'enterprise') return sum + 100;
      return sum;
    }, 0),
  };

  const rebateRules = rebateRulesRes.data || [];
  const rebateRiskSettings = rebateRiskRes.data || null;
  const rebatePromotions = rebatePromosRes.data || [];
  const rebateVolumeTiers = rebateTiersRes.data || [];

  return NextResponse.json({ stats, users, brokers, trades, announcements, config, auditLog, riskRules, signupTrends, revenueTrends, topSymbols, brokerProviders, rebateRules, rebateRiskSettings, rebatePromotions, rebateVolumeTiers });
}

// Update user plan or admin status
export async function PATCH(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!(profile as any)?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, plan, is_admin, full_name, email, status, suspended_reason, configKey, configValue, announcement, riskRule, brokerProvider, rebateRule, rebateRiskRule, rebatePromotion, rebateVolumeTier } = body;

  // -- Rebate risk settings update
  if (rebateRiskRule !== undefined) {
    const { id, exclude_hedged_positions, hedge_time_buffer_seconds, max_drawdown_limit, spread_protection_multiplier, clawback_grace_period_days } = rebateRiskRule;
    const { error } = await supabaseAdmin
      .from('rebate_risk_settings')
      .update({
        exclude_hedged_positions,
        hedge_time_buffer_seconds: Number(hedge_time_buffer_seconds),
        max_drawdown_limit: Number(max_drawdown_limit),
        spread_protection_multiplier: Number(spread_protection_multiplier),
        clawback_grace_period_days: Number(clawback_grace_period_days),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'rebate_risk_updated', target_type: 'rebate_risk_settings', target_id: id, details: rebateRiskRule });
    return NextResponse.json({ success: true });
  }

  // -- Rebate promotions CRUD
  if (rebatePromotion !== undefined) {
    const { action, data } = rebatePromotion;
    if (action === 'create') {
      const { error } = await supabaseAdmin.from('rebate_promotions').insert(data);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'rebate_promo_created', target_type: 'rebate_promotion', details: data });
    } else if (action === 'delete') {
      const { error } = await supabaseAdmin.from('rebate_promotions').delete().eq('id', data.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'rebate_promo_deleted', target_type: 'rebate_promotion', target_id: data.id, details: data });
    }
    return NextResponse.json({ success: true });
  }

  // -- Rebate volume tier update
  if (rebateVolumeTier !== undefined) {
    const { action, data } = rebateVolumeTier;
    if (action === 'update') {
      const { error } = await supabaseAdmin
        .from('rebate_volume_tiers')
        .update({ payout_multiplier: Number(data.payout_multiplier) })
        .eq('id', data.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'rebate_tier_updated', target_type: 'rebate_volume_tier', target_id: data.id, details: data });
    }
    return NextResponse.json({ success: true });
  }

  // -- Broker provider CRUD
  if (brokerProvider !== undefined) {
    const { action, data } = brokerProvider;
    if (action === 'create') {
      const { error } = await supabaseAdmin.from('broker_providers').insert({ ...data, created_by: user.id });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'provider_created', target_type: 'broker_provider', details: { name: data.name, type: data.type } });
    } else if (action === 'update') {
      const updateData: any = { ...data, updated_at: new Date().toISOString() };
      // Only update api_key/api_secret if they don't start with masked prefix
      if (updateData.api_key?.startsWith('••••')) delete updateData.api_key;
      if (updateData.api_secret?.startsWith('••••')) delete updateData.api_secret;
      delete updateData.id;
      await supabaseAdmin.from('broker_providers').update(updateData).eq('id', data.id);
      await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'provider_updated', target_type: 'broker_provider', target_id: data.id, details: { name: data.name } });
    } else if (action === 'delete') {
      await supabaseAdmin.from('broker_providers').delete().eq('id', data.id);
      await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'provider_deleted', target_type: 'broker_provider', target_id: data.id, details: { name: data.name } });
    } else if (action === 'test') {
      // Test connectivity using the appropriate adapter
      const { data: provider } = await supabaseAdmin.from('broker_providers').select('*').eq('id', data.id).single();
      if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      try {
        let testResult: { success: boolean; error?: string } = { success: false, error: 'Unknown provider type' };

        if (provider.type === 'metatrader') {
          const { metatraderAdapter } = await import('@/lib/adapters/metatrader');
          testResult = await metatraderAdapter.testConnection(provider.api_key);
        } else if (['binance', 'bybit', 'okx'].includes(provider.type)) {
          const { cryptoAdapter } = await import('@/lib/adapters/crypto');
          testResult = await cryptoAdapter.testConnection(provider.api_key, provider.api_secret, provider.base_url);
        } else {
          // cTrader or custom — just mark active
          testResult = { success: true };
        }

        if (testResult.success) {
          await supabaseAdmin.from('broker_providers').update({ status: 'active', error_message: null, last_health_check: new Date().toISOString() }).eq('id', data.id);
          return NextResponse.json({ success: true, status: 'active' });
        } else {
          throw new Error(testResult.error || 'Connection failed');
        }
      } catch (err: any) {
        const msg = err?.message || 'Connection failed';
        await supabaseAdmin.from('broker_providers').update({ status: 'error', error_message: msg, last_health_check: new Date().toISOString() }).eq('id', data.id);
        return NextResponse.json({ success: false, status: 'error', error: msg });
      }
    }
    return NextResponse.json({ success: true });
  }

  // -- Risk rule update
  if (riskRule !== undefined) {
    await supabaseAdmin.from('risk_rules').update({ threshold: riskRule.threshold, is_active: riskRule.is_active }).eq('id', riskRule.id);
    await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'risk_rule_updated', target_type: 'risk_rule', target_id: riskRule.id, details: riskRule });
    return NextResponse.json({ success: true });
  }

  // -- Config update
  if (configKey !== undefined) {
    await supabaseAdmin.from('platform_config').upsert({ key: configKey, value: configValue, updated_by: user.id, updated_at: new Date().toISOString() });
    await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'config_update', target_type: 'config', details: { key: configKey, value: configValue } });
    return NextResponse.json({ success: true });
  }

  // -- Rebate rule create/update/delete
  if (rebateRule !== undefined) {
    const { action, data } = rebateRule;
    if (action === 'create') {
      const { error } = await supabaseAdmin.from('rebate_rules').insert(data);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'rebate_rule_created', target_type: 'rebate_rule', details: data });
    } else if (action === 'update') {
      const updateData = { ...data };
      const ruleId = updateData.id;
      delete updateData.id;
      const { error } = await supabaseAdmin.from('rebate_rules').update(updateData).eq('id', ruleId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'rebate_rule_updated', target_type: 'rebate_rule', target_id: ruleId, details: data });
    } else if (action === 'delete') {
      const { error } = await supabaseAdmin.from('rebate_rules').delete().eq('id', data.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: 'rebate_rule_deleted', target_type: 'rebate_rule', target_id: data.id, details: data });
    }
    return NextResponse.json({ success: true });
  }

  // -- Announcement create/update
  if (announcement !== undefined) {
    if (announcement.id) {
      await supabaseAdmin.from('announcements').update({ ...announcement, created_by: undefined }).eq('id', announcement.id);
    } else {
      await supabaseAdmin.from('announcements').insert({ ...announcement, created_by: user.id });
    }
    await supabaseAdmin.from('audit_log').insert({ admin_id: user.id, action: announcement.id ? 'announcement_update' : 'announcement_create', target_type: 'announcement', details: announcement });
    return NextResponse.json({ success: true });
  }

  // -- User update
  const update: any = { updated_at: new Date().toISOString() };
  if (plan !== undefined) update.plan = plan;
  if (is_admin !== undefined) update.is_admin = is_admin;
  if (full_name !== undefined) update.full_name = full_name;
  if (email !== undefined) update.email = email;
  if (status !== undefined) {
    update.status = status;
    if (status === 'suspended') {
      update.suspended_reason = suspended_reason || '';
      update.suspended_at = new Date().toISOString();
    } else {
      update.suspended_reason = null;
      update.suspended_at = null;
    }
  }

  const { error } = await supabaseAdmin.from('profiles').update(update).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync auth metadata
  if (full_name !== undefined || email !== undefined) {
    const authUpdate: any = {};
    if (email !== undefined) authUpdate.email = email;
    if (full_name !== undefined) authUpdate.user_metadata = { full_name };
    await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate);
  }

  // Audit log
  await supabaseAdmin.from('audit_log').insert({
    admin_id: user.id,
    action: status === 'suspended' ? 'user_suspended' : 'user_updated',
    target_type: 'user',
    target_id: userId,
    details: update,
  });

  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin status
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!(profile as any)?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { action, smtpConfig, testEmail } = body;

  if (action === 'test_smtp') {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: Number(smtpConfig.port) || 587,
        secure: !!smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });

      // Verify connection
      await transporter.verify();

      // If test email requested, send a test message
      if (testEmail) {
        await transporter.sendMail({
          from: smtpConfig.from || 'TradeGPT <noreply@yourdomain.com>',
          to: testEmail,
          subject: '[TradeGPT] SMTP Configuration Test',
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #10a37f; text-align: center; margin-bottom: 24px;">SMTP Test Successful!</h2>
              <p style="font-size: 15px; color: #475569; line-height: 1.5;">
                Your SMTP configuration has been verified. The mail transport channel is online and fully functional.
              </p>
              <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; text-align: center; margin-top: 30px;">
                This is an automated test message from TradeGPT admin console.
              </p>
            </div>
          `
        });
      }

      return NextResponse.json({ success: true, message: 'SMTP connection verified successfully!' });
    } catch (err: any) {
      console.error('[smtp-test] error:', err);
      return NextResponse.json({ success: false, error: err.message || 'SMTP Connection failed' });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
