import fs from 'fs';
import path from 'path';
import dns from 'dns';

const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'api.utho.com') {
    if (options && options.all) {
      return callback(null, [{ address: '103.127.28.51', family: 4 }]);
    }
    return callback(null, '103.127.28.51', 4);
  }
  return originalLookup(hostname, options, callback);
};

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

async function uthoRequest(endpoint, options = {}) {
  const url = `https://api.utho.com/v2${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${UTHO_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Utho API raw response: ${text}`);
    }
    return data;
  } catch (err) {
    console.error("DEBUG FETCH ERROR:", err);
    throw new Error(`Network failure or API error: ${err.message}`);
  }
}

async function main() {
  try {
    const res = await uthoRequest('/cloud/instances');
    console.log(JSON.stringify(res, null, 2));
  } catch(e) {
    console.error(e);
  }
}

main();
