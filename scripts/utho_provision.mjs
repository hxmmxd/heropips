import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

// Secure DNS lookup fallback override to handle local ISP resolving issues
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
    console.error("DEBUG FETCH ERROR:", err);
    throw new Error(`Network failure or API error: ${err.message}`);
  }
}

async function main() {
  const action = process.argv[2];

  if (action === 'info') {
    console.log("📡 Fetching plans, regions, and images from Utho...");
    try {
      const [plansRes, imagesRes, regionsRes, keysRes] = await Promise.all([
        uthoRequest('/plans?currency=INR'),
        uthoRequest('/cloud/images'),
        uthoRequest('/dczones'),
        uthoRequest('/key').catch(() => ({ data: [] }))
      ]);

      console.log("\n📍 === AVAILABLE REGIONS (DC ZONES) ===");
      const regionsList = regionsRes.dczones || [];
      if (regionsList.length > 0) {
        regionsList.forEach(r => {
          console.log(`  • Region Slug: \x1b[36m${r.slug}\x1b[0m | Location: ${r.city} (${r.country}) | Status: ${r.status}`);
        });
      } else {
        console.log("  No regions listed.");
      }

      console.log("\n🖥️ === AVAILABLE OS IMAGES (UBUNTU FILTERED) ===");
      const imagesList = imagesRes.images || [];
      const ubuntuImages = imagesList.filter(img => img.image && img.image.toLowerCase().includes('ubuntu'));
      if (ubuntuImages.length > 0) {
        ubuntuImages.forEach(img => {
          console.log(`  • Image Tag: \x1b[33m${img.image}\x1b[0m`);
        });
      } else {
        console.log("  No Ubuntu OS images found.");
      }

      console.log("\n💳 === RECOMMENDED VM HARDWARE PLANS (EST. HOURLY / MONTHLY IN INR) ===");
      const plansList = Array.isArray(plansRes) ? plansRes : (plansRes.plans || plansRes.data || []);
      const recommendedPlans = plansList.filter(p => p.slug === 'basic' || p.slug === 'generalpurpose');
      if (recommendedPlans.length > 0) {
        recommendedPlans
          .slice(0, 12)
          .forEach(p => {
            const monthlyPrice = p.price || 0;
            const hourlyPrice = (monthlyPrice / 730).toFixed(2);
            const ramGb = (p.ram / 1024).toFixed(0);
            console.log(`  • Plan ID: \x1b[32m${p.id}\x1b[0m | CPU: ${p.cpu} Core(s) | RAM: ${ramGb} GB | Price: ~₹${hourlyPrice}/hr (₹${monthlyPrice}/mo)`);
          });
      } else if (plansList.length > 0) {
        plansList
          .slice(0, 12)
          .forEach(p => {
            const monthlyPrice = p.price || 0;
            const hourlyPrice = (monthlyPrice / 730).toFixed(2);
            const ramGb = (p.ram / 1024).toFixed(0);
            console.log(`  • Plan ID: \x1b[32m${p.id}\x1b[0m | CPU: ${p.cpu} Core(s) | RAM: ${ramGb} GB | Price: ~₹${hourlyPrice}/hr (₹${monthlyPrice}/mo)`);
          });
      } else {
        console.log("  No plans found.");
      }

      console.log("\n🔑 === DETECTED SSH KEYS IN ACCOUNT ===");
      const keysList = keysRes.key || [];
      if (keysList.length > 0) {
        keysList.forEach(k => {
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
    const hostname = process.argv[6] || 'xyrotrade-prod';

    if (!dcslug || !planid) {
      console.log("❌ Error: Missing parameters.");
      console.log("Usage: node scripts/utho_provision.mjs deploy <dcslug> <planid> [image] [hostname]");
      process.exit(1);
    }

    console.log(`📡 Checking for SSH Keys in your Utho account...`);
    try {
      const keysRes = await uthoRequest('/key').catch(() => ({ key: [] }));
      const keysList = keysRes.key || [];
      let sshkeys = '';
      if (keysList.length > 0) {
        sshkeys = keysList[0].id.toString();
        console.log(`🔑 Found SSH Key: '${keysList[0].name}' (ID: ${sshkeys}). Attaching to instance...`);
      } else {
        console.warn(`⚠️ Warning: No SSH Keys found in Utho. Proceeding without attaching a key.`);
      }

      console.log(`🚀 Initiating deployment of '${hostname}' on Utho hourly billing...`);
      const payload = {
        dcslug,
        image,
        planid: parseInt(planid, 10),
        billingcycle: 'hourly',
        cloud: [{ hostname }]
      };

      if (sshkeys) {
        payload.sshkeys = sshkeys;
      }

      const result = await uthoRequest('/cloud/deploy/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log("\n✅ VM Deployment Response:");
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
