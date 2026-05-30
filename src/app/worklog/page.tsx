'use client';

import React, { useEffect, useState } from 'react';

/* ── Work Log Data — Organized by Day ───────────────────────────── */
interface WorkItem {
  icon: string;
  title: string;
  description: string;
  files?: string[];
}

interface WorkBlock {
  tag: 'major' | 'feature' | 'fix' | 'improvement' | 'infra';
  time: string;   // e.g. '09:45 AM'
  title: string;
  summary: string;
  items: WorkItem[];
}

interface WorkDay {
  date: string;
  dayLabel: string;
  commitCount: number;
  blocks: WorkBlock[];
}

const tagStyles: Record<string, { bg: string; color: string; label: string }> = {
  major:       { bg: '#eef2ff', color: '#4f46e5', label: 'Major' },
  feature:     { bg: '#eff6ff', color: '#2563eb', label: 'Feature' },
  fix:         { bg: '#fefce8', color: '#ca8a04', label: 'Bug Fix' },
  improvement: { bg: '#ecfdf5', color: '#059669', label: 'Improvement' },
  infra:       { bg: '#fdf4ff', color: '#9333ea', label: 'Infrastructure' },
};

const worklog: WorkDay[] = [
  {
    date: 'May 30, 2026',
    dayLabel: 'Friday',
    commitCount: 10,
    blocks: [
      { tag: 'major', time: '09:15 AM',
        title: 'Smart Money Concepts Scanner',
        summary: 'Built an algorithmic SMC pattern detection engine that scans OHLCV candle data and outputs institutional-grade structure analysis with a confluence scoring system.',
        items: [
          { icon: '📐', title: 'Break of Structure (BOS) Detection', description: 'Identifies when price breaks a recent swing high or low, signaling continuation of the prevailing trend. Tracks both bullish and bearish BOS events with exact candle timestamps.', files: ['scanner.ts'] },
          { icon: '🔄', title: 'Change of Character (ChoCH)', description: 'Detects when price breaks structure against the trend, signaling a potential reversal. Differentiates between bullish-to-bearish and bearish-to-bullish transitions.', files: ['scanner.ts'] },
          { icon: '📊', title: 'Fair Value Gap (FVG) Detection', description: 'Scans for 3-candle imbalance zones where the wick of candle 1 doesn\'t overlap with candle 3, creating an unfilled price gap. Filters by minimum size threshold.', files: ['scanner.ts'] },
          { icon: '🧱', title: 'Order Block Identification', description: 'Finds the last opposite-colored candle before a BOS event — institutional entry zones where large orders were placed.', files: ['scanner.ts'] },
          { icon: '💧', title: 'Liquidity Sweep Detection', description: 'Identifies equal highs/lows (liquidity pools) and detects when price sweeps past them before reversing — a classic smart money trap pattern.', files: ['scanner.ts'] },
          { icon: '🎯', title: 'Confluence Scoring Engine', description: 'Combines all detected patterns into a 1–10 confluence score. Higher scores indicate multiple overlapping SMC structures, increasing trade probability.', files: ['scanner.ts', 'api/scan/route.ts'] },
        ]
      },
      { tag: 'feature', time: '11:30 AM',
        title: 'Universal Trading Engine',
        summary: 'Implemented an adapter pattern that unifies trade execution across MetaTrader and crypto exchanges through a single interface.',
        items: [
          { icon: '⚡', title: 'Adapter Architecture', description: 'Created a base TradingAdapter interface with implementations for MetaTrader (via MetaAPI) and crypto exchanges (Binance, Bybit, OKX). Each adapter handles authentication, order submission, and position management differently but exposes the same API.', files: ['broker.ts'] },
          { icon: '🔐', title: 'HMAC Request Signing', description: 'Crypto exchange adapters generate HMAC-SHA256 signatures for authenticated API requests, following each exchange\'s specific signing algorithm with timestamp-based nonces.', files: ['broker.ts'] },
          { icon: '🔀', title: 'Unified Order Routing', description: 'Single executeTrade() function routes orders to the correct adapter based on the broker\'s exchange type. Handles symbol normalization (XAUUSD → XAUUSD.raw for MT5, BTC/USDT for Binance).', files: ['broker.ts', 'api/execute/route.ts'] },
        ]
      },
      { tag: 'feature', time: '01:45 PM',
        title: 'Reimagined Connect Exchange Modal',
        summary: 'Completely rebuilt the broker connection UI with a 2-step flow, exchange-specific branding, and dynamic form fields.',
        items: [
          { icon: '🎨', title: 'Exchange Selection Pills', description: 'Step 1 presents branded pill buttons for MT5, MT4, cTrader, Binance, and Bybit — each with its brand color (blue, indigo, purple, amber, orange). Selected state shows a gradient border with glow effect.', files: ['ModalNode.tsx'] },
          { icon: '📝', title: 'Dynamic Credential Forms', description: 'Step 2 renders different form fields based on exchange type: Forex exchanges show Server/Login ID/Password; crypto exchanges show API Key/Secret Key/Passphrase.', files: ['ModalNode.tsx'] },
          { icon: '👁️', title: 'Password Toggle & UX', description: 'Added eye icon to toggle password visibility, encrypted data disclaimer, smooth step transitions with back button, and loading states.', files: ['ModalNode.tsx', 'globals.css'] },
        ]
      },
      { tag: 'infra', time: '03:20 PM',
        title: 'Broker Integration Hub (Admin)',
        summary: 'Added a full provider management system in the admin panel for configuring exchange connections server-side.',
        items: [
          { icon: '🗄️', title: 'Provider CRUD', description: 'Admins can add, edit, and delete broker providers. Each provider stores exchange type, API credentials, rate limits, and connection status.', files: ['admin/page.tsx', 'api/admin/route.ts'] },
          { icon: '🔌', title: 'Test Connection', description: 'One-click health check button that validates API credentials against the exchange and reports connection status with latency metrics.', files: ['admin/page.tsx'] },
          { icon: '📋', title: 'Audit Logging', description: 'Every provider create/update/delete action is logged with timestamp, admin user, and action details for compliance tracking.', files: ['api/admin/route.ts'] },
        ]
      },
      { tag: 'fix', time: '06:00 PM',
        title: 'User-Scoped Brokers & Deployment',
        summary: 'Fixed critical issues where all users shared the same broker list and Vercel builds crashed on missing env vars.',
        items: [
          { icon: '👤', title: 'User-Scoped Broker Accounts', description: 'Added userId field to BrokerNode. GET /api/broker now authenticates the user and filters results to only their connected accounts. New users start with an empty broker list instead of seeing demo data.', files: ['broker.ts', 'api/broker/route.ts', 'page.tsx'] },
          { icon: '🗑️', title: 'Broker Disconnect Feature', description: 'Added hover-reveal "Disconnect" button on broker cards with a 2-click confirm pattern (first click shows "Confirm Disconnect?", second click executes). DELETE /api/broker removes the account from the user\'s list.', files: ['BrokersTab.tsx', 'api/broker/route.ts', 'broker.ts'] },
          { icon: '☁️', title: 'Vercel Build Fixes', description: 'Moved supabaseAdmin to lazy-initialized getSupabaseAdmin() function. Added fallback placeholder values for NEXT_PUBLIC_SUPABASE_URL and ANON_KEY during build phase. Moved MetaAPI SDK to lazy getMetaApi() to prevent native module loading at build time.', files: ['server.ts', 'client.ts', 'middleware.ts', 'broker.ts'] },
          { icon: '🧹', title: 'Removed Hardcoded Demo Data', description: 'Deleted the 2 pre-seeded demo broker accounts (Vantage-Real-01, IC-Markets-Pro) from both the simulator DB seed and the React useState initial value.', files: ['broker.ts', 'page.tsx'] },
        ]
      },
    ]
  },
  {
    date: 'May 25, 2026',
    dayLabel: 'Sunday',
    commitCount: 32,
    blocks: [
      { tag: 'major', time: '08:00 AM',
        title: 'Supabase Authentication & Database',
        summary: 'Integrated Supabase for user authentication, database storage, and row-level security across the entire platform.',
        items: [
          { icon: '🔐', title: 'Auth Flow Implementation', description: 'Built login/signup page with email+password and OAuth support. Added middleware route guards that redirect unauthenticated users to /login. Implemented /auth/callback for OAuth handshake completion.', files: ['login/page.tsx', 'middleware.ts', 'auth/callback/route.ts'] },
          { icon: '👤', title: 'User Profile System', description: 'Sidebar shows real user data (name, email, avatar) from Supabase Auth. Profile popup menu with settings link and logout. Dedicated Settings page with avatar upload and change password form.', files: ['page.tsx', 'ProfileTab.tsx'] },
          { icon: '💎', title: 'Subscription Management', description: 'Three-tier plan system (Free/Pro/Enterprise) with feature comparison cards, pricing display, and plan upgrade flow. Plan data stored in Supabase profiles table.', files: ['SubscriptionTab.tsx'] },
          { icon: '🗄️', title: 'Database Schema', description: 'Created profiles table extending auth.users with display_name, avatar_url, plan, and role. Created platform_config for feature flags, announcements, and pricing. RLS policies for user data isolation.', files: ['supabase/migrations/'] },
        ]
      },
      { tag: 'major', time: '10:30 AM',
        title: 'Enterprise Admin Panel',
        summary: 'Full-featured admin dashboard for managing users, monitoring system health, and configuring the platform.',
        items: [
          { icon: '📊', title: 'KPI Dashboard', description: 'Real-time stats cards showing total users, active subscribers, revenue, and churn rate. Plan distribution donut chart. Signup/revenue trend lines with 30-day history.', files: ['admin/page.tsx'] },
          { icon: '👥', title: 'User Management', description: 'Sortable, filterable user table with search. Bulk actions (suspend, change plan, export). Pagination with 25/50/100 per page. User detail drawer with full profile, activity log, and inline editing.', files: ['admin/page.tsx', 'api/admin/route.ts'] },
          { icon: '✏️', title: 'Inline Editing', description: 'Admins can edit user name, email, and plan directly in the table row. Changes save to both Supabase Auth (email) and the profiles table (name, plan) simultaneously.', files: ['admin/page.tsx', 'api/admin/route.ts'] },
          { icon: '📈', title: 'Analytics Tabs', description: 'Brokers tab: connected accounts, trade volume, error rates. Trades tab: recent executions with P&L. Analytics: top traded symbols, win rates, risk exposure. All with CSV export.', files: ['admin/page.tsx'] },
          { icon: '⚙️', title: 'Platform Settings', description: 'Feature toggles (maintenance mode, registration, demo accounts). Announcements with rich text and scheduling. Audit log with searchable, filterable entries.', files: ['admin/page.tsx', 'api/admin/route.ts'] },
          { icon: '💰', title: 'Plan Pricing Editor', description: 'Live editor for each plan\'s price, features, and limits. Changes save to platform_config table and take effect immediately.', files: ['admin/page.tsx'] },
          { icon: '🧠', title: 'Intelligence Module', description: 'Signup funnel analysis, revenue forecasting, trade KPI aggregation, top traded symbols ranking, and a rule-based risk engine with configurable thresholds.', files: ['admin/page.tsx', 'api/admin/route.ts'] },
        ]
      },
      { tag: 'feature', time: '01:15 PM',
        title: 'Broker Engine & Trade Execution',
        summary: 'MetaAPI SDK integration for connecting real MT5 broker accounts and executing trades directly from AI signals.',
        items: [
          { icon: '🏦', title: 'MetaAPI Cloud SDK', description: 'Integrated MetaAPI v29 SDK for connecting to MT5 broker servers. Handles account provisioning (createAccount), RPC connection lifecycle, and real-time account info fetching.', files: ['broker.ts'] },
          { icon: '✅', title: 'Manual Trade Execution', description: 'When user clicks "Confirm Execution" on a trade card, the system sends a market order to the selected broker via MetaAPI RPC. Supports BUY/SELL with volume, SL, and TP.', files: ['api/execute/route.ts', 'page.tsx'] },
          { icon: '🔍', title: 'Server Search', description: 'Auto-complete broker server search using MetaAPI\'s server registry. User types "Vantage" and gets a dropdown of matching servers.', files: ['broker.ts', 'ModalNode.tsx'] },
          { icon: '🛡️', title: 'Free Tier Compatibility', description: 'Configured MetaAPI for free tier: reliability:regular, cloud-g1, correct SDK v29 method signatures. Fallback simulator mode when META_API_TOKEN is absent.', files: ['broker.ts'] },
        ]
      },
      { tag: 'feature', time: '03:45 PM',
        title: 'Multi-Agent Intelligence System',
        summary: 'Orchestrated multiple AI specialist agents for institutional-quality market analysis with consensus-based decision making.',
        items: [
          { icon: '🤖', title: 'Master Trading Agent', description: 'Orchestration layer that dispatches analysis to 4 specialist agents: Technical Analyst (chart patterns, indicators), Fundamental Analyst (news, economic data), Sentiment Analyst (market positioning), and Risk Manager (position sizing, exposure).', files: ['api/chat/route.ts'] },
          { icon: '📰', title: 'Live News Integration', description: 'RSS feed integration for real-time financial headlines. Infinite marquee animation with hover-to-pause. News sentiment scoring feeds into the AI analysis pipeline.', files: ['page.tsx', 'api/news/route.ts'] },
          { icon: '🎤', title: 'Voice Input', description: 'Web Speech API (SpeechRecognition) for speak-to-type. User taps the mic, speaks an asset name or question, and it gets transcribed into the chat input.', files: ['page.tsx'] },
          { icon: '🔧', title: 'Robust JSON Parsing', description: 'FlexibleJsonParse utility that handles malformed LLM JSON output using multiple extraction strategies: direct parse, regex extraction, bracket matching, and partial recovery.', files: ['api/chat/route.ts'] },
        ]
      },
      { tag: 'feature', time: '06:30 PM',
        title: 'Market Data & Charting',
        summary: 'Live market data feeds and TradingView-powered charts embedded directly in the AI analysis cards.',
        items: [
          { icon: '📊', title: 'TradingView Charts', description: 'Integrated lightweight-charts v5 for mini candlestick charts inside analysis cards. Proper Unix timestamp conversion, ResizeObserver cleanup, and watermark removal.', files: ['MiniChart.tsx'] },
          { icon: '🪙', title: 'Asset Watchlist', description: 'Horizontal strip with 9 asset pills (XAUUSD, BTCUSD, EURUSD, etc.) with authentic SVG brand logos. Tapping an asset triggers an instant AI analysis.', files: ['page.tsx'] },
          { icon: '📈', title: 'Rich Analysis Cards', description: 'Structured cards showing coin icon, current price, indicator table (RSI, MACD, EMA), confluence strength bar, and embedded "Generate Signal" button.', files: ['page.tsx', 'api/chat/route.ts'] },
          { icon: '🌐', title: 'Twelve Data API', description: 'Live market feed with free-tier optimization (5 calls). ETF symbol mapping: NAS100→QQQ, US30→DIA, Oil→USO. Parallel fetch for candles + indicators.', files: ['api/candles/route.ts'] },
        ]
      },
    ]
  },
  {
    date: 'May 24, 2026',
    dayLabel: 'Saturday',
    commitCount: 23,
    blocks: [
      { tag: 'major', time: '02:00 PM',
        title: 'AI Trading Engine',
        summary: 'Built the core AI-powered signal generation engine with NVIDIA NIM inference and institutional-grade risk management.',
        items: [
          { icon: '🧠', title: 'Signal Generation Engine', description: 'Multi-indicator confluence analysis combining RSI, MACD, EMA crossovers, Bollinger Bands, and volume profile. Generates BUY/SELL/HOLD signals with confidence scores and reasoning.', files: ['api/chat/route.ts'] },
          { icon: '⚡', title: 'NVIDIA NIM Integration', description: 'Llama 3.1 8B inference via NVIDIA NIM API for fast, reliable AI responses. Streaming support for real-time chat. Round-robin key rotation for load distribution.', files: ['api/chat/route.ts'] },
          { icon: '🃏', title: 'Trade Signal Cards', description: 'Visual trade cards with entry price, stop loss, take profit, lot size, and risk/reward ratio. Contract specs per instrument (pip value, margin, leverage).', files: ['page.tsx'] },
          { icon: '🎯', title: 'Smart Trigger System', description: 'Contextual detection: direct asset queries (1-3 words) trigger analysis cards; forecast/prediction keywords with asset mentions trigger signals; general conversation gets plain text.', files: ['api/chat/route.ts'] },
        ]
      },
      { tag: 'major', time: '10:00 AM',
        title: 'Next.js PWA Foundation',
        summary: 'Initial project setup with mobile-first design, iOS PWA optimization, and the institutional trading terminal UI.',
        items: [
          { icon: '🚀', title: 'Project Bootstrap', description: 'Next.js 14 app with App Router, TypeScript, CSS modules. PWA manifest for standalone home screen installation. Dynamic VisualViewport API height scaling.', files: ['layout.tsx', 'manifest.json'] },
          { icon: '💬', title: 'AI Chat Terminal', description: 'Dark-themed institutional trading terminal with message history, streaming responses, cipher decode loading animation, and auto-scroll behavior.', files: ['page.tsx', 'globals.css'] },
          { icon: '🎨', title: 'Theme System', description: 'Light/dark mode toggle with CSS custom properties. Interactive Lightbulb icon with AudioContext synthesized click sound on toggle.', files: ['page.tsx', 'globals.css'] },
          { icon: '📱', title: 'iOS PWA Fixes', description: 'Fixed focus scroll layout shifting by locking html/body with position:fixed. Disabled autocomplete, autocorrect, and spellcheck to clean the keyboard accessory bar.', files: ['globals.css', 'page.tsx'] },
        ]
      },
    ]
  },
];

/* ── Icons ───────────────────────────────────────────────────────── */
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const GitHubIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

const tagStripeColor: Record<string, string> = {
  major:       'linear-gradient(180deg,#6366f1,#818cf8)',
  feature:     'linear-gradient(180deg,#3b82f6,#60a5fa)',
  fix:         'linear-gradient(180deg,#f59e0b,#fbbf24)',
  improvement: 'linear-gradient(180deg,#10b981,#34d399)',
  infra:       'linear-gradient(180deg,#8b5cf6,#c084fc)',
};

/* ── Page Component ──────────────────────────────────────────────── */
export default function WorkLogPage() {
  const [activeDay, setActiveDay] = useState(worklog[0].date);
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const saved = localStorage.getItem('wl-theme');
    if (saved === 'dark') setDark(true);
  }, []);

  useEffect(() => {
    const container = document.querySelector('.cl-page');
    if (!container) return;
    const handleScroll = () => {
      for (const day of worklog) {
        const el = document.getElementById(`day-${day.date.replace(/\s|,/g, '-')}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) setActiveDay(day.date);
        }
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (date: string) => {
    const el = document.getElementById(`day-${date.replace(/\s|,/g, '-')}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const totalItems = worklog.reduce((sum, day) => sum + day.blocks.reduce((s, b) => s + b.items.length, 0), 0);
  const toggleTheme = () => {
    setDark(prev => {
      localStorage.setItem('wl-theme', !prev ? 'dark' : 'light');
      return !prev;
    });
  };

  const totalCommits = worklog.reduce((s, d) => s + d.commitCount, 0);

  return (
    <div className={`cl-page ${dark ? 'cl-dark' : ''}`}>
      {/* Mobile Header */}
      <div className="cl-mobile-header">
        <a href="/">← Dashboard</a>
        <span>Work Log</span>
        <button className="cl-theme-toggle" onClick={toggleTheme} style={{ border: 'none' }}>
          {dark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Sidebar */}
      <aside className="cl-sidebar">
        <div className="cl-sidebar-header">
          <a href="/" className="cl-sidebar-logo">
            <div className="cl-sidebar-logo-icon">T</div>
            TradeGPT
          </a>
          <button className="cl-theme-toggle" onClick={toggleTheme} title={dark ? 'Light mode' : 'Dark mode'}>
            {dark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="cl-search">
          <div className="cl-search-wrap">
            <svg className="cl-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="cl-search-input"
              placeholder="Search features..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Sprint progress */}
        <div className="cl-sprint">
          <div className="cl-sprint-label">Sprint Progress <span>78%</span></div>
          <div className="cl-sprint-bar"><div className="cl-sprint-fill" style={{ width: '78%' }} /></div>
        </div>

        <nav className="cl-sidebar-nav">
          <div className="cl-nav-section">
            <div className="cl-nav-label">Timeline</div>
            {worklog.map((day) => (
              <a
                key={day.date}
                className={`cl-nav-item ${activeDay === day.date ? 'cl-nav-item--active' : ''}`}
                onClick={() => scrollTo(day.date)}
              >
                <span className="cl-nav-dot" />
                <span>{day.dayLabel}, {day.date}</span>
                <span className="cl-nav-commit-badge"><GitHubIcon size={9} />{day.commitCount}</span>
              </a>
            ))}
          </div>
        </nav>

        <div className="cl-sidebar-back">
          <a href="/">← Back to Dashboard</a>
        </div>
      </aside>

      {/* Main */}
      <main className="cl-main">
        <div className="cl-hero">
          <div className="cl-hero-badge">📋 INTERNAL WORK LOG</div>
          <h1>Development Updates</h1>
          <p className="cl-hero-sub">
            Daily progress tracker for the engineering team. Every feature, fix, and infrastructure change — documented with file references.
          </p>

          {/* Filter pills */}
          <div className="cl-filter-bar">
            {['all','major','feature','fix','infra'].map(f => (
              <button key={f} className={`cl-filter-btn ${filter===f?'cl-filter-btn--active':''}`} onClick={()=>setFilter(f)}>
                {f === 'all' ? '⬡ All' : f === 'major' ? '🚀 Major' : f === 'feature' ? '✨ Feature' : f === 'fix' ? '🔧 Fix' : '⚙️ Infra'}
              </button>
            ))}
          </div>

          <div className="cl-stats-grid">
            <div className="cl-stat-card">
              <div className="cl-stat-icon" style={{ background: 'rgba(91,92,246,0.08)' }}>🔀</div>
              <span className="cl-stat-value">{totalCommits}</span>
              <span className="cl-stat-label"><GitHubIcon size={11} /> Commits</span>
            </div>
            <div className="cl-stat-card">
              <div className="cl-stat-icon" style={{ background: 'rgba(16,185,129,0.08)' }}>📝</div>
              <span className="cl-stat-value">19.7K</span>
              <span className="cl-stat-label">Lines Added</span>
            </div>
            <div className="cl-stat-card">
              <div className="cl-stat-icon" style={{ background: 'rgba(59,130,246,0.08)' }}>⚡</div>
              <span className="cl-stat-value">{totalItems}</span>
              <span className="cl-stat-label">Features Built</span>
            </div>
            <div className="cl-stat-card">
              <div className="cl-stat-icon" style={{ background: 'rgba(245,158,11,0.08)' }}>📅</div>
              <span className="cl-stat-value">{worklog.length}</span>
              <span className="cl-stat-label">Working Days</span>
            </div>
          </div>
        </div>

        {/* Day Sections */}
        <div className="cl-days">
          {worklog.map((day) => {
            const filteredBlocks = day.blocks.filter(b =>
              (filter === 'all' || b.tag === filter) &&
              (search === '' || b.title.toLowerCase().includes(search.toLowerCase()) || b.items.some(i => i.title.toLowerCase().includes(search.toLowerCase())))
            );
            if (filteredBlocks.length === 0) return null;
            return (
              <div key={day.date} id={`day-${day.date.replace(/\s|,/g, '-')}`} className="cl-day">
                <div className="cl-day-header">
                  <div className="cl-day-pill">
                    <div className="cl-day-icon"><CalendarIcon /></div>
                    <span className="cl-day-date">{day.dayLabel}, {day.date}</span>
                  </div>
                  <span className="cl-day-meta"><GitHubIcon /> {day.commitCount} commits</span>
                </div>

                {filteredBlocks.map((block, bi) => {
                  const tag = tagStyles[block.tag];
                  return (
                    <div key={bi} className="cl-block">
                      <div className="cl-block-stripe" style={{ background: tagStripeColor[block.tag] }} />
                      <div className="cl-block-inner">
                        <div className="cl-block-header">
                          <span className="cl-block-tag" data-tag={block.tag} style={{ background: tag.bg, color: tag.color }}>
                            {tag.label}
                          </span>
                          <span className="cl-block-time">
                            <ClockIcon /> {block.time}
                          </span>
                          <span className="cl-block-count">{block.items.length} items</span>
                        </div>
                        <div className="cl-block-title">{block.title}</div>
                        <p className="cl-block-desc">{block.summary}</p>

                        <div className="cl-items">
                          {block.items.map((item, ii) => (
                            <div key={ii} className="cl-item">
                              <span className="cl-item-icon">{item.icon}</span>
                              <div className="cl-item-body">
                                <span className="cl-item-title">{item.title}</span>
                                <p className="cl-item-desc">{item.description}</p>
                                {item.files && (
                                  <div className="cl-item-files">
                                    {item.files.map((f) => (
                                      <span key={f} className="cl-file-chip">{f}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <footer className="cl-footer">
          <div className="cl-footer-inner">
            <p>Internal use only — TradeGPT Engineering Team</p>
            <div className="cl-footer-links">
              <a href="https://github.com/hxmmxd/tradinggtp" target="_blank">GitHub ↗</a>
              <a href="/admin">Admin ↗</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
