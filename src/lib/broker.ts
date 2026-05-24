import MetaApi from 'metaapi.cloud-sdk/node';

const token = process.env.META_API_TOKEN || '';
let metaApiInstance: any = null;

if (token) {
  try {
    metaApiInstance = new MetaApi(token);
    console.log('[Broker Engine] MetaAPI SDK initialized successfully.');
  } catch (error) {
    console.error('[Broker Engine] Failed to initialize MetaAPI SDK:', error);
  }
} else {
  console.warn('[Broker Engine] META_API_TOKEN is empty. Running in simulator mode.');
}

export interface BrokerNode {
  id: string;
  name: string;
  login: string;
  server: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  balance: number;
  equity: number;
  pnl: number;
  positions: any[];
}

import fs from 'fs';
import path from 'path';
import os from 'os';

const DB_FILE = process.env.VERCEL || process.env.NODE_ENV === 'production'
  ? path.join(os.tmpdir(), 'brokers_db.json')
  : path.join(process.cwd(), 'src/lib/brokers_db.json');

function readDb(): BrokerNode[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial: BrokerNode[] = [
        {
          id: '882910',
          name: 'Vantage-Real-01',
          login: '882910',
          server: 'VantageInternational-Live',
          status: 'connected',
          balance: 12450.00,
          equity: 12690.12,
          pnl: 240.12,
          positions: [
            { id: 't1', symbol: 'XAUUSD', type: 'BUY', volume: 0.1, openPrice: 2315.50, currentPrice: 2317.90, profit: 240.12 }
          ]
        },
        {
          id: '110922',
          name: 'IC-Markets-Pro',
          login: '110922',
          server: 'ICMarketsSC-Live',
          status: 'connected',
          balance: 5200.50,
          equity: 5080.50,
          pnl: -120.00,
          positions: [
            { id: 't2', symbol: 'EURUSD', type: 'SELL', volume: 0.5, openPrice: 1.08550, currentPrice: 1.08790, profit: -120.00 }
          ]
        }
      ];
      // Ensure folder exists
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read brokers DB:', err);
    return [];
  }
}

function writeDb(brokers: BrokerNode[]) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(brokers, null, 2));
  } catch (err) {
    console.error('Failed to write brokers DB:', err);
  }
}

// ── API Methods ─────────────────────────────────────────────

export async function connectBroker(
  name: string,
  login: string,
  password?: string,
  server?: string
): Promise<BrokerNode> {
  if (metaApiInstance) {
    try {
      console.log(`[Broker Engine] Connecting live broker ${name} to MT5 via MetaAPI...`);
      
      const account = await metaApiInstance.metatraderAccountApi.createAccount({
        name: name,
        type: 'cloud-g2',
        platform: 'mt5',
        login: login,
        password: password || '',
        server: server || 'DemoServer',
        magic: 0, // 0 = manual trades (required field)
      });
      
      // Wait for account deployment and connection
      console.log(`[Broker Engine] Account created (${account.id}). Deploying...`);
      await account.deploy();
      console.log(`[Broker Engine] Deployed. Waiting for connection...`);
      await account.waitConnected();
      console.log(`[Broker Engine] Connected to MT5 server.`);
      
      const connection = account.getRPCConnection();
      await connection.connect();
      await connection.waitSynchronized();
      
      const details = await connection.getAccountInformation();
      
      return {
        id: account.id,
        name: name,
        login: login,
        server: server || 'DemoServer',
        status: 'connected',
        balance: details.balance || 0,
        equity: details.equity || 0,
        pnl: (details.equity || 0) - (details.balance || 0),
        positions: []
      };
    } catch (err: any) {
      const errMsg = err?.details || err?.message || String(err);
      console.error('[Broker Engine] Live MT5 connection failed:', errMsg);
      throw new Error(`MT5 Server connection failed: ${errMsg}`);
    }
  }

  // Fallback Simulator Mode
  console.log(`[Broker Engine] Simulating MT5 synchronization for ${name} (Server: ${server})...`);
  await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate networking lag
  
  const mockNode: BrokerNode = {
    id: login,
    name: name,
    login: login,
    server: server || 'Demo-Server',
    status: 'connected',
    balance: 100000.00,
    equity: 100000.00,
    pnl: 0.00,
    positions: []
  };
  
  const currentList = readDb();
  // Filter out existing node with same login to overwrite
  const updatedList = currentList.filter(b => b.login !== login).concat(mockNode);
  writeDb(updatedList);
  
  return mockNode;
}

export async function getBrokerDetails(id: string): Promise<BrokerNode | null> {
  if (metaApiInstance) {
    try {
      const account = await metaApiInstance.metatraderAccountApi.getAccount(id);
      const details = await account.getAccountInformation();
      const connection = metaApiInstance.getConnection(id);
      const positions = await connection.getPositions();
      
      return {
        id: id,
        name: account.name,
        login: account.login,
        server: account.server,
        status: account.state === 'DEPLOYED' ? 'connected' : 'disconnected',
        balance: details.balance || 0,
        equity: details.equity || 0,
        pnl: (details.equity || 0) - (details.balance || 0),
        positions: positions.map((p: any) => ({
          id: p.id,
          symbol: p.symbol,
          type: p.type,
          volume: p.volume,
          openPrice: p.openPrice,
          currentPrice: p.currentPrice,
          profit: p.profit
        }))
      };
    } catch (err) {
      console.error('[Broker Engine] Failed to get live broker details:', err);
      return null;
    }
  }

  // Simulator Mode
  const list = readDb();
  return list.find(b => b.id === id) || null;
}

export async function executeBrokerOrder(
  id: string,
  symbol: string,
  action: 'BUY' | 'SELL',
  volume: number,
  entryPrice: number,
  stopLoss?: number,
  takeProfit?: number
): Promise<any> {
  if (metaApiInstance) {
    try {
      console.log(`[Broker Engine] Sending ${action} order to live broker ${id}: ${volume} lot(s) ${symbol}`);
      
      // Get the MetaAPI account and establish RPC connection
      const account = await metaApiInstance.metatraderAccountApi.getAccount(id);
      const connection = account.getRPCConnection();
      await connection.connect();
      await connection.waitSynchronized();
      
      const mt5Symbol = symbol.replace('/', ''); // MT5 format (e.g. XAUUSD)
      let order;
      
      if (action === 'BUY') {
        order = await connection.createMarketBuyOrder(mt5Symbol, volume, stopLoss, takeProfit);
      } else {
        order = await connection.createMarketSellOrder(mt5Symbol, volume, stopLoss, takeProfit);
      }
      
      console.log(`[Broker Engine] Order executed:`, order);
      return {
        orderId: order.orderId || order.positionId || id,
        status: 'success',
        fillPrice: order.openPrice || entryPrice,
      };
    } catch (err: any) {
      const errMsg = err?.details || err?.message || String(err);
      console.error('[Broker Engine] Live trade execution failed:', errMsg);
      throw new Error(`Execution Failed: ${errMsg}`);
    }
  }

  // Simulator Mode
  console.log(`[Broker Engine] Simulating trade execution on MT5 node ${id}...`);
  await new Promise((resolve) => setTimeout(resolve, 800));

  const list = readDb();
  const brokerIdx = list.findIndex(b => b.id === id);
  if (brokerIdx === -1) throw new Error('Broker connection offline');

  const broker = list[brokerIdx];
  const pnl = action === 'BUY' ? 120.00 : -45.00; // Simulated entry pnl
  const newPosition = {
    id: `pos-${Math.floor(100000 + Math.random() * 900000)}`,
    symbol: symbol,
    type: action,
    volume: volume,
    openPrice: entryPrice,
    currentPrice: entryPrice + (action === 'BUY' ? 1.2 : -0.4),
    profit: pnl
  };

  broker.positions.push(newPosition);
  broker.equity = broker.balance + broker.positions.reduce((sum, p) => sum + p.profit, 0);
  broker.pnl = broker.equity - broker.balance;
  
  list[brokerIdx] = broker;
  writeDb(list);

  return { orderId: newPosition.id, status: 'success', fillPrice: entryPrice };
}

export function getAllSimulatedBrokers(): BrokerNode[] {
  return readDb();
}

export async function getAllBrokers(): Promise<BrokerNode[]> {
  if (metaApiInstance) {
    try {
      console.log('[Broker Engine] Fetching accounts list from MetaAPI Cloud...');
      const accounts = await metaApiInstance.metatraderAccountApi.getAccounts();
      const list: BrokerNode[] = [];
      for (const account of accounts) {
        let details: any = { balance: 0, equity: 0 };
        let positions: any[] = [];
        let status: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';
        
        if (account.state === 'DEPLOYED') {
          status = 'connected';
          try {
            const connection = account.getRPCConnection();
            await connection.connect();
            await connection.waitSynchronized();
            details = await connection.getAccountInformation();
            positions = await connection.getPositions();
          } catch (err) {
            console.warn(`[Broker Engine] Failed to fetch live details for account ${account.id}:`, err);
            status = 'connecting';
          }
        }
        
        list.push({
          id: account.id,
          name: account.name,
          login: account.login,
          server: account.server,
          status,
          balance: details.balance || 0,
          equity: details.equity || 0,
          pnl: (details.equity || 0) - (details.balance || 0),
          positions: positions.map((p: any) => ({
            id: p.id,
            symbol: p.symbol,
            type: p.type,
            volume: p.volume,
            openPrice: p.openPrice,
            currentPrice: p.currentPrice,
            profit: p.profit
          }))
        });
      }
      return list;
    } catch (err) {
      console.error('[Broker Engine] Failed to get live accounts:', err);
    }
  }

  // Fallback Simulator Mode
  return readDb();
}

export async function searchBrokerServers(query: string): Promise<string[]> {
  if (metaApiInstance && query.trim().length >= 2) {
    try {
      console.log(`[Broker Engine] Querying MetaAPI server registry for: ${query}...`);
      const servers = await metaApiInstance.metatraderAccountApi.searchServers(query);
      return servers;
    } catch (err) {
      console.error('[Broker Engine] MetaAPI server search failed:', err);
    }
  }

  // Fallback to local curated suggestions when token is not set or query is empty
  const SUGGESTED_SERVERS = [
    'VantageInternational-Live',
    'VantageInternational-Demo',
    'ICMarketsSC-Live',
    'ICMarketsSC-Demo',
    'AxiTrader-Live',
    'AxiTrader-Demo',
    'Pepperstone-Live',
    'Pepperstone-Demo',
    'MetaQuotes-Demo',
    'OANDA-Live',
    'OANDA-Demo',
    'XM.COM-Live',
    'XM.COM-Demo',
    'Exness-Live',
    'Exness-Demo',
    'FBS-Live',
    'FBS-Demo',
    'FxPro-Live-01',
    'FxPro-Demo-01',
    'RoboForex-Live',
    'RoboForex-Demo',
    'AdmiralMarkets-Live',
    'AdmiralMarkets-Demo',
    'FPMarkets-Live',
    'FPMarkets-Demo',
    'Tickmill-Live',
    'Tickmill-Demo',
    'FXTM-Live',
    'FXTM-Demo',
    'AvaTrade-Act-Live',
    'AvaTrade-Act-Demo',
    'OctaFX-Real-1',
    'OctaFX-Demo-1',
    'ThinkMarkets-Live',
    'ThinkMarkets-Demo',
    'Swissquote-Live',
    'Swissquote-Demo',
    'Deriv-Server',
    'Deriv-Demo',
    'FXChoice-Live',
    'FXChoice-Demo',
    'Hantec-Live',
    'Hantec-Demo',
    'VTMarkets-Live',
    'VTMarkets-Demo',
    'ACY-Live',
    'ACY-Demo',
    'BlackBull-Live',
    'BlackBull-Demo',
    'Eightcap-Live',
    'Eightcap-Demo',
    'InteractiveBrokers-Live',
    'InteractiveBrokers-Demo'
  ];

  if (!query.trim()) {
    return SUGGESTED_SERVERS;
  }
  return SUGGESTED_SERVERS.filter((srv) =>
    srv.toLowerCase().includes(query.toLowerCase())
  );
}
