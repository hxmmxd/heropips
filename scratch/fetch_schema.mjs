(async () => {
  const url = 'https://nccjtmgyktnueyidxknj.supabase.co/rest/v1/';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jY2p0bWd5a3RudWV5aWR4a25qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY0NDM5NiwiZXhwIjoyMDk1MjIwMzk2fQ.G7O5I0FuPSwL_8aV8ovzUkvd1wwHrKIwXSEBwceCCm0';

  try {
    console.log('Fetching OpenAPI spec from PostgREST...');
    const response = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Paths in API:');
    const rpcPaths = Object.keys(data.paths).filter(p => p.startsWith('/rpc/'));
    console.log(rpcPaths);
  } catch (error) {
    console.error('Failed to fetch:', error);
  }
})();
