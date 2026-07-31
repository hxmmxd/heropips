# Feature documentation

One document per service or subsystem, each covering responsibility and boundaries, a module map, code-level feature walkthroughs, the data it owns, the events it produces and consumes, its configuration, its tests, and an explicit hazards section. Start here when you need to know *how a specific thing works*; start at [01-architecture.md](../01-architecture.md) when you need to know *how the pieces fit together*.

Deep behaviour lives in exactly one place. If a fact is not owned by the document you are reading, it links to the owner rather than restating it: table and index detail in [02-data-model.md](../02-data-model.md), cross-service sequences in [03-flows.md](../03-flows.md), HTTP contracts in [05-api-reference.md](../05-api-reference.md), threat model in [06-security.md](../06-security.md), containers and environments in [07-infrastructure.md](../07-infrastructure.md), day-2 procedures in [09-operations-runbook.md](../09-operations-runbook.md).

## Documents

| Document | Covers |
|---|---|
| [identity.md](./identity.md) | identity-svc (:4003) — accounts, scrypt password storage, opaque session tokens, `/v1/me` self-service, the append-only audit log, and the founding-lounge chat with its WebSocket fanout. |
| [billing.md](./billing.md) | billing-svc (:4002) — the flat **$499** Founding Hero lifetime deal: seat inventory, 120-minute holds, NOWPayments invoices, HMAC-SHA512 IPN ingestion, the `payment_status × seat_state` machine, and purchase verification for identity. |
| [growth-early-access.md](./growth-early-access.md) | growth-svc — the public waitlist: join, email verification, queue position, and single-level waitlist referrals with queue jumps. |
| [growth-referrals.md](./growth-referrals.md) | growth-svc — the multi-level referral closure tree, commission accrual and reversal, and the affiliate-facing endpoints. |
| [growth-academy.md](./growth-academy.md) | growth-svc — the gamified trading academy: 10 levels, the XP economy, lesson and quiz progression, certificates, and nudges. |
| [growth-messaging.md](./growth-messaging.md) | growth-svc — the email engine: the Kafka consumer, transactional versus lifecycle consent lanes, journeys, templates, the send ledger, scheduler, and unsubscribe. |
| [signal.md](./signal.md) | signal-svc (:4004) — the market data feed, the quant feature and model pipeline, and signal generation and resolution. |
| [trading.md](./trading.md) | trading-svc (:4005) — broker connections with AES-256-GCM credential encryption, paper and live order execution with guard rules, and position and PnL accounting. |
| [web.md](./web.md) | apps/web (:3000) — the Next.js App Router site, the BFF proxy layer, the `__Host-hp_session` cookie, middleware, SEO, and PWA behaviour. |
| [design-system.md](./design-system.md) | packages/ui — the CSS custom-property design tokens and the shared React primitives. |

## Capability map

Every product capability, the service that owns it, and the files that implement it. The **Document** column is where the code-level walkthrough lives.

### Purchase and access

| Capability | Service | Document | Implementing files |
|---|---|---|---|
| Seat inventory and remaining count | billing | [billing.md](./billing.md) | `apps/services/billing/src/founding/seats.controller.ts`, `apps/services/billing/src/founding/founding.service.ts:25-32`, `apps/services/billing/src/db/repo.ts:97-104` |
| Checkout, seat hold, crypto invoice | billing | [billing.md](./billing.md) | `apps/services/billing/src/founding/checkout.controller.ts`, `apps/services/billing/src/founding/founding.service.ts:34-111`, `apps/services/billing/src/nowpayments/client.ts` |
| Payment notification ingestion and the order state machine | billing | [billing.md](./billing.md) | `apps/services/billing/src/ipn/ipn.controller.ts`, `apps/services/billing/src/ipn/ipn.service.ts`, `apps/services/billing/src/ipn/signature.ts` |
| Hold expiry after 120 minutes | billing | [billing.md](./billing.md) | `apps/services/billing/src/founding/holds.job.ts`, `apps/services/billing/src/db/repo.ts:247-274` |
| Customer-facing order status page data | billing | [billing.md](./billing.md) | `apps/services/billing/src/founding/status.controller.ts`, `apps/services/billing/src/common/token.ts` |
| Purchase verification during account redemption | billing | [billing.md](./billing.md) | `apps/services/billing/src/founding/verify.controller.ts`, `apps/services/billing/src/founding/founding.service.ts:208-215` |
| Account creation from a purchase or an admin code | identity | [identity.md](./identity.md) | `apps/services/identity/src/auth/auth.controller.ts:10-14`, `apps/services/identity/src/auth/auth.service.ts:62-137`, `apps/services/identity/src/auth/billing-verify.client.ts` |
| Package entitlements and limits | identity | [identity.md](./identity.md) | `apps/services/identity/src/me/me.service.ts:84-87`, `packages/contracts/src/index.ts:662-670` |

### Identity and session

| Capability | Service | Document | Implementing files |
|---|---|---|---|
| Password hashing and verification (scrypt) | identity | [identity.md](./identity.md) | `apps/services/identity/src/common/crypto.ts:9-59` |
| Login and logout | identity | [identity.md](./identity.md) | `apps/services/identity/src/auth/auth.controller.ts:16-26`, `apps/services/identity/src/auth/auth.service.ts:139-160,203-208` |
| Token introspection — the platform-wide auth oracle | identity | [identity.md](./identity.md) | `apps/services/identity/src/auth/auth.service.ts:185-213`, consumed by `apps/web/lib/session.ts:38-51` |
| Session inventory and per-device revocation | identity | [identity.md](./identity.md) | `apps/services/identity/src/auth/sessions.controller.ts`, `apps/services/identity/src/auth/auth.service.ts:222-245` |
| Profile update and password change | identity | [identity.md](./identity.md) | `apps/services/identity/src/me/me.controller.ts`, `apps/services/identity/src/me/me.service.ts:34-63` |
| Personal audit trail with keyset paging | identity | [identity.md](./identity.md) | `apps/services/identity/src/me/me.service.ts:65-82`, `apps/services/identity/src/common/cursor.ts`, `apps/services/identity/src/db/repo.ts:206-227` |
| Audit writes for every mutation | identity | [identity.md](./identity.md) | `apps/services/identity/src/common/audit.ts`, `apps/services/identity/src/db/repo.ts:195-204` |
| Browser session cookie and the BFF bearer forward | web | [web.md](./web.md) | `apps/web/lib/session.ts:14-32`, `apps/web/app/api/app/_lib/proxy.ts` |

### Community

| Capability | Service | Document | Implementing files |
|---|---|---|---|
| Founding-lounge chat history and posting | identity | [identity.md](./identity.md) | `apps/services/identity/src/chat/chat.controller.ts`, `apps/services/identity/src/chat/chat.service.ts` |
| Realtime chat fanout over WebSocket | identity | [identity.md](./identity.md) | `apps/services/identity/src/chat/gateway.ts`, wired at `apps/services/identity/src/main.ts:33-37` |
| WebSocket edge routing (`/v1/chat/ws` bypasses Next.js) | infra | [07-infrastructure.md](../07-infrastructure.md) | `infra/compose/caddy/Caddyfile.production:69-81`, `infra/compose/caddy/Caddyfile.staging:47-58` |

### Growth

| Capability | Service | Document | Implementing files |
|---|---|---|---|
| Early-access waitlist join and email verification | growth | [growth-early-access.md](./growth-early-access.md) | `apps/services/growth/src/early-access/early-access.controller.ts`, `apps/services/growth/src/early-access/early-access.service.ts`, `apps/services/growth/src/common/verification.ts` |
| Queue position and referral-driven queue jumps | growth | [growth-early-access.md](./growth-early-access.md) | `apps/services/growth/src/common/position.ts`, `apps/services/growth/src/early-access/early-access.repo.ts` |
| Multi-level referral tree and commission accrual | growth | [growth-referrals.md](./growth-referrals.md) | `apps/services/growth/src/referrals/referrals.controller.ts`, `apps/services/growth/src/referrals/referrals.service.ts`, `apps/services/growth/src/referrals/referrals.repo.ts` |
| Affiliate-facing summaries | growth | [growth-referrals.md](./growth-referrals.md) | `apps/services/growth/src/affiliates/affiliates.controller.ts`, `apps/services/growth/src/affiliates/affiliates.service.ts` |
| Academy curriculum, XP economy and certificates | growth | [growth-academy.md](./growth-academy.md) | `apps/services/growth/src/academy/academy.controller.ts`, `apps/services/growth/src/academy/academy.service.ts`, `apps/services/growth/src/academy/xp.ts`, `packages/contracts/src/index.ts:672-` |
| Academy nudges | growth | [growth-academy.md](./growth-academy.md) | `apps/services/growth/src/academy/nudges.ts` |
| Transactional and lifecycle email, journeys, templates | growth | [growth-messaging.md](./growth-messaging.md) | `apps/services/growth/src/messaging/messaging.service.ts`, `apps/services/growth/src/messaging/journeys.ts`, `apps/services/growth/src/messaging/templates/library.ts`, `apps/services/growth/src/messaging/transport.ts` |
| Reacting to billing and identity events | growth | [growth-messaging.md](./growth-messaging.md) | `apps/services/growth/src/messaging/consumer.ts` |
| Scheduled sends and email analytics | growth | [growth-messaging.md](./growth-messaging.md) | `apps/services/growth/src/messaging/scheduler.ts`, `apps/services/growth/src/messaging/analytics.ts` |
| Unsubscribe and suppression | growth | [growth-messaging.md](./growth-messaging.md) | `apps/services/growth/src/messaging/messaging.controller.ts`, `apps/services/growth/src/messaging/messaging.repo.ts` |

### Trading platform

| Capability | Service | Document | Implementing files |
|---|---|---|---|
| Market quotes feed | signal | [signal.md](./signal.md) | `apps/services/signal/src/market/market.controller.ts`, `apps/services/signal/src/market/binance.source.ts`, `apps/services/signal/src/market/sim.source.ts` |
| Quant features and the signal model | signal | [signal.md](./signal.md) | `apps/services/signal/src/quant/features.ts`, `apps/services/signal/src/quant/model.ts` |
| Signal generation, listing and resolution | signal | [signal.md](./signal.md) | `apps/services/signal/src/signals/signals.controller.ts`, `apps/services/signal/src/signals/signals.service.ts`, `apps/services/signal/src/signals/signals.repo.ts` |
| Broker connections and credential encryption | trading | [trading.md](./trading.md) | `apps/services/trading/src/connections/connections.controller.ts`, `apps/services/trading/src/connections/connections.service.ts`, `apps/services/trading/src/common/crypto.ts`, `apps/services/trading/src/brokers/adapters.ts` |
| Order execution and guard rules | trading | [trading.md](./trading.md) | `apps/services/trading/src/exec/exec.controller.ts`, `apps/services/trading/src/exec/exec.service.ts` |
| Positions, marks, PnL and metrics | trading | [trading.md](./trading.md) | `apps/services/trading/src/pnl/pnl.controller.ts`, `apps/services/trading/src/pnl/engine.ts`, `apps/services/trading/src/pnl/marks.ts`, `apps/services/trading/src/pnl/metrics.ts` |
| Per-request session validation inside trading | trading | [trading.md](./trading.md) | `apps/services/trading/src/auth/introspect.ts` → identity `GET /v1/auth/introspect` |

### Web and presentation

| Capability | Service | Document | Implementing files |
|---|---|---|---|
| Marketing site, founding and pricing pages | web | [web.md](./web.md) | `apps/web/app/(marketing)/` |
| BFF proxy routes to every service | web | [web.md](./web.md) | `apps/web/app/api/`, `apps/web/app/api/_lib/bff.ts` |
| Design tokens and React primitives | packages/ui | [design-system.md](./design-system.md) | `packages/ui/` |
| The cross-service contract: schemas, error codes, topics, constants | packages/contracts | [01-architecture.md](../01-architecture.md) | `packages/contracts/src/index.ts` |

### Platform mechanics shared by every service

| Capability | Document | Implementing files |
|---|---|---|
| Transactional outbox and Kafka relay | per-service documents; overview in [01-architecture.md](../01-architecture.md) | `apps/services/identity/src/outbox/relay.ts`, `apps/services/billing/src/outbox/relay.ts`, `apps/services/growth/src/outbox/relay.ts`, `apps/services/signal/src/outbox/relay.ts`, `apps/services/trading/src/outbox/relay.ts` |
| Uniform `ApiError` responses via a global filter | per-service documents | `apps/services/identity/src/common/errors.ts`, `apps/services/billing/src/common/errors.ts`, `packages/contracts/src/index.ts:43-46` |
| Boot-time schema DDL, and the versioned schema that supersedes it | [07-infrastructure.md](../07-infrastructure.md) | `apps/services/*/src/db/migrate.ts`, `infra/sql/`, `scripts/db.mjs` |
| `GET /healthz` on every service | [09-operations-runbook.md](../09-operations-runbook.md) | `apps/services/identity/src/app.module.ts:20-26`, `apps/services/billing/src/app.module.ts:20-26` |

## Conventions used in these documents

- Citations are `path:line` against the repository root, so `scripts/docs-check.mjs` can verify that every referenced file exists and every line number is in range. A bare `` `:123` `` continues the file named in the immediately preceding citation.
- `[INFERENCE]` marks a statement derived from reasoning about the code rather than read directly from it — most often a claim about database or runtime behaviour the code relies on but does not itself express.
- Each document ends with a **Hazards and gaps** section listing real bugs, missing controls and operational traps, each with its impact and a concrete fix. Those sections are deliberately blunt; they are the highest-value part of these documents for anyone about to change this code.
