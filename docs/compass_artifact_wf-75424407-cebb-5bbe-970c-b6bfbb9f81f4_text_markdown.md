# HeroPips: Investor-Grade Productization & Business Plan

## TL;DR
- **Build the "connect-and-automate" trading tool + academy — not another signal-selling MLM.** The defensible, fundable wedge is a low-latency execution/automation layer across MT5 (MetaAPI), cTrader and crypto (CCXT) with an AI trade-management assistant — priced Free/$29/$79/$199 — cash-flowed by an IB-rebate + academy engine while you build toward VC metrics. **Kill the 10-level referral + withdrawable-bonus combination**; it is a pyramid-scheme and money-transmission risk that will get you delisted, sued, or debanked.
- **Use "HeroPips" (heropips.com) and abandon hellopips.com.** "Hero" carries the zero-to-hero brand promise, gives you a mascot and gamification hooks; "Hello" is a generic domain collision. Own one brand, 301-redirect the other.
- **Realistic path: ~$1M ARR in 18–24 months, ~$10M ARR in 3–4 years — but only if you win on retention and IB rebates, not signal hype.** VCs are skeptical of signal-selling/trading-tool startups; position as fintech infrastructure + education with recurring revenue, never "we predict markets."

## Key Findings

### The blunt verdict
This is an ambitious, over-scoped plan with a genuinely good core. Roughly 40% of the founder's feature list is fundable product, ~30% is legitimate roadmap, and ~30% (10-level referrals + withdrawable bonus wallet + "signals that make money") is active legal and reputational risk that must be cut or restructured **before** launch. The winners to double down on: broker-agnostic execution, TradingView webhook automation, premium risk-automation ("prop-firm guards"), and a genuinely good beginner academy with paper trading. The losers to cut in year one: full backtesting engine, mobile apps, white-label, the multi-level bonus economy, and any claim that your AI signals are profitable.

### Competitive landscape & pricing benchmarks (2025–2026)
- **3Commas:** ~$16–$94/month depending on tier and billing; free portfolio-tracking tier (unique in category).
- **Cryptohopper:** ~$19–$129/month; Explorer entry tier ~$19–$24/month; strategy/signal marketplace with third-party subscriptions ($10–$50/month).
- **TradersPost:** free paper-trading trial; Starter ~$49/month; the closest analog to HeroPips' webhook-execution feature. Launched 2021; explicitly does NOT generate its own signals — pure "plumbing" ("you bring the strategy; TradersPost handles the plumbing").
- **Alertatron:** free tier (5 alerts/day), Starter ~$29, Pro ~$59, Ultra ~$99/month; priced by alert volume; can cascade one alert to up to 200 client accounts.
- **Capitalise.ai:** natural-language automation, frequently bundled free via partner brokers (no public retail price).
- **Tickeron (AI signals):** $60/month entry to $250/month Expert (~$125/month billed annually).
- **Collective2:** subscription per strategy + AutoTrade service fee; marketplace of published strategies (forex/stocks/options/futures).
- **ZuluTrade:** dropped follower-side profit sharing Jan 1 2023; now a 20% performance fee with high-water-mark and a 50% payment-reserve scheme; Classic model ~$10/strategy/month.
- **Darwinex:** 20% total performance fee split 15% provider / 5% Darwinex, quarterly on a high-water-mark basis; Darwinex Zero pays the trader 15% (monthly payout upgrade +$15/month).
- **eToro Popular/Pro Investor:** pays 1.5% of Assets Under Copy per year, paid monthly; Champion tier min $250/max $500/month (needs ≥5 copiers, ≥$50K AUC, ≥$10K equity); Elite/Elite Pro scale to $10M–$30M AUC at 1.5%, then 0.5%, then 0.25% above $100M. Cadet tier earns nothing.
- **MQL5 Signals:** platform keeps 20%, provider keeps 80% ("The Signals Provider shall receive the payment less 20% commission retained by the 'Signals' service"); subscriptions from a $30/month minimum, typically $30–$50/month.
- **Trading academies:** Online Trading Academy charged as much as $50,000 for programs — and **settled with the FTC in September 2020 on a $362M monetary judgment (largely suspended)**; founder Eyal Shachar surrendered $8.3M plus assets (a Cessna 400, a Bentley Mulsanne), and the FTC later refunded $5.4M to 31,144 consumers (Aug 2021). The FTC found OTA "used false or unfounded earnings claims to sell 'training programs.'" Free competitors (FX Academy, broker academies) exist. A Dubai-based competitor, CLT Academy, targets the Indian market from Dubai with "Traders Edge" and "Elite Trade Blue Print" courses. **This is a flashing warning light: aggressive high-ticket trading education with earnings claims is an enforcement magnet.**
- **Industry marketplace take-rate:** platforms keep ~15–25% of signal-provider fees (MQL5 20%; Darwinex 5-of-20 points = 25% of the fee).

**HeroPips' wedge:** Nobody cleanly combines (a) a genuinely beginner-friendly academy + paper trading, (b) broker-agnostic auto-execution across forex/stocks/crypto, and (c) premium prop-firm risk automation, in one product, at a mass-market SaaS price, targeted at the Dubai/India/SEA/MENA forex retail scene. TradersPost is US/broker-focused and bland; 3Commas/Cryptohopper are crypto-only; copy-trading platforms don't teach. That intersection is the defensible wedge.

### MetaAPI unit economics — the single most important number
MetaAPI's "Regular" subscription is **$30/month** (one free MT account included, plus pay-as-you-go API access on top); the "Extended" subscription is **$100/month** with dedicated servers. This is an **account-based** cost model — MetaAPI spins up a headless MetaTrader terminal per connected account — so your cost scales with connected **live accounts, not revenue**. Community/third-party estimates put practical per-account cost at ~$5–$15/month depending on volume.

**Implication (blunt):** As API2Trade's cost analysis warns, "1,000+ Accounts: This is where developers often declare MetaApi expensive. If your SaaS charges users $30/month, and your API provider consumes a large percentage of that just for the MT4/MT5 connection, your unit economics will suffer." A Free-tier user who connects a live account and never pays you is a pure cost center. **Rule: no live-broker connection on the free tier — paper/demo only on free. Live connection requires a paid tier.** Plan a self-hosted MT5 bridge (dockerized MetaTrader terminal + REST wrapper) before scale; MetaAPI itself states its pricing is designed to roughly match self-hosting cost, so build-vs-buy flips around ~1,000+ connected accounts.

### Regulatory reality (blunt, Dubai-based founder)
- **You are building software, not giving advice — keep it that way.** The moment you say "our signals make money" or exercise discretion over client money, you trip investment-advice/portfolio-management rules (UAE SCA/CMA, DFSA, FSRA; US SEC/CFTC/NFA; UK FCA; EU MiFID II; India SEBI). Every competitor that survives (TradersPost, 3Commas, Alertatron) positions as a self-directed tool: "you bring the strategy, we execute; all decisions are yours."
- **UAE specifics:** As of Jan 1 2026 the SCA became the **CMA** for the mainland. The UAE now **federally regulates robo-advisory** (automated investment recommendations) under the SCA/CMA — providing automated recommendations to mainland UAE retail could require licensing and brings governance duties (IT audits, algorithm reviews, fee/risk disclosure). Free zones: **DIFC (DFSA)**, **ADGM (FSRA)**, plus **VARA** for Dubai virtual assets. DIFC's **Innovation Testing Licence (ITL)** allows regulated fintech testing without a full license for up to 24 months.
- **The 10-level referral + withdrawable bonus wallet is the biggest legal landmine.** The FTC and equivalents treat compensation driven primarily by recruitment (not real product sales) as an illegal pyramid scheme; MLM is banned/restricted in China, Saudi Arabia and Bangladesh. A 10-level-deep money structure with cash-out is textbook pyramid optics. Withdrawable "bonus money" also implicates money-transmission / stored-value / e-wallet licensing (CBUAE).
- **Recommended structure:** Cut withdrawable bonuses; use non-cash credits (subscription time, feature unlocks) or route real cash strictly through a licensed IB/affiliate rail. Cap the consumer referral to 1–2 levels max, tied to real paid subscriptions.

### Technical architecture verdict
- **Modular monolith, not microservices, at MVP.** One NestJS (Node.js/TypeScript) backend with clear modules, Next.js frontend on Vercel, PostgreSQL as system of record, TimescaleDB (Docker) for OHLCV/backtest data. World-class AND cheap.
- **Kafka is overkill at MVP.** Use Redis Streams or Redpanda for webhook ingestion and the execution queue; graduate to Kafka only past ~10k concurrent users or multi-region. Don't pay the Kafka operational tax on day one.
- **Cheapest credible hosting:** Hetzner (dockerized via docker-compose) for backend + TimescaleDB; Vercel for frontend; migrate to Kubernetes only when scaling demands it. MVP infra in the low hundreds of dollars/month; at 10k users, low thousands/month plus MetaAPI per-account costs (the dominant variable cost).
- **Historical data sourcing:** Binance public data + CryptoDataDownload (free CSVs) for crypto; Dukascopy tick data (free) for forex; Polygon or similar for stocks. Store 1–15 years of OHLCV in TimescaleDB.

## Details

### 1. Naming & brand
Use **HeroPips / heropips.com**. "From zero to hero" is the entire brand narrative; "pips" signals forex/trading; "Hero" gives you a mascot, gamification ("become a trading hero"), and share-card virality ("I leveled up on HeroPips"). Register hellopips.com defensively and 301-redirect it, plus common misspellings. Do NOT run two brands — it splits SEO, ad pixels, and trust. Trademark "HeroPips" in the UAE and key markets.

### 2. Product strategy & the ruthless cut
**Build now (MVP → Dec 2026 beta):**
1. Academy (zero-to-hero) + paper trading — the hook. Free tier + paid course.
2. Connect-and-trade: MT5 (MetaAPI), then cTrader Open API, then crypto via CCXT.
3. Local mirroring of balances/positions/orders/closed history into PostgreSQL.
4. AI assistant: predefined signals out-of-the-box + configurable signal generation + per-trade tips. Position as "analysis assistant," never "profit guarantee."
5. TradingView webhook execution (HMAC-signed, idempotent).
6. Order modification (type/qty/price) at placement.
7. Premium risk-automation suite (the real differentiator — see §8).
8. Simple, safe referral (1–2 levels, paid-subscription-triggered).

**Roadmap (Phase 2, 2027):** runtime signal backtesting (Pro-only), full backtesting engine, signal marketplace with share cards, full paper-trading launch.

**Roadmap (Phase 3):** white-label multi-tenant, mobile apps, more brokers, IB hierarchy tooling.

**Cut / do NOT build year one:** 10-level referral, withdrawable bonus wallet, white-label, mobile apps, full backtesting engine, and any "guaranteed signal" marketing.

### 3. Feature matrix & pricing

| Feature | Free | Starter $29/mo | Pro $79/mo | Elite $199/mo |
|---|---|---|---|---|
| Academy (core lessons) | ✓ | ✓ | ✓ | ✓ |
| Paper trading | ✓ | ✓ | ✓ | ✓ |
| Live broker connect (MT5/cTrader/CEX) | ✗ (demo only) | 1 account | 3 accounts | 10 accounts |
| Predefined AI signals | Limited (delayed) | ✓ | ✓ | ✓ |
| Custom signal configuration | ✗ | Limited | ✓ | ✓ |
| TradingView webhook execution | ✗ | ✓ (limited alerts) | ✓ | ✓ (high volume) |
| Per-trade AI tips | ✗ | ✓ | ✓ | ✓ |
| Runtime signal backtesting | ✗ | ✗ | ✓ | ✓ |
| Risk-automation suite (§8) | Basic | Basic+ | Full | Full + prop-firm guards |
| Signal marketplace (follow) | View | Follow 1 | Follow 5 | Unlimited + publish |
| Priority execution / support | ✗ | ✗ | ✓ | ✓ |

- **Annual billing:** ~20% discount (industry norm; TradingView and Alertatron both discount ~20% annually).
- **Academy:** one-time "Zero-to-Hero" course at $199–$299, OR bundled into Pro. **Avoid the $5,995–$50,000 OTA-style pricing** — that market is under active FTC enforcement and doesn't fit a mass-market viral play. Consider $499 cohort intakes later.
- **Lifetime deal (launch/beta only):** hard-cap tightly. Sell a capped batch (≤500 seats) at $499–$799 lifetime to fund beta and seed testimonials. AppSumo-style LTDs are great for cash + reviews but destroy recurring revenue and attract low-quality, high-support users if uncapped. Cap it, then never again.
- **White-label (Phase 3):** benchmark against MT5 white-label ($5,000–$15,000 setup + $1,500–$5,000/month) and Match-Trader ($2,500 Basic / $4,000 Turnkey per month). Price HeroPips white-label at ~$5,000 setup + $2,000–$3,000/month + revenue share.

### 4. Unit economics by tier (gross margin)
Dominant variable cost = MetaAPI per connected live account (~$5–15/month). Assume $10 blended.
- **Free:** $0 revenue, $0 MetaAPI (demo only) → infra break-even; a marketing cost.
- **Starter $29 (1 account):** ~$10 MetaAPI + ~$2 infra/AI/email → ~$17 gross profit, ~59% margin.
- **Pro $79 (3 accounts):** ~$30 MetaAPI + ~$5 → ~$44 gross profit, ~56% margin.
- **Elite $199 (10 accounts):** ~$100 MetaAPI + ~$10 → ~$89 gross profit, ~45% margin.

**Critical insight:** Elite margin is thin because MetaAPI scales linearly. This is WHY you must build a self-hosted MT5 bridge before Elite/white-label scale — it converts a ~50% gross-margin business into an ~85% one. Crypto (CCXT) has near-zero per-account cost, so crypto users are far more profitable than MT5 users — factor this into growth targeting and pricing.

### 5. Revenue model & 3-year projection
**Streams:** (1) SaaS subscriptions (core), (2) Academy, (3) Signal-marketplace take-rate (~20%, MQL5 benchmark), (4) IB/broker rebates (the hidden engine), (5) prop-firm affiliate revenue, (6) white-label (Phase 3), (7) API/enterprise (later).

**IB rebates — the cash-flow engine most founders miss:** When your users connect brokers like Exness/IC Markets/Vantage through your IB link, the broker pays you per traded lot. Per Exness IB rebate provider RebateIX, programs pay "up to $5.5 per standard lot on Exness, credited on every closed trade — win or lose," with a VIP club adding up to +15% as monthly volume climbs; tiered per-lot rates across brokers commonly scale ~$4–$8/lot (e.g., $4/lot first 100 lots, $5.50 to 500, $7 above 500). This is recurring, volume-based, and does NOT require the user to pay a subscription — **it funds your free-tier users.** Build IB-rebate onboarding into the flow from day one (with clear disclosure). This is your bootstrapping lifeline.

**Assumptions (blended, conservative):** freemium free-to-paid conversion 2–5% (use 3%); monthly SaaS churn 5–7% for retail (assume 6% — high, because retail traders quit when they lose); blended paid ARPU ~$55/month.

- **Year 1 (beta→launch):** ~15,000 registered, ~450 paid (3%), plus capped LTD batch + academy + early IB rebates. **ARR ~$300k–$500k.** Focus: retention and activation, not revenue.
- **Year 2:** ~80,000 registered, ~3,000 paid, IB rebates scaling, academy cohorts. **~$1.5M–$2.5M ARR** (crosses $1M ARR mid-year).
- **Year 3:** ~300,000 registered, ~12,000 paid, 5–15 white-label tenants, marketplace take-rate, mature IB rebates. **~$8M–$12M ARR** (approaches/crosses $10M).

Achievable only with churn control (annual plans, academy stickiness, prop-firm guards users depend on) and heavy IB-rebate monetization. Signal underperformance will spike churn — mitigate by selling *tools and discipline*, not *predictions*.

### 6. Viral GTM & beta-to-December playbook
- **Hook product:** free academy + paper trading + a "trading personality / risk score" quiz that yields a shareable result. Paper-trading leaderboards drive competition.
- **ROI share cards:** auto-generated, branded image cards of paper (and opted-in live) results — "+18.3% this month on HeroPips." Watermarked, one-tap share to X/Instagram/TikTok/Telegram. This is the core viral loop. Show verified paper results prominently; be legally careful with live-money claims and always disclaim.
- **Referral (safe, viral, NOT MLM):** two-sided, single-level — "give a free month, get a free month" or "give the academy, get account credit." Optionally one reduced-value second level. No cash-out, no recruitment-based earning. Keeps K-factor high without pyramid risk.
- **Community:** Discord + Telegram (MENA/India/SEA forex culture lives on Telegram), YouTube long-form academy, TikTok/Reels short clips. Weekly paper-trading tournaments with non-cash prizes (subscription time, merch, feature unlocks).
- **Influencer/IB partnerships:** Dubai/UAE/India/SEA forex influencers are the highest-leverage channel. Give them admin-configurable custom IB/affiliate deals and co-branded academy cohorts — this doubles as acquisition and IB-rebate volume.
- **SEO/content:** target "MT5 automation," "TradingView to broker," "prop firm risk tool," "forex for beginners" — high-intent, low-competition long-tail.
- **Launch tactics:** Product Hunt launch for the tool; capped AppSumo/LTD for cash + reviews; beta waitlist with referral queue-jumping.
- **Beta to Dec 2026:** Months 1–3 closed beta (academy + paper + MT5 connect), instrument activation metrics; Months 4–6 open beta + TradingView webhooks + risk-automation, launch capped LTD; Months 7+ public launch with paid tiers, referral loop, influencer/IB push.
- **Activation metric:** "connected a broker/paper account AND placed first (auto) trade within 24h of signup." Optimize relentlessly.

### 7. Regulatory strategy (Dubai founder)
- **Corporate structure:** Incorporate the software/IP entity in a UAE free zone. For a fintech-flavored SaaS that stops short of managing money, **DIFC (with the ITL sandbox) or ADGM** give investor/bank credibility; a cheaper start is a DMCC/IFZA tech-license entity while you keep the product strictly "self-directed software." Apply to **DIFC FinTech Hive** (non-equity, ~$20k perks, bank/regulator access, ITL) and **Hub71** (Abu Dhabi, up to AED 750k cash+in-kind via SAFE, zero fixed equity take). Both are top-tier and low-dilution; DIFC ecosystem firms have raised >$3.3B, Hub71 startups raised ~$2.18B in 2024.
- **Positioning:** "HeroPips is a self-directed trade-automation and education platform. We do not provide investment advice, do not manage client funds, and do not guarantee results. Users control all trading decisions and connect their own broker accounts." Mandatory risk disclaimers on every signal and share card.
- **Avoid the robo-advice trap:** If your AI outputs specific buy/sell recommendations to mainland UAE retail, you risk needing an SCA/CMA robo-advisory license. Frame AI as "analysis/education/configuration tool," require explicit user confirmation for discretionary actions, and gate auto-execution behind explicit user-defined rules (like TradersPost/Alertatron).
- **Never custody client funds.** Users' money stays at their own broker/exchange; you only hold API keys (encrypted). This keeps you out of money-transmission and custody regimes.
- **Bonus wallet:** replace withdrawable cash with credits; if you must pay cash, route via the licensed IB rebate rail only.

### 8. Premium risk-automation suite (the real moat)
Retail/prop traders most want automated *discipline and rule enforcement*. Package these:
- **Free/Basic:** stop-loss/take-profit attach, one-click panic close (close all), basic trailing stop.
- **Premium (Pro/Elite):** risk-per-trade position sizing (auto-lot from % risk), equity/drawdown protection (auto-halt at daily/max drawdown), **prop-firm rule guards** (enforce FTMO/prop daily-loss & max-loss limits — over 2,000 prop firms operate globally, ~60–65% US-based, and most traders fail on rule violations; pass rates average just 5–10%), break-even automation (e.g., move SL to entry at PT1), partial take-profits, dynamic/ATR trailing stops, news filters (auto-pause 15–20 min around CPI/FOMC/NFP), session filters, auto-cancel stale pending orders, slippage protection on market orders, max-concurrent-trades caps.
- These solve documented pain and are the features users won't churn away from — the antidote to signal-driven churn.

### 9. Multi-tenant white-label design (Phase 3)
Single codebase, tenant-per-row isolation in PostgreSQL (tenant_id on every table) with row-level security; per-tenant config JSON (branding, logo, theme, feature flags, pricing, affiliate rules); subdomain + custom-domain routing; per-tenant secrets. Theming via CSS variables/Tailwind tokens driven by tenant config. Admin panel to provision tenants, toggle features, set pricing/affiliate configs. **Do not build this until ≥3 inbound white-label leads with deposits** — it's a distraction pre-PMF.

### 10. Affiliate/IB + referral system design
- **Affiliate/IB engine:** fully dynamic, admin-configurable packages — per-affiliate custom rates, per-lot rebates, tiered volume thresholds ($4/lot first 100 lots, $5.50 to 500, $7 above — the standard forex pattern), and master-IB/sub-IB hierarchies. Model on how forex brokers structure IB rebate programs.
- **Ledger:** double-entry ledger for all commissions/rebates/credits (immutable, auditable). Non-negotiable for financial correctness and future audits.
- **Referral (all users):** REBUILD the 0–10 level idea as **1–2 levels, tied to real paid subscriptions or genuine IB volume, with no recruitment-based bonus and no cash-out of "points."** This preserves virality and preserves the legitimate IB hierarchy for actual introducing brokers (a licensed model) while eliminating pyramid/MLM optics for the consumer program.

### 11. Bonus/points payout solution (compliant)
- **Points → non-cash rewards only:** subscription time, feature unlocks, academy modules, merch, tournament entries, leaderboard status. Fully compliant, still gamified, drives retention.
- **If real cash is required:** pay exclusively through the licensed IB/affiliate rebate rail (broker-funded, disclosed) — not from a HeroPips "wallet."
- **Never** let users load money into a HeroPips balance and withdraw it — that requires e-money/payment licensing (CBUAE) you don't want at seed stage.

### 12. Technical architecture, component by component
- **Frontend:** Next.js on Vercel (SSR/SEO for academy content + app).
- **Backend:** NestJS modular monolith. Modules: Auth/RBAC, Broker-Connect, Execution, Signals/AI, Academy, Billing, Affiliate-Ledger, Webhooks, Admin/Tenant.
- **Data:** PostgreSQL (system of record: users, accounts, orders, ledger). TimescaleDB in Docker for OHLCV/tick history (1–15 yrs) and backtest data.
- **Streaming/queue:** Redis Streams (MVP) → Redpanda/Kafka (scale) for webhook ingestion + execution-pipeline decoupling.
- **Execution flow:** signal (predefined/AI/TradingView webhook) → **risk engine** (position sizing, drawdown, prop-firm guards, slippage/session/news filters) → **order router** → MetaAPI (MT5) / cTrader Open API / CCXT (crypto). Every step logged; idempotency keys on webhooks; HMAC signature verification on TradingView payloads.
- **MT5 mirroring:** on connect, full sync of balance/positions/open orders/closed history into PostgreSQL; then websocket streaming (MetaAPI) for deltas + periodic reconciliation.
- **Secrets/keys:** exchange API keys encrypted at rest (envelope encryption via KMS or self-hosted Vault). Least-privilege scopes; never store withdrawal-enabled keys.
- **Email:** SendGrid (transactional + lifecycle).
- **Observability:** structured logs, metrics (Prometheus/Grafana or hosted), error tracking (Sentry), execution audit trail.
- **Cost:** MVP low hundreds/month (Hetzner + Vercel + SendGrid + KMS); at 10k users low thousands/month + MetaAPI per-account (dominant). Self-hosted MT5 bridge is the key cost lever at scale.

### 13. VC fundability (honest)
- **VCs are skeptical of signal-selling / retail-trading-tool startups** because of high churn (traders quit when they lose), regulatory overhang, "get-rich-quick" reputational risk, and hard-to-defend "our signals are better" claims. Many look like lifestyle businesses, not venture-scale.
- **Position around it:** you are (a) fintech *infrastructure* (execution/automation/risk across brokers), (b) with an *education* funnel and *community* moat, (c) recurring SaaS + IB-rebate revenue, and (d) a white-label B2B2C expansion. Lead with retention, activation, and IB-rebate unit economics — not signal accuracy.
- **TAM/SAM/SOM:** Per Grand View Research, the global algorithmic trading market was USD 21.06B in 2024, an estimated USD 23.48B in 2025, growing at 12.9% CAGR to USD 42.99B by 2030 — retail is the fast-growing segment. Per Market Intelo, the trading-education market was $1.35B in 2024, forecast to $3.72B by 2033 at 11.8% CAGR. SAM (retail forex/crypto automation + education, MENA/India/SEA focus): low single-digit $B. SOM (3-yr realistic capture): $10–30M revenue.
- **Comparables:** Composer raised ~$16.7M over 4 rounds per Tracxn (investors incl. First Round, Golden Ventures, Left Lane; Crunchbase/PitchBook list a lower ~$11.4M; Composer is now "Composer by SoFi"). AI seed valuations are elevated (median pre-money ~$17.9M; recent YC cohorts ~$40M) — but those are AI-infra, not signal-sellers. Tickeron and copy-trading incumbents illustrate the monetization ceiling.
- **Metrics before raising:** ≥$50–100k MRR, <5% monthly logo churn (hard here), strong activation (first-trade within 24h), demonstrable IB-rebate revenue, and evidence the academy reduces churn.
- **Raise strategy:** **Bootstrap first** on IB rebates + academy + capped LTD cash to ~$1M ARR — very achievable and gives leverage. Then raise a seed from MENA fintech angels + regional VCs, using DIFC FinTech Hive / Hub71 for network and credibility. YC is possible but position as "fintech infra + education," never "trading signals." Given strong bootstrap cash flow, stay lean and raise only to accelerate white-label/geographic expansion.
- **One-page pitch narrative:** "HeroPips takes complete beginners from zero to hero: learn on a free academy, practice with paper trading, then connect any broker and automate disciplined, rule-based trading across forex, stocks and crypto — with AI trade management and prop-firm risk guards. We monetize via SaaS subscriptions, an academy, broker IB rebates, and white-label licensing. We're the self-directed automation + education layer for the retail traders the incumbents ignore — starting in the world's fastest-growing forex regions."

### 14. Roadmap with milestones
- **Phase 1 (now → Dec 2026, beta):** academy + paper trading + MT5 connect + local mirroring + predefined/configurable AI signals + TradingView webhooks + core risk-automation + safe 1–2 level referral + IB-rebate onboarding + capped LTD. Milestone: 15k users, activation >40%, first IB-rebate revenue.
- **Phase 2 (2027):** runtime signal backtesting (Pro-only), full backtesting engine, cTrader + CCXT full rollout, signal marketplace + share cards, full paper-trading launch, prop-firm guard suite. Milestone: $1M ARR, churn <6%.
- **Phase 3 (2027–2028):** multi-tenant white-label, mobile apps, more brokers, master-IB hierarchy tooling, enterprise API. Milestone: $10M ARR, 10+ white-label tenants.

### 15. Risk register & kill-list
1. **MetaAPI per-account cost erodes margin** → gate live connect behind paid tiers; build self-hosted MT5 bridge before scale; push crypto (CCXT, near-zero cost).
2. **Regulatory action (advice/robo/custody)** → strict "self-directed software" positioning; DIFC/ADGM structure + ITL sandbox; never custody funds; mandatory disclaimers.
3. **Signal underperformance liability & churn** → sell tools/discipline, not predictions; no profit guarantees; academy + risk-automation as retention moat.
4. **MLM/pyramid optics (10-level + bonus wallet)** → CUT; replace with 1–2 level, paid-triggered, non-cash referral + licensed IB rail.
5. **Money-transmission (withdrawable bonuses)** → non-cash credits only; cash via IB rebates.
6. **Exchange/broker API bans or ToS changes** → multi-broker abstraction; don't depend on one connector; monitor MetaAPI/MetaQuotes policy (MT5 white-label issuance already paused by MetaQuotes).
7. **High retail churn (traders lose and quit)** → annual plans, academy stickiness, prop-firm guards users depend on, crypto + stock diversification.
8. **Key-security breach (API keys)** → KMS envelope encryption, no withdrawal-scope keys, audits.
9. **Founder over-scope / cash burn** → ruthless MVP; bootstrap on IB rebates; don't build white-label/mobile/full-backtest in year one.
10. **Reputational (get-rich-quick / FTC-style enforcement)** → conservative marketing, verified/disclaimed results, education-first brand — remember OTA's $362M FTC judgment.

**Do NOT build in year one:** full backtesting engine, mobile apps, white-label, 10-level referral, withdrawable bonus wallet, master-IB hierarchy tooling, any "guaranteed profit" feature.

## Recommendations
1. **Immediately:** consolidate to the HeroPips brand; incorporate a free-zone entity (start lean, plan DIFC/ADGM); draft ironclad "self-directed software, no advice, no custody" ToS with a fintech-savvy UAE lawyer.
2. **Cut before writing more code:** the 10-level referral and withdrawable bonus wallet. Redesign as a 1–2 level non-cash referral + licensed IB rebate rail. This single change de-risks the whole company.
3. **MVP scope (→Dec 2026):** academy + paper trading + MT5 connect + AI signals (as tools) + TradingView webhooks + core risk-automation + IB-rebate onboarding. Gate live-broker connect behind paid tiers to protect MetaAPI margin.
4. **Pricing:** Free (demo only) / Starter $29 / Pro $79 / Elite $199, ~20% annual discount; academy $199–$299 one-time or bundled; capped LTD (≤500 seats, $499–$799) for beta cash only.
5. **Monetize IB rebates from day one** — this bootstraps you to $1M ARR without dilution and funds free users.
6. **Build the self-hosted MT5 bridge** once you pass ~1,000 connected accounts to flip gross margin from ~50% to ~85%.
7. **Apply to DIFC FinTech Hive and Hub71** for credibility, ITL sandbox, and low-dilution capital; bootstrap to seed metrics before raising VC.
8. **Fundraise triggers:** raise seed only at ≥$50–100k MRR, <5% monthly churn, proven activation and IB-rebate revenue. Until then, stay lean.
9. **Defer:** white-label, mobile apps, full backtesting engine, master-IB tooling to Phase 2/3.

**Thresholds that change the plan:** If monthly churn stays >8% after academy + risk-automation ship, the SaaS thesis is broken — pivot harder to IB-rebate/brokerage-adjacent revenue. If free-tier live connections leak MetaAPI cost, tighten gating immediately. If a regulator signals robo-advice concern, strip AI to pure analysis/education and require explicit user execution.

## Caveats
- Market-size figures vary widely by analyst (the algorithmic trading market is cited anywhere from ~$2.5B to ~$57B in 2025 depending on definition and source); I anchored on Grand View Research's ~$21–23B as a credible mid-range. Treat all TAM numbers as directional.
- MetaAPI's exact pay-as-you-go API pricing was temporarily unavailable on their live page; the $30/$100 subscription tiers are confirmed, but the per-account all-in cost ($5–15/mo) is a community/third-party estimate — validate with a direct quote before finalizing unit economics.
- Competitor prices change frequently by billing cycle/promo; verify on each vendor's official page before publishing externally.
- Regulatory statements are general guidance, not legal advice — engage licensed UAE (DIFC/ADGM/SCA-CMA) counsel before launch, especially on AI recommendations, referral structure, and any bonus payouts.
- Financial projections are illustrative scenarios based on benchmark conversion/churn/ARPU assumptions, not forecasts; retail-trading churn is notoriously high and could materially reduce these figures.
- eToro/ZuluTrade/Composer figures reflect the most current sourced data, but some sources conflict (Composer ~$11.4M vs ~$16.7M total funding) and copy-trading payout mechanics have changed over time (ZuluTrade dropped its legacy $30 sub + 25% profit-share model in 2023).