'use client';

import React, { useEffect, useState } from 'react';

/* ── Changelog Data ─────────────────────────────────────────────── */
interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  summary: string;
  tag: 'major' | 'feature' | 'fix' | 'improvement';
  items: { icon: string; title: string; description: string }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '1.6.0',
    date: 'May 30, 2026',
    title: 'Smart Money Scanner & Exchange Hub',
    summary: 'Intelligent SMC pattern detection engine, reimagined multi-exchange connection modal, and user-scoped broker management.',
    tag: 'major',
    items: [
      { icon: '🧠', title: 'Smart Money Concepts Scanner', description: 'Algorithmic detection for Break of Structure (BOS), Change of Character (ChoCH), Fair Value Gaps, Order Blocks, Liquidity Sweeps, and Equal Highs/Lows with a 1–10 confluence scoring engine.' },
      { icon: '🔌', title: 'Reimagined Connect Exchange Modal', description: 'Premium 2-step flow with pill-based exchange selection (MT5, MT4, cTrader, Binance, Bybit), brand-colored UI, and dynamic credential forms.' },
      { icon: '⚡', title: 'Universal Trading Engine', description: 'Adapter pattern supporting MetaTrader + Binance/Bybit/OKX crypto exchanges with HMAC signing and unified order routing.' },
      { icon: '🏗️', title: 'Broker Integration Hub', description: 'Provider CRUD with test connection, Add Provider modal with dynamic fields per exchange type, and full audit logging.' },
      { icon: '👤', title: 'User-Scoped Broker Accounts', description: 'Each user now only sees their own connected brokers. New users start with an empty list.' },
      { icon: '🗑️', title: 'Broker Disconnect', description: 'Hover-reveal disconnect button on broker cards with 2-click confirm pattern and animated loading state.' },
      { icon: '☁️', title: 'Vercel Deployment Fixes', description: 'Lazy-initialized Supabase admin client + safe env var fallbacks across all server files to prevent build-time crashes.' },
    ]
  },
  {
    version: '1.5.0',
    date: 'May 25, 2026',
    title: 'Enterprise Admin Panel & Auth',
    summary: 'Full Supabase authentication, subscription management, enterprise admin dashboard with analytics, and platform configuration.',
    tag: 'major',
    items: [
      { icon: '🔐', title: 'Authentication System', description: 'Login/signup with Supabase Auth, middleware route guards, OAuth callback, and a premium glassmorphic login UI.' },
      { icon: '👤', title: 'User Profile & Settings', description: 'Avatar upload, change password, real auth data in sidebar, popup menu, and dedicated Settings page.' },
      { icon: '💎', title: 'Subscription Plans', description: '3-tier pricing (Free / Pro / Enterprise) with feature comparison cards and plan upgrade flow.' },
      { icon: '👨‍💼', title: 'Admin Dashboard', description: 'KPI cards, plan distribution chart, sortable user table with filters, bulk actions, pagination, and CSV export.' },
      { icon: '📊', title: 'Admin Analytics', description: 'Brokers/Trades/Analytics tabs, system health monitoring, revenue chart, and trade activity feeds.' },
      { icon: '✏️', title: 'Inline User Editing', description: 'Edit name, email, and plan directly in the user table with live save to Supabase Auth + Database.' },
      { icon: '⚙️', title: 'Platform Configuration', description: 'Feature flags, announcements system, audit log, user suspension, and plan pricing editor.' },
      { icon: '📈', title: 'Intelligence Engine', description: 'Signup/revenue trends, trade KPIs, top traded symbols, and configurable risk rules engine.' },
    ]
  },
  {
    version: '1.4.0',
    date: 'May 25, 2026',
    title: 'Broker Engine & Trade Execution',
    summary: 'MetaAPI SDK integration for live MT5 trading, manual trade execution from AI signals, and voice input.',
    tag: 'feature',
    items: [
      { icon: '🏦', title: 'MetaAPI Broker Engine', description: 'Live MT5 broker connection via MetaAPI Cloud SDK with account creation, RPC connections, and real-time account info.' },
      { icon: '✅', title: 'Trade Execution', description: 'Confirm Execution button on trade cards sends live orders to the selected broker account via /api/execute.' },
      { icon: '🎤', title: 'Voice Input', description: 'Web Speech-to-Text (SpeechRecognition API) for speak-to-type voice commands in the AI terminal.' },
      { icon: '🔄', title: 'NVIDIA API Rotation', description: 'Round-robin key rotation across multiple NVIDIA API keys for load distribution.' },
      { icon: '🛡️', title: 'TypeScript Migration', description: 'Replaced Python indicator engine with pure TypeScript for full Vercel compatibility.' },
    ]
  },
  {
    version: '1.3.0',
    date: 'May 25, 2026',
    title: 'Multi-Agent Intelligence',
    summary: 'Master Trading Agent with multi-agent orchestration, consensus rendering, and advanced markdown parsing.',
    tag: 'feature',
    items: [
      { icon: '🤖', title: 'Master Trading Agent', description: 'Multi-agent orchestration with Technical Analyst, Fundamental Analyst, Sentiment Analyst, and Risk Manager.' },
      { icon: '📰', title: 'Live News Ticker', description: 'RSS financial headlines with infinite marquee animation, hover-to-pause, and news sentiment analysis.' },
      { icon: '🎯', title: 'Consensus Rendering', description: 'Ultra-short, punchy agent bullet points with auto-bold titles and SVG icons.' },
      { icon: '🔧', title: 'Fault-Tolerant Parsing', description: 'FlexibleJsonParse with regex extractor fallback for reliable JSON parsing from LLM output.' },
    ]
  },
  {
    version: '1.2.0',
    date: 'May 24, 2026',
    title: 'Market Data & Charting',
    summary: 'TradingView charts, asset watchlist, rich analysis cards with live market data integration.',
    tag: 'feature',
    items: [
      { icon: '📊', title: 'Mini Candlestick Charts', description: 'TradingView lightweight-charts v5 embedded in analysis cards with proper Unix timestamp handling.' },
      { icon: '🪙', title: 'Asset Watchlist', description: '9 asset pills with authentic SVG brand logos for instant analysis.' },
      { icon: '📈', title: 'Rich Analysis Cards', description: 'Coin icons, indicator tables, confluence strength bars, and embedded Generate Signal button.' },
      { icon: '🌐', title: 'Twelve Data Integration', description: 'Live market feed optimized for free tier (5 API calls), ETF symbol mapping for indices.' },
    ]
  },
  {
    version: '1.1.0',
    date: 'May 24, 2026',
    title: 'AI Trading Engine',
    summary: 'Institutional-grade signal engine with NVIDIA NIM inference, trade cards, and smart trigger system.',
    tag: 'feature',
    items: [
      { icon: '🧠', title: 'Signal Engine', description: 'Multi-indicator confluence analysis with ATR-based risk management for institutional-grade trade signals.' },
      { icon: '⚡', title: 'NVIDIA NIM API', description: 'Llama 3.1 8B inference for fast, reliable AI responses with streaming support.' },
      { icon: '🃏', title: 'Trade Cards', description: 'Proper contract specs per instrument, realistic stop-loss distances, correct lot sizing, and SVG icons.' },
      { icon: '🎯', title: 'Smart Triggers', description: 'Trade cards only on direct asset queries or button click; general chat responds conversationally.' },
    ]
  },
  {
    version: '1.0.0',
    date: 'May 24, 2026',
    title: 'Foundation',
    summary: 'Initial Next.js PWA with AI chat terminal, mobile-first design, and iOS optimization.',
    tag: 'major',
    items: [
      { icon: '🚀', title: 'Next.js PWA', description: 'Mobile-first Progressive Web App with standalone mode and dynamic viewport scaling.' },
      { icon: '💬', title: 'AI Chat Terminal', description: 'Dark-themed institutional trading terminal with chat API routes and cipher decode animation.' },
      { icon: '🎨', title: 'Theme System', description: 'Light/dark mode toggle with interactive Lightbulb icon and synthesized click sounds.' },
      { icon: '📱', title: 'iOS Optimizations', description: 'Fixed focus scroll shifting, disabled autocomplete/autocorrect, keyboard cleanup.' },
    ]
  }
];

const tagStyles: Record<string, { bg: string; color: string; label: string }> = {
  major:       { bg: 'rgba(139,92,246,0.1)', color: '#a78bfa', label: 'Major Release' },
  feature:     { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa', label: 'Feature' },
  fix:         { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24', label: 'Fix' },
  improvement: { bg: 'rgba(52,211,153,0.1)',  color: '#34d399', label: 'Improvement' },
};

/* ── Page ────────────────────────────────────────────────────────── */
export default function ChangelogPage() {
  const [activeVersion, setActiveVersion] = useState(changelog[0].version);

  // Track scroll position to highlight active nav item
  useEffect(() => {
    const container = document.querySelector('.cl-page');
    if (!container) return;
    const handleScroll = () => {
      for (const entry of changelog) {
        const el = document.getElementById(`v${entry.version}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) setActiveVersion(entry.version);
        }
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (version: string) => {
    const el = document.getElementById(`v${version}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="cl-page">
      {/* Mobile Header */}
      <div className="cl-mobile-header">
        <a href="/">← Dashboard</a>
        <span>Changelog</span>
        <span style={{ width: 70 }} />
      </div>

      {/* Sidebar */}
      <aside className="cl-sidebar">
        <div className="cl-sidebar-header">
          <a href="/" className="cl-sidebar-logo">
            <div className="cl-sidebar-logo-icon">T</div>
            TradeGPT
          </a>
        </div>

        <nav className="cl-sidebar-nav">
          <div className="cl-nav-label">Releases</div>
          {changelog.map((entry) => (
            <a
              key={entry.version}
              className={`cl-nav-item ${activeVersion === entry.version ? 'cl-nav-item--active' : ''}`}
              onClick={() => scrollTo(entry.version)}
            >
              <span className="cl-nav-dot" />
              <span>v{entry.version} — {entry.title}</span>
            </a>
          ))}
        </nav>

        <div className="cl-sidebar-back">
          <a href="/">← Back to Dashboard</a>
        </div>
      </aside>

      {/* Main */}
      <main className="cl-main">
        {/* Hero */}
        <div className="cl-hero">
          <div className="cl-hero-badge">CHANGELOG</div>
          <h1>What&apos;s New in TradeGPT</h1>
          <p>Every feature, fix, and improvement — shipped and documented.</p>
          <div className="cl-stats-row">
            <div className="cl-stat-pill"><strong>65</strong> <span>commits</span></div>
            <div className="cl-stat-pill"><strong>19.7K</strong> <span>lines written</span></div>
            <div className="cl-stat-pill"><strong>7</strong> <span>API endpoints</span></div>
            <div className="cl-stat-pill"><strong>4</strong> <span>integrations</span></div>
          </div>
        </div>

        {/* Releases */}
        <div className="cl-releases">
          {changelog.map((entry) => {
            const tag = tagStyles[entry.tag];
            return (
              <div key={entry.version} id={`v${entry.version}`} className="cl-release">
                <div className="cl-release-header">
                  <span className="cl-release-version">v{entry.version}</span>
                  <span className="cl-release-tag" style={{ background: tag.bg, color: tag.color }}>
                    {tag.label}
                  </span>
                  <span className="cl-release-date">{entry.date}</span>
                </div>
                <h2 className="cl-release-title">{entry.title}</h2>
                <p className="cl-release-desc">{entry.summary}</p>

                <div className="cl-item-list">
                  {entry.items.map((item, i) => (
                    <div key={i} className="cl-item">
                      <span className="cl-item-icon">{item.icon}</span>
                      <div className="cl-item-body">
                        <span className="cl-item-title">{item.title}</span>
                        <p className="cl-item-desc">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="cl-footer">
          <p>Built with 🧠 by the TradeGPT team</p>
        </footer>
      </main>
    </div>
  );
}
