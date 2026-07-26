import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://nccjtmgyktnueyidxknj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jY2p0bWd5a3RudWV5aWR4a25qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY0NDM5NiwiZXhwIjoyMDk1MjIwMzk2fQ.G7O5I0FuPSwL_8aV8ovzUkvd1wwHrKIwXSEBwceCCm0'
);

(async () => {
  console.log('Applying usage limits columns to public.profiles table...');
  const { data, error } = await sb.rpc('exec_sql_raw', {
    sql_text: `
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS daily_tokens_used INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS daily_signals_used INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS last_limit_reset_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    `
  });

  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('Migration successfully applied! Details:', data);
  }
  process.exit(error ? 1 : 0);
})();
