import fs from 'fs';
import path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  });
  return env;
}

const env = loadEnvLocal();
const UTHO_API_KEY = env.UTHO_API_KEY;

async function checkInstances() {
  const endpoints = ['/cloud', '/cloud/instances', '/cloud/list', '/cloud/vms'];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`https://api.utho.com/v2${ep}`, {
        headers: { 'Authorization': `Bearer ${UTHO_API_KEY}` }
      });
      const data = await res.json();
      console.log(`Endpoint ${ep}:`, JSON.stringify(data, null, 2));
    } catch (e) {
      console.log(`Endpoint ${ep} error:`, e.message);
    }
  }
}

checkInstances();
