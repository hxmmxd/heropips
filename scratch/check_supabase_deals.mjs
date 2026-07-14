import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
}

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearCacheAndCheck() {
  const userId = 'dded1522-9719-4672-b24a-52827ba4a9fb';
  const brokerId = 'mt5_5051989467';
  
  console.log('Clearing risk_stats_cache for:', brokerId);
  const { error: delErr } = await sb
    .from('risk_stats_cache')
    .delete()
    .eq('user_id', userId)
    .eq('broker_id', brokerId);

  if (delErr) {
    console.error('Delete error:', delErr.message);
  } else {
    console.log('Successfully cleared cache!');
  }

  // Also clear the non-prefixed cache just in case
  await sb
    .from('risk_stats_cache')
    .delete()
    .eq('user_id', userId)
    .eq('broker_id', '5051989467');
}

clearCacheAndCheck().catch(console.error);
