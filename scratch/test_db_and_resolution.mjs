import { createClient } from '@supabase/supabase-js';
import { resolveAccountId as resolveFarmAccountId } from '../src/lib/mt5farm.js';

const sb = createClient(
  'https://nccjtmgyktnueyidxknj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jY2p0bWd5a3RudWV5aWR4a25qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY0NDM5NiwiZXhwIjoyMDk1MjIwMzk2fQ.G7O5I0FuPSwL_8aV8ovzUkvd1wwHrKIwXSEBwceCCm0'
);

async function testResolution() {
  const userId = 'dded1522-9719-4672-b24a-52827ba4a9fb';
  const originalBrokerId = 'mt5_5051989467';
  
  console.log(`Testing with user_id: ${userId}`);
  console.log(`Original brokerId: ${originalBrokerId}`);
  
  // 1. Normalize brokerId
  let brokerId = originalBrokerId;
  if (brokerId && typeof brokerId === 'string') {
    brokerId = brokerId.replace(/^mt5_/, '');
  }
  console.log(`Normalized brokerId: ${brokerId}`);
  
  // 2. Test POST auth check query
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brokerId);
  let query = sb.from('broker_accounts').select('id').eq('user_id', userId);
  if (isUuid) {
    query = query.eq('id', brokerId);
  } else {
    query = query.or(`metaapi_id.eq.${brokerId},mt5_login.eq.${brokerId}`);
  }
  
  const { data: brokerMatch, error: matchError } = await query.maybeSingle();
  if (matchError) {
    console.error('Error during owner check:', matchError);
  } else {
    console.log('Owner check brokerMatch result:', brokerMatch);
    if (brokerMatch) {
      console.log('✅ PASS: Owner check successfully found the broker account.');
    } else {
      console.error('❌ FAIL: Owner check did not find the broker account.');
    }
  }
  
  // 3. Test resolveAccountId (simulating updated resolveAccountId logic)
  const cleanId = originalBrokerId.replace(/^mt5_/, '');
  const isUuid2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
  let query2 = sb.from('broker_accounts').select('mt5_login, metaapi_id').eq('user_id', userId);
  
  if (isUuid2) {
    query2 = query2.eq('id', cleanId);
  } else {
    query2 = query2.or(`mt5_login.eq.${cleanId},metaapi_id.eq.${cleanId},mt5_login.eq.${originalBrokerId},metaapi_id.eq.${originalBrokerId}`);
  }
  
  const { data: resolveData, error: resolveError } = await query2.maybeSingle();
    
  if (resolveError) {
    console.error('Error resolving account ID:', resolveError);
  } else {
    console.log('Resolved DB data:', resolveData);
    const resolvedLogin = resolveData?.mt5_login || resolveData?.metaapi_id || cleanId;
    console.log('Resolved login number:', resolvedLogin);
    
    // Test resolveFarmAccountId
    const farmAccountId = await resolveFarmAccountId(resolvedLogin);
    console.log('Resolved Farm Account ID:', farmAccountId);
    
    if (farmAccountId === 'mt5_5051989467') {
      console.log('✅ PASS: Successfully resolved farm account ID to mt5_5051989467.');
    } else {
      console.error('❌ FAIL: Failed to resolve to correct farm account ID.');
    }
  }
}

testResolution().catch(console.error);
