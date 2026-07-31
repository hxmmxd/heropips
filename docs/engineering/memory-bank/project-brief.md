# Project brief

What this covers: the immovable frame of the HeroPips project — what is being
built, the goals it serves, and the constraints that are not up for
renegotiation without an explicit decision recorded in
[decisions.md](./decisions.md). Read this first; every other document in the
memory bank is subordinate to it.

---

## 1. The product in one paragraph

HeroPips is a self-directed trading-intelligence platform for retail traders.
An in-house quant pipeline turns market data into scored, explained trade
briefs; members execute those briefs on a broker connection under enforced risk
guards; a gamified 10-level academy takes a complete beginner to the point
where they can follow their own written plan; a founding-member lounge holds
the community. It is monetised today by a single one-time **Founding Hero
lifetime deal at a flat $499, 500 seats, paid in crypto**
(`packages/contracts/src/index.ts:292-297`). A public early-access waitlist with
verified email and referral-driven queue positions builds the launch cohort.

The full product specification as built — including a feature inventory and an
explicit list of things the marketing surface promises that the code does not
do — is [../10-product.md](../10-product.md).

## 2. Scope

### In scope

| Area | What is owned |
|---|---|
| Public marketing site | 24 pages, full SEO/AEO surface, PWA (`apps/web/app/(marketing)`) |
| Early access | Email-verified waitlist, queue positions, referral jumps, public counters |
| Commerce | One SKU, finite seat inventory, crypto checkout, signed IPN ingestion, status tokens |
| Identity | Accounts, opaque sessions, self-service, audit trail, founding-lounge chat |
| Intelligence | Market feed, feature pipeline, scoring model, signal lifecycle |
| Execution | Broker connections, credential storage, paper execution engine, risk guards, PnL |
| Academy | 10 levels / 31 lessons, XP, streaks, ranks, arcade, spin, 11 certificate tracks, leaderboard |
| Lifecycle messaging | 26 templates, 3 drip journeys, weekly digest, academy nudges, unsubscribe/open/click |
| Growth | Waitlist referrals, a 10-level commission closure table, affiliate application intake |

### Explicitly out of scope

- Custody of member funds, in any form. HeroPips is not a broker, fund or
  adviser (`apps/web/app/llms-full.txt/route.ts`).
- Investment advice, recommendations, portfolio management, or any performance
  promise. The compliance disclaimer is a shipped UI primitive
  (`packages/ui/src/index.tsx:107-113`).
- Recurring subscription billing. The four tiers on `/pricing` are declared
  copy only (`apps/web/lib/content.ts:159-228`); nothing can charge them.
- The "Capital" pillar — managed strategies, copy trading, institutional
  products. Gated on licences that do not exist.

## 3. Goals

1. **Sell 500 founding seats without ever overselling one.** Seat inventory is
   the single hardest correctness constraint in the system; the cap is enforced
   inside the UPDATE predicate, not in application code
   (`apps/services/billing/src/db/repo.ts:106-113`).
2. **Never lose money-affecting state.** Every domain write that must produce
   an event commits the event in the same transaction — the transactional
   outbox (ADR-003). Payments are idempotent on `(payment_id, payment_status)`
   and monotonic on `PAYMENT_STATUS_RANK`.
3. **Make the academy the top of the funnel.** Level 0 is fully public and
   crawlable; an anonymous visitor can earn XP on one lesson before any account
   exists, and that XP claims into the account on first sync
   (`packages/contracts/src/index.ts:759`).
4. **Ship a compliance-defensible surface.** No fabricated performance numbers
   anywhere, in the product or in email
   (`docs/Lifecycle-Email-Playbook.md:82-91`). Every signal discloses its
   `model_version` and `data_source` (`packages/contracts/src/index.ts:463-479`).
5. **Keep the public attack surface to one process.** Only Next.js is reachable
   from a browser; the five services have CORS disabled by design and are never
   published to the internet.
6. **Be operable by one person.** One `docker compose` topology, one migration
   runner, one preflight gate, three environments
   (`scripts/stack.mjs`, `scripts/db.mjs`, `scripts/preflight.mjs`).

## 4. Non-negotiable constraints

These are architectural invariants. Breaking one is not a refactor, it is a new
decision that must be recorded in [decisions.md](./decisions.md).

| # | Constraint | Why | Enforcement |
|---|---|---|---|
| C1 | **Database per service.** No service reads another service's tables. | Independent schema evolution; a bad migration blasts one domain, not all five. | Five databases `hp_{growth,billing,identity,signal,trading}` (`infra/sql/000_databases.sql`); each service has its own `DATABASE_URL_*` |
| C2 | **The Next.js app is the only ingress.** | One TLS termination, one CSP, one rate-limit surface, one place session cookies exist. | No service registers CORS; compose publishes services on the host only in the local overlay |
| C3 | **`packages/contracts` is the sole cross-service contract.** | Two services cannot disagree about a shape without a typecheck failure. | Every service depends on `@heropips/contracts` at `workspace:*` |
| C4 | **Money crosses API boundaries only as integer USD minor units.** | Floating-point cents are a category of bug we refuse to have. | `z.number().int()` on every `*_usd_minor` field (`packages/contracts/src/index.ts:383-385`) |
| C5 | **Events are published through a transactional outbox, never a dual write.** | A domain change and its event either both happen or neither does. | `insertAudit`, `createHeldOrder`, `joinTx`, academy `tx` — all wrap row + outbox in one transaction |
| C6 | **Session tokens are opaque and only their SHA-256 is stored.** | A database leak yields no usable credential; revocation is immediate and real. | `apps/services/identity/src/common/crypto.ts:62-69` |
| C7 | **Broker credentials are encrypted at rest and never echoed.** | Non-custodial posture depends on it. | AES-256-GCM at `apps/services/trading/src/common/crypto.ts`; `ConnectionRes` has no credential field |
| C8 | **Calendar days are UTC, everywhere, as `YYYY-MM-DD` strings.** | Streaks, spins and arcade caps must mean the same thing for every user on Earth. | `AcademyDate` regex (`packages/contracts/src/index.ts:829`); `utcDay()` (`apps/services/growth/src/academy/xp.ts:11`) |
| C9 | **XP is server-authoritative.** The client mirrors the arithmetic for optimistic UI; the server decides. | It is a game economy with a public leaderboard. | Every mutation is `tx` + `SELECT … FOR UPDATE` (`apps/services/growth/src/academy/academy.service.ts:351-362`) |
| C10 | **Lesson slugs are public URLs and are never renamed.** | They are indexed, linked, and stored in `academy_progress.completions`. | `packages/contracts/src/index.ts:712` |
| C11 | **Error responses are always the `ApiError` envelope.** Raw provider or internal errors never surface. | Stable client handling; no information leak. | Global `ApiExceptionFilter` in all five services |
| C12 | **No investment advice, no performance promise, no custody — in code, copy or email.** | Legal posture. | `Disclaimer` primitive; copy rules in the messaging template library |

## 5. Success criteria

The pre-launch phase succeeds when all of the following hold:

- 500 seats are sold with `granted + held ≤ cap` never violated, and the
  `ltd_seats` counters reconcile against `orders`.
- Every paid order becomes a redeemed account, or is refunded, with no order
  stranded in a state that has money in but no seat.
- The waitlist is deliverable: every entry has passed email verification
  (`packages/contracts/src/index.ts:81-84`).
- No lifecycle email contains a number that did not come from an event payload
  or the database.
- The academy is fully crawlable and a beginner can reach Hero Trader rank from
  lessons and quizzes alone (5 090 XP available vs a 5 000 threshold).

## 6. What "done" is not

- A service that boots is not a service that is production-ready. TypeScript
  runs through `tsx` at runtime and `build` cannot fail — see ADR-005 and
  [progress.md](./progress.md).
- A contract that typechecks is not a contract that is exercised. Several
  complete, tested subsystems have zero callers; they are listed in
  [progress.md](./progress.md) under *Built but unreachable*.
- Marketing copy is not a specification. Where copy and code disagree, the gap
  is documented in [../10-product.md](../10-product.md) §9 and the copy is the
  thing that is wrong.
