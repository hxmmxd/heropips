# 🚀 HeroPips — Institutional-Grade AI Trading Automation Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database_&_Auth-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)

**HeroPips** ([heropips.com](https://heropips.com)) is a cutting-edge, highly modular Next.js web application functioning as an institutional-grade AI trading terminal, multi-broker signal engine, and comprehensive risk management platform. 

Designed for scalability, low-latency execution, and seamless user experiences, HeroPips combines traditional algorithmic trade routing with LLM-powered market analytics and dynamic UI theming.

---

## 🏛️ System Architecture

HeroPips is built natively on the **Next.js 15 App Router** architecture. It leverages a serverless backend paradigm, powered by Next.js API Routes and Supabase (PostgreSQL), drastically reducing latency between frontend actions and database writes.

```text
                               ┌───────────────────────────┐
                               │   Cloudflare CDN & WAF    │
                               └─────────────┬─────────────┘
                                             │
                               ┌─────────────▼─────────────┐
                               │ Next.js 15 (App Router)   │
                               └───────┬────────────┬──────┘
                                       │            │
       ┌───────────────────────────────┴────┐  ┌────┴───────────────────────────────┐
       │                                    │  │                                    │
┌──────▼───────┐                    ┌───────▼──▼───────┐                    ┌───────▼──────┐
│  Supabase    │                    │ Next.js APIs     │                    │  Firebase    │
│ (PostgreSQL, │◄───────────────────┤ (/src/app/api)   ├───────────────────►│ (Phone OTP)  │
│  Auth, RLS)  │                    └───────┬──────────┘                    └──────────────┘
└──────────────┘                            │
                                            │ (Fast-Path Execution)
                                    ┌───────▼──────────┐
                                    │    MT5 Farm /    │
                                    │ Broker Adapters  │
                                    └───────┬──────────┘
                                            │
                                    ┌───────▼──────────┐
                                    │ MetaTrader 5 API │
                                    └──────────────────┘
```

### ⚙️ Core Technology Stack
- **Frontend Framework**: Next.js 15 (React 19 Server Components)
- **Styling & UI**: Tailwind CSS, Lucide React Icons, Custom "Volt on Ink" Design System.
- **Backend Infrastructure**: Next.js Server Actions & API Routes (`/src/app/api`).
- **Database & Authentication**: Supabase (PostgreSQL, Row-Level Security, Auth).
- **Secondary Security (2FA)**: Firebase Auth for mandatory OTP Phone Verification.
- **Trade Execution Layer**: Direct API integrations via `MT5 Farm` and unified broker adapters.
- **Crypto Billing**: Seamless non-custodial crypto checkout and invoicing via NOWPayments.
- **AI & Analytics**: LLM routing for intelligent market chatting and sentiment analysis.

---

## 🔥 Key Features & Capabilities

### 1. 🤖 AI Trading Terminal & Manager
A fully responsive, Bloomberg-terminal-style dashboard built with robust client-side React components. Features include:
* **Chat Feed**: LLM-powered market insights and trade sentiment routing.
* **Watchlist Strip & News Ticker**: Real-time asset monitoring and macroeconomic news streaming.
* **Portfolio Equity Curves**: Interactive charts visualizing account balances and PNL.

### 2. 🛡️ 17-Gates Risk Governance Matrix
An enterprise-grade, server-side risk evaluation engine (`src/lib/riskGovernor.ts`) that enforces strict trading guardrails:
* Pre-trade Kelly Criterion position sizing validation.
* Hard-coded daily max drawdowns, leverage limits, and margin thresholds.
* Automatically fails closed if risk thresholds are breached, protecting the user's capital.

### 3. ⚡ Trade Execution & MT5 Farm Connectors
Unified execution pipelines bridging HeroPips to Metatrader 5 and external Broker APIs:
* Fast-path standard MT5 login bridging via `mt5farm.ts`.
* Normalization of tickets, position IDs, and order parameters across diverse broker schemas.
* Built-in retry loops and safety fallbacks for missing Take-Profit/Stop-Loss values.

### 4. 🎨 Dynamic UI Theming (Volt on Ink)
A custom, meticulously crafted UI design system that goes beyond standard Tailwind:
* **True Light & Dark Modes**: Responsive CSS variables utilizing the `.dark` class block for seamless, flash-free theme toggling across the entire platform.
* **Glassmorphism Elements**: Translucent navbars, modal backdrops, and soft ambient light gradients.
* **Responsive Layouts**: Fully mobile-optimized, side-navigation menus, and tilt-card interactions.

### 5. 👥 Affiliate & Referral Ledger
A double-entry accounting system that natively calculates affiliate commissions, lifetime seat grants, and milestone tracking directly via the `referral` API engine. Features interactive genealogy trees and live withdrawal portals.

### 6. 🔒 Advanced Security Protocols
* **256-Bit Encrypted Gateways**.
* **Mandatory Phone Verification**: Integrates Firebase reCAPTCHA and SMS verification for users in highly sensitive trading zones.
* **Supabase Row-Level Security (RLS)**: Enforces tenant isolation, ensuring a user can only ever access their own trades, brokers, and API keys.

---

## 🛠️ Complete Project Directory Structure

```text
heropips/
├── public/                 # Static assets, institutional branding logos, HTML design systems
├── supabase/
│   └── migrations/         # Supabase SQL schema migrations (RLS, core tables, triggers)
├── src/
│   ├── app/                
│   │   ├── admin/          # Backoffice: Gates Config, CRM, Pricing, Telegram, SMTP, Invoices
│   │   ├── api/            # Serverless API endpoints: /execute, /risk, /subscriptions, /webhooks
│   │   ├── landing/        # High-conversion marketing landing pages and signal engine showcases
│   │   ├── login/          # Supabase Auth integration portals
│   │   ├── verify-phone/   # High-security SMS 2FA gateways
│   │   ├── worklog/        # Public facing development changelogs
│   │   └── page.tsx        # Main application layout / Terminal view
│   ├── components/         
│   │   ├── admin/          # Admin dashboard configuration tabs
│   │   ├── manager/        # Trade manager UI (Equity Curves, Slide-To-Execute, Risk Panels)
│   │   ├── pipeline/       # Signal Dataflow Canvas and Metrics Navigations
│   │   ├── referral/       # Genealogy Trees, Ledgers, Milestone Progress indicators
│   │   ├── subscription/   # Pricing Grids and Crypto Checkout Modals
│   │   └── terminal/       # Chat Feeds, Assets Modals, News Tickers
│   ├── lib/                
│   │   ├── adapters/       # Unified Crypto and MT5 execution adapters
│   │   ├── firebase/       # Firebase Client initialization (for SMS OTP)
│   │   ├── supabase/       # Supabase Client and Server initializers
│   │   └── ...             # Core logic: riskGovernor, kellyCriterion, vwap, mt5farm, llmRouter
│   └── types/              # Global TypeScript interfaces for strict type safety
└── package.json            # Scripts, dependencies, and environment configurations
```

---

## 🚀 Getting Started (Local Development)

### 📋 Prerequisites
Ensure you have the following installed on your machine:
- **Node.js**: `>= 20.0.0`
- **Package Manager**: `npm` (or `pnpm`)
- **Git**

### 1. Setup Environment
Clone the repository and install all Node dependencies:

```bash
git clone https://github.com/hxmmxd/heropips.git
cd heropips
npm install
```

### 2. Environment Variables Configuration
HeroPips relies heavily on external BaaS (Backend as a Service) providers. Copy the environment template:

```bash
cp .env.local.example .env.local
```

You **must** configure the following environment variables in `.env.local`:
* **Supabase**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* **Firebase**: `NEXT_PUBLIC_FIREBASE_API_KEY` (and related web app configs for OTP)
* **NOWPayments**: `NOWPAYMENTS_API_KEY` (for crypto checkouts)
* **Telegram**: `TELEGRAM_BOT_TOKEN`

### 3. Start the Development Server
Launch the Next.js local development environment:

```bash
npm run dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 🚢 Staging & Production Deployment

HeroPips is highly optimized for serverless deployments on platforms like **Vercel** or **AWS Amplify**. 

When deploying to Vercel:
1. Connect the GitHub repository directly to Vercel.
2. Ensure the **Framework Preset** is set to `Next.js`.
3. Add ALL required environment variables to the Vercel project settings *before* triggering the initial build.
4. Deployment commands will automatically run `npm run build` and launch the optimized `.next` output.

---

## 📄 License & Copyright

Proprietary Software. All source code, logic, and design assets are the exclusive property of HeroPips Inc.  
Unauthorized distribution, modification, or reproduction is strictly prohibited.  
**© 2026 HeroPips Inc. All Rights Reserved.**
