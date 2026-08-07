'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Activity, TrendingUp, Gauge, Zap, BarChart3, Database, 
  Cpu, ChevronRight, Info, Percent, RefreshCw, Play, CheckCircle2, 
  AlertTriangle, XOctagon, Clock, ArrowRight, Coins, Lock, Server, 
  Layers, Terminal, HelpCircle, Eye, EyeOff
} from 'lucide-react';
import TiltCard from '../TiltCard';

// ---------------------------------------------------------
// DATA DEFINITIONS (Derived from 12_gates_engine.md & risk_expansion.md)
// ---------------------------------------------------------

interface GateItem {
  num: string;
  name: string;
  type: 'CRITICAL' | 'STANDARD';
  desc: string;
  formula: string;
  objective: string;
  risk: string;
  output: string;
  accent: string;
  glow: string;
}

const GATES: GateItem[] = [
  {
    num: '01',
    name: 'Confluence Bias',
    type: 'CRITICAL',
    desc: 'Weighted consensus across core indicators (RSI, MACD, EMA, Bollinger, Stochastic). Restricts trading unless momentum aligns.',
    formula: '∑ (W_i · Dir_i) ≥ 45%',
    objective: 'Computes a weighted average of directional momentum and oscillator signals.',
    risk: 'High cross-talk and noise in standard indicators leading to low-probability setups.',
    output: 'Confluence: 65% (Threshold: ≥45%)',
    accent: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.08)'
  },
  {
    num: '02',
    name: 'SMC Confirmation',
    type: 'STANDARD',
    desc: 'Smart Money Concepts structural scans. Detects Break of Structure (BOS), Change of Character (ChoCH), Fair Value Gaps (FVG), and Order Blocks (OB).',
    formula: 'BOS || ChoCH || FVG || OB || Sweep',
    objective: 'Scans M15/H1 candle geometry to verify true institutional accumulation or distribution.',
    risk: 'Entering inside retail liquidity traps and missing structural trend shifts.',
    output: 'BOS bullish, 9 active FVGs, 3 Order Blocks detected',
    accent: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.08)'
  },
  {
    num: '03',
    name: 'Timeframe Alignment',
    type: 'STANDARD',
    desc: 'Locks execution signals to match the 4-Hour higher timeframe structure, ensuring trades move with the dominant macro direction.',
    formula: 'Signal_Dir == Bias_4H',
    objective: 'Confirms that local M15/H1 execution candles align with the 4H macro trend bias.',
    risk: 'Counter-trend entry in a macro-bearish market (buying in a long-term downtrend).',
    output: '4H Bias: BEARISH · Signal: SELL (Matched)',
    accent: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.08)'
  },
  {
    num: '04',
    name: 'Session Filter',
    type: 'STANDARD',
    desc: 'Restricts execution strictly to high-liquidity volume sessions. Focuses on the London and New York overlaps.',
    formula: 'UTC_Hour ∈ [08:00, 17:00]',
    objective: 'Optimizes entry executions during periods of maximum institutional market depth.',
    risk: 'Executing during Asian session consolidation or low-volume gaps where spreads widen.',
    output: 'Overlap: Active (London / NY Overlap)',
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.08)'
  },
  {
    num: '05',
    name: 'Volatility Regime',
    type: 'STANDARD',
    desc: 'Average True Range (ATR) ratio relative to historical ATR averages. Filters dead markets or high-slippage economic releases.',
    formula: '0.5 ≤ ATR_14 / ATR_20 ≤ 2.5',
    objective: 'Ensures the asset is moving within stable volatility envelopes.',
    risk: 'Capital locked in rangebound markets (no movement) or high-slippage during news releases.',
    output: 'ATR Ratio: 1.12 (Range: Stable)',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.08)'
  },
  {
    num: '06',
    name: 'No Conflict Filter',
    type: 'STANDARD',
    desc: 'Directional spread between bullish and bearish indicator weights. Rejects setups with high internal conflict.',
    formula: '|W_Bull - W_Bear| / W_Total > 10%',
    objective: 'Rejects signals where indicators heavily contradict each other.',
    risk: 'Entering whipsaws and choppy trend transitions in a consolidating range.',
    output: 'Bull/Bear Spread: 25% (Threshold: >10%)',
    accent: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.08)'
  },
  {
    num: '07',
    name: 'Symbol Cooldown',
    type: 'STANDARD',
    desc: 'Enforces a strict 4-hour temporal lockout between trades on the same asset symbol to prevent emotional over-trading.',
    formula: 'T_elapsed ≥ 4 Hours',
    objective: 'Mitigates execution clusters in flat ranges or double-exposure traps.',
    risk: 'Multiple executions triggered by a single consolidating structural zone.',
    output: 'Cooldowned (No recent signals on symbol)',
    accent: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.08)'
  },
  {
    num: '08',
    name: 'News Event Filter',
    type: 'CRITICAL',
    desc: 'Syncs with live economic calendars to halt trading 30m before and 15m after high-impact macroeconomic event releases.',
    formula: 'T_curr ∉ [T_event - 30m, T_event + 15m]',
    objective: 'Protects capital from price gaps, spreads widening, and black-swan event releases.',
    risk: 'Extreme news volatility, widening spreads, and massive execution slippage (e.g. CPI, NFP, FOMC).',
    output: 'Clear (Next event: NFP in 2,686 mins)',
    accent: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.08)'
  },
  {
    num: '09',
    name: 'Correlation Filter',
    type: 'STANDARD',
    desc: 'Cross-checks with inverse and positive indices (e.g. DXY for USD crosses) to prevent asset-bias conflicts.',
    formula: 'DXY_Dir aligns with Asset_Setup',
    objective: 'Ensures currency crosses align with global macro index directions.',
    risk: 'Trading USD crosses (e.g. EURUSD, XAUUSD) directly counter to the broader Dollar index trend.',
    output: 'DXY Bearish Theme aligns with Gold Buy',
    accent: '#14b8a6',
    glow: 'rgba(20, 184, 166, 0.08)'
  },
  {
    num: '10',
    name: 'MTF Stack Alignment',
    type: 'CRITICAL',
    desc: 'Trend agreement check across Weekly (W1), Daily (D1), and 4-Hour (4H) EMA lines. Requires at least 2/3 alignment.',
    formula: '∑ (Trend_TF == Direction) ≥ 2',
    objective: 'Validates that execution signals match the major HTF trend direction.',
    risk: 'Retail fakeouts caused by lower timeframe trends reversing into higher timeframe resistances.',
    output: 'Weekly BEARISH · Daily BEARISH · 4H Neutral (2/3 Bearish)',
    accent: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.08)'
  },
  {
    num: '11',
    name: 'VWAP Value Bands',
    type: 'STANDARD',
    desc: 'Checks if price is within standard ±2σ statistical deviation envelopes from daily Volume Weighted Average Price (VWAP).',
    formula: 'VWAP - 2σ ≤ Price ≤ VWAP + 2σ',
    objective: 'Prevents entry at overextended, expensive pricing far from institutional averages.',
    risk: 'Chasing the top or bottom of extended moves.',
    output: 'Price at +1.1σ from VWAP (Optimal Band)',
    accent: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.08)'
  },
  {
    num: '12',
    name: 'Candlestick Geometry',
    type: 'STANDARD',
    desc: 'Confirms local 1-Hour candlestick pattern shapes (Hammer, Engulfing, Inside Bar, Inverted Hammer).',
    formula: 'Candle_Pattern matches Direction',
    objective: 'Validates immediate local price action and momentum reversal structures.',
    risk: 'Entering right before a minor local candle reversal shapes.',
    output: 'Inside Bar bullish pattern confirmed (Strength: 72%)',
    accent: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.08)'
  }
];

export default function SignalEnginePage() {
  const [activeTab, setActiveTab] = useState<'validation' | 'risk' | 'sizing' | 'vps'>('validation');
  const [expandedGate, setExpandedGate] = useState<string | null>(null);

  // ---------------------------------------------------------
  // TAB 3 CALCULATOR STATE
  // ---------------------------------------------------------
  const [calcBalance, setCalcBalance] = useState<number>(10000);
  const [calcDrawdown, setCalcDrawdown] = useState<number>(5); // 0 to 30%
  const [calcDailyLoss, setCalcDailyLoss] = useState<number>(1.5); // 0 to 8%
  const [calcStreak, setCalcStreak] = useState<number>(2); // 0 to 8 losses
  const [calcEcpState, setCalcEcpState] = useState<'GREEN' | 'AMBER' | 'RED'>('GREEN');
  const [calcKellyBase, setCalcKellyBase] = useState<number>(2.0); // 0.5% to 4.0%
  const [calcRecoveryWins, setCalcRecoveryWins] = useState<number>(5); // 0 to 5

  // ---------------------------------------------------------
  // TAB 3 MONTE CARLO SIMULATOR STATE
  // ---------------------------------------------------------
  const [simWinRate, setSimWinRate] = useState<number>(52); // %
  const [simRRRatio, setSimRRRatio] = useState<number>(2.5); // R:R
  const [simRiskPerTrade, setSimRiskPerTrade] = useState<number>(1.5); // %
  const [simResults, setSimResults] = useState<{
    paths: number[][];
    ruinProb: number;
    medianFinalEquity: number;
    medianMaxDrawdown: number;
    isSimulating: boolean;
  } | null>(null);

  // Set page document title
  useEffect(() => {
    document.title = "HeroPips | AI Signal Engine";
  }, []);

  // ---------------------------------------------------------
  // DYNAMIC SIZING COMPUTATIONS
  // ---------------------------------------------------------
  const sizingReport = useMemo(() => {
    // 1. ECP Multiplier
    const ecpMult = calcEcpState === 'GREEN' ? 1.0 : calcEcpState === 'AMBER' ? 0.5 : 0.0;

    // 2. Daily Loss Multiplier (DLCB)
    let dailyMult = 1.0;
    let dailyTier = 'NORMAL';
    if (calcDailyLoss >= 6.0) {
      dailyMult = 0.0;
      dailyTier = 'TERMINAL (LIQUIDATE)';
    } else if (calcDailyLoss >= 4.5) {
      dailyMult = 0.0;
      dailyTier = 'WARNING (HALT)';
    } else if (calcDailyLoss >= 3.0) {
      dailyMult = 0.5;
      dailyTier = 'CAUTION (50%)';
    }

    // 3. Consecutive Loss Streak Multiplier
    let streakMult = 1.0;
    if (calcStreak >= 7) streakMult = 0.0;
    else if (calcStreak === 6) streakMult = 0.25;
    else if (calcStreak === 5) streakMult = 0.50;
    else if (calcStreak === 4) streakMult = 0.75;

    // 4. Drawdown Governor Multiplier (MDG)
    let ddMult = 1.0;
    let ddZone = 'GREEN';
    if (calcDrawdown >= 25.0) {
      ddMult = 0.0;
      ddZone = 'BLACK (TERMINAL SHUTDOWN)';
    } else if (calcDrawdown >= 20.0) {
      ddMult = 0.1;
      ddZone = 'RED (10% SIZE)';
    } else if (calcDrawdown >= 15.0) {
      ddMult = 0.25;
      ddZone = 'ORANGE (25% SIZE, TELEGRAM MANUAL)';
    } else if (calcDrawdown >= 8.0) {
      ddMult = 0.5;
      ddZone = 'YELLOW (50% SIZE, AAA ONLY)';
    }

    // 5. Recovery Multiplier (Anti-Martingale)
    // Multiplier resets or builds up based on consecutive wins from drawdown trough
    const recoveryMult = Math.min(1.0, calcRecoveryWins / 5);

    // Composite Final Size %
    const finalRiskPct = calcKellyBase * ecpMult * dailyMult * streakMult * ddMult * recoveryMult;
    const finalDollarRisk = calcBalance * (finalRiskPct / 100);

    let classification = 'Grade AAA';
    let classColor = '#10b981';
    if (finalRiskPct <= 0) {
      classification = 'REJECT (NO_TRADE)';
      classColor = '#ef4444';
    } else if (finalRiskPct < 0.2) {
      classification = 'Grade B (Micro Position)';
      classColor = '#ec4899';
    } else if (finalRiskPct < 0.8) {
      classification = 'Grade A (Cautious Position)';
      classColor = '#f59e0b';
    } else if (finalRiskPct < 1.5) {
      classification = 'Grade AA (Optimal Sizing)';
      classColor = '#3b82f6';
    }

    return {
      ecpMult,
      dailyMult,
      dailyTier,
      streakMult,
      ddMult,
      ddZone,
      recoveryMult,
      finalRiskPct,
      finalDollarRisk,
      classification,
      classColor
    };
  }, [calcBalance, calcDrawdown, calcDailyLoss, calcStreak, calcEcpState, calcKellyBase, calcRecoveryWins]);

  // ---------------------------------------------------------
  // RUN MONTE CARLO SIMULATION LOGIC
  // ---------------------------------------------------------
  const runMonteCarlo = () => {
    const numPaths = 100;
    const pathSteps = 100;
    const paths: number[][] = [];
    let ruinedCount = 0;
    const finalEquities: number[] = [];
    const maxDrawdowns: number[] = [];

    for (let p = 0; p < numPaths; p++) {
      let equity = 100;
      const pathData: number[] = [equity];
      let peak = equity;
      let maxDD = 0;
      let isRuined = false;

      for (let step = 0; step < pathSteps; step++) {
        if (isRuined) {
          pathData.push(equity);
          continue;
        }

        const roll = Math.random() * 100;
        const win = roll < simWinRate;
        const change = win 
          ? equity * (simRiskPerTrade * simRRRatio / 100) 
          : -equity * (simRiskPerTrade / 100);

        equity += change;
        if (equity <= 0) equity = 0;

        peak = Math.max(peak, equity);
        const currentDD = ((peak - equity) / peak) * 100;
        maxDD = Math.max(maxDD, currentDD);

        // Check for 25% drawdown wall (ruin threshold)
        if (currentDD >= 25.0) {
          isRuined = true;
          equity = peak * 0.75; // Locked at the drawdown floor (liquidation point)
        }

        pathData.push(equity);
      }

      if (isRuined) {
        ruinedCount++;
      }
      paths.push(pathData);
      finalEquities.push(equity);
      maxDrawdowns.push(maxDD);
    }

    // Sort to find medians
    finalEquities.sort((a, b) => a - b);
    maxDrawdowns.sort((a, b) => a - b);

    const medianFinalEquity = finalEquities[Math.floor(numPaths / 2)];
    const medianMaxDrawdown = maxDrawdowns[Math.floor(numPaths / 2)];
    const ruinProb = (ruinedCount / numPaths) * 100;

    setSimResults({
      paths,
      ruinProb,
      medianFinalEquity,
      medianMaxDrawdown,
      isSimulating: false
    });
  };

  // Trigger Monte Carlo on mount once
  useEffect(() => {
    runMonteCarlo();
  }, []);

  return (
    <>
      <section className="lp-gates-dashboard" style={{ minHeight: 'calc(100vh - 80px)', padding: '120px 24px 80px 24px' }}>
        
        {/* Custom Scoped CSS Stylesheet */}
        <style dangerouslySetInnerHTML={{ __html: `
          .lp-gates-dashboard {
            background: #F5F0E8;
            color: #0b0f19;
            font-family: 'Inter', sans-serif;
          }
          .lp-gates-dashboard-inner {
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
          }
          
          /* Header */
          .dashboard-header {
            text-align: center;
            margin-bottom: 48px;
          }
          .dashboard-eyebrow {
            font-size: 11px;
            font-weight: 700;
            color: var(--volt-500);
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          .dashboard-title {
            font-size: clamp(28px, 4vw, 44px);
            font-weight: 800;
            color: #0a0a0a;
            letter-spacing: -1.8px;
            line-height: 1.15;
            margin-bottom: 16px;
          }
          .dashboard-desc {
            font-size: 15px;
            color: rgba(0, 0, 0, 0.6);
            line-height: 1.6;
            max-width: 650px;
            margin: 0 auto;
          }

          /* Tab Bar */
          .tab-bar-container {
            display: flex;
            justify-content: center;
            margin-bottom: 32px;
            width: 100%;
          }
          .tab-bar {
            display: flex;
            background: rgba(11, 15, 25, 0.05);
            border: 1px solid rgba(11, 15, 25, 0.08);
            padding: 4px;
            border-radius: 12px;
            gap: 4px;
            overflow-x: auto;
            max-width: 100%;
          }
          .tab-btn {
            background: transparent;
            border: none;
            outline: none;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            color: rgba(11, 15, 25, 0.6);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            transition: all 0.2s ease;
          }
          .tab-btn:hover {
            color: #0b0f19;
            background: rgba(11, 15, 25, 0.03);
          }
          .tab-btn.active {
            background: #0b0f19;
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(11, 15, 25, 0.15);
          }

          /* Container Box */
          .dashboard-content-box {
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.015), 0 2px 8px rgba(0, 0, 0, 0.008);
            position: relative;
            min-height: 480px;
          }

          /* Corner Crosshairs */
          .grid-dot {
            position: absolute;
            width: 5px;
            height: 5px;
            background: #fff;
            border: 1px solid rgba(0, 0, 0, 0.12);
            z-index: 10;
            pointer-events: none;
          }
          .dot-tl { top: -3px; left: -3px; }
          .dot-tr { top: -3px; right: -3px; }
          .dot-bl { bottom: -3px; left: -3px; }
          .dot-br { bottom: -3px; right: -3px; }

          /* TAB 1: GATES GRID */
          .gates-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
          }
          .gate-card-wrapper {
            cursor: pointer;
          }
          .gate-card-modern {
            background: #ffffff;
            border: 1px solid rgba(11, 15, 25, 0.07);
            border-radius: 12px;
            padding: 24px;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            transition: all 0.25s ease;
          }
          .gate-card-modern:hover {
            border-color: var(--gate-accent);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03);
            transform: translateY(-2px);
          }
          .gate-hdr {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .gate-num-badge {
            font-size: 10px;
            font-weight: 700;
            font-family: monospace;
            color: rgba(11, 15, 25, 0.4);
            border: 1px solid rgba(11, 15, 25, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
          }
          .gate-type-tag {
            font-size: 9px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
            letter-spacing: 0.05em;
          }
          .type-critical {
            background: rgba(239, 68, 68, 0.08);
            color: #ef4444;
          }
          .type-standard {
            background: rgba(59, 130, 246, 0.08);
            color: #3b82f6;
          }
          .gate-title {
            font-size: 16px;
            font-weight: 700;
            color: #0b0f19;
            margin-bottom: 8px;
          }
          .gate-description {
            font-size: 13px;
            color: rgba(11, 15, 25, 0.6);
            line-height: 1.5;
            margin-bottom: 16px;
            flex-grow: 1;
          }
          .gate-formula-box {
            font-family: monospace;
            font-size: 10px;
            font-weight: 700;
            background: rgba(11, 15, 25, 0.04);
            padding: 4px 8px;
            border-radius: 4px;
            color: var(--gate-accent);
            display: inline-block;
            margin-bottom: 12px;
            width: fit-content;
          }
          .gate-live-output {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            color: #065f46;
            background: rgba(16, 185, 129, 0.08);
            padding: 4px 8px;
            border-radius: 4px;
            margin-top: auto;
          }
          .live-dot {
            width: 5px;
            height: 5px;
            background: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 6px #10b981;
            animation: live-pulse 1.8s infinite ease-in-out;
          }
          @keyframes live-pulse {
            0%, 100% { opacity: 0.45; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1.15); }
          }
          .expand-link {
            font-size: 11px;
            font-weight: 700;
            color: var(--gate-accent);
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 12px;
          }

          /* Expanded Modal Details */
          .expanded-details-container {
            background: rgba(11, 15, 25, 0.02);
            border: 1px dashed rgba(11, 15, 25, 0.12);
            border-radius: 8px;
            padding: 16px;
            margin-top: 12px;
            font-size: 12px;
            line-height: 1.6;
          }
          .expanded-title {
            font-weight: 700;
            color: #0b0f19;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          /* TAB 2: RISK GOVERNOR RINGS */
          .risk-rings-wrapper {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 32px;
            align-items: center;
          }
          .rings-graphic-container {
            position: relative;
            width: 100%;
            height: 380px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .reactor-ring {
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            position: absolute;
            transition: all 0.3s ease;
          }
          .ring-outer {
            width: 320px;
            height: 320px;
            border: 2px dashed rgba(11, 15, 25, 0.15);
            background: rgba(11, 15, 25, 0.02);
          }
          .ring-mid {
            width: 230px;
            height: 230px;
            border: 2px dashed rgba(240, 90, 40, 0.25);
            background: rgba(240, 90, 40, 0.02);
          }
          .ring-inner {
            width: 140px;
            height: 140px;
            border: 2px dashed rgba(239, 68, 68, 0.35);
            background: rgba(239, 68, 68, 0.02);
          }
          .reactor-core {
            width: 60px;
            height: 60px;
            background: #0b0f19;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #ffffff;
            box-shadow: 0 0 20px rgba(11, 15, 25, 0.4);
            font-size: 11px;
            font-weight: 800;
          }
          .ring-label {
            position: absolute;
            font-size: 9px;
            font-weight: 800;
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
          }
          .lbl-ring3 { top: 12px; }
          .lbl-ring2 { top: 56px; }
          .lbl-ring1 { top: 102px; }

          .risk-details-pane {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .risk-block-card {
            border-left: 3px solid #0b0f19;
            background: rgba(11, 15, 25, 0.01);
            padding: 16px;
            border-radius: 0 8px 8px 0;
            border: 1px solid rgba(11, 15, 25, 0.05);
            border-left-width: 4px;
          }
          .risk-block-card.border-red { border-left-color: #ef4444; }
          .risk-block-card.border-volt { border-left-color: var(--volt-500); }
          .risk-block-card.border-blue { border-left-color: #3b82f6; }
          .risk-block-title {
            font-size: 14px;
            font-weight: 700;
            color: #0a0a0a;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .risk-block-desc {
            font-size: 12.5px;
            color: rgba(11, 15, 25, 0.65);
            line-height: 1.5;
          }

          /* TAB 3: POSITION SIZING CALCULATOR */
          .sim-dashboard-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }
          .calc-column {
            background: rgba(11, 15, 25, 0.02);
            border: 1px solid rgba(11, 15, 25, 0.05);
            border-radius: 12px;
            padding: 24px;
          }
          .calc-column-title {
            font-size: 16px;
            font-weight: 700;
            color: #0b0f19;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .form-group {
            margin-bottom: 16px;
          }
          .form-label {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 600;
            color: rgba(11, 15, 25, 0.7);
            margin-bottom: 6px;
          }
          .form-input-range {
            width: 100%;
            accent-color: var(--volt-500);
            cursor: pointer;
          }
          .form-select-group {
            display: flex;
            gap: 6px;
          }
          .select-btn {
            flex: 1;
            background: #ffffff;
            border: 1px solid rgba(11, 15, 25, 0.15);
            padding: 8px;
            font-size: 11px;
            font-weight: 700;
            border-radius: 6px;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s ease;
          }
          .select-btn:hover {
            background: rgba(11, 15, 25, 0.02);
          }
          .select-btn.active {
            background: #0b0f19;
            color: #ffffff;
            border-color: #0b0f19;
          }

          /* Result Panel */
          .results-column {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .sizing-results-card {
            background: #0b0f19;
            border-radius: 12px;
            padding: 24px;
            color: #ffffff;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(11, 15, 25, 0.2);
          }
          .sizing-results-card::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 120px;
            height: 120px;
            background: radial-gradient(circle, rgba(240, 90, 40, 0.15) 0%, transparent 70%);
            pointer-events: none;
          }
          .result-grid-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 12.5px;
          }
          .result-grid-row:last-child {
            border-bottom: none;
          }
          .result-label {
            color: rgba(255, 255, 255, 0.6);
          }
          .result-value {
            font-weight: 700;
            font-family: monospace;
          }
          .final-risk-value {
            font-size: 28px;
            font-weight: 800;
            color: var(--volt-500);
            font-family: monospace;
          }

          /* Monte Carlo Chart */
          .mc-simulator-card {
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.01);
          }
          .mc-hdr {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }
          .mc-inputs {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
          }
          .chart-wrapper {
            width: 100%;
            height: 180px;
            border: 1px solid rgba(11, 15, 25, 0.08);
            background: rgba(11, 15, 25, 0.02);
            border-radius: 8px;
            overflow: hidden;
            position: relative;
          }
          .chart-y-axis {
            position: absolute;
            left: 6px;
            top: 6px;
            font-size: 9px;
            color: rgba(11, 15, 25, 0.4);
            font-weight: 600;
            display: flex;
            flex-direction: column;
            height: calc(100% - 12px);
            justify-content: space-between;
            pointer-events: none;
          }
          .sim-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-top: 16px;
          }
          .sim-stat-box {
            background: rgba(11, 15, 25, 0.02);
            padding: 10px;
            border-radius: 6px;
            text-align: center;
            border: 1px solid rgba(11, 15, 25, 0.05);
          }
          .sim-stat-val {
            font-size: 15px;
            font-weight: 800;
            font-family: monospace;
            color: #0b0f19;
          }
          .sim-stat-lbl {
            font-size: 9.5px;
            font-weight: 600;
            color: rgba(11, 15, 25, 0.5);
            margin-top: 2px;
          }

          /* TAB 4: VPS ARCHITECTURE */
          .vps-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            align-items: center;
          }
          .vps-details-card {
            border: 1px solid rgba(11, 15, 25, 0.08);
            border-radius: 12px;
            padding: 24px;
            height: 100%;
          }
          .vps-step-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .vps-step-item {
            display: flex;
            gap: 12px;
          }
          .vps-step-num {
            width: 24px;
            height: 24px;
            background: #0b0f19;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-shrink: 0;
          }
          .vps-step-body {
            font-size: 13px;
            line-height: 1.5;
          }
          .vps-step-title {
            font-weight: 700;
            color: #0b0f19;
            margin-bottom: 2px;
          }
          .vps-step-desc {
            color: rgba(11, 15, 25, 0.6);
          }

          /* Responsive Styles */
          @media (max-width: 1024px) {
            .sim-dashboard-layout {
              grid-template-columns: 1fr;
            }
            .risk-rings-wrapper {
              grid-template-columns: 1fr;
            }
            .vps-grid {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 768px) {
            .dashboard-content-box {
              padding: 16px;
            }
            .mc-inputs {
              grid-template-columns: 1fr;
            }
            .sim-stats-grid {
              grid-template-columns: 1fr;
            }
          }
        ` }} />

        <div className="lp-gates-dashboard-inner">
          
          {/* Header */}
          <div className="dashboard-header">
            <p className="dashboard-eyebrow">QUANTITATIVE RISK FIREWALL</p>
            <h2 className="dashboard-title">Confluence Pipeline & Risk Governor</h2>
            <p className="dashboard-desc">
              TradeGPT sits as a high-frequency risk firewall between raw market data feeds and active broker execution pools, verifying structural probability before routing transactions.
            </p>
          </div>

          {/* Interactive Navigation Tab Bar */}
          <div className="tab-bar-container">
            <div className="tab-bar">
              <button 
                className={`tab-btn ${activeTab === 'validation' ? 'active' : ''}`}
                onClick={() => setActiveTab('validation')}
              >
                <Activity size={14} />
                Validation Pipeline (1-12)
              </button>
              <button 
                className={`tab-btn ${activeTab === 'risk' ? 'active' : ''}`}
                onClick={() => setActiveTab('risk')}
              >
                <Shield size={14} />
                Risk Governor (13-15)
              </button>
              <button 
                className={`tab-btn ${activeTab === 'sizing' ? 'active' : ''}`}
                onClick={() => setActiveTab('sizing')}
              >
                <Gauge size={14} />
                Dynamic Sizing & Simulator
              </button>
              <button 
                className={`tab-btn ${activeTab === 'vps' ? 'active' : ''}`}
                onClick={() => setActiveTab('vps')}
              >
                <Server size={14} />
                VPS Architecture
              </button>
            </div>
          </div>

          {/* Main Dashboard Panel */}
          <div className="dashboard-content-box">
            {/* Corner dot crosshairs */}
            <div className="grid-dot dot-tl" />
            <div className="grid-dot dot-tr" />
            <div className="grid-dot dot-bl" />
            <div className="grid-dot dot-br" />

            <AnimatePresence mode="wait">
              
              {/* TAB 1: VALIDATION PIPELINE (12 GATES) */}
              {activeTab === 'validation' && (
                <motion.div
                  key="validation"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>
                      Linear 12-Gate Confluence Chain
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'rgba(0, 0, 0, 0.52)' }}>
                      Every Proposed Setup must pass the 3 Critical Gates (Gates 1, 8, and 10) to bypass early lockout. If passed, score points accumulate across Standard Gates. Setups require ≥8/12 gates to generate active broker orders. Click any gate to expand detailed math and target risks.
                    </p>
                  </div>

                  <div className="gates-grid">
                    {GATES.map((gate, i) => (
                      <div 
                        key={gate.num} 
                        className="gate-card-wrapper"
                        onClick={() => setExpandedGate(expandedGate === gate.num ? null : gate.num)}
                      >
                        <TiltCard
                          className="gate-card-modern"
                          style={{ '--gate-accent': gate.accent, '--gate-glow': gate.glow } as React.CSSProperties}
                        >
                          <div>
                            <div className="gate-hdr">
                              <span className="gate-num-badge">GATE {gate.num}</span>
                              <span className={`gate-type-tag ${gate.type === 'CRITICAL' ? 'type-critical' : 'type-standard'}`}>
                                {gate.type}
                              </span>
                            </div>
                            <h4 className="gate-title">{gate.name}</h4>
                            <p className="gate-description">{gate.desc}</p>
                          </div>
                          <div>
                            <div className="gate-formula-box">{gate.formula}</div>
                            <div className="gate-live-output">
                              <span className="live-dot" />
                              {gate.output}
                            </div>
                            <div className="expand-link">
                              <Info size={12} />
                              {expandedGate === gate.num ? 'Hide Details' : 'Show Specifications'}
                            </div>
                          </div>

                          <AnimatePresence>
                            {expandedGate === gate.num && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="expanded-details-container"
                                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inner text
                              >
                                <div style={{ marginBottom: '8px' }}>
                                  <span className="expanded-title">
                                    <TrendingUp size={11} style={{ color: gate.accent }} />
                                    Analytical Objective
                                  </span>
                                  <p style={{ color: 'rgba(11, 15, 25, 0.7)' }}>{gate.objective}</p>
                                </div>
                                <div>
                                  <span className="expanded-title">
                                    <AlertTriangle size={11} style={{ color: gate.accent }} />
                                    Targeted Systemic Risk
                                  </span>
                                  <p style={{ color: 'rgba(11, 15, 25, 0.7)' }}>{gate.risk}</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </TiltCard>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 2: RISK GOVERNOR (GATES 13-15) */}
              {activeTab === 'risk' && (
                <motion.div
                  key="risk"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>
                      Defense-in-Depth Risk Infrastructure
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'rgba(0, 0, 0, 0.52)' }}>
                      Nuclear reactor design philosophy: Three concentric, independent rings of protection guarding capital. Pre-trade filters are backed by **The Sentinel**, a 10-second background watchdog polling active terminals for instant liquidation.
                    </p>
                  </div>

                  <div className="risk-rings-wrapper">
                    {/* Ring Vector Diagram */}
                    <div className="rings-graphic-container">
                      <div className="reactor-ring ring-outer">
                        <span className="ring-label lbl-ring3">Ring 3: Drawdown Governor (Gate 15)</span>
                        <div className="reactor-ring ring-mid">
                          <span className="ring-label lbl-ring2">Ring 2: Daily Circuit Breaker (Gate 14)</span>
                          <div className="reactor-ring ring-inner">
                            <span className="ring-label lbl-ring1">Ring 1: Equity Curve Filter (Gate 13)</span>
                            <div className="reactor-core">CORE</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Explanatory Pane */}
                    <div className="risk-details-pane">
                      <div className="risk-block-card border-blue">
                        <h4 className="risk-block-title">
                          <Layers size={16} style={{ color: '#3b82f6' }} />
                          Gate 13: Equity Curve Protection (ECP)
                        </h4>
                        <p className="risk-block-desc">
                          Hedge-fund rule: <em>"Don't just trade the market; trade the performance of your strategy in the market."</em> Fast (20-trade EMA) and Slow (50-trade SMA) moving filters measure performance drift. If equity drops below SMA50, routing enters RED mode, logging <strong>Shadow Portfolio</strong> phantom trades until simulated recovery re-activates real orders.
                        </p>
                      </div>

                      <div className="risk-block-card border-volt">
                        <h4 className="risk-block-title">
                          <Zap size={16} style={{ color: 'var(--volt-500)' }} />
                          Gate 14: Daily Loss Circuit Breaker (DLCB)
                        </h4>
                        <p className="risk-block-desc">
                          Tiered protective speeds: 
                          <span style={{ display: 'block', margin: '4px 0', fontSize: '11.5px', color: 'rgba(0,0,0,0.7)' }}>
                            • <strong>3.0% Daily Loss</strong>: Caution. Scaling on all entries slashed to 50%. Stop-losses tightened by 20%.<br />
                            • <strong>4.5% Daily Loss</strong>: Warning. Block new trade routing. Migrate open stops to break-even.<br />
                            • <strong>6.0% Daily Loss</strong>: Terminal. Sentinel kill-switch closes all positions instantly.
                          </span>
                          Includes a <em>Consecutive Loss Streak Multiplier</em> scaling size down after 4+ losses.
                        </p>
                      </div>

                      <div className="risk-block-card border-red">
                        <h4 className="risk-block-title">
                          <Lock size={16} style={{ color: '#ef4444' }} />
                          Gate 15: Maximum Drawdown Governor (MDG)
                        </h4>
                        <p className="risk-block-desc">
                          Protects from drawdown cascades with central bank-style graduated throttling (Green &lt;8%, Yellow 8-15%, Orange 15-20%, Red 20-25%, Black &ge;25% Terminal Shutdown). Restores sizing via <strong>Anti-Martingale Recovery</strong> (wins build size back slowly). Imposes a <strong>Portfolio Heat</strong> cap preventing &gt;3% correlation exposure.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: DYNAMIC Position Sizing & Monte Carlo Simulator */}
              {activeTab === 'sizing' && (
                <motion.div
                  key="sizing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>
                      Dynamic Sizing Calculator & Monte Carlo Simulator
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'rgba(0, 0, 0, 0.52)' }}>
                      Adjust the system inputs in the calculator to witness how the Risk Governor dynamically throttles risk fraction to preserve equity. Below, simulate 100 paths of fat-tailed equity returns to compute the statistical probability of hitting the 25% drawdown wall.
                    </p>
                  </div>

                  <div className="sim-dashboard-layout">
                    {/* Left: Input Calculator Controls */}
                    <div className="calc-column">
                      <h4 className="calc-column-title">
                        <Gauge size={16} style={{ color: 'var(--volt-500)' }} />
                        Sizing Parameters
                      </h4>

                      <div className="form-group">
                        <label className="form-label">
                          <span>Account Balance ($)</span>
                          <span style={{ color: '#0b0f19', fontWeight: '700' }}>${calcBalance.toLocaleString()}</span>
                        </label>
                        <input 
                          type="range" 
                          min={1000} 
                          max={100000} 
                          step={1000}
                          value={calcBalance} 
                          onChange={(e) => setCalcBalance(Number(e.target.value))}
                          className="form-input-range"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          <span>Total Account Drawdown (%)</span>
                          <span style={{ color: '#0b0f19', fontWeight: '700' }}>{calcDrawdown}%</span>
                        </label>
                        <input 
                          type="range" 
                          min={0} 
                          max={30} 
                          step={0.5}
                          value={calcDrawdown} 
                          onChange={(e) => setCalcDrawdown(Number(e.target.value))}
                          className="form-input-range"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          <span>Daily Realized Loss (%)</span>
                          <span style={{ color: '#0b0f19', fontWeight: '700' }}>{calcDailyLoss}%</span>
                        </label>
                        <input 
                          type="range" 
                          min={0} 
                          max={8} 
                          step={0.1}
                          value={calcDailyLoss} 
                          onChange={(e) => setCalcDailyLoss(Number(e.target.value))}
                          className="form-input-range"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          <span>Consecutive Losing Trades</span>
                          <span style={{ color: '#0b0f19', fontWeight: '700' }}>{calcStreak} losses</span>
                        </label>
                        <input 
                          type="range" 
                          min={0} 
                          max={8} 
                          value={calcStreak} 
                          onChange={(e) => setCalcStreak(Number(e.target.value))}
                          className="form-input-range"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          <span>Anti-Martingale Recovery Wins</span>
                          <span style={{ color: '#0b0f19', fontWeight: '700' }}>{calcRecoveryWins} / 5</span>
                        </label>
                        <input 
                          type="range" 
                          min={0} 
                          max={5} 
                          value={calcRecoveryWins} 
                          onChange={(e) => setCalcRecoveryWins(Number(e.target.value))}
                          className="form-input-range"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label"><span>Equity Curve Status (Gate 13)</span></label>
                        <div className="form-select-group">
                          {['GREEN', 'AMBER', 'RED'].map((state) => (
                            <button
                              key={state}
                              className={`select-btn ${calcEcpState === state ? 'active' : ''}`}
                              onClick={() => setCalcEcpState(state as any)}
                            >
                              {state}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                          <span>Base Kelly Sizing Option</span>
                          <span style={{ color: '#0b0f19', fontWeight: '700' }}>{calcKellyBase}%</span>
                        </label>
                        <input 
                          type="range" 
                          min={0.5} 
                          max={4.0} 
                          step={0.1}
                          value={calcKellyBase} 
                          onChange={(e) => setCalcKellyBase(Number(e.target.value))}
                          className="form-input-range"
                        />
                      </div>
                    </div>

                    {/* Right: Sizing Output & Monte Carlo Simulator */}
                    <div className="results-column">
                      {/* Active Sizing Output */}
                      <div className="sizing-results-card">
                        <div style={{ marginBottom: '16px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            DYNAMIC RISK RESOLUTION
                          </span>
                          <div className="final-risk-value">
                            {sizingReport.finalRiskPct.toFixed(4)}%
                          </div>
                          <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>
                            Recommended Lot Size Risk: <strong>${sizingReport.finalDollarRisk.toFixed(2)}</strong>
                          </span>
                        </div>

                        <div>
                          <div className="result-grid-row">
                            <span className="result-label">Setup Sizing Class</span>
                            <span className="result-value" style={{ color: sizingReport.classColor }}>
                              {sizingReport.classification}
                            </span>
                          </div>
                          <div className="result-grid-row">
                            <span className="result-label">Gate 13 (ECP) Multiplier</span>
                            <span className="result-value">{sizingReport.ecpMult.toFixed(2)}x</span>
                          </div>
                          <div className="result-grid-row">
                            <span className="result-label">Gate 14 (Daily) Multiplier</span>
                            <span className="result-value">
                              {sizingReport.dailyMult.toFixed(2)}x ({sizingReport.dailyTier})
                            </span>
                          </div>
                          <div className="result-grid-row">
                            <span className="result-label">Consecutive Streak Multiplier</span>
                            <span className="result-value">{sizingReport.streakMult.toFixed(2)}x</span>
                          </div>
                          <div className="result-grid-row">
                            <span className="result-label">Gate 15 (Drawdown) Zone</span>
                            <span className="result-value">
                              {sizingReport.ddMult.toFixed(2)}x ({sizingReport.ddZone})
                            </span>
                          </div>
                          <div className="result-grid-row">
                            <span className="result-label">Anti-Martingale Recovery</span>
                            <span className="result-value">{sizingReport.recoveryMult.toFixed(2)}x</span>
                          </div>
                        </div>
                      </div>

                      {/* Monte Carlo Visualizer Card */}
                      <div className="mc-simulator-card">
                        <div className="mc-hdr">
                          <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: '#0b0f19', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BarChart3 size={15} style={{ color: 'var(--volt-500)' }} />
                            Monte Carlo Ruin Probability Engine
                          </h4>
                          <button 
                            className="select-btn active" 
                            style={{ flex: 'none', padding: '6px 12px', fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={runMonteCarlo}
                          >
                            <RefreshCw size={11} />
                            Resimulate
                          </button>
                        </div>

                        {/* Parameter Controls */}
                        <div className="mc-inputs">
                          <div>
                            <label className="form-label" style={{ fontSize: '10px' }}>
                              <span>Win Rate</span>
                              <span>{simWinRate}%</span>
                            </label>
                            <input 
                              type="range" 
                              min={35} 
                              max={70} 
                              value={simWinRate} 
                              onChange={(e) => setSimWinRate(Number(e.target.value))}
                              className="form-input-range"
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '10px' }}>
                              <span>Reward/Risk</span>
                              <span>{simRRRatio}:1</span>
                            </label>
                            <input 
                              type="range" 
                              min={1.0} 
                              max={4.0} 
                              step={0.1}
                              value={simRRRatio} 
                              onChange={(e) => setSimRRRatio(Number(e.target.value))}
                              className="form-input-range"
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '10px' }}>
                              <span>Risk / Trade</span>
                              <span>{simRiskPerTrade}%</span>
                            </label>
                            <input 
                              type="range" 
                              min={0.5} 
                              max={3.0} 
                              step={0.1}
                              value={simRiskPerTrade} 
                              onChange={(e) => setSimRiskPerTrade(Number(e.target.value))}
                              className="form-input-range"
                            />
                          </div>
                        </div>

                        {/* Chart Render */}
                        <div className="chart-wrapper">
                          <div className="chart-y-axis">
                            <span>$150</span>
                            <span>$100</span>
                            <span>$75</span>
                          </div>
                          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block' }}>
                            {/* Drawdown floor line */}
                            <line x1="0" y1="75" x2="100" y2="75" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                            <text x="98" y="72" fontSize="5" fill="#ef4444" textAnchor="end" fontWeight="bold">25% Drawdown Wall (Ruin Floor)</text>

                            {/* Render paths */}
                            {simResults?.paths.slice(0, 15).map((path, idx) => {
                              // map equity 50-180 to svg 0-100 coordinates
                              // Let's normalize around start = 100 at Y = 50.
                              // Drawdown floor is 75 (mapped to Y = 75)
                              // Peak 175 mapped to Y = 0
                              const points = path.map((eq, step) => {
                                const xVal = (step / 100) * 100;
                                // linear mapping: 100 -> 50, 75 -> 75, 125 -> 25, 150 -> 0
                                let yVal = 50 - (eq - 100);
                                if (yVal < 2) yVal = 2; // clamp top
                                if (yVal > 98) yVal = 98; // clamp bottom
                                return `${xVal},${yVal}`;
                              }).join(' ');

                              // Highlight paths hitting the ruin floor red, others blue
                              const isRuined = path.some(eq => eq <= 75.1);

                              return (
                                <polyline
                                  key={idx}
                                  fill="none"
                                  stroke={isRuined ? '#fda4af' : '#93c5fd'}
                                  strokeWidth={isRuined ? '0.6' : '0.5'}
                                  opacity={isRuined ? '0.45' : '0.7'}
                                  points={points}
                                />
                              );
                            })}
                          </svg>
                        </div>

                        {/* Simulated Stats */}
                        <div className="sim-stats-grid">
                          <div className="sim-stat-box">
                            <div className="sim-stat-val" style={{ color: simResults?.ruinProb && simResults.ruinProb > 20 ? '#ef4444' : '#10b981' }}>
                              {simResults?.ruinProb.toFixed(0)}%
                            </div>
                            <div className="sim-stat-lbl">Probability of Ruin</div>
                          </div>
                          <div className="sim-stat-box">
                            <div className="sim-stat-val">
                              ${simResults?.medianFinalEquity.toFixed(0)}
                            </div>
                            <div className="sim-stat-lbl">Median Ending Equity</div>
                          </div>
                          <div className="sim-stat-box">
                            <div className="sim-stat-val">
                              {simResults?.medianMaxDrawdown.toFixed(1)}%
                            </div>
                            <div className="sim-stat-lbl">Median Peak Drawdown</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: VPS ARCHITECTURE */}
              {activeTab === 'vps' && (
                <motion.div
                  key="vps"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="vps-grid"
                >
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>
                      VPS Clusters & Automated Routing
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'rgba(0, 0, 0, 0.52)', marginBottom: '24px' }}>
                      High-frequency, low-latency execution server configuration running dockerized sidecars to manage live accounts without per-account SDK pricing overhead.
                    </p>

                    <div className="vps-step-list">
                      <div className="vps-step-item">
                        <div className="vps-step-num">1</div>
                        <div className="vps-step-body">
                          <div className="vps-step-title">Twelve Data & Websocket Feeds</div>
                          <div className="vps-step-desc">
                            Real-time tick & candle data streams are ingested through secure high-speed connections directly into TradeGPT's data processor.
                          </div>
                        </div>
                      </div>

                      <div className="vps-step-item">
                        <div className="vps-step-num">2</div>
                        <div className="vps-step-body">
                          <div className="vps-step-title">Redis & Supabase Caching Layer</div>
                          <div className="vps-step-desc">
                            High-frequency indicators are cached inside an in-memory Redis database to bypass API rate-limiting blocks and keep database writes optimized.
                          </div>
                        </div>
                      </div>

                      <div className="vps-step-item">
                        <div className="vps-step-num">3</div>
                        <div className="vps-step-body">
                          <div className="vps-step-title">Dockerized MT5 Execution Farm</div>
                          <div className="vps-step-desc">
                            Transactions are routed into memory-optimized VPS instances running Wine-based Docker containers. This structure manages multiple client terminals simultaneously.
                          </div>
                        </div>
                      </div>

                      <div className="vps-step-item">
                        <div className="vps-step-num">4</div>
                        <div className="vps-step-body">
                          <div className="vps-step-title">API Failover Protocol</div>
                          <div className="vps-step-desc">
                            If twelve data API latencies spike above 1,500ms, the data router instantly failovers to Yahoo Finance backup sockets ensuring uninterruptible trade checks.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="vps-details-card" style={{ background: 'rgba(11, 15, 25, 0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <Terminal size={18} style={{ color: 'var(--volt-500)' }} />
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0b0f19' }}>
                        Low-Latency Technical Targets
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>
                        <span style={{ color: 'rgba(0,0,0,0.5)' }}>Tick Ingestion Latency</span>
                        <strong style={{ fontFamily: 'monospace' }}>&lt; 45ms</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>
                        <span style={{ color: 'rgba(0,0,0,0.5)' }}>12-Gate Audit Check Speed</span>
                        <strong style={{ fontFamily: 'monospace' }}>&lt; 15ms</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>
                        <span style={{ color: 'rgba(0,0,0,0.5)' }}>Sentinel Polling Cycle</span>
                        <strong style={{ fontFamily: 'monospace' }}>10.0 seconds</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>
                        <span style={{ color: 'rgba(0,0,0,0.5)' }}>Emergency Kill-Switch Execution</span>
                        <strong style={{ fontFamily: 'monospace' }}>&lt; 2.5s (average)</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>
                        <span style={{ color: 'rgba(0,0,0,0.5)' }}>VPS Uptime Guarantee</span>
                        <strong style={{ fontFamily: 'monospace' }}>99.98%</strong>
                      </div>
                    </div>

                    <div style={{ marginTop: '24px', background: '#0b0f19', borderRadius: '8px', padding: '16px', color: '#ffffff' }}>
                      <h5 style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Active Terminal Output
                      </h5>
                      <pre style={{ fontSize: '11px', fontFamily: 'monospace', color: '#10b981', overflowX: 'auto', lineHeight: '1.4' }}>
{`[INFO] Ingesting WS EUR/USD tick: 1.08542
[AUDIT] Gate 10 check: 2/3 EMAs align Bearish
[AUDIT] Confluence score: 9/12 gates passed
[DECISION] SIGNAL Grade AA - Kelly size: 1.25%
[ROUTING] farmExecuteTrade(): sent to MT5 VPS
[SENTINEL] Polling active. Daily loss: 0.12%`}
                      </pre>
                    </div>
                  </div>
                </motion.div>
                )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </>
  );
}
