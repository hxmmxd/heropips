import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://nccjtmgyktnueyidxknj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jY2p0bWd5a3RudWV5aWR4a25qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY0NDM5NiwiZXhwIjoyMDk1MjIwMzk2fQ.G7O5I0FuPSwL_8aV8ovzUkvd1wwHrKIwXSEBwceCCm0'
);

(async () => {
  const { data, error } = await sb.from('broker_accounts').select('*').eq('mt5_login', '5051989467');
  if (error) {
    console.error('Error:', error);
  } else {
    if (data && data.length > 0) {
      const clean = data.map(d => {
        const copy = { ...d };
        delete copy.allowed_symbols;
        return copy;
      });
      console.log('Broker Accounts:', JSON.stringify(clean, null, 2));
    } else {
      console.log('No accounts found');
    }
  }
  process.exit(0);
})();



