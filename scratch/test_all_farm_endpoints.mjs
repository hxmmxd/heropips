import fs from 'fs';
import path from 'path';

const FARM_BASE = 'http://4.224.249.231:8080';
const FARM_KEY = '99E23B08-3BBBFA50-7EE7609F-5C0AA0C2';
const TEST_ACCOUNT = 'mt5_5051989467';
const TEST_LOGIN = '5051989467';

const HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': FARM_KEY,
};

const results = [];

async function testEndpoint(name, method, url, body = null) {
  const start = Date.now();
  const option = {
    method,
    headers: HEADERS,
  };
  if (body) {
    option.body = JSON.stringify(body);
  }

  console.log(`[TEST] ${name} (${method} ${url.replace(FARM_BASE, '')})`);
  try {
    const res = await fetch(url, option);
    const duration = Date.now() - start;
    const isJson = res.headers.get('content-type')?.includes('application/json');
    let data = null;
    let text = '';
    if (isJson) {
      data = await res.json();
    } else {
      text = await res.text();
    }

    const success = res.ok;
    console.log(`  -> Status: ${res.status} | Time: ${duration}ms | Success: ${success}`);
    
    const resultObj = {
      name,
      method,
      url: url.replace(FARM_BASE, ''),
      status: res.status,
      durationMs: duration,
      success,
      response: data || text,
    };
    results.push(resultObj);
    return { success, status: res.status, data, text, duration };
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`  -> Failed: ${err.message} | Time: ${duration}ms`);
    results.push({
      name,
      method,
      url: url.replace(FARM_BASE, ''),
      status: 'ERROR',
      durationMs: duration,
      success: false,
      error: err.message,
    });
    return { success: false, status: 'ERROR', error: err.message, duration };
  }
}

async function runAllTests() {
  console.log('=== STARTING ALL MT5 FARM API ENDPOINT TESTS ===\n');

  // 1. Health Endpoint
  await testEndpoint('Orchestrator Health', 'GET', `${FARM_BASE}/health`);

  // 2. Get Accounts
  const accountsRes = await testEndpoint('Get Accounts', 'GET', `${FARM_BASE}/accounts`);
  
  // 3. Get Specific Account Info
  await testEndpoint('Get Specific Account Status', 'GET', `${FARM_BASE}/accounts/${TEST_ACCOUNT}`);

  // 4. Search Brokers
  await testEndpoint('Search Brokers', 'GET', `${FARM_BASE}/brokers/search?q=MetaQuotes`);

  // 5. Count Brokers (check if exists)
  await testEndpoint('Count Brokers', 'GET', `${FARM_BASE}/brokers/count`);

  // 6. Admin Keys
  await testEndpoint('Admin Get Keys', 'GET', `${FARM_BASE}/admin/keys`);

  // 7. Admin Stats
  await testEndpoint('Admin Get Stats', 'GET', `${FARM_BASE}/admin/stats`);

  // 8. Sidecar Account Info
  await testEndpoint(
    'Sidecar Account Info',
    'GET',
    `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/account-information`
  );

  // 9. Sidecar Symbols
  const symbolsRes = await testEndpoint(
    'Sidecar Get Symbols',
    'GET',
    `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/symbols`
  );
  if (symbolsRes.success && Array.isArray(symbolsRes.data)) {
    console.log(`  -> Total symbols found: ${symbolsRes.data.length}. First 5: ${symbolsRes.data.slice(0, 5).join(', ')}`);
  }

  // 10. Sidecar Symbol Spec
  await testEndpoint(
    'Sidecar Symbol Specification',
    'GET',
    `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/symbols/EURUSD/specification`
  );

  // 11. Sidecar Get Positions
  await testEndpoint(
    'Sidecar Get Positions (Initial)',
    'GET',
    `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/positions`
  );

  // 12. Sidecar Get Orders
  await testEndpoint(
    'Sidecar Get Orders (Initial)',
    'GET',
    `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/orders`
  );

  // 13. Sidecar Get Deal History
  await testEndpoint(
    'Sidecar Get Deals (Last 1 day)',
    'GET',
    `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/history/deals?days=1`
  );

  // === TRADING FLOW ===
  console.log('\n--- STARTING TRADING ENDPOINTS FLOW ---');

  // 14. Place Limit Order (Pending Order)
  const limitOrderPayload = {
    actionType: 'ORDER_TYPE_BUY_LIMIT',
    symbol: 'EURUSD',
    volume: 0.01,
    price: 1.05000,
    stopLoss: 1.04000,
    takeProfit: 1.06000,
    comment: 'TradeGPT API Test Limit',
  };

  const placeLimitRes = await testEndpoint(
    'Place Limit Order',
    'POST',
    `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/trade`,
    limitOrderPayload
  );

  let limitOrderId = null;
  if (placeLimitRes.success && placeLimitRes.data) {
    limitOrderId = placeLimitRes.data.orderId || placeLimitRes.data.id || (placeLimitRes.data.result && placeLimitRes.data.result.orderId);
    console.log(`  -> Placed Limit Order. ID: ${limitOrderId}`);
  }

  if (limitOrderId) {
    // 15. Check Pending Orders
    await testEndpoint(
      'Verify Pending Order exists',
      'GET',
      `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/orders`
    );

    // 16. Cancel Limit Order
    await testEndpoint(
      'Cancel Pending Order',
      'DELETE',
      `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/orders/${limitOrderId}`
    );
  }

  // 17. Place Market Order (Immediate Position)
  const marketOrderPayload = {
    actionType: 'ORDER_TYPE_BUY',
    symbol: 'EURUSD',
    volume: 0.01,
    comment: 'TradeGPT API Test Market',
  };

  const placeMarketRes = await testEndpoint(
    'Place Market Order',
    'POST',
    `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/trade`,
    marketOrderPayload
  );

  let positionId = null;
  if (placeMarketRes.success && placeMarketRes.data) {
    positionId = placeMarketRes.data.positionId || placeMarketRes.data.id || (placeMarketRes.data.result && placeMarketRes.data.result.positionId);
    console.log(`  -> Placed Market Order. Position ID: ${positionId}`);
  }

  if (positionId) {
    // 18. Verify position is active
    await testEndpoint(
      'Verify Position is Active',
      'GET',
      `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/positions`
    );

    // 19. Modify Position SL/TP
    const modifyPayload = {
      stopLoss: 1.06000,
      takeProfit: 1.15000,
    };
    await testEndpoint(
      'Modify Position SL/TP',
      'PUT',
      `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/positions/${positionId}`,
      modifyPayload
    );

    // 20. Close Position
    await testEndpoint(
      'Close Position',
      'DELETE',
      `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/positions/${positionId}`
    );

    // 21. Verify position is closed
    await testEndpoint(
      'Verify Position is Closed',
      'GET',
      `${FARM_BASE}/accounts/${TEST_ACCOUNT}/proxy/users/current/accounts/${TEST_LOGIN}/positions`
    );
  }

  // === HIBERNATION / WAKE FLOW ===
  console.log('\n--- STARTING HIBERNATION / WAKE FLOW ---');

  // 22. Hibernate account
  const hibernateRes = await testEndpoint(
    'Hibernate Account',
    'POST',
    `${FARM_BASE}/accounts/${TEST_ACCOUNT}/hibernate`
  );

  if (hibernateRes.success) {
    // Wait a couple of seconds for hibernation to take effect
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 23. Verify account is hibernated
    const statusRes = await testEndpoint(
      'Verify Account Status is Hibernated',
      'GET',
      `${FARM_BASE}/accounts/${TEST_ACCOUNT}`
    );
    console.log(`  -> Current Status: ${statusRes.data?.status}`);

    // 24. Wake account
    const wakeRes = await testEndpoint(
      'Wake Account',
      'POST',
      `${FARM_BASE}/accounts/${TEST_ACCOUNT}/wake`
    );

    if (wakeRes.success) {
      console.log('  -> Waking account... Polling status until connected...');
      let attempts = 0;
      let connected = false;
      while (attempts < 10 && !connected) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        const poll = await fetch(`${FARM_BASE}/accounts/${TEST_ACCOUNT}`, { headers: HEADERS });
        if (poll.ok) {
          const pollData = await poll.json();
          console.log(`    [Attempt ${attempts}] Status: ${pollData.status}`);
          if (pollData.status === 'connected') {
            connected = true;
          }
        }
      }
      console.log(`  -> Polling finished. Connected: ${connected}`);
    }
  }

  console.log('\n=== ALL TESTS FINISHED ===');
  
  // Write results to JSON
  const outputFilePath = path.join(process.cwd(), 'scratch', 'farm_api_test_results.json');
  fs.writeFileSync(outputFilePath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to: ${outputFilePath}`);
}

runAllTests().catch(console.error);
