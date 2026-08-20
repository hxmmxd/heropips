/**
 * MT5 Sidecar & Master Account Fixtures for UQP E2E Testing
 */
import { RawSidecarTick } from './ticks.fixture';
import { BrokerAccountRecord } from '../harness/mock-supabase';

export const VANTAGE_MASTER_ACCOUNT: BrokerAccountRecord = {
  id: 'acc_vantage_master_001',
  user_id: 'admin_sys_001',
  broker: 'vantage',
  login: '88001001',
  server: 'VantageInternational-Demo',
  is_master_feed: true,
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
};

export const XM_MASTER_ACCOUNT: BrokerAccountRecord = {
  id: 'acc_xm_master_002',
  user_id: 'admin_sys_001',
  broker: 'xm',
  login: '77002002',
  server: 'XMGlobal-Demo',
  is_master_feed: true,
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
};

export const ATFX_MASTER_ACCOUNT: BrokerAccountRecord = {
  id: 'acc_atfx_master_003',
  user_id: 'admin_sys_001',
  broker: 'atfx',
  login: '66003003',
  server: 'ATFX-Demo',
  is_master_feed: true,
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
};

export const CLIENT_ACCOUNT_VANTAGE: BrokerAccountRecord = {
  id: 'acc_client_vantage_999',
  user_id: 'user_regular_123',
  broker: 'vantage',
  login: '99009999',
  server: 'VantageInternational-Live',
  is_master_feed: false,
  is_active: true,
  created_at: '2026-08-10T12:00:00Z',
};

export const ALL_BROKER_ACCOUNTS: BrokerAccountRecord[] = [
  VANTAGE_MASTER_ACCOUNT,
  XM_MASTER_ACCOUNT,
  ATFX_MASTER_ACCOUNT,
  CLIENT_ACCOUNT_VANTAGE,
];

export const SIDECAR_SUBSCRIBE_SUCCESS = {
  success: true,
  symbol: 'XAUUSD',
  state: 'STREAMING',
  timestamp: 1724000000000,
};

export const SIDECAR_SUBSCRIBE_INVALID_SYMBOL = {
  success: false,
  error: 'INVALID_SYMBOL',
  symbol: 'UNKNOWN_TICKER',
};

export const SIDECAR_HEALTH_OK = {
  status: 'OK',
  mt5_connected: true,
  ping_ms: 1.5,
  active_symbols: ['XAUUSD', 'EURUSD'],
};

export const SIDECAR_HEALTH_ERROR = {
  status: 'ERROR',
  mt5_connected: false,
  error: 'MT5_TERMINAL_UNREACHABLE',
};

/**
 * Creates a raw MT5 sidecar tick
 */
export function createSidecarTick(
  symbol: string = 'XAUUSD',
  bid: number = 2735.45,
  ask: number = 2735.7,
  time_msc: number = 1724000000000,
  volume: number = 10
): RawSidecarTick {
  return {
    symbol,
    time_msc,
    bid,
    ask,
    volume,
    flags: 6,
  };
}
