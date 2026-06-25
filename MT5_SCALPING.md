# MT5 (MetaAPI) — Scalping Integration Reference

> **Purpose**: Complete technical reference for upgrading the existing MetaAPI integration in TradeGPT from swing-trading mode to support scalping on Forex, Gold, Indices, and Crypto CFDs.
> **Current State**: TradeGPT already uses MetaAPI REST for order execution (~1–2s round-trip) and account management. This document covers what needs to change for scalping.

---

## Table of Contents

1. [What MT5 via MetaAPI Gives Us](#1-what-mt5-via-metaapi-gives-us)
2. [Current Architecture vs Scalping Needs](#2-current-architecture-vs-scalping-needs)
3. [MetaAPI REST API — What We Already Use](#3-metaapi-rest-api--what-we-already-use)
4. [MetaAPI WebSocket API — What Scalping Needs](#4-metaapi-websocket-api--what-scalping-needs)
5. [Trade Execution for Scalping](#5-trade-execution-for-scalping)
6. [Position Management](#6-position-management)
7. [Real-Time Market Data](#7-real-time-market-data)
8. [Trailing Stop & Auto-Close](#8-trailing-stop--auto-close)
9. [Rate Limits & Performance](#9-rate-limits--performance)
10. [Broker Compatibility for Scalping](#10-broker-compatibility-for-scalping)
11. [Cost Analysis](#11-cost-analysis)
12. [Limitations & Risks](#12-limitations--risks)
13. [Integration with TradeGPT](#13-integration-with-tradegpt)
14. [Implementation Checklist](#14-implementation-checklist)

---

## 1. What MT5 via MetaAPI Gives Us

MetaAPI is a cloud bridge that connects TradeGPT to users' MetaTrader 4/5 broker accounts. For scalping, it provides:

| Capability | Value for Scalping |
|:---|:---|
| **Forex pairs** (EUR/USD, GBP/USD, USD/JPY) | The largest scalping market in the world |
| **Gold (XAUUSD)** | TradeGPT's #1 asset — $5+ moves in seconds during London/NY |
| **Indices** (NAS100, US30, SPX500) | High-volatility scalping targets |
| **Crypto CFDs** (BTCUSD, ETHUSD) | Leverage + 24/7 availability |
| **Native SL/TP on orders** | Broker-enforced — no client-side monitoring needed |
| **Leverage** (up to 1:500 depending on broker) | $100 account can control $50,000 position |
| **Real-time tick streaming** (WebSocket) | Sub-millisecond MetaAPI relay latency |
| **Server-side trailing stops** | MetaAPI manages trailing SL even if client disconnects |
| **600+ broker compatibility** | ICMarkets, Pepperstone, Exness, Vantage, etc. |

### What MT5 via MetaAPI Does NOT Give Us (That Binance Does)
- ❌ Zero-fee trading (brokers charge spread + commission)
- ❌ 24/7 markets for Forex/Gold (closed Sat-Sun)
- ❌ Direct exchange order book (OTC market, broker is counterparty)
- ❌ True tick data for all symbols (depends on broker feed quality)

---

## 2. Current Architecture vs Scalping Needs

### 2.1 What We Currently Use

| Component | Current Implementation | File |
|:---|:---|:---|
| **SDK Version** | `metaapi.cloud-sdk` v29.3.3 | `package.json` |
| **Initialization** | `new MetaApi(token)` singleton | `broker.ts:10-25` |
| **Account Provisioning** | `createAccount()` → `deploy()` | `broker.ts:122-284` |
| **Order Execution** | REST: `POST /trade` endpoint | `broker.ts:400-532` |
| **Account Info** | REST: `GET /account-information` | `broker.ts:186-204` |
| **Position Listing** | REST: `GET /positions` | `broker.ts:315-320` |
| **Server Time** | REST: `GET /server-time` | `broker.ts:207-228` |
| **Symbol List** | REST: `GET /symbols` | `broker.ts:213-215` |
| **Price Data** | Twelve Data API (separate) | `market.ts`, `price-stream/route.ts` |
| **Candle Data** | Twelve Data 1H candles (200 bars) | `market.ts:849-879` |

### 2.2 What Scalping Adds/Changes

| Component | What Changes | Why |
|:---|:---|:---|
| **Price Data** | Add MetaAPI tick streaming | Twelve Data 8s polling is too slow for Gold scalping |
| **Candle Data** | Fetch 1M candles from MetaAPI or Twelve Data | Currently only fetches 1H |
| **Order Execution** | Same REST endpoint — no change needed | Already ~1-2s, acceptable |
| **Position Close** | Add quick-close and partial-close | Current close is through Manager tab |
| **SL/TP Modification** | Add `POSITION_MODIFY` action type | Needed for trailing stops |
| **Trailing Stop** | Add `trailingStopLoss` object to trades | MetaAPI supports server-side trailing |
| **Spread Check** | Fetch symbol specification before trade | Reject if spread > threshold |
| **Cooldown Timer** | Reduce from 4 hours to 90 seconds | Current cooldown blocks scalping |

---

## 3. MetaAPI REST API — What We Already Use

### 3.1 Base URL

```
https://mt-client-api-v1.london.agiliumtrade.ai
```

All requests require header: `auth-token: <META_API_TOKEN>`

### 3.2 Currently Implemented Endpoints

#### Account Information
```
GET /users/current/accounts/{accountId}/account-information
```
**Response**:
```json
{
  "balance": 10000.00,
  "equity": 10250.50,
  "margin": 500.00,
  "freeMargin": 9750.50,
  "marginLevel": 2050.10,
  "leverage": 500,
  "broker": "ICMarketsSC",
  "currency": "USD",
  "platform": "mt5"
}
```

#### Open Positions
```
GET /users/current/accounts/{accountId}/positions
```
**Response**:
```json
[
  {
    "id": "12345678",
    "symbol": "XAUUSD",
    "type": "POSITION_TYPE_BUY",
    "volume": 0.10,
    "openPrice": 2340.50,
    "currentPrice": 2345.20,
    "profit": 47.00,
    "stopLoss": 2335.00,
    "takeProfit": 2360.00,
    "swap": -1.20,
    "commission": -0.70,
    "time": "2026-06-14T10:30:00.000Z"
  }
]
```

#### Trade Execution (Already Implemented)
```
POST /users/current/accounts/{accountId}/trade
```
**Request Body**:
```json
{
  "actionType": "ORDER_TYPE_BUY",
  "symbol": "XAUUSD",
  "volume": 0.10,
  "stopLoss": 2335.00,
  "takeProfit": 2360.00,
  "comment": "TradeGPT AI signal"
}
```

**Response (Success)**:
```json
{
  "numericResultCode": 10009,
  "stringCode": "TRADE_RETCODE_DONE",
  "orderId": "87654321",
  "positionId": "12345678",
  "openPrice": 2340.50
}
```

---

## 4. MetaAPI WebSocket API — What Scalping Needs

### 4.1 Why WebSocket for Scalping

| Metric | REST (Current) | WebSocket (Needed) |
|:---|:---|:---|
| **Price Update Latency** | 8-second poll via Twelve Data | **< 1ms** relay latency |
| **Tick Data** | Not available | Real-time bid/ask ticks |
| **Position Updates** | Manual poll | Instant push notifications |
| **Connection Type** | Stateless HTTP | Persistent socket.io |

### 4.2 Connection Setup

MetaAPI WebSocket uses **socket.io** (not raw WebSocket):

```typescript
import MetaApi from 'metaapi.cloud-sdk/node';

const api = new MetaApi(process.env.META_API_TOKEN);

async function connectStreaming(accountId: string) {
  const account = await api.metatraderAccountApi.getAccount(accountId);
  
  // Get streaming connection (not RPC)
  const connection = account.getStreamingConnection();
  
  // Add a synchronization listener for real-time events
  connection.addSynchronizationListener({
    onSymbolPriceUpdated(instanceIndex, price) {
      // Fired on every tick — sub-millisecond
      console.log(`${price.symbol}: Bid ${price.bid} / Ask ${price.ask}`);
    },
    
    onPositionUpdated(instanceIndex, position) {
      // Fired when position P&L changes
      console.log(`Position ${position.id}: P&L ${position.profit}`);
    },
    
    onPositionRemoved(instanceIndex, positionId) {
      // Fired when position is closed (SL/TP hit or manual close)
      console.log(`Position ${positionId} closed`);
    },
    
    onOrderCompleted(instanceIndex, orderId) {
      console.log(`Order ${orderId} filled`);
    }
  });
  
  // Connect and wait for sync
  await connection.connect();
  await connection.waitSynchronized();
  
  // Subscribe to specific symbols for tick data
  await connection.subscribeToMarketData('XAUUSD', [
    { type: 'quotes' },  // Bid/Ask
    { type: 'candles', timeframe: '1m' },  // 1M candles
    { type: 'ticks' },   // Raw ticks
  ]);
  
  return connection;
}
```

### 4.3 Synchronization Listener Events

| Event | When Fired | Use for Scalping |
|:---|:---|:---|
| `onSymbolPriceUpdated` | Every tick/quote update | Live price display, spread monitoring |
| `onCandlesUpdated` | New candle data | 1M chart updates, trigger analysis |
| `onPositionUpdated` | Position P&L changes | Live P&L ticker |
| `onPositionRemoved` | Position closed (SL/TP/manual) | Trade completion notification |
| `onOrderCompleted` | Order filled | Execution confirmation |
| `onConnected` | Connection established | Status indicator |
| `onDisconnected` | Connection lost | Auto-reconnect logic |
| `onBrokerConnectionStatusChanged` | Broker status change | Error handling |

### 4.4 The Serverless Problem

> ⚠️ **CRITICAL CONSTRAINT**: Our current architecture is serverless (Next.js on Vercel/Utho). WebSocket streaming requires a **persistent process** that stays alive indefinitely.

**Current Workaround** (in `broker.ts`): We use REST-only mode to avoid WebSocket timeouts.

**Solutions for Scalping**:

| Approach | Complexity | Cost | Recommended |
|:---|:---|:---|:---|
| **A) Dedicated WebSocket Process on Utho VPS** | Medium | $0 (existing VPS) | ✅ Best |
| **B) Edge Function with socket.io** | High | $20-50/mo | ❌ Complex |
| **C) Client-side MetaAPI SDK** | Low | $0 | ⚠️ Security risk (token in browser) |
| **D) Hybrid: REST for execution, MetaAPI WS for ticks only** | Medium | $0 | ✅ Pragmatic |

**Recommended: Option D** — Keep order execution on REST (proven, working), add a lightweight WebSocket relay process on the Utho VPS that streams ticks to the frontend via SSE.

---

## 5. Trade Execution for Scalping

### 5.1 Market Order (Same as Current)

```json
{
  "actionType": "ORDER_TYPE_BUY",
  "symbol": "XAUUSD",
  "volume": 0.05,
  "stopLoss": 2338.00,
  "takeProfit": 2345.00,
  "comment": "TradeGPT Scalp"
}
```

**Execution Time**: ~1-2 seconds via REST (acceptable for retail scalping)

### 5.2 Market Order with Trailing Stop (NEW for Scalping)

```json
{
  "actionType": "ORDER_TYPE_BUY",
  "symbol": "XAUUSD",
  "volume": 0.05,
  "stopLoss": 2338.00,
  "takeProfit": 2345.00,
  "trailingStopLoss": {
    "distance": {
      "distance": 30,
      "units": "RELATIVE_POINTS"
    },
    "threshold": {
      "thresholds": [
        {
          "threshold": 50,
          "stopLoss": 20
        }
      ],
      "units": "RELATIVE_POINTS",
      "stopPriceBase": "OPEN_PRICE"
    }
  },
  "comment": "TradeGPT Scalp + Trail"
}
```

**How it works**: 
- Opens at market price
- Initial SL at 2338 (30 points away)
- When price moves 50 points in profit, SL tightens to 20 points from open
- MetaAPI manages this server-side — even if client disconnects

### 5.3 Scalping-Specific Risk Parameters

| Parameter | Swing (Current) | Scalping (New) |
|:---|:---|:---|
| **Stop Loss** | ATR(14,1H) × 1.5 = ~$12 Gold | ATR(14,1M) × 1.0 = ~$2-4 Gold |
| **Take Profit** | SL × 2.5 (1:2.5 R:R) | SL × 1.0 to 1.5 (1:1 to 1:1.5 R:R) |
| **Lot Size** | Kelly-based, max 2% risk | Conservative: max 0.5-1% risk |
| **Max Daily Trades** | ~3 (4h cooldown) | 20-50 (90s cooldown) |
| **Max Open Positions** | No limit | 1-2 simultaneous |

---

## 6. Position Management

### 6.1 Close Position (Full)

```json
{
  "actionType": "POSITION_CLOSE_ID",
  "positionId": "12345678"
}
```

**Use**: Quick-close button on scalping UI

### 6.2 Partial Close

```json
{
  "actionType": "POSITION_PARTIAL",
  "positionId": "12345678",
  "volume": 0.03
}
```

**Use**: Close 60% of position at TP1, let remaining 40% run to TP2

### 6.3 Modify Stop Loss / Take Profit

```json
{
  "actionType": "POSITION_MODIFY",
  "positionId": "12345678",
  "stopLoss": 2342.00,
  "takeProfit": 2348.00
}
```

**Use**: Move SL to breakeven after price moves 50% toward TP

### 6.4 Close All Positions for a Symbol

Not a single API call — must close each position individually:
```typescript
async function closeAllBySymbol(accountId: string, symbol: string) {
  const positions = await fetchPositions(accountId);
  const matching = positions.filter(p => p.symbol === symbol);
  
  for (const pos of matching) {
    await restTrade(accountId, {
      actionType: 'POSITION_CLOSE_ID',
      positionId: pos.id
    });
  }
}
```

### 6.5 Close All Positions (Emergency / Daily Loss Limit Hit)

```typescript
async function emergencyCloseAll(accountId: string) {
  const positions = await fetchPositions(accountId);
  
  const closePromises = positions.map(pos => 
    restTrade(accountId, {
      actionType: 'POSITION_CLOSE_ID',
      positionId: pos.id
    })
  );
  
  await Promise.allSettled(closePromises);
  // Log circuit breaker activation
}
```

---

## 7. Real-Time Market Data

### 7.1 Get Symbol Specification (Spread + Lot Info)

```
GET /users/current/accounts/{accountId}/symbols/{symbol}/specification
```

**Response**:
```json
{
  "symbol": "XAUUSD",
  "description": "Gold vs US Dollar",
  "currency": "USD",
  "digits": 2,
  "contractSize": 100,
  "minVolume": 0.01,
  "maxVolume": 100.0,
  "volumeStep": 0.01,
  "tradeMode": "SYMBOL_TRADE_MODE_FULL",
  "fillingModes": ["ORDER_FILLING_FOK", "ORDER_FILLING_IOC"],
  "tickSize": 0.01,
  "tickValue": 1.0,
  "stopsLevel": 0,
  "freezeLevel": 0
}
```

**Critical Fields for Scalping**:
- `stopsLevel`: Minimum distance (in points) for SL/TP from current price. If > 0, scalping with tight stops is restricted!
- `freezeLevel`: If > 0, orders within this distance from price cannot be modified
- `minVolume` / `volumeStep`: Lot sizing constraints

### 7.2 Get Current Tick (REST)

```
GET /users/current/accounts/{accountId}/symbols/{symbol}/current-tick
```

**Response**:
```json
{
  "symbol": "XAUUSD",
  "bid": 2340.45,
  "ask": 2340.75,
  "last": 2340.60,
  "time": "2026-06-14T14:30:00.123Z",
  "brokerTime": "2026-06-14 17:30:00.123"
}
```

**Spread Calculation**: `ask - bid = 2340.75 - 2340.45 = $0.30 = 3 points`

### 7.3 Get Historical Candles (REST)

```
GET /users/current/accounts/{accountId}/symbols/{symbol}/timeframe/{timeframe}/candles
```

**Supported Timeframes**: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`, `1mn`

**Example**: Fetch 200 1-minute XAUUSD candles:
```
GET /users/current/accounts/{accountId}/symbols/XAUUSD/timeframe/1m/candles?startTime=2026-06-14T10:00:00.000Z&limit=200
```

**Response**:
```json
[
  {
    "time": "2026-06-14T14:30:00.000Z",
    "brokerTime": "2026-06-14 17:30:00.000",
    "open": 2340.50,
    "high": 2341.20,
    "low": 2340.10,
    "close": 2340.80,
    "tickVolume": 245,
    "spread": 30,
    "volume": 0
  }
]
```

> **Note**: `volume` is often 0 for forex/gold (no centralized exchange). Use `tickVolume` instead.

### 7.4 Pre-Trade Spread Check Function

```typescript
async function checkSpreadOk(
  accountId: string, 
  symbol: string, 
  maxSpreadPoints: number
): Promise<{ ok: boolean; spread: number; detail: string }> {
  const tick = await fetchCurrentTick(accountId, symbol);
  const spec = await fetchSymbolSpec(accountId, symbol);
  
  const spread = (tick.ask - tick.bid) / spec.tickSize;
  
  if (spread > maxSpreadPoints) {
    return {
      ok: false,
      spread,
      detail: `Spread ${spread} points exceeds max ${maxSpreadPoints}. Wait for tighter spread.`
    };
  }
  
  return {
    ok: true,
    spread,
    detail: `Spread ${spread} points — acceptable for scalping`
  };
}
```

---

## 8. Trailing Stop & Auto-Close

### 8.1 Server-Side Trailing Stop

MetaAPI supports trailing stops that run on their cloud server — they work even if TradeGPT's frontend or API is disconnected.

**Configuration Options**:

#### Distance-Based Trailing
```json
{
  "trailingStopLoss": {
    "distance": {
      "distance": 30,
      "units": "RELATIVE_POINTS"
    }
  }
}
```
Moves SL to lock in profit as price moves favorably. SL always stays 30 points behind the best price.

#### Threshold-Based Trailing
```json
{
  "trailingStopLoss": {
    "threshold": {
      "thresholds": [
        { "threshold": 50, "stopLoss": 20 },
        { "threshold": 100, "stopLoss": 10 }
      ],
      "units": "RELATIVE_POINTS",
      "stopPriceBase": "OPEN_PRICE"
    }
  }
}
```
- When profit reaches 50 points → SL moves to entry + 20 points (breakeven + 20)
- When profit reaches 100 points → SL moves to entry + 10 points (very tight)

**Units Available**:
- `ABSOLUTE_PRICE` — Exact price level
- `RELATIVE_PRICE` — Price offset from open
- `RELATIVE_POINTS` — Points offset
- `RELATIVE_PIPS` — Pips offset

### 8.2 Breakeven Auto-Move (Scalping Essential)

After a scalp trade moves 50% toward TP, automatically move SL to breakeven:

```typescript
async function moveToBreakeven(accountId: string, positionId: string, entryPrice: number) {
  await restTrade(accountId, {
    actionType: 'POSITION_MODIFY',
    positionId: positionId,
    stopLoss: entryPrice,  // Move SL to entry = breakeven
    stopLossUnits: 'ABSOLUTE_PRICE'
  });
}
```

---

## 9. Rate Limits & Performance

### 9.1 MetaAPI Performance Metrics

| Metric | Value | Source |
|:---|:---|:---|
| **Trade Execution Latency** (MetaAPI overhead) | **~6ms** median | MetaAPI docs |
| **WebSocket Streaming Latency** | **< 1ms** median | MetaAPI docs |
| **Total Round-Trip (REST trade)** | **1–2 seconds** | Measured in our `broker.ts` |
| **Account Uptime** | **99.5%+** (G2: 99.96%) | MetaAPI docs |

### 9.2 Rate Limits

| Limit | Value | Notes |
|:---|:---|:---|
| **REST API calls** | ~60 per minute per account | Varies by endpoint |
| **WebSocket connections** | 1 per account | Shared connection for all streams |
| **Simultaneous syncs** | 10% of total subscribed accounts | Don't sync all accounts at once |
| **Trade requests** | No MetaAPI limit | Limited by broker's MT5 server |

### 9.3 Scalping Throughput Analysis

For **50 scalp trades/day** per user:

| Operation | Frequency | REST Calls | Fits in Limits? |
|:---|:---|:---|:---|
| Place order | 50/day | 50 | ✅ |
| Close position | 50/day | 50 | ✅ |
| Modify SL (breakeven) | 25/day | 25 | ✅ |
| Spread check | 50/day | 50 | ✅ |
| Account info | 100/day | 100 | ✅ |
| **Total** | | **275/day** | ✅ Well under limits |

---

## 10. Broker Compatibility for Scalping

### 10.1 Broker Requirements for Scalping

Not all MT5 brokers allow scalping. Key requirements:

| Requirement | What to Check | How to Check |
|:---|:---|:---|
| **No minimum hold time** | Some brokers require trades open for ≥60 seconds | Ask broker support / test on demo |
| **Low stops level** | `stopsLevel` = 0 in symbol spec | Fetch `/symbols/{sym}/specification` |
| **ECN/STP execution** | Market execution, no dealing desk | Broker type classification |
| **Low spread** | Gold spread < 30 points ($0.30) | Monitor bookTicker during London/NY |
| **Fast execution** | < 500ms broker-side fill | Measure with test orders on demo |

### 10.2 Recommended Brokers for Scalping

| Broker | Gold Spread | Scalping Allowed | Stops Level | Recommended |
|:---|:---|:---|:---|:---|
| **ICMarkets** | 5-15 points | ✅ Yes | 0 | ⭐⭐⭐⭐⭐ |
| **Pepperstone** | 5-12 points | ✅ Yes | 0 | ⭐⭐⭐⭐⭐ |
| **Exness** | 10-20 points | ✅ Yes | 0 | ⭐⭐⭐⭐ |
| **Vantage** | 10-25 points | ✅ Yes | 0-10 | ⭐⭐⭐⭐ |
| **FBS** | 20-50 points | ⚠️ Some restrictions | 10-30 | ⭐⭐⭐ |
| **XM** | 25-40 points | ⚠️ DD accounts | 30-50 | ⭐⭐ |
| **OctaFX** | 15-30 points | ✅ Yes | 0 | ⭐⭐⭐⭐ |

### 10.3 Broker Compatibility Check Function

```typescript
async function isBrokerScalpFriendly(
  accountId: string, 
  symbol: string
): Promise<{ compatible: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  // 1. Check stops level
  const spec = await fetchSymbolSpec(accountId, symbol);
  if (spec.stopsLevel > 20) {
    issues.push(`High stops level (${spec.stopsLevel} points) — SL/TP must be far from price`);
  }
  
  // 2. Check trade mode
  if (spec.tradeMode !== 'SYMBOL_TRADE_MODE_FULL') {
    issues.push(`Trade mode is ${spec.tradeMode} — may not allow instant execution`);
  }
  
  // 3. Check current spread
  const tick = await fetchCurrentTick(accountId, symbol);
  const spreadPoints = (tick.ask - tick.bid) / spec.tickSize;
  if (spreadPoints > 30) {
    issues.push(`Current spread is ${spreadPoints} points — too wide for scalping`);
  }
  
  return {
    compatible: issues.length === 0,
    issues
  };
}
```

---

## 11. Cost Analysis

### 11.1 MetaAPI Costs

| Component | Cost | Notes |
|:---|:---|:---|
| **MetaAPI per account** | **$5/month** per connected MT5 account | Already budgeted in COST_PLAN.md |
| **G2 reliability upgrade** | ~$2-3/mo extra per account | Optional, recommended for scalping |
| **Trade execution** | **$0** per trade | MetaAPI charges per account, not per trade |
| **WebSocket streaming** | **$0** additional | Included in account fee |
| **Custom MT5 Farm** (alternative) | **$248/mo** for 1000 accounts | COST_PLAN.md architecture |

> ✅ **Key Advantage**: MetaAPI charges per account, NOT per trade. A scalper doing 50 trades/day costs the same as a swing trader doing 3 trades/week. No additional MetaAPI costs for scalping.

### 11.2 Broker-Side Costs (Paid by User)

| Cost Type | Typical Amount | Impact on Scalping |
|:---|:---|:---|
| **Spread** (Gold, ECN) | $0.10-0.30 per lot round-trip | Major cost — $5-15/day for active scalper |
| **Commission** (ECN accounts) | $3-7 per standard lot round-trip | Fixed cost per trade |
| **Swap** (overnight) | -$5 to -$20/lot/night | Irrelevant for scalping (no overnight holds) |

### 11.3 Rebate Impact

Scalping generates **significantly more lot volume** than swing trading:
- Swing trader: ~0.1-0.5 lots/day → ~3-15 lots/month
- Scalper: ~1-5 lots/day → ~30-150 lots/month

**MLM rebate revenue per scalper**: **5-10x higher** than swing traders
This makes scalpers extremely valuable for the affiliate network.

---

## 12. Limitations & Risks

### 12.1 Technical Limitations

| Limitation | Impact | Mitigation |
|:---|:---|:---|
| **REST execution = 1-2s latency** | Slower than institutional (~50ms) | Acceptable for retail. Market orders fill at best available |
| **Serverless + WebSocket conflict** | Next.js API routes timeout at 60s | Run WebSocket relay on dedicated VPS process |
| **Broker disconnections** | MetaAPI cloud node can disconnect | Auto-reconnect + status monitoring |
| **Weekend closure** (Forex/Gold) | No scalping Sat-Sun UTC | Show "Market Closed" in UI. Crypto available via Binance |
| **MetaAPI sync time** | New accounts take 1-3 min initial sync | Already handled with 'connecting' status flow |

### 12.2 Broker-Side Risks

| Risk | Severity | Mitigation |
|:---|:---|:---|
| **Broker bans scalping** | 🔴 High | Pre-check broker compatibility. Warn user if stops level > 20 |
| **Broker widens spread during news** | 🟡 Medium | Pre-trade spread check. Block if spread > 2x normal |
| **Broker requotes** | 🟡 Medium | Use `ORDER_FILLING_IOC` fill mode to avoid requotes |
| **Broker limits trade frequency** | 🟡 Medium | Some brokers cap at 100 orders/day. Monitor rejection codes |
| **Slippage on fast markets** | 🟡 Medium | Display slippage warning during high-impact news |

### 12.3 Risk Management Gaps (Must Fix)

| Gap | Current State | Required for Scalping |
|:---|:---|:---|
| **Daily loss limit** | ❌ Not implemented | 3-5% max daily drawdown, then circuit breaker |
| **Trade count limit** | ❌ Not implemented | Max 50 trades/day (configurable per plan) |
| **Max open positions** | ❌ Not limited | Max 1-2 simultaneous for scalping |
| **Minimum hold time for rebates** | ❌ Not implemented | 30-second minimum to prevent rebate gaming |
| **Spread threshold gate** | ❌ Not implemented | Reject scalps when spread > threshold |

---

## 13. Integration with TradeGPT

### 13.1 Changes to Existing Files

| File | Changes |
|:---|:---|
| `src/lib/broker.ts` | Add `closePosition()`, `modifyPosition()`, `partialClose()`, `checkSpread()` functions |
| `src/lib/market.ts` | Add `getScalpingSnapshot()` that uses 1M candles and 6-Gate pipeline |
| `src/lib/market.ts` | Add `fetchCandles(symbol, '1min', 200)` path — already supports interval param |
| `src/app/api/execute/route.ts` | Add `trade_type: 'scalp'` to trade log inserts |
| `src/components/TerminalTab.tsx` | Add scalp mode toggle, 1M chart switch, quick-trade buttons |
| `src/components/MiniChart.tsx` | Support 1M/5M interval selection |
| `src/components/ManagerTab.tsx` | Add quick-close buttons, partial close slider |

### 13.2 New Files Required

| File | Purpose |
|:---|:---|
| `src/lib/scalpingEngine.ts` | 6-Gate Scalping Pipeline (1M analysis, tight parameters) |
| `src/lib/scalpingRisk.ts` | Daily loss circuit breaker, position limits, spread gates |
| `src/app/api/scalp/close/route.ts` | Quick-close position endpoint |
| `src/app/api/scalp/modify/route.ts` | Modify SL/TP, breakeven, trailing stop |
| `src/app/api/scalp/snapshot/route.ts` | Scalping signal analysis (1M candles) |
| `src/app/api/scalp/compatibility/route.ts` | Check broker scalping compatibility |

### 13.3 Database Changes

```sql
-- Track trade type (swing vs scalp)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS trade_type varchar DEFAULT 'swing';

-- Daily P&L tracking for circuit breaker
CREATE TABLE IF NOT EXISTS public.daily_pnl (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  trade_date date NOT NULL,
  realized_pnl numeric(15,2) DEFAULT 0,
  trade_count integer DEFAULT 0,
  max_drawdown numeric(15,2) DEFAULT 0,
  circuit_breaker_hit boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trade_date)
);

-- Enforce minimum hold time for rebate eligibility
ALTER TABLE public.trade_log ADD COLUMN IF NOT EXISTS eligible_for_rebate boolean DEFAULT true;
-- Update rebateEngine to set eligible_for_rebate = false if hold_time_seconds < 30
```

### 13.4 Scalping Settings (User-Configurable)

Store in `platform_config` or user preferences:

```json
{
  "scalping_enabled": true,
  "max_daily_loss_pct": 3.0,
  "max_trades_per_day": 50,
  "max_open_positions": 2,
  "min_spread_threshold_gold": 20,
  "min_spread_threshold_forex": 15,
  "cooldown_seconds": 90,
  "scalp_risk_per_trade_pct": 0.5,
  "scalp_rr_ratio": 1.5,
  "trailing_stop_enabled": true,
  "trailing_stop_distance_points": 30,
  "breakeven_trigger_pct": 50,
  "min_hold_time_for_rebate": 30
}
```

---

## 14. Implementation Checklist

### Phase 1: Execution Upgrades
- [ ] Add `closePosition(accountId, positionId)` to `broker.ts`
- [ ] Add `modifyPosition(accountId, positionId, sl, tp)` to `broker.ts`
- [ ] Add `partialClose(accountId, positionId, volume)` to `broker.ts`
- [ ] Add `checkSpreadOk(accountId, symbol, maxSpread)` to `broker.ts`
- [ ] Add `isBrokerScalpFriendly(accountId, symbol)` to `broker.ts`
- [ ] Create `/api/scalp/close` and `/api/scalp/modify` routes

### Phase 2: Data Layer
- [ ] Add 1M candle fetching via MetaAPI REST candles endpoint
- [ ] Create scalping-specific VWAP computation using 1M candles
- [ ] Modify cooldown timer: 90s for scalp mode, 4h for swing mode
- [ ] Add spread gate to the gating pipeline

### Phase 3: WebSocket Streaming (Optional — For Premium Experience)
- [ ] Create WebSocket relay process for Utho VPS
- [ ] Implement MetaAPI `subscribeToMarketData` for tick streaming
- [ ] Create SSE endpoint (`/api/scalp/ticks`) to relay to frontend
- [ ] Add live spread display in TerminalTab

### Phase 4: Risk Management
- [ ] Create `scalpingRisk.ts` with daily loss circuit breaker
- [ ] Add `daily_pnl` table and tracking logic
- [ ] Implement max open positions check before order placement
- [ ] Add minimum hold time check in `rebateEngine.ts` (30s minimum)
- [ ] Emergency close-all function when daily loss limit hit

### Phase 5: Frontend
- [ ] Add Scalp Mode toggle (like Astro Mode)
- [ ] Switch MiniChart to 1M/5M when scalp mode active
- [ ] Add quick BUY/SELL buttons with 1-click execution
- [ ] Add live spread display next to price
- [ ] Add daily P&L widget with circuit breaker warning bar
- [ ] Add broker compatibility warning if stops level too high

---

*Document compiled for TradeGPT Scalping Feature — MT5/MetaAPI Integration*
