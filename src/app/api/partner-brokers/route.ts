import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

let _admin: any = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

export interface PartnerBroker {
  id: string;
  name: string;
  logo: string;           // emoji or URL
  platform: 'mt5' | 'mt4' | 'ctrader';
  servers: string[];      // list of server names
  rebate_per_lot: number; // USD per lot
  rebate_currency: string;
  website: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Public endpoint — returns active partner brokers for the Connect Broker modal.
 * No authentication required (server list is not sensitive).
 */
export async function GET() {
  try {
    const { data } = await getAdmin()
      .from('platform_config')
      .select('value')
      .eq('key', 'partner_brokers')
      .single();

    const brokers: PartnerBroker[] = data?.value ?? [];
    const active = brokers.filter((b: PartnerBroker) => b.is_active);

    return NextResponse.json({ brokers: active });
  } catch {
    return NextResponse.json({ brokers: [] });
  }
}
