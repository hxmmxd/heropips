import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Admin API — uses service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
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

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all data
  const [usersRes, brokersRes, tradesRes, announcementsRes, configRes, auditRes, riskRes, providersRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('broker_accounts').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('trades').select('*').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('announcements').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('platform_config').select('*'),
    supabaseAdmin.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('risk_rules').select('*').order('created_at', { ascending: true }),
    supabaseAdmin.from('broker_providers').select('*').order('created_at', { ascending: true }),
  ]);

  const users = usersRes.data || [];
  const brokers = brokersRes.data || [];
  const trades = tradesRes.data || [];
  const announcements = announcementsRes.data || [];
  const config: Record<string, any> = {};
  (configRes.data || []).forEach((c: any) => { config[c.key] = c.value; });
  const auditLog = auditRes.data || [];
  const riskRules = riskRes.data || [];
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

  return NextResponse.json({ stats, users, brokers, trades, announcements, config, auditLog, riskRules, signupTrends, revenueTrends, topSymbols, brokerProviders });
}

// Update user plan or admin status
export async function PATCH(request: Request) {
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

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, plan, is_admin, full_name, email, status, suspended_reason, configKey, configValue, announcement, riskRule, brokerProvider } = body;

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
      // Test connectivity — try to instantiate connection with the stored key
      const { data: provider } = await supabaseAdmin.from('broker_providers').select('*').eq('id', data.id).single();
      if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      try {
        if (provider.type === 'metatrader' && provider.api_key) {
          const MetaApi = (await import('metaapi.cloud-sdk/node')).default;
          const api = new MetaApi(provider.api_key);
          // Just validate token by listing accounts — if it throws, the key is invalid
          await api.metatraderAccountApi.getAccountsWithInfiniteScrollPagination();
          await supabaseAdmin.from('broker_providers').update({ status: 'active', error_message: null, last_health_check: new Date().toISOString() }).eq('id', data.id);
          return NextResponse.json({ success: true, status: 'active' });
        }
        // For other types just mark as active for now
        await supabaseAdmin.from('broker_providers').update({ status: 'active', error_message: null, last_health_check: new Date().toISOString() }).eq('id', data.id);
        return NextResponse.json({ success: true, status: 'active' });
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
