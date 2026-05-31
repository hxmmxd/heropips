import { NextResponse } from 'next/server';
import { connectBroker, disconnectBroker, getAllBrokers, getBrokerDetails, searchBrokerServers } from '@/lib/broker';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (query !== null) {
      const servers = await searchBrokerServers(query);
      const isSimulation = !process.env.META_API_TOKEN;
      return NextResponse.json({ servers, isSimulation });
    }

    // Get current user — only return their brokers
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ brokers: [] });
    }

    const cached = await getAllBrokers(user.id);

    // Fetch live balance/equity for each broker in parallel via REST API
    const live = await Promise.all(
      cached.map(async (b) => {
        try {
          const details = await getBrokerDetails(b.id);
          return details ?? b; // fall back to cached if REST fails
        } catch {
          return b;
        }
      })
    );

    return NextResponse.json({ brokers: live });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Get current user
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { login, password, server } = body;
    
    if (!server || !login || !password) {
      return NextResponse.json({ error: 'Server, Login ID, and Password are required.' }, { status: 400 });
    }

    // Auto-derive display name from server (e.g. "ICMarketsSC-Live" → "ICMarketsSC-882910")
    const derivedName = server.split('-')[0] || server;
    const name = `${derivedName}-${login}`;

    const node = await connectBroker(name, login, password, server, user.id);
    return NextResponse.json({ success: true, broker: node });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brokerId } = await request.json();
    if (!brokerId) {
      return NextResponse.json({ error: 'brokerId is required' }, { status: 400 });
    }

    const success = await disconnectBroker(brokerId, user.id);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
