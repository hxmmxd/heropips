'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '../Navbar';
import TiltCard from '../TiltCard';

const GATES = [
  { num: '01', name: 'Vol Regime Filter', desc: 'ATR & GARCH model volatility regime detection. Restricts trading in highly erratic market states.', formula: 'σ = ATR(14)', glow: 'rgba(255, 60, 0, 0.08)', accent: '#ff3c00' },
  { num: '02', name: 'Order Flow Imbalance', desc: 'L2/L3 order book bid-ask imbalance analysis to verify real institutional buying or selling pressure.', formula: 'L2_Imb > 0.65', glow: 'rgba(6, 182, 212, 0.08)', accent: '#0891b2' },
  { num: '03', name: 'Liquidity Sweeps', desc: 'Identifies stop-runs and high-volume clusters to avoid bad entries at local swing extremes.', formula: 'stop_run()', glow: 'rgba(99, 102, 241, 0.08)', accent: '#6366f1' },
  { num: '04', name: 'Macro Sentiment Bias', desc: 'Real-time NLP parsing of major financial news streams and headlines for fundamental bias alignment.', formula: 'NLP_BIAS > 0.70', glow: 'rgba(236, 72, 153, 0.08)', accent: '#ec4899' },
  { num: '05', name: 'Multi-Timeframe Align', desc: 'Confluence checks across M15, H1, H4, and D1 to ensure entries trade with the dominant macro direction.', formula: 'M15 ⋔ D1', glow: 'rgba(16, 185, 129, 0.08)', accent: '#10b981' },
  { num: '06', name: 'Correlation Matrix', desc: 'Ensures the target asset is not trading in conflict with broader index and currency baskets.', formula: 'P_VAL < 0.05', glow: 'rgba(139, 92, 246, 0.08)', accent: '#8b5cf6' },
  { num: '07', name: 'Volume Profile Node', desc: 'Verification of trading near high-volume nodes (POC) to confirm floor support or ceiling resistance.', formula: 'POC_SUPPORT', glow: 'rgba(245, 158, 11, 0.08)', accent: '#d97706' },
  { num: '08', name: 'Funding Rate Check', desc: 'Derivative leverage bias check to guard against retail liquidation cascades and funding squeezes.', formula: 'FUT_PREM > 0', glow: 'rgba(20, 184, 166, 0.08)', accent: '#14b8a6' },
  { num: '09', name: 'Mean Reversion Bands', desc: 'Bollinger/Keltner deviation and Z-score validation to prevent chasing extended, overbought runs.', formula: 'Z_SCORE > 2.0', glow: 'rgba(59, 130, 246, 0.08)', accent: '#3b82f6' },
  { num: '10', name: 'Spread Arbitrage', desc: 'Cross-exchange spread and slippage cost analysis to optimize entry pricing and minimize entry friction.', formula: 'spread < 0.15%', glow: 'rgba(244, 63, 94, 0.08)', accent: '#f43f5e' },
  { num: '11', name: 'Trend Velocity (ADX)', desc: 'Trend momentum decay and velocity checks using an advanced directional movement index stack.', formula: 'dx/dt > 0', glow: 'rgba(168, 85, 247, 0.08)', accent: '#a855f7' },
  { num: '12', name: 'Risk-Reward Cutoff', desc: 'Automatic rejection of signals with less than a strict, mathematically sound 1:2 risk-to-reward ratio.', formula: 'R:R ≥ 1:2', glow: 'rgba(255, 60, 0, 0.08)', accent: '#ff3c00' },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const, // easeOutExpo
    },
  },
};

export default function SignalEnginePage() {
  useEffect(() => {
    document.title = "XyroTrade | AI Signal Engine";
  }, []);

  return (
    <>
      <Navbar />

      <section className="lp-gates" style={{ minHeight: 'calc(100vh - 80px)', padding: '140px 24px 100px 24px' }}>
        <div className="lp-gates-inner">
          <motion.div 
            className="lp-gates-header"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <p className="lp-gates-eyebrow">CONFLUENCE PIPELINE</p>
            <h2 className="lp-gates-title">The 12-Gate Validation Engine</h2>
            <p className="lp-gates-desc">
              Every single signal must pass all 12 quantitative checks before execution. Rejects retail noise, executes on institutional probability.
            </p>
          </motion.div>
          
          {/* Unified 12-Gates Grid Box Container */}
          <motion.div 
            className="lp-gates-box"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const, delay: 0.15 }}
          >
            {/* Corner dot crosshairs */}
            <div className="lp-grid-dot dot-tl" />
            <div className="lp-grid-dot dot-tr" />
            <div className="lp-grid-dot dot-bl" />
            <div className="lp-grid-dot dot-br" />

            <motion.div 
              className="lp-gates-grid"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {GATES.map((gate, i) => (
                <motion.div 
                  key={i} 
                  variants={fadeInUp}
                >
                  <TiltCard
                    className="lp-gate-card"
                    style={{ 
                      '--gate-glow': gate.glow,
                      '--gate-accent': gate.accent
                    } as React.CSSProperties}
                  >
                    <div className="lp-gate-card-header">
                      <span className="lp-gate-num">Gate {gate.num}</span>
                      <span className="lp-gate-formula">{gate.formula}</span>
                      <span className="lp-gate-status">
                        <span className="lp-gate-status-dot"></span>
                        Active
                      </span>
                    </div>
                    <h3 className="lp-gate-name">{gate.name}</h3>
                    <p className="lp-gate-desc-text">{gate.desc}</p>
                  </TiltCard>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
