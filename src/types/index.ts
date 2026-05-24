export interface Broker {
  name: string;
  balance: string;
  pnl: string;
  equity: string;
  acc: string;
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
  };
}

export interface Partner {
  name: string;
  portfolio: string;
  rebate: string;
  commission: string;
  status: string;
}

export interface TradeLog {
  symbol: string;
  action: 'BUY' | 'SELL';
  orderId: string;
  amount: string;
  isWin: boolean;
}
