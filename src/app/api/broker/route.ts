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
    const { name, login, password, server } = body;
    
    if (!name || !login) {
      return NextResponse.json({ error: 'Name and Login ID are required.' }, { status: 400 });
    }

    const node = await connectBroker(name, login, password, server);
    return NextResponse.json({ success: true, broker: node });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
