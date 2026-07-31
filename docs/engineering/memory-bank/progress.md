# Progress

What this covers: the honest state of every capability — what works, what is
partial, what is missing, and what is broken. Living checklists; update them in
the same change that moves an item. Consult this before promising anything to a
customer or estimating anything to a stakeholder.

Product-facing framing of the same gaps, with marketing-copy comparisons, is
[../10-product.md](../10-product.md) §9.

Legend: `[x]` works · `[~]` partial · `[ ]` missing.

---

## 1. Works

Implemented, reachable from the UI, and covered by tests or an E2E path.

### Platform and web

- [x] Marketing site — 24 pages, one `h1` each, canonical URLs, meta
      descriptions 50–160 chars, zero console errors (asserted in
      `apps/web/e2e/marketing-pages.spec.ts`).
- [x] SEO/AEO surface — sitemap with one entry per lesson, robots with 8 named
      AI crawlers, JSON-LD on every page, three OG image routes, `llms.txt` and
      `llms-full.txt` (`apps/web/e2e/seo-artifacts.spec.ts`).
- [x] PWA — manifest with 3 shortcuts, service worker `hp-v4` with page/media
      caches and an offline fallback, `/api/` bypassed entirely
      (`apps/web/public/sw.js`).
- [x] Theming — dark/light/system, cookie-persisted, correct on first paint,
      `theme-color` metas collapsed to one (`apps/web/e2e/theme.spec.ts`).
- [x] Responsive — every marketing route overflow-free across 12 widths
      320→1920; member shell across 6 routes × 12 widths
      (`apps/web/e2e/responsive.spec.ts`).
- [x] BFF — 40 route files / 48 handlers, zod-validated before any upstream
      call, typed error envelope, per-IP token buckets on the public POSTs.

### Early access

- [x] Two-step email verification — 6 digits, 900 s TTL, 5 attempts then burn,
      30 s resend cooldown. Only an address-bound HMAC is stored.
- [x] Queue position — serialised by `pg_advisory_xact_lock(42)`, derived on
      read as `max(1, base − floor(refs/3) × 25)`.
- [x] Not a membership oracle — the code endpoint's response is identical for a
      new and an existing address; only the email copy differs
      (`apps/services/growth/test/early-access.service.spec.ts:426`).
- [x] Duplicate join returns the existing position and emits no second event.
- [x] Signed status token; public counters (total / today / week).
- [x] Optional 4-field trader profile, updatable by re-verifying.

### Billing

- [x] Seat inventory — cap enforced in the UPDATE predicate. 600 checkouts
      against a cap of 500 yield exactly 500 orders and 100 × `410`
      (`apps/services/billing/test/seats.test.ts:53-72`).
- [x] NOWPayments invoice creation with a 10 s timeout; failure rolls the hold
      back and returns `502`.
- [x] IPN ingestion — HMAC-SHA512 over sorted-key canonical JSON, byte-exact
      replay returns `{ok:true,duplicate:true}`, forged signature `403`.
- [x] Monotonic status ladder; `finished` grants the seat exactly once
      (four independent layers, see [../04-features/billing.md](../04-features/billing.md)).
- [x] 120-minute hold sweeper, one statement, safe under multiple replicas.
- [x] Refund IPN releases a granted seat and emits `payment.refunded`.
- [x] Transactional outbox onto `hp.payment.events.v1`.

### Identity

- [x] scrypt passwords `N=2^15, r=8, p=1`, 32-byte salt, 64-byte key; unknown
      email verifies against a dummy hash so timing matches.
- [x] Opaque 32-byte session tokens; only `sha256(token)` persisted; 30-day TTL
      with 60 s-throttled sliding renewal.
- [x] Redeem → founding account, `409` on duplicate email, `401` on an invalid
      access code; per-IP and per-email rate limits.
- [x] Session list with a "current" marker and per-session revoke.
- [x] Password change revokes sibling sessions and keeps the current one.
- [x] Keyset-paginated personal audit log, scoped to the actor.
- [x] Founding-lounge chat — history + WebSocket fanout, 1 msg / 2 s and
      20 / min per user, oldest socket evicted at the connection cap.
- [x] Transactional outbox onto `hp.audit.log.v1` and `hp.identity.events.v1`.

### Academy

- [x] 10 levels / 31 lessons, content integrity checked at module init — a
      quiz-count mismatch or bad answer index fails the build, not the user.
- [x] Server-authoritative XP inside `tx` + `SELECT … FOR UPDATE`.
- [x] UTC streaks with the 50-point bonus cap; arcade daily cap; daily spin
      with a `409` on a second attempt.
- [x] Anonymous XP banking on 1 lesson, claimed idempotently per slug on first
      sync.
- [x] Referral — 250 XP to both sides, once ever, never self.
- [x] 11 certificate tracks with a completeness gate, idempotent issuance,
      unique `HP-XXXXX-XXXXX` code, public verification that always returns 200.
- [x] Leaderboard ordered `xp DESC, updated_at ASC`.
- [x] Capstone verified against real trading state, auto-completed exactly once.
- [x] Three nudge cadences from an hourly sweeper, PK-deduped per
      `(user, cadence, day)`.

### Lifecycle email

- [x] One dispatch choke point: suppression → 20 h frequency cap → render →
      SMTP → ledger → GA4.
- [x] 26 templates with a plain-text alternate, click-wrapped UTM links, open
      pixel, footer reason + risk disclaimer.
- [x] 3 journeys / 11 steps at 14:00 UTC, cancelled by their goal events, with
      per-step convert safety nets.
- [x] Weekly digest, once per ISO week, only when the prior week had signals.
- [x] Kafka consumer on 5 topics with a per-event try/catch so a poison message
      never stalls the lane.
- [x] `msg_sends` ledger with a unique `dedupe_key` making redelivery
      exactly-once.
- [x] Unsubscribe (RFC 8058 one-click, always 200), open pixel (always returns
      the GIF), click redirect (never dead-ends).
- [x] Log-only transport when `SMTP_URL` is unset — a safe default.

### Signal and trading

- [x] Deterministic simulated feed; same seed ⇒ identical candles ⇒ identical
      signals.
- [x] Feature pipeline and the `quant-ml-v1` scorer with a confidence gate and
      a spread-adjusted expectancy check.
- [x] Signal lifecycle FSM `active → expired | target_hit | stopped`.
- [x] Paper connection auto-provisioned at $10 000.00 on first touch.
- [x] AES-256-GCM credential storage; credentials never echoed in any response.
- [x] Market order execution with a mandatory idempotency key.
- [x] Three risk guards, evaluated in spec order; pure reduces always allowed.
- [x] Integer-cent PnL, equity curve, 30-day win rate, Sharpe and max drawdown.
- [x] Connection limits enforced against the package (`live_connections: 3`,
      `paper_accounts: 3`).

### Infrastructure and tooling

- [x] `scripts/preflight.mjs` — passes local, correctly rejects local values
      used as staging (asserted in CI, `ci.yml:118-129`).
- [x] `scripts/db.mjs` — applies five schemas, idempotent on re-run, hard-fails
      on an edited applied migration; run twice in CI to prove it.
- [x] `scripts/stack.mjs` — one wrapper across three environments, correct
      overlay/env-file/profile selection, health wait, migration apply.
- [x] `scripts/docs-check.mjs` — links, anchors, `path:line` citations, mermaid
      blocks, document structure; runs in CI.
- [x] Compose base with healthchecks on every container and mocks behind a
      profile; CI asserts staging and production start no mocks and publish no
      port except the Caddy edge.
- [x] Caddy edge routes `/v1/chat/ws` to identity-svc and everything else to
      Next.js; both files pass `caddy validate`.
- [x] `secret-scan` and `brand-guard` gate every CI run.

---

## 2. Partial

Works, but not as far as the surface implies.

- [~] **Trade Guard** — 3 of the 9 advertised controls
      (`GUARD_MAX_RISK_PCT 2`, `GUARD_MAX_OPEN_POSITIONS 5`,
      `GUARD_DAILY_LOSS_LIMIT_PCT 5`, `apps/services/trading/src/pnl/engine.ts:39-42`).
      All are module constants — there is no per-user configuration surface, so
      the `guard_rules: 20` entitlement has nothing to count. Missing: max
      drawdown, exposure cap, news filter, session window, symbol allowlist,
      prop-firm presets.
- [~] **Market data** — the default source is a seeded GBM simulator identified
      as `institutional-composite-sim`
      (`apps/services/signal/src/market/sim.source.ts:5`). `SOURCE=binance`
      switches to public Binance REST, which covers crypto only; FX and metals
      have no live source. REST only, no WebSocket.
- [~] **`quant-ml-v1`** — a four-weight logistic function with fixed literal
      weights (`apps/services/signal/src/quant/model.ts:22-27`). No training
      pipeline, no dataset, no model artifact, no versioning beyond the string.
- [~] **Broker connections** — creation, validation and encrypted storage work;
      execution does not. Live adapters explicitly never call a broker
      (`apps/services/trading/src/brokers/adapters.ts:4-6`).
- [~] **Refunds** — billing reacts correctly to a `refunded` IPN, but there is
      no refund-initiation endpoint and no 14-day clock is tracked anywhere.
      Refunding is an out-of-band manual operation.
- [~] **Launch mode** — `prelaunch`/`main` flip three CTAs in one file;
      `maintenance` is declared in the enum and handled nowhere. The
      `launch_mode_forbidden` error code is never thrown.
- [~] **Entitlements** — `live_connections` and `paper_accounts` are enforced;
      `signals_per_day` and `guard_rules` are rendered on `/app/packages` and
      read by nothing.
- [~] **Test coverage** — deep on billing, identity, growth academy and
      messaging; **zero** on `packages/contracts` and `packages/ui`; one vitest
      file in `apps/web`. `OutboxRelay`, `HoldsJob` and the Pg repositories
      against a real database are untested — every concurrency claim rests on
      the SQL predicate, not on an executed race.
- [~] **Service linting** — all five services define `lint: echo ok`. CI runs
      `pnpm lint`, but only `apps/web` has a real linter behind it.

---

## 3. Built but unreachable

Complete, tested subsystems with no caller. Distinct from "missing" — the code
exists and works; nothing invokes it.

- [ ] **Multi-level referral tree.** `POST /v1/referrals/link` and
      `POST /v1/referrals/attribute` are implemented, guarded against self-links
      and cycles, idempotent on `(order_id, beneficiary_id, level)`, and covered
      by a 355-line suite. **Nothing in `apps/web` or any service calls them** —
      verified by grep. The tree is never populated, no commission has ever
      accrued, and `POST /v1/referrals/reverse` therefore has nothing to
      reverse. Blocked on a product decision about where the link is created.
- [ ] **`ltd_seats.checksum`.** Declared in DDL and Drizzle, never read or
      written. There is no job reconciling `granted`/`held` against `orders`.
- [ ] **`getUserById`** in the identity repository — implemented, zero callers.
- [ ] **`journeys.cancelOn`** — declared on every journey definition and never
      read; cancellation is hardcoded in the service handlers.

---

## 4. Missing

Never implemented.

### Product

- [ ] Live broker execution against MT5, Binance or KuCoin.
- [ ] The unified exchange API and the "30+ exchanges" it would add.
- [ ] Execution modes — Notify / Confirm / Full-auto. No mode field, no consent
      record, no unattended execution.
- [ ] Withdrawal-permission introspection on submitted API keys.
- [ ] Six of the nine advertised Trade Guard controls; any guard configuration
      UI or storage.
- [ ] Recurring subscription billing — no plan table, no plan change, no
      renewal, no proration. Billing knows one SKU.
- [ ] Refund initiation and the 14-day refund clock.
- [ ] Commission payouts, in crypto or otherwise. No payout code exists.
- [ ] A double-entry commission ledger. `referral_commissions` is single-entry
      accrual with a status column.
- [ ] Affiliate partner portal, approval workflow, dashboard, or link
      attribution to a marketer.
- [ ] Live workshops and Hero Council — no scheduling, calendar, entitlement
      store, attendance or delivery. The UI derives its state purely from lesson
      completions.
- [ ] Ambassador programme, regional leaders, competitions, mentorship.
- [ ] The Capital pillar — correctly described as future in the copy.
- [ ] Backtesting, the AI trade journal, and the trading reputation score.
- [ ] Admin surface of any kind beyond `PATCH /v1/referrals/config`.

### Platform

- [ ] Any compiled build for the services. Everything runs through `tsx`.
- [ ] Fetch timeouts in `apps/web` — no `AbortSignal` anywhere.
- [ ] Shared/distributed rate limiting. Every bucket is per-process, in-memory.
- [ ] An init process in any container; PID 1 is `node` or the tsx shim.
- [ ] Metrics, tracing, or structured logging. `pino` is a declared but unused
      dependency in four services; all logging is `console.*`.
- [ ] `HEALTHCHECK` instructions in the Dockerfiles (compose supplies them
      instead, which covers the compose deployment only).
- [ ] Image scanning, SBOM generation, or signing in CI.
- [ ] Topic pre-creation with explicit partitioning; topics auto-create at RF=1.

---

## 5. Known issues

Real defects and hazards found while reading the source. Each is reproducible
from the citation.

### Correctness — money and entitlement

| # | Issue | Impact |
|---|---|---|
| K1 | `expired`, `failed` and `finished` all have rank 4 and the gate is strictly `>` (`packages/contracts/src/index.ts:195-198`, `apps/services/billing/src/ipn/ipn.service.ts:61`). | Once the sweeper marks an order `expired`, a genuinely `finished` payment can never advance it. Money in, no seat, `200 {ok:true,ignored:true}`, no alert. |
| K2 | `verifyPurchase` accepts `confirmed` (rank 2) as well as `finished` (`apps/services/billing/src/founding/founding.service.ts:213`). | Identity can create a lifetime founding account before payment finality, while the seat is still merely `held`. A later expiry sweep releases the seat without revoking the account. |
| K3 | `apply('finished')` on a `released` seat marks the order finished but never re-grants a seat (`apps/services/billing/src/ipn/ipn.service.ts:97`). | Reachable via a 10 s invoice-create timeout that fires after the provider actually created the invoice. Entitlement without a counted seat. |
| K4 | Repo booleans from `grantSeat` / `releaseHold` / `refundRelease` are discarded (`ipn.service.ts:95,107,119-123`). | A lost concurrency race produces no log, no metric, and a cheerful 200. |
| K5 | Invoice-failure rollback passes an empty patch, leaving `(waiting, released)` (`apps/services/billing/src/founding/founding.service.ts:93`). | `/founding/status` shows the order as pending forever. |
| K6 | `insertIpnEvent` commits outside the `apply()` transaction (`apps/services/billing/src/db/repo.ts:232-244`). | A crash in between permanently loses that transition; the provider's retry is treated as a duplicate and 200s. |
| K7 | An unknown `package_sku` silently resolves to the founding package (`apps/services/identity/src/me/me.service.ts:84-87`). | Fails open on entitlement. |

### Security

| # | Issue | Impact |
|---|---|---|
| K8 | Billing status tokens have no `exp`, `iat` or nonce (`apps/services/billing/src/common/token.ts:8-12`). | Valid forever, and they travel through the NOWPayments `success_url` redirect chain and browser history. |
| K9 | `STATUS_TOKEN_SECRET` is shared between billing and growth. | Rotating it invalidates both services' links simultaneously; either service accepts anything the other signed. |
| K10 | `POST /v1/founding/verify` has no authentication of any kind (`apps/services/billing/src/founding/verify.controller.ts:9`). | Knowing `(email, order_id)` confirms a purchase. Order ids are only 48 bits. Mitigated only by the service not being internet-exposed. |
| K11 | `ipn_events.sig_valid` is hardcoded `true` (`apps/services/billing/src/ipn/ipn.service.ts:43`). | Forged-IPN attempts leave no persisted audit trail. |
| K12 | Keyset cursors are unsigned (`apps/services/identity/src/common/cursor.ts`). | A client can forge a `(timestamp, id)` pair; contained today only by the ownership predicate on every query. |
| K13 | Chat message bodies are stored raw and unescaped (`apps/services/identity/src/chat/chat.service.ts:57`). | Escaping is entirely the renderer's responsibility. |
| K14 | Rate limits are per-process and keyed on the first `x-forwarded-for` hop. | Spoofable unless the proxy is trusted; reset on every deploy; weakened linearly by replicas. |
| K15 | The NOWPayments mock checks `x-api-key` for presence, not value, and its `invoice_url` is hardcoded to `localhost` (`infra/mocks/nowpayments/src/server.mjs:254-257,290`). | Dev-only by intent; nothing in the image marks it as such beyond a comment. It is kept behind the `mocks` profile and CI asserts staging/production never start it. |

### Data and correctness — other

| # | Issue | Impact |
|---|---|---|
| K16 | signal-svc writes outbox rows **outside** the transaction that changes signal state; its repo has no transaction seam at all. | Violates the transactional-outbox invariant. A crash can drop or duplicate a signal event relative to state. |
| K17 | The one-active-signal-per-symbol invariant is a read-then-insert with no `ON CONFLICT`. | The partial unique index is a backstop that rejects the whole tick on a race. |
| K18 | Every per-level certificate email is titled "Hero Trader" — `track` is mapped through a two-branch ternary predating the per-level refactor (`apps/services/growth/src/messaging/messaging.service.ts:301`). | Customer-visible wrong content on a transactional email. Low effort to fix. |
| K19 | `dueJourneys` selects without row locking (`apps/services/growth/src/messaging/messaging.repo.ts:255-268`). | Two sweepers could pick the same step; the `dedupe_key` unique index prevents a double send, so the impact is wasted work, not a duplicate email. |
| K20 | Billing timestamps come from the app clock (`new Date()`), not `now()` (`apps/services/billing/src/db/repo.ts:161`). | `updated_at` reflects node clock skew, not database time. |
| K21 | `expireHolds` has no `LIMIT` (`apps/services/billing/src/db/repo.ts:249-259`). | One statement releases every expired hold in a single transaction; bounded in practice only by the 500-seat cap. |
| K22 | `/api/app/pnl/equity` drops the `points` parameter while the dashboard page requests `?points=200` server-side. | Client refetches silently get a different series length than the SSR render. |
| K23 | Four of six workspace Dockerfiles omit workspace manifests their own comment says must be present. | Latent: it builds today because each `--filter …` closure does not reach the omitted packages. Breaks opaquely the moment one service depends on another. |
| K24 | `/academy/certificates` freezes `issuedAt` at build time. | Sample credentials show the deploy date. |
| K25 | `.gitignore` does not cover the alternate Next build dirs (`.next-build`, `.next-audit`, `.next-founder`, `.next-verify`). | Only `.dockerignore` and `secret-scan` know about them. |

---

## 6. If you fix one thing

Ranked by risk-weighted impact, for whoever picks this up next.

1. **K1 + K3** — an order can end with money in and no seat, silently. Add a
   reconciliation job over `orders` × `ltd_seats` and alert on the mismatch;
   that also gives `ltd_seats.checksum` a purpose.
2. **K2** — grant entitlement on `finished` only, or make the `confirmed` grant
   revocable.
3. **K4** — act on the repo booleans. A discarded `false` is a silent failure in
   the most important state machine in the system.
4. **K16** — give signal-svc a transaction seam like the other four services.
5. **K18** — one-line fix, wrong content in a customer's inbox today.
6. **Referral wiring** — the engine is done; decide where the link is created
   and connect it, or delete it. An unreachable subsystem is a liability.
