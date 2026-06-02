import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabaseAdmin;
}

export async function GET(request: Request) {
  const supabase = createServerClient();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch user's profile wallet balance
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileErr) throw profileErr;

    // 2. Fetch all wallet transactions for the user
    const { data: txs, error: txsErr } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (txsErr) throw txsErr;

    // 3. Compute stats
    const available = profile?.wallet_balance || 0;
    
    // Pending withdrawals (withdrawal requests that are pending review)
    const pending = (txs || [])
      .filter((tx: any) => tx.status === 'pending')
      .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);

    // Lifetime earnings (sum of all positive completed rebates and referrals)
    const lifetime = (txs || [])
      .filter((tx: any) => 
        (tx.tx_type === 'rebate' || tx.tx_type === 'referral') && 
        tx.status === 'completed' && 
        Number(tx.amount) > 0
      )
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

    // Sum total lots from rebate transactions
    const totalLots = (txs || [])
      .filter((tx: any) => tx.tx_type === 'rebate' && tx.status === 'completed' && tx.metadata?.volume)
      .reduce((sum: number, tx: any) => sum + Number(tx.metadata.volume), 0);

    return NextResponse.json({
      success: true,
      wallet: {
        available,
        pending,
        lifetime,
        minWithdrawal: 50.00,
        nextPayout: 'Dynamic Sync',
        totalLots,
      },
      transactions: txs || [],
    });
  } catch (err: any) {
    console.error('Failed to load wallet stats:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
