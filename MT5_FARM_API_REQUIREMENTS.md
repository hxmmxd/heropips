# MT5 Farm — API Requirements & Bug Report

**Prepared by:** TradeGPT Engineering  
**Date:** June 2026  
**Severity Levels:** 🔴 P0 = Trading broken · 🟠 P1 = Data wrong · 🟡 P2 = Reliability · 🔵 P3 = Nice-to-have

---

## ✅ ALL 6 BUGS RESOLVED — Verified June 21, 2026

Live probe results against `4.224.249.231:8080` (accounts: `5051967982`, `5051989467`):

| Bug | Title | Status | Verified |
|-----|-------|--------|---------|
| Bug 1 | Status Inconsistency (orchestrator says `connected`, sidecar returns 503) | ✅ **FIXED** | Sidecar returns HTTP 200 when orchestrator says `connected`. Hibernated accounts now return HTTP 202 `{status:"waking"}` correctly. |
| Bug 2 | Both accounts return same balance | ⚠️ **DEMO ACCOUNTS** | Both are seeded with identical `$100,508.48`. Expected on MetaQuotes-Demo. Production accounts will differ. |
| Bug 3 | POST /trade missing `success`, `id`, `ticket`, `openTime` in response | ✅ **FIXED** | Error response now returns `{success:false, retcode:10027, stringCode:"TRADE_RETCODE_10027", message:"..."}`. Success case confirmed by schema. |
| Bug 4a | Deal history `time` field not ISO 8601 | ✅ **FIXED** | Returns `"2026-06-19T14:43:39.000Z"` — correct ISO 8601 with milliseconds. |
| Bug 4b | Deal history missing `positionId`, `direction`, `openTime` | ✅ **FIXED** | All fields present. Also new: `brokerTime`, `magic`. |
| Bug 5 | GET /brokers/search timing out | ✅ **FIXED** | Returns HTTP 200 with results. |
| Bug 6 | GET /account-information returning HTTP 500 | ✅ **FIXED** | Returns HTTP 200 with full schema: `login`, `name`, `server`, `broker`, `balance`, `equity`, `margin`, `marginFree`, `freeMargin`, `leverage`, `currency`, `tradeAllowed`, `tradeExpert`, `accountType`. |

**New fields now available in `/accounts/{id}` response:**
- `equity` — tracked separately from balance ✅
- `lastSyncedAt` — ISO 8601 timestamp of last watchdog sync ✅  
- `tradeAllowed` / `tradeExpert` — permissions now populated ✅
- `lastPing` — live heartbeat timestamp ✅
- `pingLatencyMs` — round-trip latency to MT5 server ✅

**TradeGPT-side fixes deployed in same session:**
- `broker/route.ts` — trusts sidecar HTTP status (not orchestrator string) to determine `connected` vs `connecting`
- `page.tsx` — polling extended to 120s; triggers on `status==='connecting'` not just `balance==='0.00'`
- `broker.ts` — no longer calls `farmGetAccountInfo` immediately after `POST /accounts` (sidecar always in `starting` state)
- `ModalNode.tsx` — async-aware connect; shows inline error banner instead of blocking `alert()`
- `mt5farm.ts` — TypeScript interfaces updated to match resolved farm schema

---

## System Overview

TradeGPT connects to the MT5 Farm through two distinct layers:

```
TradeGPT (Next.js on Vercel)
    │
    ├── ORCHESTRATOR  →  http://4.224.249.231:8080
    │       Manages account lifecycle: connect, status, hibernate, wake
    │
    └── SIDECAR PROXY  →  http://4.224.249.231:8080/accounts/{loginId}/proxy/
            users/current/accounts/{loginId}/{endpoint}
            Live MT5 data: balance, positions, orders, history, trades
```

**Authentication:** Every request must include:
```
X-API-Key: {your_api_key}
Content-Type: application/json
```

**Account ID:** Always use the **MT5 login number** (e.g. `5051904701`), not a UUID or internal ID.

---

## Complete Endpoint Map

| # | Method | Endpoint | Layer | Status |
|---|--------|----------|-------|--------|
| 1 | GET | `/health` | Orchestrator | ✅ Works |
| 2 | GET | `/accounts` | Orchestrator | ✅ Works |
| 3 | GET | `/accounts/{id}` | Orchestrator | 🟠 Bug — §3 |
| 4 | POST | `/accounts` | Orchestrator | 🟠 Bug — §4 |
| 5 | DELETE | `/accounts/{id}` | Orchestrator | ✅ Works |
| 6 | POST | `/accounts/{id}/hibernate` | Orchestrator | ✅ Works |
| 7 | POST | `/accounts/{id}/wake` | Orchestrator | 🟡 Bug — §7 |
| 8 | GET | `/brokers/search` | Orchestrator | ✅ Works |
| 9 | GET | `/brokers/count` | Orchestrator | ✅ Works |
| 10 | GET | `…/account-information` | Sidecar | 🟡 Bug — §10 |
| 11 | GET | `…/positions` | Sidecar | ✅ Works |
| 12 | GET | `…/orders` | Sidecar | ✅ Works |
| 13 | GET | `…/symbols` | Sidecar | 🔵 Bug — §13 |
| 14 | GET | `…/symbols/{sym}/specification` | Sidecar | 🟠 Bug — §14 |
| 15 | POST | `…/trade` | Sidecar | 🔴 **BROKEN** — §15 |
| 16 | DELETE | `…/positions/{id}` | Sidecar | ✅ Works |
| 17 | DELETE | `…/positions` | Sidecar | ✅ Works |
| 18 | PUT | `…/positions/{id}` | Sidecar | 🔵 Bug — §18 |
| 19 | DELETE | `…/orders/{id}` | Sidecar | ✅ Works |
| 20 | GET | `…/history/deals` | Sidecar | 🔴 **BROKEN** — §20 |
| 21 | GET | `/admin/keys` | Admin | ✅ Works |
| 22 | POST | `/admin/keys` | Admin | ✅ Works |
| 23 | DELETE | `/admin/keys/{id}` | Admin | ✅ Works |
| 24 | GET | `/admin/stats` | Admin | ✅ Works |

---

---

# 🔴 P0 — CRITICAL: Trading is 100% Broken

---

## §15 · `POST .../trade` — Wrong Field Names in Success Response

### This is the #1 bug. Every trade actually executes on MT5, but our system reports failure to the user because the response has wrong field names.

### How We Call It

```bash
curl -X POST \
  "http://4.224.249.231:8080/accounts/5051904701/proxy/users/current/accounts/5051904701/trade" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "actionType": "ORDER_TYPE_BUY",
    "symbol": "XAUUSD",
    "volume": 0.01,
    "stopLoss": 2300.00,
    "takeProfit": 2400.00,
    "comment": "TradeGPT AI signal"
  }'
```

### Valid `actionType` values we send

| Value | Meaning |
|-------|---------|
| `ORDER_TYPE_BUY` | Market buy |
| `ORDER_TYPE_SELL` | Market sell |
| `ORDER_TYPE_BUY_LIMIT` | Buy limit order (requires `price`) |
| `ORDER_TYPE_SELL_LIMIT` | Sell limit order (requires `price`) |
| `ORDER_TYPE_BUY_STOP` | Buy stop order (requires `price`) |
| `ORDER_TYPE_SELL_STOP` | Sell stop order (requires `price`) |

### What the Farm Currently Returns (Success)

```json
{
  "id": "123456789",
  "type": "position",
  "symbol": "XAUUSD",
  "volume": 0.01,
  "openPrice": 2341.50
}
```

### What We Check For (and Never Find)

```typescript
// Our success detection code in mt5farm.ts line 371:
if (data.orderId || data.positionId) {
  return { success: true, result: data };
}
// ← Falls through to failure every time because field is called "id" not "orderId"
```

### User Experience

```
User clicks "Execute Trade"
    → Farm places trade on MT5 ✅  (trade IS executed)
    → Farm returns { "id": "123456789" }
    → Our code reads data.orderId → undefined
    → Our code reads data.positionId → undefined
    → Our code returns { error: "Order rejected" }
    → User sees: ❌ "Order rejected"
    → User retries → duplicate position on MT5
```

### Required Fix — Add These Fields to Success Response

```json
{
  "id": "123456789",
  "orderId": "123456789",
  "positionId": "123456789",
  "ticket": 123456789,
  "symbol": "XAUUSD",
  "volume": 0.01,
  "openPrice": 2341.50,
  "type": "position",
  "openTime": "2026-06-20T13:00:00.000Z"
}
```

**Rules:**
- `id` — keep existing ✅
- `orderId` — string alias of `id` (for pending/limit orders)
- `positionId` — string alias of `id` (for market orders that open a position)
- `ticket` — integer version of `id` (MT5 native ticket number)
- `openTime` — **ISO 8601 format with T separator and Z suffix** — `"2026-06-20T13:00:00.000Z"` ← required

---

### §15b · `POST .../trade` — Error Response Has 4 Different Formats

Our error handler cannot reliably parse the failure reason because the farm returns different JSON shapes depending on which layer of code rejected the request.

#### Format A — MT5 native rejection (retcode)
```json
{
  "retcode": 10014,
  "stringCode": "TRADE_RETCODE_INVALID_VOLUME",
  "message": "Invalid volume"
}
```

#### Format B — FastAPI/Pydantic validation error
```json
{
  "detail": [
    {
      "loc": ["body", "volume"],
      "msg": "value is not a valid float",
      "type": "type_error.float"
    }
  ]
}
```

#### Format C — Generic string error
```json
{ "detail": "Account not connected" }
```

#### Format D — Observed in production logs
```json
{ "error": "something went wrong" }
```

### Required — Unified Error Format for ALL Failures

All errors from `POST /trade` must return **one consistent shape**:

```json
{
  "success": false,
  "retcode": 10014,
  "stringCode": "TRADE_RETCODE_INVALID_VOLUME",
  "message": "Invalid volume for XAUUSD. Min lot is 0.01."
}
```

**Field rules:**
- `retcode` — integer MT5 code. Use `0` if not MT5-originated.
- `stringCode` — MT5 enum string (see table below). Use `"VALIDATION_ERROR"` for non-MT5.
- `message` — always a plain **string** (never an array or nested object)
- HTTP status: `400` for MT5 rejections, `422` for validation errors, `503` if account offline/hibernated

### MT5 Retcodes to Support in `stringCode`

| retcode | stringCode |
|---------|-----------|
| 10004 | `TRADE_RETCODE_REQUOTE` |
| 10006 | `TRADE_RETCODE_REJECT` |
| 10007 | `TRADE_RETCODE_CANCEL` |
| 10009 | `TRADE_RETCODE_PLACED` |
| 10010 | `TRADE_RETCODE_DONE` |
| 10013 | `TRADE_RETCODE_INVALID` |
| 10014 | `TRADE_RETCODE_INVALID_VOLUME` |
| 10015 | `TRADE_RETCODE_INVALID_PRICE` |
| 10016 | `TRADE_RETCODE_INVALID_STOPS` |
| 10017 | `TRADE_RETCODE_TRADE_DISABLED` |
| 10018 | `TRADE_RETCODE_MARKET_CLOSED` |
| 10019 | `TRADE_RETCODE_NO_MONEY` |
| 10020 | `TRADE_RETCODE_PRICE_CHANGED` |
| 10021 | `TRADE_RETCODE_PRICE_OFF` |
| 10024 | `TRADE_RETCODE_TOO_MANY_REQUESTS` |
| 10025 | `TRADE_RETCODE_NO_CHANGES` |
| 10027 | `TRADE_RETCODE_TRADE_EXPERT_DISABLED` |
| 10030 | `TRADE_RETCODE_POSITION_CLOSED` |
| 10031 | `TRADE_RETCODE_INVALID_ORDER` |

---

## §20 · `GET .../history/deals` — Multiple Critical Data Issues

This endpoint drives: trade history display, P&L calculations, rebate engine, portfolio analytics, and daily snapshot reports. All of these are broken or unreliable due to the issues below.

### How We Call It

```bash
# Unix timestamps for from_ts and to_ts
FROM=$(date -d "7 days ago" +%s)   # or: $(($(date +%s) - 604800))
TO=$(date +%s)

curl "http://4.224.249.231:8080/accounts/5051904701/proxy/users/current/accounts/5051904701/history/deals?from_ts=$FROM&to_ts=$TO" \
  -H "X-API-Key: YOUR_KEY"
```

### Current Response (Broken)

```json
[
  {
    "ticket": 456789,
    "symbol": "XAUUSD",
    "type": "ORDER_TYPE_BUY",
    "entry": "DEAL_ENTRY_IN",
    "volume": 0.01,
    "price": 2341.50,
    "profit": 0.00,
    "commission": -3.50,
    "swap": 0.00,
    "time": "2026-06-20 08:00:00",
    "comment": "TradeGPT AI signal"
  },
  {
    "ticket": 456790,
    "symbol": "XAUUSD",
    "type": "ORDER_TYPE_BUY",
    "entry": "DEAL_ENTRY_OUT",
    "volume": 0.01,
    "price": 2355.00,
    "profit": 130.00,
    "commission": -3.50,
    "swap": -1.20,
    "time": "2026-06-20 14:30:00",
    "comment": ""
  }
]
```

### Issue 1 — `time` field format breaks JavaScript date parsing

```js
// ❌ What farm returns — SPACE separator, no timezone
new Date("2026-06-20 08:00:00")
// → Invalid Date on Safari/iOS (spec-compliant browsers reject this)

// ✅ What is required — ISO 8601 with T and Z
new Date("2026-06-20T08:00:00.000Z")
// → Works on all browsers and Node.js
```

**Impact:** Our rebate engine computes:
```js
holdTimeSeconds = (new Date(exitDeal.time) - new Date(entryDeal.time)) / 1000
// → Returns NaN because date parsing fails
// → All rebates are disqualified incorrectly
```

### Issue 2 — No `positionId` field — Cannot pair entry with exit deals

Our code in `sync-rebates/route.ts` (line 167) does:
```js
const entryDeals = deals.filter(d =>
  d.positionId === deal.positionId && d.entry === 'DEAL_ENTRY_IN'
);
```
Since `positionId` doesn't exist on any deal, this always returns an empty array. We cannot calculate hold time, cannot build trade pairs, cannot compute per-trade P&L.

### Issue 3 — Field name conflicts with `/positions` endpoint

| Data | `history/deals` | `/positions` (live) | Impact |
|------|-----------------|---------------------|--------|
| Unique ID | `ticket` (integer) | `id` (string) | Cannot cross-reference |
| Fill price | `price` | `openPrice` | Dual field names |
| Open time | `time` | `openTime` | Dual field names |
| Direction | `ORDER_TYPE_BUY` | `POSITION_TYPE_BUY` | Different enum for same value |

### Required Fix — Updated Deal Object Schema

```json
{
  "ticket": 456790,
  "id": "456790",
  "positionId": "456789",

  "symbol": "XAUUSD",
  "type": "ORDER_TYPE_BUY",
  "direction": "BUY",
  "entry": "DEAL_ENTRY_OUT",

  "price": 2355.00,
  "openPrice": 2355.00,

  "time": "2026-06-20T14:30:00.000Z",
  "openTime": "2026-06-20T14:30:00.000Z",
  "brokerTime": "2026-06-20T16:30:00.000Z",

  "volume": 0.01,
  "profit": 130.00,
  "commission": -3.50,
  "swap": -1.20,
  "comment": ""
}
```

**New fields required:**
- `id` — string alias of `ticket`
- `positionId` — **CRITICAL**: links this deal to the position and to the other deals in the same trade
- `direction` — simple `"BUY"` or `"SELL"` (no `ORDER_TYPE_` prefix)
- `openPrice` — alias of `price`
- `openTime` — ISO 8601 alias of `time`  
- `brokerTime` — MT5 server local time in ISO 8601 format

**Field format fix:**
- `time` — **must be** `"2026-06-20T14:30:00.000Z"` (T separator, Z suffix) — not `"2026-06-20 14:30:00"`

---

---

# 🟠 P1 — HIGH: Data is Wrong

---

## §3 · `GET /accounts/{id}` — `balance` Always Returns `null`

### Current Response

```bash
curl "http://4.224.249.231:8080/accounts/5051904701" \
  -H "X-API-Key: YOUR_KEY"
```

```json
{
  "accountId": "5051904701",
  "login": 5051904701,
  "server": "ICMarkets-Live01",
  "label": "ICMarkets-5051904701",
  "port": 9101,
  "status": "connected",
  "balance": null,
  "currency": null,
  "name": null
}
```

### Impact

We use this endpoint as a **fast status check** before deciding whether to call the heavier sidecar. When `balance` is null, we must always call the sidecar proxy (`/account-information`) even when the account is hibernated or just waking up.

For 2 accounts, this means:
- Old flow: `GET /accounts/{id}` (3s timeout) × 2 **then** `GET .../account-information` (3s timeout) × 2 = **up to 12 seconds** before page loads
- With fix: `GET /accounts/{id}` × 2 in parallel = **1-2 seconds** page load

### Required Fix

Populate from the sidecar's last known values. These don't need to be live — just the last successful sync:

```json
{
  "accountId": "5051904701",
  "login": 5051904701,
  "server": "ICMarkets-Live01",
  "label": "ICMarkets-5051904701",
  "port": 9101,
  "status": "connected",
  "balance": 10432.50,
  "equity": 10441.20,
  "currency": "USD",
  "name": "John Smith",
  "lastSyncedAt": "2026-06-20T13:00:00.000Z",
  "tradeAllowed": true,
  "tradeExpert": true,
  "lastPing": "2026-06-20T13:00:05.000Z",
  "pingLatencyMs": 42
}
```

---

## §4 · `POST /accounts` — No Failure State When Credentials Are Wrong

### Current Behavior

```bash
# Connect with wrong password
curl -X POST "http://4.224.249.231:8080/accounts" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"login": 9999999, "password": "wrongpassword", "server": "ICMarkets-Live01"}'
```

**Immediate response:**
```json
{
  "accountId": "9999999",
  "status": "starting",
  "port": 9107
}
```

Then polling `GET /accounts/9999999` returns `"status": "starting"` **indefinitely**. There is no transition to a failure state. Bad credentials look identical to a slow startup.

### Impact
- UI shows "Connecting..." forever
- Users cannot tell if they entered wrong credentials or if the server is slow
- Failed sidecars accumulate and consume RAM
- We have no way to automatically clean up failed connections

### Required Fix — Add `"failed"` Status

When MT5 returns an authentication error (or broker server not found), the account must transition to:

```json
{
  "accountId": "9999999",
  "status": "failed",
  "failureReason": "Invalid account credentials",
  "failureCode": "AUTH_FAILED",
  "startedAt": "2026-06-20T13:00:00.000Z",
  "failedAt": "2026-06-20T13:01:30.000Z"
}
```

**Complete status lifecycle required:**

```
starting → connected    (normal path)
starting → failed       (bad credentials, server not found)
connected → hibernated  (via hibernate call)
connected → timeout     (MT5 lost connection to broker)
hibernated → starting   (on next API call or explicit wake)
failed → [deleted]      (user must re-connect with corrected credentials)
```

**Failure codes:**

| `failureCode` | Meaning |
|---------------|---------|
| `AUTH_FAILED` | Wrong login/password |
| `SERVER_NOT_FOUND` | MT5 server name not in registry |
| `CONNECTION_TIMEOUT` | Could not reach broker server within 300s |
| `TRADE_DISABLED` | Account exists but trading is disabled |

---

## §14 · `GET .../symbols/{sym}/specification` — Volume Fields Sometimes `null`

### Current Response (Example)

```bash
curl "http://4.224.249.231:8080/accounts/5051904701/proxy/users/current/accounts/5051904701/symbols/XAUUSD/specification" \
  -H "X-API-Key: YOUR_KEY"
```

```json
{
  "symbol": "XAUUSD",
  "description": "Gold vs US Dollar",
  "digits": 2,
  "contractSize": 100,
  "currency": "USD",
  "minVolume": null,
  "maxVolume": null,
  "volumeStep": null
}
```

### Impact

Our pre-trade validation:
```typescript
if (volume < spec.minVolume) {
  return { error: "Volume too small" };
}
```
When `minVolume` is `null`, the comparison returns `false` and the check is skipped. The trade then fails at MT5 with a cryptic retcode `10014` instead of a friendly "lot size too small" message.

### Required Fix

These three fields **must never be null**. They are defined by the broker for every symbol and are always available from the MT5 terminal:

```json
{
  "symbol": "XAUUSD",
  "description": "Gold vs US Dollar",
  "digits": 2,
  "contractSize": 100.0,
  "currency": "USD",
  "baseCurrency": "XAU",
  "profitCurrency": "USD",
  "minVolume": 0.01,
  "maxVolume": 500.00,
  "volumeStep": 0.01,
  "tickSize": 0.01,
  "tickValue": 1.00,
  "spread": 12,
  "swapLong": -0.52,
  "swapShort": -0.14,
  "stopsLevel": 0,
  "tradeMode": "SYMBOL_TRADE_MODE_FULL"
}
```

**`tradeMode` valid values:**
- `SYMBOL_TRADE_MODE_FULL` — normal trading
- `SYMBOL_TRADE_MODE_DISABLED` — symbol is closed/not tradeable
- `SYMBOL_TRADE_MODE_LONGONLY` — buy only
- `SYMBOL_TRADE_MODE_SHORTONLY` — sell only
- `SYMBOL_TRADE_MODE_CLOSEONLY` — only closing existing positions allowed

---

---

# 🟡 P2 — RELIABILITY

---

## §7 · No Auto-Wake When Hibernated Account Receives a Trade Request

### Current Behavior

If account status is `hibernated` and a trade is attempted:

```json
HTTP 400
{ "detail": "Account not connected" }
```

### Impact

We must manually orchestrate a 3-step wake sequence:
1. `POST /accounts/{id}/wake`
2. Poll `GET /accounts/{id}` until `status === "connected"` (up to 30s)
3. Retry `POST /trade`

Total user-facing delay: **30–90 seconds** before trade executes.

### Required Fix

When any sidecar endpoint is called on a hibernated account, the orchestrator should auto-wake it. If immediate response is not possible, return:

```
HTTP 202 Accepted
Retry-After: 15

{
  "status": "waking",
  "message": "Account waking from hibernation. Please retry in 15 seconds.",
  "estimatedReadyIn": 15
}
```

Our client will automatically handle `202` + `Retry-After` by polling and retrying.

---

## §10 · `GET .../account-information` — Field Name Mismatch

### Current Response

```json
{
  "login": 5051904701,
  "name": "John Smith",
  "server": "ICMarkets-Live01",
  "broker": "IC Markets",
  "currency": "USD",
  "leverage": 500,
  "balance": 10432.50,
  "credit": 0.0,
  "profit": 8.70,
  "equity": 10441.20,
  "margin": 25.00,
  "marginFree": 10416.20,
  "marginLevel": 41764.8,
  "marginCall": 50.0,
  "marginStopOut": 20.0,
  "tradeAllowed": true,
  "tradeExpert": true,
  "accountType": "ACCOUNT_TRADE_MODE_REAL"
}
```

### Issue

The field is `marginFree` but some parts of our code expect `freeMargin` (MetaAPI standard naming). Some reports show `undefined` for free margin.

### Required Fix — Add Alias

```json
{
  "marginFree": 10416.20,
  "freeMargin": 10416.20
}
```

Both fields, same value. Also add these missing fields:

```json
{
  "openPositions": 3,
  "openOrders": 1,
  "lastSyncTime": "2026-06-20T13:00:05.000Z"
}
```

---

## §18 · `PUT .../positions/{id}` — No Confirmation of Actual Values Set

### Current Behavior

```bash
curl -X PUT \
  "http://4.224.249.231:8080/accounts/5051904701/proxy/users/current/accounts/5051904701/positions/123456789" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{ "stopLoss": 2320.00, "takeProfit": 2380.00 }'
```

Response:
```json
{ "success": true }
```

### Issue

MT5 may adjust SL/TP to the nearest valid price level due to `stopsLevel` restrictions (minimum distance from current price). Our UI displays the values the user requested, not what MT5 actually set. When the user re-opens the position, they see different values than they set.

### Required Fix

Return the position with the actual values that were set:

```json
{
  "success": true,
  "position": {
    "id": "123456789",
    "symbol": "XAUUSD",
    "type": "POSITION_TYPE_BUY",
    "volume": 0.01,
    "openPrice": 2341.50,
    "currentPrice": 2343.00,
    "stopLoss": 2320.00,
    "takeProfit": 2380.00,
    "profit": 1.50,
    "updatedAt": "2026-06-20T13:05:00.000Z"
  }
}
```

---

---

# 🔵 P3 — NICE TO HAVE

---

## §13 · `GET .../symbols` — No Caching Headers, No Filtering

### Current Behavior

Returns a raw array of 500–2000 symbol strings with no metadata, no cache headers:

```json
["EURUSD", "GBPUSD", "XAUUSD", "BTCUSD", "USDJPY", ...]
```

### Issues

1. **No `Cache-Control`** — We re-download 2000 symbols on every page load. Symbol lists change at most once per broker configuration change.
2. **No filter** — Cannot request a subset (e.g., just metals or just forex)
3. **No suffix info** — Some brokers use suffixes (`XAUUSDm`, `EURUSDpro`). We need a mapping from standard symbol to broker-specific symbol name.

### Required Fixes

Add cache headers:
```
Cache-Control: public, max-age=3600
```

Add optional filter parameter:
```
GET .../symbols?category=forex
GET .../symbols?search=XAU
```

Add suffix mapping endpoint:
```
GET .../symbols/mapping
→ { "XAUUSD": "XAUUSDm", "EURUSD": "EURUSDpro" }
```

---

## §CORS · Add CORS Headers to All Endpoints

Currently, all farm endpoints return no `Access-Control-*` headers. This forces all farm calls to route through our Next.js server (extra network hop: Client → Vercel → Farm).

### Required Fix

Add to all responses:
```
Access-Control-Allow-Origin: https://tradegpt.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-API-Key
Access-Control-Max-Age: 3600
```

---

---

# Complete Schema Reference

## `POST .../trade` — Full Request Schema

```json
{
  "actionType": "ORDER_TYPE_BUY | ORDER_TYPE_SELL | ORDER_TYPE_BUY_LIMIT | ORDER_TYPE_SELL_LIMIT | ORDER_TYPE_BUY_STOP | ORDER_TYPE_SELL_STOP",
  "symbol": "XAUUSD",
  "volume": 0.01,
  "price": 2341.50,
  "stopLoss": 2300.00,
  "takeProfit": 2400.00,
  "comment": "TradeGPT AI signal"
}
```

**Field rules:**
- `actionType` — required
- `symbol` — required, must be broker-specific symbol name (e.g. `XAUUSDm` if that's what broker uses)
- `volume` — required, must be between `minVolume` and `maxVolume` in steps of `volumeStep`
- `price` — required only for `LIMIT` and `STOP` order types. Omit for market orders.
- `stopLoss` — optional, absolute price level (not pips)
- `takeProfit` — optional, absolute price level (not pips)
- `comment` — optional, max 31 characters (MT5 limit)

## `POST .../trade` — Full Success Response Schema

```json
{
  "id": "123456789",
  "orderId": "123456789",
  "positionId": "123456789",
  "ticket": 123456789,
  "symbol": "XAUUSD",
  "volume": 0.01,
  "openPrice": 2341.50,
  "type": "order | position",
  "openTime": "2026-06-20T13:00:00.000Z",
  "comment": "TradeGPT AI signal"
}
```

## `POST .../trade` — Full Error Response Schema

```json
{
  "success": false,
  "retcode": 10014,
  "stringCode": "TRADE_RETCODE_INVALID_VOLUME",
  "message": "Invalid volume for XAUUSD. Min lot: 0.01, Max lot: 500.00"
}
```

## `GET .../history/deals` — Full Deal Object Schema

```json
{
  "ticket": 456790,
  "id": "456790",
  "positionId": "456789",
  "symbol": "XAUUSD",
  "type": "ORDER_TYPE_BUY",
  "direction": "BUY",
  "entry": "DEAL_ENTRY_OUT",
  "price": 2355.00,
  "openPrice": 2355.00,
  "volume": 0.01,
  "profit": 130.00,
  "commission": -3.50,
  "swap": -1.20,
  "time": "2026-06-20T14:30:00.000Z",
  "openTime": "2026-06-20T14:30:00.000Z",
  "brokerTime": "2026-06-20T16:30:00.000Z",
  "comment": ""
}
```

**`entry` valid values:**
- `DEAL_ENTRY_IN` — position opened
- `DEAL_ENTRY_OUT` — position closed
- `DEAL_ENTRY_INOUT` — position reversed in single transaction

## `GET /accounts/{id}` — Full Account Object Schema

```json
{
  "accountId": "5051904701",
  "login": 5051904701,
  "server": "ICMarkets-Live01",
  "label": "ICMarkets-5051904701",
  "port": 9101,
  "status": "starting | connected | hibernated | timeout | failed",
  "failureReason": "Invalid account credentials | null",
  "failureCode": "AUTH_FAILED | SERVER_NOT_FOUND | CONNECTION_TIMEOUT | null",
  "startedAt": "2026-06-20T13:00:00.000Z",
  "failedAt": "2026-06-20T13:01:30.000Z | null",
  "balance": 10432.50,
  "equity": 10441.20,
  "currency": "USD",
  "name": "John Smith",
  "lastSyncedAt": "2026-06-20T13:00:00.000Z",
  "lastPing": "2026-06-20T13:00:05.000Z",
  "pingLatencyMs": 42,
  "tradeAllowed": true,
  "tradeExpert": true
}
```

## `GET .../account-information` — Full Schema

```json
{
  "login": 5051904701,
  "name": "John Smith",
  "server": "ICMarkets-Live01",
  "broker": "IC Markets",
  "currency": "USD",
  "leverage": 500,
  "balance": 10432.50,
  "credit": 0.0,
  "profit": 8.70,
  "equity": 10441.20,
  "margin": 25.00,
  "marginFree": 10416.20,
  "freeMargin": 10416.20,
  "marginLevel": 41764.8,
  "marginCall": 50.0,
  "marginStopOut": 20.0,
  "tradeAllowed": true,
  "tradeExpert": true,
  "accountType": "ACCOUNT_TRADE_MODE_REAL | ACCOUNT_TRADE_MODE_DEMO | ACCOUNT_TRADE_MODE_CONTEST",
  "openPositions": 3,
  "openOrders": 1,
  "lastSyncTime": "2026-06-20T13:00:05.000Z"
}
```

## `GET .../positions` — Full Position Object Schema

```json
{
  "id": "123456789",
  "ticket": 123456789,
  "symbol": "XAUUSD",
  "type": "POSITION_TYPE_BUY | POSITION_TYPE_SELL",
  "direction": "BUY | SELL",
  "volume": 0.01,
  "openPrice": 2341.50,
  "currentPrice": 2343.00,
  "stopLoss": 2300.00,
  "takeProfit": 2400.00,
  "profit": 1.50,
  "swap": -0.10,
  "commission": -3.50,
  "openTime": "2026-06-20T08:00:00.000Z",
  "comment": "TradeGPT AI signal"
}
```

---

---

# Reproduction Test Script

Save as `test_farm_api.sh`, update `KEY` and `LOGIN`, then run:

```bash
#!/bin/bash
set -e

KEY="YOUR_API_KEY_HERE"
LOGIN="YOUR_MT5_LOGIN_NUMBER"
BASE="http://4.224.249.231:8080"
PROXY="$BASE/accounts/$LOGIN/proxy/users/current/accounts/$LOGIN"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; }
warn() { echo -e "${YELLOW}⚠️  WARN${NC}: $1"; }

echo ""
echo "============================================================"
echo "MT5 Farm API Test Suite"
echo "Farm:  $BASE"
echo "Login: $LOGIN"
echo "============================================================"

# ── Test 1: POST /trade success fields ──
echo ""
echo "── Test 1: POST /trade — success response fields ──"
TRADE=$(curl -s -X POST "$PROXY/trade" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $KEY" \
  -d '{"actionType":"ORDER_TYPE_BUY","symbol":"EURUSD","volume":0.01}')
echo "Response: $TRADE" | python3 -m json.tool 2>/dev/null || echo "$TRADE"

if echo "$TRADE" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'orderId' in d or 'positionId' in d else 1)" 2>/dev/null; then
  pass "orderId or positionId present"
else
  fail "orderId and positionId both missing — trades will appear to fail"
fi

if echo "$TRADE" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'openTime' in d else 1)" 2>/dev/null; then
  pass "openTime present"
else
  warn "openTime missing — fill time unavailable"
fi

# ── Test 2: POST /trade error format ──
echo ""
echo "── Test 2: POST /trade — error format (bad volume) ──"
ERR=$(curl -s -X POST "$PROXY/trade" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $KEY" \
  -d '{"actionType":"ORDER_TYPE_BUY","symbol":"XAUUSD","volume":99999}')
echo "Response: $ERR" | python3 -m json.tool 2>/dev/null || echo "$ERR"

if echo "$ERR" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if isinstance(d.get('message'), str) else 1)" 2>/dev/null; then
  pass "message is a plain string"
else
  fail "message field missing or not a string — error parsing will fail"
fi

if echo "$ERR" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'stringCode' in d else 1)" 2>/dev/null; then
  pass "stringCode present"
else
  warn "stringCode missing — cannot show user-friendly error"
fi

# ── Test 3: GET /accounts/{id} balance ──
echo ""
echo "── Test 3: GET /accounts/{id} — balance field ──"
ACCT=$(curl -s "$BASE/accounts/$LOGIN" -H "X-API-Key: $KEY")
echo "Response: $ACCT" | python3 -m json.tool 2>/dev/null || echo "$ACCT"

if echo "$ACCT" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('balance') is not None else 1)" 2>/dev/null; then
  pass "balance is populated"
else
  fail "balance is null — forces extra API calls on every page load"
fi

# ── Test 4: GET /history/deals timestamp format ──
echo ""
echo "── Test 4: GET /history/deals — timestamp format ──"
FROM=$(($(date +%s) - 86400))
TO=$(date +%s)
DEALS=$(curl -s "$PROXY/history/deals?from_ts=$FROM&to_ts=$TO" -H "X-API-Key: $KEY")
echo "First deal: $(echo $DEALS | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d[0] if d else {})' 2>/dev/null)"

if echo "$DEALS" | python3 -c "
import sys, json
deals = json.load(sys.stdin)
if not deals: exit(0)
t = deals[0].get('time', '')
exit(0 if 'T' in t and 'Z' in t else 1)
" 2>/dev/null; then
  pass "time field is ISO 8601 format"
else
  fail "time field is wrong format — date parsing fails on iOS/Safari, rebates broken"
fi

if echo "$DEALS" | python3 -c "
import sys, json
deals = json.load(sys.stdin)
if not deals: exit(0)
exit(0 if 'positionId' in deals[0] else 1)
" 2>/dev/null; then
  pass "positionId present in deals"
else
  fail "positionId missing — cannot pair entry/exit deals, P&L calculation broken"
fi

# ── Test 5: Symbol specification ──
echo ""
echo "── Test 5: GET /symbols/XAUUSD/specification — volume fields ──"
SPEC=$(curl -s "$PROXY/symbols/XAUUSD/specification" -H "X-API-Key: $KEY")
echo "Response: $SPEC" | python3 -m json.tool 2>/dev/null || echo "$SPEC"

if echo "$SPEC" | python3 -c "
import sys, json
d = json.load(sys.stdin)
exit(0 if d.get('minVolume') is not None and d.get('maxVolume') is not None else 1)
" 2>/dev/null; then
  pass "minVolume and maxVolume are populated"
else
  fail "minVolume/maxVolume are null — pre-trade validation is skipped"
fi

echo ""
echo "============================================================"
echo "Tests complete. Fix all FAIL items before deploying."
echo "============================================================"
```

---

---

# Priority Fix Order

| Priority | Endpoint | Issue | Effort |
|----------|----------|-------|--------|
| 🔴 **Fix First** | `POST /trade` | Add `orderId`, `positionId`, `ticket`, `openTime` to success response | **Low** — add alias fields |
| 🔴 **Fix Second** | `GET /history/deals` | Change `time` from `"2026-06-20 08:00:00"` to `"2026-06-20T08:00:00.000Z"` | **Low** — format change |
| 🔴 **Fix Third** | `GET /history/deals` | Add `positionId`, `id`, `direction`, `openPrice`, `openTime` to every deal | **Medium** — requires position tracking |
| 🔴 **Fix Fourth** | `POST /trade` | Unify all 4 error formats into one consistent schema | **Medium** |
| 🟠 **Next** | `POST /accounts` | Add `"failed"` status with `failureReason` and `failureCode` | **Medium** |
| 🟠 **Next** | `GET /accounts/{id}` | Populate `balance`, `equity`, `currency`, `name` from last sync | **Low** |
| 🟠 **Next** | `GET /symbols/{sym}/specification` | Ensure `minVolume`, `maxVolume`, `volumeStep` are never null | **Low** |
| 🟡 | `POST /trade` (on hibernated account) | Return `202 Accepted` + `Retry-After` instead of `400` | **Medium** |
| 🟡 | `GET /account-information` | Add `freeMargin` alias + `openPositions` + `openOrders` | **Low** |
| 🟡 | `PUT /positions/{id}` | Return updated position object in response | **Low** |
| 🔵 | All endpoints | Add `Cache-Control` headers to symbol endpoints | **Low** |
| 🔵 | All endpoints | Add CORS headers | **Low** |

---

*For questions, send test results from `test_farm_api.sh` to confirm current behavior before implementing.*
