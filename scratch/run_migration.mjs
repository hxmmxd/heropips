import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://nccjtmgyktnueyidxknj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jY2p0bWd5a3RudWV5aWR4a25qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY0NDM5NiwiZXhwIjoyMDk1MjIwMzk2fQ.G7O5I0FuPSwL_8aV8ovzUkvd1wwHrKIwXSEBwceCCm0'
);

(async () => {
  console.log('Applying migration to remote database via RPC...');
  const { data, error } = await sb.rpc('exec_sql_raw', {
    sql_text: `
      ALTER TABLE public.broker_accounts 
      ADD COLUMN IF NOT EXISTS timezone_offset numeric(5, 2) DEFAULT 0.00 NOT NULL,
      ADD COLUMN IF NOT EXISTS broker_timezone_name text DEFAULT 'UTC' NOT NULL,
      ADD COLUMN IF NOT EXISTS allowed_symbols jsonb DEFAULT '[]'::jsonb NOT NULL;
    `
  });

  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('Migration successfully applied! Details:', data);
  }
  process.exit(error ? 1 : 0);
})();
