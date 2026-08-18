import { syncBrokerToSupabase } from './src/lib/broker';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  // Get the user ID
  const { data: profiles } = await sb.from('profiles').select('id').eq('email', 'hxmmxd.khan@gmail.com');
  const userId = profiles?.[0]?.id;
  
  if (!userId) {
    console.error('User not found');
    return;
  }
  
  const farmNode: any = {
    id: '25822553',
    login: '25822553',
    name: 'VantageInternational-25822553',
    server: 'VantageInternational-Demo',
    status: 'connected',
    balance: 10000,
    equity: 10000,
    pnl: 0,
    timezone_offset: 0,
    broker_timezone_name: 'UTC',
    allowed_symbols: []
  };

  await syncBrokerToSupabase(farmNode, userId);
}
main();
