# TradeGPT — Monthly Operating Budget

A simple, scannable monthly operating budget comparing Vercel vs. VPS hosting, and MetaAPI vs. a Custom MT5 Farm.

---

## 📊 Monthly Cost Matrix (Utho VPS + Custom MT5 Farm)

This matrix assumes we host on **Utho VPS** (instead of Vercel), run a **Custom MT5 Farm** (instead of paying MetaAPI's $5/account fee), and use a **Reasoning LLM with Good Maths** (DeepSeek-R1 / Llama 3.3 70B).

| Service | Category | Scale Tier (100–1,000 users) |
| :--- | :--- | :---: |
| **App Server** | Utho VPS Hosting | **$33.04** (4 vCPU / 8GB) |
| **Custom MT5 Farm** | Utho Memory VPS | **$248.00** (4x 32GB VPS) |
| **Primary LLM (Maths)** | DeepSeek-R1 (70B Distill) | **$265.00** (450M tokens/mo) |
| **Twelve Data** | Market Data API | **$49.00** (Grow Plan) |
| **TradingView Chart Library** | Commercial Chart License | **$200.00** (Enterprise/Paywalled) |
| **Supabase** | Database & Auth | **$25.00** (Pro Plan) |
| **SMS OTP Auth** | Twilio / Firebase / Msg91 | **$0 – $60.00** (Depends on provider/region) |
| **Email (Resend)** | OTP & Notifications | **$20.00** |
| **NVIDIA NIM** | Fallback AI / LLM | **$15.00 – $30.00** |
| **NOWPayments** | Crypto Billing | **$0.00** (0.5% fee on subscriptions) |
| **TOTAL BUDGET** | | **~$855.04 – $930.04 / mo** |

---

## 🧠 LLM Choice for Trading: Maths & Reasoning

Since the app generates trading signals and parses complex technical indicator math, a standard LLM is prone to calculation errors. We transition to a **Reasoning LLM (DeepSeek-R1)** which uses a "thinking chain" to solve mathematical and logic problems.

*   **Average token usage per request:** increases from 500 tokens to **1,500 tokens** (due to thinking/reasoning output).
*   **Total scale volume (1,000 users):** 10k messages/day = **450M tokens/month**.

### LLM Pricing & Alternatives:
1.  **DeepSeek-R1 (Distill Llama 70B) via Groq / NVIDIA NIM:**
    *   **Rate:** ~$0.59 / 1M tokens.
    *   **Cost at Scale:** **~$265.00 / month**.
    *   **Advantage:** Super fast (Groq LPU architecture), excellent trade math, very cost-efficient.
2.  **DeepSeek-R1 (Full 671B) via DeepSeek API / Together AI:**
    *   **Rate:** ~$0.55/M input, $2.19/M output (Average ~$1.20/M tokens).
    *   **Cost at Scale:** **~$540.00 / month** (increases total scale budget to **~$925 – $1,007 / mo**).
    *   **Advantage:** Industry-leading mathematical reasoning, on-par with OpenAI o1.

---

## 🆚 Custom MT5 Farm vs. MetaAPI (at 1,000 Users)

MetaAPI charges a flat rate of **$5.00 / month per active MT5 account**. Building a custom MT5 farm running Docker/Wine containers on Utho Memory-Optimized VPS results in massive cost savings.

* **MT5 Terminal RAM Footprint:** ~120 MB per active account.
* **1,000 Accounts Memory Need:** ~120 GB RAM total.

| Cost Component | Option A: MetaAPI ($5/acct) | Option B: Custom MT5 Farm (VPS) |
| :--- | :---: | :---: |
| **One-Time Setup & Dev Cost**| **$0** (Ready-made API) | **$3,500.00** (One-time custom farm development) |
| **MT5 Connection Cost** | **$5,000.00 / mo** ($5 × 1,000) | **$248.00 / mo** (4x 32GB Utho VPS) |
| **App Server Hosting** | **$20.00 / mo** (Vercel Pro) | **$33.04 / mo** (4 vCPU / 8GB VPS) |
| **Other Core Costs** | **$508.00 / mo** (AI, DB, Data, SMS, Email) | **$518.00 / mo** (AI, DB, Data, SMS, Email) |
| **TradingView Chart Library** | **$200.00 / mo** (Advanced Chart License) | **$200.00 / mo** (Advanced Chart License) |
| **NOWPayments Fee (0.5%)**| **$145.00 / mo** (on $29k volume) | **$145.00 / mo** (on $29k volume) |
| **TOTAL MONTHLY RUN COST** | **$5,873.00 / mo** | **$1,144.04 / mo** |
| **NET PROFIT ($29k Rev)** | **$23,127.00 / mo** (79.7% margin) | **$27,855.96 / mo** (**96.1% margin**) |
| **SAVINGS & PAYBACK** | *Baseline* | **Save $4,728.96 / month** (+$56,747/year)<br>👉 **Payback period on $3,500 setup:** **0.74 months (~22 days)** |

---

## 🎯 Server & Farm Hardware Specs (Utho VPS)

### 1. App Server (Next.js Node Web Server)
*   **Tier:** Utho Shared CPU — **Basic 2** (used in Scale Tier)
*   **Specs:** 4 vCPU, 8 GB RAM, 1000 GB Transfer.
*   **Price:** **$33.04 / month**.

### 2. Custom MT5 Farm (Memory Optimized Scale)
*   **Tier:** Utho Memory Optimized — **Memory Optimized 3**
*   **Specs:** 4 vCPU, 32 GB RAM, 3000 GB Transfer.
*   **Quantity:** 4 VPS instances (128 GB RAM combined capacity).
*   **Price:** **$62.00 / month per server** (Total: **$248.00 / month**).

---

## 🎯 Key Metrics

* **Scale Break-Even:** **31 subscribers** covers the entire **Scale (~$855.04 – $930.04/mo)** infrastructure (average **$893/mo**).
* **Payback Period:** Custom MT5 Farm dev setup cost ($3,500) pays back in **22 days** of hitting 1,000 users.

---

## 🛡️ Optional Operational Add-ons (Highly Recommended at Scale)

These are additional services and operational buffers to ensure security, high availability, and reliability of the MT5 connection farm and SaaS platform.

| Service | Purpose | Estimated Cost |
| :--- | :--- | :---: |
| **MT5 Connection Proxies** | Prevent IP blocks/rate-limits from brokers by assigning distinct IPs per container | **$50.00 – $150.00 / mo** |
| **Sentry & Logflare** | Production runtime error monitoring and centralized logs for debugging | **$30.00 – $55.00 / mo** |
| **Cloudflare Pro (WAF/DDoS)** | Protect backend trading endpoints and prevent automated bots from scraping signals | **$20.00 – $25.00 / mo** |
| **Utho Automated Backups** | Snapshots and daily automated backups for the App VPS and MT5 VPS nodes | **$10.00 – $20.00 / mo** |
| **Legal/Compliance Docs** | Automated Privacy Policy and Terms of Service (via Iubenda/Termly) | **$10.00 – $25.00 / mo** |
| **Annual Domain & Developer Accounts** | Amortized cost of .ai domain registration ($70/yr) and Apple/Google Dev portals ($124/yr) | **~$16.00 / mo** |
| **TOTAL OPTIONAL BUFFER** | | **~$136.00 – $291.00 / mo** |

---

## 🏢 Operations & Marketing Budget (Lucknow Hub - Lean Startup)

To support subscriber acquisition and legal foundation, we operate a lean Lucknow-based facility with a local sales and creative team.

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
| **Electricity & cooling** | Monthly utility bills | ₹8,000 | **$95.81** |
| **Office Misc** | Miscellaneous maintenance | ₹2,000 | **$23.95** |
| **Graphic Designer** | Intermediate full-time creative asset design | ₹20,000 | **$239.52** |
| **Web Designer** | Frontend UI & Figma design | ₹20,000 | **$239.52** |
| **Digital Marketer** | SEO / Social media manager | ₹20,000 | **$239.52** |
| **10 Telecallers** | Sales team targeting outbound lead lists (65,000 dials/mo, 6-day working week) | ₹1,50,000 | **$1,796.41** |
| **Meta Ads Spend** | Paid advertising (FB/IG lead generation) | ₹20,000 – ₹40,000 | **$239.52 – $479.04** |
| **Targeted Lead Data** | Weekly databases of active traders/leads | ₹5,000 – ₹10,000 | **$59.88 – $119.76** |
| **SaaS Tools** | Software retainers (Creative Cloud, Figma, CRM, Dialers) | ₹10,000 – ₹15,000 | **$119.76 – $179.64** |
| **TOTAL OPERATIONAL OPEX**| | **₹2,75,000 – ₹3,05,000** | **$3,293.41 – $3,652.69** |

### 3. Consolidated Monthly Cost & ROI (Infra + Operations)

Combining our **SaaS Infrastructure Cost** (average **$893.00 / mo**) with our **Operations Cost** (average **$3,473.05 / mo**):

*   **Combined Operating Cost (Low End):** $855.04 + $3,293.41 = **$4,148.45 / month**
*   **Combined Operating Cost (High End):** $930.04 + $3,652.69 = **$4,582.73 / month**
*   **Combined Operating Cost (Average):** **~$4,366 / month** (₹3,64,561 / mo)
*   **Total Company Break-Even:** **151 paid subscribers** at $29/mo covers the entire operation (infra + rent + salaries + ads + tools).
*   **1,000 Subscribers Net Margin:** $29,000 revenue - $4,582.73 cost (high end) = **$24,417.27 / mo** (**84.2% net margin**).

---

## 💡 Quick Tips for Free Tier Survival
1. **Aggressive Caching:** We cache Twelve Data calls for 60s. This reduces daily API hits by 90%.
2. **Local Astro:** Lunar/retrograde calculations run locally in JS (zero API dependency, $0 cost).
3. **Rotating LLM Keys:** Route fallback LLM queries to NVIDIA NIM with multiple free trial keys if needed.
