import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'plan_pricing')
      .single();

    if (error || !data) {
      return NextResponse.json({
        free: {
          price: 0,
          description: 'For exploring what’s possible',
          features: [
            '3 AI trade signals per day',
            '250 tokens/response (2,500/day limit)',
            '1 broker connection',
            'Basic market analysis',
            'Standard execution speed',
            'Direct Execute only',
            '3-day trade history reports',
            'Standard community support',
          ],
          limits: [
            'Referral withdrawals locked',
            'No manager signal execution',
          ]
        },
        pro: {
          price: 10,
          description: 'For professional traders & scaling portfolios',
          features: [
            'Unlimited AI trade signals',
            '500 tokens/response (Institutional grade)',
            'Unlimited daily chat tokens',
            '5 broker connections',
            'Both Direct & Manager Execution',
            'Unlimited referral withdrawals',
            'Full trade history reports',
            'Priority execution speed',
            'Dedicated account manager',
          ],
          limits: []
        },
        enterprise: {
          price: 100,
          description: 'For hedge funds & institutions',
          features: [
            'Everything in Pro',
            'Unlimited broker connections',
            'Institutional-grade AI models',
            'Dedicated account manager',
            'API access & webhooks',
            'White-label dashboard',
            'Custom integrations',
            'Multi-user team access',
            'SLA guarantee (99.9%)',
          ],
          limits: []
        }
      });
    }

    // Adapt legacy configuration format: {"free": 0, "pro": 50, "enterprise": 100}
    const val = data.value;
    if (typeof val.free === 'number' || typeof val.free === 'string' || typeof val.starter === 'number') {
      const freePrice = 0;
      return NextResponse.json({
        free: {
          price: freePrice,
          description: 'For exploring what’s possible',
          features: [
            '3 AI trade signals per day',
            '250 tokens/response (2,500/day limit)',
            '1 broker connection',
            'Basic market analysis',
            'Standard execution speed',
            'Direct Execute only',
            '3-day trade history reports',
            'Standard community support',
          ],
          limits: [
            'Referral withdrawals locked',
            'No manager signal execution',
          ]
        },
        pro: {
          price: 10,
          description: 'For professional traders & scaling portfolios',
          features: [
            'Unlimited AI trade signals',
            '500 tokens/response (Institutional grade)',
            'Unlimited daily chat tokens',
            '5 broker connections',
            'Both Direct & Manager Execution',
            'Unlimited referral withdrawals',
            'Full trade history reports',
            'Priority execution speed',
            'Dedicated account manager',
          ],
          limits: []
        },
        enterprise: {
          price: Number(val.enterprise),
          description: 'For hedge funds & institutions',
          features: [
            'Everything in Pro',
            'Unlimited broker connections',
            'Institutional-grade AI models',
            'Dedicated account manager',
            'API access & webhooks',
            'White-label dashboard',
            'Custom integrations',
            'Multi-user team access',
            'SLA guarantee (99.9%)',
          ],
          limits: []
        }
      });
    }

    return NextResponse.json(val);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
