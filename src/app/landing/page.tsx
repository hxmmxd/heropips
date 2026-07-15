'use client';

import { useState, useEffect, useRef } from 'react';
import { Navbar } from './Navbar';



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





/* ── 12-Gates Grid Section ──────────────────────────────────── */
/* ── Comparison Section (12-Gate Flow & Signal Output) ────── */
const ROW_1 = [
  { icon: '🌊', label: 'VOLATILITY', statusText: 'ATR 1.2x Stable' },
  { icon: '📊', label: 'ORDER FLOW', statusText: 'Bid Imb. 68%' },
  { icon: '💧', label: 'LIQUIDITY', statusText: 'BSL Sweep Clear' },
  { icon: '📰', label: 'NEWS FILTER', statusText: 'FOMC Clear' },
];

const ROW_2 = [
  { icon: '📶', label: 'MTF STACK', statusText: 'W1/D1/4H Aligned' },
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

function ComparisonSection() {
  const [signalIdx, setSignalIdx] = useState(0);
  const [stage, setStage] = useState<'entering' | 'visible' | 'exiting'>('visible');

  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Exit current signal
      setStage('exiting');
      
      // 2. Wait for exit animation to complete (500ms), update index, and start entering
      setTimeout(() => {
        setSignalIdx((prev) => (prev + 1) % TICKER_SIGNALS.length);
        setStage('entering');
        
        // 3. Render the entrance slide-up transition in the next tick
        setTimeout(() => {
          setStage('visible');
        }, 50);
      }, 500);

    }, 4500); // Cycle every 4.5 seconds

    return () => clearInterval(interval);
  }, []);

  const s = TICKER_SIGNALS[signalIdx];

  return (
    <section className="lp-comp">
      <div className="lp-comp-inner">
        
        {/* Unified Dashboard Widget */}
        <div className="lp-comp-unified-widget">
          
          {/* Left Panel: 12 Gates Processing Flow */}
          <div className="lp-comp-widget-left">
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

            {/* Grid of 12 Gates flowing like a marquee */}
            <div className="lp-comp-pipeline-flow">
              <div className="lp-comp-marquee-container">
                
                {/* Row 1 */}
                <div className="lp-comp-marquee-row">
                  <div className="lp-comp-marquee-track speed-normal">
                    {ROW_1.map((g, idx) => (
                      <div key={`r1-a-${idx}`} className="lp-comp-gate-mini-card">
                        <div className="lp-comp-gate-mini-hdr">
                          <span className="lp-comp-gate-mini-label">
                            <span style={{ marginRight: '4px' }}>{g.icon}</span> {g.label}
                          </span>
                          <span className="lp-comp-gate-mini-dot" />
                        </div>
                        <span className="lp-comp-gate-mini-status-text">{g.statusText}</span>
                      </div>
                    ))}
                    {ROW_1.map((g, idx) => (
                      <div key={`r1-b-${idx}`} className="lp-comp-gate-mini-card">
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
                </div>

                {/* Row 2 */}
                <div className="lp-comp-marquee-row">
                  <div className="lp-comp-marquee-track speed-slow">
                    {ROW_2.map((g, idx) => (
                      <div key={`r2-a-${idx}`} className="lp-comp-gate-mini-card">
                        <div className="lp-comp-gate-mini-hdr">
                          <span className="lp-comp-gate-mini-label">
                            <span style={{ marginRight: '4px' }}>{g.icon}</span> {g.label}
                          </span>
                          <span className="lp-comp-gate-mini-dot" />
                        </div>
                        <span className="lp-comp-gate-mini-status-text">{g.statusText}</span>
                      </div>
                    ))}
                    {ROW_2.map((g, idx) => (
                      <div key={`r2-b-${idx}`} className="lp-comp-gate-mini-card">
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
                </div>

                {/* Row 3 */}
                <div className="lp-comp-marquee-row">
                  <div className="lp-comp-marquee-track speed-fast">
                    {ROW_3.map((g, idx) => (
                      <div key={`r3-a-${idx}`} className="lp-comp-gate-mini-card">
                        <div className="lp-comp-gate-mini-hdr">
                          <span className="lp-comp-gate-mini-label">
                            <span style={{ marginRight: '4px' }}>{g.icon}</span> {g.label}
                          </span>
                          <span className="lp-comp-gate-mini-dot" />
                        </div>
                        <span className="lp-comp-gate-mini-status-text">{g.statusText}</span>
                      </div>
                    ))}
                    {ROW_3.map((g, idx) => (
                      <div key={`r3-b-${idx}`} className="lp-comp-gate-mini-card">
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
                </div>

              </div>
            </div>
          </div>

          {/* Right Panel: Orange Box outputting validated Trade Signals */}
          <div className="lp-comp-widget-right">
            {/* Holographic light background flare */}
            <div className="lp-comp-right-flare" />
            
            <div className="lp-comp-card-content">
              <div className="lp-comp-badge lp-comp-badge-good">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: '6px' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                VALIDATED SIGNAL
              </div>

              <h3 className="lp-comp-card-title text-white">
                Executed <br />
                <strong>Trade Signal</strong>
              </h3>
            </div>

            {/* Single signal with 3D entrance/exit animation */}
            <div className="lp-comp-signal-anim-wrap">
              <div className={`lp-comp-output-signal-card ${s.buy ? 'buy' : 'sell'} stage-${stage}`}>
                {/* Shiny glass overlay sheen */}
                <div className="lp-comp-osc-sheen" />
                
                <div className="lp-comp-osc-hdr">
                  <div className="flex items-center gap-2">
                    <span className={`lp-comp-osc-pill ${s.buy ? 'buy' : 'sell'}`}>{s.action}</span>
                    <span className="lp-comp-osc-symbol">{s.symbol}</span>
                  </div>
                  <span className={`lp-comp-osc-pct ${s.buy ? 'buy' : 'sell'}`}>{s.pct}</span>
                </div>
                
                <div className="lp-comp-osc-meta">
                  <span className="lp-comp-osc-price">{s.price}</span>
                  <span className="lp-comp-osc-dot-sep">·</span>
                  <span className="lp-comp-osc-rr">{s.rr}</span>
                  <span className="lp-comp-osc-dot-sep">·</span>
                  <span className="lp-comp-osc-session">{s.session}</span>
                </div>
              </div>
            </div>

            {/* Dynamic log execution line */}
            <div className={`lp-comp-signal-log-footer stage-${stage}`}>
              <span className="lp-comp-signal-log-pulse" />
              <span className="lp-comp-signal-log-text">{LOGS[signalIdx]}</span>
            </div>
          </div>

          {/* Flow indicators pointing to the right (positioned absolutely over the split line) */}
          <div className="lp-comp-flow-arrow-desktop">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>

        </div>
      </div>
    </section>
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
    </>
  );
}
