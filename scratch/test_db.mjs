import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://nccjtmgyktnueyidxknj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jY2p0bWd5a3RudWV5aWR4a25qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY0NDM5NiwiZXhwIjoyMDk1MjIwMzk2fQ.G7O5I0FuPSwL_8aV8ovzUkvd1wwHrKIwXSEBwceCCm0'
);

(async () => {
  // Get a real user ID
  const { data: users, error: userErr } = await sb.from('profiles').select('id').limit(1);
  if (userErr || !users || users.length === 0) {
    console.error('Failed to get a user:', userErr?.message);
    process.exit(1);
  }
  const realUserId = users[0].id;
  console.log('Using real user ID:', realUserId);

  // Test insert again with real user ID
  const { error: e3 } = await sb.from('wallet_transactions').insert({
    user_id: realUserId,
    tx_type: 'course_purchase',
    amount: -1, status: 'completed', metadata: { test: true },
  });
  
  if (e3) {
    console.log('INSERT STILL FAILING:', e3.code, e3.message);
  } else {
    console.log('INSERT SUCCESSFUL! The constraint is working.');
    await sb.from('wallet_transactions').delete().eq('amount', -1).eq('user_id', realUserId);
  }
  process.exit(0);
})();
