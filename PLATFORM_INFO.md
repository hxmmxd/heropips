# TradeGPT — Platform Information Guide

> **Institutional AI Trading Terminal · Cloud Broker Execution · Affiliate Reward Network**

---

## 🧬 What Is TradeGPT?

TradeGPT is an **institutional-grade AI trading terminal** that connects directly to your MetaTrader 4 (MT4) or MetaTrader 5 (MT5) broker account — scanning markets, generating validated trade signals, executing orders, and distributing affiliate commissions in real-time.

It combines three powerful engines into one seamless cloud platform:

| Pillar | Function | Revenue Model |
|:---|:---|:---|
| **🧠 AI Market Intelligence** | 12-Gate Confluence Engine scans assets 24/5, validates setups through 12 institutional-grade filters, and generates high-confidence trade tickets | SaaS subscription ($29/mo) |
| **🔗 Secure Broker Execution** | Routes orders directly to your MT4/MT5 via MetaAPI cloud nodes — non-custodial, your funds never leave your broker | Platform utility |
| **💰 Affiliate Reward Network** | 5-level MLM rebate distribution + milestone rank rewards up to $50,000 cash | Referral + lot volume rebates |

---

## 🏗️ Technology Stack

| Category | Technology | Purpose |
|:---|:---|:---|
| **Framework** | Next.js 14 (App Router) | SSR, routing, serverless API endpoints |
| **Frontend** | React 18 + TypeScript | Interactive dashboard components |
| **Database & Auth** | Supabase (PostgreSQL) + RLS | User sessions, profiles, trade logs, wallet ledger |
| **Broker Gateway** | MetaAPI SDK v29 (Cloud REST) | MT4/MT5 node provisioning & order execution |
| **Market Data** | Twelve Data API | Live price streaming, historical candles, indicator baselines |
| **Economic Events** | Finnhub API | High-impact news detection (NFP, FOMC, CPI) |
| **Fallback Data** | Yahoo Finance RSS | Backup charts, sentiment, correlation data |
| **AI Engine** | NVIDIA NIM API | Chat interface, signal analysis automation |
| **Payments** | NOWPayments (USDT) | Crypto subscription invoicing + commission payouts |
| **Charts** | Lightweight Charts v5 | Real-time candlestick chart rendering |
| **Celestial** | Astronomy Engine v2.1 | Astro Mode — lunar/planetary cycle overlays |
| **Documents** | jsPDF + html2pdf.js + Nodemailer | Invoice generation, report emails |

---

## 📱 Platform Modules (Navigation Tabs)

### 1. AI Terminal
The core trading interface. A split-panel layout featuring:
- **Left Panel**: Real-time candlestick chart (Lightweight Charts) with live price streaming
- **Right Panel**: AI chat interface powered by NVIDIA NIM
- **Signal Generation**: Click-to-generate trade signals for any supported asset
- **Trade Tickets**: Validated signals display as structured tickets with entry, SL, TP, confidence grade (AAA/AA/A/BBB), lot sizing, and margin
- **One-Click Execution**: Execute trades directly from the ticket to your connected MT5 broker
- **Asset Watchlist**: Quick-access buttons for Gold (XAUUSD), US30, NAS100, BTC, ETH, EUR/USD

### 2. Manager Dashboard
Portfolio management and position monitoring:
- **Open Positions**: Live floating P&L for all active trades
- **Account Summary**: Balance, equity, margin, free margin
- **Position Management**: Close individual positions or close all
- **Trade Sync**: Real-time synchronization with broker server

### 3. Live Brokers
Broker node management hub:
- **Connect**: Link MT4/MT5 accounts via server name + login + investor password
- **MetaAPI Deployment**: Auto-provisions a cloud terminal node for each connected account
- **Status Tracking**: Real-time connection status (connecting → connected → error)
- **Multi-Broker**: Connect and switch between multiple broker accounts
- **Disconnect**: One-click node removal and cleanup

### 4. Trade Logs
Full trade history and audit trail:
- **All Executed Orders**: Symbol, action (BUY/SELL), volume, entry price, SL, TP
- **Status Tracking**: Open, closed, cancelled, pending
- **P&L Display**: Per-trade profit/loss with running totals
- **Confidence Grades**: Each trade tagged with its signal confidence score

### 5. Referral Hub
Network builder interface with 5-level visualization:
- **Unique Referral Code**: Sharable invite code for each user
- **Network Tree**: Visual hierarchy of Level 1–5 downlines
- **Rebate Dashboard**: Real-time tracking of earned commissions per level
- **Team Stats**: Active traders, team volume (lots), total network size
- **Wallet Balance**: Accumulated USDT commission balance
- **Withdrawal Requests**: Submit crypto payout requests (admin-approved + 2FA verified)

### 6. Courses
Educational content marketplace:
- **Masterclass Events**: Live trading workshops and training sessions
- **Custom Indicators**: Moon-phase overlays, astrology-based risk tools
- **Course Purchases**: One-time tickets (₹8,000 / ~$99)
- **Admin Management**: Course creation, pricing, enrollment tracking

### 7. Astro Analytics *(Astro Mode Only)*
Experimental celestial telemetry overlay:
- **Moon Phase Tracking**: Lunar cycle impact on market volatility
- **Planetary Positions**: Geocentric velocity calculations (Mercury, Venus, Mars, Jupiter, Saturn)
- **Mercury Retrograde**: Hard-block on trade execution during retrograde periods
- **Seasonal Solar Cycles**: Position sizing adjustments based on cosmic alignment
- **Disclaimer Required**: First-activation requires explicit user consent

### 8. Subscription Plans
SaaS tier management:
- **Free Plan**: Limited signals, 1 broker node
- **Pro Plan ($99/mo)**: Unlimited signals, 5 nodes, priority execution
- **Enterprise Plan ($299/mo)**: Full access, unlimited nodes, custom indicators
- **Crypto Payment**: USDT invoicing via NOWPayments (TRC20/ERC20)
- **Plan Activation**: Webhook-verified payment → instant tier upgrade

### 9. Settings & Profile
User account management:
- **Profile Editing**: Name, email, avatar
- **Theme Toggle**: Light mode / Dark mode
- **Astro Mode Toggle**: Enable/disable celestial overlays
- **Session Tracking**: IP, device, geolocation logging

### 10. Admin Panel *(Admin Only)*
Platform-wide management console:
- **User Management**: View all users, edit plans, manage referral trees
- **Billing Dashboard**: Subscription payments, wallet balances, withdrawal approvals
- **Platform Config**: Dynamic API key management, payout settings
- **Course Management**: Create/edit/delete educational content
- **System APIs**: Health monitoring for Twelve Data, Finnhub, MetaAPI, NOWPayments

---

## 🛡️ The 12-Gate Confluence Engine

Every trade signal must pass through 12 institutional-grade validation filters before execution. This is the core competitive advantage of TradeGPT.

| # | Gate | What It Checks | Why It Matters |
|:---:|:---|:---|:---|
| 1 | **Confluence Score** | Weighted average of RSI (15%), MACD (20%), EMA (20%), BB (15%), Stoch (10%), 4H Bias (15%) | Must be ≥ 45% — filters weak setups |
| 2 | **SMC Pattern** | Break of Structure, Change of Character, Fair Value Gaps, Order Blocks, Liquidity Sweeps | Confirms institutional price action |
| 3 | **HTF Trend Align** | 4-Hour RSI directional bias | Never trade against the dominant trend |
| 4 | **Session Filter** | London & NY overlap windows | Avoids low-liquidity Asia chop |
| 5 | **Volatility ATR** | Current ATR vs 20-period average (0.5x–2.5x range) | Prevents dead or spike-driven entries |
| 6 | **No Conflict** | Bull/Bear weight spread > 10% | No entry when signals contradict |
| 7 | **Cooldown Timer** | 4-hour timer per symbol | Blocks destructive over-trading |
| 8 | **Economic Calendar** | NFP, FOMC, CPI, ECB, BoE, BoJ detection | Blocks ±30min around high-impact news |
| 9 | **Correlation Guard** | Cross-asset alignment (Gold/DXY, BTC/ETH) | Confirms market-wide directional agreement |
| 10 | **MTF Bias Stack** | Weekly, Daily, 4H EMA direction | 2/3 timeframes must align |
| 11 | **VWAP Deviation** | Price vs ±2σ VWAP bands | No buying tops or selling bottoms |
| 12 | **Candlestick Entry** | Pin Bars, Hammers, Engulfing patterns on 1H | Precision entry confirmation |

### Signal Outcome:
- **≥ 8 gates passed** → ✅ Execute Trade (BUY/SELL signal generated)
- **5–7 gates passed** → 🟡 Watchlist (monitor for better entry)
- **< 5 gates passed** → 🔴 Discard (no signal issued)

---

## 📊 Risk Management Architecture

### Stop Loss & Take Profit
- **Stop Loss:** Entry ± (ATR × 1.5) — absorbs noise without premature stops
- **Take Profit:** Fixed 1:2.5 Risk-to-Reward ratio

### Kelly Criterion Position Sizing
$$f^* = \frac{W \times R - L}{W \times R}$$
Where W = win rate, L = loss rate, R = avg win / avg loss. **Capped at 2.0% account risk per trade** regardless of signal strength.

### Confidence Grading
| Grade | Gates Passed | Action |
|:---:|:---:|:---|
| **AAA** | 11–12 | Highest conviction — full size |
| **AA** | 9–10 | Strong — standard size |
| **A** | 8 | Valid — conservative size |
| **BBB** | 5–7 | Watchlist only — no execution |

---

## 🔐 Security Architecture

### Non-Custodial Design
- Your funds **never leave** your personal regulated broker account
- Broker credentials are **never transmitted** to TradeGPT
- MetaAPI tokens are **trade-execution only** — zero withdrawal rights
- One-click disconnect removes your broker node instantly

### Database Security
- **Supabase Row-Level Security (RLS)**: Users can only access their own data
- **JWT Authentication**: All API routes protected by Supabase auth middleware
- **Admin Authorization**: Billing/config tables require `is_admin = true`

### Payment Security
- **HMAC-SHA512 Webhook Verification**: All payment notifications cryptographically verified
- **2FA Payout Protection**: Withdrawal payouts require admin approval + TOTP verification
- **Auto-Expiry**: Unverified payout requests auto-cancel after 1 hour

---

## 💰 Affiliate Revenue Network

### 5-Level Rebate Distribution
When any trader in your downline closes a position, the lot rebate is split:

| Level | Relationship | Rebate Share |
|:---:|:---|:---:|
| 1 | Direct referrals | **40%** |
| 2 | Their referrals | **20%** |
| 3 | 3rd generation | **10%** |
| 4 | 4th generation | **5%** |
| 5 | 5th generation | **5%** |

### Milestone Rank Rewards (40/40/20 Leg Capping)

| Rank | Team Volume | Max Single Leg | Cash Reward |
|:---:|:---:|:---:|:---:|
| 🥉 Bronze | 500 Lots | 200 Lots (40%) | **$500** |
| 🥈 Silver | 2,000 Lots | 800 Lots (40%) | **$2,500** |
| 🥇 Gold | 5,000 Lots | 2,000 Lots (40%) | **$7,500** |
| 💎 Platinum | 10,000 Lots | 4,000 Lots (40%) | **$15,000** |
| 👑 Diamond | 25,000 Lots | 10,000 Lots (40%) | **$50,000** |

> **The 40/40/20 Rule:** No single branch can count for more than 40% of target volume. You need at least 3 active legs to qualify for rank advancement — preventing inactive leaders from riding a single "power leg."

---

## 🪐 Astro Mode (Experimental)

An optional celestial telemetry overlay that integrates astronomical data into the risk management pipeline:

- **Mercury Retrograde Hard-Block**: Automatically prevents trade execution during Mercury retrograde periods
- **Lunar Cycle Scaling**: Position sizing adjusted by moon phases (new moon = conservative, full moon = standard)
- **Planetary Velocity Tracking**: Geocentric speed calculations for Mercury, Venus, Mars, Jupiter, Saturn
- **Solar Season Filters**: Seasonal adjustments based on solstice/equinox cycles
- **Disclaimer Gated**: Requires explicit user consent before activation

---

## 🚀 Getting Started (3 Steps)

1. **Create Account** — Sign up with email or social login via Supabase Auth
2. **Connect Broker** — Link your MT4/MT5 account using server name + login + investor password. MetaAPI provisions a cloud node automatically
3. **Start Trading** — The AI terminal scans markets 24/5. Generate signals, review the 12-gate validation, and execute with one click

---

## 📞 Target Markets & Assets

| Asset | Type | Optimal Session |
|:---|:---|:---|
| **XAUUSD (Gold)** | Commodity | London/NY Overlap |
| **US30 (Dow Jones)** | Index | NY Session |
| **NAS100 (Nasdaq)** | Index | NY Session |
| **BTCUSD (Bitcoin)** | Crypto | 24/7 |
| **ETHUSD (Ethereum)** | Crypto | 24/7 |
| **EURUSD** | Forex Major | London/NY Overlap |

---

## 🏢 Operational Infrastructure

| Component | Specification |
|:---|:---|
| **Hosting** | Serverless (Vercel-compatible) with max 60s API timeout |
| **Database** | Supabase PostgreSQL with RLS, stored RPCs, recursive CTEs |
| **Broker Network** | MetaAPI REST mode — sub-2-second order routing |
| **Market Data** | Twelve Data (55 calls/min) with 3-min in-memory cache |
| **AI Model** | NVIDIA NIM with round-robin API key rotation |
| **Payments** | NOWPayments USDT (TRC20/ERC20) with IPN webhook verification |
| **Charts** | Lightweight Charts v5 (WebGL-accelerated rendering) |
| **Celestial Engine** | Astronomy Engine v2.1 (high-precision ephemeris) |

---

*TradeGPT — Where Institutional Intelligence Meets Accessible Markets.*
