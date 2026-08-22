'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, ArrowRight, Layers, Gauge, LineChart,
  Cpu, Hash, Sparkles, FileText, TrendingUp, Shield, X
} from 'lucide-react';

// ---------------------------------------------------------
// GLOSSARY DATA
// ---------------------------------------------------------

type Category = 'All' | 'Market Structure' | 'Indicators' | 'Risk & Stats' | 'Platform';

const CATEGORIES: { key: Category; icon?: React.ReactNode }[] = [
  { key: 'All' },
  { key: 'Market Structure', icon: <Layers size={12} /> },
  { key: 'Indicators', icon: <LineChart size={12} /> },
  { key: 'Risk & Stats', icon: <Gauge size={12} /> },
  { key: 'Platform', icon: <Cpu size={12} /> },
];

interface Term {
  term: string;
  full?: string;
  category: Exclude<Category, 'All'>;
  def: string;
  related?: string[];
}

const TERMS: Term[] = [
  // ── Market Structure ──
  {
    term: 'BOS',
    full: 'Break of Structure',
    category: 'Market Structure',
    def: 'A close beyond the most recent significant swing high (bullish) or swing low (bearish), signalling trend continuation. Gate 2 requires a confirmed BOS — not just a wick — before treating structure as directional.',
    related: ['ChoCH', 'Liquidity Sweep'],
  },
  {
    term: 'ChoCH',
    full: 'Change of Character',
    category: 'Market Structure',
    def: 'The first structural break against the prevailing trend — the earliest objective evidence that a trend may be reversing. Often precedes a full reversal but requires confluence before it is tradeable.',
    related: ['BOS', 'Order Block'],
  },
  {
    term: 'FVG',
    full: 'Fair Value Gap',
    category: 'Market Structure',
    def: 'A three-candle imbalance where the wicks of candles one and three do not overlap, leaving an unfilled window of price. Treated as a magnet and potential entry zone when aligned with higher-timeframe bias.',
    related: ['Order Block', 'Imbalance'],
  },
  {
    term: 'Order Block',
    category: 'Market Structure',
    def: 'The last opposing candle (or cluster) before an impulsive move that breaks structure — interpreted as the footprint of institutional accumulation or distribution. Unmitigated order blocks serve as entry zones in Gate 2 scans.',
    related: ['BOS', 'FVG', 'Mitigation'],
  },
  {
    term: 'Liquidity Sweep',
    category: 'Market Structure',
    def: 'A rapid probe beyond an obvious high or low that triggers resting stop orders before price reverses. Distinguishing sweeps from genuine breakouts is the core skill Gate 2 automates.',
    related: ['BOS', 'Equal Highs/Lows'],
  },
  {
    term: 'Equal Highs/Lows',
    category: 'Market Structure',
    def: 'Two or more swing points at nearly identical prices. They concentrate stop-loss liquidity and are frequent targets for sweeps rather than reliable support or resistance.',
    related: ['Liquidity Sweep'],
  },
  {
    term: 'Mitigation',
    category: 'Market Structure',
    def: 'A return of price to an order block or imbalance where earlier positions are presumed to be offset. A zone that has been mitigated once loses much of its forward-looking edge.',
    related: ['Order Block', 'FVG'],
  },
  {
    term: 'Kill Zone',
    category: 'Market Structure',
    def: 'A time window — typically the London and New York opens — where institutional volume concentrates and structural moves have the highest follow-through. Gate 4 grades sessions on this basis.',
    related: ['Session Filter'],
  },
  {
    term: 'Imbalance',
    category: 'Market Structure',
    def: 'Any region where price moved so fast that two-sided trade did not occur, including FVGs. Markets often revisit imbalances to rebalance order flow before continuing.',
    related: ['FVG'],
  },

  // ── Indicators ──
  {
    term: 'ATR',
    full: 'Average True Range',
    category: 'Indicators',
    def: 'A volatility measure averaging the true range of the last N candles (14 by default). The engine uses ATR ratios to detect dead or overheated regimes (Gate 5) and to place structure-aware stop losses.',
    related: ['Volatility Regime'],
  },
  {
    term: 'VWAP',
    full: 'Volume Weighted Average Price',
    category: 'Indicators',
    def: 'The average traded price weighted by volume, reset each session. Institutional desks benchmark fills against it; Gate 11 rejects entries stretched more than ±2σ from VWAP as statistically expensive.',
    related: ['Standard Deviation Bands'],
  },
  {
    term: 'RSI',
    full: 'Relative Strength Index',
    category: 'Indicators',
    def: 'A 0–100 momentum oscillator comparing recent gains to losses. Readings above 70 or below 30 flag stretched conditions — one weighted vote inside the Gate 1 confluence score, never a standalone signal.',
  },
  {
    term: 'MACD',
    full: 'Moving Average Convergence Divergence',
    category: 'Indicators',
    def: 'Momentum indicator built from the spread between two EMAs and a signal line. Crossovers and divergences contribute directional weight to the confluence vote.',
    related: ['EMA'],
  },
  {
    term: 'EMA',
    full: 'Exponential Moving Average',
    category: 'Indicators',
    def: 'A moving average weighting recent prices more heavily. The MTF stack (Gate 10) checks EMA trend agreement across Weekly, Daily and 4H charts before permitting a signal.',
    related: ['MTF Alignment', 'MACD'],
  },
  {
    term: 'Bollinger Bands',
    category: 'Indicators',
    def: 'Volatility envelopes plotted a set number of standard deviations around a moving average. Band width feeds regime detection; band touches alone are not treated as signals.',
    related: ['Standard Deviation Bands', 'ATR'],
  },
  {
    term: 'ADX',
    full: 'Average Directional Index',
    category: 'Indicators',
    def: 'Measures trend strength (not direction) on a 0–100 scale. Readings above ~25 indicate a trending regime where continuation setups carry better expectancy.',
  },
  {
    term: 'Standard Deviation Bands',
    category: 'Indicators',
    def: 'Statistical envelopes (±1σ, ±2σ) around a reference price such as VWAP. They convert "overextended" from an opinion into a measurable distance.',
    related: ['VWAP', 'Bollinger Bands'],
  },

  // ── Risk & Stats ──
  {
    term: 'Drawdown',
    category: 'Risk & Stats',
    def: 'The peak-to-trough decline in account equity, expressed as a percentage. The Risk Governor throttles position size through graduated drawdown zones and halts trading entirely at the 25% terminal wall.',
    related: ['Risk Governor', 'Equity Curve'],
  },
  {
    term: 'Expectancy',
    category: 'Risk & Stats',
    def: 'The average amount you expect to win or lose per trade: (Win% × AvgWin) − (Loss% × AvgLoss). Positive expectancy over a large sample — not win rate — is what makes a strategy viable.',
    related: ['R-Multiple', 'Win Rate'],
  },
  {
    term: 'R-Multiple',
    category: 'Risk & Stats',
    def: 'Profit or loss expressed as a multiple of initial risk. A trade risking $100 that banks $250 is +2.5R. Journaling in R-multiples makes performance comparable across account sizes.',
    related: ['Expectancy', 'Risk/Reward Ratio'],
  },
  {
    term: 'Risk/Reward Ratio',
    category: 'Risk & Stats',
    def: 'The ratio of potential profit to the amount risked, measured at entry from stop to target. HeroPips signals publish a minimum R:R so the trade is judged before the outcome is known.',
    related: ['R-Multiple'],
  },
  {
    term: 'Win Rate',
    category: 'Risk & Stats',
    def: 'The percentage of trades closed profitably. Meaningless in isolation: a 40% win rate at 2.5R average is strongly profitable, while a 70% win rate can lose money with poor R:R.',
    related: ['Expectancy'],
  },
  {
    term: 'Kelly Criterion',
    category: 'Risk & Stats',
    def: 'A formula for the bet size that maximizes long-run growth given edge and odds. Full Kelly is violently volatile, so the sizing engine uses a fractional Kelly base scaled down by governor multipliers.',
    related: ['Position Sizing'],
  },
  {
    term: 'Position Sizing',
    category: 'Risk & Stats',
    def: 'Determining how much capital to risk per trade. In HeroPips this is dynamic: a Kelly-derived base multiplied by equity-curve state, daily-loss tier, streak and drawdown-zone multipliers.',
    related: ['Kelly Criterion', 'Risk Governor'],
  },
  {
    term: 'Monte Carlo Simulation',
    category: 'Risk & Stats',
    def: 'Running thousands of randomized equity paths from your win rate, R:R and risk-per-trade to estimate outcome distributions — including the probability of hitting a ruin threshold.',
    related: ['Drawdown', 'Expectancy'],
  },
  {
    term: 'Equity Curve',
    category: 'Risk & Stats',
    def: 'Account balance plotted over time, trade by trade. Gate 13 trades the equity curve itself: when it drops below its slow moving average, live routing pauses and phantom trades log instead.',
    related: ['Drawdown', 'Shadow Portfolio'],
  },

  // ── Platform ──
  {
    term: 'The 12 Gates',
    category: 'Platform',
    def: 'The sequential validation pipeline every potential signal must pass: confluence score, SMC confirmation, timeframe alignment, session filter, volatility regime, conflict check, cooldown, news veto, correlation, MTF stack, VWAP bands and candle geometry. Setups need 8/12 or better, including all critical gates.',
    related: ['Confluence Score', 'Risk Governor'],
  },
  {
    term: 'Confluence Score',
    category: 'Platform',
    def: "Gate 1's weighted vote across RSI, MACD, EMA, Bollinger and Stochastic inputs. A setup needs at least 45% directional agreement before the remaining gates even run.",
    related: ['The 12 Gates'],
  },
  {
    term: 'Risk Governor',
    category: 'Platform',
    def: 'The post-signal defense layer (Gates 13–15): equity-curve protection, the daily-loss circuit breaker and the maximum drawdown governor. It scales position size down — or to zero — as conditions deteriorate.',
    related: ['Governor States', 'Drawdown'],
  },
  {
    term: 'Governor States',
    category: 'Platform',
    def: 'GREEN: full sizing permitted. AMBER: equity curve under its fast average — size halved. RED: curve below its slow average — live routing paused while the Shadow Portfolio logs phantom trades until simulated recovery.',
    related: ['Risk Governor', 'Shadow Portfolio'],
  },
  {
    term: 'Shadow Portfolio',
    category: 'Platform',
    def: 'Phantom trade logging that continues while live routing is paused in a RED state. It lets the system verify the strategy has recovered on paper before real capital resumes.',
    related: ['Governor States', 'Equity Curve'],
  },
  {
    term: 'The Sentinel',
    category: 'Platform',
    def: 'A background watchdog polling active terminals every 10 seconds. If a daily-loss or drawdown terminal threshold is breached, it executes the kill-switch and flattens all positions.',
    related: ['Risk Governor'],
  },
  {
    term: 'Signal Grade',
    category: 'Platform',
    def: 'The AAA→B classification attached to every signal after sizing multipliers resolve. AAA denotes full-size conditions; lower grades indicate the governor has throttled risk for that setup.',
    related: ['Position Sizing', 'Risk Governor'],
  },
  {
    term: 'MTF Alignment',
    full: 'Multi-Timeframe Alignment',
    category: 'Platform',
    def: "Gate 10's requirement that at least two of the Weekly, Daily and 4H trends agree with signal direction, filtering lower-timeframe setups that fight the macro trend.",
    related: ['EMA', 'The 12 Gates'],
  },
  {
    term: 'News Event Veto',
    category: 'Platform',
    def: "Gate 8's hard lockout: no new signals from 30 minutes before to 15 minutes after high-impact calendar events (CPI, NFP, FOMC), avoiding gap and slippage risk around releases.",
    related: ['The 12 Gates', 'Kill Zone'],
  },
];

const POPULAR_ARTICLES = [
  {
    icon: <Layers size={15} />,
    title: 'How the 12 Gates decide what you never see',
    desc: 'A plain-language tour of the validation pipeline and why most setups are rejected silently.',
    tag: 'Methodology',
  },
  {
    icon: <Gauge size={15} />,
    title: 'Reading your Risk Governor state',
    desc: 'What GREEN, AMBER and RED actually change about your sizing — with worked examples.',
    tag: 'Risk',
  },
  {
    icon: <TrendingUp size={15} />,
    title: 'From signal to journal: the full trade lifecycle',
    desc: 'Every field on a HeroPips signal card explained, from grade to invalidation level.',
    tag: 'Platform',
  },
  {
    icon: <Shield size={15} />,
    title: 'Prop-firm rules mapped to governor settings',
    desc: 'Translate evaluation drawdown limits into automatic sizing constraints.',
    tag: 'Funding',
  },
];

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('All');

  useEffect(() => {
    document.title = 'HeroPips | Knowledge Base';
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TERMS.filter((t) => {
      const inCategory = category === 'All' || t.category === category;
      if (!inCategory) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        (t.full ?? '').toLowerCase().includes(q) ||
        t.def.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .kb-page {
          background: var(--bg-app);
          color: var(--text-hi);
          overflow-x: clip;
        }
        .kb-inner {
          max-width: 1120px;
          margin: 0 auto;
          width: 100%;
          padding: 0 24px;
        }

        /* HERO */
        .kb-hero {
          padding: 150px 0 56px;
          text-align: center;
          position: relative;
        }
        .kb-hero::before {
          content: '';
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 720px; height: 420px;
          background: radial-gradient(ellipse at center top, color-mix(in srgb, var(--volt-500) 10%, transparent) 0%, transparent 70%);
          pointer-events: none;
        }
        .kb-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--volt-500);
          border: 1px solid color-mix(in srgb, var(--volt-500) 35%, transparent);
          background: color-mix(in srgb, var(--volt-500) 7%, transparent);
          border-radius: 9999px;
          padding: 6px 14px;
          margin-bottom: 20px;
          position: relative;
          z-index: 1;
        }
        .kb-title {
          font-size: clamp(34px, 5.2vw, 58px);
          font-weight: 800;
          letter-spacing: -2.2px;
          line-height: 1.06;
          margin-bottom: 18px;
          position: relative;
          z-index: 1;
        }
        .kb-title-accent { color: var(--volt-500); }
        .kb-sub {
          font-size: 16px;
          color: var(--text-low);
          line-height: 1.65;
          max-width: 600px;
          margin: 0 auto 34px;
          position: relative;
          z-index: 1;
        }

        /* SEARCH */
        .kb-search-wrap {
          max-width: 620px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .kb-search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-app);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 6px 8px 6px 18px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.08);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .kb-search-box:focus-within {
          border-color: var(--volt-500);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.08), 0 0 0 4px color-mix(in srgb, var(--volt-500) 14%, transparent);
        }
        .kb-search-box svg { color: var(--text-low); flex-shrink: 0; }
        .kb-search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-family: inherit;
          font-size: 15px;
          color: var(--text-hi);
          padding: 12px 0;
          min-width: 0;
        }
        .kb-search-input::placeholder { color: var(--text-low); }
        .kb-search-clear {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px; height: 30px;
          border-radius: 8px;
          border: none;
          background: var(--surface-2);
          color: var(--text-mid);
          cursor: pointer;
          flex-shrink: 0;
        }
        .kb-search-kbd {
          font-size: 10px;
          font-weight: 700;
          font-family: monospace;
          color: var(--text-low);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 4px 7px;
          flex-shrink: 0;
          margin-right: 6px;
        }
        .kb-search-hint {
          margin-top: 12px;
          font-size: 11.5px;
          color: var(--text-low);
        }
        .kb-search-hint button {
          background: none;
          border: none;
          font-family: inherit;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--volt-500);
          cursor: pointer;
          padding: 0 3px;
        }

        .kb-section { padding: 56px 0 72px; }
        .kb-section-alt {
          background: var(--surface-1);
          border-top: 1px solid var(--border-subtle);
          border-bottom: 1px solid var(--border-subtle);
        }
        .kb-section-head { text-align: center; margin-bottom: 36px; }
        .kb-section-eyebrow {
          font-size: 11px;
          font-weight: 700;
          color: var(--volt-500);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .kb-section-title {
          font-size: clamp(24px, 3.4vw, 36px);
          font-weight: 800;
          letter-spacing: -1.2px;
          margin-bottom: 12px;
        }
        .kb-section-desc {
          font-size: 14.5px;
          color: var(--text-low);
          line-height: 1.65;
          max-width: 560px;
          margin: 0 auto;
        }

        /* CATEGORY CHIPS */
        .kb-cat-bar {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }
        .kb-cat-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 9999px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-app);
          color: var(--text-mid);
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .kb-cat-chip:hover { border-color: var(--border-strong); color: var(--text-hi); }
        .kb-cat-chip.active {
          background: var(--text-hi);
          border-color: var(--text-hi);
          color: var(--bg-app);
        }
        .kb-cat-count {
          font-size: 10px;
          font-weight: 800;
          font-family: monospace;
          opacity: 0.65;
        }

        /* GLOSSARY GRID */
        .kb-result-meta {
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          font-family: monospace;
          color: var(--text-low);
          margin-bottom: 20px;
        }
        .kb-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 14px;
        }
        .kb-term-card {
          background: var(--bg-app);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 20px;
          height: 100%;
          display: flex;
          flex-direction: column;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .kb-term-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-strong);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.06);
        }
        .kb-term-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 8px;
        }
        .kb-term-name {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }
        .kb-term-full {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-low);
          margin-top: 1px;
        }
        .kb-term-cat {
          flex-shrink: 0;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .kb-cat-structure { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }
        .kb-cat-indicators { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
        .kb-cat-risk { color: #10b981; background: rgba(16, 185, 129, 0.1); }
        .kb-cat-platform { color: var(--volt-500); background: color-mix(in srgb, var(--volt-500) 10%, transparent); }
        .kb-term-def {
          font-size: 12.5px;
          color: var(--text-mid);
          line-height: 1.6;
          flex-grow: 1;
        }
        .kb-term-related {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed var(--border-subtle);
        }
        .kb-related-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: inherit;
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-low);
          background: var(--surface-2);
          border: none;
          border-radius: 9999px;
          padding: 3px 9px;
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .kb-related-chip:hover {
          color: var(--volt-500);
          background: color-mix(in srgb, var(--volt-500) 9%, transparent);
        }
        .kb-empty {
          text-align: center;
          padding: 56px 20px;
          color: var(--text-low);
        }
        .kb-empty-title { font-size: 16px; font-weight: 700; color: var(--text-hi); margin-bottom: 6px; }
        .kb-empty-desc { font-size: 13px; }

        /* POPULAR ARTICLES */
        .kb-articles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 14px;
        }
        .kb-article-card {
          display: flex;
          flex-direction: column;
          background: var(--bg-app);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 22px;
          text-decoration: none;
          color: inherit;
          height: 100%;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .kb-article-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
        }
        .kb-article-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .kb-article-icon {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: color-mix(in srgb, var(--volt-500) 10%, transparent);
          color: var(--volt-500);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kb-article-tag {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-low);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 3px 7px;
        }
        .kb-article-title {
          font-size: 14.5px;
          font-weight: 700;
          line-height: 1.4;
          margin-bottom: 6px;
        }
        .kb-article-desc {
          font-size: 12px;
          color: var(--text-low);
          line-height: 1.55;
          flex-grow: 1;
        }
        .kb-article-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
          color: var(--volt-500);
          margin-top: 14px;
        }

        /* FINAL CTA */
        .kb-final {
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          background:
            radial-gradient(ellipse at 50% 120%, color-mix(in srgb, var(--volt-500) 14%, transparent) 0%, transparent 60%),
            var(--surface-1);
          padding: 64px 32px;
          text-align: center;
        }
        .kb-final-title {
          font-size: clamp(24px, 3.4vw, 34px);
          font-weight: 800;
          letter-spacing: -1.2px;
          margin-bottom: 12px;
        }
        .kb-final-desc {
          font-size: 14.5px;
          color: var(--text-low);
          max-width: 520px;
          margin: 0 auto 28px;
          line-height: 1.65;
        }
        .kb-cta-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .kb-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--volt-500);
          color: var(--bg-app);
          font-size: 14px;
          font-weight: 700;
          padding: 12px 26px;
          border-radius: 9999px;
          text-decoration: none;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 4px 16px color-mix(in srgb, var(--volt-500) 30%, transparent);
        }
        .kb-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px color-mix(in srgb, var(--volt-500) 40%, transparent);
        }
      ` }} />

      <div className="kb-page">
        {/* HERO + SEARCH */}
        <section className="kb-hero">
          <div className="kb-inner">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="kb-eyebrow">
                <BookOpen size={13} />
                Hero Academy · Knowledge Base
              </span>
              <h1 className="kb-title">
                Every term, gate and metric —<br />
                <span className="kb-title-accent">defined precisely.</span>
              </h1>
              <p className="kb-sub">
                The working vocabulary of the HeroPips platform: market structure concepts,
                indicator math, risk statistics and every platform mechanism, written to be
                testable rather than vague.
              </p>

              <div className="kb-search-wrap">
                <div className="kb-search-box">
                  <Search size={17} />
                  <input
                    className="kb-search-input"
                    type="text"
                    placeholder="Search: BOS, FVG, expectancy, Risk Governor…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search the glossary"
                  />
                  {query ? (
                    <button
                      className="kb-search-clear"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <span className="kb-search-kbd">{TERMS.length} terms</span>
                  )}
                </div>
                <p className="kb-search-hint">
                  Popular lookups:
                  <button onClick={() => setQuery('order block')}>Order Block</button>·
                  <button onClick={() => setQuery('drawdown')}>Drawdown</button>·
                  <button onClick={() => setQuery('12 gates')}>The 12 Gates</button>·
                  <button onClick={() => setQuery('vwap')}>VWAP</button>
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* GLOSSARY */}
        <section className="kb-section kb-section-alt">
          <div className="kb-inner">
            <div className="kb-cat-bar" role="tablist" aria-label="Filter glossary by category">
              {CATEGORIES.map((c) => {
                const count =
                  c.key === 'All' ? TERMS.length : TERMS.filter((t) => t.category === c.key).length;
                return (
                  <button
                    key={c.key}
                    className={`kb-cat-chip ${category === c.key ? 'active' : ''}`}
                    onClick={() => setCategory(c.key)}
                    role="tab"
                    aria-selected={category === c.key}
                  >
                    {c.icon ?? <Hash size={12} />}
                    {c.key}
                    <span className="kb-cat-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <p className="kb-result-meta">
              {filtered.length} of {TERMS.length} terms
              {query.trim() ? ` matching "${query.trim()}"` : ''}
            </p>

            <motion.div layout className="kb-grid">
              <AnimatePresence mode="popLayout">
                {filtered.map((t) => (
                  <motion.div
                    key={t.term}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="kb-term-card">
                      <div className="kb-term-head">
                        <div>
                          <span className="kb-term-name">{t.term}</span>
                          {t.full && <span className="kb-term-full">{t.full}</span>}
                        </div>
                        <span
                          className={`kb-term-cat ${
                            t.category === 'Market Structure'
                              ? 'kb-cat-structure'
                              : t.category === 'Indicators'
                              ? 'kb-cat-indicators'
                              : t.category === 'Risk & Stats'
                              ? 'kb-cat-risk'
                              : 'kb-cat-platform'
                          }`}
                        >
                          {t.category}
                        </span>
                      </div>
                      <p className="kb-term-def">{t.def}</p>
                      {t.related && t.related.length > 0 && (
                        <div className="kb-term-related">
                          {t.related.map((r) => (
                            <button
                              key={r}
                              className="kb-related-chip"
                              onClick={() => {
                                setCategory('All');
                                setQuery(r);
                              }}
                            >
                              <Sparkles size={9} />
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {filtered.length === 0 && (
              <div className="kb-empty">
                <p className="kb-empty-title">No matching terms</p>
                <p className="kb-empty-desc">
                  Try a shorter query, or clear the category filter — the glossary covers
                  {' '}{TERMS.length} terms across structure, indicators, risk and the platform.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* POPULAR ARTICLES */}
        <section className="kb-section">
          <div className="kb-inner">
            <div className="kb-section-head">
              <p className="kb-section-eyebrow">Popular Articles</p>
              <h2 className="kb-section-title">Start with the guides members read most</h2>
              <p className="kb-section-desc">
                Longer-form explainers that connect the vocabulary above into working knowledge
                of the platform.
              </p>
            </div>
            <div className="kb-articles-grid">
              {POPULAR_ARTICLES.map((a) => (
                <a key={a.title} href="/login?signup=true" className="kb-article-card">
                  <div className="kb-article-top">
                    <span className="kb-article-icon">{a.icon}</span>
                    <span className="kb-article-tag">{a.tag}</span>
                  </div>
                  <h3 className="kb-article-title">{a.title}</h3>
                  <p className="kb-article-desc">{a.desc}</p>
                  <span className="kb-article-link">
                    Read the guide <ArrowRight size={13} />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="kb-section" style={{ paddingTop: 0 }}>
          <div className="kb-inner">
            <div className="kb-final">
              <h2 className="kb-final-title">Vocabulary is step one. The terminal is step two.</h2>
              <p className="kb-final-desc">
                Every term in this glossary maps to something you can see live in the HeroPips
                terminal — gates passing, governor states shifting, signals being graded.
                Create a free account and watch the definitions at work.
              </p>
              <div className="kb-cta-row">
                <a href="/login?signup=true" className="kb-btn-primary">
                  Open the Terminal <ArrowRight size={15} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
