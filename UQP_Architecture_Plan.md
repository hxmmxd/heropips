# Unified Quote Pipeline (UQP)
**Product Requirements Document (PRD) & Architectural Plan**

## 1. Objective
To upgrade the platform to institutional-grade execution by building a proprietary **Single Source of Truth (SSOT)** market data pipeline. This eliminates reliance on third-party APIs (Yahoo/Twelve Data) for active trading, ensuring the AI, the charts, and the execution engine all operate on the exact same millisecond-accurate broker data.

## 2. Core Problems Solved
- **The Execution Mismatch:** Eliminates slippage and `10016 INVALID_STOPS` errors caused by discrepancies between Yahoo Finance quotes and actual broker execution prices.
- **Third-Party Bottlenecks:** Removes API rate limits, latency, and data costs associated with external providers like Twelve Data.
- **Multi-Broker Divergence:** Ensures users on Vantage, XM, or ATFX see prices strictly relevant to their specific broker's Liquidity Provider.

## 3. Architectural Pillars
1. **Dedicated Master Accounts (Admin Managed):** The platform administrator provisions dedicated MT5 Demo accounts for each supported broker (Vantage, XM, etc.). These are flagged in Supabase via an `is_master_feed` boolean. The admin manages these seamlessly via a dedicated toggle in the **Admin MT5 Farm Dashboard**. Live client accounts are strictly isolated and never used for global data fetching.
2. **Dynamic Subscription (Lazy Loading):** The system only streams symbols that users are actively viewing. If no users are online, the streams sleep, reducing MT5 Farm CPU load by 90%.
3. **Redis Pub/Sub Ingestion:** Ticks are routed into high-speed Redis streams segmented by broker (e.g., `stream:vantage:XAUUSD`).
4. **OHLC Aggregation Daemon:** A background worker converts chaotic raw ticks into clean 1-minute, 5-minute, and 1-hour candles.
5. **Multi-Broker Frontend Routing Logic:** When a user opens a chart or requests an AI signal, the backend identifies their connected MT5 broker and strictly routes them to the matching Redis stream (e.g., `stream:xm:XAUUSD`). This guarantees the user only sees the exact liquidity and spreads of their specific broker, ensuring absolute zero execution slippage.

---

## Phased Implementation Plan

### Phase 1: Foundation & Ingestion (The Redis Pipeline)
*Goal: Prove we can extract live ticks from MT5 efficiently.*
- Set up the first "Master Quote Account" (e.g., a Vantage Demo).
- Write a lightweight Node.js worker to dynamically subscribe to `XAUUSD` on the MT5 Sidecar.
- Pipe the incoming Bid/Ask ticks into a Redis Stream.
- **Deliverable:** Terminal logs showing live broker ticks arriving at `< 10ms` latency.

### Phase 2: The Aggregator (Building the Candles)
*Goal: Turn raw ticks into readable trading charts.*
- Build the Node.js "Aggregator Daemon".
- Read the Redis tick stream and group prices into Open, High, Low, Close (OHLC) formats.
- Save the finalized 1-minute candles to the Supabase database.
- **Deliverable:** Supabase database actively populating with proprietary market data in real-time.

### Phase 3: AI & Backend Integration (The Rewire)
*Goal: Force the AI to trade exclusively on our new data.*
- Refactor `src/lib/market.ts` to disconnect Twelve Data and Yahoo Finance for active symbols.
- Route all AI market queries, technical indicators (RSI, MACD), and Signal Generations to query our internal database/Redis cache.
- **Deliverable:** AI trade signals generated with 100% precision matching the exact MT5 execution price.

### Phase 4: Frontend Delivery (The Live UI)
*Goal: Show the user the real-time broker feed.*
- Build a Next.js Server-Sent Events (SSE) route to broadcast prices to the browser.
- Connect the React Chat UI, Trade Tickets, and charting libraries to the SSE stream.
- Apply a 250ms debounce throttle to preserve browser CPU.
- **Deliverable:** The web platform ticks in real-time, matching the user's MT5 mobile app perfectly.
