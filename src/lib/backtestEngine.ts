import { Candle, fullScan } from './scanner';
import { StrategyPreset, evaluateStrategyPreset } from './auto-trader-matrix';
import { computeIndicators } from './indicators';
import { scoreIndicators, getGatingConfig, GateResult, MarketSnapshot } from './market';

export interface BacktestParams {
  symbol: string;
  timeframe: string;
  initialBalance: number;
  preset: StrategyPreset;
  riskPercent: number;
  minConfluence?: number;
  spreadPips?: number;
}

export interface BacktestTrade {
  id: number;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryType: 'market' | 'precision';
  status: 'PENDING' | 'OPEN' | 'CLOSED_WIN' | 'CLOSED_LOSS';
  orderPrice: number;
  entryPrice?: number;
  stopLoss: number;
  takeProfit: number;
  size: number; // in $ risked or lots
  openTime?: string;
  closeTime?: string;
  pnl?: number;
  reason: string;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  initialBalance: number;
  finalBalance: number;
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
  totalReturn: number;
  averageRR?: number;
  tradesPerDay?: number;
}

export async function runBacktest(
  candles: Candle[],
  params: BacktestParams
): Promise<BacktestResult> {
  let balance = params.initialBalance;
  let peakBalance = balance;
  let maxDrawdown = 0;
  let tradeCounter = 0;
  
  const trades: BacktestTrade[] = [];
  let currentTrade: BacktestTrade | null = null;
  const gatingConfig = await getGatingConfig();
  
  const LOOKBACK = 100; // minimum candles for indicator calculation
  
  // Pre-compute HTF Bias using a 2400-period EMA (approximates 200 EMA on 1H chart from 5m data)
  const ema2400Array: number[] = [];
  let emaMultiplier = 2 / (2400 + 1);
  let htfEma = candles[0].close;
  for (let c = 0; c < candles.length; c++) {
    htfEma = (candles[c].close - htfEma) * emaMultiplier + htfEma;
    ema2400Array.push(htfEma);
  }
  
  for (let i = LOOKBACK; i < candles.length - 1; i++) {
    const currentCandle = candles[i];
    const nextCandle = candles[i + 1];
    
    // 1. Manage existing trade
    if (currentTrade) {
      if (currentTrade.status === 'PENDING') {
        // Check if precision order is filled
        if (
          (currentTrade.direction === 'BUY' && nextCandle.low <= currentTrade.orderPrice) ||
          (currentTrade.direction === 'SELL' && nextCandle.high >= currentTrade.orderPrice)
        ) {
          currentTrade.status = 'OPEN';
          currentTrade.entryPrice = currentTrade.orderPrice;
          currentTrade.openTime = nextCandle.time;
        } else {
          // If not filled within a few candles, could cancel, but let's keep it simple
        }
      }
      
      if (currentTrade.status === 'OPEN' && currentTrade.entryPrice) {
        let closed = false;
        let pnl = 0;
        
        // Determine spread amount dynamically based on price magnitude
        let pipSize = 0.0001;
        if (currentCandle.close > 10000) pipSize = 1;       // Indices, BTC
        else if (currentCandle.close > 1000) pipSize = 0.1; // XAUUSD
        else if (currentCandle.close > 10) pipSize = 0.01;  // JPY pairs, Oil
        
        const spreadAmount = (params.spreadPips || 1.5) * pipSize;
        
        // Check SL and TP (pessimistic execution with Bid/Ask spread)
        if (currentTrade.direction === 'BUY') {
          // For BUY, we closed at Bid. So Ask must drop to SL, or Bid must rise to TP.
          // SL triggers if Ask drops to SL. Ask = Bid + spread. So Bid must drop to SL - spread.
          // TP triggers if Bid rises to TP. 
          const hitSL = nextCandle.low <= (currentTrade.stopLoss - spreadAmount);
          const hitTP = nextCandle.high >= currentTrade.takeProfit;
          
          if (hitSL) {
            closed = true;
            currentTrade.status = 'CLOSED_LOSS';
            // Include spread in the loss calculation roughly
            pnl = -(params.initialBalance * (params.riskPercent / 100)) * (1 + (spreadAmount / Math.abs(currentTrade.entryPrice - currentTrade.stopLoss))); 
          } else if (hitTP) {
            closed = true;
            currentTrade.status = 'CLOSED_WIN';
            // Risk-reward calculation using real entry and TP
            const riskReward = Math.abs(currentTrade.takeProfit - currentTrade.entryPrice) / Math.abs(currentTrade.entryPrice - currentTrade.stopLoss);
            pnl = (params.initialBalance * (params.riskPercent / 100)) * riskReward;
          }
        } else {
          // SELL
          // For SELL, we closed at Ask. Ask = Bid + spread.
          // SL triggers if Ask hits SL. So Bid must rise to SL - spread.
          // TP triggers if Ask drops to TP. So Bid must drop to TP - spread.
          const hitSL = nextCandle.high >= (currentTrade.stopLoss - spreadAmount);
          const hitTP = nextCandle.low <= (currentTrade.takeProfit - spreadAmount);
          
          if (hitSL) {
            closed = true;
            currentTrade.status = 'CLOSED_LOSS';
            pnl = -(params.initialBalance * (params.riskPercent / 100)) * (1 + (spreadAmount / Math.abs(currentTrade.stopLoss - currentTrade.entryPrice))); 
          } else if (hitTP) {
            closed = true;
            currentTrade.status = 'CLOSED_WIN';
            const riskReward = Math.abs(currentTrade.entryPrice - currentTrade.takeProfit) / Math.abs(currentTrade.stopLoss - currentTrade.entryPrice);
            pnl = (params.initialBalance * (params.riskPercent / 100)) * riskReward;
          }
        }
        
        if (closed) {
          currentTrade.closeTime = nextCandle.time;
          currentTrade.pnl = pnl;
          balance += pnl;
          if (balance > peakBalance) peakBalance = balance;
          const drawdown = ((peakBalance - balance) / peakBalance) * 100;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;
          
          currentTrade = null; // Free up for next trade
        }
      }
      
      // If we are in a trade, we skip scanning for new ones
      if (currentTrade) continue; 
    }
    
    // 2. Scan for SMC signals
    const historyWindow = candles.slice(i - LOOKBACK, i + 1);
    const scanResult = fullScan(params.symbol, params.timeframe, historyWindow);
    const smcSignal = scanResult.signals.length > 0 ? scanResult.signals.sort((a, b) => b.confluenceScore - a.confluenceScore)[0] : null;
    
    // 3. Compute Technicals
    const ind = computeIndicators(historyWindow);
    const htfBias = currentCandle.close > ema2400Array[i] ? 'bullish' : 'bearish';
    
    const scoreData = scoreIndicators(
      currentCandle.close,
      ind.rsi,
      ind.macd ? { macd: ind.macd.value, signal: ind.macd.signal, histogram: ind.macd.histogram } : null,
      ind.ema20,
      ind.ema50,
      ind.ema200,
      ind.bbands,
      ind.stoch,
      htfBias
    );
    
    const gateResults: GateResult[] = [];
    const score = scoreData.score;
    
    if (gatingConfig.gate_confluence_enabled) {
      gateResults.push({
        name: 'Confluence',
        passed: score >= gatingConfig.gate_confluence_min_score,
        detail: `Score ${score.toFixed(0)}`
      });
    }
    
    // Build the hybrid snapshot
    const snapshot: Partial<MarketSnapshot> = {
      signalOutcome: scoreData.direction === 'NEUTRAL' ? 'NO_TRADE' : 'SIGNAL',
      confluenceScore: score,
      confidenceGrade: score >= 80 ? 'AAA' : score >= 60 ? 'A' : 'BBB',
      smcConfirmations: smcSignal ? smcSignal.patterns.length : 0,
      gateResults,
    };
    
    const evalResult = evaluateStrategyPreset(params.preset, snapshot, params.minConfluence ?? gatingConfig.gate_confluence_min_score);
    
    if (evalResult.shouldTrade) {
      // If we passed the preset, we need an entry/sl/tp.
      // If we have an SMC signal and it matches the tech direction (or if we are on an SMC-first preset), use it.
      // Otherwise, we construct a technical-based dynamic signal if the directions align.
      let tradeDirection = scoreData.direction;
      let finalEntry = currentCandle.close;
      let finalSL = 0;
      let finalTP = 0;
      let isValidSignal = false;
      
      if (smcSignal && (tradeDirection === smcSignal.direction || tradeDirection === 'NEUTRAL')) {
        // SMC Signal exists
        tradeDirection = smcSignal.direction;
        finalEntry = smcSignal.entry;
        finalSL = smcSignal.stopLoss;
        finalTP = smcSignal.takeProfit;
        isValidSignal = true;
      } else if (tradeDirection !== 'NEUTRAL') {
        // Pure Technical Signal (e.g. tech_only preset) fallback logic
        let fallbackPip = 0.0001;
        if (currentCandle.close > 10000) fallbackPip = 1;
        else if (currentCandle.close > 1000) fallbackPip = 0.1;
        else if (currentCandle.close > 10) fallbackPip = 0.01;
        
        const atr = Math.abs(currentCandle.high - currentCandle.low) || fallbackPip * 10; // rough 1-candle ATR fallback
        if (tradeDirection === 'BUY') {
          finalSL = currentCandle.close - (atr * 2);
          finalTP = currentCandle.close + (atr * 4);
        } else {
          finalSL = currentCandle.close + (atr * 2);
          finalTP = currentCandle.close - (atr * 4);
        }
        isValidSignal = true;
      }
      
      if (isValidSignal && tradeDirection !== 'NEUTRAL') {
        tradeCounter++;
        const newTrade: BacktestTrade = {
          id: tradeCounter,
          symbol: params.symbol,
          direction: tradeDirection as 'BUY' | 'SELL',
          entryType: smcSignal ? (smcSignal.entryType || 'market') : 'market',
          status: 'PENDING',
          orderPrice: finalEntry,
          stopLoss: finalSL,
          takeProfit: finalTP,
          size: params.initialBalance * (params.riskPercent / 100),
          reason: evalResult.reason
        };
        
        // If market order, it fills on open of next candle
        if (newTrade.entryType === 'market') {
          newTrade.status = 'OPEN';
          newTrade.entryPrice = nextCandle.open; // Slippage simulation can be added here
          newTrade.openTime = nextCandle.time;
        }
        
        trades.push(newTrade);
        currentTrade = newTrade;
      }
    }
  }
  
  // Close any remaining open trade at the end of the test
  if (currentTrade && currentTrade.status === 'OPEN') {
     const lastCandle = candles[candles.length - 1];
     currentTrade.status = 'CLOSED_LOSS'; // arbitrary, or calculate floating PNL
     currentTrade.closeTime = lastCandle.time;
     currentTrade.pnl = 0; // Break even for unclosed trades for simplicity
  }
  
  const closedTrades = trades.filter(t => t.status.startsWith('CLOSED'));
  const winCount = closedTrades.filter(t => t.status === 'CLOSED_WIN').length;
  const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;
  let totalRR = 0;
  let rrCount = 0;
  for (const t of trades) {
    const entry = t.entryPrice || t.orderPrice;
    if (entry && t.takeProfit && t.stopLoss && entry !== t.stopLoss) {
      const risk = Math.abs(entry - t.stopLoss);
      const reward = Math.abs(t.takeProfit - entry);
      if (risk > 0) {
        totalRR += reward / risk;
        rrCount++;
      }
    }
  }
  const averageRR = rrCount > 0 ? totalRR / rrCount : 0;

  // Calculate trades per day
  let tradesPerDay = 0;
  if (candles.length > 0 && trades.length > 0) {
    const firstTime = new Date(candles[0].time).getTime();
    const lastTime = new Date(candles[candles.length - 1].time).getTime();
    const durationDays = (lastTime - firstTime) / (1000 * 60 * 60 * 24);
    if (durationDays > 0) {
      tradesPerDay = trades.length / durationDays;
    } else {
      tradesPerDay = trades.length; // If less than a day
    }
  }

  return {
    trades,
    initialBalance: params.initialBalance,
    finalBalance: balance,
    totalTrades: trades.length,
    winRate,
    maxDrawdown,
    totalReturn: ((balance - params.initialBalance) / params.initialBalance) * 100,
    averageRR,
    tradesPerDay
  };
}
