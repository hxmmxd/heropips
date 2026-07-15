'use client';

import { useState, useEffect, useRef } from 'react';


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
        // Slow float up for the box, slow drift for the glow background
        const boxTranslate = scrolled * -0.05;
        const glowTranslate = scrolled * 0.03;
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

      <div className="lp-narrative-inner">
        
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
                <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
                <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
              </svg>
              NOISE
            </div>
            
            <h2 className="lp-narrative-main-title">
              Trading isn't difficult. <span className="lp-narrative-main-highlight">Filtering noise is.</span>
            </h2>
            
            <p className="lp-narrative-main-desc">
              Most trading systems overwhelm you with conflicting signals. Xyro filters the chaos, delivering 12-gate validated confluence.
            </p>

            <a href="/login" className="lp-narrative-cta-btn">
              Explore scanner
            </a>

            {/* Inner column divider dots */}
            <div className="lp-grid-dot dot-tr" />
            <div className="lp-grid-dot dot-br" />
          </div>

          {/* Right Column: Grid of Cards */}
          <div className="lp-narrative-grid-col">
            
            {/* Card 1: Twitter */}
            <div 
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
            </div>

            {/* Card 2: YouTube */}
            <div 
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
            </div>

            {/* Card 3: Indicators */}
            <div 
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
            </div>

            {/* Card 4: News */}
            <div 
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
            </div>

            {/* Card 5: Fear */}
            <div 
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
            </div>

          </div>

          {/* Integrated Bottom Solution Row */}
          <div className="lp-narrative-solution-row">
            <div className="lp-grid-dot dot-tl" />
            <div className="lp-grid-dot dot-tr" />
            <div className="lp-grid-dot dot-mid" />
            
            <div className="lp-sol-badge">THE XYRO ENGINE</div>
            <h3 className="lp-sol-text">
              Xyro combines everything <span className="lp-sol-highlight">before giving an answer.</span>
            </h3>
          </div>

        </div>
      </div>
    </section>
  );
}



/* ── 12-Gates Confluence Engine data ────────────────────────── */
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

/* ── 12-Gates Grid Section ──────────────────────────────────── */
/* ── Comparison Section (12-Gate Flow & Signal Output) ────── */
const MINI_GATES = [
  { icon: '🌊', label: 'VOLATILITY', statusText: 'ATR 1.2x Stable' },
  { icon: '📊', label: 'ORDER FLOW', statusText: 'Bid Imb. 68%' },
  { icon: '💧', label: 'LIQUIDITY', statusText: 'BSL Sweep Clear' },
  { icon: '📰', label: 'NEWS FILTER', statusText: 'FOMC Clear' },
  { icon: '📶', label: 'MTF STACK', statusText: 'W1/D1/4H Aligned' },
  { icon: '🔗', label: 'CORRELATION', statusText: 'DXY Bearish Bias' },
  { icon: '🎯', label: 'VOL PROFILE', statusText: 'Inside POC Node' },
  { icon: '💸', label: 'FUNDING RATE', statusText: 'Prem <0.02%' },
  { icon: '📈', label: 'VWAP', statusText: 'Inside ±1.5σ' },
  { icon: '⚖️', label: 'SPREAD ARB', statusText: 'Slippage <0.1%' },
  { icon: '⚡', label: 'VELOCITY', statusText: 'ADX >25 Bullish' },
  { icon: '🛡️', label: 'CANDLE PATTERN', statusText: 'H1 Hammer Conf.' },
];

function ComparisonSection() {
  return (
    <section className="lp-comp">
      <div className="lp-comp-inner">
        <div className="lp-comp-grid">
          
          {/* Left Panel: 12 Gates Processing Flow */}
          <div className="lp-comp-card lp-comp-left">
            <div className="lp-comp-card-content">
              <div className="lp-comp-badge lp-comp-badge-bad">
                <span className="lp-comp-badge-dot-glowing" />
                CONFLUENCE PIPELINE ACTIVE
              </div>
              
              <h3 className="lp-comp-card-title">
                12 Quantitative Filters <br />
                <span className="text-[13px] font-medium tracking-normal text-black/50 block mt-2">
                  Analyzing raw price and institutional book depth at millisecond speeds.
                </span>
              </h3>
            </div>

            {/* Grid of 12 Gates flowing */}
            <div className="lp-comp-pipeline-flow">
              <div className="lp-comp-gates-mini-grid">
                {MINI_GATES.map((g, idx) => (
                  <div key={idx} className="lp-comp-gate-mini-card">
                    <div className="lp-comp-gate-mini-hdr">
                      <span className="lp-comp-gate-mini-label">
                        <span style={{ marginRight: '4px' }}>{g.icon}</span> {g.label}
                      </span>
                      <span className="lp-comp-gate-mini-dot" />
                    </div>
                    <span className="lp-comp-gate-mini-status-text">{g.statusText}</span>
                  </div>
                ))}
              </div>
              
              {/* Flow indicators pointing to the right */}
              <div className="lp-comp-flow-arrow-desktop">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          </div>

          {/* Right Panel: Orange Box outputting validated Trade Signal */}
          <div className="lp-comp-card lp-comp-right">
            <div className="lp-comp-card-content">
              <div className="lp-comp-badge lp-comp-badge-good">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: '6px' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                VALIDATED SIGNAL OUTPUT
              </div>

              <h3 className="lp-comp-card-title text-white">
                Executed <br />
                <strong>Trade Signal</strong>
              </h3>
            </div>

            {/* Translucent glassmorphic Trade Signal Ticket */}
            <div className="lp-comp-signal-ticket">
              <div className="lp-comp-ticket-hdr">
                <div className="lp-comp-ticket-status">
                  <span className="lp-comp-ticket-glowing-dot" />
                  <span>● LIVE SIGNAL ACTIVE</span>
                </div>
                <span className="lp-comp-ticket-id">#T-9042</span>
              </div>
              
              <div className="lp-comp-ticket-body">
                <div className="lp-comp-ticket-symbol-row">
                  <span className="lp-comp-ticket-symbol">XAUUSD</span>
                  <span className="lp-comp-ticket-action">BUY</span>
                </div>
                
                <div className="lp-comp-ticket-details-grid">
                  <div className="lp-comp-ticket-detail-item">
                    <span className="lp-comp-ticket-lbl">ENTRY</span>
                    <span className="lp-comp-ticket-val">2,342.50</span>
                  </div>
                  <div className="lp-comp-ticket-detail-item">
                    <span className="lp-comp-ticket-lbl">TAKE PROFIT</span>
                    <span className="lp-comp-ticket-val text-emerald-400">2,365.00</span>
                  </div>
                  <div className="lp-comp-ticket-detail-item">
                    <span className="lp-comp-ticket-lbl">STOP LOSS</span>
                    <span className="lp-comp-ticket-val text-red-400">2,335.00</span>
                  </div>
                  <div className="lp-comp-ticket-detail-item">
                    <span className="lp-comp-ticket-lbl">LOTS (1% RISK)</span>
                    <span className="lp-comp-ticket-val">0.50</span>
                  </div>
                </div>
              </div>
              
              <div className="lp-comp-ticket-footer">
                <div className="flex items-center gap-1">
                  <span className="lp-comp-ticket-check">✓</span>
                  <span>12/12 GATES PASSED</span>
                </div>
                <span className="lp-comp-ticket-status-pill">MT5 ACTIVE</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function GatesSection() {
  return (
    <section className="lp-gates">
      <div className="lp-gates-inner">
        <div className="lp-gates-header">
          <p className="lp-gates-eyebrow">CONFLUENCE PIPELINE</p>
          <h2 className="lp-gates-title">The 12-Gate Validation Engine</h2>
          <p className="lp-gates-desc">
            Every single signal must pass all 12 quantitative checks before execution. Rejects retail noise, executes on institutional probability.
          </p>
        </div>
        
        {/* Unified 12-Gates Grid Box Container */}
        <div className="lp-gates-box">
          {/* Corner dot crosshairs */}
          <div className="lp-grid-dot dot-tl" />
          <div className="lp-grid-dot dot-tr" />
          <div className="lp-grid-dot dot-bl" />
          <div className="lp-grid-dot dot-br" />

          <div className="lp-gates-grid">
            {GATES.map((gate, i) => (
              <div 
                key={i} 
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}









/* ── Nav data ─────────────────────────────────────────────── */

const NAV_DROPDOWNS = {
  Platform: [
    { icon: '⚡', title: 'AI Signal Engine', desc: '12-gate quantitative validation' },
    { icon: '🛡', title: 'Risk Governor', desc: 'Auto position sizing & drawdown guard' },
    { icon: '📊', title: 'Analytics Dashboard', desc: 'Full performance tracking & journal' },
    { icon: '🤖', title: 'AI Chat Assistant', desc: 'Ask anything, get instant analysis' },
  ],
  'For Traders': [
    { icon: '🎯', title: 'Prop Firm Traders', desc: 'Pass challenges with governed risk' },
    { icon: '💼', title: 'Institutional', desc: 'White-label & API for firms & funds' },
    { icon: '🔰', title: 'Beginners', desc: 'Start with guided, validated signals' },
  ],
  Resources: [
    { icon: '📖', title: 'Documentation', desc: 'Guides, API refs & tutorials' },
    { icon: '✍️', title: 'Blog', desc: 'Strategy breakdowns & market insights' },
    { icon: '💬', title: 'Community', desc: 'Telegram & Discord trader groups' },
  ],
};

function ChevronDown() {
  return (
    <svg className="lp-nav-chevron" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Navbar ─────────────────────────────────────────────────── */
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="lp-nav">
        <div className="lp-nav-inner">

          {/* Logo */}
          <a href="#" className="lp-nav-logo" aria-label="XyroTrade">
            <img
              src="/logos/xyrotrade-logo.png"
              alt="XyroTrade"
              className="lp-nav-logo-img"
            />
          </a>


          {/* Center links */}
          <div className="lp-nav-links">

            {/* Dropdown items */}
            {(Object.keys(NAV_DROPDOWNS) as Array<keyof typeof NAV_DROPDOWNS>).map((label) => (
              <div className="lp-nav-item" key={label}>
                <button className="lp-nav-link">
                  {label}
                  <ChevronDown />
                </button>
                <div className="lp-nav-dropdown">
                  {NAV_DROPDOWNS[label].map((item) => (
                    <a key={item.title} href="#" className="lp-nav-dropdown-item">
                      <div className="lp-nav-dd-icon">{item.icon}</div>
                      <div>
                        <div className="lp-nav-dd-title">{item.title}</div>
                        <div className="lp-nav-dd-desc">{item.desc}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}

            {/* Plain links */}
            <a href="#" className="lp-nav-link">Signals</a>
            <a href="#" className="lp-nav-link">Pricing</a>
            <a href="#" className="lp-nav-link">Brokers</a>

            {/* Orange badge pill */}
            <a href="#" className="lp-nav-badge">
              <span className="lp-nav-badge-dot" />
              Live Signals
            </a>
          </div>

          {/* Right actions */}
          <div className="lp-nav-actions">
            <a href="#" className="lp-nav-act-link">Contact sales</a>
            <div className="lp-nav-act-sep" />
            <a href="/login" className="lp-nav-act-link">Log in</a>
            <a href="/login" className="lp-nav-act-btn">Create account</a>
          </div>

          {/* Mobile-only: Create account (visible before hamburger on small screens) */}
          <div className="lp-nav-mobile-actions">
            <a href="/login" className="lp-nav-mob-btn">Create account</a>
          </div>

          {/* Hamburger */}
          <button
            className={`lp-nav-hamburger${mobileOpen ? ' open' : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>

        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`lp-nav-mobile${mobileOpen ? ' open' : ''}`}>
        <a href="#">Platform</a>
        <a href="#">For Traders</a>
        <a href="#">Resources</a>
        <a href="#">Signals</a>
        <a href="#">Pricing</a>
        <a href="#">Brokers</a>
        <div className="lp-nav-mobile-sep" />
        <a href="/login">Log in</a>
        <a href="/login" className="lp-nav-mobile-cta">Create account</a>
      </div>
    </>
  );
}

/* ── Page ───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <section className="lp-hero-wrap">
        <div className="lp-hero">

          {/* Dot-grid texture */}
          <div className="lp-hero-dots" aria-hidden />

          {/* Bottom radial glow */}
          <div className="lp-hero-glow" aria-hidden />

          {/* Two-column inner */}
          <div className="lp-hero-inner">

            {/* LEFT — text */}
            <div className="lp-hero-left">
              <div className="lp-hero-announce">
                <span className="lp-hero-announce-dot" />
                <span className="lp-hero-announce-brand">Xyro Trade 2.0</span>
                {' · 12-Gate Confluence Engine · Now Live'}
              </div>

              <h1 className="lp-hero-h1">
                Institutional AI —{' '}<br />
                built for traders<br />
                who trade{' '}
                <span className="lp-hero-cycle">
                  <span className="lp-hero-cycle-inner">
                    <span>smarter.</span>
                    <span>faster.</span>
                    <span>better.</span>
                  </span>
                </span>
              </h1>

              <p className="lp-hero-sub">
                12-gate confluence signals, automated risk governance, and one-click MT5 execution — all in one terminal.
              </p>


              {/* Trust bar — premium stat pills */}
              <div className="lp-hero-trust">
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
              </div>
            </div>

            {/* RIGHT — video placeholder */}
            <div className="lp-hero-right">
              <div className="lp-hero-video">
                {/* Fake screen reflection */}
                <div className="lp-hero-video-shine" aria-hidden />
                {/* Play button */}
                <button className="lp-hero-play" aria-label="Watch demo">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                </button>
                <p className="lp-hero-video-label">Watch 2-min demo</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-stats">
        <div className="lp-stats-inner">
          {STATS.map((s, i) => (
            <div className="lp-stat" key={i}>
              <span className="lp-stat-num">
                {s.raw
                  ? <span className="lp-stat-raw">{s.rawVal}</span>
                  : <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} />}
              </span>
              <div className="lp-stat-info">
                <span className="lp-stat-label">{s.label}</span>
                <span className="lp-stat-desc">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── NARRATIVE ── */}
      <NarrativeSection />

      {/* ── COMPARISON ── */}
      <ComparisonSection />

      {/* ── GATES GRID ── */}
      <GatesSection />
    </>
  );
}
