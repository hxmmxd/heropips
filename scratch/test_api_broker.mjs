import { createClient } from '@supabase/supabase-js';


const sb = createClient(
  'https://nccjtmgyktnueyidxknj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jY2p0bWd5a3RudWV5aWR4a25qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY0NDM5NiwiZXhwIjoyMDk1MjIwMzk2fQ.G7O5I0FuPSwL_8aV8ovzUkvd1wwHrKIwXSEBwceCCm0'
);

const userId = 'dded1522-9719-4672-b24a-52827ba4a9fb';
const FARM_BASE = 'http://4.224.249.231:8080';
const FARM_HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': '99E23B08-3BBBFA50-7EE7609F-5C0AA0C2',
};

async function farmGetAccount(accountId) {
  const res = await fetch(`${FARM_BASE}/accounts/${accountId}`, { headers: FARM_HEADERS });
  if (!res.ok) return null;
  return res.json();
}

async function farmGetAccountInfo(accountId) {
  const res = await fetch(`${FARM_BASE}/accounts/${accountId}/proxy/users/current/accounts/${accountId}/account-information`, { headers: FARM_HEADERS });
  if (!res.ok) return null;
  return res.json();
}

(async () => {
  const { data: cached, error } = await sb
    .from('broker_accounts')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }

  console.log('Cached brokers in Supabase for user:', JSON.stringify(cached, null, 2));

  for (const b of cached) {
    const accountId = b.mt5_login || b.metaapi_id || b.id;
    console.log(`\n--- Fetching live data for accountId: ${accountId} ---`);
    try {
      const farmAcct = await farmGetAccount(accountId);
      const farmInfo = await farmGetAccountInfo(accountId);

      console.log('Orchestrator account:', JSON.stringify(farmAcct, null, 2));
      console.log('Sidecar account info:', JSON.stringify(farmInfo, null, 2));
    } catch (err) {
      console.error(`Failed to fetch for ${accountId}:`, err.message);
    }
  }
  process.exit(0);
})();
