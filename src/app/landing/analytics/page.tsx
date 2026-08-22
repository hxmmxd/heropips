'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, PieChart, Target, Download,
  ArrowRight, LineChart, Table2, Percent, Sigma, Layers,
  CalendarDays, FileSpreadsheet, Filter, CheckCircle2,
} from 'lucide-react';
import TiltCard from '../TiltCard';

// ---------------------------------------------------------
// MOCK DASHBOARD DATA (static, deterministic — no libraries)
// ---------------------------------------------------------

// Equity curve points (percent of starting equity, 0-100 x steps)
const EQUITY_POINTS = [
  100, 100.8, 101.5, 101.1, 102.4, 103.0, 102.6, 103.8, 104.5, 104.1,
  105.3, 106.2, 105.7, 106.9, 108.1, 107.5, 108.4, 109.6, 109.1, 110.3,
  111.2, 110.6, 111.8, 113.1, 112.4, 113.6, 114.9, 114.2, 115.5, 116.8,
];

const STAT_TILES = [
  { label: 'Win Rate', value: '54.2%', sub: 'trailing 250 trades', icon: Percent, accent: '#10b981' },
  { label: 'Profit Factor', value: '1.87', sub: 'gross win / gross loss', icon: Sigma, accent: '#3b82f6' },
  { label: 'Expectancy', value: '+0.41R', sub: 'per validated signal', icon: Target, accent: '#8b5cf6' },
  { label: 'Max Drawdown', value: '−6.8%', sub: 'peak to trough', icon: TrendingUp, accent: '#f59e0b' },
];

const PAIR_ROWS = [
  { pair: 'XAU/USD', trades: 62, winRate: 58, netR: 14.2, width: 100 },
  { pair: 'EUR/USD', trades: 48, winRate: 54, netR: 9.6, width: 68 },
  { pair: 'GBP/JPY', trades: 41, winRate: 51, netR: 7.1, width: 50 },
  { pair: 'NAS100', trades: 37, winRate: 56, netR: 6.4, width: 45 },
  { pair: 'BTC/USD', trades: 33, winRate: 49, netR: 3.8, width: 27 },
  { pair: 'US30', trades: 29, winRate: 52, netR: 2.9, width: 20 },
];

const SESSION_ROWS = [
  { session: 'London', hours: '08:00–12:00 UTC', winRate: 57, expectancy: '+0.52R', share: 38 },
  { session: 'LDN/NY Overlap', hours: '12:00–16:00 UTC', winRate: 59, expectancy: '+0.61R', share: 34 },
  { session: 'New York', hours: '16:00–21:00 UTC', winRate: 50, expectancy: '+0.24R', share: 21 },
  { session: 'Asian', hours: '00:00–08:00 UTC', winRate: 44, expectancy: '+0.05R', share: 7 },
];

// Gate attribution: how often each gate is the deciding filter on winners
const GATE_ATTRIBUTION = [
  { gate: 'G01 · Confluence Bias', score: 86 },
  { gate: 'G10 · MTF Stack', score: 79 },
  { gate: 'G02 · SMC Confirmation', score: 74 },
  { gate: 'G08 · News Veto', score: 68 },
  { gate: 'G04 · Session Filter', score: 63 },
  { gate: 'G11 · VWAP Bands', score: 55 },
  { gate: 'G05 · Volatility Regime', score: 49 },
  { gate: 'G12 · Candle Geometry', score: 42 },
];

const JOURNAL_ROWS = [
  { id: 'HP-4821', pair: 'XAU/USD', dir: 'LONG', grade: 'AAA', gates: '11/12', rr: '+2.4R', session: 'LDN/NY', result: 'win' },
  { id: 'HP-4820', pair: 'EUR/USD', dir: 'SHORT', grade: 'AA', gates: '9/12', rr: '−1.0R', session: 'LDN', result: 'loss' },
  { id: 'HP-4819', pair: 'NAS100', dir: 'LONG', grade: 'AA', gates: '10/12', rr: '+1.8R', session: 'NY', result: 'win' },
  { id: 'HP-4818', pair: 'GBP/JPY', dir: 'SHORT', grade: 'AAA', gates: '12/12', rr: '+2.1R', session: 'ASI', result: 'win' },
  { id: 'HP-4817', pair: 'BTC/USD', dir: 'LONG', grade: 'A', gates: '8/12', rr: '−1.0R', session: 'NY', result: 'loss' },
];

const FEATURES = [
  {
    icon: LineChart,
    title: 'Live Equity Curve',
    desc: 'Mark-to-market equity, refreshed on every fill. Overlay the 20-trade EMA and 50-trade SMA the Risk Governor uses to gate routing.',
  },
  {
    icon: Layers,
    title: 'Gate Attribution',
    desc: 'See which of the 12 validation gates actually correlate with your winners — and which setups you should stop taking.',
  },
  {
    icon: Filter,
    title: 'Slice Anything',
    desc: 'Filter every metric by pair, session, signal grade, direction, or date range. Every chart recomputes instantly.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Exportable Journal',
    desc: 'One-click CSV and JSON export of the full trade journal — entries, exits, gate scores, and governor state at execution.',
  },
];

// Build an SVG path from the equity points inside a 100×60 viewBox
function buildEquityPath(points: number[]): { line: string; area: string } {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 55 - ((p - min) / span) * 48;
    return { x, y };
  });
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ');
  const area = `${line} L 100 60 L 0 60 Z`;
  return { line, area };
}

const EQUITY_PATH = buildEquityPath(EQUITY_POINTS);

// ---------------------------------------------------------
// PAGE
// ---------------------------------------------------------

export default function AnalyticsPage() {
  const [breakdown, setBreakdown] = useState<'pairs' | 'sessions'>('pairs');

  useEffect(() => {
    document.title = 'HeroPips | Analytics Dashboard';
  }, []);

  const maxGate = useMemo(() => Math.max(...GATE_ATTRIBUTION.map((g) => g.score)), []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .an-page {
          background: var(--bg-app);
          color: var(--text-hi);
        }
        .an-container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .an-section {
          padding: 88px 0;
          border-bottom: 1px solid var(--border-subtle);
        }
        .an-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--volt-500);
          border: 1px solid var(--border-subtle);
          background: var(--surface-1);
          padding: 6px 14px;
          border-radius: 9999px;
          margin-bottom: 20px;
        }
        .an-h1 {
          font-size: clamp(34px, 5.5vw, 60px);
          font-weight: 800;
          letter-spacing: -2px;
          line-height: 1.08;
          color: var(--text-hi);
          margin-bottom: 20px;
        }
        .an-h1 .an-accent { color: var(--volt-500); }
        .an-sub {
          font-size: 16.5px;
          line-height: 1.65;
          color: var(--text-mid);
          max-width: 640px;
          margin: 0 auto 32px auto;
        }
        .an-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .an-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--text-hi); color: var(--bg-app);
          font-size: 14px; font-weight: 700;
          padding: 13px 26px; border-radius: 9999px; text-decoration: none;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .an-btn-primary:hover { transform: translateY(-2px); opacity: 0.9; }
        .an-btn-secondary {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--surface-1); color: var(--text-hi);
          border: 1px solid var(--border-subtle);
          font-size: 14px; font-weight: 600;
          padding: 13px 24px; border-radius: 9999px; text-decoration: none;
          transition: background 0.15s ease;
        }
        .an-btn-secondary:hover { background: var(--surface-2); }
        .an-section-head { max-width: 680px; margin-bottom: 44px; }
        .an-kicker {
          font-size: 11px; font-weight: 800; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--volt-500); margin-bottom: 10px;
        }
        .an-h2 {
          font-size: clamp(24px, 3.4vw, 36px);
          font-weight: 800; letter-spacing: -1.1px; line-height: 1.15;
          color: var(--text-hi); margin-bottom: 14px;
        }
        .an-lead { font-size: 15px; line-height: 1.65; color: var(--text-mid); }

        /* Dashboard mock frame */
        .an-dash {
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 26px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.06);
        }
        .an-dash-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }
        .an-dash-title {
          font-size: 14px; font-weight: 800; color: var(--text-hi);
          display: flex; align-items: center; gap: 8px;
        }
        .an-dash-chip {
          font-size: 11px; font-weight: 700; font-family: monospace;
          color: var(--text-low);
          border: 1px solid var(--border-subtle);
          background: var(--surface-2);
          padding: 5px 10px; border-radius: 6px;
        }
        .an-tiles {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 22px;
        }
        .an-tile {
          background: var(--bg-app);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 16px 18px;
        }
        .an-tile-label {
          font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text-low);
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 8px;
        }
        .an-tile-value {
          font-size: 24px; font-weight: 800; font-family: monospace;
          letter-spacing: -0.5px; color: var(--text-hi);
        }
        .an-tile-sub { font-size: 11px; color: var(--text-low); margin-top: 3px; }

        .an-chart-card {
          background: var(--bg-app);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 18px;
        }
        .an-chart-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px;
        }
        .an-chart-title {
          font-size: 12.5px; font-weight: 800; color: var(--text-hi);
          display: flex; align-items: center; gap: 7px;
        }
        .an-legend { display: flex; gap: 14px; font-size: 10.5px; color: var(--text-low); font-weight: 600; }
        .an-legend-dot {
          display: inline-block; width: 8px; height: 8px; border-radius: 50%;
          margin-right: 5px; vertical-align: middle;
        }

        .an-dash-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 14px;
        }

        /* Breakdown bars */
        .an-toggle {
          display: inline-flex; gap: 4px;
          background: var(--surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: 8px; padding: 3px;
        }
        .an-toggle button {
          border: none; background: transparent; cursor: pointer;
          font-size: 11px; font-weight: 700; color: var(--text-low);
          padding: 5px 12px; border-radius: 6px;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .an-toggle button.active {
          background: var(--text-hi); color: var(--bg-app);
        }
        .an-bar-row {
          display: grid;
          grid-template-columns: 92px 1fr 62px;
          gap: 10px; align-items: center;
          padding: 7px 0;
          font-size: 12px;
        }
        .an-bar-label { font-weight: 700; font-family: monospace; color: var(--text-mid); }
        .an-bar-track {
          height: 10px; background: var(--surface-2);
          border-radius: 9999px; overflow: hidden;
        }
        .an-bar-fill {
          height: 100%; border-radius: 9999px;
          background: var(--volt-500);
        }
        .an-bar-value {
          font-family: monospace; font-weight: 700; color: var(--text-hi);
          text-align: right;
        }

        /* Journal table */
        .an-journal-table {
          width: 100%; border-collapse: collapse; font-size: 12px;
        }
        .an-journal-table th {
          text-align: left; font-size: 10px; font-weight: 800;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--text-low); padding: 10px 12px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .an-journal-table td {
          padding: 11px 12px;
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-mid);
          font-family: monospace;
          white-space: nowrap;
        }
        .an-journal-table tr:last-child td { border-bottom: none; }
        .an-pill {
          font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 9999px;
        }
        .an-pill-win { background: rgba(16, 185, 129, 0.12); color: #10b981; }
        .an-pill-loss { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
        .an-pill-long { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
        .an-pill-short { background: rgba(236, 72, 153, 0.12); color: #ec4899; }

        /* Feature cards */
        .an-feature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }
        .an-feature-card {
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 28px;
          height: 100%;
        }
        .an-feature-icon {
          width: 42px; height: 42px; border-radius: 10px;
          background: var(--surface-2);
          border: 1px solid var(--border-subtle);
          display: flex; align-items: center; justify-content: center;
          color: var(--volt-500);
          margin-bottom: 16px;
        }
        .an-feature-title { font-size: 16px; font-weight: 800; color: var(--text-hi); margin-bottom: 8px; }
        .an-feature-desc { font-size: 13.5px; color: var(--text-mid); line-height: 1.65; }

        .an-final { text-align: center; padding: 100px 0; }

        @media (max-width: 960px) {
          .an-tiles { grid-template-columns: repeat(2, 1fr); }
          .an-dash-grid { grid-template-columns: 1fr; }
          .an-feature-grid { grid-template-columns: 1fr; }
          .an-section { padding: 64px 0; }
          .an-dash { padding: 16px; }
        }
      ` }} />

      <div className="an-page" style={{ paddingTop: '120px' }}>

        {/* ── HERO ── */}
        <section className="an-section" style={{ textAlign: 'center', paddingTop: '40px' }}>
          <div className="an-container">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="an-eyebrow">
                <BarChart3 size={12} />
                Performance Intelligence
              </span>
              <h1 className="an-h1">
                Analytics Dashboard.<br />
                <span className="an-accent">Know your edge, in numbers.</span>
              </h1>
              <p className="an-sub">
                Every signal, fill, and governor decision lands in a structured journal — then flows into
                equity curves, expectancy stats, session breakdowns, and gate-level attribution. Institutional
                reporting, without the spreadsheet.
              </p>
              <div className="an-ctas">
                <a href="/login?signup=true" className="an-btn-primary">
                  Start Tracking Free
                  <ArrowRight size={15} />
                </a>
                <a href="/landing/signal-engine" className="an-btn-secondary">
                  Explore the Signal Engine
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── DASHBOARD PREVIEW ── */}
        <section className="an-section">
          <div className="an-container">
            <div className="an-section-head">
              <p className="an-kicker">Live Preview</p>
              <h2 className="an-h2">Your entire trading record, one pane of glass</h2>
              <p className="an-lead">
                A representative snapshot of the dashboard — equity curve, headline statistics, and per-pair
                performance, computed from the same journal that powers the Risk Governor.
              </p>
            </div>

            <motion.div
              className="an-dash"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Toolbar */}
              <div className="an-dash-toolbar">
                <div className="an-dash-title">
                  <PieChart size={15} style={{ color: 'var(--volt-500)' }} />
                  Performance Overview
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="an-dash-chip">
                    <CalendarDays size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '5px' }} />
                    Last 90 days
                  </span>
                  <span className="an-dash-chip">250 trades</span>
                  <span className="an-dash-chip">
                    <Download size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '5px' }} />
                    Export CSV
                  </span>
                </div>
              </div>

              {/* Stat tiles */}
              <div className="an-tiles">
                {STAT_TILES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div className="an-tile" key={t.label}>
                      <div className="an-tile-label">
                        <Icon size={11} style={{ color: t.accent }} />
                        {t.label}
                      </div>
                      <div className="an-tile-value">{t.value}</div>
                      <div className="an-tile-sub">{t.sub}</div>
                    </div>
                  );
                })}
              </div>

              <div className="an-dash-grid">
                {/* Equity curve */}
                <div className="an-chart-card">
                  <div className="an-chart-head">
                    <span className="an-chart-title">
                      <LineChart size={13} style={{ color: 'var(--volt-500)' }} />
                      Equity Curve
                    </span>
                    <span className="an-legend">
                      <span>
                        <span className="an-legend-dot" style={{ background: 'var(--volt-500)' }} />
                        Equity
                      </span>
                      <span>
                        <span className="an-legend-dot" style={{ background: 'var(--border-strong)' }} />
                        Baseline
                      </span>
                    </span>
                  </div>
                  <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ width: '100%', height: '190px', display: 'block' }}>
                    {/* Gridlines */}
                    {[15, 30, 45].map((y) => (
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--border-subtle)" strokeWidth="0.3" />
                    ))}
                    {/* Baseline */}
                    <line x1="0" y1="55" x2="100" y2="55" stroke="var(--border-strong)" strokeWidth="0.4" strokeDasharray="2,2" opacity="0.6" />
                    {/* Area fill */}
                    <path d={EQUITY_PATH.area} fill="var(--volt-500)" opacity="0.1" />
                    {/* Line */}
                    <path d={EQUITY_PATH.line} fill="none" stroke="var(--volt-500)" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
                    {/* End marker */}
                    <circle cx="100" cy="7" r="1.6" fill="var(--volt-500)" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-low)', fontFamily: 'monospace', marginTop: '6px' }}>
                    <span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="an-chart-card">
                  <div className="an-chart-head">
                    <span className="an-chart-title">
                      <Table2 size={13} style={{ color: 'var(--volt-500)' }} />
                      Breakdown
                    </span>
                    <div className="an-toggle">
                      <button className={breakdown === 'pairs' ? 'active' : ''} onClick={() => setBreakdown('pairs')}>
                        By Pair
                      </button>
                      <button className={breakdown === 'sessions' ? 'active' : ''} onClick={() => setBreakdown('sessions')}>
                        By Session
                      </button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {breakdown === 'pairs' ? (
                      <motion.div
                        key="pairs"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {PAIR_ROWS.map((row) => (
                          <div className="an-bar-row" key={row.pair}>
                            <span className="an-bar-label">{row.pair}</span>
                            <div className="an-bar-track">
                              <div className="an-bar-fill" style={{ width: `${row.width}%` }} />
                            </div>
                            <span className="an-bar-value">+{row.netR.toFixed(1)}R</span>
                          </div>
                        ))}
                        <p style={{ fontSize: '10.5px', color: 'var(--text-low)', marginTop: '10px' }}>
                          Net R by symbol · trailing 90 days
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="sessions"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {SESSION_ROWS.map((row) => (
                          <div className="an-bar-row" key={row.session} style={{ gridTemplateColumns: '112px 1fr 62px' }}>
                            <span className="an-bar-label" style={{ fontSize: '11px' }}>{row.session}</span>
                            <div className="an-bar-track">
                              <div className="an-bar-fill" style={{ width: `${row.winRate}%` }} />
                            </div>
                            <span className="an-bar-value">{row.expectancy}</span>
                          </div>
                        ))}
                        <p style={{ fontSize: '10.5px', color: 'var(--text-low)', marginTop: '10px' }}>
                          Bar = win rate · value = expectancy per trade
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── GATE ATTRIBUTION ── */}
        <section className="an-section">
          <div className="an-container">
            <div className="an-section-head">
              <p className="an-kicker">Gate Attribution</p>
              <h2 className="an-h2">Which of the 12 gates actually carry your P&amp;L?</h2>
              <p className="an-lead">
                Every journal entry stores the per-gate score at execution. Attribution analysis correlates
                gate readings with realized R — showing which filters are pulling weight in your market mix
                and which conditions you should stop trading against.
              </p>
            </div>

            <div className="an-chart-card" style={{ background: 'var(--surface-1)', padding: '26px' }}>
              <div className="an-chart-head" style={{ marginBottom: '18px' }}>
                <span className="an-chart-title">
                  <Layers size={13} style={{ color: 'var(--volt-500)' }} />
                  Winner correlation by gate · trailing 250 trades
                </span>
              </div>
              {GATE_ATTRIBUTION.map((g, i) => (
                <motion.div
                  className="an-bar-row"
                  key={g.gate}
                  style={{ gridTemplateColumns: '190px 1fr 48px' }}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <span className="an-bar-label" style={{ fontSize: '11.5px' }}>{g.gate}</span>
                  <div className="an-bar-track" style={{ height: '12px' }}>
                    <motion.div
                      className="an-bar-fill"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(g.score / maxGate) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="an-bar-value">{g.score}</span>
                </motion.div>
              ))}
              <p style={{ fontSize: '11px', color: 'var(--text-low)', marginTop: '12px' }}>
                Score = normalized correlation between gate pass-strength and realized trade outcome. Representative sample.
              </p>
            </div>
          </div>
        </section>

        {/* ── JOURNAL ── */}
        <section className="an-section">
          <div className="an-container">
            <div className="an-section-head">
              <p className="an-kicker">Trade Journal</p>
              <h2 className="an-h2">A journal that writes itself</h2>
              <p className="an-lead">
                Entry, exit, signal grade, gates passed, session, and governor state — captured automatically
                on every execution. Nothing to type, nothing to forget.
              </p>
            </div>

            <div className="an-chart-card" style={{ background: 'var(--surface-1)', padding: '10px', overflowX: 'auto' }}>
              <table className="an-journal-table">
                <thead>
                  <tr>
                    <th>Signal ID</th>
                    <th>Pair</th>
                    <th>Direction</th>
                    <th>Grade</th>
                    <th>Gates</th>
                    <th>Session</th>
                    <th>Result</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {JOURNAL_ROWS.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td style={{ color: 'var(--text-hi)', fontWeight: 700 }}>{row.pair}</td>
                      <td>
                        <span className={`an-pill ${row.dir === 'LONG' ? 'an-pill-long' : 'an-pill-short'}`}>
                          {row.dir}
                        </span>
                      </td>
                      <td>{row.grade}</td>
                      <td>{row.gates}</td>
                      <td>{row.session}</td>
                      <td>
                        <span className={`an-pill ${row.result === 'win' ? 'an-pill-win' : 'an-pill-loss'}`}>
                          {row.result.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ color: row.rr.startsWith('+') ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {row.rr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="an-section">
          <div className="an-container">
            <div className="an-section-head">
              <p className="an-kicker">Capabilities</p>
              <h2 className="an-h2">Built for review, not just record-keeping</h2>
            </div>
            <div className="an-feature-grid">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                  >
                    <TiltCard className="an-feature-card">
                      <div className="an-feature-icon"><Icon size={19} /></div>
                      <h3 className="an-feature-title">{f.title}</h3>
                      <p className="an-feature-desc">{f.desc}</p>
                    </TiltCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="an-final">
          <div className="an-container">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="an-eyebrow">
                <CheckCircle2 size={12} />
                Every Trade Accounted For
              </span>
              <h2 className="an-h2" style={{ maxWidth: '620px', margin: '0 auto 14px auto' }}>
                Stop guessing whether you have an edge. Measure it.
              </h2>
              <p className="an-sub">
                The Analytics Dashboard is included on every HeroPips plan and starts recording from your very
                first validated signal.
              </p>
              <div className="an-ctas">
                <a href="/login?signup=true" className="an-btn-primary">
                  Create Your Account
                  <ArrowRight size={15} />
                </a>
                <a href="/landing/signal-engine" className="an-btn-secondary">
                  <TrendingUp size={14} />
                  See the 12-Gate Engine
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}
