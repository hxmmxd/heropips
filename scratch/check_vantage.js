const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple parser for .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

async function run() {
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data, error } = await sb.from('broker_accounts').select('*');
  if (error) {
    console.error('Error fetching broker accounts:', error);
    return;
  }
  
  console.log('Broker Accounts:');
  data.forEach(acc => {
    console.log(`- ID: ${acc.id}, Name: ${acc.name}, Login: ${acc.mt5_login}, Allowed Symbols:`, acc.allowed_symbols);
  });
}

run();
