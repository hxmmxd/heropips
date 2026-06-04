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
    date: 'June 5, 2026',
    dayLabel: 'Thursday',
    commitCount: 7,
    blocks: [
      { tag: 'major', time: '12:00 AM',
        title: 'Multi-Level Rebate & 40/40/20 Milestone System',
        summary: 'Designed and implemented the complete multi-level rebate distribution engine, milestone qualification system with balanced-leg enforcement, and full admin configuration panels.',
        items: [
          { icon: '🗄️', title: 'Database Schema — Referral Tree & Trade Log', description: 'Created SQL migration with `referred_by` column for recursive referral chains, `trade_log` for granular deal tracking, `rebate_levels` for 5-level commission percentages, `milestones` for reward tiers, and `milestone_progress` for per-user qualification status.', files: ['20260605_multilevel_rebates_milestones.sql'] },
          { icon: '🔄', title: 'Recursive Rebate Engine (rebateEngine.ts)', description: 'Built `distributeRebate()` which walks the upline referral tree up to 5 levels, crediting each ancestor with their configured commission percentage. Uses PostgreSQL recursive CTEs for efficient tree traversal.', files: ['lib/rebateEngine.ts'] },
          { icon: '🎯', title: '40/40/20 Milestone Qualification Engine', description: 'Built `checkMilestone()` which enforces balanced-leg growth rules: no single direct referral leg can contribute more than 40% of the target volume. Stores JSONB `legs_breakdown` for audit transparency.', files: ['lib/rebateEngine.ts'] },
          { icon: '📊', title: 'MilestoneProgress Dashboard Component', description: 'Created expandable card UI showing per-tier progress bars, leg-level volume breakdowns with capped/OK indicators, strongest/second/other leg max percentages, and one-click recalculate button.', files: ['referral/MilestoneProgress.tsx', 'ReferralTab.tsx'] },
          { icon: '⚙️', title: 'Admin Multi-Level % Configuration', description: 'Added "Multi-Level %" sub-tab in Rebate Controls: editable table for L1–L5 labels, commission percentages, and active toggles. Shows live "Total distributed: X% · Company retains: Y%".', files: ['AdminSettings.tsx', 'api/admin/route.ts'] },
          { icon: '🏆', title: 'Admin 40/40/20 Milestones Manager', description: 'Added "40/40/20 Milestones" sub-tab with CRUD for reward tiers: icon, name, target lots, reward amount, leg cap percentage, active toggle, and "Add Tier" creation form.', files: ['AdminSettings.tsx', 'api/admin/route.ts'] },
          { icon: '🔌', title: 'Admin API Handlers', description: 'Extended GET with `?table=rebate_levels|milestones` for targeted fetches. Added PATCH handlers for `rebateLevels` (bulk upsert), `milestones` (bulk update), and `milestone` (single create). All ops audit-logged.', files: ['api/admin/route.ts'] },
        ]
      },
      { tag: 'fix', time: '02:30 AM',
        title: 'Trade Log Data Accuracy & Admin UX',
        summary: 'Fixed critical data accuracy issues in the admin Trade Log: stale open statuses, missing close prices, and scroll-blocking layout bugs.',
        items: [
          { icon: '🔄', title: 'Closed Deal Sync to Trades Table', description: 'Updated sync-deals cron to write close_price, pnl, and status=closed back to the trades table when MetaAPI deals close. Detects orphaned open trades and auto-closes them.', files: ['api/cron/sync-deals/route.ts'] },
          { icon: '📋', title: 'Enhanced Trade Table (12 Columns)', description: 'Expanded admin trades table from 8 to 12 columns: added User, SL, TP, Order ID. P&L shows "—" for open trades instead of misleading "+0.00". Date now includes time.', files: ['admin/page.tsx'] },
          { icon: '🔍', title: 'Trade Search & Date Range Filter', description: 'Added real-time search by symbol/type, status pills (All/Open/Closed), date range picker with calendar icon, and one-click Clear button. All filtering via useMemo for instant response.', files: ['admin/page.tsx'] },
          { icon: '📜', title: 'Admin Scroll Fix & Sticky Headers', description: 'Changed .adm root from min-height to height:100vh + overflow:hidden to properly constrain the viewport. Added max-height to table wraps and sticky column headers.', files: ['globals.css'] },
          { icon: '🐛', title: 'MilestoneProgress Auth Fix', description: 'Fixed infinite "Loading milestones…" spinner caused by MilestoneProgress being called without userId prop. Now auto-resolves the current user from Supabase auth.', files: ['referral/MilestoneProgress.tsx'] },
        ]
      },
    ]
  },
  {
    date: 'June 4, 2026',
    dayLabel: 'Wednesday',
    commitCount: 24,
    blocks: [
      { tag: 'major', time: '09:00 AM',
        title: 'Manager Portal — Premium UX Overhaul',
        summary: 'Complete visual and interaction redesign of the Manager positions, risk analytics, and trading controls with tactile UI elements and floating navigation dock.',
        items: [
          { icon: '🎨', title: 'Premium Warm Theme for Risk Tab', description: 'Replaced default dark styling with a warm, light-mode bronze/amber theme across the risk analytics dashboard. Period selectors, stat cards, and trade history all themed consistently.', files: ['manager/ManagerRisk.tsx', 'globals.css'] },
          { icon: '📊', title: 'Positions Component Restyle', description: 'Refactored inline chart view toggles, card spacing, and visual density for a more professional trading terminal feel.', files: ['manager/ManagerPositions.tsx', 'globals.css'] },
          { icon: '🔘', title: 'Tactile 3D Action Buttons', description: 'Replaced text emoji buttons with outline SVG icons. Added tactile 3D press-state animations with shadow depth changes on tap for SL, TP, RF, Flash, and Close actions.', files: ['manager/ManagerPositions.tsx', 'globals.css'] },
          { icon: '🎚️', title: 'Swipe to Close All Slider', description: 'Implemented high-fidelity range slider for closing all positions. Dragging the thumb from left to right triggers the close-all action with visual progress feedback.', files: ['manager/ManagerPositions.tsx', 'globals.css'] },
          { icon: '🚀', title: 'Floating Footer Dock', description: 'Added persistent floating dock with AI Terminal, Quick Shortcuts panel (slide-up Commands grid), and Trading Chart toggle. Pill-shaped buttons with vertical dividers.', files: ['manager/ManagerInsights.tsx', 'globals.css'] },
          { icon: '📐', title: 'Bottom Bar Scroll Docking', description: 'Implemented dynamic scroll-to-bottom footer docking behavior: summary bar slides into view as user scrolls, wrapped in static height container to prevent layout feedback loop.', files: ['manager/ManagerRisk.tsx', 'globals.css'] },
        ]
      },
      { tag: 'major', time: '02:00 PM',
        title: 'Reports Tab — HTML-to-PDF Infographic Engine',
        summary: 'Built a complete reports system with live HTML preview and programmatic PDF generation using jsPDF, including gradient banners, trade logs, and account metrics.',
        items: [
          { icon: '📄', title: 'Reports Tab & HTML Preview', description: 'Created Reports tab with infographic-style HTML report template. Added full-screen preview page at /reports/preview with print-optimized CSS.', files: ['ReportComponents.tsx', 'reports/preview/page.tsx'] },
          { icon: '📊', title: 'jsPDF Programmatic Generator', description: 'Replaced broken html2pdf.js with pure jsPDF drawing: gradient banner, metadata grid, sub-labels, section dividers, trade log table with alternating rows. Explicit fill/stroke/text color before every draw call.', files: ['lib/invoicePdf.ts'] },
          { icon: '🔧', title: 'PDF Debugging Iterations', description: 'Fixed blank PDF issue through 5 iterations: html2pdf.js → puppeteer → back to client-side → pure jsPDF. Resolved font embedding, color rendering, and Chrome path issues.', files: ['lib/invoicePdf.ts', 'api/reports/pdf/route.ts'] },
          { icon: '🏷️', title: 'Deal Type Label Cleanup', description: 'Stripped DEAL_TYPE_ prefix from trade log entries in PDF output (e.g. "DEAL_TYPE_BUY" → "BUY") for cleaner presentation.', files: ['manager/ManagerReports.tsx'] },
        ]
      },
      { tag: 'improvement', time: '06:00 PM',
        title: 'Global Rebate Engine — Trade Log Integration',
        summary: 'Extended the rebate sync pipeline to log every processed deal to the trade_log table and trigger multi-level distribution.',
        items: [
          { icon: '📝', title: 'Trade Log Writes', description: 'Every closed deal processed by sync-rebates is now upserted into trade_log with full metadata: entry/exit price, volume, hold time, commission, swap, and rebate_processed flag.', files: ['api/cron/sync-rebates/route.ts'] },
          { icon: '🌐', title: 'Multi-Level Distribution Trigger', description: 'After each rebate credit, distributeRebate() is called to walk the upline tree and credit L1-L5 ancestors automatically.', files: ['api/cron/sync-rebates/route.ts', 'lib/rebateEngine.ts'] },
        ]
      },
    ]
  },
  {
    date: 'June 2, 2026',
    dayLabel: 'Tuesday',
    commitCount: 12,
    blocks: [
      { tag: 'major', time: '12:30 PM',
        title: 'Manager Portal — Full Trading Dashboard',
        summary: 'Built a complete Manager Portal accessible from the chat input button with 4 sub-tabs: Insights (live P&L, order execution), Positions (grouped cards, list view), Config (trading preferences), and Risk Analytics.',
        items: [
          { icon: '📊', title: 'Manager Tab Architecture', description: 'Created ManagerTab component with 4 sub-tabs (Insights, Positions, Config, Risk) and real-time account data fetching from MetaAPI broker endpoints.', files: ['ManagerTab.tsx', 'page.tsx'] },
          { icon: '💹', title: 'Insights — Live Trading Dashboard', description: 'MTM P&L card, Lots & Positions counter, Market/Custom/Lots/Risk order modes, SELL/BUY execution buttons with live prices, Buy BE/Sell BE cards, Max Loss/Profit indicators, and Account Risk Summary.', files: ['manager/ManagerInsights.tsx', 'globals.css'] },
          { icon: '🎯', title: 'Animated Manager Button', description: 'Replaced the + button in chat input with an animated audio waveform SVG that pulses to grab attention. Launches the full-screen Manager overlay.', files: ['TerminalTab.tsx', 'globals.css'] },
        ]
      },
      { tag: 'feature', time: '02:00 PM',
        title: 'Positions — Dual View Mode & Multi-Select',
        summary: 'Built comprehensive position management with grouped card view, individual list view, and a batch multi-select system for closing multiple positions at once.',
        items: [
          { icon: '🃏', title: 'Grouped Card View', description: 'Positions grouped by symbol+direction showing aggregated P&L, ticket count, volume, SL/TP price bar visualization with entry/mark/TP indicators, and 5 action buttons (SL, TP, RF, Flash, Close).', files: ['manager/ManagerPositions.tsx', 'globals.css'] },
          { icon: '📋', title: 'Individual List View', description: 'Per-position compact cards with symbol, BUY/SELL badge, lots, P&L, points, SL-to-TP progress bar with dot indicator, Entry/SL/TP/R:R info row, and individual close button.', files: ['manager/ManagerPositions.tsx', 'globals.css'] },
          { icon: '☑️', title: 'Multi-Select Mode', description: 'Tap "Select" to enter batch mode. Gold circular checkboxes appear on each card. Header transforms to show All pill toggle, selection counter (2/6 XAGUSD Long), All/Done buttons. Sticky red "Close Selected (N)" bar for batch position closure.', files: ['manager/ManagerPositions.tsx', 'globals.css'] },
          { icon: '📊', title: 'Summary Header', description: 'Dynamic header showing "Open Positions" with net direction (NET LONG/SHORT), total P&L, and All/Select toggle buttons.', files: ['manager/ManagerPositions.tsx'] },
        ]
      },
      { tag: 'major', time: '03:30 PM',
        title: 'Risk Analytics Dashboard',
        summary: 'Full risk analytics page with period selectors, performance trio cards, trade statistics grid, closed deals leaderboard, and trade history timeline.',
        items: [
          { icon: '📈', title: 'Risk Performance Metrics', description: 'Win Rate / Profit Factor / Avg R:R trio cards with color-coded values. Trade statistics grid showing total trades, winners/losers, avg win/loss amounts, and recovery factor.', files: ['manager/ManagerRisk.tsx', 'globals.css'] },
          { icon: '📅', title: 'Period Selectors & Net P&L', description: 'Today/Week/Month/All period filter chips with large Net P&L display and deal count badge.', files: ['manager/ManagerRisk.tsx'] },
          { icon: '🏆', title: 'Closed Deals Leaderboard', description: 'Top performers table showing symbol, trade count, total P&L, and win rate with color-coded profit/loss indicators.', files: ['manager/ManagerRisk.tsx'] },
          { icon: '📜', title: 'Trade History Timeline', description: 'Chronological list of closed deals with win/loss card styling, green/red left border, symbol badges, entry→exit prices, P&L, duration, and lot size.', files: ['manager/ManagerRisk.tsx'] },
          { icon: '🔌', title: 'Deals API Endpoint', description: 'Built /api/broker/deals route fetching closed trade history from MetaAPI with date range filtering.', files: ['api/broker/deals/route.ts'] },
        ]
      },
      { tag: 'improvement', time: '05:00 PM',
        title: 'Compact UI Optimization — All Tabs',
        summary: 'Applied comprehensive spacing and density optimizations across all 4 Manager tabs, reducing padding, gap sizes, font sizes, and element dimensions for a professional high-density trading dashboard feel.',
        items: [
          { icon: '📐', title: 'Insights Tab Compact', description: 'Reduced card padding 16→12px, value font 20→18px, SELL/BUY button padding, BE card spacing, and Risk Summary section gaps.', files: ['globals.css'] },
          { icon: '📐', title: 'Positions Tab Compact', description: 'Cards 16→12px padding, PnL font 28→22px, badge 40→34px, price bar 8→6px height, action buttons 8→6px padding, position list gap 12→8px.', files: ['globals.css'] },
          { icon: '📐', title: 'Config Tab Compact', description: 'Sections gap 16→10px, padding 16→12px, toggle 44×24→40×22px, row padding 12→8px, field margins reduced.', files: ['globals.css'] },
          { icon: '📐', title: 'Risk Tab Compact', description: 'Page gap 12→8px, trio cards 16→12px padding, stats row 10→7px padding, trade cards 14→10px, bottom bar 10→8px padding.', files: ['globals.css'] },
        ]
      },
    ]
  },
  {
    date: 'June 1, 2026',
    dayLabel: 'Monday',
    commitCount: 8,
    blocks: [
      { tag: 'major', time: '11:15 PM',
        title: 'Advanced Global Rebates & Risk Safeguards',
        summary: 'Designed and implemented advanced anti-gaming controls, promotions schedules, and monthly volume bracket scaling for the rebate calculation engine.',
        items: [
          { icon: '🛡️', title: 'Multi-Account Hedge Correlation', description: 'Implemented dynamic filters to automatically exclude overlapping opposing trade positions on identical symbols within a 15-second entry window.', files: ['sync-rebates/route.ts'] },
          { icon: '📈', title: 'Sliding Volume Tier Multipliers', description: 'Integrated dynamic monthly lot summation to scale user payout percentages automatically based on volume brackets.', files: ['sync-rebates/route.ts', '20260603_global_rebate_controls.sql'] },
          { icon: '⏰', title: 'Happy Hour Promo Scheduler', description: 'Added scheduled promotion boosts for specific symbols with active calendar time-range checks during rebate resolution.', files: ['sync-rebates/route.ts', '20260603_global_rebate_controls.sql'] },
          { icon: '🔒', title: 'Drawdown Caps & Revenue Guards', description: 'Implemented account-level maximum drawdown triggers (35%) and revenue caps (70% of broker commission) to protect platform margins.', files: ['sync-rebates/route.ts'] },
          { icon: '⚙️', title: 'Admin Controls Dashboard Sub-Tabs', description: 'Created 4 interactive setting sub-tabs (Rate Rules, Risk, Promotions, Tiers) in the admin console to modify parameters dynamically.', files: ['AdminSettings.tsx', 'admin/route.ts'] }
        ]
      }
    ]
  },
  {
    date: 'May 31, 2026',
    dayLabel: 'Sunday',
    commitCount: 17,
    blocks: [
      { tag: 'major', time: '02:30 AM',
        title: 'MetaAPI Integration Engine & Order Execution Refactor',
        summary: 'Replaced slow MetaAPI streaming sync connections with high-performance direct REST endpoints to prevent serverless execution timeouts and upgrade order tickets.',
        items: [
          { icon: '🏦', title: 'MetaAPI REST Migration', description: 'Replaced latency-prone streaming SDK sync calls (waitConnected / waitSynchronized) with direct HTTP REST requests, slashing execution latency to ~2s.', files: ['broker.ts', 'api/execute/route.ts'] },
          { icon: '🎫', title: 'High-Fidelity TradeTicket UI', description: 'Rebuilt the manual order confirmation form showing inline spinners, transaction success screens, filled execution price, and explicit error descriptors.', files: ['TradeTicket.tsx', 'TerminalTab.tsx'] },
          { icon: '🔧', title: 'Automated Stop Loss / Take Profit Corrections', description: 'Added automatic stops filter to resolve Mt5 INVALID_STOPS errors by dynamically stripping out-of-range SL/TP parameters on retry.', files: ['broker.ts'] },
          { icon: '📋', title: 'Detailed Error Serializer', description: 'Added structured metadata parser to properly serialize complex MetaAPI SDK error response details array.', files: ['broker.ts'] }
        ]
      },
      { tag: 'fix', time: '09:40 AM',
        title: 'Live Account Info Synchronizer',
        summary: 'Resolved issues causing mt5 accounts to display stale zeros by migrating metadata fetching to Rest API endpoints.',
        items: [
          { icon: '💹', title: 'Live Balance & Equity Fetch', description: 'Created active REST endpoint queries to pull real-time account balances, equity, and floating P&L directly from the MT5 server.', files: ['broker.ts', 'api/broker/route.ts'] },
          { icon: '🧼', title: 'Accounts Filter Sanity Checks', description: 'Removed invalid login and server search parameters from MetaAPI account lookup filters that triggered type validation exceptions.', files: ['broker.ts'] }
        ]
      },
      { tag: 'major', time: '10:15 AM',
        title: 'Isolated Admin Settings Architecture',
        summary: 'Decoupled monolithic configurations, wrapping them in isolated components and styling with high-performance glassmorphism layers.',
        items: [
          { icon: '🔌', title: 'Isolated Component Architecture', description: 'Moved settings forms to an independent AdminSettings component, fixing layout lag caused by heavy re-renders.', files: ['admin/page.tsx', 'AdminSettings.tsx'] },
          { icon: '🎨', title: 'Glassmorphism settings portal UI', description: 'Refactored platform controls with full status indicators, instant changes saving, and simulated terminal log feedback.', files: ['AdminSettings.tsx'] }
        ]
      },
      { tag: 'improvement', time: '10:45 AM',
        title: 'Milestone Rewards Settings Redesign',
        summary: 'Refactored milestone rewards config panels into responsive compact layouts with gold trophy badges and custom input fields.',
        items: [
          { icon: '🏆', title: 'Gold Trophy Milestones UI', description: 'Redesigned milestone tiers showing gold trophy layouts, aligned tabular grids, and custom currency fields for referral incentive amounts.', files: ['AdminSettings.tsx'] }
        ]
      },
      { tag: 'feature', time: '11:20 AM',
        title: 'Dynamic Subscription Plans Control Panel',
        summary: 'Integrated live subscription tier features and limit controllers, enabling dynamically populated plans on the user dashboard.',
        items: [
          { icon: '💳', title: 'Plans and Limits Settings', description: 'Created live dynamic inputs in admin controls to modify starter, pro, and enterprise pricing, features list, and limit values.', files: ['AdminSettings.tsx', 'api/pricing/route.ts'] }
        ]
      },
      { tag: 'major', time: '11:40 AM',
        title: 'NOWPayments Gateway Integration',
        summary: 'Wired referral systems and subscription checkout portals to NOWPayments gateway infrastructure, restricting withdrawals to cryptocurrency.',
        items: [
          { icon: '🛒', title: 'NOWPayments Subscriptions Checkout', description: 'Developed API route for transaction creation, active payment status polling endpoint, and webhook payload parsing.', files: ['api/subscriptions/checkout/route.ts', 'api/subscriptions/status/route.ts', 'api/webhooks/nowpayments/route.ts'] },
          { icon: '🔒', title: 'Cryptocurrency Withdrawal Enforcement', description: 'Wired component inputs to restrict payout channels to valid destination crypto addresses with minimum checks.', files: ['ReferralTab.tsx', 'lib/nowpayments.ts'] }
        ]
      },
      { tag: 'feature', time: '01:30 PM',
        title: 'SMTP Mail Server Configurations & Signup OTP Flow',
        summary: 'Built nodemailer SMTP credentials settings in administration, adding email verify dispatches and OTP validation endpoints.',
        items: [
          { icon: '📧', title: 'Custom Nodemailer Mail Dispatcher', description: 'Configured email sending helper reading environment or database dynamic SMTP credentials.', files: ['lib/mail.ts', 'api/admin/route.ts'] },
          { icon: '🔑', title: 'OTP Sign Up Handshake', description: 'Integrated dynamic OTP generation, signup verification routes, and screen controllers on registration form.', files: ['api/auth/signup/route.ts', 'api/auth/verify-otp/route.ts', 'login/page.tsx'] }
        ]
      },
      { tag: 'major', time: '02:30 PM',
        title: 'Invoices History Dashboard & PDF Receipt Engine',
        summary: 'Built billing records tab with client-side PDF invoice compilation, dynamic status click QR overlays, and checkout recovery routes.',
        items: [
          { icon: '📄', title: 'jsPDF Receipts Compiler', description: 'Implemented local PDF compiler generating high-quality A4 invoices with TradeGPT brand headers, transaction metadata, and completed status badges.', files: ['lib/invoicePdf.ts'] },
          { icon: '🪙', title: 'Interactive Payment QR overlays', description: 'Connected status pill buttons to checkout modal. Clicking pending invoices launches the payment QR display. Clicking expired invoices warns the user.', files: ['SubscriptionTab.tsx', 'api/subscriptions/status/route.ts', 'api/subscriptions/history/route.ts'] }
        ]
      }
    ]
  },
  {
    date: 'May 30, 2026',
    dayLabel: 'Friday',
    commitCount: 40,
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
      { tag: 'feature', time: '08:30 PM',
        title: 'Internal Work Log Page',
        summary: 'Built and progressively enhanced a GitBook-style internal work log at /worklog for the engineering team to track daily progress, features, and timestamps.',
        items: [
          { icon: '📋', title: 'GitBook-Style Layout', description: 'Fixed sidebar with scroll-spy navigation, day-by-day timeline sections, and a premium light-theme design using CSS custom properties. Sidebar highlights the active day as you scroll.', files: ['worklog/page.tsx', 'worklog/changelog.css'] },
          { icon: '🌗', title: 'Light / Dark Mode Toggle', description: 'Sun/Moon icon toggle in sidebar header with full CSS variable theming across all elements. Theme preference persisted in localStorage across sessions.', files: ['worklog/page.tsx', 'worklog/changelog.css'] },
          { icon: '🔍', title: 'Search & Filter', description: 'Sidebar search bar filters blocks and items by title in real-time. Filter pills (All / Major / Feature / Fix / Infra) hide non-matching day sections entirely.', files: ['worklog/page.tsx'] },
          { icon: '⚡', title: 'Sprint Progress Bar', description: 'Animated gradient progress bar in the sidebar showing current sprint completion (78%). Built with CSS custom property transitions.', files: ['worklog/changelog.css'] },
          { icon: '🃏', title: 'Card-Style Blocks', description: 'Each work block is a raised card with a colored left stripe per tag type (purple=Major, blue=Feature, amber=Fix, violet=Infra). Hover lifts the card with a shadow transition.', files: ['worklog/page.tsx', 'worklog/changelog.css'] },
          { icon: '🕐', title: 'Timestamps', description: 'Every block now shows a clock icon badge with the time it was built (e.g. 09:15 AM). Displayed between the tag pill and item count using a subtle pill design.', files: ['worklog/page.tsx', 'worklog/changelog.css'] },
          { icon: '🐙', title: 'GitHub Icons & Commit Counts', description: 'GitHub SVG icon next to commit counts in 3 places: stats card, sidebar nav per-day badge, and day header meta pill. Commit count shown for each day in the sidebar.', files: ['worklog/page.tsx'] },
          { icon: '🔒', title: 'Auth-Protected Route', description: 'Removed /worklog from the public middleware exclusion list. Now requires a valid Supabase session — only logged-in team members can access it.', files: ['middleware.ts'] },
        ]
      },
      { tag: 'feature', time: '09:00 PM',
        title: 'Referral Hub — User Dashboard',
        summary: 'Built a premium Referral Hub tab in the user dashboard with hero section, stats cards, invite link, milestone tracker, expandable partner list, and how-it-works guide.',
        items: [
          { icon: '🎁', title: 'Hero Section', description: 'Gradient glow hero with badge, title, and subtitle explaining the rebate program.', files: ['ReferralTab.tsx'] },
          { icon: '📊', title: 'Stats Cards', description: '4 metric cards: Total Rebates ($4,820), Commissions ($1,240), Active Partners, and Network Volume ($1.2M). Hover lift animation.', files: ['ReferralTab.tsx', 'globals.css'] },
          { icon: '🔗', title: 'Invite Card & Copy Buttons', description: 'Invite link card with code pill (TGPT-U82910), one-click copy link button, and separate copy-code button with ✓ confirmation on copy.', files: ['ReferralTab.tsx'] },
          { icon: '📈', title: 'Milestone Progress Bar', description: 'Animated gradient progress bar with thumb showing progress toward 10-referral milestone ($250 reward). Labels at 0, 5, and 10.', files: ['ReferralTab.tsx', 'globals.css'] },
          { icon: '👥', title: 'Partners Tab', description: 'Expandable accordion cards per partner: avatar initials, name, join date, trade count, status badge, rebate earned. Detail grid shows portfolio/rebate/commission/trades.', files: ['ReferralTab.tsx'] },
          { icon: '🏆', title: 'Milestones Tab', description: '5 milestone tiers (1→50 referrals) with rewards up to $2,000. Reached milestones show green check; locked ones are dimmed.', files: ['ReferralTab.tsx'] },
          { icon: '🛡️', title: 'Type Safety', description: 'Extended Partner interface with joined and trades fields. Updated types/index.ts and page.tsx partners state.', files: ['types/index.ts', 'page.tsx'] },
        ]
      },
      { tag: 'major', time: '09:45 PM',
        title: '5-Level Referral Network + Admin Config',
        summary: 'Upgraded referral system to support 5-level deep multi-level referral network tree, and added a complete referral program configuration panel in admin settings.',
        items: [
          { icon: '🌐', title: '5-Level Network Tree', description: 'Recursive NetworkNode component renders the full referral tree. Each level has a distinct color (L1=indigo, L2=blue, L3=green, L4=amber, L5=pink). Nodes expand/collapse to show sub-levels with an indented tree layout.', files: ['ReferralTab.tsx'] },
          { icon: '📊', title: 'Level Breakdown Bar', description: '5 mini cards above the invite section showing each level\'s commission %, rebate %, and member count at a glance.', files: ['ReferralTab.tsx'] },
          { icon: '💹', title: 'Commission Rates Tab', description: 'New tab showing L1–L5 commission structure (10% → 1%) and rebate rates (5% → 0.25%) with member count per level.', files: ['ReferralTab.tsx'] },
          { icon: '⚙️', title: 'Admin Referral Settings Panel', description: 'Full referral config sub-page in admin Settings: editable commission and rebate per level, milestone reward editor, global settings (min withdrawal, cookie days, payout day). Toggle to enable/disable the program.', files: ['admin/page.tsx'] },
          { icon: '🏆', title: 'Milestone Editor (Admin)', description: '5 milestone tiers configurable from admin: change required referral count and reward amount for each tier (1/5/10/25/50 referrals = $25–$2,000).', files: ['admin/page.tsx'] },
          { icon: '💾', title: 'Save & Persist', description: 'Save button sends PATCH to /api/admin with referral_config key. Shows ✓ Saved successfully confirmation for 2.5 seconds.', files: ['admin/page.tsx'] },
        ]
      },
      { tag: 'major', time: '10:15 PM',
        title: 'Admin Settings Page — Complete Rebuild',
        summary: 'Completely reimagined the admin settings page with a clean 4-tab sub-navigation (Platform / Referral / Pricing / Announcements) replacing the broken single-scrolling layout.',
        items: [
          { icon: '🗂️', title: 'Settings Sub-Nav', description: '4-tab horizontal navigation inside settings: Platform Controls, Referral Program, Plan Pricing, and Announcements. Active tab shows indigo underline indicator.', files: ['admin/page.tsx'] },
          { icon: '⚡', title: 'Platform Tab', description: '4 toggle controls with icons: Maintenance Mode, AI Kill Switch, Allow Registrations, Demo Mode. Each patches the corresponding config key via /api/admin PATCH.', files: ['admin/page.tsx'] },
          { icon: '🎁', title: 'Referral Tab', description: 'Dedicated full referral config page: L1-L5 commission & rebate table, milestone rewards grid, global settings (withdrawal/cookie/payout). Save + Reset to Defaults buttons.', files: ['admin/page.tsx'] },
          { icon: '💳', title: 'Pricing Tab', description: 'Premium card layout for Starter/Pro/Enterprise pricing. Color-coded per tier with inline number inputs. Saves via /api/admin PATCH.', files: ['admin/page.tsx'] },
          { icon: '📢', title: 'Announcements Tab', description: 'Post new announcements with title, message, and type (Info/Warning/Success). Lists active announcements with one-click dismiss. Empty state handled.', files: ['admin/page.tsx'] },
        ]
      },
      { tag: 'major', time: '10:55 PM',
        title: 'Referral Hub — Premium Mobile & Web Redesign',
        summary: 'Complete visual and UX overhaul of the Referral Hub page with animated stats, gradient hero, responsive 2-column grid, share sheet, and pixel-perfect mobile layout.',
        items: [
          { icon: '✨', title: 'Gradient Hero + Animated Badge', description: 'Dual radial-gradient orbs, pulsing live dot badge, 30px bold hero title, CTAs in hero (Copy Link + Share button). All content positioned above radial glows.', files: ['ReferralTab.tsx', 'globals.css'] },
          { icon: '📊', title: 'Animated Stats with useCounter', description: 'Custom useCounter hook animates stat values from 0 on mount over 1.2s using requestAnimationFrame intervals. Stats show icon, label, animated value, and trend.', files: ['ReferralTab.tsx'] },
          { icon: '🔗', title: 'Premium Link Card', description: 'Gradient-border invite card with copy-code pill, Copy Link and Share buttons. Share uses native Web Share API on mobile, falls back to modal on desktop.', files: ['ReferralTab.tsx', 'globals.css'] },
          { icon: '🌐', title: 'Horizontal Level Strip', description: '5 level chips in a scrollable horizontal row showing commission %, member count, level badge. Overflow scrolls silently (no scrollbar).', files: ['ReferralTab.tsx', 'globals.css'] },
          { icon: '📱', title: 'Mobile-First Responsive', description: 'Full breakpoint system: 2-col stats on tablet, stacked link actions on mobile, hidden status badges on small screens, 2x2 how-it-works grid on mobile, tab scroll strip.', files: ['globals.css'] },
          { icon: '🔔', title: 'Share Modal / Bottom Sheet', description: 'On browsers without Web Share API, a slide-up modal shows the referral URL with copy button. Backdrop blur overlay, animation, close on backdrop tap.', files: ['ReferralTab.tsx', 'globals.css'] },
          { icon: '📈', title: 'Commission Rates Tab Redesign', description: 'Rate rows with visual progress bar representing commission percentage, two stat columns (commission + rebate), hover slide effect.', files: ['ReferralTab.tsx', 'globals.css'] },
        ]
      },
      { tag: 'feature', time: '11:25 PM',
        title: 'Referral Wallet — Balance & Withdrawal',
        summary: 'Added a premium referral wallet card with balance display, pending/lifetime earnings, and a full 3-step withdrawal modal supporting Crypto, Bank, and PayPal payouts.',
        items: [
          { icon: '💼', title: 'Wallet Balance Card', description: 'Dark gradient card (indigo-slate) with radial glow showing available balance ($4,820.50), pending earnings pill ($312 amber), lifetime earnings pill ($6,060 green), and next auto-payout date.', files: ['ReferralTab.tsx', 'globals.css'] },
          { icon: '⬆️', title: 'Withdraw Button', description: 'Green gradient Withdraw CTA. Disabled state when balance < minimum withdrawal. Minimum shown below button.', files: ['ReferralTab.tsx'] },
          { icon: '🪙', title: 'Step 1 — Amount & Method', description: 'Quick amount chips ($100/$250/$500/$1000/Max). Big dollar input. 3-method picker: Crypto (USDT/BTC/ETH), Bank (Wire), PayPal (Instant). Address/IBAN/email field adapts per method. Fee row shows network cost.', files: ['ReferralTab.tsx', 'globals.css'] },
          { icon: '✅', title: 'Step 2 — Confirm', description: 'Summary card: Amount, Method, Destination, You Receive (after fee). Edit back + animated Confirm button with Processing spinner.', files: ['ReferralTab.tsx'] },
          { icon: '🎉', title: 'Step 3 — Success', description: 'Green checkmark circle, success title, processing time note, Done button resets the full flow.', files: ['ReferralTab.tsx'] },
          { icon: '📱', title: 'Mobile Layout', description: 'Wallet card stacks vertically on mobile. Withdraw button becomes full-width. Modal is full-screen bottom sheet on small devices.', files: ['globals.css'] },
        ]
      },
      { tag: 'major', time: '11:50 PM',
        title: 'NOWPayments Gateway — Full Integration',
        summary: 'Integrated NOWPayments for crypto withdrawal processing: API client library, withdrawal API route, IPN webhook, admin configuration panel, and live frontend wiring.',
        items: [
          { icon: '⚙️', title: 'NOWPayments API Client (lib/nowpayments.ts)', description: 'Full typed client: testConnection, createPayout (JWT Bearer), getPayoutStatus, getAvailableCurrencies, estimateAmount. Supports sandbox/live toggle via env var.', files: ['lib/nowpayments.ts'] },
          { icon: '🔌', title: 'Withdrawals API Route (/api/withdrawals)', description: '5 actions: withdraw (creates payout via NOWPayments, deducts wallet balance, records in DB), test_gateway, get_currencies, estimate, check_status. Rollback on failure.', files: ['app/api/withdrawals/route.ts'] },
          { icon: '📡', title: 'IPN Webhook (/api/webhooks/nowpayments)', description: 'Verifies HMAC-SHA512 signature against IPN secret. Maps NOWPayments status (waiting/confirming/finished/failed) to internal DB status. Auto-refunds balance on failure/expiry.', files: ['app/api/webhooks/nowpayments/route.ts'] },
          { icon: '₿', title: 'Admin → Settings → Payments Tab', description: 'Full NOWPayments config panel: API Key, JWT Token, IPN Secret fields. Sandbox/Live toggle. Enabled coin chips (USDT TRC/ERC, BTC, ETH, BNB, USDC, LTC, DOGE). Webhook URL copy. Test Connection button with live result banner.', files: ['app/admin/page.tsx'] },
          { icon: '🔘', title: 'Coin Selector in Withdrawal Modal', description: 'When Crypto method is selected, shows coin pills: USDT (TRC-20), USDT (ERC-20), BTC, ETH, BNB, USDC. Selected coin updates address label dynamically.', files: ['components/ReferralTab.tsx'] },
          { icon: '🚨', title: 'Error Handling & Recovery', description: 'Confirm step shows red error banner on API failure. Edit button resets error. Success step shows NOWPayments reference ID. Done button resets full flow.', files: ['components/ReferralTab.tsx'] },
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
