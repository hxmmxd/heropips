const FARM_BASE = 'http://4.224.249.231:8080';
const FARM_KEY = '99E23B08-3BBBFA50-7EE7609F-5C0AA0C2';
const ACCOUNT_ID = 'mt5_5051989467';
const LOGIN = '5051989467';

const HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': FARM_KEY,
};

async function checkStatus() {
  const time = new Date().toLocaleTimeString();
  try {
    const orchestratorStart = Date.now();
    const orchestratorRes = await fetch(`${FARM_BASE}/accounts/${ACCOUNT_ID}`, { headers: HEADERS });
    const orchestratorTime = Date.now() - orchestratorStart;
    
    let orchestratorStatus = 'error';
    let orchestratorData = null;
    if (orchestratorRes.ok) {
      orchestratorData = await orchestratorRes.json();
      orchestratorStatus = orchestratorData.status;
    } else {
      orchestratorStatus = `http_${orchestratorRes.status}`;
    }

    const sidecarStart = Date.now();
    const sidecarRes = await fetch(
      `${FARM_BASE}/accounts/${ACCOUNT_ID}/proxy/users/current/accounts/${LOGIN}/account-information`,
      { headers: HEADERS, signal: AbortSignal.timeout(8000) }
    );
    const sidecarTime = Date.now() - sidecarStart;

    let sidecarStatus = 'error';
    let sidecarData = null;
    if (sidecarRes.ok) {
      sidecarData = await sidecarRes.json();
      sidecarStatus = 'success';
    } else {
      sidecarStatus = `http_${sidecarRes.status}`;
    }

    console.log(
      `[${time}] Orchestrator: ${orchestratorStatus} (${orchestratorTime}ms) | Sidecar: ${sidecarStatus} (${sidecarTime}ms) | Balance: ${sidecarData ? sidecarData.balance : 'N/A'}`
    );
  } catch (err) {
    console.log(`[${time}] Error during poll: ${err.message}`);
  }
}

console.log('Starting poll every 3 seconds for 3 minutes...');
const interval = setInterval(checkStatus, 3000);

setTimeout(() => {
  clearInterval(interval);
  console.log('Poll finished.');
}, 180000);
