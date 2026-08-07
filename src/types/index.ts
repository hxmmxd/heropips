export interface Broker {
  name: string;
  balance: string;
  pnl: string;
  equity: string;
  acc: string;
  status?: string;
  timezone_offset?: number;
  broker_timezone_name?: string;
  allowed_symbols?: string[];
}

export interface TradeTicketProps {
  ticketId: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  entryPrice: string;
  lotVolume: string;
  rrRatio: string;
  stopLoss: string;
  takeProfit: string;
  margin: string;
  risk: string;
  profit: string;
  confidence?: 'AAA' | 'AA' | 'A' | 'BBB';
  apiSymbol?: string; // Raw API symbol (e.g. "XAU/USD") for execution
  executionStatus?: 'PENDING' | 'SUCCESS' | 'FAILED';

}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text?: string;

  ticket?: TradeTicketProps;
  signalSymbol?: string;
  marketData?: {
    symbol: string;
    displaySymbol: string;
    price: number;
    rsi: number | null;
    macdHistogram: number | null;
    ema50: number | null;
    atr: number | null;
    confluenceScore: number;
    confluenceDirection: string;
    confidenceGrade: string;
    newsSentiment?: string;
  };
  gating?: {
    outcome: string;
    reason: string;
    gates: { name: string; passed: boolean; detail: string }[];
    smcPatterns: string[];
    smcConfirmations: number;
    riskSummary?: string | null;
    riskMultipliers?: any | null;
  };

  screenerData?: {
    symbol: string;
    displaySymbol: string;
    price: number;
    confluenceScore: number;
    confluenceDirection: string;
    confidenceGrade: string;
    signalOutcome: string;
  }[];
}

export interface Partner {
  name: string;
  portfolio: string;
  rebate: string;
  commission: string;
  status: string;
  joined: string;
  trades: number;
}

export interface TradeLog {
  symbol: string;
  action: 'BUY' | 'SELL';
  orderId: string;
  amount: string;
  isWin: boolean;
}

// ── Manager Types ───────────────────────────────────

export interface Position {
  id: string;
  symbol: string;
  type: 'POSITION_TYPE_BUY' | 'POSITION_TYPE_SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  stopLoss?: number;
  takeProfit?: number;
  openTime?: string;
  magic?: number;
  comment?: string;
  // Aggregated fields (for grouped display)
  ticketCount?: number;
  totalVolume?: number;
  unrealizedPnlPercent?: number;
  unrealizedPnlPts?: number;
}

export interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  mtmPnl: number;
  mtmPnlPercent: number;
  totalLots: number;
  positionCount: number;
  leverage: number;
  currency: string;
}

export interface PendingOrder {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
}

export interface OrderRequest {
  symbol: string;
  action: 'BUY' | 'SELL';
  volume: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskPercent?: number;
}

export interface ClosedDeal {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  profit: number;
  commission: number;
  swap: number;
  entryPrice: number;
  exitPrice: number;
  openTime: string;
  closeTime: string;
}

export interface RiskStats {
  netProfit: number;
  totalVolume: number;
  winRate: number;
  wins: number;
  losses: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  maxWinStreak: number;
  maxLossStreak: number;
  totalCommission: number;
  totalSwap: number;
  profitFactor: number;
  expectancy: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  recoveryFactor: number;
  avgTrade: number;
  samples: number;
}
