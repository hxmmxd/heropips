import { NextResponse } from 'next/server';
import { connectBroker, getAllBrokers, searchBrokerServers } from '@/lib/broker';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (query !== null) {
      const servers = await searchBrokerServers(query);
      const isSimulation = !process.env.META_API_TOKEN;
      return NextResponse.json({ servers, isSimulation });
    }

    const list = await getAllBrokers();
    return NextResponse.json({ brokers: list });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { login, password, server } = body;
    
    if (!server || !login || !password) {
      return NextResponse.json({ error: 'Server, Login ID, and Password are required.' }, { status: 400 });
    }

    // Auto-derive display name from server (e.g. "ICMarketsSC-Live" → "ICMarketsSC-882910")
    const derivedName = server.split('-')[0] || server;
    const name = `${derivedName}-${login}`;

    const node = await connectBroker(name, login, password, server);
    return NextResponse.json({ success: true, broker: node });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
