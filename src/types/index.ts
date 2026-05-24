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
  signalSymbol?: string; // If set, shows a "Generate Signal" button for this asset
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
