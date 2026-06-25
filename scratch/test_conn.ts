import { connectBroker, getBrokerDetails, getAllBrokers } from '../src/lib/broker';

async function main() {
  const login = '5051989467';
  const password = '4qGx@aTs';
  const server = 'MetaQuotes-Demo';
  const userId = 'dded1522-9719-4672-b24a-52827ba4a9fb';
  const name = 'MetaQuotes-5051989467';

  console.log('--- 1. Testing connectBroker ---');
  try {
    const node = await connectBroker(name, login, password, server, userId);
    console.log('connectBroker result:', JSON.stringify(node, null, 2));

    console.log('--- 2. Reading DB cache ---');
    const brokers = await getAllBrokers(userId);
    console.log('All cached brokers for user:', JSON.stringify(brokers, null, 2));

    console.log('--- 3. Testing getBrokerDetails immediately ---');
    const details = await getBrokerDetails(login);
    console.log('getBrokerDetails immediately result:', JSON.stringify(details, null, 2));

    console.log('Waiting 5 seconds for MT5 farm sync...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('--- 4. Testing getBrokerDetails after 5s ---');
    const detailsAfter = await getBrokerDetails(login);
    console.log('getBrokerDetails after 5s result:', JSON.stringify(detailsAfter, null, 2));

  } catch (err: any) {
    console.error('Error in test script:', err);
  }
}

main();
