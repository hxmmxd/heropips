import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory paths in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to read .env.local manually to avoid external dependencies
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

if (!UTHO_API_KEY) {
  console.error("❌ Error: UTHO_API_KEY is not defined in your .env.local file.");
  console.log("💡 Please add: UTHO_API_KEY=your_utho_api_token to the end of .env.local and run this script again.");
  process.exit(1);
}

// Utho API requester
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
    if (!response.ok || data.status === 'error') {
      throw new Error(data.message || `API error code: ${response.status}`);
    }
    return data;
  } catch (err) {
    throw new Error(`Network failure or API error: ${err.message}`);
  }
}

async function main() {
  const action = process.argv[2];

  if (action === 'info') {
    console.log("📡 Fetching plans, regions, and images from Utho...");
    try {
      const [plansRes, imagesRes, regionsRes, keysRes] = await Promise.all([
        uthoRequest('/plans'),
        uthoRequest('/cloud/images'),
        uthoRequest('/dczones'),
        uthoRequest('/key').catch(() => ({ data: [] }))
      ]);

      console.log("\n📍 === AVAILABLE REGIONS (DC ZONES) ===");
      if (regionsRes.data && regionsRes.data.length > 0) {
        regionsRes.data.forEach(r => {
          console.log(`  • Region Slug: \x1b[36m${r.slug}\x1b[0m | Location: ${r.name}`);
        });
      } else {
        console.log("  No regions listed.");
      }

      console.log("\n🖥️ === AVAILABLE OS IMAGES (UBUNTU FILTERED) ===");
      if (imagesRes.data && imagesRes.data.length > 0) {
        imagesRes.data
          .filter(img => img.osname && img.osname.toLowerCase().includes('ubuntu'))
          .forEach(img => {
            console.log(`  • Image Tag: \x1b[33m${img.osname}\x1b[0m`);
          });
      } else {
        console.log("  No OS images found.");
      }

      console.log("\n💳 === RECOMMENDED VM HARDWARE PLANS (HOURLY / MONTHLY) ===");
      if (plansRes.data && plansRes.data.length > 0) {
        plansRes.data
          .slice(0, 15) // Show top 15 plans
          .forEach(p => {
            console.log(`  • Plan ID: \x1b[32m${p.id}\x1b[0m | CPU: ${p.cpu} Core(s) | RAM: ${p.ram} GB | Storage: ${p.disk} GB SSD | Price: $${p.price_hourly}/hr ($${p.price_monthly}/mo)`);
          });
      } else {
        console.log("  No plans found.");
      }

      console.log("\n🔑 === DETECTED SSH KEYS IN ACCOUNT ===");
      if (keysRes.data && keysRes.data.length > 0) {
        keysRes.data.forEach(k => {
          console.log(`  • Key ID: \x1b[35m${k.id}\x1b[0m | Name: ${k.name}`);
        });
      } else {
        console.log("  ⚠️ No SSH keys detected in Utho. Please add your SSH public key first!");
      }
      
      console.log("\n-----------------------------------------------------------------");
      console.log("👉 Next Step: Run 'node scripts/utho_provision.mjs deploy <dcslug> <planid> [image] [hostname]'");
      console.log("-----------------------------------------------------------------");
    } catch (e) {
      console.error("❌ Failed to query Utho:", e.message);
    }
  } else if (action === 'deploy') {
    const dcslug = process.argv[3];
    const planid = process.argv[4];
    const image = process.argv[5] || 'ubuntu-22.04-x86_64';
    const hostname = process.argv[6] || 'tradegpt-prod';

    if (!dcslug || !planid) {
      console.log("❌ Error: Missing parameters.");
      console.log("Usage: node scripts/utho_provision.mjs deploy <dcslug> <planid> [image] [hostname]");
      process.exit(1);
    }

    console.log(`🚀 Initiating deployment of '${hostname}' on Utho hourly billing...`);
    try {
      const payload = {
        dcslug,
        image,
        planid: parseInt(planid, 10),
        hostname,
        billingcycle: 'hourly'
      };

      const result = await uthoRequest('/cloud/deploy/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log("\n✅ VM Deployment Initiated Successfully!");
      console.log("---------------------------------------");
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error("❌ Deployment failed:", e.message);
    }
  } else {
    console.log("🛠️  Utho Cloud Automation Console");
    console.log("===============================");
    console.log("Usage:");
    console.log("  node scripts/utho_provision.mjs info");
    console.log("  node scripts/utho_provision.mjs deploy <dcslug> <planid> [image] [hostname]");
  }
}

main();
