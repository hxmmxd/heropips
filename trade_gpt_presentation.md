# TradeGPT: The Next Generation AI-Powered Trading Terminal
## Institutional-Grade Intelligence. Cloud Execution. Lucrative Affiliate Ecosystem.

> **For traders who demand precision. For builders who demand scale.**

Welcome to **TradeGPT** — a premier, cloud-native trading terminal and community-building ecosystem designed for the modern trader, quantitative analyst, and network builder. By marrying institutional-grade quantitative analysis models with real-time MetaTrader broker connectivity and a multi-level affiliate rebate matrix, TradeGPT delivers a high-edge trading experience alongside a powerful passive revenue pipeline.

Whether you are a retail trader looking for a systematic edge, a team leader building an automated trading desk, or a community builder scaling a passive income network — **TradeGPT is your unified platform.**

---

## Platform Ecosystem Map

TradeGPT operates as a closed-loop synergy between three core pillars:

```mermaid
graph TD
    direction TB

    subgraph TIER1 ["🧠  PILLAR 1 — AI Market Intelligence"]
        D1[Twelve Data API\nLive Candles + History] --> IND
        D2[Yahoo Finance\nFallback + Sentiment] --> IND
        D3[Finnhub API\nEconomic Calendar] --> CAL
        IND["⚙️ Indicators Engine\nRSI · MACD · EMA · ATR · BB · Stochastic"] --> SMC
        CAL["📅 Econ Calendar\nHigh-Impact News Blocker"] --> GATE
        SMC["🔍 SMC Scanner\nBOS · ChoCH · FVG · Order Blocks · Sweeps"] --> GATE
        IND --> GATE
        GATE["🛡️ 12-Gate Confluence Engine\nConfluence · HTF Bias · MTF Stack · VWAP\nCorrelation · Session · Volatility · Cooldown"] --> SIG
        SIG["✅ Verified Signal Ticket\nEntry · SL · TP · Confidence Grade"]
    end

    subgraph TIER2 ["🔗  PILLAR 2 — Secure Broker Execution"]
        SIG --> EXEC["⚡ MetaAPI Node\nCloud MT4 / MT5 Terminal"]
        EXEC --> ACC[("💼 Your Broker Account\nIC Markets · Vantage · Pepperstone\nYour Capital — Your Control")]
        ACC --> HIST["📂 Deal History Sync\nClosed Trade Log Auditor"]
    end

    subgraph TIER3 ["💰  PILLAR 3 — Affiliate Reward Network"]
        HIST --> REB["🔁 5-Level Rebate Engine\n40% · 20% · 10% · 5% · 5%\nPer Closed Lot — Automated"]
        REB --> MILE["🏆 Milestone Ranks\nBronze → Silver → Gold → Platinum → Diamond"]
        REB --> WAL["💳 USDT Wallet\nInstant Credit · Crypto Withdrawal"]
        MILE --> WAL
    end

    classDef ai fill:#1a1a2e,color:#e0aaff,stroke:#7c3aed,stroke-width:2px
    classDef exec fill:#0d1b2a,color:#90e0ef,stroke:#0077b6,stroke-width:2px
    classDef reward fill:#0a2614,color:#95d5b2,stroke:#2d6a4f,stroke-width:2px
    classDef data fill:#2d1b00,color:#ffd166,stroke:#f4a261,stroke-width:2px

    class IND,SMC,CAL,GATE,SIG ai
    class EXEC,ACC,HIST exec
    class REB,MILE,WAL reward
    class D1,D2,D3 data
```

---

## 1. The Technological Edge: The 12-Gate Confluence Engine

Most retail traders fail due to emotional bias, poor timing, and one-dimensional analysis. TradeGPT eliminates the guesswork entirely. Every potential trade setup is evaluated through a proprietary **12-Gate Confluence Engine** — an automated, multi-layered validation system modeled after institutional risk committees.

### How It Works

```mermaid
flowchart LR
    MKT([" 📈 Market Data\nIngested"]) --> A

    subgraph PHASE_A ["Phase A — Technical Foundation"]
        A["RSI 14\nMomentum"] --> SC
        B["MACD 12/26/9\nTrend Cross"] --> SC
        C["EMA 50\nTrend Baseline"] --> SC
        D["Bollinger Bands\nVolatility"] --> SC
        E["Stochastic\nMomentum"] --> SC
        F["4H HTF Bias\nHigher TF Filter"] --> SC
        SC{{"Confluence\nScore ≥ 45%?"}}
    end

    subgraph PHASE_B ["Phase B — Structural & Event Filters"]
        SC -->|Pass| G["SMC Scan\nBOS · FVG · OB · Sweeps"]
        G --> H["Session Filter\nLondon / NY Overlap"]
        H --> I["Volatility ATR Check\n0.5x–2.5x Normal Range"]
        I --> J["Economic Calendar\n30min News Block Zone"]
        J --> K["Correlation Check\nGold/DXY · BTC/ETH"]
        K --> L["4-Hour Asset Cooldown\nNo Overtrading"]
    end

    subgraph PHASE_C ["Phase C — Precision Entry"]
        L --> M["MTF Stack\n2/3 Timeframes Aligned"]
        M --> N["VWAP Deviation\nNot Beyond ±2σ Bands"]
        N --> O["Candlestick Pattern\nHammer · Pin Bar · Engulf"]
    end

    O --> RESULT{{"Gates\nPassed?"}}
    RESULT -->|"≥ 8 / 12"| TRADE["🟢 Execute Trade\nBUY / SELL Signal"]
    RESULT -->|"5 – 7 / 12"| WATCH["🟡 Add to Watchlist\nMonitor Setup"]
    RESULT -->|"< 5 / 12"| SKIP["🔴 Skip Setup\nNo Signal Issued"]
    SC -->|Fail| SKIP
```

### The 12 Gatekeepers at a Glance

| # | Gate | What It Checks | Why It Matters |
|:---:|:---|:---|:---|
| 1 | **Confluence Score** | Weighted average of RSI, MACD, EMA, BB, Stoch, 4H Bias | Must be ≥ 45% — filters weak or contradictory setups |
| 2 | **SMC Pattern** | BOS, ChoCH, FVG, Order Blocks, Liquidity Sweeps | Confirms institutional price action structure |
| 3 | **HTF Trend** | 4-Hour RSI directional bias | Never trade counter to the dominant trend |
| 4 | **Session Activity** | London & NY overlap windows | Avoid low-liquidity hours and Asia chop |
| 5 | **Volatility ATR** | ATR ratio vs 20-period average | Prevent entering in dead or spike-driven markets |
| 6 | **No Conflict** | Bull/Bear indicator weight spread > 10% | No entry when signals are contradictory |
| 7 | **Asset Cooldown** | 4-hour timer per symbol post-trade | Blocks destructive over-trading |
| 8 | **Economic Calendar** | NFP, FOMC, CPI, ECB, BoE, BoJ detection | Blocks ±30min/15min around high-impact news |
| 9 | **Correlation Guard** | Asset vs correlated index alignment | E.g., Gold must align with DXY movement |
| 10 | **MTF Bias Stack** | Weekly, Daily, 4H EMA direction | 2 of 3 timeframes must align |
| 11 | **VWAP Deviation** | Price vs ±2σ VWAP band | No buying tops or selling bottoms |
| 12 | **Candlestick Entry** | 1H wick/body pattern detection | Pin Bars, Hammers, Engulfing confirmations |

---

## 2. Institutional Risk Management & Capital Preservation

Consistency separates professional traders from gamblers. TradeGPT embeds institutional risk mechanics into every single signal — automating the discipline most traders struggle to maintain manually.

### Risk Architecture at a Glance

```mermaid
graph LR
    subgraph sizing ["Position Sizing Engine"]
        WR["Win Rate\nfrom Trade History"] --> KELLY
        RR["Avg Win / Avg Loss\nRatio"] --> KELLY
        KELLY["Kelly Criterion\nOptimal Fraction f*"] -->|Capped at max 2%| LOT["Calculated\nLot Size"]
    end

    subgraph stops ["Stop Loss & Take Profit"]
        ATR["ATR 14\nVolatility Measure"] -->|"× 1.5"| SL["Stop Loss\nNoise-Absorbing Buffer"]
        SL -->|"× 2.5 R:R"| TP["Take Profit\nLocked 1:2.5 Ratio"]
    end

    LOT --> ORDER["📋 Final Order Ticket"]
    SL --> ORDER
    TP --> ORDER
    ORDER --> BROKER["🏦 Broker Execution"]
```

### A. Mathematically Structured Stops

Every trade is issued with automatically computed SL and TP levels:

- **Stop Loss:** `Entry ± (ATR × 1.5)` — absorbs market noise without premature stops.
- **Take Profit:** Positioned at exactly **1:2.5 Risk-to-Reward (R:R)**.

> **Why 1:2.5 matters:** Even with a win rate of just **30%**, a 1:2.5 R:R strategy is profitable over time. Most retail traders overtrade and under-manage risk — TradeGPT handles both automatically.

### B. Kelly Criterion Dynamic Lot Sizing

$$f^* = \frac{W \times R - L}{W \times R}$$

Where **W** = Win Rate, **L** = Loss Rate (1−W), **R** = Avg Win / Avg Loss. The output is capped at **2.0% account risk per trade**, protecting against statistical outliers.

| Win Rate | R:R Ratio | Kelly f* | Risk Capped At |
|:---:|:---:|:---:|:---:|
| 40% | 1:2.5 | 24% → **Capped** | **2.0%** |
| 50% | 1:2.5 | 37.5% → **Capped** | **2.0%** |
| 60% | 1:2.5 | 49.6% → **Capped** | **2.0%** |

No matter how strong the signal, no single trade ever risks more than 2% of your account.

---

## 3. Security, Trust & Non-Custodial Architecture

The biggest fear in automated trading is: *"What if they access my funds?"* TradeGPT's architecture makes this impossible by design.

```mermaid
flowchart LR
    subgraph YOUR_SIDE ["🔒 Always Under Your Control"]
        BROKER_ACC[("💼 Your Broker Account\nIC Markets · Vantage · Pepperstone\nFunds never leave your account")]
        BROKER_PWD["🔑 Your Login Password\nNever shared with TradeGPT"]
    end

    subgraph METAAPI ["🌐 MetaAPI Secure Bridge"]
        NODE["Cloud Terminal Node\nProvisioned by you, scoped to trade-only"]
        TOKEN["API Token\nShort-lived, revocable anytime"]
    end

    subgraph TRADEGPT ["⚡ TradeGPT Platform"]
        TERMINAL["Trading Terminal\nSends order instructions only"]
    end

    TRADEGPT --"Order ticket (symbol, volume, SL, TP)"--> METAAPI
    METAAPI --"Executes on MT4/MT5"--> YOUR_SIDE
    BROKER_PWD -.->|"NEVER transmitted"| TRADEGPT

    classDef safe fill:#0a2614,color:#95d5b2,stroke:#2d6a4f,stroke-width:2px
    classDef bridge fill:#0d1b2a,color:#90e0ef,stroke:#0077b6,stroke-width:2px
    classDef platform fill:#1a1a2e,color:#e0aaff,stroke:#7c3aed,stroke-width:2px
    class BROKER_ACC,BROKER_PWD safe
    class NODE,TOKEN bridge
    class TERMINAL platform
```

**Key Security Pillars:**

| Protection | Description |
|:---|:---|
| 🔒 **Non-Custodial** | Your funds never leave your personal regulated broker account |
| 🔑 **No Password Sharing** | Broker credentials are never transmitted to TradeGPT |
| ⚡ **Instant Revocation** | Disconnect your node in one click from the dashboard |
| 🛡️ **Scoped API Access** | MetaAPI tokens are restricted to trade-execution only — no withdrawal rights |
| 🔐 **Supabase RLS** | Row-level database security ensures only you can access your account data |

---

## 4. The TradeGPT Affiliate Network: Dual Earnings Engine

TradeGPT provides one of the most lucrative and transparent affiliate structures in financial technology. You earn passive income on **every single deal closed** in the accounts of every trader you refer — across 5 levels deep.

### A. 5-Tier Transactional Rebate Flow

```mermaid
graph TD
    YOU["👑 YOU\n(Network Leader)"]

    L1A["Trader A\n→ You earn 40% rebate"]
    L1B["Trader B\n→ You earn 40% rebate"]
    L1C["Trader C\n→ You earn 40% rebate"]

    L2A["Trader A.1\n→ You earn 20% rebate"]
    L2B["Trader B.1\n→ You earn 20% rebate"]

    L3A["Trader A.1.1\n→ You earn 10% rebate"]
    L4A["Trader A.1.1.1\n→ You earn 5% rebate"]
    L5A["Trader A.1.1.1.1\n→ You earn 5% rebate"]

    YOU --> L1A & L1B & L1C
    L1A --> L2A
    L1B --> L2B
    L2A --> L3A
    L3A --> L4A
    L4A --> L5A

    classDef you fill:#7c3aed,color:#fff,stroke:#5b21b6,stroke-width:3px
    classDef l1 fill:#0077b6,color:#fff,stroke:#005f92,stroke-width:2px
    classDef l2 fill:#2d6a4f,color:#fff,stroke:#1b4332,stroke-width:2px
    classDef l3 fill:#6b4226,color:#fff,stroke:#4a2e1a,stroke-width:2px
    classDef l4 fill:#444,color:#fff,stroke:#222,stroke-width:1px

    class YOU you
    class L1A,L1B,L1C l1
    class L2A,L2B l2
    class L3A l3
    class L4A,L5A l4
```

Every time a trader in your downline closes a deal, the platform's gross rebate is split and distributed automatically, in real-time, credited directly to your USDT wallet balance.

| Level | Relationship | Your Rebate Share |
|:---:|:---|:---:|
| 1 | Direct referrals (your invites) | **40%** |
| 2 | Their direct referrals | **20%** |
| 3 | 3rd generation | **10%** |
| 4 | 4th generation | **5%** |
| 5 | 5th generation | **5%** |

---

### B. Milestone Rank Rewards: The Path to Diamond

```mermaid
graph LR
    START([🚀 Start]) --> B["🥉 Bronze\n500 Lots → $500"]
    B --> S["🥈 Silver\n2,000 Lots → $2,500"]
    S --> G["🥇 Gold\n5,000 Lots → $7,500"]
    G --> P["💎 Platinum\n10,000 Lots → $15,000"]
    P --> D["👑 Diamond\n25,000 Lots → $50,000"]

    classDef rank fill:#1a1a2e,color:#ffd166,stroke:#f4a261,stroke-width:2px
    class B,S,G,P,D rank
```

| Achievement Rank | Required Team Volume | Max Single-Leg Contribution | Cash Bonus |
|:---:|:---:|:---:|:---:|
| 🥉 Bronze | 500 Lots | 200 Lots (40%) | **$500** |
| 🥈 Silver | 2,000 Lots | 800 Lots (40%) | **$2,500** |
| 🥇 Gold | 5,000 Lots | 2,000 Lots (40%) | **$7,500** |
| 💎 Platinum | 10,000 Lots | 4,000 Lots (40%) | **$15,000** |
| 👑 Diamond | 25,000 Lots | 10,000 Lots (40%) | **$50,000** |

#### The 40/40/20 Balanced Network Principle

The milestone volume system uses **leg capping** to reward builders who grow balanced, multi-branch networks. No single branch can count for more than **40%** of your target lot volume.

```mermaid
pie title Diamond Qualification (25,000 Lots) — Balanced 3-Leg Example
    "Leg A (max 40% = 10,000 Lots)" : 40
    "Leg B (max 40% = 10,000 Lots)" : 40
    "Leg C (remaining 20% = 5,000 Lots)" : 20
```

> This design ensures that only well-built, diversified networks achieve the highest ranks — preventing a single "power leg" from fraudulently carrying an inactive leader.

---

## 5. Why TradeGPT? At-a-Glance Comparison

| Feature | Traditional Copy-Trade | Generic Signal Bots | **TradeGPT** |
|:---|:---:|:---:|:---:|
| 12-Layer Signal Validation | ❌ | ❌ | ✅ |
| Non-Custodial (Your Funds Stay Yours) | ❌ | ❌ | ✅ |
| SMC + Institutional Analysis | ❌ | ❌ | ✅ |
| Kelly Criterion Position Sizing | ❌ | ❌ | ✅ |
| Economic News Auto-Block | ❌ | Partial | ✅ |
| 5-Level Affiliate Rebates (Per Lot) | ❌ | ❌ | ✅ |
| $50,000 Rank Milestone Rewards | ❌ | ❌ | ✅ |
| Real-Time USDT Payouts | ❌ | ❌ | ✅ |
| Live MT4 / MT5 Execution | ❌ | Partial | ✅ |

---

## 6. Get Started in 3 Steps

```mermaid
flowchart LR
    S1["1️⃣ Create Your Account\nSign up with your email\nor social login"] --> S2
    S2["2️⃣ Connect Your Broker\nLink your MT4/MT5 account\nvia MetaAPI — no password shared"] --> S3
    S3["3️⃣ Start Earning\nTerminal scans markets 24/5\nSignals execute automatically\nReferrals earn you USDT passively"]

    classDef step fill:#1a1a2e,color:#e0aaff,stroke:#7c3aed,stroke-width:2px
    class S1,S2,S3 step
```

**Your capital stays in your broker account. Your referrals earn you passive USDT income. Your network builds generational wealth.**

---

*TradeGPT — Where Institutional Intelligence Meets Accessible Markets.*
