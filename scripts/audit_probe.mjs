import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  });
  return env;
}

const env = loadEnv();
const FARM_BASE = env.MT5_FARM_ORCHESTRATOR_URL || 'http://103.209.146.169:8080';
const FARM_KEY  = env.MT5_FARM_API_KEY || '99E23B08-3BBBFA50-7EE7609F-5C0AA0C2';

console.log(`📡 Diagnostic Probing MT5 Orchestrator at: ${FARM_BASE}`);

async function audit() {
  const startHealth = Date.now();
  try {
    const healthRes = await fetch(`${FARM_BASE}/health`, {
      headers: { 'X-API-Key': FARM_KEY },
      signal: AbortSignal.timeout(5000),
    });
    const healthMs = Date.now() - startHealth;
    if (healthRes.ok) {
      const health = await healthRes.json();
      console.log(`✅ Orchestrator /health responded in ${healthMs}ms:`);
      console.log(JSON.stringify(health, null, 2));
    } else {
      console.error(`❌ Health check HTTP status: ${healthRes.status}`);
    }
  } catch (err) {
    console.error(`❌ Health check failed (${Date.now() - startHealth}ms):`, err.message);
  }

  console.log('\n---------------------------------------------------');
  console.log('📡 Fetching registered MT5 sidecar accounts (/accounts)...');
  const startAccounts = Date.now();
  try {
    const accRes = await fetch(`${FARM_BASE}/accounts`, {
      headers: { 'X-API-Key': FARM_KEY },
      signal: AbortSignal.timeout(5000),
    });
    const accMs = Date.now() - startAccounts;
    if (accRes.ok) {
      const accounts = await accRes.json();
      console.log(`✅ GET /accounts responded in ${accMs}ms (${accounts.length} registered accounts):`);
      accounts.forEach(a => {
        console.log(`  • AccountID: ${a.accountId} | Login: ${a.login} | Server: ${a.server} | Status: ${a.status} | Balance: $${a.balance} | Equity: $${a.equity} | Ping: ${a.pingLatencyMs}ms`);
      });

      // For each account, test sidecar proxy response speed
      for (const a of accounts) {
        const id = a.accountId || String(a.login);
        console.log(`\n🔍 Probing Sidecar Proxy for Account #${id}...`);
        const startProxy = Date.now();
        try {
          const proxyRes = await fetch(`${FARM_BASE}/accounts/${id}/proxy/users/current/accounts/${id}/account-information`, {
            headers: { 'X-API-Key': FARM_KEY },
            signal: AbortSignal.timeout(5000),
          });
          const proxyMs = Date.now() - startProxy;
          if (proxyRes.ok) {
            const info = await proxyRes.json();
            console.log(`  ✅ Proxy /account-information responded in ${proxyMs}ms! Balance: $${info.balance}, Equity: $${info.equity}, FreeMargin: $${info.freeMargin || info.marginFree}`);
          } else {
            const errText = await proxyRes.text().catch(() => '');
            console.log(`  ⚠️ Proxy returned HTTP ${proxyRes.status} in ${proxyMs}ms: ${errText.slice(0, 100)}`);
          }
        } catch (pErr) {
          console.log(`  ❌ Proxy call failed (${Date.now() - startProxy}ms):`, pErr.message);
        }
      }

    } else {
      console.error(`❌ GET /accounts HTTP status: ${accRes.status}`);
    }
  } catch (err) {
    console.error(`❌ GET /accounts failed (${Date.now() - startAccounts}ms):`, err.message);
  }
}

audit();
