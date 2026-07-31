# Decisions

What this covers: the significant architectural decisions embodied in this
codebase, in ADR form — context, decision, consequences, status. These were
**inferred from the code and its comments**; there was no pre-existing ADR log,
so the "context" sections reconstruct the forces the code responds to. Where
that reconstruction is inference rather than something the source states, it is
marked `[INFERENCE]`.

Read after [progress.md](./progress.md). Consult before changing anything
structural — the reasoning is usually already here.

**Rule:** never edit an accepted ADR to change its decision. Add a new one and
mark the old `Superseded by ADR-NNN`.

| # | Decision | Status |
|---|---|---|
| [001](#adr-001--database-per-service) | Database per service | Accepted |
| [002](#adr-002--the-nextjs-bff-is-the-sole-ingress) | The Next.js BFF is the sole ingress | Accepted |
| [003](#adr-003--transactional-outbox-over-dual-writes) | Transactional outbox over dual writes | Accepted |
| [004](#adr-004--a-zod-contracts-package-as-the-cross-service-contract) | A zod contracts package as the cross-service contract | Accepted |
| [005](#adr-005--tsx-at-runtime-with-no-build-step) | `tsx` at runtime with no build step | Accepted, with reservations |
| [006](#adr-006--nestjs-module-factories-and-explicit-di-tokens) | NestJS module factories and explicit DI tokens | Accepted |
| [007](#adr-007--opaque-sessions-over-jwt) | Opaque sessions over JWT | Accepted |
| [008](#adr-008--crypto-payments-via-nowpayments) | Crypto payments via NOWPayments | Accepted |
| [009](#adr-009--integer-minor-units-for-money) | Integer minor units for money | Accepted |
| [010](#adr-010--a-closure-table-for-the-referral-tree) | A closure table for the referral tree | Accepted, unwired |
| [011](#adr-011--server-authoritative-academy-xp) | Server-authoritative academy XP | Accepted |
| [012](#adr-012--seat-inventory-enforced-in-a-sql-predicate) | Seat inventory enforced in a SQL predicate | Accepted |
| [013](#adr-013--boot-ddl-plus-a-versioned-sql-mirror) | Boot DDL plus a versioned SQL mirror | Accepted |
| [014](#adr-014--paper-execution-first-live-adapters-deferred) | Paper execution first, live adapters deferred | Accepted |
| [015](#adr-015--in-process-token-bucket-rate-limiting) | In-process token-bucket rate limiting | Accepted, temporary |

---

## ADR-001 — Database per service

**Status:** Accepted.

**Context.** Five NestJS services with genuinely separate domains: growth
(waitlist, referrals, academy, email), billing (orders and seats), identity
(accounts and sessions), signal (market data), trading (execution and PnL).
Their write patterns and schema-change cadences have nothing in common. A shared
schema would let any service read any other's tables, and the first time that
happened the service boundary would stop being real.

**Decision.** One logical database per service —
`hp_growth`, `hp_billing`, `hp_identity`, `hp_signal`, `hp_trading` — created by
`infra/sql/000_databases.sql`, all inside a single Postgres 16 instance. Each
service resolves `DATABASE_URL_<SERVICE> ?? DATABASE_URL ?? <local default>`
(e.g. `apps/services/growth/src/db/client.ts:5-8`) and holds its own `pg.Pool`
with `max: 10`. Cross-service reads happen over HTTP or Kafka, never over SQL.

**Consequences.**

- Positive: each service's boot DDL and migration file own exactly one schema. A
  bad migration blasts one domain. `scripts/db.mjs` can target one service with
  `--service`.
- Positive: the boundary is enforced by connectivity, not discipline.
- Negative: no cross-domain joins and no cross-domain transactions. Every
  multi-domain workflow is eventually consistent, which is what makes ADR-003
  mandatory.
- Negative: one Postgres process is still a single point of failure and a shared
  resource pool. Separation is logical, not physical.
- Negative: five schemas to migrate. `scripts/db.mjs` exists because doing that
  by hand is error-prone.

---

## ADR-002 — The Next.js BFF is the sole ingress

**Status:** Accepted.

**Context.** Five services plus a web app. Exposing services directly would mean
five CORS policies, five auth surfaces, five rate-limit stories and five places
a session cookie could be read.

**Decision.** Only `apps/web` is reachable from a browser. It fans out
server-side over the compose network. **No service registers CORS** — the
comment in `apps/services/growth/src/main.ts` states it is deliberate because the
BFF calls it server-side. In staging and production, Caddy is the only container
publishing a port, and CI asserts it (`.github/workflows/ci.yml:100-113`).

One deliberate exception: the founding-lounge WebSocket. Route handlers cannot
proxy a WebSocket, so the browser connects directly to identity-svc and the edge
routes `/v1/chat/ws` to `{$CHAT_UPSTREAM}` = `identity:4003`
(`infra/compose/docker-compose.production.yml:154-157`). `GET /api/app/chat/token`
is the only route that ever returns the raw bearer to JavaScript, and it
re-introspects first so an expired cookie cannot leak a live-looking token.

**Consequences.**

- Positive: one TLS termination, one CSP, one cookie surface, one place to add a
  rate limit or a WAF.
- Positive: session material never reaches the browser except for the WS token.
- Negative: every service call is a hop through Next, and `apps/web` has no
  fetch timeouts — a slow service stalls a worker (see
  [progress.md](./progress.md) K-list).
- Negative: two BFF auth models coexist (`/api/app/**` forwards the bearer;
  `/api/academy/**` injects identity into the body), which is a real footgun.
- Negative: the WS exception means the chat URL is baked into the CSP at build
  time, and staging's basic auth breaks the handshake by design.

---

## ADR-003 — Transactional outbox over dual writes

**Status:** Accepted.

**Context.** Given ADR-001, every cross-domain workflow is driven by Kafka
events: a payment finishing has to reach growth so an access-code email goes
out. The naive implementation writes the domain row, then publishes. That has
two failure modes and both are unacceptable for money: publish-then-crash
produces an event for a state that was rolled back; commit-then-crash loses the
event entirely.

**Decision.** Every service writes its domain row **and** an `outbox` row in one
transaction. A relay polls `WHERE sent_at IS NULL ORDER BY created_at` every 2 s
in batches of 100, publishes with an idempotent producer, then stamps `sent_at`
(`apps/services/growth/src/outbox/relay.ts:60-94`). Each `outbox` table gets a
partial index `WHERE sent_at IS NULL` that exactly matches the query.

**Consequences.**

- Positive: no event ever exists for a rolled-back state, and no committed state
  ever loses its event.
- Positive: Kafka being down is a non-event for HTTP. The relay warns at most
  once per 30 s and retries forever; rows accumulate.
- Negative: delivery is **at-least-once**. A crash between `send` and the
  `sent_at` update republishes, so every consumer must dedupe. Growth's
  messaging ledger does this with a unique `dedupe_key`.
- Negative: up to ~2 s of added latency on every event.
- Negative: unbounded `outbox` growth — nothing prunes sent rows.
- **Known violation:** signal-svc writes outbox rows outside its state
  transaction and has no transaction seam in its repo at all. That is a defect
  against this ADR, not an exemption.

---

## ADR-004 — A zod contracts package as the cross-service contract

**Status:** Accepted.

**Context.** Six deployables need to agree on request shapes, response shapes,
error codes, Kafka topic strings, event type names and business constants. The
alternatives were OpenAPI with generated clients (a build step and a codegen
pipeline), protobuf (a second IDL and a toolchain), or duplicated hand-written
types (guaranteed drift).

**Decision.** One package, `@heropips/contracts`, containing zod schemas that
are simultaneously the runtime validator and the TypeScript type — `z.infer` on
every schema, exported under the same name as the value. It also owns the six
topic strings, the eight event-name maps, the 31-code error catalogue, and every
shared business constant (`LTD`, `REFERRAL`, `SYMBOLS`, `ACADEMY_*`, `PACKAGES`).
Its only dependency is zod.

**Consequences.**

- Positive: one definition, validated at runtime and checked at compile time. A
  service cannot disagree with another about a shape without a typecheck
  failure.
- Positive: constants cannot drift. The web client's XP arithmetic and
  growth-svc's XP arithmetic import the same numbers, which the code comments
  call out explicitly (`apps/services/growth/src/academy/xp.ts:2-5`).
- Positive: no codegen, no build step, no schema registry.
- Negative: the package ships raw TypeScript (`main` → `./src/index.ts`), so
  only Next and `tsx` can consume it, and every service image must copy it in.
- Negative: it has **zero tests**. The `PAYMENT_STATUS_RANK` ladder, the
  `OrderReq` XOR refinement and the `ACADEMY_TRACK_LEVELS` type-assertion spread
  are covered by typecheck plus whatever the service suites reach transitively.
- Negative: any change is a change to all six deployables at once.

---

## ADR-005 — `tsx` at runtime with no build step

**Status:** **Accepted, with reservations.** This is the weakest decision in the
codebase and the one most likely to be revisited.

**Context.** `[INFERENCE]` Five services, one small team, an aggressive
pre-launch timeline. A real build stage per service means a second Docker stage,
a `dist` layout that keeps pnpm workspace symlinks valid, and a `--prod` install
— all of which is work that does not ship a feature.

**Decision.** Services run TypeScript directly: `dev` is `tsx watch src/main.ts`,
`start` and the container `CMD` are `tsx src/main.ts`. The `build` script is
`tsc -p tsconfig.build.json || echo build-noop`
(`apps/services/growth/package.json:9`) — it can never fail. `noEmit` differs per
service: billing and identity inherit `true`; growth, signal and trading set
`"noEmit": false` and do emit a `dist/` tree. **Nothing consumes it** —
`.dockerignore` excludes `**/dist` and every image `CMD` is `tsx src/main.ts`.

**Consequences.**

- Positive: one artifact layout, no build-output/source drift, `docker build` is
  just an install.
- Negative: the full dev dependency tree — tsx, vitest, typescript, drizzle-kit,
  `@swc/core`, every `@types/*` — ships in every production image, along with
  `*.spec.ts` files.
- Negative: a type error cannot fail `pnpm build`. `pnpm typecheck` is the only
  thing standing between a type error and main.
- Negative: cold start pays for transpilation; a syntax error surfaces at boot,
  not at build.
- Negative: esbuild emits no `design:paramtypes`, which forces ADR-006 on the
  entire codebase. This is the largest hidden cost.
- **Exit criteria:** a real build stage plus a `--prod` install would let images
  drop `tsx` entirely, shrink substantially, and let `build` be a genuine gate.
  It would also let ADR-006 be reconsidered.

---

## ADR-006 — NestJS module factories and explicit DI tokens

**Status:** Accepted. Forced by ADR-005.

**Context.** Nest's ergonomic DI reads constructor parameter types from
`design:paramtypes` metadata emitted by the TypeScript compiler. esbuild — which
`tsx` uses — does not emit it. Implicit constructor injection therefore resolves
nothing at runtime.

**Decision.** Two rules, applied without exception.

1. Every constructor parameter carries `@Inject(TOKEN)` with an explicit
   string or symbol token. The rationale is a literal comment on nearly every
   controller in the repo:
   `// Explicit token: tsx/esbuild does not emit decorator design:paramtypes metadata.`
2. Modules are **functions returning a class** —
   `createAppModule(deps: AppDeps): Type<unknown>`
   (`apps/services/billing/src/app.module.ts:40-75`) — with every provider wired
   through `useFactory` + `inject`.

**Consequences.**

- Positive: an accidental test seam turned out to be the best one in the repo.
  `AppDeps` lets a test boot the *real* HTTP stack — routing, filters, the
  raw-body parser — over an in-memory repository and a fake provider. That is
  how `billing/test/ipn.controller.test.ts` verifies HMAC handling end to end
  without a database.
- Positive: dependencies are visible at the wiring site rather than inferred.
- Negative: verbose. Every provider is ~6 lines instead of a decorator.
- Negative: a missing `@Inject` fails at runtime on first resolution, not at
  compile time.
- Negative: unfamiliar. Every new contributor writes an implicitly-injected
  constructor once.

---

## ADR-007 — Opaque sessions over JWT

**Status:** Accepted.

**Context.** Session tokens for a platform holding broker credentials. JWTs are
stateless and scale well, but revocation requires either a blocklist (which
reintroduces the database read JWTs were meant to avoid) or short TTLs with
refresh-token machinery.

**Decision.** A session token is 32 random bytes, base64url, opaque — 43
characters with no structure and no claims
(`apps/services/identity/src/common/crypto.ts:62-65`). Only `sha256(token)` is
persisted, in a uniquely-indexed column. TTL is 30 days with sliding renewal
throttled to one write per 60 s. It travels in an httpOnly, SameSite=Lax,
Secure-in-production cookie named `__Host-hp_session` with `maxAge` 2 592 000
(`apps/web/lib/session.ts:20-26`). Every request introspects via
`GET /v1/auth/introspect`.

**Consequences.**

- Positive: a database leak yields no usable credential — the stored value is a
  hash of a token nobody can reverse.
- Positive: revocation is immediate and real. Logout, per-session revoke, and
  "password change revokes siblings" all work with no blocklist.
- Positive: no signing key to rotate; no algorithm-confusion class of bug.
- Positive: `getSession()` is wrapped in React `cache()`, so N server components
  in one render share **one** introspect call.
- Negative: every authenticated request costs an indexed lookup and an HTTP hop.
- Negative: identity-svc availability gates the whole platform.
- Negative: `MeService`'s password change performs three separate autocommits
  with no transaction — a partial failure is possible.

---

## ADR-008 — Crypto payments via NOWPayments

**Status:** Accepted.

**Context.** `[INFERENCE]` A one-time high-ticket sale to a global,
crypto-native trading audience, pre-incorporation, with no card-processor
relationship and no chargeback appetite. Crypto is the buyer's expected rail and
sidesteps card underwriting entirely.

**Decision.** NOWPayments hosted invoices. `POST /v1/invoice` creates the
invoice; the buyer pays on the provider's page; inbound IPNs drive the order
state machine. IPNs are authenticated by HMAC-SHA512 over the sorted-key
canonical JSON of the raw body (`apps/services/billing/src/ipn/signature.ts:8-11`),
which is why Fastify is configured with a raw-body-capturing JSON parser
(`apps/services/billing/src/app.module.ts:81-102`) — dropping that flag 403s
every IPN. Out-of-order delivery is handled by the strictly-monotonic
`PAYMENT_STATUS_RANK` ladder; replay by a unique `(payment_id, payment_status)`
index. A zero-dependency local mock reproduces the provider's signature scheme
byte for byte so the whole flow runs offline
(`infra/mocks/nowpayments/src/server.mjs`).

**Consequences.**

- Positive: no card compliance surface, no chargebacks, global reach.
- Positive: the mock makes checkout fully testable offline and in E2E.
- Negative: crypto payments are asynchronous and can partially pay, which is why
  `partially_paid` sits at rank 2.5 and records amounts without advancing status.
- Negative: refunds are manual and out of band; there is no refund-initiation
  path and no 14-day clock.
- Negative: the invoice call has a 10 s timeout and **no retry**. A timeout after
  the provider actually created the invoice produces the K3 orphan.
- Negative: the three-way rank tie at 4 (`finished`/`failed`/`expired`) is
  load-bearing and produces K1.

---

## ADR-009 — Integer minor units for money

**Status:** Accepted.

**Context.** Prices, commissions at basis-point rates, fees, realised and
unrealised PnL, and an equity curve. IEEE-754 doubles accumulate representation
error across exactly this kind of arithmetic.

**Decision.** Every monetary value crossing an API boundary or landing in a
database is an integer count of USD cents, named `*_usd_minor`, declared with
`z.number().int()` (`packages/contracts/src/index.ts:383-385`). Conversion
happens once at the edge with an explicit `Math.round`; internal arithmetic uses
`Math.floor` on integers. Instrument *prices* remain floats with a per-symbol
`precision` from `SYMBOLS`, because a price is a measurement, not an amount.

**Consequences.**

- Positive: commission arithmetic is exact —
  `floor(total_usd_minor × rate_bps / 10000)` produces the same cents on every
  machine, which is what lets the referral suite assert
  `49900 → 9980/4990/2495/1497/998` exactly.
- Positive: the trading PnL engine reconciles to zero cents, because balance
  moves only on reducing fills with fees carried on the position.
- Positive: `z.number().int()` makes a float a validation failure, not a silent
  rounding.
- Negative: every display path must divide by 100, and forgetting shows a
  10 000× error.
- Negative: one deviation exists — `orders.actually_paid` is a Postgres
  `numeric` written via `String()` and read with `Number()`, because the
  provider reports a crypto amount, not cents. Treat it as metadata.

---

## ADR-010 — A closure table for the referral tree

**Status:** **Accepted, unwired.** The engine is complete and tested; nothing
calls it.

**Context.** A multi-level commission programme paying up to 10 levels deep. On
each purchase the system must find every ancestor of the buyer with its depth.
Recursive CTEs over an adjacency list do this but cost a walk per attribution
and are awkward to index.

**Decision.** A closure table. `referral_edges` stores child → parent (one row
per child, `child_id` as the primary key, `CHECK (child_id <> parent_id)`);
`referral_ancestors` stores `(descendant_id, ancestor_id, depth)` with
`CHECK (depth BETWEEN 1 AND 10)`. On link, the cross-product of the new parent's
ancestors × the child's descendants is inserted with `ON CONFLICT DO NOTHING`
(`apps/services/growth/src/referrals/referrals.service.ts:45-63`). The closure is
**always** built to `MAX_LEVELS = 10` even though only `DEFAULT_LEVELS = 5` pay,
so payout depth can be raised later without a tree rebuild — stated explicitly
at `packages/contracts/src/index.ts:303-305`.

**Consequences.**

- Positive: attribution is one indexed read
  (`WHERE descendant_id = $1 AND depth <= $2 ORDER BY depth`), not a recursive
  walk.
- Positive: cycle prevention is a single `isAncestor` check; self-links are a
  `CHECK` constraint.
- Positive: payout depth is a config change, not a migration.
- Positive: attribution is idempotent on `UNIQUE (order_id, beneficiary_id, level)`,
  so a retried call inserts nothing and emits nothing.
- Negative: writes are O(ancestors × descendants). Linking a node with a deep
  subtree is expensive.
- Negative: **it has no callers.** No code links a buyer to a parent or
  attributes an order, so the tree is empty and no commission has ever accrued.
  It is also disconnected from the waitlist referral system, which is keyed on
  `waitlist_entries` rather than identity user ids. Wiring it requires a product
  decision about where the link is created.

---

## ADR-011 — Server-authoritative academy XP

**Status:** Accepted.

**Context.** A game economy with a public leaderboard, verifiable certificates
and a referral bonus. Any client-trusted number is a number someone will forge.
But the UI must feel instant, and anonymous visitors must be able to earn before
an account exists.

**Decision.** Three rules.

1. **The server decides.** Every mutation runs inside `repo.tx` with
   `SELECT … FOR UPDATE` on the progress row
   (`apps/services/growth/src/academy/academy.service.ts:351-362`). The client's
   quiz score is clamped to the lesson's real question count before any award
   (`apps/services/growth/src/academy/xp.ts:29-31`); the client never sends an XP
   figure the server accepts.
2. **The client mirrors, it does not decide.** `apps/web/lib/academy/xp.ts`
   reimplements the identical arithmetic for optimistic UI, importing the same
   constants from contracts so the two cannot drift. Every mutation response
   carries the authoritative `progress` object and the client reconciles to it.
3. **Anonymous XP banks locally and claims once.** Device completions live in
   `localStorage`; the first authenticated sync merges only slugs the server has
   not seen, making the claim idempotent per slug
   (`academy.service.ts:117-128`).

**Consequences.**

- Positive: the leaderboard and every certificate mean something. Replaying a
  completion is a no-op; a forged score is clamped.
- Positive: the funnel works without an account, and no earned XP is lost at
  signup.
- Negative: the progress row is a per-user serialisation point — every lesson,
  arcade round and spin locks it.
- Negative: two implementations of the same arithmetic. Shared constants make
  drift unlikely but not impossible; the web unit test exists for exactly this.
- Negative: the referral bonus writes to the *referrer's* row from inside the
  referred user's transaction, so a hot referrer is a contention point.

---

## ADR-012 — Seat inventory enforced in a SQL predicate

**Status:** Accepted.

**Context.** 500 seats that must never be oversold, under concurrent checkout,
with multiple service replicas and a sweeper running on every one of them. This
is the hardest correctness constraint in the product.

**Decision.** The cap lives **inside the UPDATE predicate**, never in
application code:

```sql
UPDATE ltd_seats SET held = held + 1
 WHERE tenant_id = $1 AND granted + held < cap
 RETURNING cap                       -- 0 rows ⇒ 'sold_out' ⇒ 410
```

(`apps/services/billing/src/db/repo.ts:106-113`). Every counter mutation is a SQL
expression (`held - 1, granted + 1`), never a read-modify-write, and always in
the same transaction as the order-row change. Every state transition uses the
same shape — a conditional UPDATE with a `seat_state` predicate and a
`RETURNING` check (`:180-195`). There is no `SELECT`-then-`INSERT` window
anywhere.

**Consequences.**

- Positive: 600 concurrent checkouts against a cap of 500 produce exactly 500
  orders and 100 × `410`, asserted in
  `apps/services/billing/test/seats.test.ts:53-72`.
- Positive: double-granting is prevented by four independent layers — the IPN
  unique index, the rank ladder, the conditional UPDATE, and expression-based
  counter mutation.
- Positive: the sweeper is safe on every replica without leader election,
  because the second sweeper's UPDATE matches zero rows.
- Negative: the single `ltd_seats` row is a **global serialisation point**.
  Every checkout, grant, release and sweep contends on it. Acceptable at 500
  seats; not a pattern to reuse at volume.
- Negative: the invariant is enforced by a predicate, not a database constraint.
  A future writer that forgets the predicate breaks it silently, and
  `ltd_seats.checksum` — the obvious place for a reconciliation check — is
  declared and never used.
- Negative: the cap is seeded once with `ON CONFLICT DO NOTHING`, so changing
  `LTD_SEAT_CAP` after first boot requires SQL.

---

## ADR-013 — Boot DDL plus a versioned SQL mirror

**Status:** Accepted.

**Context.** Drizzle is used as a query builder; nothing in the boot path runs
`drizzle-kit`. Each service originally created its own schema with an idempotent
DDL string executed on every start. That makes a fresh clone work with zero
ceremony, but it leaves no reviewable schema artifact, no ordering, and no way
to detect that a deployed database has drifted.

**Decision.** Keep both, deliberately.

1. **Boot DDL stays** — `src/db/migrate.ts` in every service, idempotent,
   `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, run before the
   HTTP listener starts. A developer can `pnpm dev` a service against an empty
   database and it works.
2. **A versioned mirror is added** — `infra/sql/000_databases.sql` plus
   `infra/sql/<service>/0001_init.sql` × 5, each a faithful mirror of the boot
   DDL with `COMMENT ON` documentation on every table, notable column and index.
   `scripts/db.mjs` applies them with a sha256 checksum ledger in
   `schema_migrations`, and hard-fails if an already-applied file is edited.
   `verify` asserts the load-bearing objects exist.

Compose mounts `000_databases.sql` into the Postgres entrypoint, so a fresh
volume comes up with the five databases already created.

**Consequences.**

- Positive: the schema is reviewable in a diff, and the comments are the primary
  data-model documentation.
- Positive: drift is detectable (`db verify`) and unauthorised edits to applied
  migrations are refused.
- Positive: `db.mjs` has zero npm dependencies and works on a fresh clone before
  `pnpm install`, falling back through `psql` → `compose exec` → a throwaway
  container.
- Negative: **two sources of truth that must be kept in sync by hand.** Adding a
  column to `migrate.ts` without adding `0002_*.sql` means the versioned schema
  silently lies. CI runs apply/verify/seed twice, which catches non-idempotency
  but not divergence.
- Negative: the Drizzle table declarations are a *third* description, and they
  already disagree with the DDL in places (identity declares `text().unique()`
  for a physically `citext` column and declares no foreign keys where the DDL
  has them).

---

## ADR-014 — Paper execution first, live adapters deferred

**Status:** Accepted.

**Context.** The product promises execution on the member's own MT5, Binance or
KuCoin account. Each is a separate integration with its own auth, symbols,
rate limits and failure modes. Meanwhile the academy capstone, the PnL engine,
the equity curve and the whole member dashboard need *something* to execute
against on day one.

**Decision.** Ship an internal paper engine and make it the only execution path.
Every connection — including `mt5`, `binance` and `kucoin` — is marked against
the same engine, which fills against live quotes. Live adapters validate
credential *shape* only, store the credentials AES-256-GCM encrypted, and set
`status: "pending"` with a sanitised detail string: "Keys stored — live
execution rolls out to Founding members in waves"
(`apps/services/trading/src/brokers/adapters.ts:4-6,22-23`). The file states the
intent in a header comment: *"v1 execution is INTERNAL … Live-key adapters only
validate key shape and store credentials (encrypted) for the live rollout — they
never call brokers."*

**Consequences.**

- Positive: the entire member experience — orders, positions, PnL, equity curve,
  guards, the academy capstone — works end to end and is E2E-testable with no
  external dependency.
- Positive: credential storage, entitlement limits and the connection lifecycle
  are already exercised, so the live rollout is an adapter change, not an
  architecture change.
- Positive: no real money can be lost by a bug during pre-launch.
- Negative: the marketing surface materially overstates this today. See
  [../10-product.md](../10-product.md) §9.1.
- Negative: `status_detail` is the only signal to the user that their "live"
  connection is not live, and nothing enforces that the copy stays honest.
- Negative: the "fail-closed if the risk engine is unreachable" guarantee is
  vacuous while the guard engine is in-process with the executor.

---

## ADR-015 — In-process token-bucket rate limiting

**Status:** **Accepted, temporary.** Explicitly a pre-launch expedient.

**Context.** Abuse surfaces exist on day one: the early-access code endpoint
sends email, checkout creates a provider invoice, login is a credential oracle,
chat is a spam vector. A shared limiter means Redis — another service, another
failure mode, another thing to operate.

**Decision.** Token buckets in a process-local `Map`, with continuous fractional
refill computed lazily on each check and no timers
(`apps/services/identity/src/common/rate-limit.ts`). Limits in force: redeem
5/min/IP, login 10/min/IP **and** 5/min/email, chat 1 per 2 s burst plus 20/min
sustained, BFF 20/min/IP shared across public POSTs with dedicated buckets of
6/min for `ea-code` and 12/min for `ea-verify`. The map sweeps idle buckets when
it reaches 100 000 entries.

**Consequences.**

- Positive: zero infrastructure, zero latency, no new failure mode. Adequate for
  single-replica pre-launch.
- Positive: the per-email login bucket defeats a distributed credential-stuffing
  attempt that rotates IPs — asserted in
  `apps/services/identity/test/auth.test.ts:133-145`.
- Negative: **per replica.** N replicas mean N × the limit. Every bucket resets
  on deploy.
- Negative: the key is the first `x-forwarded-for` hop, which is spoofable
  unless the proxy is trusted. Caddy sets `trusted_proxies static private_ranges`
  in staging and production; **local compose has no proxy at all**, so all
  traffic shares one bucket named `local`.
- Negative: every `/api/app/**` and `/api/academy/**` route is unthrottled at
  the BFF.
- **Exit criteria:** the first time a service runs more than one replica, this
  needs to move to a shared store.
