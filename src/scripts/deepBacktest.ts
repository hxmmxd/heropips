import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fullScan } from '../lib/scanner';
import { StrategyPreset, evaluateStrategyPreset } from '../lib/auto-trader-matrix';
import { computeIndicators } from '../lib/indicators';
import { scoreIndicators, GateResult, MarketSnapshot } from '../lib/market';

const CONNECTION_STRING = process.env.HISTORICAL_DB_URL || 'postgres://postgres:heropips_secure_pw_123@103.209.146.169:5432/historical_data';

const SYMBOL = 'XAUUSD';
const BASE_TABLE = 'xauusd_1m';
const TIMEFRAMES = ['1 minute', '5 minutes', '15 minutes', '30 minutes', '1 hour'];
const START_YEAR = 2014;
const END_YEAR = 2027;
const LOOKBACK = 200;
const PRESET: StrategyPreset = 'full_15_gates';

interface TradeCandidate {
  id: number;
  direction: 'BUY' | 'SELL';
  entryType: 'market' | 'precision';
  orderPrice: number;
  stopLoss: number;
  takeProfit: number;
  triggerTime: string;
  status: string;
  reason: string;
  pnl: number;
}

async function runTimeframe(client: Client, htfInterval: string, reportsDir: string) {
  console.log(`\nAggregating base hypertable into ${htfInterval} candles... (Chunking by year)`);
  
  const candidates: TradeCandidate[] = [];
  let tradeCounter = 0;
  
  // Convert string to short format for MT5 files
  let fileNameTf = '1h';
  if (htfInterval === '1 minute') fileNameTf = '1m';
  if (htfInterval === '5 minutes') fileNameTf = '5m';
  if (htfInterval === '15 minutes') fileNameTf = '15m';
  if (htfInterval === '30 minutes') fileNameTf = '30m';
  
  const filePath = path.join(reportsDir, `mt5_signals_${fileNameTf}.csv`);
  // Write CSV Header
  fs.writeFileSync(filePath, 'TriggerTime,Direction,OrderPrice,StopLoss,TakeProfit,Type,Timeframe\n');

  // Maintain rolling history across years for LOOKBACK
  let rollingHistory: any[] = [];
  
  // State tracking for Deduplication
  let activeDirection: 'BUY' | 'SELL' | null = null;
  
  for (let year = START_YEAR; year < END_YEAR; year++) {
    const chunkStart = `${year}-01-01`;
    const chunkEnd = `${year + 1}-01-01`;
    
    console.log(`Fetching ${htfInterval} data for year ${year}...`);
    const htfQuery = `
      SELECT 
        time_bucket($1::interval, time) AS time,
        first(open, time) AS open,
        max(high) AS high,
        min(low) AS low,
        last(close, time) AS close,
        sum(volume) AS volume
      FROM ${BASE_TABLE}
      WHERE time >= $2 AND time < $3
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    const htfRes = await client.query(htfQuery, [htfInterval, chunkStart, chunkEnd]);
    
    const chunkCandles = htfRes.rows.map((r: any) => ({
      time: new Date(r.time).toISOString(),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume)
    }));
    
    if (chunkCandles.length === 0) continue;
    
    // Merge with rolling history to ensure we have enough lookback at start of year
    const htfCandles = rollingHistory.concat(chunkCandles);
    rollingHistory = htfCandles.slice(-LOOKBACK);
    
    if (htfCandles.length < LOOKBACK) {
      continue;
    }

    // Pre-compute HTF Bias using a 200-period EMA
    const ema200Array: number[] = [];
    let emaMultiplier = 2 / (200 + 1);
    let htfEma = htfCandles[0].close;
    for (let c = 0; c < htfCandles.length; c++) {
      htfEma = (htfCandles[c].close - htfEma) * emaMultiplier + htfEma;
      ema200Array.push(htfEma);
    }

    let mt5Csv = '';
    
    // Scan Candles
    for (let i = LOOKBACK; i < htfCandles.length - 1; i++) {
      const window = htfCandles.slice(i - LOOKBACK, i + 1);
      const currentCandle = htfCandles[i];
      const nextCandle = htfCandles[i + 1];
      
      // Weekend Filter: Gold trades from Sunday 22:00 UTC to Friday 21:59 UTC
      const dateObj = new Date(currentCandle.time);
      const day = dateObj.getUTCDay();
      const hour = dateObj.getUTCHours();
      const isWeekend = (day === 6) || (day === 5 && hour >= 22) || (day === 0 && hour < 22);
      if (isWeekend) continue;
      
      const scanResult = fullScan(SYMBOL, fileNameTf as any, window);
      const smcSignal = scanResult.signals.length > 0 ? scanResult.signals.sort((a, b) => b.confluenceScore - a.confluenceScore)[0] : null;
      
      const ind = computeIndicators(window);
      const htfBias = currentCandle.close > ema200Array[i] ? 'bullish' : 'bearish';
      
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
      
      const score = scoreData.score;
      const snapshot: Partial<MarketSnapshot> = {
        signalOutcome: scoreData.direction === 'NEUTRAL' ? 'NO_TRADE' : 'SIGNAL',
        confluenceScore: score,
        confidenceGrade: score >= 80 ? 'AAA' : score >= 60 ? 'A' : 'BBB',
        smcConfirmations: smcSignal ? smcSignal.patterns.length : 0,
        gateResults: [],
      };
      
      const evalResult = evaluateStrategyPreset(PRESET, snapshot, 60);
      
      if (evalResult.shouldTrade) {
        let tradeDirection = scoreData.direction;
        let finalEntry = currentCandle.close;
        let isValidSignal = false;
        
        if (smcSignal && (tradeDirection === smcSignal.direction || tradeDirection === 'NEUTRAL')) {
          tradeDirection = smcSignal.direction;
          finalEntry = smcSignal.entry;
          isValidSignal = true;
        } else if (tradeDirection !== 'NEUTRAL') {
          isValidSignal = true;
        }
        
        if (isValidSignal && tradeDirection !== 'NEUTRAL') {
          // Signal Deduplication
          if (activeDirection === tradeDirection) {
            continue;
          }
          activeDirection = tradeDirection as 'BUY' | 'SELL';

          tradeCounter++;
          const entryType = smcSignal ? (smcSignal.entryType || 'market') : 'market';
          const mt5Time = nextCandle.time.replace('T', ' ').substring(0, 19).replace(/-/g, '.');
          
          // Generate Stop Loss and Take Profit (50 pip SL, 100 pip TP as fallback)
          let sl = 0, tp = 0;
          if (tradeDirection === 'BUY') {
            sl = finalEntry - 0.50;
            tp = finalEntry + 1.00;
          } else {
            sl = finalEntry + 0.50;
            tp = finalEntry - 1.00;
          }

          mt5Csv += `${mt5Time},${tradeDirection},${finalEntry.toFixed(2)},${sl.toFixed(2)},${tp.toFixed(2)},${entryType.toUpperCase()},${fileNameTf}\n`;
        }
      }
    }
    
    // Append to file to save memory
    if (mt5Csv.length > 0) {
      fs.appendFileSync(filePath, mt5Csv);
    }
    
    // Clear chunk memory
    if (global.gc) global.gc();
  }
  
  console.log(`Generated ${tradeCounter} trade signals for ${htfInterval}. Saved to: ${filePath}`);
}

async function runDeepBacktest() {
  console.log(`Starting Chunked Deep Backtest for ${SYMBOL} from ${START_YEAR} to ${END_YEAR}`);
  
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
  console.log('Connected to PostgreSQL.');

  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

  try {
    for (const tf of TIMEFRAMES) {
      await runTimeframe(client, tf, reportsDir);
    }
    console.log('\nAll timeframes completed successfully!');
  } catch (err) {
    console.error('Fatal Deep Backtest Error:', err);
  } finally {
    await client.end();
  }
}

runDeepBacktest();
