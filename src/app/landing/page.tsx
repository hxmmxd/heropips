'use client';

import React, { useState, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════
   NAV DATA
   ═══════════════════════════════════════════════════════════ */
const NAV_LINKS = [
  { label: 'Signals', href: '#signals' },
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'Brokers', href: '#brokers' },
  { label: 'AI Chat', href: '#ai-chat' },
  { label: 'Pricing', href: '#pricing' },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* Lock body scroll when mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* Reset body/html for landing page scrolling */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.position = 'static';
    html.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.position = 'static';
    body.style.height = 'auto';
    return () => {
      html.style.position = '';
      html.style.overflow = '';
      html.style.height = '';
      body.style.position = '';
      body.style.height = '';
    };
  }, []);

  /* ── Canvas Shifting Chess Grid Animation ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    
    // Grid settings (large blocks for premium dashboard look)
    const cellSize = 88;
    let cols = 0;
    let rows = 0;

    // Premium Color Palette
    const colors = {
      bg: '#12100c', // Deep bronze/gold dark matte background
      gridLine: 'rgba(212, 163, 89, 0.035)', // Mild golden grid lines
      dotColor: 'rgba(212, 163, 89, 0.07)',  // Mild golden intersection dots
      blocks: [
        { fill: 'rgba(232, 90, 36, 0.85)', glow: 'rgba(232, 90, 36, 0.35)' }, // Xyro Orange
        { fill: 'rgba(217, 119, 6, 0.8)', glow: 'rgba(217, 119, 6, 0.3)' },   // Amber Gold
        { fill: 'rgba(153, 27, 27, 0.85)', glow: 'rgba(153, 27, 27, 0.3)' },  // Deep Red/Maroon
        { fill: 'rgba(20, 20, 25, 0.95)', glow: 'rgba(255, 255, 255, 0.02)' }, // Matte Charcoal
        { fill: 'rgba(17, 24, 39, 0.95)', glow: 'rgba(255, 255, 255, 0.02)' },  // Gunmetal Dark
        { fill: 'rgba(30, 41, 59, 0.9)', glow: 'rgba(255, 255, 255, 0.03)' },  // Muted Slate
      ]
    };

    interface AnimBlock {
      id: number;
      col: number;
      row: number;
      targetCol: number;
      targetRow: number;
      progress: number; // 0 to 1
      colorIndex: number;
      speed: number;
      delay: number;
      label: string;
    }

    let blocks: AnimBlock[] = [];
    const maxBlocks = 17;

    const gateLabels = [
      'Confluence', 'SMC Conf.', 'HTF Align', 'Session Filter',
      'Volatility', 'No Conflict', 'Cooldown', 'News Event',
      'Correlation', 'MTF Stack', 'VWAP Filter', 'Candle Pattern',
      'Lunar Align', 'Planet Aspect', 'Mercury Risk', 'Eclipse Block',
      'Seasonal Cycle'
    ];

    // Center Lane settings
    let minCenterCol = 0;
    let maxCenterCol = 0;
    const centerLaneWidth = 820; // Width in pixels to reserve for center content lane

    const isCenterCol = (c: number) => c >= minCenterCol && c <= maxCenterCol;

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);

      cols = Math.ceil(width / cellSize) + 1;
      rows = Math.ceil(height / cellSize) + 1;

      const centerX = width / 2;
      minCenterCol = Math.floor((centerX - centerLaneWidth / 2) / cellSize);
      maxCenterCol = Math.ceil((centerX + centerLaneWidth / 2) / cellSize) - 1;

      // Helper to generate a valid side column (left or right side of center lane)
      const getRandomSideCol = () => {
        const leftCount = Math.max(0, minCenterCol);
        const rightStart = maxCenterCol + 1;
        const rightCount = Math.max(0, cols - rightStart);
        
        if (leftCount > 0 && rightCount > 0) {
          if (Math.random() < 0.5) {
            return Math.floor(Math.random() * leftCount);
          } else {
            return rightStart + Math.floor(Math.random() * rightCount);
          }
        } else if (leftCount > 0) {
          return Math.floor(Math.random() * leftCount);
        } else if (rightCount > 0) {
          return rightStart + Math.floor(Math.random() * rightCount);
        }
        return 0;
      };

      // Initialize blocks if empty
      if (blocks.length === 0) {
        for (let i = 0; i < maxBlocks; i++) {
          const col = getRandomSideCol();
          const row = Math.floor(Math.random() * (rows - 2)) + 1;
          const colorIndex = Math.floor(Math.random() * colors.blocks.length);
          const label = gateLabels[i] || 'Confluence';
          blocks.push({
            id: i,
            col,
            row,
            targetCol: col,
            targetRow: row,
            progress: 1,
            colorIndex,
            speed: 0.006 + Math.random() * 0.008,
            delay: Math.floor(Math.random() * 120),
            label,
          });
        }
      } else {
        // Adjust existing blocks if they end up inside the center lane or header on resize
        blocks.forEach(b => {
          if (isCenterCol(b.col) || isCenterCol(b.targetCol)) {
            const newCol = getRandomSideCol();
            b.col = newCol;
            b.targetCol = newCol;
            b.progress = 1;
          }
          if (b.row < 1 || b.targetRow < 1) {
            b.row = 1;
            b.targetRow = 1;
            b.progress = 1;
          }
        });
      }
    }

    // Mouse spotlight interaction coordinates
    let mouseX = -1000;
    let mouseY = -1000;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    resize();

    // Check if cell is occupied
    function isCellOccupied(c: number, r: number, id: number) {
      return blocks.some(b => {
        if (b.id === id) return false;
        const isCurrent = b.col === c && b.row === r;
        const isTarget = b.targetCol === c && b.targetRow === r;
        return isCurrent || isTarget;
      });
    }

    function draw() {
      if (!ctx) return;

      // Base background fill
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      // Micro-animated breathing pulse for glowing auras
      const pulse = 1 + 0.08 * Math.sin(Date.now() * 0.001);

      // Luminous amber aura on the left (behind the left-side grid blocks)
      const leftGlow = ctx.createRadialGradient(width * 0.15, height * 0.5, 0, width * 0.15, height * 0.5, 480 * pulse);
      leftGlow.addColorStop(0, 'rgba(217, 119, 6, 0.18)'); // Amber Gold
      leftGlow.addColorStop(0.5, 'rgba(217, 119, 6, 0.05)');
      leftGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = leftGlow;
      ctx.fillRect(0, 0, width, height);

      // Luminous orange aura on the right (behind the right-side grid blocks)
      const rightGlow = ctx.createRadialGradient(width * 0.85, height * 0.5, 0, width * 0.85, height * 0.5, 480 * pulse);
      rightGlow.addColorStop(0, 'rgba(232, 90, 36, 0.15)'); // Xyro Orange
      rightGlow.addColorStop(0.5, 'rgba(232, 90, 36, 0.04)');
      rightGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rightGlow;
      ctx.fillRect(0, 0, width, height);

      // Soft center golden ambient glow under the main text
      const centerGlow = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, 600 * pulse);
      centerGlow.addColorStop(0, 'rgba(212, 163, 89, 0.09)'); // Golden accent
      centerGlow.addColorStop(0.6, 'rgba(212, 163, 89, 0.02)');
      centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Subtle Grid Lines
      ctx.strokeStyle = colors.gridLine;
      ctx.lineWidth = 1;
      
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cellSize, 0);
        ctx.lineTo(c * cellSize, height);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellSize);
        ctx.lineTo(width, r * cellSize);
        ctx.stroke();
      }

      // Draw dots at grid line intersections
      ctx.fillStyle = colors.dotColor;
      for (let c = 0; c <= cols; c++) {
        for (let r = 0; r <= rows; r++) {
          ctx.beginPath();
          ctx.arc(c * cellSize, r * cellSize, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Draw Interactive Spotlight
      if (mouseX !== -1000 && mouseY !== -1000) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const spotlight = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 280);
        spotlight.addColorStop(0, 'rgba(232, 90, 36, 0.1)');
        spotlight.addColorStop(0.6, 'rgba(232, 90, 36, 0.02)');
        spotlight.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = spotlight;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // 3. Update & Draw Shifting Chess Blocks (Desktop only, hidden on mobile for clean text layout)
      if (width >= 768) {
        blocks.forEach(b => {
          if (b.progress < 1) {
            b.progress += b.speed;
            if (b.progress >= 1) {
              b.progress = 1;
              b.col = b.targetCol;
              b.row = b.targetRow;
              b.delay = Math.floor(Math.random() * 180) + 60; // Wait before moving again
            }
          } else {
            if (b.delay > 0) {
              b.delay--;
            } else {
              // Find valid adjacent cells to move to (must not be inside center column lane or top header row)
              const moves = [
                { c: b.col + 1, r: b.row },
                { c: b.col - 1, r: b.row },
                { c: b.col, r: b.row + 1 },
                { c: b.col, r: b.row - 1 }
              ].filter(m => 
                m.c >= 0 && m.c < cols && 
                m.r >= 1 && m.r < rows && 
                !isCenterCol(m.c) &&
                !isCellOccupied(m.c, m.r, b.id)
              );

              if (moves.length > 0) {
                const nextMove = moves[Math.floor(Math.random() * moves.length)];
                b.targetCol = nextMove.c;
                b.targetRow = nextMove.r;
                b.progress = 0;
                b.speed = 0.005 + Math.random() * 0.006;
              }
            }
          }

          // Interpolated display position
          const x = (b.col * (1 - b.progress) + b.targetCol * b.progress) * cellSize;
          const y = (b.row * (1 - b.progress) + b.targetRow * b.progress) * cellSize;

          const palette = colors.blocks[b.colorIndex];
          
          ctx.save();
          
          // Active neon glowing shadow for orange/gold/red blocks
          if (b.colorIndex < 3) {
            ctx.shadowColor = palette.glow;
            ctx.shadowBlur = 25;
          }

          ctx.fillStyle = palette.fill;
          const pad = 3;
          const size = cellSize - pad * 2;
          
          // Draw elegant rounded block
          const rx = x + pad;
          const ry = y + pad;
          const r = 5; // rounded corner radius
          
          ctx.beginPath();
          ctx.moveTo(rx + r, ry);
          ctx.lineTo(rx + size - r, ry);
          ctx.quadraticCurveTo(rx + size, ry, rx + size, ry + r);
          ctx.lineTo(rx + size, ry + size - r);
          ctx.quadraticCurveTo(rx + size, ry + size, rx + size - r, ry + size);
          ctx.lineTo(rx + r, ry + size);
          ctx.quadraticCurveTo(rx, ry + size, rx, ry + size - r);
          ctx.lineTo(rx, ry + r);
          ctx.quadraticCurveTo(rx, ry, rx + r, ry);
          ctx.closePath();
          ctx.fill();
          
          // Subtle crisp border to define the block edges
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.restore();

          // Monospace chess coordinate label (A1-H8)
          ctx.fillStyle = b.colorIndex < 3 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.25)';
          ctx.font = '500 9px monospace';
          ctx.fillText(b.label, rx + 10, ry + 18);

          // Technical corner symbol (+)
          ctx.fillStyle = b.colorIndex < 3 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.12)';
          ctx.fillText('+', rx + size - 12, ry + size - 8);
        });
      }

      animationFrameId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      window.location.href = `/login?prompt=${encodeURIComponent(chatInput)}`;
    }
  };

  return (
    <>
      {/* ── S1: NAVIGATION BAR ── */}
      <nav className="ld-nav" id="nav">
        <div className="ld-container ld-nav-inner">
          {/* Logo */}
          <a href="/landing" className="ld-nav-logo" id="nav-logo">
            <div className="ld-nav-logo-icon">
              <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 10L14 6L22 10V18L14 22L6 18V10Z" stroke="currentColor" strokeWidth="1.8" fill="none"/>
                <path d="M6 10L14 14L22 10" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M14 14V22" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="14" cy="14" r="2" fill="currentColor"/>
              </svg>
            </div>
            <span className="ld-nav-logo-text">XyroTrade</span>
          </a>

          {/* Center Pill with Nav Links */}
          <ul className="ld-nav-pill" id="nav-pill">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a href={link.href} id={`nav-${link.label.toLowerCase()}`}>{link.label}</a>
              </li>
            ))}
          </ul>

          {/* Right Side */}
          <div className="ld-nav-right">
            <a href="/login" className="ld-nav-login" id="nav-login">
              <span className="ld-arrow">▸</span> LOGIN <span className="ld-arrow">◂</span>
            </a>
            <a href="/login" className="ld-nav-cta" id="nav-cta">
              <span className="ld-arrow">▸</span> SIGN UP
            </a>
          </div>

          {/* Mobile Hamburger */}
          <button
            className={`ld-hamburger ${mobileOpen ? 'ld-open' : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            id="nav-hamburger"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <div className={`ld-mobile-menu ${mobileOpen ? 'ld-open' : ''}`}>
        {NAV_LINKS.map((link) => (
          <a key={link.label} href={link.href} onClick={closeMobile}>
            <span>{link.label}</span>
            <span className="ld-mobile-arrow">›</span>
          </a>
        ))}
        <a href="/login" onClick={closeMobile}>
          <span>Login</span>
          <span className="ld-mobile-arrow">›</span>
        </a>
        <a href="/login" className="ld-mobile-cta" onClick={closeMobile}>
          <span>▸</span> Sign Up
        </a>

        {/* Technical Footer */}
        <div className="ld-mobile-footer">
          <div className="ld-mobile-status">
            <span className="ld-status-dot" /> SYSTEM ONLINE (V4.2)
          </div>
          <div className="ld-mobile-copy">© 2026 XYROTRADE</div>
        </div>
      </div>

      {/* ── S2: HERO (MISTRAL STYLE) ── */}
      <section className="ld-hero" id="hero">
        {/* Shifting Chess Grid Canvas */}
        <canvas ref={canvasRef} className="ld-hero-canvas" />
        
        {/* Hero Content */}
        <div className="ld-hero-inner">
          {/* Headline */}
          <h1 className="ld-hero-headline">
            Next-Generation Trading. In Your Hands.
          </h1>

          {/* Subtitle */}
          <p className="ld-hero-desc">
            Xyro bot automates proven algorithmic strategies, turning market volatility into consistent, emotion-free profits. Start trading 24/7 with confidence.
          </p>

          {/* Chat Input Container */}
          <form className="ld-hero-chat-container" onSubmit={handleChatSubmit}>
            <input
              type="text"
              className="ld-hero-chat-input"
              placeholder="Talk to Xyro Bot"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="ld-hero-chat-btn" aria-label="Send message">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>

          {/* Links Below Input */}
          <div className="ld-hero-links">
            <a href="/login" className="ld-hero-link">
              Connect Broker <span>›</span>
            </a>
            <a href="#signals" className="ld-hero-link">
              Algorithmic Signals <span>›</span>
            </a>
          </div>
        </div>
      </section>


      {/* Solid Brand Logos Bar at the bottom of Hero Section */}
      <div className="ld-trust-logo-bar">
        <div className="ld-logos-inner">
          {/* MetaTrader 5 (MT5) */}
          <div className="ld-brand-logo" title="MetaTrader 5">
            <img src="https://logo.clearbit.com/metatrader5.com" alt="MetaTrader 5" className="ld-partner-img" />
          </div>

          {/* Binance */}
          <div className="ld-brand-logo" title="Binance">
            <img src="https://logo.clearbit.com/binance.com" alt="Binance" className="ld-partner-img" />
          </div>

          {/* Bybit */}
          <div className="ld-brand-logo" title="Bybit">
            <img src="https://logo.clearbit.com/bybit.com" alt="Bybit" className="ld-partner-img" />
          </div>

          {/* Exness */}
          <div className="ld-brand-logo" title="Exness">
            <img src="https://logo.clearbit.com/exness.com" alt="Exness" className="ld-partner-img" />
          </div>

          {/* XM */}
          <div className="ld-brand-logo" title="XM">
            <img src="https://logo.clearbit.com/xm.com" alt="XM" className="ld-partner-img" />
          </div>

          {/* IC Markets */}
          <div className="ld-brand-logo" title="IC Markets">
            <img src="https://logo.clearbit.com/icmarkets.com" alt="IC Markets" className="ld-partner-img" />
          </div>

          {/* Pepperstone */}
          <div className="ld-brand-logo" title="Pepperstone">
            <img src="https://logo.clearbit.com/pepperstone.com" alt="Pepperstone" className="ld-partner-img" />
          </div>
        </div>
      </div>


      {/* ── S3: NEXT-GENERATION QUANT EXPERIENCE ── */}
      <section className="ld-quant-section" id="features">
        <div className="ld-container">
          <h2 className="ld-section-title">Next-Generation Quant Experience</h2>
          <p className="ld-section-desc">Zero code, zero lag, direct institutional execution.</p>

          <div className="ld-quant-grid">
            {/* Card 1: Extreme Performance */}
            <div className="ld-quant-card">
              <div className="ld-quant-card-header">
                <span className="ld-quant-chip">
                  <span className="ld-quant-chip-icon">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </span>
                  Extreme Performance
                </span>
              </div>
              <div className="ld-quant-visual">
                <svg className="ld-quant-svg" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#00ff66" />
                    </linearGradient>
                    <radialGradient id="card-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(0,255,102,0.12)" />
                      <stop offset="100%" stopColor="rgba(0,255,102,0)" />
                    </radialGradient>
                  </defs>
                  
                  {/* Glow background */}
                  <circle cx="100" cy="80" r="60" fill="url(#card-glow)" />
                  
                  {/* Gauge Background Track */}
                  <path d="M40 120 A 70 70 0 0 1 160 120" stroke="#eaeae4" strokeWidth="8" strokeLinecap="round" />
                  {/* Gauge Filled Track */}
                  <path d="M40 120 A 70 70 0 0 1 160 120" stroke="url(#gauge-grad)" strokeWidth="8" strokeLinecap="round" strokeDasharray="377" strokeDashoffset="105" />
                  
                  {/* Ticks */}
                  <line x1="45" y1="110" x2="52" y2="106" stroke="#dcdcd6" strokeWidth="1.5"/>
                  <line x1="60" y1="80" x2="68" y2="80" stroke="#dcdcd6" strokeWidth="1.5"/>
                  <line x1="100" y1="50" x2="100" y2="58" stroke="#dcdcd6" strokeWidth="1.5"/>
                  <line x1="140" y1="80" x2="148" y2="80" stroke="#dcdcd6" strokeWidth="1.5"/>
                  <line x1="148" y1="106" x2="155" y2="110" stroke="#dcdcd6" strokeWidth="1.5"/>
                  
                  {/* Speedometer Needle */}
                  <line x1="100" y1="120" x2="100" y2="65" stroke="#000000" strokeWidth="3" strokeLinecap="round" className="ld-svg-needle" />
                  <circle cx="100" cy="120" r="6" fill="#000000" />
                  
                  {/* Speed text */}
                  <text x="100" y="90" textAnchor="middle" fill="#000000" fontSize="24" fontWeight="900" style={{ fontFamily: 'system-ui, sans-serif' }}>8.4ms</text>
                  
                  {/* Status Badge */}
                  <rect x="70" y="100" width="60" height="12" rx="6" fill="#0d0d0d" />
                  <text x="100" y="109" textAnchor="middle" fill="#00ff66" fontSize="7" fontWeight="800" letterSpacing="0.04em" style={{ fontFamily: 'system-ui, sans-serif' }}>DMA ACTIVE</text>
                  
                  {/* Floating Specs Card */}
                  <g filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.06))">
                    <rect x="25" y="128" width="150" height="24" rx="6" fill="#ffffff" stroke="#eaeae4" strokeWidth="1" />
                    <circle cx="35" cy="140" r="2.5" fill="#ff5f56" />
                    <circle cx="42" cy="140" r="2.5" fill="#ffbd2e" />
                    <circle cx="49" cy="140" r="2.5" fill="#27c93f" />
                    <text x="108" y="144" textAnchor="middle" fill="#55554f" fontSize="8" fontWeight="600" style={{ fontFamily: 'monospace' }}>ROUTE: NY4-EQUINIX</text>
                  </g>
                </svg>
              </div>
              <h3 className="ld-quant-heading">Ultra-Low Latency DMA</h3>
              <p className="ld-quant-desc">Execute trades directly to institutional liquidity pools. Sub-10ms latency ensures minimal slippage and maximum fill rate.</p>
            </div>

            {/* Card 2: Risk Filtration */}
            <div className="ld-quant-card">
              <div className="ld-quant-card-header">
                <span className="ld-quant-chip">
                  <span className="ld-quant-chip-icon">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  Risk Engine
                </span>
              </div>
              <div className="ld-quant-visual">
                <svg className="ld-quant-svg" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="gate-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00ff66" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Flow chart step lines */}
                  <path d="M30 80h140" stroke="#eaeae4" strokeWidth="3" strokeLinecap="round" />
                  <path d="M30 80h80" stroke="url(#gate-grad)" strokeWidth="3" strokeLinecap="round" className="ld-dash-flow" />
                  
                  {/* Moving pulse */}
                  <circle cx="30" cy="80" r="4" fill="#ffffff" stroke="#10b981" strokeWidth="1.5">
                    <animate attributeName="cx" values="30;110;110" dur="2.5s" repeatCount="indefinite" />
                  </circle>

                  {/* Node 1 */}
                  <g transform="translate(35, 80)">
                    <circle cx="0" cy="0" r="16" fill="#ffffff" stroke="url(#gate-grad)" strokeWidth="3" className="ld-pulse-node" />
                    <text x="0" y="4" textAnchor="middle" fill="#000" fontSize="11" fontWeight="800" style={{ fontFamily: 'system-ui, sans-serif' }}>17</text>
                    <text x="0" y="26" textAnchor="middle" fill="#8a8a80" fontSize="7.5" fontWeight="700" letterSpacing="0.05em" style={{ fontFamily: 'system-ui, sans-serif' }}>GATES</text>
                  </g>
                  
                  {/* Node 2 */}
                  <g transform="translate(110, 80)">
                    <circle cx="0" cy="0" r="16" fill="url(#gate-grad)" />
                    <path d="M-5 0l3 3 6-6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="0" y="26" textAnchor="middle" fill="#10b981" fontSize="7.5" fontWeight="800" letterSpacing="0.05em" style={{ fontFamily: 'system-ui, sans-serif' }}>PASSED</text>
                  </g>
                  
                  {/* Node 3 */}
                  <g transform="translate(165, 80)">
                    <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#eaeae4" strokeWidth="2" />
                    <circle cx="0" cy="0" r="4" fill="#8a8a80" />
                    <text x="0" y="26" textAnchor="middle" fill="#8a8a80" fontSize="7.5" fontWeight="700" letterSpacing="0.05em" style={{ fontFamily: 'system-ui, sans-serif' }}>EXECUTE</text>
                  </g>
                  
                  {/* Toggle switch representation */}
                  <g transform="translate(85, 128)">
                    <rect x="0" y="0" width="30" height="16" rx="8" fill="#00ff66" />
                    <circle cx="22" cy="8" r="6" fill="#ffffff" />
                  </g>
                </svg>
              </div>
              <h3 className="ld-quant-heading">17-Gate Confirmation</h3>
              <p className="ld-quant-desc">Every trade ticket must pass through 17 advanced filters. Discards setups during news, high spread, or range chop.</p>
            </div>

            {/* Card 3: Global Routing */}
            <div className="ld-quant-card">
              <div className="ld-quant-card-header">
                <span className="ld-quant-chip">
                  <span className="ld-quant-chip-icon">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </span>
                  Global Network
                </span>
              </div>
              <div className="ld-quant-visual">
                <svg className="ld-quant-svg" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="map-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(0, 255, 102, 0.12)" />
                      <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                    </radialGradient>
                  </defs>
                  
                  {/* Subtle map glow */}
                  <rect x="10" y="10" width="180" height="140" rx="8" fill="url(#map-glow)" />

                  {/* Dotted Map Outlines */}
                  {/* North America */}
                  <circle cx="35" cy="40" r="3" fill="#eaeae4" /><circle cx="45" cy="45" r="4" fill="#eaeae4" /><circle cx="55" cy="42" r="3" fill="#eaeae4" /><circle cx="38" cy="50" r="3" fill="#eaeae4" /><circle cx="48" cy="55" r="4" fill="#eaeae4" />
                  {/* South America */}
                  <circle cx="52" cy="75" r="3" fill="#eaeae4" /><circle cx="58" cy="85" r="3" fill="#eaeae4" /><circle cx="62" cy="95" r="2" fill="#eaeae4" />
                  {/* Europe & Africa */}
                  <circle cx="95" cy="38" r="4" fill="#eaeae4" /><circle cx="105" cy="42" r="3" fill="#eaeae4" /><circle cx="98" cy="55" r="3" fill="#eaeae4" /><circle cx="102" cy="70" r="4" fill="#eaeae4" /><circle cx="106" cy="85" r="3" fill="#eaeae4" />
                  {/* Asia */}
                  <circle cx="135" cy="35" r="3" fill="#eaeae4" /><circle cx="145" cy="42" r="4" fill="#eaeae4" /><circle cx="155" cy="48" r="3" fill="#eaeae4" /><circle cx="140" cy="55" r="3" fill="#eaeae4" /><circle cx="150" cy="65" r="4" fill="#eaeae4" /><circle cx="165" cy="95" r="3" fill="#eaeae4" />

                  {/* Network paths */}
                  <path d="M48 55 C 70 50, 80 50, 98 55" stroke="rgba(0, 255, 102, 0.4)" strokeWidth="1.2" strokeDasharray="3 3" />
                  <path d="M98 55 C 120 58, 130 60, 150 65" stroke="rgba(0, 255, 102, 0.4)" strokeWidth="1.2" strokeDasharray="3 3" />

                  {/* NY4 Hub */}
                  <g transform="translate(48, 55)">
                    <circle cx="0" cy="0" r="3.5" fill="#00ff66" />
                    <circle cx="0" cy="0" r="3.5" stroke="#00ff66" strokeWidth="1.5" fill="none" className="ld-radar-ring" />
                    <text x="0" y="-8" textAnchor="middle" fill="#000000" fontSize="7" fontWeight="800" style={{ fontFamily: 'system-ui, sans-serif' }}>NY4 0.8ms</text>
                  </g>

                  {/* LD4 Hub */}
                  <g transform="translate(98, 55)">
                    <circle cx="0" cy="0" r="3.5" fill="#00ff66" />
                    <circle cx="0" cy="0" r="3.5" stroke="#00ff66" strokeWidth="1.5" fill="none" className="ld-radar-ring" />
                    <text x="0" y="-8" textAnchor="middle" fill="#000000" fontSize="7" fontWeight="800" style={{ fontFamily: 'system-ui, sans-serif' }}>LD4 1.2ms</text>
                  </g>

                  {/* SG1 Hub */}
                  <g transform="translate(150, 65)">
                    <circle cx="0" cy="0" r="3.5" fill="#00ff66" />
                    <circle cx="0" cy="0" r="3.5" stroke="#00ff66" strokeWidth="1.5" fill="none" className="ld-radar-ring" />
                    <text x="0" y="-8" textAnchor="middle" fill="#000000" fontSize="7" fontWeight="800" style={{ fontFamily: 'system-ui, sans-serif' }}>SG1 5.2ms</text>
                  </g>

                  {/* Terminal block */}
                  <g filter="drop-shadow(0px 6px 12px rgba(0,0,0,0.1))">
                    <rect x="25" y="116" width="150" height="30" rx="5" fill="#0a0a0a" stroke="#1c1c1c" strokeWidth="1" />
                    <text x="32" y="126" fill="#8a8a80" fontSize="7.5" style={{ fontFamily: 'monospace' }}>$ tradegpt route --node=NY4</text>
                    <text x="32" y="137" fill="#00ff66" fontSize="7.5" style={{ fontFamily: 'monospace' }}>&gt; ROUTE OPTIMIZED VIA FIBER</text>
                  </g>
                </svg>
              </div>
              <h3 className="ld-quant-heading">Multi-Hub Co-location</h3>
              <p className="ld-quant-desc">Your strategies run in isolated containers hosted in Equinix datacenters adjacent to your broker's trade servers.</p>
            </div>

            {/* Card 4: Integrations */}
            <div className="ld-quant-card">
              <div className="ld-quant-card-header">
                <span className="ld-quant-chip">
                  <span className="ld-quant-chip-icon">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </span>
                  Integrations
                </span>
              </div>
              <div className="ld-quant-visual">
                <svg className="ld-quant-svg" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(0,255,102,0.1)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                    </radialGradient>
                  </defs>
                  
                  {/* Glowing background */}
                  <circle cx="100" cy="80" r="60" fill="url(#ring-glow)" />

                  {/* Outer dashed ring */}
                  <circle cx="100" cy="80" r="45" stroke="#eaeae4" strokeWidth="1.5" strokeDasharray="4 4" className="ld-spin-slow" />

                  {/* Connecting fiber lines */}
                  <line x1="100" y1="80" x2="60" y2="40" stroke="#eaeae4" strokeWidth="1.5" />
                  <line x1="100" y1="80" x2="140" y2="40" stroke="#eaeae4" strokeWidth="1.5" />
                  <line x1="100" y1="80" x2="60" y2="120" stroke="#eaeae4" strokeWidth="1.5" />
                  <line x1="100" y1="80" x2="140" y2="120" stroke="#eaeae4" strokeWidth="1.5" />

                  {/* Pulse particles flowing along connectors */}
                  <circle cx="100" cy="80" r="45" stroke="#00ff66" strokeWidth="1.5" strokeDasharray="12 88" strokeDashoffset="0">
                    <animate attributeName="strokeDashoffset" values="360;0" dur="5s" repeatCount="indefinite" />
                  </circle>

                  {/* Center Node */}
                  <circle cx="100" cy="80" r="18" fill="#000000" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.3))" />
                  <text x="100" y="83" textAnchor="middle" fill="#00ff66" fontSize="7.5" fontWeight="950" letterSpacing="-0.04em" style={{ fontFamily: 'system-ui, sans-serif' }}>XYRO</text>

                  {/* MT5 Node */}
                  <g transform="translate(60, 40)">
                    <circle cx="0" cy="0" r="13" fill="#ffffff" stroke="#f1f1eb" strokeWidth="1.5" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.03))" />
                    <path d="M-5 3V-5l3 3 3-3v8" stroke="#1a73e8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </g>

                  {/* TradingView Node */}
                  <g transform="translate(140, 40)">
                    <circle cx="0" cy="0" r="13" fill="#ffffff" stroke="#f1f1eb" strokeWidth="1.5" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.03))" />
                    <path d="M-5 3l3-6 2 3 4-5" stroke="#f7a600" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </g>

                  {/* Telegram Node */}
                  <g transform="translate(60, 120)">
                    <circle cx="0" cy="0" r="13" fill="#ffffff" stroke="#f1f1eb" strokeWidth="1.5" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.03))" />
                    <path d="M-5 0l9-4-2 7-3-2-2 1v-2z" fill="#0088cc" />
                  </g>

                  {/* Python Node */}
                  <g transform="translate(140, 120)">
                    <circle cx="0" cy="0" r="13" fill="#ffffff" stroke="#f1f1eb" strokeWidth="1.5" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.03))" />
                    <path d="M-4-2.5c0-1 1-1.5 2-1.5s2 .5 2 1.5v1.5H-4V-2.5zm5 5c0 1-.5 1.5-2 1.5s-2-.5-2-1.5v-1.5h4v1.5z" fill="#306998" />
                    <path d="M-1-2.5v1.5M1 2.5v1.5" stroke="#ffd43b" strokeWidth="1.2" />
                  </g>
                </svg>
              </div>
              <h3 className="ld-quant-heading">Integrate With Anything</h3>
              <p className="ld-quant-desc">Connect any platform. Receive signals on Telegram, execute from TradingView webhooks, or build custom bots via our Python SDK.</p>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
