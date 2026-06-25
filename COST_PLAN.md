# TradeGPT — Infrastructure Cost Plan

> **Last updated:** June 2026  
> All prices in USD. Figures are estimates based on current provider pricing, expected usage patterns, and the Utho VPS + Custom MT5 Connection Farm architecture.

---

## Table of Contents

1. [Stack Overview](#1-stack-overview)
2. [Deployment Plan (Scale Tier)](#2-deployment-plan-scale-tier)
3. [Strategic Architecture Optimization (MetaAPI vs. Custom Farm)](#3-strategic-architecture-optimization-metaapi-vs-custom-farm)
4. [SMS Gateway Cost Comparison](#4-sms-gateway-cost-comparison)
5. [Service-by-Service Specs](#5-service-by-service-specs)
6. [Monthly Cost Matrix](#6-monthly-cost-matrix)
7. [Scale Tier Cost Split ($893/mo average)](#7-scale-tier-cost-split-893mo-average)
8. [Revenue Potential vs. Operating Expense (Consolidated)](#8-revenue-potential-vs-operating-expense-consolidated)
9. [Operations & Marketing Budget (Lucknow Hub - Lean Startup)](#9-operations--marketing-budget-lucknow-hub---lean-startup)
10. [Security & Reliability Add-ons](#10-security--reliability-add-ons)
11. [Appendix: Environment Variables Required](#appendix-environment-variables-required)

---

## 1. Stack Overview

| Layer | Technology | Purpose |
|---|---|---|
| **App Hosting** | Utho Shared CPU — Basic 2 VPS | Next.js Node production web server (replaces Vercel Pro) |
| **MT5 Connection Farm** | 4x Utho Memory Optimized 3 VPS | Wine + MetaTrader 5 inside Docker containers (replaces MetaAPI) |
| **Primary LLM** | Groq LPU — DeepSeek-R1 (70B Distill) | Mathematical reasoning, trading signals, indicator logic |
| **Fallback LLM** | NVIDIA NIM — DeepSeek-R1 (70B fallback) | Failover/circuit-breaker LLM fallback |
| **Market Data** | Twelve Data Grow Plan | Real-time OHLCV candles, technical indicators (RSI, MACD, ATR) |
| **Chart Library** | TradingView Advanced Chart Library | Commercial interactive charts (hosted locally behind paywall) |
| **Database** | Supabase Pro | Users, signals, trades, active broker keys, and configurations |
| **Auth** | Supabase Auth + SMS OTP | Phone authentication and account gating |
| **Email** | Resend Paid Plan | Onboarding OTP, signal notifications, confirmations |
| **Astro Calc** | astronomy-engine (npm) | Moon phase, void-of-course Moon, Mercury retrograde calculations |
| **Payments** | NOWPayments Gateway | Crypto subscription processing (0.5% transaction fee) |

---

## 2. Deployment Plan (Scale Tier)

The application operates under a unified **Production Scale Target** supporting **100 to 1,000 active users**. By avoiding serverless hosting and third-party account brokers, the baseline monthly operating budget is kept strictly under control.

* **Target Audience:** 100 – 1,000 active trading users
* **Baseline Monthly Infrastructure Budget:** **~$855.04 – $930.04 / month** (Average: **$893 / month**)
* **One-Time CapEx Setup Cost:** **$3,500.00** (Development and provisioning of custom MT5 Wine/Docker VPS farm)

---

## 3. Strategic Architecture Optimization (MetaAPI vs. Custom Farm)

MetaAPI charges a flat rate of **$5.00 / month per connected broker account**. Building a custom Wine/Docker broker farm on memory-optimized VPS instances results in massive monthly savings.

* **Docker MT5 Footprint:** ~120 MB RAM per active account.
* **1,000 Accounts Memory Need:** ~120 GB RAM total.
* **Utho Memory Node Spec:** 4x 32GB RAM VPS instances ($62/mo each = $248/mo total).

| Cost Component | Option A: MetaAPI ($5/acct) | Option B: Custom MT5 Farm (VPS) | Monthly Savings / Payback |
| :--- | :---: | :---: | :---: |
| **One-Time Setup & Dev Cost**| **$0** (Ready-made API) | **$3,500.00** (One-time custom farm development) | Payback in 22 days |
| **MT5 Connection Cost (1,000 accounts)** | **$5,000.00 / mo** ($5 × 1,000) | **$248.00 / mo** (4x 32GB Utho VPS) | Save $4,752.00 / mo |
| **App Server Hosting** | **$20.00 / mo** (Vercel Pro) | **$33.04 / mo** (4 vCPU / 8GB VPS) | -$13.04 / mo |
| **Other Core Costs** | **$508.00 / mo** (AI, DB, Data, SMS, Email) | **$518.00 / mo** (AI, DB, Data, SMS, Email) | -$10.00 / mo |
| **TradingView Chart Library** | **$200.00 / mo** (Advanced License) | **$200.00 / mo** (Advanced License) | $0.00 / mo |
| **NOWPayments Fee (0.5%)**| **$145.00 / mo** (on $29k volume) | **$145.00 / mo** (on $29k volume) | $0.00 / mo |
| **TOTAL MONTHLY RUN COST** | **$5,873.00 / mo** | **$1,144.04 / mo** | **Save $4,728.96 / month** |
| **NET PROFIT ($29k Rev)** | **$23,127.00 / mo** (79.7% margin) | **$27,855.96 / mo** (**96.1% margin**) | (+$56,747.52 / year) |
| **SAVINGS & PAYBACK** | *Baseline* | *Payback on setup:* **0.74 months (~22 days)** | |

---

## 4. SMS Gateway Cost Comparison

SMS OTP is crucial for secure broker-gated access. Costs vary depending on where traffic originates (Firebase has a global free tier but high India rates; MSG91 is extremely cheap for local Indian numbers).

| Provider | US / Canada / EU Rates | India / ROW Rates | Monthly Cost (3k SMS) | Key Advantage |
|---|---|---|---|---|
| **Firebase Auth (Blaze)** | Free up to 10k/mo (then $0.01) | $0.030 / verification (No free tier) | **$0.00** (Global)<br>**$90.00** (India) | 10k free verifications/mo (US/Canada/EU) |
| **Twilio Gateway** | $0.0079 / SMS | $0.0150 / SMS | **$23.70** (Global)<br>**$45.00** (India) | Premium delivery rates & global coverage |
| **Local India (MSG91)** | N/A | ~$0.0020 / SMS (15–30 paise) | **$6.00** (India only) | Extremely cost-effective for Indian traffic |

---

## 5. Service-by-Service Specs

### 🖥️ Utho App Server (Web Server Hosting)
* **Tier:** Utho Shared CPU — **Basic 2**
* **Specs:** 4 vCPU, 8 GB RAM, 1000 GB Transfer.
* **Cost:** **$33.04 / month**.

### ⚙️ Custom MT5 Connection Farm (Broker Nodes)
* **Tier:** Utho Memory Optimized — **Memory Optimized 3**
* **Specs:** 4 vCPU, 32 GB RAM, 3000 GB Transfer per server.
* **Quantity:** 4 VPS instances (128 GB RAM combined, supporting up to 1,000 accounts at 120MB per connection).
* **Cost:** **$62.00 / month per server** (Total: **$248.00 / month**).

### ⚡ Groq LPU — DeepSeek-R1 (Primary LLM)
* **Model:** `deepseek-r1` (Distill Llama 70B)
* **Usage:** ~1,500 tokens/request (deep thinking chain). Scale target of 10k messages/day = **450M tokens/month**.
* **Cost:** **~$265.00 / month** (at Groq's rate of $0.59 / 1M tokens).

### 📈 Twelve Data — Market Feed
* **Plan:** **Twelve Data Grow Plan**
* **Specs:** No daily query limit, supports concurrent tickers (XAUUSD, BTCUSD, etc.).
* **Cost:** **$49.00 / month**.

### 📊 TradingView Advanced Chart Library
* **License:** Paywalled Commercial License
* **Specs:** Local hosting of interactive candlestick charts and drawing indicators.
* **Cost:** **$200.00 / month** (Enterprise-quoted volume rate).

### 🗄️ Supabase — Database & Auth
* **Plan:** **Supabase Pro Plan**
* **Specs:** 8 GB DB storage, Row-Level Security, handles active keys, course tracking, signals, and wallet ledger.
* **Cost:** **$25.00 / month**.

### 💬 SMS OTP Auth
* **Gateway:** Split routing based on country code.
* **Cost:** **$0.00 – $60.00 / month** (Assuming average of **$30.00/mo** at scale).

### ✉️ Resend Transactional Email
* **Plan:** Paid Starter plan (up to 50k emails/month).
* **Cost:** **$20.00 / month**.

---

## 6. Monthly Cost Matrix

This matrix details the scale budget options for TradeGPT infrastructure running on Utho VPS:

| Service | Category | Monthly Cost Range | Spec / Notes |
| :--- | :--- | :---: | :--- |
| **App Server Hosting** | Utho VPS Hosting | **$33.04** | Utho Basic 2 (4 vCPU / 8GB) |
| **Custom MT5 Farm** | Utho Memory VPS | **$248.00** | 4x Utho Memory Spec (128GB RAM total) |
| **Primary LLM (Maths)** | DeepSeek-R1 via Groq | **$265.00** | 450M tokens/mo at $0.59/M tokens |
| **Twelve Data** | Market Data API | **$49.00** | Grow Plan (No daily limit) |
| **TradingView Chart Library** | Commercial License | **$200.00** | Interactive paywalled charting engine |
| **Supabase** | Database & Auth | **$25.00** | Pro Plan (8 GB Storage) |
| **SMS OTP Auth** | Twilio / Firebase / Msg91 | **$0.00 – $60.00** | Region-based route optimization |
| **Email (Resend)** | Notifications | **$20.00** | Up to 50,000 emails/mo |
| **NVIDIA NIM** | Fallback LLM | **$15.00 – $30.00** | Pay-per-token API fallback |
| **Astronomy Engine** | Celestial Calc | **$0.00** | astronomy-engine npm (runs locally) |
| **Yahoo Finance RSS** | News Feed | **$0.00** | Cached RSS (cached 60s server-side) |
| **TOTAL MONTHLY BUDGET** | | **~$855.04 – $930.04** | **Average: $893.00 / month** |

---

## 7. Scale Tier Cost Split ($893/mo average)

```
Primary LLM (DeepSeek-R1)     ██████████████████████████████  $265.00  (29.7%)
Custom MT5 VPS Farm           ████████████████████████████    $248.00  (27.8%)
TradingView Chart Library     ██████████████████████          $200.00  (22.4%)
Twelve Data Grow              ██████                          $49.00   (05.5%)
Utho App VPS                  ████                            $33.04   (03.7%)
SMS OTP Auth (Average)        ████                            $30.00   (03.4%)
Supabase DB Pro               ███                             $25.00   (02.8%)
Email & Fallback NIM          █████                           $42.50   (04.8%)
```

---

## 8. Revenue Potential vs. Operating Expense (Consolidated)

Assuming a subscription fee of **$29 / user / month**:

*   **Total Company Break-Even:** **151 paid subscribers** covers the entire combined monthly operating cost (Infrastructure + Office + Staff + Marketing) of **~$4,366 / mo**.
*   **NOWPayments Processing:** 0.5% fee on subscription volume (included in the 1,000 users OpEx).

| Subscriber Target | Monthly Revenue | Combined Operating Cost (Avg) | Net Margin / Month | Net Margin % |
| :---: | :---: | :---: | :---: | :---: |
| **100** | $2,900.00 | $4,366.00 (avg) | -$1,466.00 *(Lean scaling)* | -50.6% |
| **250** | $7,250.00 | $4,366.00 (avg) | **$2,884.00** | 39.8% |
| **500** | $14,500.00 | $4,366.00 (avg) | **$10,134.00** | 69.9% |
| **1,000** | $29,000.00 | $4,582.73 (high end) | **$24,417.27** | **84.2%** |

*Note: At 100 subscribers, the business operates close to break-even by dynamically scaling down ad spends and telecalling staff if needed, but the table assumes full monthly staff and marketing are deployed from day one.*

---

## 9. Operations & Marketing Budget (Lucknow Hub - Lean Startup)

To drive subscriber growth and establish a local corporate presence, TradeGPT operates a physical office in Lucknow, India, leveraging local Tier-2 salaries and marketing channels.

*Exchange rate: $1 USD = ₹83.50 INR.*

### 1. One-Time Setup Costs (CapEx)

| Category | Description | Cost (INR / ₹) | Cost (USD / $) |
| :--- | :--- | :---: | :---: |
| **Office Setup** | Lean furniture (tables, chairs), lighting, wiring, 3x workstations (PCs). *AC provided by landlord.* | ₹83,500 | **$1,000.00** |
| **Security Deposit** | 2 Months Rent deposit for Lucknow office | ₹40,000 | **$479.04** |
| **Company Registration** | Pvt Ltd registration (PAN, TAN, GST, DSC, CA fees) | ₹16,000 | **$191.62** |
| **Trademark Registration**| TradeGPT brand logo & name registry | ₹6,000 – ₹8,000 | **$71.86 – $95.81** |
| **IEC Registration** | Import Export Code (needed for international gateways/services) | ₹2,500 | **$29.94** |
| **Additional Director** | Fee for registering additional directors (₹1,500/director, assuming 1) | ₹1,500 | **$17.96** |
| **TOTAL CAPEX** | | **₹1,49,500 – ₹1,51,500** | **$1,790.42 – $1,814.37** |

### 2. Monthly Recurring Expenses (OpEx)

| Category | Resource / Description | Monthly Cost (INR) | Monthly Cost (USD) |
| :--- | :--- | :---: | :---: |
| **Office Space** | Rent for lean Gomti Nagar/Hazratganj space | ₹20,000 | **$239.52** |
| **Electricity & utilities** | Monthly utility bills and cooling | ₹8,000 | **$95.81** |
| **Office Misc** | Miscellaneous maintenance | ₹2,000 | **$23.95** |
| **Graphic Designer** | Intermediate full-time creative asset design | ₹20,000 | **$239.52** |
| **Web Designer** | Frontend UI & Figma design | ₹20,000 | **$239.52** |
| **Digital Marketer** | SEO / Social media manager | ₹20,000 | **$239.52** |
| **10 Telecallers** | Sales team targeting outbound lead lists (65,000 dials/mo, 6-day working week) | ₹1,50,000 | **$1,796.41** |
| **Meta Ads Spend** | Paid advertising (FB/IG lead generation) | ₹20,000 – ₹40,000 | **$239.52 – $479.04** |
| **Targeted Lead Data** | Weekly databases of active traders/leads | ₹5,000 – ₹10,000 | **$59.88 – $119.76** |
| **SaaS Tools** | Software retainers (Creative Cloud, Figma, CRM, Dialers) | ₹10,000 – ₹15,000 | **$119.76 – $179.64** |
| **TOTAL OPERATIONAL OPEX**| | **₹2,75,000 – ₹3,05,000** | **$3,293.41 – $3,652.69** |

---

## 10. Security & Reliability Add-ons

Highly recommended to protect trade execution logic, ensure high availability, and protect backend endpoints from scrapers or broker blocks.

| Service | Purpose | Estimated Cost |
| :--- | :--- | :---: |
| **MT5 Connection Proxies** | Prevent IP geoblocks and rate-limits by rotating dedicated IP proxies per container | **$50.00 – $150.00 / mo** |
| **Sentry & Logflare** | Error tracking and log monitoring for custom Wine/Docker processes | **$30.00 – $55.00 / mo** |
| **Cloudflare Pro** | Scraper protection, DDoS mitigation, and endpoint Web Application Firewall (WAF) | **$20.00 – $25.00 / mo** |
| **Utho Automated Backups** | Automated daily backups/snapshots for App VPS and MT5 nodes | **$10.00 – $20.00 / mo** |
| **Legal & Compliance Docs** | GDPR/CCPA cookie consent, Terms of Service, and Privacy Policies (via Termly/Iubenda) | **$10.00 – $25.00 / mo** |
| **Annual Domain & Developer Accounts** | Amortized cost of `.ai` domain and Google/Apple developer registrations | **~$16.00 / mo** |
| **TOTAL OPTIONAL BUFFER** | | **~$136.00 – $291.00 / mo** |

---

## Appendix: Environment Variables Required

These keys configure the application servers and are stored configuration-side in the Supabase backend with system environment fallbacks:

| Env Var | Service | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Database connection URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Client-safe anonymous API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | High-privilege admin bypass key |
| `GROQ_API_KEY` | Groq LPU | Primary DeepSeek-R1 execution |
| `NVIDIA_API_KEYS` | NVIDIA NIM | Comma-separated keys for LLM fallback routing |
| `TWELVE_DATA_API_KEY` | Twelve Data | Market data feed access token |
| `TRADINGVIEW_LICENSE_KEY` | TradingView | Advanced chart self-host key |
| `RESEND_API_KEY` | Resend | Email sender API key |
| `NOWPAYMENTS_API_KEY` | NOWPayments | Payment gateway billing key |
| `NOWPAYMENTS_IPN_SECRET` | NOWPayments | Webhook verification security key |
| `CRON_SECRET` | System Cron | Security header for deal sync endpoints |
| `NEXT_PUBLIC_APP_URL` | Application URL | Base domain reference for absolute paths |
