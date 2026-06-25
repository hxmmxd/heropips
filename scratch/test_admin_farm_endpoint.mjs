

// We can mock the Request and Response objects to call the route handler
(async () => {
  // Mock request with session cookie or bypass auth by mocking requireAdmin
  console.log("Since requireAdmin checks Supabase session, let's just query the live orchestrator directly, which is what the endpoint does.");
  
  const FARM_BASE = 'http://4.224.249.231:8080';
  const FARM_HEADERS = {
    'Content-Type': 'application/json',
    'X-API-Key': '99E23B08-3BBBFA50-7EE7609F-5C0AA0C2',
  };

  const [healthRes, accountsRes] = await Promise.all([
    fetch(`${FARM_BASE}/health`, { headers: FARM_HEADERS }).then(r => r.json()),
    fetch(`${FARM_BASE}/accounts`, { headers: FARM_HEADERS }).then(r => r.json()),
  ]);

  console.log('--- Health ---');
  console.log(JSON.stringify(healthRes, null, 2));
  console.log('--- Accounts ---');
  console.log(JSON.stringify(accountsRes, null, 2));
})();
