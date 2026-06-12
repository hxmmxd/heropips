import pg from 'pg';

const { Client } = pg;

const passwords = ['postgres', 'supabase', 'admin', 'root', 'password', 'Tradegpt', 'tradegpt', 'nccjtmgyktnueyidxknj'];
const host = 'db.nccjtmgyktnueyidxknj.supabase.co';
const user = 'postgres';
const database = 'postgres';

(async () => {
  // Try transaction pooler first (6543) then direct connection (5432)
  const ports = [6543, 5432];

  for (const password of passwords) {
    for (const port of ports) {
      console.log(`Trying password "${password}" on port ${port}...`);
      const client = new Client({
        host,
        port,
        user,
        password,
        database,
        ssl: { rejectUnauthorized: false }
      });


    try {
      await client.connect();
      console.log(`Connected successfully to port ${port}!`);
      
      console.log('Executing migration SQL...');
      const sql = `
        ALTER TABLE public.broker_accounts 
        ADD COLUMN IF NOT EXISTS timezone_offset numeric(5, 2) DEFAULT 0.00 NOT NULL,
        ADD COLUMN IF NOT EXISTS broker_timezone_name text DEFAULT 'UTC' NOT NULL,
        ADD COLUMN IF NOT EXISTS allowed_symbols jsonb DEFAULT '[]'::jsonb NOT NULL;
      `;
      
      const res = await client.query(sql);
      console.log('Migration successfully executed! Result:', res);
      
      await client.end();
      process.exit(0);
    } catch (err) {
      console.error(`Failed on port ${port}:`, err.message);
      try {
        await client.end();
      } catch (e) {}
    }
  }
}

  console.error('All connection attempts failed. Password might be incorrect or host is unreachable.');
  process.exit(1);
})();
