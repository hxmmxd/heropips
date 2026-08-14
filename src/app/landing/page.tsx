'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import TiltCard from './TiltCard';
import { ArrowRight, HelpCircle, ChevronDown, Mail } from 'lucide-react';



/* ── Stats data ──────────────────────────────────────────── */
const STATS = [
  { to: 4,   prefix: '',  suffix: '',  label: 'Markets',          desc: 'Global asset coverage',   raw: false },
  { to: 18,  prefix: '',  suffix: '',  label: 'AI Models',        desc: 'Proprietary signal stack', raw: false },
  { to: 12,  prefix: '',  suffix: '',  label: 'Analysis Engines', desc: '12-gate validation',       raw: false },
  { to: 3,   prefix: '<', suffix: 's', label: 'Analysis Time',    desc: 'Per signal, live',         raw: false },
  { to: 0,   prefix: '',  suffix: '',  label: 'Monitoring',       desc: 'Always-on coverage',       raw: true,  rawVal: '24/7' },
  { to: 0,   prefix: '',  suffix: '',  label: 'Uptime',           desc: 'Guaranteed reliability',   raw: true,  rawVal: '99.9%' },
];






/* ── Animated counter ────────────────────────────────────── */
function Counter({
  to, prefix = '', suffix = '', duration = 1600,
}: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const spanRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);   // ease-out cubic
            setCount(Math.floor(eased * to));
            if (p < 1) requestAnimationFrame(tick);
            else setCount(to);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);

  return <span ref={spanRef}>{prefix}{count}{suffix}</span>;

}

function NarrativeSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const viewHeight = window.innerHeight;

      // Calculate how far the section has scrolled relative to the viewport entry
      const scrolled = viewHeight - rect.top;

      if (scrolled > 0 && rect.bottom > 0) {
        // Slow float up for the box (clamped to prevent overlapping stats section), slow drift for the glow background
        const boxTranslate = Math.max(scrolled * -0.04, -32);
        const glowTranslate = Math.min(scrolled * 0.03, 40);
        el.style.setProperty('--narrative-box-translate', `${boxTranslate}px`);
        el.style.setProperty('--narrative-glow-translate', `${glowTranslate}px`);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="lp-narrative" ref={containerRef}>
      {/* Parallax background radial glow */}
      <div className="lp-narrative-bg-glow" />

      <div className="lp-struct-container">
        {/* Horizontal Bounding Lines */}
        <div className="lp-struct-h-line top" />
        <div className="lp-struct-h-line bottom" />
        <div className="lp-struct-v-line left" />
        <div className="lp-struct-v-line right" />
        <div className="lp-struct-crosshair top left" />
        <div className="lp-struct-crosshair top right" />
        <div className="lp-struct-crosshair bottom left" />
        <div className="lp-struct-crosshair bottom right" />

        <motion.div 
          className="lp-narrative-inner"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
      >
        
        {/* Main Grid Box */}
        <div className="lp-narrative-box">
          {/* Outer corner dots */}
          <div className="lp-grid-dot dot-tl" />
          <div className="lp-grid-dot dot-tr" />
          <div className="lp-grid-dot dot-bl" />
          <div className="lp-grid-dot dot-br" />

          {/* Left Column: Wording & CTA & Quant Panel */}
          <div className="lp-narrative-intro-col">
            <div className="lp-noise-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
                <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <span>NOISE VS DATA</span>
            </div>
            
            <h2 className="lp-narrative-main-title">
              Trading isn't difficult.<br />
              <span className="lp-narrative-main-highlight">Filtering noise is.</span>
            </h2>
            
            <p className="lp-narrative-main-desc">
              Every day, retail terminals bombard you with thousands of conflicting data points. Under pressure, execution defaults to impulse.
            </p>
            
            <a href="#" className="lp-narrative-cta-btn">
              See the 12 Gates
            </a>
          </div>

          {/* Right Column: Built-in 2x2 Grid of Bad Cases */}
          <div className="lp-narrative-grid-col">
            
            {/* Card 1: Twitter */}
            <TiltCard 
              className="lp-noise-card-cell c-span-2"
              style={{ '--hover-glow': 'rgba(5, 150, 105, 0.05)' } as React.CSSProperties}
            >
              <div className="lp-grid-dot dot-tl" />
              <span className="lp-noise-card-label">01 / SENTIMENT FEED</span>
              <h3 className="lp-noise-card-title">
                <img src="https://www.google.com/s2/favicons?sz=64&domain=twitter.com" alt="" className="lp-noise-favicon" />
                Twitter says <span className="lp-badge-buy">BUY.</span>
              </h3>
              <p className="lp-noise-card-desc">Social sentiment spikes on retail FOMO, urging immediate market entry without confirmation.</p>
            </TiltCard>

            {/* Card 2: YouTube */}
            <TiltCard 
              className="lp-noise-card-cell c-span-2"
              style={{ '--hover-glow': 'rgba(180, 83, 9, 0.05)' } as React.CSSProperties}
            >
              <div className="lp-grid-dot dot-tl" />
              <span className="lp-noise-card-label">02 / VIDEO MEDIA</span>
              <h3 className="lp-noise-card-title">
                <img src="https://www.google.com/s2/favicons?sz=64&domain=youtube.com" alt="" className="lp-noise-favicon" />
                YouTube says <span className="lp-badge-hold">HOLD.</span>
              </h3>
              <p className="lp-noise-card-desc">Influencers preach long-term patience while hedging their own short-term exposures.</p>
            </TiltCard>

            {/* Card 3: Indicators */}
            <TiltCard 
              className="lp-noise-card-cell c-span-2"
              style={{ '--hover-glow': 'rgba(109, 40, 217, 0.05)' } as React.CSSProperties}
            >
              <div className="lp-grid-dot dot-tl" />
              <span className="lp-noise-card-label">03 / MATH MODELLING</span>
              <h3 className="lp-noise-card-title">
                <img src="https://www.google.com/s2/favicons?sz=64&domain=tradingview.com" alt="" className="lp-noise-favicon" />
                Indicators <span className="lp-badge-disagree">disagree.</span>
              </h3>
              <p className="lp-noise-card-desc">RSI signals oversold, MACD shows bearish divergence, and moving averages suggest a breakdown.</p>
            </TiltCard>

            {/* Card 4: News */}
            <TiltCard 
              className="lp-noise-card-cell c-span-3"
              style={{ '--hover-glow': 'rgba(29, 78, 216, 0.05)' } as React.CSSProperties}
            >
              <div className="lp-grid-dot dot-tl" />
              <span className="lp-noise-card-label">04 / MACRO DATA</span>
              <h3 className="lp-noise-card-title">
                <img src="https://www.google.com/s2/favicons?sz=64&domain=bloomberg.com" alt="" className="lp-noise-favicon" />
                News changes <span className="lp-badge-everything">everything.</span>
              </h3>
              <p className="lp-noise-card-desc">Breaking macroeconomic data or regulatory updates instantly invalidate hours of technical analysis.</p>
            </TiltCard>

            {/* Card 5: Fear */}
            <TiltCard 
              className="lp-noise-card-cell c-span-3"
              style={{ '--hover-glow': 'rgba(185, 28, 28, 0.05)' } as React.CSSProperties}
            >
              <div className="lp-grid-dot dot-tl" />
              <span className="lp-noise-card-label">05 / HUMAN BIAS</span>
              <h3 className="lp-noise-card-title">
                <img src="https://www.google.com/s2/favicons?sz=64&domain=wsj.com" alt="" className="lp-noise-favicon" />
                Fear <span className="lp-badge-wins">wins.</span>
              </h3>
              <p className="lp-noise-card-desc">Faced with conflicting inputs, emotional traders panic, exit positions prematurely, or freeze entirely.</p>
            </TiltCard>

          </div>

          {/* Integrated Bottom Solution Row */}
          <div className="lp-narrative-solution-row">
            <div className="lp-grid-dot dot-tl" />
            <div className="lp-grid-dot dot-tr" />
            <div className="lp-grid-dot dot-mid" />
            
            <div className="lp-sol-badge">THE HEROPIPS ENGINE</div>
            <h3 className="lp-sol-text">
              HeroPips combines everything <span className="lp-sol-highlight">before giving an answer.</span>
            </h3>
          </div>

        </div>
        </motion.div>
      </div>
    </section>
  );
}



/* ── 12-Gates Grid Section ──────────────────────────────────── */
/* ── Comparison Section (12-Gate Flow & Signal Output) ────── */
const ROW_1 = [
  { icon: '🌊', label: 'VOLATILITY', statusText: 'ATR 1.2x Stable' },
  { icon: '📊', label: 'ORDER FLOW', statusText: 'Bid Imb. 68%' },
  { icon: '💧', label: 'LIQUIDITY', statusText: 'BSL Sweep Clear' },
  { icon: '📰', label: 'NEWS FILTER', statusText: 'FOMC Clear' },
];

const ROW_2 = [
  { icon: '📶', label: 'MTF STACK', statusText: 'W1/D1/1H Aligned' },
  { icon: '🔗', label: 'CORRELATION', statusText: 'DXY Bearish Bias' },
  { icon: '🎯', label: 'VOL PROFILE', statusText: 'Inside POC Node' },
  { icon: '💸', label: 'FUNDING RATE', statusText: 'Prem <0.02%' },
];

const ROW_3 = [
  { icon: '📈', label: 'VWAP', statusText: 'Inside ±1.5σ' },
  { icon: '⚖️', label: 'SPREAD ARB', statusText: 'Slippage <0.1%' },
  { icon: '⚡', label: 'VELOCITY', statusText: 'ADX >25 Bullish' },
  { icon: '🛡️', label: 'CANDLE PATTERN', statusText: 'H1 Hammer Conf.' },
];

const TICKER_SIGNALS = [
  { action: 'BUY', symbol: 'XAU/USD', pct: '94%', price: '2341.50', rr: '2.0R', session: 'NY', buy: true },
  { action: 'SELL', symbol: 'NAS100', pct: '92%', price: '19,840', rr: '2.3R', session: 'NY', buy: false },
  { action: 'BUY', symbol: 'BTC/USD', pct: '86%', price: '67,420', rr: '1.8R', session: 'NY', buy: true },
  { action: 'BUY', symbol: 'EUR/USD', pct: '88%', price: '1.08420', rr: '2.0R', session: 'LDN', buy: true },
  { action: 'SELL', symbol: 'GBP/JPY', pct: '91%', price: '196.450', rr: '2.5R', session: 'ASI', buy: false },
  { action: 'BUY', symbol: 'US30', pct: '83%', price: '38,720', rr: '2.0R', session: 'NY', buy: true },
];

const LOGS = [
  "Confluence engine: XAU/USD breakout verified.",
  "Confluence engine: NAS100 rejection band hit.",
  "Confluence engine: BTC/USD momentum sweep confirmed.",
  "Confluence engine: EUR/USD trend stack fully aligned.",
  "Confluence engine: GBP/JPY spread arbitrage execution.",
  "Confluence engine: US30 key volume block validated."
];

const PROCESSOR_GATES = [
  { num: '01', name: 'Vol Regime Filter', desc: 'ATR volatility state', log: 'ATR: Volatility breakout band verified.' },
  { num: '02', name: 'Order Flow Imbalance', desc: 'L2 Bid-Ask depth check', log: 'L2 Depth: Bids outpacing asks (+14.2%).' },
  { num: '03', name: 'Liquidity Sweeps', desc: 'Stop-run cluster scan', log: 'Sweeps: Buy-side liquidity pool swept.' },
  { num: '04', name: 'Macro Sentiment Bias', desc: 'Financial NLP headlines', log: 'NLP: Sentiment indices tracking bullish (0.76).' },
  { num: '05', name: 'Multi-Timeframe Align', desc: 'M15/H1/Daily market stack', log: 'Timeframes: M15 & H1 trends fully stacked.' },
  { num: '06', name: 'Correlation Matrix', desc: 'Index correlation index', log: 'Matrix: Asset beta dispersion normalized.' },
  { num: '07', name: 'Volume Profile Node', desc: 'POC value support', log: 'POC: Dynamic support node holding block.' },
  { num: '08', name: 'Funding Rate Check', desc: 'Leverage liquidation guard', log: 'Funding: Liquidation threat matrix: safe.' },
  { num: '09', name: 'Mean Reversion Bands', desc: 'Z-score standard deviation', log: 'Bands: Z-score at -1.4 (oversold bounds).' },
  { num: '10', name: 'Spread Arbitrage', desc: 'Exchange slip cost check', log: 'Arbitrage: Feed spread verified < 0.1 pips.' },
  { num: '11', name: 'Trend Velocity (ADX)', desc: 'Directional momentum ADX', log: 'ADX: Momentum velocity confirmed at 32.5.' },
  { num: '12', name: 'Risk-Reward Cutoff', desc: 'R:R ratio validation', log: 'Risk-Reward: 1:2.5 minimum target cleared.' },
];

function TerminalTypingText({ log, activeGate }: { log: string, activeGate: number }) {
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    setTypedCount(0);
    if (!log) return;
    
    // We want the prefix to appear instantly, and the rest to type out.
    const colonIdx = log.indexOf(':');
    const rest = colonIdx === -1 ? log : log.substring(colonIdx + 1);
    
    const interval = setInterval(() => {
      setTypedCount(prev => {
        if (prev >= rest.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 15); // Fast 15ms per character

    return () => clearInterval(interval);
  }, [log, activeGate]);

  const colonIdx = log.indexOf(':');
  if (colonIdx === -1) {
    return <span style={{ color: '#ffffff' }}>{log.substring(0, typedCount)}</span>;
  }
  
  const prefix = log.substring(0, colonIdx + 1);
  const rest = log.substring(colonIdx + 1);
  const tagColor = activeGate < 6 ? 'var(--volt-500)' : '#0891b2';
  
  return (
    <div>
      <span style={{ color: tagColor, fontWeight: 700, marginRight: '6px' }}>{prefix}</span>
      <span style={{ color: '#ffffff' }}>
        {rest.substring(0, typedCount)}
        {/* Blinking cursor */}
        <span 
          style={{ 
            display: 'inline-block', 
            width: '6px', 
            height: '10px', 
            background: '#ffffff', 
            marginLeft: '4px',
            animation: 'blink 1s step-end infinite',
            verticalAlign: 'baseline'
          }} 
        />
      </span>
    </div>
  );
}

function ConfluenceProcessorSection() {
  const [hoveredGate, setHoveredGate] = useState<number | null>(null);
  const [activeCycleGate, setActiveCycleGate] = useState(0);
  const [chipScore, setChipScore] = useState(83);

  // Cycle the chip score to make it look active!
  useEffect(() => {
    const interval = setInterval(() => {
      setChipScore(() => Math.floor(Math.random() * (98 - 80 + 1)) + 80);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Auto-cycle active gate state when not hovering/tapping
  useEffect(() => {
    if (hoveredGate !== null) return;
    const interval = setInterval(() => {
      setActiveCycleGate((prev) => (prev + 1) % 12);
    }, 2000);
    return () => clearInterval(interval);
  }, [hoveredGate]);

  const activeGate = hoveredGate !== null ? hoveredGate : activeCycleGate;

  // Dynamic colors and shadows based on active side
  let glowColor = 'rgba(198, 255, 46, 0.05)';
  let glowBorder = 'rgba(0, 0, 0, 0.07)';
  let spinnerColor = 'rgba(198, 255, 46, 0.35)';
  let scoreColor = 'var(--volt-500)';

  if (activeGate !== null) {
    if (activeGate < 6) {
      glowColor = 'rgba(198, 255, 46, 0.14)';
      glowBorder = 'rgba(198, 255, 46, 0.3)';
      spinnerColor = 'var(--volt-500)';
    } else {
      glowColor = 'rgba(8, 145, 178, 0.14)';
      glowBorder = 'rgba(8, 145, 178, 0.3)';
      spinnerColor = '#0891b2';
      scoreColor = '#0891b2';
    }
  }

  const handleGateClick = (idx: number) => {
    if (hoveredGate === idx) {
      setHoveredGate(null);
    } else {
      setHoveredGate(idx);
    }
  };

  return (
    <section className="lp-proc-wrap">
      <div className="lp-struct-container">
        {/* Horizontal Bounding Lines */}
        <div className="lp-struct-h-line top" />
        <div className="lp-struct-h-line bottom" />
        <div className="lp-struct-v-line left" />
        <div className="lp-struct-v-line right" />
        <div className="lp-struct-crosshair top left" />
        <div className="lp-struct-crosshair top right" />
        <div className="lp-struct-crosshair bottom left" />
        <div className="lp-struct-crosshair bottom right" />

        <div className="lp-proc-inner">
        <div className="lp-proc-header">
          <p className="lp-proc-eyebrow">Real-Time Synthesis</p>
          <h2 className="lp-proc-title">The 12-Gate Confluence Processor</h2>
          <p className="lp-proc-desc">
            Hover over any quantitative gate to highlight its data stream connection. Watch the engine process inputs and calculate the live confluence probability score in real-time.
          </p>
        </div>

        {/* Microcontroller Chip at the Top Center */}
        <div 
          className="lp-proc-chip-top"
          style={{
            borderColor: glowBorder,
            boxShadow: `0 25px 50px rgba(0,0,0,0.25), 0 0 35px ${glowColor}`,
          }}
        >
          <div 
            className="lp-proc-chip-glow-bg" 
            style={{
              background: `radial-gradient(circle, ${glowColor}, transparent 70%)`
            }}
          />
          
          <div 
            className="lp-proc-chip-core"
            style={{
              boxShadow: `0 12px 24px rgba(0, 0, 0, 0.3), 0 0 15px ${glowColor} inset`
            }}
          >
            {/* Rotating core dashed ring */}
            <div 
              className="lp-proc-chip-spinner" 
              style={{
                borderColor: spinnerColor,
                animationDuration: '8s'
              }}
            />
            <span 
              className="lp-proc-chip-score"
              style={{
                color: scoreColor,
                textShadow: `0 0 8px ${scoreColor}40`
              }}
            >
              {chipScore}%
            </span>
          </div>

          <div className="lp-proc-chip-info">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
              <h3 className="lp-proc-chip-title">HEROPIPS CONFLUENCE CORE</h3>
              <span className="lp-proc-chip-status">
                <span className="lp-proc-chip-status-dot" />
                ACTIVE SYNTHESIS
              </span>
            </div>

            {/* Terminal console screen displaying active log */}
            <div 
              className="lp-proc-terminal"
              style={{
                fontFamily: 'Courier New, monospace',
                fontSize: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '8px 12px',
                borderRadius: '8px',
                textAlign: 'left',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.06)',
                lineHeight: '1.4',
                wordBreak: 'break-word'
              }}
            >
              <TerminalTypingText log={PROCESSOR_GATES[activeGate].log} activeGate={activeGate} />
            </div>
          </div>
        </div>

        {/* Wires SVG Canvas linking Chip to the Grid Columns */}
        <svg className="lp-proc-wires-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
          {/* Symmetrical branching traces from center to columns */}
          {Array.from({ length: 6 }).map((_, idx) => {
            const startXLeft = 38 + idx * 2;
            const endXLeft = 10 + idx * 6;
            const isActiveLeft = activeGate === idx;

            const startXRight = 62 - idx * 2;
            const endXRight = 90 - idx * 6;
            const isActiveRight = activeGate === (idx + 6);

            return (
              <g key={`bus-${idx}`}>
                {/* Left wire base & glow */}
                <path 
                  d={`M ${startXLeft} 0 L ${startXLeft} 10 C ${startXLeft} 20, ${endXLeft} 20, ${endXLeft} 30 L ${endXLeft} 40`}
                  className="lp-proc-wire"
                  style={{ stroke: isActiveLeft ? 'rgba(198, 255, 46, 0.25)' : undefined }}
                />
                <path 
                  d={`M ${startXLeft} 0 L ${startXLeft} 10 C ${startXLeft} 20, ${endXLeft} 20, ${endXLeft} 30 L ${endXLeft} 40`}
                  className="lp-proc-wire-glow left-flow"
                  style={{
                    animationDuration: isActiveLeft ? '1.2s' : '3.5s',
                    strokeWidth: isActiveLeft ? '1.5px' : '0.8px',
                    opacity: activeGate === idx ? 0.9 : 0.15
                  }}
                />
                <circle cx={startXLeft} cy="1" r="0.6" fill={isActiveLeft ? 'var(--volt-500)' : 'rgba(255,255,255,0.2)'} />
                <circle cx={endXLeft} cy="39" r="0.6" fill={isActiveLeft ? 'var(--volt-500)' : 'rgba(0,0,0,0.1)'} />

                {/* Right wire base & glow */}
                <path 
                  d={`M ${startXRight} 0 L ${startXRight} 10 C ${startXRight} 20, ${endXRight} 20, ${endXRight} 30 L ${endXRight} 40`}
                  className="lp-proc-wire"
                  style={{ stroke: isActiveRight ? 'rgba(8, 145, 178, 0.25)' : undefined }}
                />
                <path 
                  d={`M ${startXRight} 0 L ${startXRight} 10 C ${startXRight} 20, ${endXRight} 20, ${endXRight} 30 L ${endXRight} 40`}
                  className="lp-proc-wire-glow right-flow"
                  style={{
                    animationDuration: isActiveRight ? '1.2s' : '3.5s',
                    strokeWidth: isActiveRight ? '1.5px' : '0.8px',
                    opacity: activeGate === (idx + 6) ? 0.9 : 0.15
                  }}
                />
                <circle cx={startXRight} cy="1" r="0.6" fill={isActiveRight ? 'var(--surface-3)' : 'rgba(255,255,255,0.2)'} />
                <circle cx={endXRight} cy="39" r="0.6" fill={isActiveRight ? 'var(--surface-3)' : 'rgba(0,0,0,0.1)'} />
              </g>
            );
          })}
        </svg>

        {/* 12 Gates Grid at the Bottom */}
        <div className="lp-proc-gates-grid">
          {PROCESSOR_GATES.map((g, idx) => {
            const isActive = activeGate === idx;
            const isLeft = idx < 6;
            const activeColor = isLeft ? 'rgba(198, 255, 46, 0.3)' : 'rgba(8, 145, 178, 0.3)';
            const numBg = isLeft ? 'var(--volt-500)' : '#0891b2';
            
            return (
              <div 
                key={idx}
                className="lp-proc-gate-card"
                onMouseEnter={() => setHoveredGate(idx)}
                onMouseLeave={() => setHoveredGate(null)}
                onClick={() => handleGateClick(idx)}
                style={{
                  borderColor: isActive ? activeColor : undefined,
                  boxShadow: isActive ? `0 6px 16px ${activeColor}15` : undefined
                }}
              >
                <span 
                  className="lp-proc-gate-num"
                  style={{
                    color: isActive ? (isLeft ? '#0d0c0b' : 'var(--bg-app)') : undefined,
                    background: isActive ? numBg : undefined,
                    borderColor: isActive ? numBg : undefined
                  }}
                >
                  {g.num}
                </span>
                
                <div className="lp-proc-gate-info">
                  <h4 className="lp-proc-gate-name">{g.name}</h4>
                  <span className="lp-proc-gate-desc">{g.desc}</span>
                </div>
                <span 
                  className="lp-proc-gate-indicator"
                  style={{
                    background: isActive ? '#10b981' : undefined,
                    boxShadow: isActive ? '0 0 6px rgba(16, 185, 129, 0.7)' : undefined
                  }}
                />
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}



function HeroPipsEcosystemSection() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data, error } = await supabase
          .from('bento_cards')
          .select('*')
          .eq('is_published', true)
          .order('order_index', { ascending: true })
          .limit(5);
        
        if (error) {
          console.error('Supabase fetch error:', error);
          setErrorMsg(error.message);
        } else if (data) {
          setCards(data.slice(0, 5));
        }
      } catch (err: any) {
        console.error('Failed to fetch bento cards:', err);
        setErrorMsg(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  if (loading) return <div className="p-10 text-center text-white">Loading Bento Cards...</div>;
  if (errorMsg) return <div className="p-10 text-center text-red-500">Error: {errorMsg}</div>;
  if (cards.length === 0) return <div className="p-10 text-center text-yellow-500">No published cards found in bento_cards table!</div>;

  return (
    <section className="lp-bento-wrap">
      <div className="lp-struct-container">
        {/* Horizontal Bounding Lines */}
        <div className="lp-struct-h-line top" />
        <div className="lp-struct-h-line bottom" />
        <div className="lp-struct-v-line left" />
        <div className="lp-struct-v-line right" />
        <div className="lp-struct-crosshair top left" />
        <div className="lp-struct-crosshair top right" />
        <div className="lp-struct-crosshair bottom left" />
        <div className="lp-struct-crosshair bottom right" />

        <div className="lp-bento-inner">
        <div className="lp-bento-header">
          <h2 className="lp-bento-title">Learn more about HeroPips engineering</h2>
        </div>

        <div className="lp-bento-grid">
          {cards.map((card) => {
            // Map the size to generic classes
            let sizeClass = 'bento-square';
            if (card.bento_size === 'tall') sizeClass = 'bento-tall';
            if (card.bento_size === 'wide') sizeClass = 'bento-wide';
            if (card.bento_size === 'large') sizeClass = 'bento-large';

            if (card.card_type === 'split') {
              return (
                <div key={card.id} className={`lp-bento-card ${sizeClass}`}>
                  <div className="lp-bento-content-split flex w-full h-full">
                    <div className="lp-bento-text">
                      <span className={`lp-bento-tag tag-${card.tag_color}`}>{card.tag_text}</span>
                      <h3 className="lp-bento-card-title">{card.title}</h3>
                      {card.description && <p className="lp-bento-card-desc">{card.description}</p>}
                      {card.link_url && <a href={card.link_url} className="lp-bento-link">{card.link_text || 'Learn more →'}</a>}
                    </div>
                    <div className="lp-bento-img-side">
                      {card.image_url && <img src={card.image_url} alt={card.title} className="lp-bento-img" />}
                    </div>
                  </div>
                </div>
              );
            }

            if (card.card_type === 'video') {
              return (
                <div key={card.id} className={`lp-bento-card ${sizeClass} card-type-video`}>
                  {card.image_url && (
                    <div className="lp-bento-img-wrap-full">
                      <img src={card.image_url} alt={card.title} className="lp-bento-img" />
                      <div className="lp-bento-livestream-overlay">
                        <span className="lp-bento-live-badge">• LIVESTREAM</span>
                      </div>
                    </div>
                  )}
                  <div className="lp-bento-content-overlay">
                    <span className={`lp-bento-tag tag-${card.tag_color}`}>{card.tag_text}</span>
                    <h3 className="lp-bento-card-title">{card.title}</h3>
                    {card.description && <p className="lp-bento-card-desc">{card.description}</p>}
                    {card.link_url && <a href={card.link_url} className="lp-bento-link">{card.link_text || 'Learn more →'}</a>}
                  </div>
                </div>
              );
            }

            return (
              <div key={card.id} className={`lp-bento-card ${sizeClass}`}>
                {card.image_url && (
                  <div className="lp-bento-img-wrap">
                    <img src={card.image_url} alt={card.title} className="lp-bento-img" />
                    {card.card_type === 'video' && (
                      <div className="absolute top-4 right-4 bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider backdrop-blur-sm">
                        • LIVESTREAM
                      </div>
                    )}
                  </div>
                )}
                <div className="lp-bento-content">
                  <span className={`lp-bento-tag tag-${card.tag_color}`}>{card.tag_text}</span>
                  <h3 className="lp-bento-card-title">{card.title}</h3>
                  {card.description && <p className="lp-bento-card-desc">{card.description}</p>}
                  {card.link_url && <a href={card.link_url} className="lp-bento-link">{card.link_text || 'Learn more →'}</a>}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const integrations = [
    {
      key: 'mt5',
      name: 'MetaTrader 5',
      tag: 'EXECUTION',
      badgeText: 'Sub-1ms Latency',
      desc: 'Sub-millisecond execution. Route complex institutional signals via our proprietary, in-house MT5 farm infrastructure.',
      glowColor: 'rgba(0, 136, 255, 0.08)',
      borderColor: 'rgba(0, 136, 255, 0.25)',
      logo: (
        <img 
          src="/logos/metatrader5_icon.png" 
          alt="MetaTrader 5 logo" 
          className="lp-integration-brand-logo"
        />
      )
    },
    {
      key: 'binance',
      name: 'Binance',
      tag: 'EXCHANGE',
      badgeText: 'Secure API Sync',
      desc: 'Spot & Futures trading. Automated portfolio balancing with state-of-the-art secure API key encryption.',
      glowColor: 'rgba(240, 185, 11, 0.08)',
      borderColor: 'rgba(240, 185, 11, 0.25)',
      logo: (
        <img 
          src="/logos/binance_icon.png" 
          alt="Binance logo" 
          className="lp-integration-brand-logo"
        />
      )
    },
    {
      key: 'bybit',
      name: 'Bybit',
      tag: 'DERIVATIVES',
      badgeText: 'Direct Liquidity Access',
      desc: 'High-leverage derivatives. Execute momentum trades instantly with direct liquidity access.',
      glowColor: 'rgba(255, 122, 0, 0.08)',
      borderColor: 'rgba(255, 122, 0, 0.25)',
      logo: (
        <img 
          src="/logos/bybit_icon.png" 
          alt="Bybit logo" 
          className="lp-integration-brand-logo"
        />
      )
    },
    {
      key: 'telegram',
      name: 'Telegram Alerts',
      tag: 'INTEGRATION',
      badgeText: 'Instant Notification Stream',
      desc: 'Real-time alerts. Receive instant 12-gate confluence signals, logs, and execution reports directly in your channel.',
      glowColor: 'rgba(0, 172, 238, 0.08)',
      borderColor: 'rgba(0, 172, 238, 0.25)',
      logo: (
        <img 
          src="/logos/telegram_icon.png" 
          alt="Telegram logo" 
          className="lp-integration-brand-logo-square"
        />
      )
    }
  ];

  return (
    <section className="lp-integrations-section">
      {/* Background Mesh Glow Ambient Spots */}
      <div className="lp-integrations-ambient-left" aria-hidden />
      <div className="lp-integrations-ambient-right" aria-hidden />
      
      <div className="lp-struct-container">
        {/* Horizontal Bounding Lines */}
        <div className="lp-struct-h-line top" />
        <div className="lp-struct-h-line bottom" />
        <div className="lp-struct-v-line left" />
        <div className="lp-struct-v-line right" />
        <div className="lp-struct-crosshair top left" />
        <div className="lp-struct-crosshair top right" />
        <div className="lp-struct-crosshair bottom left" />
        <div className="lp-struct-crosshair bottom right" />

        <div className="lp-integrations-inner">
          <div className="lp-integrations-header">
            <span className="lp-integrations-tag">CONNECTIVITY</span>
            <h2 className="lp-integrations-title">Connected to your trading ecosystem</h2>
            <p className="lp-integrations-desc">
              Execute signals directly to your favorite brokers and receive real-time notifications on your channels.
            </p>
          </div>

          <div className="lp-integrations-grid">
            {integrations.map((item, idx) => {
              return (
                <TiltCard 
                  key={idx}
                  className="lp-integration-card-wrapper"
                >
                  <div 
                    className={`lp-integration-card ${hoveredIdx === idx ? 'active-glow' : ''}`}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onMouseMove={(e) => handleMouseMove(e, idx)}
                    style={{
                      '--brand-glow-color': item.glowColor,
                      '--brand-border-color': item.borderColor,
                      '--mouse-x': `${coords.x}px`,
                      '--mouse-y': `${coords.y}px`
                    } as React.CSSProperties}
                  >
                    <div className="lp-integration-top">
                      {item.logo}
                      <span className="lp-integration-card-tag">{item.tag}</span>
                    </div>
                    <p className="lp-integration-card-desc">{item.desc}</p>
                    <div className="lp-integration-card-footer">
                      <span className="lp-integration-card-status">{item.badgeText}</span>
                      <ArrowRight size={13} className="lp-integration-card-arrow" />
                    </div>
                  </div>
                </TiltCard>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How does the 12-Gate Confluence Engine validate signals?',
      a: 'Every signal undergoes real-time validation across 12 distinct quantitative gates. These gates analyze technical indicators, volume profiles, liquidity gaps, correlation matrixes, order block patterns, key economic data releases, and current news sentiment. A signal is only released if it meets a perfect consensus across all 12 validation gates.'
    },
    {
      q: 'What is the MT5 Farm, and how does it achieve sub-millisecond execution?',
      a: 'Our MT5 Farm is a proprietary, in-house infrastructure composed of co-located high-frequency servers situated in key global financial data centers (LD4 and NY4). By hosting direct API bridge connections close to liquidity providers, we reduce round-trip latency to sub-millisecond levels, eliminating slippage and maximizing execution speed.'
    },
    {
      q: 'Can HeroPips help me pass Prop Firm challenges?',
      a: 'Absolutely. HeroPips is specifically built with advanced risk governance controls to help traders pass challenges from firms like FTMO, FundedNext, and MFF. The Risk Governor automatically calculates position sizing based on your specific drawdown limits, ensuring you never violate daily loss thresholds or max drawdown rules.'
    },
    {
      q: 'Is my broker account secure when connecting via API?',
      a: 'Security is our highest priority. HeroPips uses bank-grade AES-256 API key encryption. We only request trading execution permissions; withdrawal access is strictly blocked. Furthermore, your API keys are stored in isolated, hardware-security modules (HSMs) on our secure cloud architecture.'
    },
    {
      q: 'How does the AI Chat Assistant analyze live market charts?',
      a: 'The AI Chat Assistant is directly hooked into our real-time price feeds and news sentiment engine. When you ask about an asset, the AI dynamically extracts price structure, candlestick formations, order block imbalances, and sentiment reports, delivering technical analyses in seconds.'
    },
    {
      q: 'Can I white-label HeroPips\'s signals or connect via custom Webhooks?',
      a: 'Yes. We offer white-label solutions and direct websocket/REST API feeds for quantitative desks, family offices, and professional trading communities. You can customize the signal routing, integrate custom risk templates, and broadcast alerts directly to your Discord, Telegram, or custom webhook endpoints.'
    }
  ];

  return (
    <section className="lp-faq-section">
      <div className="lp-struct-container">
        {/* Horizontal Bounding Lines */}
        <div className="lp-struct-h-line top" />
        <div className="lp-struct-h-line bottom" />
        <div className="lp-struct-v-line left" />
        <div className="lp-struct-v-line right" />
        <div className="lp-struct-crosshair top left" />
        <div className="lp-struct-crosshair top right" />
        <div className="lp-struct-crosshair bottom left" />
        <div className="lp-struct-crosshair bottom right" />

        <div className="lp-faq-inner">
          <div className="lp-faq-header">
            <span className="lp-faq-tag">
              <HelpCircle size={12} style={{ marginRight: 5 }} />
              Frequently Asked Questions
            </span>
            <h2 className="lp-faq-title">Questions? Answers!</h2>
            <p className="lp-faq-desc">
              Everything you need to know about our institutional validation, farm infrastructure, and risk models.
            </p>
          </div>

          <div className="lp-faq-list">
            {faqs.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div 
                  key={idx} 
                  className={`lp-faq-item-card ${isOpen ? 'open' : ''}`}
                >
                  <button 
                    className="lp-faq-question-btn"
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className="lp-faq-chevron" />
                  </button>
                  <div 
                    className="lp-faq-answer-wrapper"
                    style={{
                      maxHeight: isOpen ? '200px' : '0',
                      opacity: isOpen ? 1 : 0
                    }}
                  >
                    <p className="lp-faq-answer">{faq.a}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lp-faq-footer">
            <Mail size={14} style={{ marginRight: 6 }} />
            <span>Feel free to mail us for any enquiries: </span>
            <a href="mailto:support@heropips.com" className="lp-faq-mail-link">support@heropips.com</a>
          </div>
        </div>
      </div>
    </section>
  );
}














/* ── Motion Variants ─────────────────────────────────── */
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const zoomIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const statsContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

function DualFocusSection() {
  return (
    <section className="lp-dual-section">
      <div className="lp-dual-grid">
        {/* Structural Horizontal Lines */}
        <div className="lp-struct-h-line top" />
        <div className="lp-struct-h-line bottom" />
        {/* Structural Vertical Lines */}
        <div className="lp-struct-v-line left" />
        <div className="lp-struct-v-line center hidden md:block" />
        <div className="lp-struct-v-line right" />
        
        {/* Structural Crosshairs */}
        <div className="lp-struct-crosshair top left" />
        <div className="lp-struct-crosshair top center hidden md:block" />
        <div className="lp-struct-crosshair top right" />
        <div className="lp-struct-crosshair bottom left" />
        <div className="lp-struct-crosshair bottom center hidden md:block" />
        <div className="lp-struct-crosshair bottom right" />

        {/* Education Box */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lp-dual-card group relative overflow-hidden"
        >
          {/* Full-bleed background image */}
          <img 
            src="/academy-student.png" 
            alt="Hero Academy" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-105"
          />
          {/* Heavy gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/50 to-transparent" />
          
          <div className="lp-dual-glow volt-glow transition-all duration-500 group-hover:scale-125 group-hover:opacity-40" />
          
          <div className="relative z-10 flex flex-col h-full justify-end">
            {/* Bottom Content */}
            <div className="lp-dual-content pt-32 pb-2">
              <h3 className="lp-dual-title" style={{ marginBottom: '12px' }}>
                Hero <span style={{ color: '#C6FF2E' }}>Academy.</span>
              </h3>
              <p className="lp-dual-desc" style={{ marginBottom: '24px' }}>
                Master market microstructure and algorithmic order flow through our immersive curriculum.
              </p>
              
              <div className="self-start mt-4">
                <AvatarCircles 
                  numPeople={99} 
                  avatarUrls={[
                    { imageUrl: "https://i.pravatar.cc/150?img=11", profileUrl: "#" },
                    { imageUrl: "https://i.pravatar.cc/150?img=32", profileUrl: "#" },
                    { imageUrl: "https://i.pravatar.cc/150?img=12", profileUrl: "#" },
                  ]} 
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Signal Box */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="lp-dual-card group relative overflow-hidden"
        >
          {/* Animated Code-based Trading Background */}
          <div className="absolute inset-0 z-0 overflow-hidden opacity-40 group-hover:opacity-70 transition-opacity duration-1000">
            {/* Tech Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            {/* Animated Trading Bars */}
            <div className="absolute left-0 right-0 bottom-0 h-full flex items-end justify-between px-6 pb-24 gap-3">
              {[40, 25, 60, 45, 80, 55, 30, 65, 90, 70, 50, 85].map((h, i) => (
                <div 
                  key={i}
                  className={`w-full rounded-t-sm bg-gradient-to-t ${i === 1 || i === 3 || i === 6 || i === 10 ? 'from-red-500/10 to-red-500/60' : 'from-[#C6FF2E]/10 to-[#C6FF2E]/60'} animate-pulse`}
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${(i % 3) + 2}s`
                  }}
                />
              ))}
            </div>
            
            {/* Soft glow radial gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#09090b_100%)]" />
          </div>
          {/* Heavy gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/50 to-transparent" />
          
          <div className="lp-dual-glow volt-glow transition-all duration-500 group-hover:scale-125 group-hover:opacity-40" />
          
          <div className="relative z-10 flex flex-col h-full justify-end">
            {/* Bottom Content */}
            <div className="lp-dual-content pt-32 pb-2">
              <div className="lp-dual-badge self-start mb-4">
                <span className="w-2 h-2 rounded-full bg-[#C6FF2E] shadow-[0_0_10px_rgba(198,255,46,0.8)] animate-pulse" />
                <span>AI Signal Engine</span>
              </div>
              <h3 className="lp-dual-title" style={{ marginBottom: '12px' }}>
                Ai <span style={{ color: '#C6FF2E' }}>Terminal.</span>
              </h3>
              <p className="lp-dual-desc" style={{ marginBottom: '24px' }}>
                Execute without bias. Our AI engine processes tick-level data to find high-probability setups.
              </p>
              
              <div className="self-start mt-4">
                <div className="flex -space-x-2">
                  <div className="group flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br from-zinc-800 to-zinc-950 z-40 shadow-xl overflow-hidden hover:-translate-y-1 hover:scale-110 hover:z-50 transition-all duration-300 cursor-pointer">
                    <img src="/logos/mt5_logo.svg" alt="MT5" className="h-full w-full object-contain p-[6px] group-hover:opacity-100 opacity-90 transition-opacity" />
                  </div>
                  <div className="group flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-black z-30 shadow-xl overflow-hidden hover:-translate-y-1 hover:scale-110 hover:z-50 transition-all duration-300 cursor-pointer">
                    <img src="/logos/binance_icon.png" alt="Binance" className="h-full w-full object-cover scale-[1.05] group-hover:opacity-100 opacity-90 transition-opacity" />
                  </div>
                  <div className="group flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-black z-20 shadow-xl overflow-hidden hover:-translate-y-1 hover:scale-110 hover:z-50 transition-all duration-300 cursor-pointer">
                    <img src="/logos/kucoin_icon.png" alt="Kucoin" className="h-full w-full object-cover scale-[1.05] group-hover:opacity-100 opacity-90 transition-opacity" />
                  </div>
                  <div className="group flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br from-zinc-800 to-zinc-950 z-10 shadow-xl overflow-hidden hover:-translate-y-1 hover:scale-110 hover:z-50 transition-all duration-300 cursor-pointer">
                    <img src="/logos/tradingview_icon.svg" alt="TradingView" className="h-full w-full object-contain p-[6px] group-hover:opacity-100 opacity-90 transition-opacity" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
import { AvatarCircles } from "@/components/magicui/avatar-circles";
import { InteractiveGridPattern } from "@/components/magicui/interactive-grid-pattern";

function ArchitecturalGrid() {
  return <div className="lp-arch-grid" />;
}

/* ── Page ───────────────────────────────────────────── */
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <>
      <ArchitecturalGrid />
      
      {/* ── HERO ── */}
      <section className="lp-hero-wrap relative">
        <div className="lp-struct-container">
          {/* Horizontal Bounding Lines */}
          <div className="lp-struct-h-line top" style={{ top: 0 }} />
          <div className="lp-struct-h-line bottom" />
          <div className="lp-struct-v-line left" />
          <div className="lp-struct-v-line right" />
          <div className="lp-struct-crosshair top left" style={{ top: '-4px' }} />
          <div className="lp-struct-crosshair top right" style={{ top: '-4px' }} />
          <div className="lp-struct-crosshair bottom left" />
          <div className="lp-struct-crosshair bottom right" />

        <div 
          className="lp-hero"
          ref={heroRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Glowing neon atmosphere spots */}
          <div className="lp-hero-glow-volt" aria-hidden />
          <div className="lp-hero-glow-cyan" aria-hidden />

          {/* Border Beam Glow Overlay */}
          <svg className="lp-border-beam-svg" aria-hidden>
            <defs>
              <linearGradient id="hero-beam-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--volt-500)" stopOpacity="0" />
                <stop offset="50%" stopColor="var(--volt-500)" stopOpacity="1" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" rx="24" ry="24" className="lp-border-beam-rect" stroke="url(#hero-beam-grad)" />
          </svg>

          {/* Mouse tracking radial spotlight glow */}
          <div 
            className="lp-hero-hover-glow" 
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 0,
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.4s ease',
              background: `radial-gradient(450px circle at ${coords.x}px ${coords.y}px, rgba(198, 255, 46, 0.045), transparent 75%)`,
            }}
            aria-hidden
          />

          {/* Interactive Grid Pattern background */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto">
            <InteractiveGridPattern
              className="opacity-70"
              squaresClassName="hover:fill-volt-500/10 hover:stroke-volt-500/20 stroke-white/5 transition-all duration-300"
              width={48}
              height={48}
              squares={[40, 40]}
            />
          </div>

          {/* Bottom radial glow */}
          <div className="lp-hero-glow" aria-hidden />

          {/* Two-column inner */}
          <motion.div 
            className="lp-hero-inner"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >

            {/* LEFT — text */}
            <div className="lp-hero-left">
              <motion.div className="lp-hero-announce" variants={fadeInUp}>
                <span className="lp-hero-announce-dot" />
                <span className="lp-hero-announce-brand">HeroPips 2.0</span>
                {' · 12-Gate Confluence Engine · Now Live'}
              </motion.div>

              <motion.h1 
                className="lp-hero-h1" 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.span variants={fadeInUp} style={{ display: 'block' }}>
                  Institutional AI —
                </motion.span>
                <motion.span variants={fadeInUp} style={{ display: 'block' }}>
                  built for traders
                </motion.span>
                <motion.span variants={fadeInUp} style={{ display: 'block' }}>
                  who trade{' '}
                  <span className="lp-hero-cycle">
                    <span className="lp-hero-cycle-inner">
                      <span>smarter.</span>
                      <span>faster.</span>
                      <span>better.</span>
                    </span>
                  </span>
                </motion.span>
              </motion.h1>

              <motion.p className="lp-hero-sub" variants={fadeInUp}>
                12-gate confluence signals, automated risk governance, and one-click MT5 execution — all in one terminal.
              </motion.p>


              {/* Trust bar — premium stat pills */}
              <motion.div className="lp-hero-trust" variants={fadeInUp}>
                <div className="lp-hero-trust-pill">
                  <div className="lp-hero-trust-icon">
                    {/* Lightning bolt */}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="lp-hero-trust-text">
                    <span className="lp-hero-trust-num">5,000+</span>
                    <span className="lp-hero-trust-label">Signals</span>
                  </div>
                </div>
                <div className="lp-hero-trust-pill">
                  <div className="lp-hero-trust-icon">
                    {/* Shield with checkmark */}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L4 6V12C4 16.418 7.582 20.418 12 22C16.418 20.418 20 16.418 20 12V6L12 2Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="lp-hero-trust-text">
                    <span className="lp-hero-trust-num">12-Gate</span>
                    <span className="lp-hero-trust-label">Validation</span>
                  </div>
                </div>
                <div className="lp-hero-trust-pill">
                  <div className="lp-hero-trust-icon">
                    {/* Padlock */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="5" y="11" width="14" height="10" rx="2" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.8"/>
                      <path d="M8 11V7C8 4.791 9.791 3 12 3C14.209 3 16 4.791 16 7V11" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="12" cy="16" r="1.5" fill="white"/>
                    </svg>
                  </div>
                  <div className="lp-hero-trust-text">
                    <span className="lp-hero-trust-num">Non-custodial</span>
                    <span className="lp-hero-trust-label">Always</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* RIGHT — Video showcase placeholder */}
            <motion.div className="lp-hero-right" variants={zoomIn}>
              <div className="lp-hero-video">
                {/* Glassmorphic video placeholder with play button */}
                <div className="lp-video-container">
                  <video 
                    ref={videoRef}
                    src="/videos/heropips.mp4" 
                    poster="/images/heropips.jpg"
                    className="lp-hero-video-poster"
                    preload="none"
                    controls={isPlaying}
                    playsInline 
                  />
                  {!isPlaying && (
                    <div className="lp-video-overlay-glass" onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.play();
                        setIsPlaying(true);
                      }
                    }} style={{ cursor: 'pointer' }}>
                      <button className="lp-video-play-btn" aria-label="Play video">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="lp-play-icon">
                          <path d="M8 5V19L19 12L8 5Z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

          </motion.div>
        </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-stats">
        <div className="lp-struct-container">
          {/* Vertical Bounding Lines */}
          <div className="lp-struct-v-line left" />
          <div className="lp-struct-v-line right" />

          <motion.div 
            className="lp-stats-inner"
            variants={statsContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
          {STATS.map((s, i) => (
            <motion.div className="lp-stat" variants={fadeInUp} key={i}>
              <span className="lp-stat-num">
                {s.raw
                  ? <span className="lp-stat-raw">{s.rawVal}</span>
                  : <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} />}
              </span>
              <div className="lp-stat-info">
                <span className="lp-stat-label">{s.label}</span>
                <span className="lp-stat-desc">{s.desc}</span>
              </div>
            </motion.div>
          ))}
          </motion.div>
        </div>
      </section>

      {/* ── DUAL FOCUS (Education & AI) ── */}
      <DualFocusSection />

      {/* ── NARRATIVE ── */}
      <NarrativeSection />

      {/* ── CONFLUENCE PROCESSOR ── */}
      <ConfluenceProcessorSection />

      {/* ── INTEGRATIONS ── */}
      <IntegrationsSection />

      {/* ── BENTO ECOSYSTEM ── */}
      <HeroPipsEcosystemSection />

      {/* ── FAQ ── */}
      <FaqSection />
    </>
  );
}
