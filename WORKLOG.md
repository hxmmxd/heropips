# TradeGPT — Development Worklog

> **Last Updated:** June 7, 2026 | **Commit:** `7deba70` | **Branch:** `main`

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     TradeGPT Platform                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐  │
│  │   AI    │  │ Manager  │  │   Live    │  │  Referral  │  │
│  │Terminal │  │  Module  │  │  Brokers  │  │    Hub     │  │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └────────────┘  │
│       │            │              │                          │
│       ▼            ▼              ▼                          │
│  ┌─────────────────────────────────────────────┐            │
│  │         Signal Engine (market.ts)           │            │
│  │  ┌─────────────────────────────────────┐    │            │
│  │  │         9-GATE SYSTEM               │    │            │
│  │  │  G1 Confluence    G6 No Conflict    │    │            │
│  │  │  G2 SMC Confirm   G7 Cooldown      │    │            │
│  │  │  G3 HTF Align     G8 News Event    │    │            │
│  │  │  G4 Session       G9 Correlation   │    │            │
│  │  │  G5 Volatility                     │    │            │
│  │  └─────────────────────────────────────┘    │            │
│  └──────────────┬──────────────────────────────┘            │
│                 │                                            │
│    ┌────────────┼────────────┬───────────────┐              │
│    ▼            ▼            ▼               ▼              │
│ ┌──────┐  ┌─────────┐  ┌─────────┐  ┌────────────┐        │
│ │Yahoo │  │ Twelve  │  │Finnhub  │  │  MetaAPI   │        │
│ │Financ│  │  Data   │  │News+Cal │  │  (MT5)     │        │
│ └──────┘  └─────────┘  └─────────┘  └────────────┘        │
│                                                              │
│  ┌─────────────────────────────────────────────┐            │
│  │              Supabase Backend               │            │
│  │  Auth · Users · Trades · Config · Referrals │            │
│  └─────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 Phase A — Core Signal Engine

**Goal:** Build an institutional-grade, multi-gate signal validation system.

### A1: 9-Gate Signal System
**File:** `src/lib/market.ts` (L545-600)

Implemented a multi-stage gating framework that evaluates every market analysis through 9 independent quality checks before allowing a signal.

```
Signal Flow:

  Market Data ──► Indicators ──► Scoring ──► 9 Gates ──► Outcome
                                               │
                                    ┌──────────┼──────────┐
                                    ▼          ▼          ▼
                                 SIGNAL     WATCH     NO_TRADE
                                (≥8 pass)  (4-7 pass)  (<4 or
                                                     critical fail)
```

| Gate | What it checks | Critical? |
|------|---------------|-----------|
| Confluence ≥65% | Weighted indicator agreement | ✅ Yes |
| SMC Confirmation | Structure break + patterns found | No |
| HTF Alignment | 4H timeframe agrees with signal | No |
| Session Filter | Trading during optimal session | No |
| Volatility | ATR ratio in normal range (0.5-2.5) | No |
| No Conflict | Bull/Bear weight spread >10% | ✅ Yes |
| Cooldown | 4-hour gap between signals | No |
| News Event | No high-impact events nearby | ✅ Yes |
| Correlation | Correlated assets agree | No |

### A2: SMC Scanner Integration
**File:** `src/lib/scanner.ts`

Smart Money Concepts scanner detects institutional price action patterns:

```
Scanner Output Tags:
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐
  │BOS break │ │ FVG gaps │ │Order Blks│ │Liquidity Sweeps │
  └──────────┘ └──────────┘ └──────────┘ └─────────────────┘
       │             │            │              │
       └─────────────┴────────────┴──────────────┘
                           │
                    SMC Confirmation Gate
```

### A3: Weighted 6-Indicator Scoring
Replaced simple 3-vote majority with weighted confluence:

| Indicator | Weight | Signal Logic |
|-----------|--------|-------------|
| RSI (14) | 20% | <30 bullish, >70 bearish |
| MACD | 25% | Histogram direction + crossover |
| EMA 50 | 15% | Price above/below |
| Stochastic | 10% | K/D crossover zones |
| Bollinger | 10% | Price at band extremes |
| 4H Bias | 20% | Higher timeframe trend |

### A4: Fast-Path Engine
**File:** `src/app/api/chat/route.ts`

Bypasses LLM for market analysis queries → delivers data in <5 seconds (vs 15-30s with LLM).

```
User: "analyze gold"
         │
         ▼
  ┌─ Is it a market query? ──► YES ──► Fast Path (no LLM)
  │                                         │
  │                                    Market Engine
  │                                    + Indicators
  │                                    + SMC Scanner
  │                                    + 9 Gates
  │                                         │
  │                                    JSON Response
  │                                    (< 5 seconds)
  │
  └─ NO ──► NVIDIA NIM LLM ──► Streamed Response
```

### A5: Higher Timeframe Bias
Fetches 4H candles separately to compute RSI and determine macro trend direction. This prevents counter-trend entries.

### A10: Signal → Manager Execution Flow
**Files:** `src/contexts/SignalContext.tsx` + `src/components/manager/SlideToExecute.tsx`

```
Terminal Tab                    Manager Tab
┌──────────────┐               ┌──────────────────┐
│ Analysis Card│               │  Trade Ticket     │
│              │  SignalContext │  ┌──────────────┐ │
│ [Execute ►]──┼──────────────►│  │ Pre-filled:  │ │
│              │  (global state)│  │ Symbol, Dir, │ │
│              │               │  │ SL, TP, Lots │ │
└──────────────┘               │  └──────────────┘ │
                               │                    │
                               │ ═══════════════►  │
                               │  Slide to Execute │
                               │                    │
                               │  MetaAPI → MT5     │
                               └──────────────────┘
```

---

## 📋 Phase B — Edge Multipliers

**Goal:** Add real-world data sources to improve signal quality beyond technical analysis.

### B1: Finnhub News Sentiment
**File:** `src/lib/newsSentiment.ts` (6.5 KB)

```
Finnhub API ──► 20 headlines ──► Keyword Scoring ──► Sentiment
     │                               │
     │  (fallback)              35 bullish words
     │                          35 bearish words
Yahoo RSS ──► 15 headlines ─────────┘
                                     │
                              ┌──────┴──────┐
                              │  BULLISH    │  score > +20
                              │  NEUTRAL    │  -20 to +20
                              │  BEARISH    │  score < -20
                              └─────────────┘
                              Cache: 10 min TTL
```

**API Key:** Finnhub free tier (`d8i25q...`)

### B2: Economic Calendar
**File:** `src/lib/econCalendar.ts` (8.3 KB)

Auto-blocks signals near high-impact macro events:

```
Event Detection:
  Finnhub /calendar/economic ──► Filter by currency
         │                            │
         │  (fallback)                ▼
  Static Schedule ──────────► ┌──────────────┐
   • FOMC dates               │ High Impact? │
   • NFP 1st Friday           │   NFP, CPI,  │
   • CPI ~13th                │   FOMC, GDP   │
                               └──────┬───────┘
                                      │
                        ┌─────────────┼─────────────┐
                        ▼             ▼             ▼
                   -30 min        EVENT        +15 min
                   ◄──── BLOCKED WINDOW ────►
                        Gate 8: NO_TRADE
```

### B3: RSI/MACD Divergence Detection
**File:** `src/lib/divergence.ts` (9.2 KB)

Detects price-oscillator divergences that signal potential reversals:

```
Bullish Divergence:          Bearish Divergence:

Price:  ╲    ╲               Price:  ╱    ╱
         ╲    ╲ Lower Low             ╱    ╱ Higher High
                                     
RSI:    ╲    ╱               RSI:    ╱    ╲
         ╲  ╱  Higher Low            ╱  ╲  Lower High

→ Reversal UP signal         → Reversal DOWN signal
```

**Method:** Swing pivot detection with 3-bar lookback, cross-referenced between price and both RSI series + MACD histogram series.

### B4: Correlated Asset Checker
**File:** `src/lib/correlation.ts` (6.7 KB)

Validates signals against correlated/inverse markets:

```
┌──────────┐     inverse      ┌──────────┐
│  Gold    │◄────────────────►│   DXY    │
│ (XAU/USD)│  Gold ↑ = DXY ↓ │(USD Index)│
└──────────┘                  └──────────┘

┌──────────┐     positive     ┌──────────┐
│   BTC    │◄────────────────►│   ETH    │
│ (BTC/USD)│  BTC ↑ = ETH ↑  │ (ETH/USD)│
└──────────┘                  └──────────┘

┌──────────┐     positive     ┌──────────┐
│ EUR/USD  │◄────────────────►│ GBP/USD  │
│          │  USD cluster     │          │
└──────────┘                  └──────────┘

┌──────────┐     positive     ┌──────────┐
│   QQQ    │◄────────────────►│   SPY    │
│ (Nasdaq) │  Index cluster   │ (S&P500) │
└──────────┘                  └──────────┘
```

---

## 🎨 UI Components

### Premium Analysis Card

```
┌─────────────────────────────────────────┐
│ ₿ BTCUSD              $60,932.01       │
│   LIVE ANALYSIS         BUY BIAS       │
├─────────────────────────────────────────┤
│         [Mini TradingView Chart]        │
├─────────────────────────────────────────┤
│ 🔴 NO_TRADE  Critical gate failed      │
├───────────────────┬─────────────────────┤
│ RSI (14)          │ MACD               │
│ 47.7    NEUTRAL   │ +103.47  BULLISH   │
├───────────────────┼─────────────────────┤
│ EMA (50)          │ ATR (14)           │
│ $62,007   BELOW   │ 689.24  VOLATILITY │
├───────────────────┴─────────────────────┤
│ ↑ 4H BULLISH    📰 NEUTRAL             │
├─────────────────────────────────────────┤
│ SMC: [BOS] [FVG] [OB] [Sweep]         │
├─────────────────────────────────────────┤
│ ▸ 8/9 gates passed  (expandable)       │
├─────────────────────────────────────────┤
│ ████░░░░░░ BBB · 36%  [⚡ GENERATE]    │
└─────────────────────────────────────────┘
```

---

## 📊 Data Flow Summary

```
                    ┌─────────────┐
                    │  User Chat  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  API Route  │
                    │ /api/chat   │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │    Market Engine        │
              │    (market.ts)          │
              └────────────┬────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌─────▼─────┐     ┌─────▼─────┐
   │ Yahoo/  │      │  Finnhub  │     │   Local   │
   │ Twelve  │      │           │     │  Compute  │
   │  Data   │      │ Sentiment │     │           │
   │         │      │ Calendar  │     │ Indicators│
   │ Candles │      │           │     │ Scanner   │
   │ Price   │      │           │     │ Divergence│
   └────┬────┘      └─────┬─────┘     └─────┬─────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │  9 Gates    │
                    │  Evaluate   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼───┐  ┌────▼───┐  ┌────▼─────┐
         │ SIGNAL │  │ WATCH  │  │ NO_TRADE │
         │  (≥8)  │  │ (4-7)  │  │  (<4)    │
         └────┬───┘  └────────┘  └──────────┘
              │
       ┌──────▼──────┐
       │ SignalContext│
       │  Transfer   │
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │  Manager    │
       │  Execute    │
       │  (MetaAPI)  │
       └─────────────┘
```

---

## 🔑 API Keys & Services

| Service | Purpose | Status |
|---------|---------|--------|
| NVIDIA NIM | LLM for conversational responses | ✅ Active |
| Twelve Data | Market candles + indicators | ⚠️ Daily limit (Yahoo fallback) |
| Finnhub | News sentiment + economic calendar | ✅ Active |
| Yahoo Finance | Candle data fallback | ✅ Active (no key needed) |
| MetaAPI | MT5 trade execution | ✅ Active |
| Supabase | Database + Auth | ✅ Active |
| NOWPayments | Crypto payments | ✅ Active |

---

## 📁 New Files This Session

| File | Size | Purpose |
|------|------|---------|
| `src/lib/newsSentiment.ts` | 6.5 KB | B1: Finnhub/Yahoo news sentiment scoring |
| `src/lib/econCalendar.ts` | 8.3 KB | B2: Economic calendar event blocking |
| `src/lib/divergence.ts` | 9.2 KB | B3: RSI/MACD divergence detection |
| `src/lib/correlation.ts` | 6.7 KB | B4: Correlated asset confirmation |
| `src/contexts/SignalContext.tsx` | 1.4 KB | A10: Global signal state transfer |
| `src/components/manager/SlideToExecute.tsx` | — | A10: Slide-to-execute UI |
| `src/lib/avatar.ts` | — | User avatar generation |

---

## 📝 Changelog

### v2.0.0 — Phase A+B Signal Engine (June 6-7, 2026)

**Added:**
- 9-gate institutional signal validation system
- SMC scanner with BOS, FVG, Order Block, Liquidity Sweep detection
- Weighted 6-indicator confluence scoring
- Fast-path engine (sub-5s market analysis, no LLM)
- 4H higher-timeframe bias
- Finnhub news sentiment with keyword scoring (35 bull + 35 bear words)
- Economic calendar gate (FOMC/NFP/CPI auto-blocker)
- RSI/MACD divergence detection with swing pivot analysis
- Correlated asset checker (DXY↔Gold, BTC↔ETH, USD cluster)
- Signal → Manager slide-to-execute flow
- Premium analysis card UI with 2×2 indicator grid
- Session tracking system

**Changed:**
- Market engine from 3-vote to weighted scoring
- Gate system expanded from 0 → 9 gates
- Analysis card redesigned from basic markdown to premium institutional layout
- API route now returns structured gating + SMC data

**Fixed:**
- Double-escaped newlines in analysis text
- Infinite loading on market queries (AbortController timeouts)
