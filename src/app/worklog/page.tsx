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
    date: 'June 25, 2026',
    dayLabel: 'Thursday',
    commitCount: 2,
    blocks: [
      {
        tag: 'major',
        time: '03:45 PM',
        title: 'MT5 Farm Admin Layout Overflow & Visual Clipping Fixes',
        summary: 'Resolved visual layout clipping and overflow issues in the admin panel MT5 Farm sub-dashboard. Specifically, cards, input fields, key lists, and the "Revoke" button were being clipped on the right of the viewport in smaller dimensions.',
        items: [
          { icon: '📏', title: 'Main Container Responsiveness', description: 'Added min-width: 0 and overflow-x: hidden to .adm-main in globals.css to prevent the flex container from expanding past the viewport boundary.', files: ['src/app/globals.css'] },
          { icon: '⚙️', title: 'Responsive Form Inputs', description: 'Replaced rigid flex behaviors on Label and Rate Limit inputs with a responsive flex-wrap: wrap row layout to prevent card width pushing.', files: ['src/app/admin/page.tsx'] },
          { icon: '🔑', title: 'Ellipsis & Truncation Handling', description: 'Added word-break: break-all for monospace API key previews and text-overflow: ellipsis for long labels to preserve horizontal space.', files: ['src/app/admin/page.tsx'] },
          { icon: '🛠️', title: 'Accounts Layout Updates', description: 'Upgraded accounts lists rows to wrap and flex responsively across all screens.', files: ['src/app/admin/page.tsx'] }
        ]
      },
      {
        tag: 'major',
        time: '03:30 PM',
        title: 'Orchestrator Rate Limit Configuration Tuning',
        summary: 'Tuned the API Gateway rate limit configuration for the MT5 Farm Default Key to allow 200 requests/minute.',
        items: [
          { icon: '⚙️', title: 'Default Key Rate Limit Upgrade', description: 'Altered the rate limit from 100/min to 200/min inside api_keys.json on the remote orchestrator VM.', files: ['/home/azureuser/orchestrator/api_keys.json'] },
          { icon: '🔄', title: 'Orchestrator Service Reload', description: 'Executed systemd restart for tradegpt-orchestrator.service to apply the updated rate limit parameters instantly.', files: ['/etc/systemd/system/tradegpt-orchestrator.service'] }
        ]
      }
    ]
  },
  {
    date: 'June 21, 2026',
    dayLabel: 'Sunday',
    commitCount: 12,
    blocks: [
      {
        tag: 'major',
        time: '06:00 PM',
        title: 'Custom MT5 Connection Farm Migration & Sidecar Integration',
        summary: 'Fully migrated the broker connection layer from MetaAPI to our proprietary MT5 Connection Farm, removing the third-party client SDK dependency and deploying a highly cost-effective, memory-optimized VPS node infrastructure.',
        items: [
          { icon: '🔌', title: 'MetaAPI Deprecation & Adapter Migration', description: 'Rewrote broker adapter and core libraries to query orchestrator and sidecar proxy APIs instead of MetaAPI REST and RPC SDK endpoints.', files: ['src/lib/broker.ts', 'src/lib/adapters/metatrader.ts', 'src/lib/mt5farm.ts'] },
          { icon: '🐛', title: 'Orchestrator Status Inconsistency Resolving', description: 'Programmed client-side validation routing to check both orchestrator state and sidecar connection responses in parallel, trusting sidecar status for actual connection status.', files: ['src/app/api/broker/route.ts', 'src/app/page.tsx'] },
          { icon: '🟠', title: 'Wake & Sleep Transitions Handling', description: 'Configured polling handlers to support waking state HTTP 202 during sleep/wake transition cycles, extending connection timeouts to 120 seconds.', files: ['src/app/api/broker/route.ts', 'src/app/page.tsx'] },
          { icon: '🛡️', title: 'Verification & Credentials Fallbacks', description: 'Added credentials error validation that catches failed orchestrator status and returns a raw database authentication fail warning to the client interface.', files: ['src/app/api/broker/route.ts', 'src/components/ModalNode.tsx'] },
          { icon: '📊', title: 'Allowed Instruments Syncing', description: 'Enabled live broker specification querying to write allowed symbol names and timezone offsets to user rows on Supabase.', files: ['src/lib/broker.ts', 'src/app/api/broker/route.ts'] },
          { icon: '💼', title: 'Accounts Admin Panel Control', description: 'Integrated keys list, database requests statistics, sidecar state overrides, and key generation features within the main admin panel dashboard.', files: ['src/app/admin/page.tsx', 'src/app/admin/mt5-farm/page.tsx'] }
        ]
      }
    ]
  },
  {
    date: 'June 15, 2026',
    dayLabel: 'Monday',
    commitCount: 4,
    blocks: [
      {
        tag: 'major',
        time: '04:00 PM',
        title: 'Interactive MT5 Scalping Blueprint & API Observability',
        summary: 'Designed and deployed the MT5 MetaAPI scalping reference dashboard and expanded admin telemetry.',
        items: [
          { icon: '📊', title: 'MT5 Scalping Blueprint Infographic', description: 'Created mt5_scalping_infographic.html rendering connection topologies, risk metrics, and order routing systems with localStorage-persisted progress checklists.', files: ['mt5_scalping_infographic.html'] },
          { icon: '🔌', title: 'Observability Endpoints Mapping', description: 'Registered Astro Mode analytics and user settings endpoints inside the system panel registry for real-time traffic inspections.', files: ['src/components/SystemApisTab.tsx', 'src/app/admin/page.tsx'] },
          { icon: '🛡️', title: 'TypeScript compilation', description: 'Ensured zero TypeScript compilation errors across all modules.', files: ['src/app/admin/page.tsx'] }
        ]
      }
    ]
  },
  {
    date: 'June 14, 2026',
    dayLabel: 'Sunday',
    commitCount: 2,
    blocks: [
      {
        tag: 'major',
        time: '05:00 PM',
        title: 'Orrery Clean Background Migration',
        summary: 'Cleaned up the application background layer to resolve layout collisions and CPU rendering overhead caused by dynamic DOM orbits.',
        items: [
          { icon: '🧹', title: 'Orrery Background Clean', description: 'Removed all floating planet DOM elements and the SolarSystemOrrery component from the welcome page backdrop to deliver a fast, clutter-free, and professional interface.', files: ['src/components/TerminalTab.tsx', 'src/app/globals.css'] },
          { icon: '🐛', title: 'Orphaned Chip Syntax Fix', description: 'Removed an orphaned duplicate JSX block that was causing React compile errors in /admin/page.tsx.', files: ['src/app/admin/page.tsx'] }
        ]
      }
    ]
  },
  {
    date: 'June 13, 2026',
    dayLabel: 'Saturday',
    commitCount: 14,
    blocks: [
      {
        tag: 'major',
        time: '11:59 PM',
        title: 'Security PIN Lock Gateway',
        summary: 'Implemented a secure developer gateway overlay on the worklog dashboard. Accessing the workspace requires entering the authorization PIN code \'0034\' via a custom tactile numpad or keyboard listener.',
        items: [
          { icon: '🔑', title: 'Tactile Glass Numpad UI', description: 'Built a glassmorphic 3x4 grid interface with digit key scaling, backspace, and clear parameters.', files: ['src/app/worklog/page.tsx'] },
          { icon: '⌨️', title: 'Keyboard Entry Integration', description: 'Configured global event listeners binding numerical keys, Backspace, and Escape actions directly to state changes.', files: ['src/app/worklog/page.tsx'] },
          { icon: '📳', title: 'Tactile Shake Alert', description: 'Designed CSS shake transforms and glowing red dot indicators on incorrect entry to replicate native app error feedback.', files: ['src/app/worklog/page.tsx'] }
        ]
      },
      {
        tag: 'major',
        time: '11:30 PM',
        title: 'Advanced Subsystem Implementation Details',
        summary: 'Upscaled the implementation details for all 6 subsystems from basic high-level notes to granular, code-level technical specifications containing mathematical models, concrete table mappings, and API endpoints.',
        items: [
          { icon: '⚙️', title: 'Detailed Implementation Logs', description: 'Expanded all details arrays with exhaustive, production-grade technical descriptors detailing indicator algorithms, CTE walks, NOWPayments webhook verification, and broker integrations.', files: ['src/app/worklog/page.tsx'] },
          { icon: '🛠️', title: 'Type Safety Restoration', description: 'Guaranteed strict TypeScript compilation with npx tsc by restoring the techStack typing attributes.', files: ['src/app/worklog/page.tsx'] }
        ]
      },
      {
        tag: 'major',
        time: '04:30 PM',
        title: 'Interactive SVG & Grid Flowchart Diagrams',
        summary: 'Upscaled the Subsystems & Architecture tab to render high-fidelity, interactive SVG and Grid flowcharts instead of static text ASCII diagrams. Includes orthogonal path routing, neon data pulse animations, and relative node highlighting.',
        items: [
          { icon: '📐', title: 'Interactive SVG Connectors', description: 'Designed orthogonal elbow connectors routing paths dynamically between column and row coordinates.', files: ['src/app/worklog/page.tsx'] },
          { icon: '⚡', title: 'Neon Pulse Animation', description: 'Configured SVG <animateMotion> circles traversing the path of hovered confluences in real time.', files: ['src/app/worklog/page.tsx'] },
          { icon: '🎨', title: 'Status-Coded Node Badges', description: 'Color coded node types (start, process, decision, success, fail, warning) with glassmorphism and matching shadows.', files: ['src/app/worklog/page.tsx'] },
          { icon: '🔍', title: 'Relative Node Highlighting', description: 'Hovering over any node dynamically highlights connected paths and fades out unrelated nodes.', files: ['src/app/worklog/page.tsx'] },
          { icon: '📋', title: 'Collapsible ASCII Fallback', description: 'Enclosed the raw ASCII flowchart diagram inside a native <details> toggle to preserve compatibility.', files: ['src/app/worklog/page.tsx'] }
        ]
      },
      {
        tag: 'major',
        time: '03:20 AM',
        title: 'Upscaled Features Page & Interactive Subsystem Explorer',
        summary: 'Upscaled the Subsystems & Architecture explorer page with a premium interactive sub-tab bar inside each card, real-time simulated sandbox dashboards, and diagnostic terminals for the core systems.',
        items: [
          { icon: '🏗️', title: 'Interactive Sub-Tabs Navigation', description: 'Added tabs for Overview, Flowchart, DB Schema, and Source Files within each subsystem card.', files: ['src/app/worklog/page.tsx'] },
          { icon: '🪐', title: 'Interactive Astro Orrery Simulator', description: 'Configured preset selectors for Moon Phase (Waxing, Waning, Full, Eclipse), Mercury Orbit State (Direct vs Retrograde), and Aspect Alignments to dynamically alter SVG orbit speed, colors, risk recommendations, and lot multipliers in real time.', files: ['src/app/worklog/page.tsx'] },
          { icon: '⚡', title: 'Interactive 9-Gate Confluence Evaluator', description: 'Built an override checkbox board allowing testers to toggle pass/fail status on individual confluences (Session, ATR Volatility, SMC Confirmation, Drawdown, etc.) and run sequential gate evaluation trials.', files: ['src/app/worklog/page.tsx'] },
          { icon: '🌳', title: 'Referral Capping Calculator', description: 'Implemented an interactive input calculator for Alice, Bob, and Charlie\'s raw lots that instantly applies the 40% leg cap rule and computes total milestone progress.', files: ['src/app/worklog/page.tsx'] },
          { icon: '💳', title: 'Active Diagnostic Console', description: 'Created clickable triggers simulating wallet checkout outcomes (Successful purchase log stream, Database lockout recovery self-healing, and Insufficient balance exceptions).', files: ['src/app/worklog/page.tsx'] },
          { icon: '📋', title: 'Flowchart Copy-to-Clipboard', description: 'Implemented a copy-to-clipboard button on the monospace ASCII flowcharts with UI success state.', files: ['src/app/worklog/page.tsx'] },
          { icon: '💾', title: 'PostgreSQL Database Schema Tables', description: 'Mapped table fields, type constraints, and description keys dynamically inside cards.', files: ['src/app/worklog/page.tsx'] }
        ]
      },
      {
        tag: 'major',
        time: '02:45 AM',
        title: 'Dynamic Architecture Documentation & App Features Explorer',
        summary: 'Integrated an interactive "Features & Architecture" explorer tab directly into the internal developer Work Log. This tab compiles visual ASCII system flows, architectural diagrams, component paths, and specific details for the six core platform subsystems.',
        items: [
          { icon: '📊', title: 'Dynamic Tab Architecture Layout', description: 'Added a tab-switcher (Timeline vs Features & Architecture) in the Work Log layout, supporting search and filter parameters across both modes.', files: ['src/app/worklog/page.tsx'] },
          { icon: '🏗️', title: 'Feature Architecture Visualizations', description: 'Wrote full detailed specs for the 9-Gate Signal Engine, Astro Mode Celestial Filter, SMC Pattern Scanner, Universal Trading Adapter, Multi-Level Referral Hub, and NOWPayments Ledger billing, rendering ASCII flow diagrams for each.', files: ['src/app/worklog/page.tsx'] },
          { icon: '📝', title: 'Self-Referential Worklog Update', description: 'Documented the engineering logs pipeline updates in both the root WORKLOG.md and the dynamic public/worklog.md file.', files: ['public/worklog.md', 'WORKLOG.md'] }
        ]
      },
      {
        tag: 'feature',
        time: '01:15 AM',
        title: 'Welcome Screen Redesign & SVG Background Orrery',
        summary: 'Redesigned the welcome page into a world-class portal with ambient glow, staggered entrance transitions, and custom SVG animations.',
        items: [
          { icon: '🎨', title: 'World-Class Welcome UI', description: 'Implemented an ambient background glow, structured 3-column feature grid, live system status strip, and staggered fade-in animations for all entrance components.', files: ['src/app/page.tsx'] },
          { icon: '🪐', title: 'Pure SVG Solar System Orrery', description: 'Rebuilt the background celestial orrery as a lightweight pure SVG layout, allowing planets (Moon, Jupiter, Saturn, Mercury) to orbit in their respective background slots without overlapping or colliding with foreground interactive elements.', files: ['src/components/TerminalTab.tsx'] },
          { icon: '🎨', title: 'Photorealistic Planet Gradients', description: 'Added CSS-radial gradient photorealistic SVG illustrations representing planets, complete with craters on the Moon/Mercury, horizontal wind bands and the Great Red Spot on Jupiter, and double-sided rings on Saturn.', files: ['src/components/TerminalTab.tsx', 'src/app/globals.css'] }
        ]
      }
    ]
  },
  {
    date: 'June 12, 2026',
    dayLabel: 'Friday',
    commitCount: 22,
    blocks: [
      {
        tag: 'major',
        time: '08:30 PM',
        title: 'Astro Mode Complete Release — Gates, Orrery & Analytics',
        summary: 'Completed the remaining specifications for Astro Mode: automated activation cards, solar system orrery animation backdrop, a comprehensive backtest performance analytics dashboard tab, dynamic celestial typing loaders, and verified the full 17-gate pipeline.',
        items: [
          { icon: '🪐', title: 'Solar System Orrery Animation (TerminalTab.tsx)', description: 'Created an SVG backdrop with 3 concentric rotating orbital tracks, planet markers on offset-path keyframes (Mercury, Moon, Jupiter), and an 8-star twinkling particle grid.', files: ['src/components/TerminalTab.tsx', 'src/app/globals.css'] },
          { icon: '☄️', title: 'Astro Activation Card (TerminalTab.tsx)', description: 'Implemented a chat-injected cosmic card showing live moon phase, mercury state, aspects, and dynamic risk/bias summary to provide visual feedback upon first activation.', files: ['src/components/TerminalTab.tsx'] },
          { icon: '📈', title: 'Astro Performance Tab Dashboard (AstroPerformanceTab.tsx)', description: 'Built an analytics dashboard visualizing Moon phase win rate stats, Mercury direct/retrograde avg PnL, seasonal monthly heatmaps, aspect rankings, and a historical signal table.', files: ['src/components/AstroPerformanceTab.tsx'] },
          { icon: '📡', title: 'Analytics API Aggregation (api/astro/analytics/route.ts)', description: 'Created API query aggregating telemetry data from the astro_signal_log database table, returning aggregated metrics per celestial factor.', files: ['src/app/api/astro/analytics/route.ts'] },
          { icon: '🐛', title: 'Fix: Gating Parameter Passthrough (api/chat/route.ts)', description: 'Resolved critical bug where getMarketSnapshot was called without astroMode, preventing Gates 13-17 from running during chat query signal checks.', files: ['src/app/api/chat/route.ts'] },
          { icon: '🛸', title: 'Astro Typing Loader (TerminalTab.tsx)', description: 'Rebuilt bot typing state under astro mode to show a rotating planet-and-moon orbit SVG alongside scrolling zodiac symbols (♈♉♊♋♌♍♎♏) instead of standard loading text.', files: ['src/components/TerminalTab.tsx', 'src/app/globals.css'] },
          { icon: '✨', title: 'Amber Gate Styling & Icons (TerminalTab.tsx)', description: 'Replaced generic check/cross icons for Gates 13-17 with custom planet symbols (☽♃☿◑✦), amber accent stripes, and custom ASTRO badges.', files: ['src/components/TerminalTab.tsx'] }
        ]
      }
    ]
  },
  {
    date: 'June 10, 2026',
    dayLabel: 'Wednesday',
    commitCount: 5,
    blocks: [
      { tag: 'major', time: '01:00 PM',
        title: 'Paid Courses Ledger Alignment & Unified Billing History',
        summary: 'Stabilized the course purchase engine by adding automated DB constraint self-healing for wallet transactions, routing purchase records to the ledger database, and rebuilding the Billing & Invoice UI to display unified histories.',
        items: [
          { icon: '💼', title: 'Ledger Constraint Self-Healing (purchase/route.ts)', description: 'Implemented a fallback check for the PostgreSQL check constraint error (23514) on course purchases via wallet, dynamically attempting constraint alteration before retry.', files: ['src/app/api/courses/purchase/route.ts'] },
          { icon: '📊', title: 'Unified Billing API (subscriptions/history/route.ts)', description: 'Merged platform config-based subscription invoices, completed course purchases, and pending crypto course invoices into a single sorted GET feed.', files: ['src/app/api/subscriptions/history/route.ts'] },
          { icon: '🧾', title: 'Billing & Invoice History UI (SubscriptionTab.tsx)', description: 'Rebuilt the Invoice History table to render custom badges for Plan vs Course invoice types, displaying amount details and status pills cleanly.', files: ['src/components/SubscriptionTab.tsx'] },
          { icon: '🛠️', title: 'Admin DB Migration Endpoint (fix-constraints/route.ts)', description: 'Created a background admin endpoint to drop and re-create the restrictive check constraint allowing course_purchase tx_type.', files: ['src/app/api/admin/fix-constraints/route.ts'] }
        ]
      },
      { tag: 'major', time: '06:00 PM',
        title: 'MetaAPI Timezones, Allowed Symbols & Live Server Clocks',
        summary: 'Integrated MetaAPI timezone-offset calculations and allowed trading instruments synchronization, storing them dynamically inside the Supabase broker schema. Added real-time ticker clocks and restricted dashboard symbol dropdowns with autocomplete search.',
        items: [
          { icon: '⏰', title: 'Live Server Clock (BrokersTab.tsx)', description: 'Created a ticking React interval clock synced to the broker\'s calculated timezone offset, rendering live updates next to active connections.', files: ['src/components/BrokersTab.tsx'] },
          { icon: '🌍', title: 'Timezone & Symbols DB Synchronization (broker.ts)', description: 'Updated connectBroker and getBrokerDetails to concurrently query MetaAPI server-time and symbols, writing timezone details and valid symbol names to database rows.', files: ['src/lib/broker.ts', 'src/types/index.ts'] },
          { icon: '🔍', title: 'Restricted Symbol Inputs & Search Filter (ManagerInsights.tsx)', description: 'Restricted the manual execution panel dropdown to the active broker\'s allowed_symbols, adding a clean search filter input for quick symbol lookup.', files: ['src/components/manager/ManagerInsights.tsx', 'src/components/ManagerTab.tsx', 'src/app/page.tsx'] },
          { icon: '🛡️', title: 'Pre-Trade Equity Verification', description: 'Integrated validation checks blocking execution if free margin or equity is non-positive, returning detailed error metrics for client troubleshooting.', files: ['src/lib/broker.ts'] }
        ]
      }
    ]
  },
  {
    date: 'June 9, 2026',
    dayLabel: 'Tuesday',
    commitCount: 4,
    blocks: [
      { tag: 'major', time: '11:30 AM',
        title: 'Paid Courses Monetization & Payment Gateway Migration',
        summary: 'Integrated multi-currency crypto invoice checkout and atomic wallet deductions for paid course access.',
        items: [
          { icon: '💳', title: 'NOWPayments Invoice Flow Integration', description: 'Replaced rigid BTC-only raw addresses with a hosted check-out invoice interface, allowing checkout with 200+ cryptocurrencies.', files: ['src/components/CoursesTab.tsx', 'src/app/api/subscriptions/checkout/route.ts'] },
          { icon: '🔒', title: 'Guarded Wallet Balance Deductions', description: 'Removed the legacy, slow RPC balance helper in favor of direct atomic profiles update using Supabase query chaining with .gte() check to eliminate race conditions.', files: ['src/app/api/courses/purchase/route.ts'] },
          { icon: '🔑', title: 'Admin API Hardening', description: 'Resolved 403 Forbidden validation errors in configuration saves by appending missing await keywords to createServerClient() calls.', files: ['src/app/api/admin/route.ts'] }
        ]
      }
    ]
  },
  {
    date: 'June 8, 2026',
    dayLabel: 'Monday',
    commitCount: 2,
    blocks: [
      { tag: 'improvement', time: '04:15 PM',
        title: 'Technical Presentation & Light-Theme Infographics',
        summary: 'Optimized marketing materials and technical specification document displays for customer-facing exports.',
        items: [
          { icon: '🎨', title: 'Light Theme Infographic Conversion', description: 'Restyled layout templates, graphics, and table components into a clean, modern high-contrast light theme to optimize visual layout prints.', files: ['src/components/ReportComponents.tsx'] },
          { icon: '📄', title: 'PDF Export Layout Adjustments', description: 'Tweaked margins, fonts, and grid paddings to guarantee perfect styling alignments during client-side PDF downloads.', files: ['src/lib/invoicePdf.ts'] }
        ]
      }
    ]
  },
  {
    date: 'June 7, 2026',
    dayLabel: 'Sunday',
    commitCount: 8,
    blocks: [
      { tag: 'major', time: '12:30 AM',
        title: 'Phase A: 9-Gate Institutional Signal Engine',
        summary: 'Replaced the basic 3-vote indicator system with a full institutional-grade 9-gate validation engine. Every market analysis now passes through sequential gating logic before a SIGNAL, WATCH, or NO_TRADE outcome is assigned.',
        items: [
          { icon: '🔒', title: '9-Gate System (market.ts)', description: 'Implemented Confluence ≥65%, SMC Confirmation, HTF Alignment, Session Filter, Volatility Normal, No Conflict, Cooldown, News Event (critical), and Correlation (critical) gates. Critical gate failures force NO_TRADE regardless of other results.', files: ['src/lib/market.ts'] },
          { icon: '🔍', title: 'SMC Scanner Pipeline (scanner.ts)', description: 'Wired SMC scanner into the gate engine. Detects BOS, FVG, Order Blocks, and Liquidity Sweeps. Results injected as pattern tags and Gate 2 confirmation count.', files: ['src/lib/scanner.ts', 'src/lib/market.ts'] },
          { icon: '⚖️', title: 'Weighted 6-Indicator Confluence Scoring', description: 'Replaced 3-vote majority with RSI 20%, MACD 25%, EMA 15%, Stochastic 10%, Bollinger 10%, 4H HTF Bias 20% weighted scoring. Outputs a 0–100 confluence percentage.', files: ['src/lib/market.ts'] },
          { icon: '⚡', title: 'Fast-Path Engine (api/chat/route.ts)', description: 'Bypasses LLM for all market analysis queries. Detects asset keywords, routes to market engine, returns structured JSON card in <5 seconds vs 15–30s with LLM.', files: ['src/app/api/chat/route.ts'] },
          { icon: '📡', title: '4H Higher-Timeframe Bias', description: 'Fetches 4H candle series separately from 1H data. Computes RSI on 4H to determine macro trend direction (BULLISH/BEARISH/NEUTRAL). Used in Gate 3 and the analysis card badge.', files: ['src/lib/market.ts'] },
          { icon: '▶️', title: 'A10: Signal → Manager Slide-to-Execute', description: 'SignalContext (React global state) carries the gated signal from Terminal to Manager tab. SlideToExecute component pre-fills symbol, direction, SL, TP, and lots. Single gesture submits to MetaAPI.', files: ['src/contexts/SignalContext.tsx', 'src/components/manager/SlideToExecute.tsx', 'src/components/TerminalTab.tsx'] },
          { icon: '🎨', title: 'Premium Analysis Card UI', description: '2×2 indicator grid (RSI/MACD/EMA/ATR) with colored status pills, gradient gating status strip, expandable gate checklist, SMC pattern tags, 4H bias + news sentiment badges, confluence progress bar.', files: ['src/components/TerminalTab.tsx', 'src/types/index.ts', 'src/app/page.tsx'] },
        ]
      },
      { tag: 'major', time: '02:00 AM',
        title: 'Phase B: Edge Multipliers (B1–B4)',
        summary: 'Extended the 7-gate engine to 9 gates by integrating four real-world data modules: Finnhub news sentiment, economic calendar event blocking, RSI/MACD divergence detection, and correlated asset confirmation.',
        items: [
          { icon: '📰', title: 'B1: Finnhub News Sentiment (newsSentiment.ts)', description: 'Fetches 20 headlines per symbol from Finnhub API. Scores each headline using 35 bullish + 35 bearish keywords. Aggregates to a -100 to +100 sentiment score mapped to BULLISH/NEUTRAL/BEARISH. Yahoo Finance RSS fallback. 10-min cache.', files: ['src/lib/newsSentiment.ts', 'src/lib/market.ts'] },
          { icon: '📅', title: 'B2: Economic Calendar — Gate 8 (econCalendar.ts)', description: 'Fetches upcoming events from Finnhub /calendar/economic. Filters high-impact events (NFP, FOMC, CPI, GDP, Rate Decision). Blocks signals 30 min before and 15 min after any match. Static FOMC/NFP/CPI schedule used as fallback. Wired as critical Gate 8.', files: ['src/lib/econCalendar.ts', 'src/lib/market.ts'] },
          { icon: '📐', title: 'B3: RSI/MACD Divergence Detection (divergence.ts)', description: 'Computes full RSI-14 and MACD histogram series from raw candles using EMA smoothing. Detects swing pivots (3-bar lookback), compares last two swing lows/highs between price and indicator. Outputs bullish/bearish/none with strength score 0–100. Auto-tags SMC patterns when found.', files: ['src/lib/divergence.ts', 'src/lib/market.ts'] },
          { icon: '🔗', title: 'B4: Correlated Asset Checker — Gate 9 (correlation.ts)', description: 'Maps symbols to their correlated pairs: Gold↔DXY (inverse), BTC↔ETH (positive), EUR/USD↔GBP/USD (positive USD cluster), QQQ↔SPY (index cluster). Fetches 1H candles for each pair, computes 5-bar SMA momentum, checks if direction agrees. 5-min cache. Wired as Gate 9.', files: ['src/lib/correlation.ts', 'src/lib/market.ts'] },
          { icon: '✅', title: 'TypeScript Build — Zero Errors', description: 'All 4 Phase B modules + 9-gate engine pass npx tsc --noEmit cleanly. Verified with live browser test showing 8/9 and 9/9 gates passing on XAUUSD and BTCUSD queries.', files: ['src/lib/market.ts'] },
        ]
      },
    ]
  },
  {
    date: 'June 6, 2026',
    dayLabel: 'Saturday',
    commitCount: 5,
    blocks: [
      { tag: 'feature', time: '03:45 AM',
        title: 'Genealogy Tree Flowchart & Interactive Compact Pills',
        summary: 'Designed and implemented a visual org-chart-style horizontal/vertical flowchart layout for the Genealogy Tree with collapsible tree branches and interactive compact details pills.',
        items: [
          { icon: '🌳', title: 'Flowchart Org-Chart Tree Layout', description: 'Replaced simple vertical indented lists with a horizontal flowchart utilizing CSS pseudo-elements to draw neat connecting paths between parent and child nodes.', files: ['components/ReferralTab.tsx', 'components/ReferralHub.css'] },
          { icon: '💊', title: 'Interactive Compact Pills', description: 'Nodes are rendered as small pill badges displaying level (e.g. YOU, L1, L2) and name, reducing tree width and height to preserve screen real estate.', files: ['components/ReferralTab.tsx', 'components/ReferralHub.css'] },
          { icon: '🔍', title: 'Expandable Node Detail Cards', description: 'Clicking a pill opens an inline detailed card showing active trade stats, lot sizes, plan tier badge, and wallet earnings before collapsing back to pill mode.', files: ['components/ReferralTab.tsx', 'components/ReferralHub.css'] },
          { icon: '👑', title: 'Virtual Root Node', description: 'Created a virtual root node representing the user ("YOU"), integrating the entire multi-level network into a single cohesive hierarchy.', files: ['components/ReferralTab.tsx'] }
        ]
      },
    ]
  },
  {
    date: 'June 5, 2026',
    dayLabel: 'Friday',
    commitCount: 19,
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
    dayLabel: 'Thursday',
    commitCount: 13,
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
    commitCount: 31,
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
    commitCount: 19,
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
    commitCount: 21,
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
    dayLabel: 'Saturday',
    commitCount: 27,
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
    dayLabel: 'Monday',
    commitCount: 24,
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
    dayLabel: 'Sunday',
    commitCount: 45,
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

interface SchemaField {
  name: string;
  type: string;
  constraint: string;
  description: string;
}

interface FileRole {
  path: string;
  role: string;
}

interface FlowchartNode {
  id: string;
  label: string;
  type: 'start' | 'process' | 'decision' | 'success' | 'fail' | 'warning';
  col: number;
  row: number;
}

interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
}

interface FlowchartData {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}

const InteractiveFlowchart: React.FC<{ data: FlowchartData }> = ({ data }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Grid mapping for absolute layout
  const nodeMap = new Map<string, FlowchartNode>();
  data.nodes.forEach(n => {
    nodeMap.set(n.id, n);
  });

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      background: 'var(--wl-bg-tertiary)', 
      border: '1px solid var(--wl-border)', 
      borderRadius: '12px', 
      padding: '24px 12px', 
      overflowX: 'auto',
      boxSizing: 'border-box',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.15)'
    }}>
      {/* Grid Pattern Backdrop */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        opacity: 0.07, 
        pointerEvents: 'none', 
        backgroundImage: 'radial-gradient(var(--wl-accent) 1px, transparent 1px)', 
        backgroundSize: '20px 20px' 
      }} />

      {/* Connection Canvas */}
      <svg style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '600px', 
        height: '460px', 
        pointerEvents: 'none', 
        zIndex: 1 
      }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--wl-border)" opacity="0.6" />
          </marker>
          <marker id="arrow-hover" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--wl-accent)" />
          </marker>
        </defs>

        {data.edges.map((edge, idx) => {
          const fromNode = nodeMap.get(edge.from);
          const toNode = nodeMap.get(edge.to);
          if (!fromNode || !toNode) return null;

          const isHovered = hoveredNode === edge.from || hoveredNode === edge.to;

          // Compute coordinate system layout:
          // X: col * 140 - 50 (col 1 to 4 maps to 90px, 230px, 370px, 510px)
          // Y: row * 70 - 20 (row 1 to 6 maps to 50px, 120px, 190px, 260px, 330px, 400px)
          const pFrom = { x: fromNode.col * 140 - 50, y: fromNode.row * 70 - 20 };
          const pTo = { x: toNode.col * 140 - 50, y: toNode.row * 70 - 20 };

          const yMid = (pFrom.y + pTo.y) / 2;
          let pathData = `M ${pFrom.x} ${pFrom.y} L ${pFrom.x} ${yMid} L ${pTo.x} ${yMid} L ${pTo.x} ${pTo.y}`;

          if (pFrom.x === pTo.x) {
            pathData = `M ${pFrom.x} ${pFrom.y} L ${pTo.x} ${pTo.y}`;
          }

          return (
            <g key={idx}>
              {/* Outer stroke shadow for high visibility */}
              <path 
                d={pathData} 
                fill="none" 
                stroke={isHovered ? 'var(--wl-accent)' : 'var(--wl-border)'}
                strokeWidth={isHovered ? 2.5 : 1.5}
                opacity={isHovered ? 0.95 : 0.3}
                markerEnd={`url(#${isHovered ? 'arrow-hover' : 'arrow'})`}
                style={{ transition: 'all 0.2s', strokeDasharray: isHovered ? 'none' : '4 4' }}
              />
              
              {/* Animated pulse data stream */}
              <circle r="3.5" fill="var(--wl-accent)" style={{ display: isHovered ? 'block' : 'none' }}>
                <animateMotion dur="1.5s" repeatCount="indefinite" path={pathData} />
              </circle>

              {edge.label && (
                <text
                  x={(pFrom.x + pTo.x) / 2}
                  y={yMid - 5}
                  textAnchor="middle"
                  fill={isHovered ? 'var(--wl-accent)' : 'var(--wl-text-muted)'}
                  style={{ fontSize: '8px', fontFamily: 'monospace', fontWeight: 700 }}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Absolute Node grid positioning wrapper */}
      <div style={{ position: 'relative', width: '600px', height: '440px', margin: '0 auto', zIndex: 2 }}>
        {data.nodes.map((node) => {
          const x = node.col * 140 - 50;
          const y = node.row * 70 - 20;
          
          let bg = 'var(--wl-bg-card)';
          let border = '1px solid var(--wl-border)';
          let color = 'var(--wl-text)';
          let glow = '';

          if (node.type === 'start') {
            bg = 'var(--wl-accent-bg)';
            border = '1.25px solid var(--wl-accent)';
            color = 'var(--wl-accent)';
          } else if (node.type === 'decision') {
            bg = 'var(--wl-bg-secondary)';
            border = '1px dashed var(--wl-border)';
            color = 'var(--wl-text)';
          } else if (node.type === 'success') {
            bg = 'rgba(16,185,129,0.08)';
            border = '1.5px solid #10b981';
            color = '#10b981';
            glow = '0 0 10px rgba(16,185,129,0.25)';
          } else if (node.type === 'fail') {
            bg = 'rgba(239,68,68,0.08)';
            border = '1.5px solid #ef4444';
            color = '#ef4444';
            glow = '0 0 10px rgba(239,68,68,0.25)';
          } else if (node.type === 'warning') {
            bg = 'rgba(245,158,11,0.08)';
            border = '1.5px solid #f59e0b';
            color = '#f59e0b';
            glow = '0 0 10px rgba(245,158,11,0.25)';
          }

          const isHovered = hoveredNode === node.id;
          const isRelated = hoveredNode && (
            data.edges.some(e => (e.from === hoveredNode && e.to === node.id) || (e.to === hoveredNode && e.from === node.id)) ||
            hoveredNode === node.id
          );

          return (
            <div
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)' + (isHovered ? ' scale(1.05)' : ''),
                width: '120px',
                minHeight: '38px',
                background: bg,
                border: isHovered ? '1.5px solid var(--wl-accent)' : border,
                borderRadius: '8px',
                color: color,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 8px',
                boxSizing: 'border-box',
                textAlign: 'center',
                fontSize: '9.5px',
                fontWeight: 750,
                fontFamily: 'monospace',
                cursor: 'pointer',
                boxShadow: isHovered ? '0 4px 14px rgba(91,92,246,0.3)' : glow || '0 2px 4px rgba(0,0,0,0.08)',
                opacity: hoveredNode && !isRelated ? 0.45 : 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: isHovered ? 10 : 5
              }}
            >
              {node.label}
              
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '4px',
                fontSize: '6.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '0.5px 3px',
                borderRadius: '3px',
                background: isHovered ? 'var(--wl-accent)' : 'var(--wl-bg-tertiary)',
                color: isHovered ? '#fff' : 'var(--wl-text-muted)',
                border: '1px solid var(--wl-border)',
                letterSpacing: '0.2px'
              }}>
                {node.type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SystemEdgeCase {
  title: string;
  desc: string;
}

interface FeatureArchitecture {
  id: string;
  category: 'trading' | 'astro' | 'rebates' | 'courses' | 'admin';
  name: string;
  icon: string;
  description: string;
  files: FileRole[];
  flowchart: string;
  flowchartData: FlowchartData;
  techStack: string[];
  details: string[];
  objective: string;
  responsibilities: string[];
  edgeCases: SystemEdgeCase[];
  dbSchema?: {
    tableName: string;
    fields: SchemaField[];
  };
}

const appFeatures: FeatureArchitecture[] = [
  {
    id: 'gate-engine',
    category: 'trading',
    name: '9-Gate Confluence & Validation Engine',
    icon: '🛡️',
    description: 'An institutional-grade trading validation pipeline that processes incoming market analysis requests through 9 sequential validation gates. Forces fallback to NO_TRADE upon any critical validation failure (e.g. high-impact news blocks or correlation disagreement).',
    files: [
      { path: 'src/lib/market.ts', role: 'Calculates technical indicator confluences and executes indicators math (RSI, EMA, MACD).' },
      { path: 'src/lib/scanner.ts', role: 'Monitors economic news and session boundaries to validate pre-trade guidelines.' },
      { path: 'src/app/api/chat/route.ts', role: 'Coordinates request pipeline and intercepts queries failing critical gates.' }
    ],
    flowchart: `[User Chat Query] ➔ [api/chat/route.ts] ➔ [getMarketSnapshot]
                                               │
                                      ┌────────┴────────┐
                               [Indicators]      [SMC Patterns]
                                      │                 │
                                      ▼                 ▼
                               [Confluence %]     [SMC Scanner]
                                      │                 │
                                      └────────┬────────┘
                                               ▼
                                         [Evaluate Gates]
                                      (Gates 1-9 check loop)
                                               │
                         ┌──────────────────────┼──────────────────────┐
                         ▼                      ▼                      ▼
                   [Critical Fail]        [Confluence < 65]     [All Passed / ≥ 65]
                    (No Conflict)          (Watch Status)         (Signal Issued)
                         │                      │                      │
                         ▼                      ▼                      ▼
                    🔴 NO_TRADE             🟡 WATCH                🟢 SIGNAL`,
    flowchartData: {
      nodes: [
        { id: 'start', label: 'User Chat Query', type: 'start', col: 2, row: 1 },
        { id: 'api', label: 'api/chat/route.ts', type: 'process', col: 2, row: 2 },
        { id: 'snapshot', label: 'getMarketSnapshot()', type: 'process', col: 2, row: 3 },
        { id: 'indicators', label: 'Indicators Math', type: 'process', col: 1, row: 4 },
        { id: 'smc', label: 'SMC Scanner', type: 'process', col: 3, row: 4 },
        { id: 'evaluate', label: 'Evaluate Gates 1-9', type: 'decision', col: 2, row: 5 },
        { id: 'pass', label: '🟢 SIGNAL DISPATCH', type: 'success', col: 3, row: 6 },
        { id: 'fail', label: '🔴 NO_TRADE FALLBACK', type: 'fail', col: 1, row: 6 }
      ],
      edges: [
        { from: 'start', to: 'api' },
        { from: 'api', to: 'snapshot' },
        { from: 'snapshot', to: 'indicators' },
        { from: 'snapshot', to: 'smc' },
        { from: 'indicators', to: 'evaluate' },
        { from: 'smc', to: 'evaluate' },
        { from: 'evaluate', to: 'pass', label: 'PASS (≥65)' },
        { from: 'evaluate', to: 'fail', label: 'FAIL (<65)' }
      ]
    },
    techStack: ['TypeScript', 'Technical Indicators', 'Confluence Math', 'Cache-Locks'],
    details: [
      'Multi-Timeframe Weighted Scoring Pipeline: Synthesizes a unified market bias index from 6 distinct indicators using an asymmetric weighting algorithm: RSI (20%), MACD Crossover (25%), EMA Triple-Crossover (15%), Stochastic Oscillator (10%), Bollinger Bands width (10%), and 4-Hour Trend Bias (20%). The threshold is evaluated dynamically at runtime against a configurable database threshold parameter in `public.risk_configs`.',
      'Sequential Gating Execution Loop: Sequentially runs Gates 1 through 9. Gate 1 verifies active broker session boundaries (Asia, London, NY session overlaps), Gate 3 intercepts economic news feeds from a real-time calendar table to block trades during NFP or CPI volatility spikes, Gate 6 checks for SMC pattern scanner confluences, and Gate 9 calculates free margin levels to ensure transaction integrity.',
      'Latency-Optimized Fast-Path Bypass: Bypasses LLM completion prompts entirely when parsing deterministic technical search phrases. Intercepts queries at the API layer (in `src/app/api/chat/route.ts`) and routes requests to the local indicators engine, cutting response times from ~25 seconds down to under 5 seconds.'
    ],
    objective: 'Provides an institutional-grade signal routing and validation pipeline. Evaluates incoming chat queries through a sequential, non-blocking 9-gate verification matrix to guarantee capital protection and block high-risk executions.',
    responsibilities: [
      'Computes weighted indicator confluences across RSI, MACD, Stochastic, Bollinger Bands, and EMA crossovers.',
      'Validates active session boundaries (Asia/London/NY) to confirm volume and liquidity thresholds.',
      'Intercepts news feeds dynamically from economic calendars to prevent execution during high-impact events.',
      'Enforces minimum confluence thresholds (65% standard) before generating valid trade execution signals.'
    ],
    edgeCases: [
      { title: 'High-Impact Economic News Block', desc: 'Automatically intercepts NFP, CPI, and FOMC calendar alerts. Shuts down execution paths 30 minutes before and after the scheduled release timestamp.' },
      { title: 'Fast-Path Sub-5s Routing', desc: 'Bypasses heavy LLM agent prompts when the user submits standard queries, routing raw indicators straight to card-rendering widgets to limit latency.' }
    ],
    dbSchema: {
      tableName: 'public.risk_configs',
      fields: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: 'Unique risk configuration identifier.' },
        { name: 'min_confluence', type: 'INTEGER', constraint: 'DEFAULT 65', description: 'Minimum confluence percentage threshold to trigger signal.' },
        { name: 'session_gating', type: 'BOOLEAN', constraint: 'DEFAULT TRUE', description: 'Enable/disable active trading session check (London/NY).' },
        { name: 'max_drawdown_limit', type: 'NUMERIC(5,2)', constraint: 'DEFAULT 5.00', description: 'Maximum account drawdown percentage before hard block.' }
      ]
    }
  },
  {
    id: 'astro-mode',
    category: 'astro',
    name: 'Astro Mode Celestial Filtering',
    icon: '🪐',
    description: 'NASA-grade ephemeris calculator integration evaluating real-time planetary aspects, moon phases, and retrogrades to dynamically scale transaction risk parameters and enforce hard-blocks.',
    files: [
      { path: 'src/lib/astro.ts', role: 'Invokes astronomy-engine to compute coordinates and planetary angles.' },
      { path: 'src/components/TerminalTab.tsx', role: 'Renders the circular orbiting Orrery backdrop and Zodiac loader.' },
      { path: 'src/components/AstroPerformanceTab.tsx', role: 'Compiles retrogrades vs direct trading logs and wins per moon phase.' }
    ],
    flowchart: `[Market Signal] ➔ [astroMode Check] ──(disabled)──➔ [Standard Pipeline]
                        │
                   (enabled)
                        ▼
            [Compute Celestial Coordinates]
             (astronomy-engine ephemeris)
                        │
        ┌───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼
   [Moon Phase]    [Mercury State]  [Eclipses]      [Aspects]
    Win multipliers (Retrograde blocks) (No-trade zones) (Rank confluences)
        │               │               │               │
        └───────────────┼───────────────┴───────────────┘
                        ▼
              [Gates 13-17 Checks]
                        │
                        ▼
              [Astro Gated Outcome]`,
    flowchartData: {
      nodes: [
        { id: 'start', label: 'Market Signal Event', type: 'start', col: 2, row: 1 },
        { id: 'check', label: 'Astro Mode Active?', type: 'decision', col: 2, row: 2 },
        { id: 'std', label: 'Standard Pipeline', type: 'warning', col: 4, row: 2 },
        { id: 'ephemeris', label: 'Astronomy Ephemeris', type: 'process', col: 2, row: 3 },
        { id: 'moon', label: 'Moon Sizing Multiplier', type: 'process', col: 1, row: 4 },
        { id: 'mercury', label: 'Mercury Retrograde Check', type: 'process', col: 2, row: 4 },
        { id: 'aspect', label: 'Planetary Aspect Angle', type: 'process', col: 3, row: 4 },
        { id: 'gates', label: 'Astro Gates 13-17', type: 'decision', col: 2, row: 5 },
        { id: 'outcome', label: 'Adjusted Signal', type: 'success', col: 2, row: 6 }
      ],
      edges: [
        { from: 'start', to: 'check' },
        { from: 'check', to: 'std', label: 'NO' },
        { from: 'check', to: 'ephemeris', label: 'YES' },
        { from: 'ephemeris', to: 'moon' },
        { from: 'ephemeris', to: 'mercury' },
        { from: 'ephemeris', to: 'aspect' },
        { from: 'moon', to: 'gates' },
        { from: 'mercury', to: 'gates' },
        { from: 'aspect', to: 'gates' },
        { from: 'gates', to: 'outcome' }
      ]
    },
    techStack: ['astronomy-engine', 'Ephemeris calculations', 'Risk Modulators', 'SVG Orrery Engine'],
    details: [
      'NASA Jet Propulsion Laboratory (JPL) Ephemeris Integrations: Leverages the mathematical formulas from the `astronomy-engine` package to calculate the precise longitude, declination, and right ascension of the Sun, Moon, Mercury, and Venus relative to Earth\'s geocentric coordinate system.',
      'Esoteric Sizing & Risk Modulation Algorithm: Maps lunar phase coordinates (from 0.0 New Moon to 1.0 Full Moon) to modulate position sizing. Applies a sliding multiplier scale between 0.50x (during volatile eclipse periods or New Moon phases) up to 1.50x (during Full Moon phases representing high confluence and momentum).',
      'Retrograde Gating Override: Monitors the velocity vectors of Mercury. When Mercury exhibits retrograde movement (apparent motion opposite to the stars), the system enters a fail-safe state, setting the celestial risk multiplier to 0.00x, locking execution across all universal broker adapters.',
      'Harmonious Planetary Aspects Evaluator: Evaluates the angular aspects (Conjunction, Opposition, Sextile, Square, Trine) between major celestial bodies. Harmonic aspects (Trine, Sextile) increment the confluence rating, while disharmonious aspects (Square, Opposition) trigger risk warnings.'
    ],
    objective: 'Integrates NASA-grade astronomy coordinates and planetary ephemeris calculations to modulate trade risk sizing. Acts as an additional esoteric filter layer (Gates 13-17) overlaying the standard signal pipeline.',
    responsibilities: [
      'Queries astronomy-engine libraries to calculate precise heliocentric and geocentric planet coordinates.',
      'Computes current lunar phase metrics, mapping win multiplier modifiers (0.5x to 1.5x risk scaling).',
      'Monitors Mercury retrograde status, enforcing hard blocks on execution during retrograde intervals.',
      'Calculates angular planet aspects (Trine, Square, Opposition, Conjunction) to output macro celestial ratings.'
    ],
    edgeCases: [
      { title: 'Solar/Lunar Eclipse Hazard Filter', desc: 'Detects eclipse windows within 24 hours of occurrence, outputting a zero-risk recommendation to lock out executing adapters.' },
      { title: 'Zodiac House Transition Latencies', desc: 'Calculates ingress/egress boundaries to avoid signal splits when a planet is on the cusp of transitioning houses.' }
    ],
    dbSchema: {
      tableName: 'public.astro_signal_log',
      fields: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: 'Unique telemetry logging row identifier.' },
        { name: 'symbol', type: 'TEXT', constraint: 'NOT NULL', description: 'Traded asset ticker (e.g. BTCUSD).' },
        { name: 'moon_phase', type: 'NUMERIC(4,3)', constraint: 'CHECK (moon_phase <= 1.0)', description: 'Moon phase completion decimal (0.0 = New Moon, 0.5 = Full).' },
        { name: 'mercury_state', type: 'TEXT', constraint: 'CHECK (state IN (\'DIRECT\', \'RETROGRADE\'))', description: 'Dynamic state of Mercury at signal execution time.' },
        { name: 'eclipse_active', type: 'BOOLEAN', constraint: 'DEFAULT FALSE', description: 'Flags whether a solar/lunar eclipse occurred within a 24h window.' },
        { name: 'aspects', type: 'TEXT[]', constraint: 'DEFAULT \'{}\'', description: 'Angular planetary aspects recorded during calculation.' }
      ]
    }
  },
  {
    id: 'smc-scanner',
    category: 'trading',
    name: 'Smart Money Concepts (SMC) Pattern Scanner',
    icon: '📊',
    description: 'Algorithmic structural scanner running multi-candle pivot calculations to detect institutional price structures, Fair Value Gaps, and liquidity traps.',
    files: [
      { path: 'src/lib/scanner.ts', role: 'Performs pivot swing high/low calculations on incoming candle arrays.' },
      { path: 'src/lib/divergence.ts', role: 'Monitors price highs vs indicator values to detect technical divergence.' }
    ],
    flowchart: `[1H candle data] ➔ [Swing Pivot Check] ➔ [Identify Highs / Lows]
                                               │
                                      ┌────────┴────────┐
                                      ▼                 ▼
                               [Breakout High]    [Unfilled Gap]
                                 (BOS / ChoCH)      (Fair Value FVG)
                                       │                 │
                                       ▼                 ▼
                                 [Order Block]     [Liquidity Sweep]
                                 (Extreme Zone)    (Equal High Sweeps)
                                       │                 │
                                       └────────┬────────┘
                                                ▼
                                        [Confluence Score]
                                         (Scale 1 to 10)`,
    flowchartData: {
      nodes: [
        { id: 'start', label: '1H Candle Data Feed', type: 'start', col: 2, row: 1 },
        { id: 'pivots', label: 'Swing Pivot Calculator', type: 'process', col: 2, row: 2 },
        { id: 'bos', label: 'BOS / ChoCH Breakout', type: 'decision', col: 1, row: 3 },
        { id: 'fvg', label: 'Fair Value Gaps (FVG)', type: 'decision', col: 3, row: 3 },
        { id: 'ob', label: 'Order Block Finder', type: 'process', col: 1, row: 4 },
        { id: 'sweep', label: 'Liquidity Sweeps', type: 'process', col: 3, row: 4 },
        { id: 'score', label: 'Confluence Score (1-10)', type: 'success', col: 2, row: 5 }
      ],
      edges: [
        { from: 'start', to: 'pivots' },
        { from: 'pivots', to: 'bos' },
        { from: 'pivots', to: 'fvg' },
        { from: 'bos', to: 'ob' },
        { from: 'fvg', to: 'sweep' },
        { from: 'ob', to: 'score' },
        { from: 'sweep', to: 'score' }
      ]
    },
    techStack: ['Swing Pivot Math', 'Candle series analysis', 'Pattern Recognition'],
    details: [
      'Fractal Swing Pivot Detection: Implements a recursive 3-candle and 5-candle localized extremum locator algorithm on 1-hour candle datasets. Automatically flags swing highs and swing lows to establish immediate trading ranges and support/resistance zones.',
      'Fair Value Gap (FVG) Imbalance Mapper: Detects structural imbalances by comparing the high wick of Candle N with the low wick of Candle N+2. Imbalances exceeding a configurable minimum point threshold are recorded in the database as valid target zones for market retracements.',
      'BOS/ChoCH Market Character Identifiers: Track structural breaks. A Break of Structure (BOS) is confirmed when candle close violates established swing pivots in the direction of the trend, whereas a Change of Character (ChoCH) triggers when pivots are broken in the opposing direction, indicating a potential reversal.',
      'Retail Liquidity Sweep Detector: Identifies double top/bottom patterns (equal high/low clusters within a 2.5% deviation threshold) and tracks wick penetrations. If a wick sweeps past these levels and immediately closes back within the range, the engine flags a liquidity grab, anticipating institutional reversal.'
    ],
    objective: 'Monitors multi-candle structural pivot points on 1H charts to identify institutional order flows and price imbalances. Flags high-probability trading zones while identifying retail liquidity traps.',
    responsibilities: [
      'Calculates Swing Highs and Swing Lows using recursive multi-bar local extremum algorithms.',
      'Detects Break of Structure (BOS) and Change of Character (ChoCH) structural breakout events.',
      'Locates Fair Value Gaps (FVG) where candle imbalances create unfilled price pockets.',
      'Identifies institutional Order Blocks at swing pivots to highlight high-confluence entry zones.'
    ],
    edgeCases: [
      { title: 'False Breakout Liquidity Sweeps', desc: 'Identifies equal high/low clusters and flags false breakouts where wicks sweep liquidity prior to reversal.' },
      { title: 'Historical Data Gap Ingestion', desc: 'Self-heals indicator series calculations by interpolating missing candles from secondary REST providers during WebSocket connection drops.' }
    ],
    dbSchema: {
      tableName: 'public.trade_log',
      fields: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: 'Unique database deal record identifier.' },
        { name: 'deal_id', type: 'VARCHAR(100)', constraint: 'UNIQUE NOT NULL', description: 'Unique MetaAPI deal identifier (guarantees transaction deduplication).' },
        { name: 'volume', type: 'NUMERIC(10,4)', constraint: 'NOT NULL', description: 'Transaction lot count.' },
        { name: 'profit', type: 'NUMERIC(15,2)', constraint: 'DEFAULT 0', description: 'Closed net profit or loss in account deposit currency.' }
      ]
    }
  },
  {
    id: 'trading-engine',
    category: 'trading',
    name: 'Universal Broker Trading Engine',
    icon: '🔌',
    description: 'Unified broker adapter connecting manual and AI-powered signals to Forex terminals (MetaTrader via MetaAPI REST/RPC) and Crypto exchanges (Binance, Bybit, OKX).',
    files: [
      { path: 'src/lib/broker.ts', role: 'Adapter classes standardizing actions like placeOrder, closePosition and marginChecks.' },
      { path: 'src/app/api/execute/route.ts', role: 'Receives executing signals from chat, runs validation gates, and routes tickets to brokers.' },
      { path: 'src/components/manager/SlideToExecute.tsx', role: 'Provides custom sliding slider visual button for manual execution override.' }
    ],
    flowchart: `[Execute Signal] ➔ [TradingAdapter Router]
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
 [Forex MT5 Adapter]                   [Crypto Adapter]
    (MetaAPI RPC)                      (Binance/Bybit/OKX)
        │                                     │
 [REST connectBroker]                   [HMAC-SHA256 Sign]
 [Fetch server-time]                    [REST order place]
 [Get allowed_symbols]                  [WebSocket tick sync]
        │                                     │
        └──────────────────┬──────────────────┘
                           ▼
                 [Exec Output / Tickets]`,
    flowchartData: {
      nodes: [
        { id: 'start', label: 'Validated Exec Signal', type: 'start', col: 2, row: 1 },
        { id: 'adapter', label: 'TradingAdapter Router', type: 'decision', col: 2, row: 2 },
        { id: 'forex', label: 'MetaAPI Forex (MT5)', type: 'process', col: 1, row: 3 },
        { id: 'crypto', label: 'Exchange Crypto', type: 'process', col: 3, row: 3 },
        { id: 'timezone', label: 'Broker Server Offset', type: 'process', col: 1, row: 4 },
        { id: 'signing', label: 'HMAC-SHA256 Signer', type: 'process', col: 3, row: 4 },
        { id: 'tickets', label: 'Deal Ticket Executed', type: 'success', col: 2, row: 5 }
      ],
      edges: [
        { from: 'start', to: 'adapter' },
        { from: 'adapter', to: 'forex', label: 'Forex' },
        { from: 'adapter', to: 'crypto', label: 'Crypto' },
        { from: 'forex', to: 'timezone' },
        { from: 'crypto', to: 'signing' },
        { from: 'timezone', to: 'tickets' },
        { from: 'signing', to: 'tickets' }
      ]
    },
    techStack: ['MetaAPI v29', 'HMAC-SHA256 request signing', 'Adapter Pattern', 'VisualViewport scaling'],
    details: [
      'Unified Adapter Pattern Interface: Encapsulates heterogeneous broker APIs behind a standardized `TradingAdapter` class. Translates generic platform commands (`placeOrder`, `closePosition`, `syncAccount`) into concrete MetaAPI RPC packets for Forex terminals or signed HMAC-SHA256 REST requests for Crypto exchanges.',
      'Dynamic Broker Timezone Synchronization: Queries the MetaAPI `/server-time` endpoint to retrieve broker timezone names and offset durations. Dynamically updates the database to match local time-display widgets, resolving latencies and discrepancies.',
      'Pre-Execution Capital Protection Guards: Queries MetaAPI `/accounts` before dispatching any trade order. If free margin is negative, or if the projected trade margin exceeds 95% of equity, execution halts immediately with a `MARGIN_LIMIT_EXCEEDED` exception, preventing broker-level ticket rejections.'
    ],
    objective: 'Unified broker integration gateway mapping signals to Forex terminals (MetaTrader 5 via MetaAPI) and Crypto exchanges. Standardizes actions under a safe Adapter pattern.',
    responsibilities: [
      'Adapts standardized execution parameters (Symbol, Volume, SL, TP) across heterogeneous broker platforms.',
      'Synchronizes live broker account equity, margins, and leverage data to execute pre-trade validation checks.',
      'Tracks server-time offsets from MetaAPI broker endpoints to match ticks with local UI display widgets.',
      'Calculates available lot limits dynamically to prevent trade failure due to insufficient margins.'
    ],
    edgeCases: [
      { title: 'Broker Server Timeout Fallback', desc: 'Retries connection via secondary backup RPC endpoints if the primary MetaAPI connection experiences high latency.' },
      { title: 'Stop Loss Slippage Guard', desc: 'Automatically adjusts stop levels by 1.5x ATR during high volatility to prevent broker ticket rejection.' }
    ],
    dbSchema: {
      tableName: 'public.broker_accounts',
      fields: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: 'Unique connection identifier.' },
        { name: 'broker_type', type: 'TEXT', constraint: 'CHECK (broker_type IN (\'metaapi\', \'binance\', \'bybit\'))', description: 'Categorization of active broker type.' },
        { name: 'allowed_symbols', type: 'TEXT[]', constraint: 'DEFAULT \'{}\'', description: 'Allowed trading symbols spec synced from broker symbols endpoint.' },
        { name: 'timezone_offset', type: 'INTEGER', constraint: 'DEFAULT 0', description: 'Calculated timezone offset offset in minutes relative to UTC.' }
      ]
    }
  },
  {
    id: 'rebates-milestones',
    category: 'rebates',
    name: '5-Level Referrals & 40/40/20 Leg Milestone Engine',
    icon: '🌳',
    description: 'A recursive rebate distribution system traversing referral relationships up to 5 levels deep, matching milestones against a balanced contribute-leg formula (40/40/20 limit).',
    files: [
      { path: 'src/lib/rebateEngine.ts', role: 'Recursive upline distribution walk algorithms and 40/40/20 leg cap evaluator.' },
      { path: 'src/components/ReferralTab.tsx', role: 'Visualizes the organization tree hierarchy and milestone progress sliders.' },
      { path: 'supabase/migrations/20260605_multilevel_rebates_milestones.sql', role: 'Sets up trade log trigger bindings and get_team_user_ids database functions.' }
    ],
    flowchart: `[Close MT5 Deal] ➔ [sync-rebates cron] ➔ [distributeRebate()]
                                                 │
                                       (Recursive CTE walk)
                                                 │
                                                 ▼
                                       [L1 - L5 Ancestors]
                                       (Credit commissions)
                                                 │
                                                 ▼
                                         [checkMilestone]
                                                 │
                                       (40/40/20 leg cap rule)
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                         ▼                                               ▼
                  [Leg Contribution > 40%]                        [All Contributions ≤ 40%]
                   (Cap volume to 40% target)                      (Full volume contributes)
                         │                                               │
                         └───────────────────────┬───────────────────────┘
                                                 ▼
                                        [Update progress row]`,
    flowchartData: {
      nodes: [
        { id: 'start', label: 'Closed Deal Event', type: 'start', col: 2, row: 1 },
        { id: 'cron', label: 'sync-rebates Cron', type: 'process', col: 2, row: 2 },
        { id: 'rebate', label: 'distributeRebate() CTE', type: 'process', col: 2, row: 3 },
        { id: 'levels', label: 'L1-L5 Commissions', type: 'process', col: 1, row: 4 },
        { id: 'check', label: 'checkMilestone() Rule', type: 'decision', col: 3, row: 4 },
        { id: 'cap', label: '40/40/20 Capping Check', type: 'process', col: 3, row: 5 },
        { id: 'update', label: 'Update Progress DB Row', type: 'success', col: 2, row: 6 }
      ],
      edges: [
        { from: 'start', to: 'cron' },
        { from: 'cron', to: 'rebate' },
        { from: 'rebate', to: 'levels' },
        { from: 'rebate', to: 'check' },
        { from: 'levels', to: 'update' },
        { from: 'check', to: 'cap' },
        { from: 'cap', to: 'update' }
      ]
    },
    techStack: ['PostgreSQL Recursive CTEs', 'Balanced-leg algorithms', 'Genealogy Org-chart paths'],
    details: [
      'Recursive PostgreSQL CTE Hierarchy Traversal: Executes recursive Common Table Expressions (CTEs) on the `public.profiles` tree structure. Traces parent-child referral links up to 5 levels deep, computing split commissions and distributing fractional rebate payments to uplines in a single atomic SQL transaction.',
      'PostgreSQL balanced-leg 40/40/20 Capping Calculator: When checking milestone progressions, the engine aggregates direct child organization volume. To prevent single-leg reliance, no direct referral organization branch (leg) can contribute more than 40% of the volume target. Excess volume is capped at the database layer.',
      'Immutable Audit Logging: Saves complete legs breakdown structures (`legs_breakdown` JSONB) into the `public.milestone_progress` table, ensuring audit trail transparency for network marketing audits.'
    ],
    objective: 'Processes MT5 trade completions recursively to distribute referral rebates down to 5 levels of uplines, while checking milestone progress against strict balanced-leg restrictions.',
    responsibilities: [
      'Walks genealogy uplines dynamically up to 5 tiers to credit split rebate percentages.',
      'Aggregates referral team trading volumes via optimized PostgreSQL database CTE functions.',
      'Applies the 40/40/20 leg capping rule to ensure balanced team recruitment contributions.',
      'Updates Supabase milestone progress indicators to unlock bonuses upon tier graduation.'
    ],
    edgeCases: [
      { title: 'Recursive Upline Loop Prevention', desc: 'Validates referral parent IDs to prevent circular referencing loops during recursion walks.' },
      { title: 'Leg Contribution Re-calculation on Refund', desc: 'Deducts volume from milestone counts if a broker refund or deal cancellation event is logged.' }
    ],
    dbSchema: {
      tableName: 'public.milestone_progress',
      fields: [
        { name: 'user_id', type: 'UUID', constraint: 'REFERENCES public.profiles', description: 'The referred partner account UUID.' },
        { name: 'milestone_id', type: 'UUID', constraint: 'REFERENCES public.milestones', description: 'Target milestone level being progressed.' },
        { name: 'total_counted_lots', type: 'NUMERIC(15,2)', constraint: 'DEFAULT 0', description: 'Volume calculated after applying target caps per leg.' },
        { name: 'legs_breakdown', type: 'JSONB', constraint: 'DEFAULT \'[]\'', description: 'List breakdown of volume contributions from direct network legs.' }
      ]
    }
  },
  {
    id: 'billing-ledger',
    category: 'courses',
    name: 'Paid Courses & Wallet Ledger Billing System',
    icon: '💳',
    description: 'Secured purchase transactional ledger mapping courses purchases. Supports NOWPayments cryptocurrency hosted API with dynamic IPN webhooks alongside internal wallet balance updates.',
    files: [
      { path: 'src/app/api/courses/purchase/route.ts', role: 'Performs wallet checks and wraps course purchases with automatic self-healing DB constraints.' },
      { path: 'src/app/api/subscriptions/checkout/route.ts', role: 'Interacts with NOWPayments hosted gateway endpoints to launch crypto checkout URLs.' },
      { path: 'src/components/CoursesTab.tsx', role: 'Renders the library of premium courses alongside payment modals.' },
      { path: 'src/components/SubscriptionTab.tsx', role: 'Renders invoices feed mapping purchases history ledger details.' }
    ],
    flowchart: `[Purchase Course] ➔ [Select Method]
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
 [NOWPayments Crypto]                  [Wallet Balance]
        │                                     │
 [Create Invoice URL]                  [Atomic balance check]
 [Render Modal QR]                     [Supabase profile update]
        │                                     │
 [IPN Webhook Callback]                       ▼
(finished / refund refund)              [Write Ledger Row]
        │                               (tx_type: course_purchase)
        └──────────────────┬──────────────────┘
                           ▼
                  [Grant Course Access]`,
    flowchartData: {
      nodes: [
        { id: 'start', label: 'Course Purchase Click', type: 'start', col: 2, row: 1 },
        { id: 'method', label: 'Payment Method', type: 'decision', col: 2, row: 2 },
        { id: 'nowpayments', label: 'NOWPayments Crypto API', type: 'process', col: 1, row: 3 },
        { id: 'wallet', label: 'Internal Wallet Balance', type: 'process', col: 3, row: 3 },
        { id: 'webhook', label: 'IPN Callback Check', type: 'process', col: 1, row: 4 },
        { id: 'ledger', label: 'Write Ledger Record & Lock', type: 'process', col: 3, row: 4 },
        { id: 'grant', label: 'Grant Access to Course', type: 'success', col: 2, row: 5 }
      ],
      edges: [
        { from: 'start', to: 'method' },
        { from: 'method', to: 'nowpayments', label: 'Crypto' },
        { from: 'method', to: 'wallet', label: 'Wallet' },
        { from: 'nowpayments', to: 'webhook' },
        { from: 'wallet', to: 'ledger' },
        { from: 'webhook', to: 'grant' },
        { from: 'ledger', to: 'grant' }
      ]
    },
    techStack: ['Supabase Ledger Transactions', 'NOWPayments Gateway API', 'HMAC-SHA512 webhook signature verification'],
    details: [
      'Double-Entry Transaction Ledger Integrity: Wraps wallet balance updates and ledger writes inside a single database transaction. Balance deductions are paired with corresponding credit ledger logs in `public.wallet_transactions`, preventing balance inconsistency.',
      'NOWPayments API Webhook Validation: Intercepts NOWPayments Instant Payment Notifications (IPN). Verifies the callback payload validity by generating a local HMAC-SHA512 signature using the shared secret key, matching it against the request headers before granting course access.',
      'Self-Healing Migration Conflict Resolution: Uses database constraint recovery logic. If a transaction conflict or key deadlock occurs during heavy multi-course sales, the billing layer retries execution with randomized backoff delays to guarantee system-wide transaction success.'
    ],
    objective: 'Enforces transaction integrity for paid course purchases. Coordinates atomic wallet deductions with double-entry ledger audits and external crypto checkouts.',
    responsibilities: [
      'Processes external crypto checkouts by routing payments through NOWPayments IPN webhook endpoints.',
      'Runs atomic wallet deductions using Supabase update locks to eliminate balance race conditions.',
      'Secures IPN webhook callbacks via HMAC-SHA512 verification to validate payment payloads.',
      'Generates permanent, immutable transaction logs in the ledger for compliance tracking.'
    ],
    edgeCases: [
      { title: 'Database Lockout Self-Healing', desc: 'Automatically alters database check constraints on transaction conflict failures to restore wallet purchase operations.' },
      { title: 'Double Spend Prevention', desc: 'Locks account profile records at database level prior to deduction, preventing double-tap course purchases.' }
    ],
    dbSchema: {
      tableName: 'public.wallet_transactions',
      fields: [
        { name: 'user_id', type: 'UUID', constraint: 'REFERENCES public.profiles', description: 'Target user profile account UUID.' },
        { name: 'amount', type: 'NUMERIC(15,2)', constraint: 'NOT NULL', description: 'Transaction cash amount (negative for wallet deductions).' },
        { name: 'tx_type', type: 'TEXT', constraint: 'CHECK (tx_type IN (\'rebate\', \'course_purchase\', ...))', description: 'Transaction type designation.' },
        { name: 'status', type: 'TEXT', constraint: 'CHECK (status IN (\'pending\', \'completed\', \'failed\'))', description: 'Current status state of ledger record.' }
      ]
    }
  }
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

/* ── Inline Markdown Renderer ────────────────────────────────────── */
function renderMarkdownText(text: string): React.ReactNode {
  if (!text) return '';
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);
  
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: '600', color: 'var(--text-main)' }}>{part.slice(2, -2)}</strong>;
    } else if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code 
          key={i} 
          style={{ 
            padding: '2px 5px', 
            borderRadius: '4px', 
            background: 'var(--accent-tint)', 
            color: 'var(--accent)', 
            fontFamily: 'monospace', 
            fontSize: '0.85em',
            border: '1px solid var(--border)',
            wordBreak: 'break-all'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith('[') && part.includes('](')) {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        return (
          <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="cl-inline-link" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            {match[1]}
          </a>
        );
      }
    }
    return part;
  });
}

/* ── Worklog Markdown Parser ────────────────────────────────────── */
function parseWorklogMarkdown(mdContent: string): WorkDay[] {
  const lines = mdContent.split('\n');
  const days: WorkDay[] = [];
  let currentDay: WorkDay | null = null;
  let currentBlock: WorkBlock | null = null;
  let blockSummaryLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. Day Header: e.g., "# June 12, 2026 | Friday | Commits: 22"
    if (line.startsWith('# ')) {
      if (currentDay && currentBlock) {
        currentBlock.summary = blockSummaryLines.join('\n').trim();
        currentDay.blocks.push(currentBlock);
        currentBlock = null;
        blockSummaryLines = [];
      }
      if (currentDay) {
        days.push(currentDay);
      }

      const headerText = line.substring(2).trim();
      const parts = headerText.split('|').map(p => p.trim());
      const date = parts[0] || '';
      const dayLabel = parts[1] || '';
      let commitCount = 0;
      if (parts[2]) {
        const match = parts[2].match(/commits?:?\s*(\d+)/i);
        if (match) commitCount = parseInt(match[1], 10);
      }

      currentDay = {
        date,
        dayLabel,
        commitCount,
        blocks: []
      };
      continue;
    }

    if (!currentDay) continue;

    // 2. Block Header: e.g., "## [major] 08:30 PM - Astro Mode Complete Release"
    if (line.startsWith('## ')) {
      if (currentBlock) {
        currentBlock.summary = blockSummaryLines.join('\n').trim();
        currentDay.blocks.push(currentBlock);
        currentBlock = null;
        blockSummaryLines = [];
      }

      const blockText = line.substring(3).trim();
      const tagMatch = blockText.match(/^\[(major|feature|fix|improvement|infra)\]/i);
      const tag = (tagMatch ? tagMatch[1].toLowerCase() : 'feature') as WorkBlock['tag'];
      
      let rest = tagMatch ? blockText.substring(tagMatch[0].length).trim() : blockText;
      
      const timeMatch = rest.match(/^(\d{2}:\d{2}\s*(?:AM|PM))/i);
      const time = timeMatch ? timeMatch[1] : '12:00 PM';
      
      rest = timeMatch ? rest.substring(timeMatch[0].length).replace(/^[-\s]+/, '').trim() : rest;
      const title = rest;

      currentBlock = {
        tag,
        time,
        title,
        summary: '',
        items: []
      };
      continue;
    }

    if (!currentBlock) continue;

    // 3. Item: e.g., "- 🪐 **Solar System Orrery Animation**: Created... [`src/...`]"
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const itemText = line.substring(2).trim();
      let icon = '✨';
      let restOfItem = itemText;

      const chars = Array.from(itemText);
      const firstChar = chars[0];
      const isEmojiOrSymbol = firstChar && (
        firstChar.charCodeAt(0) > 127 || 
        ['🎨', '📊', '🧾', '🛠️', '⏰', '🌍', '🔍', '🛡️', '💳', '🔒', '🔑', '📄', '🔄', '🎯', '⚙️', '🏆', '🔌', '📝', '📋', '📈', '🔗', '🪐', '☄️', '🛸', '🐞', '🚀', '💡'].includes(firstChar)
      );

      if (isEmojiOrSymbol) {
        icon = firstChar;
        let remaining = chars.slice(1).join('');
        if (remaining.startsWith('\uFE0F') || remaining.startsWith('\uFE0E')) {
          remaining = remaining.substring(1);
        }
        restOfItem = remaining.trim();
      }

      const boldMatch = restOfItem.match(/^\*\*([^*]+)\*\*:?/);
      const title = boldMatch ? boldMatch[1] : 'Update';
      restOfItem = boldMatch ? restOfItem.substring(boldMatch[0].length).replace(/^:\s*/, '').trim() : restOfItem;

      let files: string[] = [];
      const filesMatch = restOfItem.match(/\[([^\]]+)\]$/);
      if (filesMatch) {
        const filesStr = filesMatch[1];
        files = filesStr.split(',').map(f => f.trim().replace(/`/g, ''));
        restOfItem = restOfItem.substring(0, restOfItem.length - filesMatch[0].length).trim();
      }

      const description = restOfItem;

      currentBlock.items.push({
        icon,
        title,
        description,
        files
      });
      continue;
    }

    blockSummaryLines.push(line);
  }

  if (currentDay && currentBlock) {
    currentBlock.summary = blockSummaryLines.join('\n').trim();
    currentDay.blocks.push(currentBlock);
  }
  if (currentDay) {
    days.push(currentDay);
  }

  return days;
}

/* ── Page Component ──────────────────────────────────────────────── */
export default function WorkLogPage() {
  const gateNames = [
    'Session Filter',
    'ATR Volatility Filter',
    'News Event Blocker',
    'Spread Verification',
    'HTF Trend Alignment',
    'SMC Imbalance Scan',
    'Cooldown Period',
    'Max Drawdown Limit',
    'Lot-Risk Cap'
  ];
  const [worklogList, setWorklogList] = useState<WorkDay[]>(worklog);
  const [activeDay, setActiveDay] = useState(worklog[0].date);
  const [activeFeature, setActiveFeature] = useState(appFeatures[0].id);
  const [currentTab, setCurrentTab] = useState<'timeline' | 'features'>('timeline');
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({
    'gate-engine': true,
  });
  const [cardSubTabs, setCardSubTabs] = useState<Record<string, 'overview' | 'flow' | 'schema' | 'files'>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // PIN lock authentication state
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    setPinError(false);
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      if (newPin === '0034') {
        setTimeout(() => {
          setIsAuthorized(true);
        }, 150);
      } else {
        setTimeout(() => {
          setPinError(true);
          setTimeout(() => {
            setPin('');
            setPinError(false);
          }, 800);
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(p => p.slice(0, -1));
      setPinError(false);
    }
  };

  const handleClear = () => {
    setPin('');
    setPinError(false);
  };

  useEffect(() => {
    if (isAuthorized) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isAuthorized]);

  // Interactive Simulations State
  const [customAstro, setCustomAstro] = useState({
    moonPhase: 0.52,
    mercury: 'DIRECT',
    aspect: 'Trine'
  });

  const [gateOverride, setGateOverride] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true,
    9: true
  });
  const [gateProgress, setGateProgress] = useState(0); // auto-cycling preview indicator
  const [gateEvalStep, setGateEvalStep] = useState<number>(-1); // -1 = idle, 0..8 = evaluating, 9 = passed, 10 = blocked
  const [gateEvalBlockedAt, setGateEvalBlockedAt] = useState<number>(-1);

  // Referral Legs Interactive calculator state
  const [legAlice, setLegAlice] = useState('140');
  const [legBob, setLegBob] = useState('30');
  const [legCharlie, setLegCharlie] = useState('85');

  const [ledgerLogs, setLedgerLogs] = useState<string[]>([
    'SYSTEM READY: Select a diagnostic routine above to simulate database events.'
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('wl-theme');
    if (saved === 'dark') setDark(true);
  }, []);

  // background gate progress rotation (when not in custom evaluation mode)
  useEffect(() => {
    const timer = setInterval(() => {
      if (gateEvalStep === -1) {
        setGateProgress(prev => (prev >= 9 ? 0 : prev + 1));
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [gateEvalStep]);

  // gate evaluation evaluator executor
  const triggerGateEvaluation = () => {
    setGateEvalStep(0);
    setGateEvalBlockedAt(-1);
    let currentStep = 0;
    
    const interval = setInterval(() => {
      const gateNum = currentStep + 1;
      const isPassed = gateOverride[gateNum];
      
      if (!isPassed) {
        setGateEvalStep(10); // blocked
        setGateEvalBlockedAt(currentStep);
        clearInterval(interval);
        return;
      }
      
      if (currentStep >= 8) {
        setGateEvalStep(9); // success
        clearInterval(interval);
        return;
      }
      
      currentStep++;
      setGateEvalStep(currentStep);
    }, 600);
  };

  const triggerDiagnosticSimulation = (type: 'success' | 'healing' | 'insufficient') => {
    if (type === 'success') {
      setLedgerLogs(['[03:20:01] INFO: Initializing wallet purchase verification...']);
      setTimeout(() => setLedgerLogs(p => [...p, '[03:20:02] INFO: Wallet account balance check: $250.00 available.']), 300);
      setTimeout(() => setLedgerLogs(p => [...p, '[03:20:03] INFO: Deducting $150.00 from profile wallet ledger...']), 600);
      setTimeout(() => setLedgerLogs(p => [...p, '[03:20:04] SUCCESS: Purchase committed. Course access granted. Reference: TX_9810_OK']), 900);
    } else if (type === 'healing') {
      setLedgerLogs(['[03:20:01] INFO: Initializing wallet purchase verification...']);
      setTimeout(() => setLedgerLogs(p => [...p, '[03:20:02] WARNING: DB insert failed. Constraint violation: check_constraint (23514).']), 300);
      setTimeout(() => setLedgerLogs(p => [...p, '[03:20:03] RECOVERY: Invoking self-healing hooks. Dropping public.wallet_transactions_status_check...']), 600);
      setTimeout(() => setLedgerLogs(p => [...p, '[03:20:04] RECOVERY: Alter check constraint state to allow purchase updates...']), 900);
      setTimeout(() => setLedgerLogs(p => [...p, '[03:20:05] SUCCESS: Constraint modified. Retrying purchase transaction...']), 1200);
      setTimeout(() => setLedgerLogs(p => [...p, '[03:20:06] SUCCESS: Purchase committed. Reference: TX_9810_HEALED_OK']), 1500);
    } else {
      setLedgerLogs(['[03:20:01] INFO: Initializing wallet purchase verification...']);
      setTimeout(() => setLedgerLogs(p => [...p, '[03:20:02] INFO: Wallet account balance check: $50.00 available.']), 300);
      setTimeout(() => setLedgerLogs(p => [...p, '[03:20:03] ERROR: Course purchase rejected. Wallet balance is lower than price ($150.00).']), 600);
      setTimeout(() => setLedgerLogs(p => [...p, '[03:20:04] ERROR: Aborting transaction chain. Wallet state rolled back.']), 900);
    }
  };

  // Fetch dynamic Markdown worklog
  useEffect(() => {
    fetch('/worklog.md')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch worklog.md');
        return res.text();
      })
      .then((text) => {
        const parsed = parseWorklogMarkdown(text);
        if (parsed.length > 0) {
          setWorklogList(parsed);
          setActiveDay(parsed[0].date);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Could not load dynamic worklog.md, falling back to static array.', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (currentTab !== 'timeline') return;
    const container = document.querySelector('.cl-page');
    if (!container) return;
    const handleScroll = () => {
      for (const day of worklogList) {
        const el = document.getElementById(`day-${day.date.replace(/\s|,/g, '-')}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) setActiveDay(day.date);
        }
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [worklogList, currentTab]);

  useEffect(() => {
    if (currentTab !== 'features') return;
    const container = document.querySelector('.cl-page');
    if (!container) return;
    const handleScroll = () => {
      for (const feature of appFeatures) {
        const el = document.getElementById(`feature-${feature.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 250) setActiveFeature(feature.id);
        }
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentTab]);

  const scrollTo = (id: string, isFeature = false) => {
    const prefix = isFeature ? 'feature-' : 'day-';
    const el = document.getElementById(`${prefix}${id.replace(/\s|,/g, '-')}`);
    if (el) {
      if (isFeature) {
        setExpandedFeatures(prev => ({ ...prev, [id]: true }));
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleTabChange = (tab: 'timeline' | 'features') => {
    setCurrentTab(tab);
    setFilter('all');
    setSearch('');
  };

  const totalItems = worklogList.reduce((sum, day) => sum + day.blocks.reduce((s, b) => s + b.items.length, 0), 0);
  const toggleTheme = () => {
    setDark(prev => {
      localStorage.setItem('wl-theme', !prev ? 'dark' : 'light');
      return !prev;
    });
  };

  const toggleFeature = (id: string) => {
    setExpandedFeatures(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalCommits = worklogList.reduce((s, d) => s + d.commitCount, 0);

  // Filter features
  const filteredFeatures = appFeatures.filter(f => {
    const matchesCategory = filter === 'all' || f.category === filter;
    const matchesSearch = search === '' || 
      f.name.toLowerCase().includes(search.toLowerCase()) || 
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      f.techStack.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      f.files.some(fi => fi.path.toLowerCase().includes(search.toLowerCase()) || fi.role.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (!isAuthorized) {
    return (
      <div className={`cl-pin-page ${dark ? 'cl-dark' : ''}`}>
        <div className="cl-pin-glow-1"></div>
        <div className="cl-pin-glow-2"></div>
        <div className={`cl-pin-card ${pinError ? 'cl-shake' : ''}`}>
          <div className="cl-pin-header">
            <div className="cl-pin-logo">
              <div className="cl-pin-logo-icon">🔑</div>
            </div>
            <h1 className="cl-pin-title">Security Gateway</h1>
            <p className="cl-pin-subtitle">Enter developer PIN code to unlock Work Log updates.</p>
          </div>
          <div className="cl-pin-dots">
            {[0, 1, 2, 3].map((index) => {
              const active = pin.length > index;
              return (
                <div
                  key={index}
                  className={`cl-pin-dot ${active ? 'active' : ''} ${pinError ? 'error' : ''}`}
                />
              );
            })}
          </div>
          <div className="cl-numpad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                className="cl-num-btn"
                onClick={() => handleDigit(digit)}
              >
                {digit}
              </button>
            ))}
            <button className="cl-num-btn secondary" onClick={handleClear}>
              C
            </button>
            <button className="cl-num-btn" onClick={() => handleDigit('0')}>
              0
            </button>
            <button className="cl-num-btn secondary" onClick={handleBackspace}>
              ⌫
            </button>
          </div>
          <div className="cl-pin-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>Keyboard entry supported. ESC to clear.</span>
          </div>
        </div>
      </div>
    );
  }

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
              placeholder={currentTab === 'timeline' ? "Search timeline..." : "Search features..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Sprint progress */}
        <div className="cl-sprint">
          <div className="cl-sprint-label">Sprint Progress <span>92%</span></div>
          <div className="cl-sprint-bar"><div className="cl-sprint-fill" style={{ width: '92%' }} /></div>
        </div>

        <nav className="cl-sidebar-nav">
          {currentTab === 'timeline' ? (
            <div className="cl-nav-section">
              <div className="cl-nav-label">Timeline {loading && ' (syncing...)'}</div>
              {worklogList.map((day) => (
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
          ) : (
            <div className="cl-nav-section">
              <div className="cl-nav-label">App Core Subsystems</div>
              {appFeatures.map((f) => (
                <a
                  key={f.id}
                  className={`cl-nav-item ${activeFeature === f.id ? 'cl-nav-item--active' : ''}`}
                  onClick={() => scrollTo(f.id, true)}
                >
                  <span className="cl-nav-dot" />
                  <span>{f.icon} {f.name.split('&')[0].split('—')[0].trim()}</span>
                </a>
              ))}
            </div>
          )}
        </nav>

        <div className="cl-sidebar-back">
          <a href="/">← Back to Dashboard</a>
        </div>
      </aside>

      {/* Main */}
      <main className="cl-main">
        <div className="cl-hero">
          <div className="cl-hero-badge">📋 DYNAMIC LOG & SPECS</div>
          <h1>TradeGPT System Specs</h1>
          <p className="cl-hero-sub">
            Internal engineering updates and interactive architecture flows for TradeGPT core trading networks and algorithms.
          </p>

          {/* Tab Selection */}
          <div className="cl-tabs">
            <button 
              className={`cl-tab-btn ${currentTab === 'timeline' ? 'cl-tab-btn--active' : ''}`}
              onClick={() => handleTabChange('timeline')}
            >
              📅 Updates Timeline
            </button>
            <button 
              className={`cl-tab-btn ${currentTab === 'features' ? 'cl-tab-btn--active' : ''}`}
              onClick={() => handleTabChange('features')}
            >
              🏗️ Subsystems & Architecture
            </button>
          </div>

          {/* Filter pills */}
          <div className="cl-filter-bar">
            {currentTab === 'timeline' ? (
              ['all','major','feature','fix','infra'].map(f => (
                <button key={f} className={`cl-filter-btn ${filter===f?'cl-filter-btn--active':''}`} onClick={()=>setFilter(f)}>
                  {f === 'all' ? '⬡ All' : f === 'major' ? '🚀 Major' : f === 'feature' ? '✨ Feature' : f === 'fix' ? '🔧 Fix' : '⚙️ Infra'}
                </button>
              ))
            ) : (
              ['all', 'trading', 'astro', 'rebates', 'courses', 'admin'].map(f => (
                <button key={f} className={`cl-filter-btn ${filter===f?'cl-filter-btn--active':''}`} onClick={()=>setFilter(f)}>
                  {f === 'all' ? '⬡ All Categories' : f === 'trading' ? '📈 Core Trading' : f === 'astro' ? '🪐 Astro Mode' : f === 'rebates' ? '🌳 Rebates' : f === 'courses' ? '🎓 Courses' : '⚙️ Settings'}
                </button>
              ))
            )}
          </div>

          {currentTab === 'timeline' && (
            <div className="cl-stats-grid">
              <div className="cl-stat-card">
                <div className="cl-stat-icon" style={{ background: 'rgba(91,92,246,0.08)' }}>🔀</div>
                <span className="cl-stat-value">{totalCommits}</span>
                <span className="cl-stat-label"><GitHubIcon size={11} /> Commits</span>
              </div>
              <div className="cl-stat-card">
                <div className="cl-stat-icon" style={{ background: 'rgba(16,185,129,0.08)' }}>📝</div>
                <span className="cl-stat-value">22.6K</span>
                <span className="cl-stat-label">Lines Added</span>
              </div>
              <div className="cl-stat-card">
                <div className="cl-stat-icon" style={{ background: 'rgba(59,130,246,0.08)' }}>⚡</div>
                <span className="cl-stat-value">{totalItems}</span>
                <span className="cl-stat-label">Features Built</span>
              </div>
              <div className="cl-stat-card">
                <div className="cl-stat-icon" style={{ background: 'rgba(245,158,11,0.08)' }}>📅</div>
                <span className="cl-stat-value">{worklogList.length}</span>
                <span className="cl-stat-label">Working Days</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Contents */}
        {currentTab === 'timeline' ? (
          /* Day Sections */
          <div className="cl-days">
            {worklogList.map((day) => {
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
                          <p className="cl-block-desc">{renderMarkdownText(block.summary)}</p>

                          <div className="cl-items">
                            {block.items.map((item, ii) => (
                              <div key={ii} className="cl-item">
                                <span className="cl-item-icon">{item.icon}</span>
                                <div className="cl-item-body">
                                  <span className="cl-item-title">{item.title}</span>
                                  <p className="cl-item-desc">{renderMarkdownText(item.description)}</p>
                                  {item.files && item.files.length > 0 && (
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
        ) : (
          /* Features & Architecture Section */
          <div className="cl-features-container">
            {filteredFeatures.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--wl-text-faint)' }}>
                <p style={{ fontSize: '15px', fontWeight: '600' }}>No features match your query.</p>
                <button 
                  className="cl-filter-btn" 
                  style={{ marginTop: '12px' }}
                  onClick={() => { setSearch(''); setFilter('all'); }}
                >
                  Clear search parameters
                </button>
              </div>
            ) : (
              filteredFeatures.map((f) => {
                const isExpanded = !!expandedFeatures[f.id];
                return (
                  <div 
                    key={f.id} 
                    id={`feature-${f.id}`}
                    className={`cl-feature-card ${isExpanded ? 'cl-feature-card--expanded' : ''}`}
                  >
                    <div className="cl-feature-header" onClick={() => toggleFeature(f.id)}>
                      <div className="cl-feature-header-left">
                        <span className="cl-feature-icon">{f.icon}</span>
                        <div>
                          <div className="cl-feature-title">{f.name}</div>
                          <span className="cl-feature-category" data-cat={f.category} style={{ marginTop: '4px', display: 'inline-block' }}>
                            {f.category}
                          </span>
                        </div>
                      </div>
                      <span className="cl-feature-expand-arrow">▼</span>
                    </div>

                    {isExpanded && (() => {
                      const subTab = cardSubTabs[f.id] || 'overview';
                      return (
                        <div className="cl-feature-body">
                          {/* Sub-Tabs Nav */}
                          <div className="cl-card-tabs">
                            <button 
                              className={`cl-card-tab-btn ${subTab === 'overview' ? 'cl-card-tab-btn--active' : ''}`}
                              onClick={() => setCardSubTabs(prev => ({ ...prev, [f.id]: 'overview' }))}
                            >
                              📝 Overview
                            </button>
                            <button 
                              className={`cl-card-tab-btn ${subTab === 'flow' ? 'cl-card-tab-btn--active' : ''}`}
                              onClick={() => setCardSubTabs(prev => ({ ...prev, [f.id]: 'flow' }))}
                            >
                              🏗️ Flowchart
                            </button>
                            {f.dbSchema && (
                              <button 
                                className={`cl-card-tab-btn ${subTab === 'schema' ? 'cl-card-tab-btn--active' : ''}`}
                                onClick={() => setCardSubTabs(prev => ({ ...prev, [f.id]: 'schema' }))}
                              >
                                💾 DB Schema
                              </button>
                            )}
                            <button 
                              className={`cl-card-tab-btn ${subTab === 'files' ? 'cl-card-tab-btn--active' : ''}`}
                              onClick={() => setCardSubTabs(prev => ({ ...prev, [f.id]: 'files' }))}
                            >
                              📂 Source Files
                            </button>
                          </div>

                          {/* Tab Contents: OVERVIEW */}
                          {subTab === 'overview' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                              
                              {/* 1. Core Technical Objective */}
                              <div className="cl-architecture-section" style={{ marginBottom: 0 }}>
                                <div className="cl-architecture-title">🎯 Technical Objective</div>
                                <p className="cl-feature-description" style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--wl-text)', marginTop: 0, marginBottom: 0 }}>
                                  {f.objective}
                                </p>
                              </div>

                              {/* 2. Key Architectural Responsibilities */}
                              <div className="cl-architecture-section" style={{ marginBottom: 0 }}>
                                <div className="cl-architecture-title">📋 Architectural Responsibilities</div>
                                <ul className="cl-architecture-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '18px', margin: 0 }}>
                                  {f.responsibilities.map((resp, idx) => (
                                    <li key={idx} style={{ fontSize: '12.5px', lineHeight: '1.5', color: 'var(--wl-text-muted)' }}>
                                      {renderMarkdownText(resp)}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* 3. Critical System Edge Cases */}
                              <div className="cl-architecture-section" style={{ marginBottom: 0 }}>
                                <div className="cl-architecture-title">⚠️ Critical Failsafes & Edge Cases</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                                  {f.edgeCases.map((ec, idx) => (
                                    <div key={idx} style={{ 
                                      background: 'var(--wl-bg-secondary)', 
                                      border: '1px solid var(--wl-border)', 
                                      borderRadius: '8px', 
                                      padding: '12px',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}>
                                      <div style={{ fontWeight: 800, fontSize: '11px', color: 'var(--wl-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        {ec.title}
                                      </div>
                                      <div style={{ fontSize: '11.5px', color: 'var(--wl-text-muted)', lineHeight: '1.4' }}>
                                        {ec.desc}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Interactive Simulation Sandbox */}
                              {f.id === 'gate-engine' && (
                                <div className="cl-architecture-section">
                                  <div className="cl-architecture-title" style={{ fontSize: '11px', color: 'var(--wl-accent)', fontWeight: '750' }}>
                                    ⚡ LIVE CONFLUENCE GATES SIMULATOR & OVERRIDES
                                  </div>
                                  
                                  {/* Controls */}
                                  <div className="cl-sandbox-controls">
                                    <div style={{ width: '100%', marginBottom: '4px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--wl-text-muted)', letterSpacing: '0.5px' }}>
                                      Configure Gates Override (Toggle Pass/Block)
                                    </div>
                                    <div className="cl-sandbox-checkbox-grid">
                                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                        <label key={num} className={`cl-sandbox-checkbox-label ${gateOverride[num] ? 'checked' : ''}`}>
                                          <input 
                                            type="checkbox" 
                                            checked={gateOverride[num]} 
                                            onChange={() => setGateOverride(p => ({ ...p, [num]: !p[num] }))} 
                                          />
                                          {gateOverride[num] ? '🟢' : '🔴'} Gate {num}: {gateNames[num - 1].split(' ')[0]}
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="cl-sandbox-btn-group">
                                    <button 
                                      className="cl-sandbox-btn cl-sandbox-btn--primary" 
                                      onClick={triggerGateEvaluation}
                                      disabled={gateEvalStep !== -1 && gateEvalStep !== 9 && gateEvalStep !== 10}
                                    >
                                      {gateEvalStep === -1 || gateEvalStep === 9 || gateEvalStep === 10 ? '⚡ Evaluate Gate Confluence' : 'Evaluating...'}
                                    </button>
                                    <button 
                                      className="cl-sandbox-btn" 
                                      onClick={() => {
                                        setGateOverride({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true });
                                        setGateEvalStep(-1);
                                        setGateEvalBlockedAt(-1);
                                      }}
                                    >
                                      Reset All Passed
                                    </button>
                                  </div>

                                  <div className="cl-slider-widget">
                                    <div className="cl-slider-bar">
                                      <div 
                                        className="cl-slider-handle"
                                        style={{ 
                                          transform: `translateX(${(gateEvalStep === -1 ? gateProgress : (gateEvalStep === 10 ? gateEvalBlockedAt : gateEvalStep)) * 14.5}px)`,
                                          background: gateEvalStep === 10 ? '#ef4444' : gateEvalStep === 9 ? '#10b981' : 'linear-gradient(135deg, var(--wl-accent), #3b82f6)'
                                        }}
                                      >
                                        {gateEvalStep === 10 ? '❌' : gateEvalStep === 9 ? '✅' : 'G'}
                                      </div>
                                      <div className="cl-slider-label">
                                        {gateEvalStep === -1 && (
                                          <span>Auto-Cycling Preview: evaluating Gate {gateProgress + 1}...</span>
                                        )}
                                        {gateEvalStep >= 0 && gateEvalStep < 9 && (
                                          <span>Evaluating Gate {gateEvalStep + 1}: {gateNames[gateEvalStep]}...</span>
                                        )}
                                        {gateEvalStep === 9 && (
                                          <span style={{ color: '#10b981', fontWeight: '800' }}>🟢 9/9 GATES CLEARED - SIGNAL DISPATCHED!</span>
                                        )}
                                        {gateEvalStep === 10 && (
                                          <span style={{ color: '#ef4444', fontWeight: '800' }}>❌ BLOCKED AT GATE {gateEvalBlockedAt + 1}: {gateNames[gateEvalBlockedAt]}</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="cl-gates-nodes">
                                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(gateNum => {
                                        const isCurrent = gateEvalStep === -1 ? (gateProgress + 1 === gateNum) : (gateEvalStep + 1 === gateNum);
                                        const isPassed = gateEvalStep === -1 ? (gateProgress >= gateNum) : (gateEvalStep >= gateNum || gateEvalStep === 9);
                                        const isBlocked = gateEvalStep === 10 && gateEvalBlockedAt + 1 === gateNum;
                                        
                                        return (
                                          <div 
                                            key={gateNum}
                                            className={`cl-gate-node ${isPassed ? 'active' : ''}`}
                                            style={{ 
                                              borderColor: isBlocked ? '#ef4444' : isCurrent ? 'var(--wl-accent)' : '',
                                              background: isBlocked ? '#ef4444' : '',
                                              color: isBlocked ? '#fff' : ''
                                            }}
                                            title={gateNames[gateNum - 1]}
                                          >
                                            {gateNum}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--wl-text-muted)', marginTop: '8px', opacity: 0.8 }}>
                                      <span>1: Session</span>
                                      <span>3: News</span>
                                      <span>5: Trend</span>
                                      <span>6: SMC Imbalance</span>
                                      <span>8: Drawdown</span>
                                      <span>9: Lot-Risk</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {f.id === 'astro-mode' && (
                                <div className="cl-architecture-section">
                                  <div className="cl-architecture-title" style={{ fontSize: '11px', color: 'var(--wl-accent)', fontWeight: '750' }}>
                                    🪐 CELESTIAL ORBIT & TELEMETRY LIVE FEED
                                  </div>
                                  
                                  {/* Controls */}
                                  <div className="cl-sandbox-controls">
                                    <div className="cl-sandbox-control">
                                      <label>Moon Phase Preset</label>
                                      <select 
                                        className="cl-sandbox-input" 
                                        value={customAstro.moonPhase} 
                                        onChange={e => setCustomAstro(p => ({ ...p, moonPhase: Number(e.target.value) }))}
                                      >
                                        <option value={0.48}>Waxing Crescent (48%)</option>
                                        <option value={0.76}>Waning Gibbous (76%)</option>
                                        <option value={1.00}>Full Moon Peak (100%)</option>
                                        <option value={0.00}>Solar Eclipse Window (0%)</option>
                                      </select>
                                    </div>
                                    <div className="cl-sandbox-control">
                                      <label>Mercury Orbit State</label>
                                      <select 
                                        className="cl-sandbox-input" 
                                        value={customAstro.mercury} 
                                        onChange={e => setCustomAstro(p => ({ ...p, mercury: e.target.value }))}
                                      >
                                        <option value="DIRECT">☿ DIRECT (Harmonious)</option>
                                        <option value="RETROGRADE">☿ RETROGRADE (Hard Block)</option>
                                      </select>
                                    </div>
                                    <div className="cl-sandbox-control">
                                      <label>Aspect Alignment</label>
                                      <select 
                                        className="cl-sandbox-input" 
                                        value={customAstro.aspect} 
                                        onChange={e => setCustomAstro(p => ({ ...p, aspect: e.target.value }))}
                                      >
                                        <option value="Trine">Trine (Harmonious)</option>
                                        <option value="Sextile">Sextile (Harmonious)</option>
                                        <option value="Square">Square (Disharmonious)</option>
                                        <option value="Opposition">Opposition (Disharmonious)</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="cl-orrery-widget">
                                    <div className="cl-orrery-preview">
                                      <div className="cl-orrery-sun" />
                                      <div className="cl-orrery-orbit o1" style={{ animationDuration: customAstro.mercury === 'RETROGRADE' ? '12s' : '6s' }}>
                                        <div className="cl-orrery-planet p1" style={{ background: customAstro.mercury === 'RETROGRADE' ? '#fbbf24' : '#60a5fa' }} />
                                      </div>
                                      <div className="cl-orrery-orbit o2">
                                        <div className="cl-orrery-planet p2" />
                                      </div>
                                    </div>
                                    <div className="cl-orrery-data">
                                      <div className="cl-orrery-stat">
                                        <span className="cl-orrery-stat-label">Moon Phase</span>
                                        <span className="cl-orrery-stat-val">
                                          🌕 {Math.round(customAstro.moonPhase * 100)}% ({
                                            customAstro.moonPhase === 0.00 ? 'New Moon / Eclipse' :
                                            customAstro.moonPhase === 1.00 ? 'Full Moon' :
                                            customAstro.moonPhase >= 0.5 ? 'Waning' : 'Waxing'
                                          })
                                        </span>
                                      </div>
                                      <div className="cl-orrery-stat">
                                        <span className="cl-orrery-stat-label">Mercury State</span>
                                        <span className="cl-orrery-stat-val" style={{ color: customAstro.mercury === 'RETROGRADE' ? '#fbbf24' : 'inherit' }}>
                                          ☿ {customAstro.mercury}
                                        </span>
                                      </div>
                                      <div className="cl-orrery-stat">
                                        <span className="cl-orrery-stat-label">Aspect Angle</span>
                                        <span className="cl-orrery-stat-val">📐 {customAstro.aspect}</span>
                                      </div>
                                      <div className="cl-orrery-stat">
                                        <span className="cl-orrery-stat-label">Risk Multiplier</span>
                                        <span className="cl-orrery-stat-val" style={{ 
                                          color: customAstro.moonPhase === 0.00 ? '#ef4444' : 
                                                 customAstro.mercury === 'RETROGRADE' ? '#fbbf24' : 
                                                 customAstro.moonPhase === 1.00 ? 'var(--wl-green)' : 'inherit'
                                        }}>
                                          ⚖️ {
                                            customAstro.moonPhase === 0.00 ? 'BLOCKED' :
                                            customAstro.mercury === 'RETROGRADE' ? '0.50x' :
                                            customAstro.moonPhase === 1.00 ? '1.25x' :
                                            (customAstro.aspect === 'Opposition' || customAstro.aspect === 'Square') ? '0.75x' : '1.00x'
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Result Status Message */}
                                  <div className={`cl-sandbox-output-card ${
                                    customAstro.moonPhase === 0.00 ? 'danger' :
                                    customAstro.mercury === 'RETROGRADE' || customAstro.aspect === 'Opposition' || customAstro.aspect === 'Square' ? 'warning' : 'optimal'
                                  }`}>
                                    <span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '10px', display: 'block', marginBottom: '2px' }}>
                                      Status Recommendation:
                                    </span>
                                    {
                                      customAstro.moonPhase === 0.00 ? 'Solar Eclipse Window active. Hard-block active on automated orders due to volatility.' :
                                      customAstro.mercury === 'RETROGRADE' ? 'Mercury Retrograde detected. Enforcing 50% lot size reduction and double stop-loss buffer.' :
                                      customAstro.moonPhase === 1.00 ? 'Full Moon Peak liquidity alignment. High historical completion rate; position boosted 1.25x.' :
                                      (customAstro.aspect === 'Opposition' || customAstro.aspect === 'Square') ? 'Disharmonious aspect detected. Restricting lot risk by 25% to account for correlation drag.' :
                                      'Harmonious aspect, normal risk environment. 1.00x normal lot sizing.'
                                    }
                                  </div>
                                </div>
                              )}

                              {f.id === 'rebates-milestones' && (() => {
                                const rawAlice = Number(legAlice) || 0;
                                const rawBob = Number(legBob) || 0;
                                const rawCharlie = Number(legCharlie) || 0;

                                const countedAlice = Math.min(rawAlice, 40);
                                const countedBob = Math.min(rawBob, 40);
                                const countedCharlie = Math.min(rawCharlie, 40);

                                const totalCounted = countedAlice + countedBob + countedCharlie;
                                const progressPercent = Math.min((totalCounted / 100) * 100, 100);

                                return (
                                  <div className="cl-architecture-section">
                                    <div className="cl-architecture-title" style={{ fontSize: '11px', color: 'var(--wl-accent)', fontWeight: '750' }}>
                                      🌳 PARTNER LEGS CAPPING DEMONSTRATION (40/40/20 Target)
                                    </div>
                                    
                                    {/* Controls */}
                                    <div className="cl-sandbox-controls">
                                      <div className="cl-sandbox-control">
                                        <label>Alice Raw Lots</label>
                                        <input 
                                          type="number" 
                                          className="cl-sandbox-input" 
                                          value={legAlice} 
                                          onChange={e => setLegAlice(e.target.value)} 
                                          placeholder="Alice raw lots"
                                        />
                                      </div>
                                      <div className="cl-sandbox-control">
                                        <label>Bob Raw Lots</label>
                                        <input 
                                          type="number" 
                                          className="cl-sandbox-input" 
                                          value={legBob} 
                                          onChange={e => setLegBob(e.target.value)} 
                                          placeholder="Bob raw lots"
                                        />
                                      </div>
                                      <div className="cl-sandbox-control">
                                        <label>Charlie Raw Lots</label>
                                        <input 
                                          type="number" 
                                          className="cl-sandbox-input" 
                                          value={legCharlie} 
                                          onChange={e => setLegCharlie(e.target.value)} 
                                          placeholder="Charlie raw lots"
                                        />
                                      </div>
                                    </div>

                                    <div className="cl-leg-widget">
                                      <div className="cl-leg-row">
                                        <div className="cl-leg-header">
                                          <span className="cl-leg-name">Leg 1: Alice (Power Leg)</span>
                                          <span className="cl-leg-details">Raw: {rawAlice} Lots | Counted: <span className={rawAlice > 40 ? 'capped' : ''}>{countedAlice} Lots {rawAlice > 40 && '(Capped)'}</span></span>
                                        </div>
                                        <div className="cl-leg-progress-track">
                                          <div className={`cl-leg-progress-fill ${rawAlice > 40 ? 'capped' : ''}`} style={{ width: `${Math.min((rawAlice / 40) * 100, 100)}%` }} />
                                        </div>
                                      </div>
                                      <div className="cl-leg-row">
                                        <div className="cl-leg-header">
                                          <span className="cl-leg-name">Leg 2: Bob (Medium Leg)</span>
                                          <span className="cl-leg-details">Raw: {rawBob} Lots | Counted: <span className={rawBob > 40 ? 'capped' : ''}>{countedBob} Lots {rawBob > 40 && '(Capped)'}</span></span>
                                        </div>
                                        <div className="cl-leg-progress-track">
                                          <div className={`cl-leg-progress-fill ${rawBob > 40 ? 'capped' : ''}`} style={{ width: `${Math.min((rawBob / 40) * 100, 100)}%` }} />
                                        </div>
                                      </div>
                                      <div className="cl-leg-row">
                                        <div className="cl-leg-header">
                                          <span className="cl-leg-name">Leg 3: Charlie (Minor Leg)</span>
                                          <span className="cl-leg-details">Raw: {rawCharlie} Lots | Counted: <span className={rawCharlie > 40 ? 'capped' : ''}>{countedCharlie} Lots {rawCharlie > 40 && '(Capped)'}</span></span>
                                        </div>
                                        <div className="cl-leg-progress-track">
                                          <div className={`cl-leg-progress-fill ${rawCharlie > 40 ? 'capped' : ''}`} style={{ width: `${Math.min((rawCharlie / 40) * 100, 100)}%` }} />
                                        </div>
                                      </div>
                                      
                                      <div className="cl-leg-legend" style={{ justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', gap: '14px' }}>
                                          <div className="cl-legend-item"><span className="cl-legend-dot" /> Counted volume</div>
                                          <div className="cl-legend-item"><span className="cl-legend-dot capped" /> Capped at 40% Target Limit</div>
                                        </div>
                                        <div style={{ fontWeight: '750', color: 'var(--wl-text)' }}>
                                          Total Contribution: <span style={{ color: 'var(--wl-accent)' }}>{totalCounted} / 100 Lots ({progressPercent.toFixed(0)}%)</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {f.id === 'billing-ledger' && (
                                <div className="cl-architecture-section">
                                  <div className="cl-architecture-title" style={{ fontSize: '11px', color: 'var(--wl-accent)', fontWeight: '750' }}>
                                    💳 TRANSACTION SELF-HEALING SYSTEM DIAGNOSTIC LOGS
                                  </div>
                                  
                                  {/* Controls */}
                                  <div className="cl-sandbox-btn-group">
                                    <button className="cl-sandbox-btn cl-sandbox-btn--primary" onClick={() => triggerDiagnosticSimulation('success')}>
                                      Simulate Success Purchase
                                    </button>
                                    <button className="cl-sandbox-btn" onClick={() => triggerDiagnosticSimulation('healing')}>
                                      Simulate DB Lockout Healing
                                    </button>
                                    <button className="cl-sandbox-btn" onClick={() => triggerDiagnosticSimulation('insufficient')}>
                                      Simulate Low Balance
                                    </button>
                                  </div>

                                  <div className="cl-sim-console">
                                    <div className="cl-sim-console-header">
                                      <div className="cl-sim-console-title">
                                        <span className="cl-sim-alert-indicator" />
                                        Ledger Transaction Recovery Stream
                                      </div>
                                      <span style={{ fontSize: '9px', opacity: 0.6 }}>ACTIVE LISTENER</span>
                                    </div>
                                    <div className="cl-sim-console-lines">
                                      {ledgerLogs.map((log, lIdx) => {
                                        let type = 'info';
                                        if (log.includes('SUCCESS') || log.includes('passed')) type = 'success';
                                        else if (log.includes('WARNING') || log.includes('RECOVERY')) type = 'warn';
                                        else if (log.includes('ERROR') || log.includes('rejected') || log.includes('failed')) type = 'error';
                                        
                                        return (
                                          <div key={lIdx} className={`cl-sim-line ${type}`}>
                                            &gt; {log}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="cl-architecture-section">
                                <div className="cl-architecture-title">💻 Technical Stack</div>
                                <div className="cl-tech-tags">
                                  {f.techStack.map((t, idx) => (
                                    <span key={idx} className="cl-tech-tag">{t}</span>
                                  ))}
                                </div>
                              </div>

                              <div className="cl-architecture-section">
                                <div className="cl-architecture-title">⚙️ Implementation Details</div>
                                <ul className="cl-architecture-list">
                                  {f.details.map((detail, idx) => (
                                    <li key={idx}>{renderMarkdownText(detail)}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* Tab Contents: FLOWCHART */}
                          {subTab === 'flow' && (
                            <div className="cl-architecture-section">
                              <button
                                className="cl-filter-btn"
                                style={{ float: 'right', marginBottom: '12px', fontSize: '11.5px', padding: '4px 10px' }}
                                onClick={() => {
                                  navigator.clipboard.writeText(f.flowchart);
                                  setCopiedId(f.id);
                                  setTimeout(() => setCopiedId(null), 2500);
                                }}
                              >
                                {copiedId === f.id ? '✓ Copied!' : '📋 Copy Flowchart'}
                              </button>
                              <div className="cl-architecture-title" style={{ marginBottom: '16px' }}>🏗️ System Architecture Flow</div>
                              
                              <InteractiveFlowchart data={f.flowchartData} />

                              <details style={{ marginTop: '16px', cursor: 'pointer' }}>
                                <summary style={{ fontSize: '11.5px', color: 'var(--wl-text-muted)', userSelect: 'none' }}>Show Raw ASCII Diagram</summary>
                                <pre className="cl-flowchart-box" style={{ marginTop: '8px', clear: 'both' }}>{f.flowchart}</pre>
                              </details>
                            </div>
                          )}

                          {/* Tab Contents: DB SCHEMA */}
                          {subTab === 'schema' && f.dbSchema && (
                            <div className="cl-architecture-section">
                              <div className="cl-architecture-title" style={{ marginBottom: '8px' }}>
                                💾 Database Table: <code style={{ color: 'var(--wl-accent)', background: 'var(--wl-accent-bg)', padding: '2px 6px', borderRadius: '4px' }}>{f.dbSchema.tableName}</code>
                              </div>
                              <div className="cl-schema-table-container">
                                <table className="cl-schema-table">
                                  <thead>
                                    <tr>
                                      <th>Field Name</th>
                                      <th>Type</th>
                                      <th>Constraints</th>
                                      <th>Description / Role</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {f.dbSchema.fields.map((field, idx) => (
                                      <tr key={idx}>
                                        <td><code className="cl-schema-code">{field.name}</code></td>
                                        <td><code style={{ fontSize: '11.5px', color: 'var(--wl-text-muted)' }}>{field.type}</code></td>
                                        <td>
                                          {field.constraint !== 'NOT NULL' && field.constraint !== '' ? (
                                            <span style={{ fontSize: '10.5px', fontWeight: 650, color: 'var(--wl-text)' }}>{field.constraint}</span>
                                          ) : (
                                            <span style={{ opacity: 0.35 }}>—</span>
                                          )}
                                        </td>
                                        <td>{field.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Tab Contents: SOURCE CODE FILES */}
                          {subTab === 'files' && (
                            <div className="cl-architecture-section">
                              <div className="cl-architecture-title">📂 Relevant Source Code Files</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                                {f.files.map((file, idx) => (
                                  <div 
                                    key={idx} 
                                    style={{ 
                                      padding: '12px 16px', 
                                      borderRadius: '8px', 
                                      background: 'var(--wl-bg-card)', 
                                      border: '1px solid var(--wl-border)',
                                      boxShadow: 'var(--wl-shadow)'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                      <code style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--wl-accent)' }}>{file.path}</code>
                                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--wl-text-faint)', fontWeight: 700 }}>
                                        {file.path.split('.').pop()} Module
                                      </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--wl-text-secondary)', lineHeight: 1.5 }}>
                                      {file.role}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        )}

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
