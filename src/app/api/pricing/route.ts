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
        starter: {
          price: 20,
          features: [
            '5 AI trade signals per day',
            '1 broker connection',
            'Basic market analysis',
            'Email support',
            'Trade history (30 days)',
            'Standard execution speed',
          ],
          limits: [
            'No advanced indicators',
            'No priority execution',
          ]
        },
        pro: {
          price: 50,
          features: [
            'Unlimited AI trade signals',
            '5 broker connections',
            'Advanced technical analysis',
            'Priority support (24/7)',
            'Full trade history',
            'Priority execution speed',
            'Risk management tools',
            'Custom trading strategies',
          ],
          limits: []
        },
        enterprise: {
          price: 100,
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

    // Adapt legacy configuration format: {"starter": 20, "pro": 50, "enterprise": 100}
    const val = data.value;
    if (typeof val.starter === 'number' || typeof val.starter === 'string') {
      return NextResponse.json({
        starter: {
          price: Number(val.starter),
          features: [
            '5 AI trade signals per day',
            '1 broker connection',
            'Basic market analysis',
            'Email support',
            'Trade history (30 days)',
            'Standard execution speed',
          ],
          limits: [
            'No advanced indicators',
            'No priority execution',
          ]
        },
        pro: {
          price: Number(val.pro),
          features: [
            'Unlimited AI trade signals',
            '5 broker connections',
            'Advanced technical analysis',
            'Priority support (24/7)',
            'Full trade history',
            'Priority execution speed',
            'Risk management tools',
            'Custom trading strategies',
          ],
          limits: []
        },
        enterprise: {
          price: Number(val.enterprise),
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
