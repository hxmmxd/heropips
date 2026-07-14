import { farmGetAccount, farmGetAccountInfo, farmGetPositions } from '../src/lib/mt5farm.js';

async function checkStatus() {
  const accountId = 'mt5_5051989467';
  console.log(`Checking farm orchestrator account info for: ${accountId}`);
  
  try {
    const acct = await farmGetAccount(accountId);
    console.log('Orchestrator account record:', JSON.stringify(acct, null, 2));
  } catch (err) {
    console.error('Error fetching orchestrator account:', err.message);
  }
  
  try {
    const info = await farmGetAccountInfo(accountId);
    console.log('Sidecar account-information:', JSON.stringify(info, null, 2));
  } catch (err) {
    console.error('Error fetching sidecar info:', err.message);
  }

  try {
    const positions = await farmGetPositions(accountId);
    console.log('Sidecar positions:', JSON.stringify(positions, null, 2));
  } catch (err) {
    console.error('Error fetching sidecar positions:', err.message);
  }
}

checkStatus().catch(console.error);
