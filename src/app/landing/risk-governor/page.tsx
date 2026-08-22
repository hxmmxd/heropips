'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldAlert, TrendingDown, Activity,
  ArrowRight, Lock, AlertTriangle, XOctagon, RefreshCw, Layers,
  Scale, Timer, CheckCircle2,
} from 'lucide-react';
import TiltCard from '../TiltCard';

// ---------------------------------------------------------
// STATIC DATA
// ---------------------------------------------------------

const ECP_STATES = [
  {
    key: 'GREEN',
    label: 'GREEN — Full Deployment',
    icon: ShieldCheck,
    accent: '#10b981',
    condition: 'Equity above both the 20-trade EMA and 50-trade SMA.',
    behavior:
      'Strategy performance is trending. Full Kelly-derived sizing is deployed and every qualifying signal routes to live execution.',
    multiplier: '1.00×',
  },
  {
    key: 'AMBER',
    label: 'AMBER — Reduced Exposure',
    icon: ShieldAlert,
    accent: '#f59e0b',
    condition: 'Equity below the fast EMA but still above the slow SMA.',
    behavior:
      'Performance drift detected. Position sizing is cut to 50% while the governor waits for the equity curve to re-cross its fast filter.',
    multiplier: '0.50×',
  },
  {
    key: 'RED',
    label: 'RED — Shadow Portfolio',
    icon: XOctagon,
    accent: '#ef4444',
    condition: 'Equity below the 50-trade SMA. Strategy edge is in question.',
    behavior:
      'Live routing halts entirely. Signals continue as phantom trades in a shadow portfolio; real orders resume only after simulated recovery.',
    multiplier: '0.00×',
  },
];

const DLCB_TIERS = [
  {
    threshold: '−3.0%',
    name: 'Caution Tier',
    icon: AlertTriangle,
    accent: '#f59e0b',
    detail: 'Sizing on all new entries slashed to 50%. Stop-losses tightened by 20% to compress remaining daily risk.',
  },
  {
    threshold: '−4.5%',
    name: 'Warning Tier',
    icon: ShieldAlert,
    accent: '#f97316',
    detail: 'New trade routing blocked for the session. Open position stops migrate to break-even where structure allows.',
  },
  {
    threshold: '−6.0%',
    name: 'Terminal Tier',
    icon: XOctagon,
    accent: '#ef4444',
    detail: 'The Sentinel kill-switch flattens every open position and locks the account until the next trading day.',
  },
];

const STREAK_STEPS = [
  { losses: '0–3', mult: '1.00×', note: 'Normal variance. No throttle applied.' },
  { losses: '4', mult: '0.75×', note: 'First throttle step engages.' },
  { losses: '5', mult: '0.50×', note: 'Sizing halved while streak persists.' },
  { losses: '6', mult: '0.25×', note: 'Quarter-size probing trades only.' },
  { losses: '7+', mult: '0.00×', note: 'Routing paused pending equity review.' },
];

interface DDZone {
  name: string;
  range: string;
  min: number;
  max: number;
  mult: number;
  color: string;
  desc: string;
}

const DD_ZONES: DDZone[] = [
  { name: 'GREEN', range: '0–8%', min: 0, max: 8, mult: 1.0, color: '#10b981', desc: 'Full sizing. Normal operating envelope.' },
  { name: 'YELLOW', range: '8–15%', min: 8, max: 15, mult: 0.5, color: '#f59e0b', desc: '50% sizing. Only AAA-grade setups route.' },
  { name: 'ORANGE', range: '15–20%', min: 15, max: 20, mult: 0.25, color: '#f97316', desc: '25% sizing. Manual Telegram confirmation required.' },
  { name: 'RED', range: '20–25%', min: 20, max: 25, mult: 0.1, color: '#ef4444', desc: '10% sizing. Recovery-mode probing trades only.' },
  { name: 'BLACK', range: '≥25%', min: 25, max: 100, mult: 0.0, color: '#111111', desc: 'Terminal shutdown. All routing disabled.' },
];

// ---------------------------------------------------------
// PAGE
// ---------------------------------------------------------

export default function RiskGovernorPage() {
  const [dd, setDd] = useState<number>(5);
  const [balance, setBalance] = useState<number>(25000);
  const [baseRisk, setBaseRisk] = useState<number>(1.5);

  useEffect(() => {
    document.title = 'HeroPips | Risk Governor';
  }, []);

  const zone = useMemo(
    () => DD_ZONES.find((z) => dd >= z.min && dd < z.max) ?? DD_ZONES[DD_ZONES.length - 1],
    [dd]
  );

  const effectiveRisk = useMemo(() => baseRisk * zone.mult, [baseRisk, zone]);
  const dollarRisk = useMemo(() => balance * (effectiveRisk / 100), [balance, effectiveRisk]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .rg-page {
          background: var(--bg-app);
          color: var(--text-hi);
        }
        .rg-container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .rg-section {
          padding: 88px 0;
          border-bottom: 1px solid var(--border-subtle);
        }
        .rg-eyebrow {
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
        .rg-h1 {
          font-size: clamp(34px, 5.5vw, 60px);
          font-weight: 800;
          letter-spacing: -2px;
          line-height: 1.08;
          color: var(--text-hi);
          margin-bottom: 20px;
        }
        .rg-h1 .rg-accent { color: var(--volt-500); }
        .rg-sub {
          font-size: 16.5px;
          line-height: 1.65;
          color: var(--text-mid);
          max-width: 640px;
          margin: 0 auto 32px auto;
        }
        .rg-ctas {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .rg-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--text-hi);
          color: var(--bg-app);
          font-size: 14px;
          font-weight: 700;
          padding: 13px 26px;
          border-radius: 9999px;
          text-decoration: none;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .rg-btn-primary:hover { transform: translateY(-2px); opacity: 0.9; }
        .rg-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--surface-1);
          color: var(--text-hi);
          border: 1px solid var(--border-subtle);
          font-size: 14px;
          font-weight: 600;
          padding: 13px 24px;
          border-radius: 9999px;
          text-decoration: none;
          transition: background 0.15s ease;
        }
        .rg-btn-secondary:hover { background: var(--surface-2); }
        .rg-section-head {
          max-width: 680px;
          margin-bottom: 48px;
        }
        .rg-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--volt-500);
          margin-bottom: 10px;
        }
        .rg-h2 {
          font-size: clamp(24px, 3.4vw, 36px);
          font-weight: 800;
          letter-spacing: -1.1px;
          line-height: 1.15;
          color: var(--text-hi);
          margin-bottom: 14px;
        }
        .rg-lead {
          font-size: 15px;
          line-height: 1.65;
          color: var(--text-mid);
        }

        /* State machine cards */
        .rg-state-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .rg-state-card {
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-top: 3px solid var(--rg-accent);
          border-radius: 14px;
          padding: 26px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .rg-state-title {
          font-size: 15.5px;
          font-weight: 800;
          color: var(--text-hi);
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 14px;
        }
        .rg-state-cond {
          font-size: 12px;
          font-weight: 700;
          font-family: monospace;
          color: var(--rg-accent);
          background: var(--surface-2);
          border-radius: 6px;
          padding: 7px 10px;
          margin-bottom: 14px;
          line-height: 1.5;
        }
        .rg-state-desc {
          font-size: 13.5px;
          color: var(--text-mid);
          line-height: 1.6;
          flex-grow: 1;
        }
        .rg-state-mult {
          margin-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px dashed var(--border-subtle);
          padding-top: 12px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-low);
        }
        .rg-state-mult strong {
          font-family: monospace;
          font-size: 16px;
          color: var(--rg-accent);
        }

        /* Interactive visualizer */
        .rg-viz-panel {
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 32px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }
        .rg-slider-label {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-mid);
          margin-bottom: 8px;
        }
        .rg-slider-label span:last-child {
          font-family: monospace;
          color: var(--text-hi);
        }
        .rg-range {
          width: 100%;
          accent-color: var(--volt-500);
          cursor: pointer;
        }
        .rg-form-group { margin-bottom: 22px; }
        .rg-zone-track {
          display: flex;
          height: 14px;
          border-radius: 9999px;
          overflow: hidden;
          margin: 18px 0 8px 0;
          border: 1px solid var(--border-subtle);
        }
        .rg-zone-seg { height: 100%; transition: opacity 0.2s ease; }
        .rg-zone-ticks {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 700;
          font-family: monospace;
          color: var(--text-low);
        }
        .rg-readout {
          background: var(--surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 24px;
        }
        .rg-readout-zone {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          margin-bottom: 6px;
        }
        .rg-readout-big {
          font-size: 40px;
          font-weight: 800;
          font-family: monospace;
          letter-spacing: -1px;
          color: var(--text-hi);
          line-height: 1.1;
        }
        .rg-readout-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 13px;
        }
        .rg-readout-row:last-child { border-bottom: none; }
        .rg-readout-row span:first-child { color: var(--text-low); }
        .rg-readout-row span:last-child {
          font-weight: 700;
          font-family: monospace;
          color: var(--text-hi);
        }
        .rg-zone-desc-line {
          font-size: 12.5px;
          color: var(--text-mid);
          line-height: 1.55;
          margin-top: 14px;
        }

        /* Circuit breaker tiers */
        .rg-tier-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .rg-tier-row {
          display: grid;
          grid-template-columns: 110px 1fr;
          gap: 20px;
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-left: 4px solid var(--rg-accent);
          border-radius: 12px;
          padding: 20px 24px;
          align-items: center;
        }
        .rg-tier-threshold {
          font-family: monospace;
          font-size: 22px;
          font-weight: 800;
          color: var(--rg-accent);
        }
        .rg-tier-name {
          font-size: 14px;
          font-weight: 800;
          color: var(--text-hi);
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .rg-tier-detail {
          font-size: 13px;
          color: var(--text-mid);
          line-height: 1.55;
        }

        /* Streak table */
        .rg-streak-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          overflow: hidden;
          font-size: 13px;
        }
        .rg-streak-table th {
          text-align: left;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-low);
          background: var(--surface-2);
          padding: 12px 18px;
        }
        .rg-streak-table td {
          padding: 13px 18px;
          border-top: 1px solid var(--border-subtle);
          color: var(--text-mid);
        }
        .rg-streak-table td.rg-mono {
          font-family: monospace;
          font-weight: 700;
          color: var(--text-hi);
        }

        /* Kelly cards */
        .rg-kelly-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .rg-kelly-card {
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 26px;
          height: 100%;
        }
        .rg-kelly-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--surface-2);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--volt-500);
          margin-bottom: 16px;
        }
        .rg-kelly-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-hi);
          margin-bottom: 8px;
        }
        .rg-kelly-desc {
          font-size: 13.5px;
          color: var(--text-mid);
          line-height: 1.6;
        }
        .rg-formula {
          font-family: monospace;
          font-size: 12px;
          font-weight: 700;
          color: var(--volt-500);
          background: var(--surface-2);
          border: 1px dashed var(--border-subtle);
          padding: 8px 12px;
          border-radius: 8px;
          display: inline-block;
          margin-top: 14px;
        }

        /* Final CTA */
        .rg-final {
          text-align: center;
          padding: 100px 0;
        }

        @media (max-width: 960px) {
          .rg-state-grid, .rg-kelly-grid { grid-template-columns: 1fr; }
          .rg-viz-panel { grid-template-columns: 1fr; padding: 22px; }
          .rg-tier-row { grid-template-columns: 1fr; gap: 8px; }
          .rg-section { padding: 64px 0; }
        }
      ` }} />

      <div className="rg-page" style={{ paddingTop: '120px' }}>

        {/* ── HERO ── */}
        <section className="rg-section" style={{ textAlign: 'center', paddingTop: '40px' }}>
          <div className="rg-container">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="rg-eyebrow">
                <Shield size={12} />
                Automated Capital Defense
              </span>
              <h1 className="rg-h1">
                The Risk Governor.<br />
                <span className="rg-accent">Sizing that defends itself.</span>
              </h1>
              <p className="rg-sub">
                A three-ring risk infrastructure that sits between every validated signal and your broker —
                dynamically throttling position size against equity drift, daily loss, losing streaks, and
                maximum drawdown. No overrides. No emotion.
              </p>
              <div className="rg-ctas">
                <a href="/login?signup=true" className="rg-btn-primary">
                  Start Trading Protected
                  <ArrowRight size={15} />
                </a>
                <a href="/landing/signal-engine" className="rg-btn-secondary">
                  Explore the Signal Engine
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── ECP STATE MACHINE ── */}
        <section className="rg-section">
          <div className="rg-container">
            <div className="rg-section-head">
              <p className="rg-kicker">Ring 1 · Equity Curve Protection</p>
              <h2 className="rg-h2">A state machine watching your strategy, not just the market</h2>
              <p className="rg-lead">
                The governor treats your own equity curve as a tradable instrument. A fast 20-trade EMA and a
                slow 50-trade SMA measure whether the strategy&apos;s edge is intact — and routing behavior shifts
                automatically across three states.
              </p>
            </div>

            <div className="rg-state-grid">
              {ECP_STATES.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.key}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <TiltCard
                      className="rg-state-card"
                      style={{ '--rg-accent': s.accent } as React.CSSProperties}
                    >
                      <h3 className="rg-state-title">
                        <Icon size={18} style={{ color: s.accent }} />
                        {s.label}
                      </h3>
                      <div className="rg-state-cond">{s.condition}</div>
                      <p className="rg-state-desc">{s.behavior}</p>
                      <div className="rg-state-mult">
                        <span>SIZE MULTIPLIER</span>
                        <strong>{s.multiplier}</strong>
                      </div>
                    </TiltCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── INTERACTIVE DRAWDOWN VISUALIZER ── */}
        <section className="rg-section">
          <div className="rg-container">
            <div className="rg-section-head">
              <p className="rg-kicker">Ring 3 · Maximum Drawdown Governor</p>
              <h2 className="rg-h2">Drawdown zone visualizer</h2>
              <p className="rg-lead">
                Drag the drawdown slider to see exactly how the governor graduates position size across its
                five protection zones — the same throttling table running in production.
              </p>
            </div>

            <div className="rg-viz-panel">
              {/* Controls */}
              <div>
                <div className="rg-form-group">
                  <label className="rg-slider-label">
                    <span>Account Balance</span>
                    <span>${balance.toLocaleString()}</span>
                  </label>
                  <input
                    type="range"
                    className="rg-range"
                    min={5000}
                    max={200000}
                    step={5000}
                    value={balance}
                    onChange={(e) => setBalance(Number(e.target.value))}
                  />
                </div>

                <div className="rg-form-group">
                  <label className="rg-slider-label">
                    <span>Base Risk Per Trade</span>
                    <span>{baseRisk.toFixed(1)}%</span>
                  </label>
                  <input
                    type="range"
                    className="rg-range"
                    min={0.5}
                    max={3.0}
                    step={0.1}
                    value={baseRisk}
                    onChange={(e) => setBaseRisk(Number(e.target.value))}
                  />
                </div>

                <div className="rg-form-group" style={{ marginBottom: 0 }}>
                  <label className="rg-slider-label">
                    <span>Current Peak-to-Trough Drawdown</span>
                    <span>{dd.toFixed(1)}%</span>
                  </label>
                  <input
                    type="range"
                    className="rg-range"
                    min={0}
                    max={30}
                    step={0.5}
                    value={dd}
                    onChange={(e) => setDd(Number(e.target.value))}
                  />

                  {/* Zone track */}
                  <div className="rg-zone-track">
                    {DD_ZONES.map((z) => {
                      const width = ((Math.min(z.max, 30) - z.min) / 30) * 100;
                      return (
                        <div
                          key={z.name}
                          className="rg-zone-seg"
                          style={{
                            width: `${width}%`,
                            background: z.color,
                            opacity: zone.name === z.name ? 1 : 0.25,
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="rg-zone-ticks">
                    <span>0%</span>
                    <span>8%</span>
                    <span>15%</span>
                    <span>20%</span>
                    <span>25%</span>
                    <span>30%</span>
                  </div>
                </div>
              </div>

              {/* Readout */}
              <div className="rg-readout">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={zone.name}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="rg-readout-zone" style={{ color: zone.color === '#111111' ? 'var(--text-hi)' : zone.color }}>
                      ZONE: {zone.name} ({zone.range})
                    </div>
                    <div className="rg-readout-big">
                      {(effectiveRisk).toFixed(2)}%
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-low)', marginBottom: '18px' }}>
                      effective risk routed per trade
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div>
                  <div className="rg-readout-row">
                    <span>Base risk</span>
                    <span>{baseRisk.toFixed(2)}%</span>
                  </div>
                  <div className="rg-readout-row">
                    <span>Zone multiplier</span>
                    <span>{zone.mult.toFixed(2)}×</span>
                  </div>
                  <div className="rg-readout-row">
                    <span>Dollar risk on next trade</span>
                    <span>${dollarRisk.toFixed(2)}</span>
                  </div>
                  <div className="rg-readout-row">
                    <span>Routing status</span>
                    <span style={{ color: zone.mult === 0 ? '#ef4444' : '#10b981' }}>
                      {zone.mult === 0 ? 'HALTED' : 'ACTIVE'}
                    </span>
                  </div>
                </div>

                <p className="rg-zone-desc-line">
                  <strong style={{ color: 'var(--text-hi)' }}>{zone.name}:</strong> {zone.desc}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── DAILY LOSS CIRCUIT BREAKER ── */}
        <section className="rg-section">
          <div className="rg-container">
            <div className="rg-section-head">
              <p className="rg-kicker">Ring 2 · Daily Loss Circuit Breaker</p>
              <h2 className="rg-h2">Three breaker tiers between a bad day and a blown account</h2>
              <p className="rg-lead">
                Modeled on exchange circuit breakers, the DLCB measures realized intraday loss against equity
                at the daily open and escalates through three hard tiers. The Sentinel watchdog polls open
                terminals every 10 seconds to enforce them.
              </p>
            </div>

            <div className="rg-tier-list">
              {DLCB_TIERS.map((t, i) => {
                const Icon = t.icon;
                return (
                  <motion.div
                    key={t.name}
                    className="rg-tier-row"
                    style={{ '--rg-accent': t.accent } as React.CSSProperties}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                  >
                    <div className="rg-tier-threshold">{t.threshold}</div>
                    <div>
                      <div className="rg-tier-name">
                        <Icon size={15} style={{ color: t.accent }} />
                        {t.name}
                      </div>
                      <p className="rg-tier-detail">{t.detail}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Streak throttle */}
            <div style={{ marginTop: '56px' }}>
              <div className="rg-section-head" style={{ marginBottom: '24px' }}>
                <p className="rg-kicker">Consecutive-Loss Streak Throttle</p>
                <p className="rg-lead">
                  Losing streaks are where discretionary traders double down. The governor does the opposite —
                  size steps down mechanically with each consecutive loss, independent of the daily breaker.
                </p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="rg-streak-table">
                  <thead>
                    <tr>
                      <th>Consecutive Losses</th>
                      <th>Size Multiplier</th>
                      <th>Governor Behavior</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STREAK_STEPS.map((row) => (
                      <tr key={row.losses}>
                        <td className="rg-mono">{row.losses}</td>
                        <td className="rg-mono">{row.mult}</td>
                        <td>{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ── KELLY SIZING ── */}
        <section className="rg-section">
          <div className="rg-container">
            <div className="rg-section-head">
              <p className="rg-kicker">Dynamic Position Sizing</p>
              <h2 className="rg-h2">Fractional Kelly, compounded with every defense layer</h2>
              <p className="rg-lead">
                Base risk is derived from a fractional Kelly criterion over the trailing signal sample, then
                multiplied through every active governor state. The most conservative layer always wins.
              </p>
            </div>

            <div className="rg-kelly-grid">
              <TiltCard className="rg-kelly-card">
                <div className="rg-kelly-icon"><Scale size={19} /></div>
                <h3 className="rg-kelly-title">Kelly-Derived Base Fraction</h3>
                <p className="rg-kelly-desc">
                  Win rate and average reward:risk over the trailing 100 validated signals feed a quarter-Kelly
                  base — capturing most of the geometric growth with a fraction of the variance.
                </p>
                <span className="rg-formula">f* = (p·b − q) / b · 0.25</span>
              </TiltCard>

              <TiltCard className="rg-kelly-card">
                <div className="rg-kelly-icon"><Layers size={19} /></div>
                <h3 className="rg-kelly-title">Multiplicative Composition</h3>
                <p className="rg-kelly-desc">
                  ECP state, daily breaker tier, streak throttle, and drawdown zone each contribute an
                  independent multiplier. One RED state anywhere in the chain zeroes routing entirely.
                </p>
                <span className="rg-formula">risk = base × ECP × DLCB × streak × MDG</span>
              </TiltCard>

              <TiltCard className="rg-kelly-card">
                <div className="rg-kelly-icon"><RefreshCw size={19} /></div>
                <h3 className="rg-kelly-title">Anti-Martingale Recovery</h3>
                <p className="rg-kelly-desc">
                  Coming out of a drawdown, size is rebuilt gradually — each consecutive win from the trough
                  restores 20% of full sizing. Losses never increase size. Ever.
                </p>
                <span className="rg-formula">recovery = min(1, wins / 5)</span>
              </TiltCard>
            </div>
          </div>
        </section>

        {/* ── WHY IT MATTERS ── */}
        <section className="rg-section">
          <div className="rg-container">
            <div className="rg-section-head">
              <p className="rg-kicker">Built for funded accounts</p>
              <h2 className="rg-h2">Prop-firm rules, enforced by software</h2>
            </div>
            <div className="rg-kelly-grid">
              <div className="rg-kelly-card">
                <div className="rg-kelly-icon"><Lock size={19} /></div>
                <h3 className="rg-kelly-title">Daily Loss Compliance</h3>
                <p className="rg-kelly-desc">
                  Configure the breaker tiers below your prop firm&apos;s daily limit and the Sentinel closes
                  positions before a violation can occur — even if the terminal is unattended.
                </p>
              </div>
              <div className="rg-kelly-card">
                <div className="rg-kelly-icon"><TrendingDown size={19} /></div>
                <h3 className="rg-kelly-title">Max Drawdown Compliance</h3>
                <p className="rg-kelly-desc">
                  The zone governor keeps trailing drawdown well inside challenge thresholds by cutting size
                  long before the account approaches its hard limit.
                </p>
              </div>
              <div className="rg-kelly-card">
                <div className="rg-kelly-icon"><Timer size={19} /></div>
                <h3 className="rg-kelly-title">10-Second Enforcement Loop</h3>
                <p className="rg-kelly-desc">
                  The Sentinel background watchdog re-checks every open terminal on a 10-second cycle, with an
                  average kill-switch execution under 2.5 seconds.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="rg-final">
          <div className="rg-container">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="rg-eyebrow">
                <CheckCircle2 size={12} />
                Zero-Override Discipline
              </span>
              <h2 className="rg-h2" style={{ maxWidth: '620px', margin: '0 auto 14px auto' }}>
                Let the governor make the hard calls, so you never have to.
              </h2>
              <p className="rg-sub">
                Every HeroPips plan ships with the full Risk Governor stack — equity curve protection, circuit
                breakers, streak throttling, and drawdown governance — active from your first trade.
              </p>
              <div className="rg-ctas">
                <a href="/login?signup=true" className="rg-btn-primary">
                  Create Your Account
                  <ArrowRight size={15} />
                </a>
                <a href="/landing/signal-engine" className="rg-btn-secondary">
                  <Activity size={14} />
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
