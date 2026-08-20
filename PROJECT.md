# Project: Unified Quote Pipeline (UQP)

## Architecture
The Unified Quote Pipeline (UQP) provides broker-grade tick ingestion, deterministic multi-timeframe OHLC aggregation, internal quote routing for the AI Confluence Engine, and debounced SSE live price streaming for the HeroPip platform.

```
[MT5 Sidecars / Master Demo Feeds]
                 │
                 ▼
[R1: Tick Ingestion Daemon (src/daemons/tickIngestion.ts)]
                 │
                 ├──► [Redis Streams: stream:{broker}:{symbol}] (MAXLEN ~ 10000)
                 └──► [Redis Pub/Sub: channel:ticks:{broker}:{symbol}]
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
[R2: OHLC Aggregator Daemon]                 [R3: Next.js SSE Stream API]
(src/daemons/candleAggregator.ts)            (src/app/api/price-stream/route.ts)
  - 1m, 5m, 1h Time-Bucketing                  - 250ms Debounce Accumulator
  - Hot Cache: candles:{broker}:{sym}:{tf}     - Continuous JSON Stream: data: {...}
  - Batch Upsert: Supabase market_candles      - Multi-Broker Route Isolation
          │                                           │
          └─────────────────────┬─────────────────────┘
                                ▼
                 [R3: AI Confluence Engine]
                 (src/lib/market.ts)
                   - Query Redis Hot Cache / Supabase market_candles
                   - Pure In-Memory Indicators (RSI, MACD, EMA, BBands, SMC)
                   - ZERO Outbound HTTP to Twelve Data / Yahoo Finance
```

## Feature Inventory
| # | Feature | Description | Milestone | Status | Source |
|---|---------|-------------|-----------|:------:|--------|
| 1 | DB Schema & Migrations | Add `is_master_feed` to `broker_accounts`, create `market_candles` table with unique constraint on `(broker, symbol, timeframe, time)` | M1 | DONE | Survey / UQP Plan §3.1, §3.4 |
| 2 | Dynamic Master Feed Selection | Identify active demo accounts with `is_master_feed = true` to isolate client accounts from ingestion | M1 | DONE | Survey / UQP Plan §3.1 |
| 3 | Sidecar Subscription & Ingestion | Connect to MT5 Sidecars, dynamically subscribe to symbols, ingest raw Bid/Ask, compute Mid and Spread | M1 | DONE | Survey / UQP Plan §3.2 |
| 4 | Redis Stream & Pub/Sub Piping | Write normalized ticks to `stream:{broker}:{symbol}` with `MAXLEN ~ 10000` and publish to `channel:ticks:{broker}:{symbol}` | M1 | DONE | Survey / UQP Plan §3.3 |
| 5 | Ingestion Verification Script | `scripts/verify_ingestion.ts` validating tick stream arrival with <100ms latency | M1 | DONE | Survey / ORIGINAL_REQUEST §Acceptance |
| 6 | Consumer Group & Stream Reading | `src/daemons/candleAggregator.ts` consuming from Redis tick streams via `ohlc-aggregator-group` | M2 | DONE | Survey / UQP Plan §3.4 |
| 7 | Deterministic OHLC Bucketing | Time-bucketing ticks into 1m (60s), 5m (300s), and 1h (3600s) intervals maintaining running OHLCV state | M2 | DONE | Survey / UQP Plan §3.4 |
| 8 | Redis Candle Hot Cache | Maintain latest open/in-progress candles in Redis `candles:{broker}:{symbol}:{timeframe}:latest` | M2 | DONE | Survey / UQP Plan §3.4 |
| 9 | Supabase Batch Candle Upsert | Periodic & on-close batch upsert of finalized bars to `market_candles` with `ON CONFLICT DO UPDATE` | M2 | DONE | Survey / UQP Plan §3.4 |
| 10 | Aggregation Verification Script | `scripts/verify_aggregation.ts` validating 1m candle formation and OHLC invariants in Supabase | M2 | DONE | Survey / ORIGINAL_REQUEST §Acceptance |
| 11 | Internal Candle Data Accessor | `src/lib/internalCandles.ts` querying Redis hot cache and Supabase `market_candles` with cold-start fallback | M3 | DONE | Survey / UQP Plan §3.5 |
| 12 | AI Market Analysis Rewire | Remove all Twelve Data and Yahoo Finance outbound HTTP calls in `src/lib/market.ts`, using internal candle accessor | M3 | DONE | Survey / ORIGINAL_REQUEST §R3 |
| 13 | Debounced SSE Live Price Streaming | Refactor `src/app/api/price-stream/route.ts` to consume Redis ticks, apply 250ms debounce throttle, and stream JSON | M3 | DONE | Survey / ORIGINAL_REQUEST §R3 |
| 14 | SSE Continuous Stream Validation | Verify `curl -N http://localhost:3000/api/price-stream` outputs continuous valid JSON ticks | M3 | DONE | Survey / ORIGINAL_REQUEST §Acceptance |
| 15 | E2E Testing Suite (Tiers 1-4) | Comprehensive opaque-box test suite for Ingestion, Aggregation, AI Rewire, and SSE Streaming | Track E2E | DONE | Survey / Dual Track |
| 16 | Final Integration & Adversarial Hardening | Pass 100% E2E test suite + Tier 5 adversarial stress testing + Forensic Audit | M4 | DONE | Survey / Final Milestone |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|:------:|
| E2E | E2E Testing Track | Requirement-driven test suite (Tiers 1-4), test harness, runner, and `TEST_READY.md` | none | DONE |
| M1 | R1: Tick Ingestion Daemon | DB migration (`is_master_feed`, `market_candles`), `src/daemons/tickIngestion.ts`, `scripts/verify_ingestion.ts` | none | DONE |
| M2 | R2: OHLC Aggregator Daemon | `src/daemons/candleAggregator.ts`, Redis hot cache, Supabase batch upsert, `scripts/verify_aggregation.ts` | M1 | DONE |
| M3 | R3: AI Rewire & SSE Streaming | `src/lib/market.ts` zero outbound HTTP rewire, `src/app/api/price-stream/route.ts` 250ms debounced SSE | M1, M2 | DONE |
| M4 | Final Acceptance & Adversarial Hardening | Pass 100% E2E test suite (Tiers 1-4) + Tier 5 white-box coverage hardening + Forensic Integrity Audit | E2E, M1, M2, M3 | DONE |

## Code Layout
- `supabase/migrations/20260819_uqp_foundation.sql`: Database schema changes
- `src/daemons/tickIngestion.ts`: R1 Tick Ingestion Daemon
- `src/daemons/candleAggregator.ts`: R2 OHLC Aggregator Daemon
- `src/lib/market.ts`: R3 AI Market Analysis (rewired, zero outbound HTTP)
- `src/lib/internalCandles.ts`: Multi-tier internal candle data accessor
- `src/app/api/price-stream/route.ts`: R3 SSE Live Price Stream (250ms debounced)
- `scripts/verify_ingestion.ts`: Acceptance verification script for R1
- `scripts/verify_aggregation.ts`: Acceptance verification script for R2
- `tests/e2e/`: Comprehensive E2E test suite files (Tiers 1-4, Tier 5 Adversarial)
- `scripts/run_e2e_tests.ts`: Unified CLI test runner

## Final Project Status
**ALL MILESTONES COMPLETE — 100% TESTS PASSING — FORENSIC AUDIT CLEAN**
