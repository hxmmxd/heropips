# Binance — Scalping Integration Reference

> **Purpose**: Complete technical reference for integrating Binance Spot API into TradeGPT for crypto scalping (BTC, ETH, SOL, and more).
> **Current State**: TradeGPT already uses Binance REST for price polling (2-second interval in `price-stream/route.ts`). This document covers expanding to full WebSocket streaming + order execution for scalping.

---

## Table of Contents

1. [What Binance Gives Us](#1-what-binance-gives-us)
2. [API Architecture — REST vs WebSocket](#2-api-architecture--rest-vs-websocket)
3. [WebSocket Streams for Scalping](#3-websocket-streams-for-scalping)
4. [REST API Endpoints We Need](#4-rest-api-endpoints-we-need)
5. [Authentication & Security](#5-authentication--security)
6. [Rate Limits & Quotas](#6-rate-limits--quotas)
7. [Available Trading Pairs](#7-available-trading-pairs)
8. [Order Types & Execution](#8-order-types--execution)
9. [Trading Filters & Lot Sizing](#9-trading-filters--lot-sizing)
10. [Integration with TradeGPT](#10-integration-with-tradegpt)
11. [Cost Analysis](#11-cost-analysis)
12. [Limitations & Risks](#12-limitations--risks)
13. [Implementation Checklist](#13-implementation-checklist)

---

## 1. What Binance Gives Us

Binance is the world's largest crypto exchange by volume. For TradeGPT's scalping feature, it provides:

| Capability | Value for Scalping |
|:---|:---|
| **Real-time WebSocket streaming** | Tick-level price updates every ~250ms |
| **1-minute Kline candles** | Perfect for 1M/5M scalping chart analysis |
| **Spot market order execution** | Market buy/sell with ~50ms exchange-side fill |
| **Zero trading fees** (BNB discount) | 0.1% standard, 0.075% with BNB, 0% for BTC/USDT makers |
| **24/7 market availability** | Crypto never closes — scalping available anytime |
| **No minimum hold time** | Unlike MT5 brokers, Binance has zero restrictions on trade duration |
| **Deep liquidity** | BTC/USDT does $15B+ daily volume — fills are instant |

### What Binance Does NOT Give Us
- ❌ Forex pairs (EUR/USD, GBP/USD) — MT5 only
- ❌ Gold (XAUUSD) — MT5 only
- ❌ Indices (NAS100, US30) — MT5 only
- ❌ Leverage above 1x on Spot (Futures API needed for leverage, and it's a separate integration)
- ❌ Direct MT5 integration (separate execution path from MetaAPI)

---

## 2. API Architecture — REST vs WebSocket

### Current TradeGPT Integration (REST Only)

```
[price-stream/route.ts]
       │
       └── fetchBinance()
               │
               └── GET https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT"]
                       │
                       └── Returns: { "BTCUSDT": "67234.50", "ETHUSDT": "3456.78" }
                                    (Polled every 2 seconds via setInterval)
```

### Proposed Scalping Integration (WebSocket)

```
[ScalpingPriceStream — persistent WebSocket]
       │
       ├── wss://stream.binance.com:9443/ws/btcusdt@kline_1m
       │       └── Live 1M candle updates every 250ms
       │
       ├── wss://stream.binance.com:9443/ws/btcusdt@bookTicker
       │       └── Real-time best bid/ask (spread monitoring)
       │
       └── wss://stream.binance.com:9443/ws/btcusdt@ticker
                └── 24hr rolling stats (volume, price change)
```

---

## 3. WebSocket Streams for Scalping

### 3.1 Connection Details

| Parameter | Value |
|:---|:---|
| **Base URL** | `wss://stream.binance.com:9443` or `wss://stream.binance.com:443` |
| **Data-only URL** | `wss://data-stream.binance.vision` (recommended for market data) |
| **Connection Lifetime** | 24 hours (auto-disconnects, must reconnect) |
| **Ping/Pong** | Server pings every 20 seconds → must reply with pong within 60s |
| **Symbol Format** | Lowercase (e.g., `btcusdt`, not `BTCUSDT`) |
| **Max Connections** | 300 per 5 minutes per IP |

### 3.2 Kline/Candlestick Stream (Most Important for Scalping)

**Stream Name**: `<symbol>@kline_<interval>`

**Example**: `btcusdt@kline_1m` — 1-minute BTC/USDT candles

**Update Frequency**: Pushes every **250 milliseconds** when there is activity

**Payload**:
```json
{
  "e": "kline",
  "E": 1638747660000,
  "s": "BTCUSDT",
  "k": {
    "t": 1638747660000,     // Kline open time
    "T": 1638747719999,     // Kline close time
    "s": "BTCUSDT",         // Symbol
    "i": "1m",              // Interval
    "f": 100,               // First trade ID
    "L": 200,               // Last trade ID
    "o": "67234.50",        // Open price
    "c": "67238.20",        // Close price
    "h": "67240.00",        // High price
    "l": "67230.10",        // Low price
    "v": "12.345",          // Base asset volume
    "n": 150,               // Number of trades
    "x": false,             // Is this kline closed?
    "q": "830123.45",       // Quote asset volume
    "V": "8.123",           // Taker buy base volume
    "Q": "546789.12"        // Taker buy quote volume
  }
}
```

**Key Field**: `"x": true` means the candle is **closed/final** — use this to trigger analysis on completed candles.

**Supported Intervals**: `1s`, `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M`

### 3.3 Book Ticker Stream (Spread Monitoring)

**Stream Name**: `<symbol>@bookTicker`

**Why**: Scalping requires knowing the exact bid/ask spread BEFORE entering a trade. A 0.05% spread on a 0.1% target = 50% of profit eaten.

**Payload**:
```json
{
  "u": 400900217,
  "s": "BTCUSDT",
  "b": "67234.50",      // Best bid price
  "B": "2.345",         // Best bid quantity
  "a": "67234.80",      // Best ask price
  "A": "1.567"          // Best ask quantity
}
```

**Spread Calculation**: `spread = ask - bid = $0.30` → `spread_pct = 0.30 / 67234.50 = 0.00045%`

### 3.4 Mini Ticker Stream (Lightweight Stats)

**Stream Name**: `<symbol>@miniTicker` or `!miniTicker@arr` (all symbols)

**Payload**:
```json
{
  "e": "24hrMiniTicker",
  "s": "BTCUSDT",
  "c": "67238.20",      // Close price
  "o": "66800.00",      // Open price (24h ago)
  "h": "67500.00",      // High (24h)
  "l": "66200.00",      // Low (24h)
  "v": "45678.90",      // Total volume (base)
  "q": "3067890123.45"  // Total volume (quote)
}
```

### 3.5 Combined Stream (Subscribe to Multiple)

Instead of opening separate connections per stream, use the combined stream endpoint:

```
wss://stream.binance.com:9443/stream?streams=btcusdt@kline_1m/btcusdt@bookTicker/ethusdt@kline_1m/ethusdt@bookTicker
```

**Max streams per connection**: 1024

---

## 4. REST API Endpoints We Need

### 4.1 Historical Klines (Backfill Charts)

```
GET https://api.binance.com/api/v3/klines
```

| Parameter | Required | Description |
|:---|:---|:---|
| `symbol` | ✅ | e.g., `BTCUSDT` |
| `interval` | ✅ | e.g., `1m`, `5m` |
| `limit` | ❌ | Default 500, max 1000 |
| `startTime` | ❌ | Millisecond timestamp |
| `endTime` | ❌ | Millisecond timestamp |

**Weight**: 2 per call

**Response**: Array of OHLCV arrays:
```json
[
  [1638747660000, "67234.50", "67240.00", "67230.10", "67238.20", "12.345", 1638747719999, "830123.45", 150, "8.123", "546789.12", "0"]
]
// [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBaseVol, takerBuyQuoteVol, ignore]
```

### 4.2 Exchange Info (Trading Rules)

```
GET https://api.binance.com/api/v3/exchangeInfo?symbol=BTCUSDT
```

**Weight**: 20

Returns filters for lot sizing, price precision, min notional value.

### 4.3 Account Information

```
GET https://api.binance.com/api/v3/account
```

**Weight**: 20 | **Auth**: SIGNED (HMAC)

Returns balances for all assets.

### 4.4 Place Order

```
POST https://api.binance.com/api/v3/order
```

**Weight**: 1 | **Auth**: SIGNED (HMAC)

| Parameter | Required | Description |
|:---|:---|:---|
| `symbol` | ✅ | e.g., `BTCUSDT` |
| `side` | ✅ | `BUY` or `SELL` |
| `type` | ✅ | `MARKET`, `LIMIT`, `STOP_LOSS_LIMIT`, etc. |
| `quantity` | ✅* | Amount of base asset |
| `quoteOrderQty` | ✅* | Amount in quote asset (alternative to `quantity`) |
| `price` | For LIMIT | Limit price |
| `timeInForce` | For LIMIT | `GTC`, `IOC`, `FOK` |
| `timestamp` | ✅ | Current timestamp (ms) |
| `signature` | ✅ | HMAC-SHA256 signature |

*One of `quantity` or `quoteOrderQty` is required.

### 4.5 Cancel Order

```
DELETE https://api.binance.com/api/v3/order
```

**Weight**: 1 | **Auth**: SIGNED

### 4.6 Current Open Orders

```
GET https://api.binance.com/api/v3/openOrders
```

**Weight**: 6 per symbol | **Auth**: SIGNED

---

## 5. Authentication & Security

### 5.1 API Key Requirements

| Requirement | Detail |
|:---|:---|
| **API Key Type** | HMAC-SHA256 (standard), Ed25519 (recommended), or RSA |
| **Permissions Needed** | "Enable Spot & Margin Trading" must be checked |
| **IP Whitelisting** | Strongly recommended for production |
| **Withdrawal Permission** | ❌ NOT needed — never enable this |

### 5.2 Request Signing (HMAC-SHA256)

Every SIGNED endpoint requires:

1. Build the query string: `symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.001&timestamp=1638747660000`
2. Sign it: `HMAC-SHA256(queryString, apiSecret)`
3. Append: `&signature=<result>`

```typescript
import crypto from 'crypto';

function signRequest(params: Record<string, string>, secret: string): string {
  const queryString = new URLSearchParams(params).toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(queryString)
    .digest('hex');
  return `${queryString}&signature=${signature}`;
}
```

### 5.3 Environment Variables Needed

```env
# Binance API (for scalping execution)
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here
```

> ⚠️ **CRITICAL**: These keys have REAL MONEY execution capability. Store in Supabase `platform_config` table (same pattern as `META_API_TOKEN`), NOT in `.env.local`.

---

## 6. Rate Limits & Quotas

### 6.1 REST API Limits

| Limit Type | Value | Scope |
|:---|:---|:---|
| **Request Weight** | 6,000 per minute | Per IP |
| **Order Rate** | 100 orders per 10 seconds | Per account |
| **Order Count** | 200,000 orders per 24 hours | Per account |
| **Max Open Orders** | 200 per symbol | Per account |

### 6.2 WebSocket Limits

| Limit Type | Value |
|:---|:---|
| **Connections** | 300 per 5 minutes per IP |
| **Streams per Connection** | 1024 |
| **Connection Lifetime** | 24 hours |
| **Subscription Messages** | 5 per second |

### 6.3 Scalping Impact Analysis

For **50 scalp trades/day** across 3 symbols:

| Operation | Weight | Frequency | Daily Usage |
|:---|:---|:---|:---|
| WebSocket streams | 0 (free) | Continuous | 0 weight |
| Place order | 1 | 50/day | 50 weight |
| Cancel order | 1 | ~10/day | 10 weight |
| Account check | 20 | 50/day | 1,000 weight |
| Kline backfill | 2 | 3/startup | 6 weight |
| **Total** | | | **~1,066/day** |

**Verdict**: Well within the 6,000/min limit. No concerns.

---

## 7. Available Trading Pairs

### 7.1 Primary Scalping Candidates

| Pair | Daily Volume | Avg Spread | Scalping Suitability |
|:---|:---|:---|:---|
| **BTCUSDT** | $15B+ | 0.001% | ⭐⭐⭐⭐⭐ Best liquidity |
| **ETHUSDT** | $8B+ | 0.002% | ⭐⭐⭐⭐⭐ Excellent |
| **SOLUSDT** | $3B+ | 0.005% | ⭐⭐⭐⭐ Very good |
| **BNBUSDT** | $1.5B+ | 0.008% | ⭐⭐⭐⭐ Good |
| **XRPUSDT** | $2B+ | 0.01% | ⭐⭐⭐ Decent |
| **DOGEUSDT** | $1B+ | 0.02% | ⭐⭐⭐ Decent |

### 7.2 Pairs to Avoid for Scalping

- Low-volume altcoins (< $100M daily volume) — wide spreads, slippage
- Newly listed tokens — volatile, unpredictable fills
- Stablecoin pairs (USDT/USDC) — no meaningful price movement

### 7.3 Symbol Mapping for TradeGPT

```typescript
const BINANCE_SYMBOL_MAP: Record<string, string> = {
  'BTC/USD': 'BTCUSDT',
  'ETH/USD': 'ETHUSDT',
  'SOL/USD': 'SOLUSDT',
  'BNB/USD': 'BNBUSDT',
  'XRP/USD': 'XRPUSDT',
  'DOGE/USD': 'DOGEUSDT',
};
```

---

## 8. Order Types & Execution

### 8.1 Market Order (Primary for Scalping)

```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "MARKET",
  "quantity": "0.001"
}
```

**Fill Speed**: Typically < 50ms exchange-side
**Slippage**: Negligible on BTC/ETH due to deep order book

### 8.2 Limit Order (Optional — Precision Entry)

```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "LIMIT",
  "timeInForce": "IOC",
  "quantity": "0.001",
  "price": "67234.50"
}
```

**`IOC` (Immediate-Or-Cancel)**: Fill what you can at this price, cancel the rest. Perfect for scalping — no dangling orders.

### 8.3 OCO Order (One-Cancels-Other — SL + TP)

```json
{
  "symbol": "BTCUSDT",
  "side": "SELL",
  "quantity": "0.001",
  "price": "67500.00",         // Take Profit (LIMIT)
  "stopPrice": "67100.00",     // Stop Loss trigger
  "stopLimitPrice": "67095.00",// Stop Loss execution
  "stopLimitTimeInForce": "GTC"
}
```

**Why OCO matters for scalping**: Automatically exits the position at either TP or SL — no manual monitoring needed.

### 8.4 Closing a Position (Spot Market)

Binance Spot does NOT have "positions" like MT5. You simply:
- **Bought 0.001 BTC** → To close, **Sell 0.001 BTC** (market order)
- Track positions client-side in Supabase `trades` table

---

## 9. Trading Filters & Lot Sizing

### 9.1 Key Filters (Fetched from `/api/v3/exchangeInfo`)

| Filter | What It Means | Example (BTCUSDT) |
|:---|:---|:---|
| **LOT_SIZE** | Min/max quantity, step size | min: 0.00001, step: 0.00001 |
| **MARKET_LOT_SIZE** | Min/max for MARKET orders | min: 0.00001, max: 9000 |
| **MIN_NOTIONAL** | Minimum order value (price × qty) | $5.00 |
| **PRICE_FILTER** | Price precision (tick size) | tickSize: 0.01 |

### 9.2 Practical Minimum Orders

| Pair | Min Quantity | Min Value (approx) | Step Size |
|:---|:---|:---|:---|
| **BTCUSDT** | 0.00001 BTC | ~$0.67 | 0.00001 |
| **ETHUSDT** | 0.0001 ETH | ~$0.35 | 0.0001 |
| **SOLUSDT** | 0.01 SOL | ~$1.50 | 0.01 |

> **Note**: The `MIN_NOTIONAL` filter ($5 minimum) is the real constraint. Your order must be worth at least $5 USDT.

### 9.3 Quantity Normalization Function

```typescript
function normalizeQuantity(quantity: number, stepSize: number): number {
  const precision = Math.round(-Math.log10(stepSize));
  return Math.floor(quantity * Math.pow(10, precision)) / Math.pow(10, precision);
}
```

---

## 10. Integration with TradeGPT

### 10.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    TradeGPT Frontend                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Chart (1M)  │  │  Quick Trade │  │  P&L Ticker  │  │
│  │  Lightweight  │  │  BUY / SELL  │  │  Live spread │  │
│  │  Charts v5   │  │  buttons     │  │  display     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│         ▼                 ▼                  ▼          │
│  [EventSource SSE]  [POST /api/scalp/execute]  [SSE]   │
└─────────┬─────────────────┬──────────────────┬──────────┘
          │                 │                  │
┌─────────▼─────────────────▼──────────────────▼──────────┐
│                   Next.js API Layer                       │
│                                                          │
│  /api/scalp/stream   — SSE relay of WebSocket data       │
│  /api/scalp/execute  — Binance order execution           │
│  /api/scalp/close    — Quick position close              │
│  /api/scalp/snapshot — Scalping engine analysis          │
└─────────┬─────────────────┬──────────────────┬──────────┘
          │                 │                  │
┌─────────▼─────────┐  ┌───▼──────────┐  ┌───▼──────────┐
│  Binance WebSocket │  │  Binance     │  │  Supabase    │
│  (Real-time data)  │  │  REST API    │  │  (Trades DB) │
│  - kline_1m        │  │  (Orders)    │  │  (Positions) │
│  - bookTicker      │  │              │  │  (P&L)       │
└────────────────────┘  └──────────────┘  └──────────────┘
```

### 10.2 New Files Required

| File | Purpose |
|:---|:---|
| `src/lib/binance.ts` | Binance REST client (auth, orders, account) |
| `src/lib/binanceWs.ts` | WebSocket manager (klines, tickers, reconnection) |
| `src/lib/scalpingEngine.ts` | 6-Gate Scalping Pipeline (1M analysis) |
| `src/lib/scalpingRisk.ts` | Risk management (daily loss limit, position sizing) |
| `src/app/api/scalp/stream/route.ts` | SSE endpoint relaying WebSocket data to frontend |
| `src/app/api/scalp/execute/route.ts` | Order placement endpoint |
| `src/app/api/scalp/close/route.ts` | Quick-close endpoint |
| `src/app/api/scalp/snapshot/route.ts` | Scalping signal analysis |

### 10.3 Database Changes

```sql
-- Add trade_type to distinguish scalps from swing trades
ALTER TABLE public.trades ADD COLUMN trade_type varchar DEFAULT 'swing';
-- Values: 'swing', 'scalp'

-- Add exchange column (binance vs mt5)
ALTER TABLE public.trades ADD COLUMN exchange varchar DEFAULT 'mt5';
-- Values: 'mt5', 'binance'

-- Daily loss tracking table
CREATE TABLE public.daily_pnl (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  trade_date date NOT NULL,
  realized_pnl numeric(15,2) DEFAULT 0,
  trade_count integer DEFAULT 0,
  circuit_breaker_hit boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trade_date)
);
```

---

## 11. Cost Analysis

| Component | Cost | Notes |
|:---|:---|:---|
| **Binance API access** | **FREE** | No subscription fee |
| **WebSocket streams** | **FREE** | Unlimited market data |
| **Trading fees** | **0.1%** standard | 0.075% with BNB, 0% for BTC/USDT maker |
| **REST API calls** | **FREE** | Within rate limits |
| **Infrastructure** | **$0** additional | WebSocket runs in existing Node.js server process |
| **User USDT on Binance** | User's own funds | Non-custodial — users connect their own Binance account |

### Fee Impact on Scalping Profitability

For a typical scalp targeting 0.15% profit (BTC):

| Scenario | Entry Fee | Exit Fee | Net Profit |
|:---|:---|:---|:---|
| Standard (0.1%) | -0.1% | -0.1% | 0.15% - 0.2% = **-0.05%** ❌ |
| BNB discount (0.075%) | -0.075% | -0.075% | 0.15% - 0.15% = **0.00%** ⚠️ |
| Zero-fee maker (BTC/USDT) | 0% | -0.1% | 0.15% - 0.1% = **+0.05%** ✅ |

> ⚠️ **IMPORTANT**: Binance fees eat heavily into scalp profits. Users MUST hold BNB for fee discount, or use limit orders for maker rebates. This should be clearly documented in the UI.

---

## 12. Limitations & Risks

### 12.1 Technical Limitations

| Limitation | Impact | Mitigation |
|:---|:---|:---|
| **No native SL/TP** on market orders | Must place separate OCO order after fill | Auto-OCO placement in `binance.ts` |
| **Spot only (no leverage)** | $100 account can only trade $100 worth | Clearly communicate — "1:1 trading" |
| **No "position" concept** | Must track positions client-side | Supabase `trades` table + reconciliation |
| **24-hour WebSocket limit** | Connection drops after 24h | Auto-reconnect logic in `binanceWs.ts` |
| **IP-based rate limits** | Shared limits if multiple users on same server | Consider proxy rotation for production |

### 12.2 Regulatory Risks

| Risk | Severity | Notes |
|:---|:---|:---|
| **Binance blocked in some countries** | 🟡 Medium | India allows Binance (with TDS). US users must use Binance.US (separate API) |
| **KYC requirements** | 🟡 Medium | Users must have verified Binance accounts |
| **API key custody** | 🔴 High | TradeGPT stores user API keys — must encrypt at rest, never log, never expose |

### 12.3 User Experience Risks

| Risk | Mitigation |
|:---|:---|
| Users lose money from fees > profits | Display fee impact calculator before trade |
| Users over-trade (50+ trades/day) | Daily trade count warning at 30 trades |
| Users confuse Spot with Futures | Clear UI labeling: "Spot Trading — No Leverage" |

---

## 13. Implementation Checklist

### Phase 1: Data Layer
- [ ] Create `src/lib/binanceWs.ts` — WebSocket connection manager with auto-reconnect
- [ ] Implement kline stream subscription (`btcusdt@kline_1m`, `ethusdt@kline_1m`)
- [ ] Implement bookTicker stream for spread monitoring
- [ ] Create `/api/scalp/stream` SSE endpoint to relay WebSocket data to frontend
- [ ] Add 1M chart rendering in MiniChart.tsx (switch interval based on mode)

### Phase 2: Execution Layer
- [ ] Create `src/lib/binance.ts` — REST client with HMAC-SHA256 signing
- [ ] Implement `placeMarketOrder()`, `placeLimitOrder()`, `placeOcoOrder()`
- [ ] Create `/api/scalp/execute` endpoint
- [ ] Create `/api/scalp/close` endpoint (quick market sell)
- [ ] Fetch and cache `exchangeInfo` for lot sizing validation
- [ ] Pre-trade spread check from bookTicker data

### Phase 3: Integration
- [ ] Add Binance API key input to Settings/Profile tab
- [ ] Encrypt and store API keys in Supabase `platform_config` or user-specific table
- [ ] Add `trade_type` and `exchange` columns to `trades` table
- [ ] Create `daily_pnl` table with circuit breaker logic
- [ ] Wire scalping signals through the 6-Gate Scalping Pipeline

### Phase 4: Safety
- [ ] Implement daily loss circuit breaker (3% max)
- [ ] Add trade count limiter (max 50/day for free, unlimited for Pro)
- [ ] Fee calculator display in trade ticket
- [ ] Binance account balance polling and display
- [ ] Error handling for insufficient balance, filter failures, rate limits

---

*Document compiled for TradeGPT Scalping Feature — Binance Spot Integration*
