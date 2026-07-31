# Active context

What this covers: the state of the HeroPips system **as of this documentation
pass**. What exists and runs, what was added in this pass, and what is in
flight. This file is a snapshot — rewrite it rather than appending to it. For
the works/partial/missing checklist see [progress.md](./progress.md); for why
the system is shaped this way see [decisions.md](./decisions.md).

Snapshot date: **2026-07-30**.

---

## 1. Where the product stands

Pre-launch. The platform is built and gated to Founding Hero lifetime members;
the public site runs an email-verified early-access waitlist. `LAUNCH_MODE` is
`prelaunch` in every environment template
(`apps/web/lib/academy/access.ts:12-13`, `.env.local.example:38`).

The commercial position is unchanged and simple: **flat $499, 500 seats, 120-minute
holds** (`packages/contracts/src/index.ts:292-297`). Subscription tiers exist as
copy on `/pricing` and cannot be sold.

## 2. What exists and runs

Six deployable applications plus two shared packages, one Postgres 16 instance
with five databases, one single-node Kafka.

| Area | State |
|---|---|
| Marketing site | Complete. 24 pages, full SEO/AEO surface, JSON-LD everywhere, PWA + offline, dark/light theming. |
| Early access | Complete. Two-step email verification, serialised queue positions, referral jumps, public counters, status token. |
| Billing | Complete for the one SKU. Seat inventory with a SQL-predicate cap, NOWPayments invoice + HMAC-SHA512 IPN, monotonic status ladder, 120-min hold sweeper, transactional outbox. |
| Identity | Complete. scrypt passwords, opaque SHA-256-stored sessions with sliding TTL, self-service profile/password/sessions, keyset audit log, founding-lounge chat over HTTP + WebSocket. |
| Signal | Runs end to end on the simulated feed. Feature pipeline, `quant-ml-v1` logistic scorer, signal lifecycle FSM. |
| Trading | Paper execution only. Connections with AES-256-GCM credential storage, order execution with three guards, integer-cent PnL, equity curve. |
| Academy | Complete and the most mature subsystem. 10 levels / 31 lessons, server-authoritative XP, UTC streaks, arcade, daily spin, 11 certificate tracks with public verification, leaderboard, three nudge cadences. |
| Lifecycle email | Complete. 26 templates, 3 journeys, weekly digest, one dispatch choke point with suppression + 20 h cap + ledger + GA4, Kafka consumer on 5 topics. |
| Growth referrals | Engine complete and tested; **no callers**. See [progress.md](./progress.md). |
| Affiliates | Application intake only. |

Test coverage is concentrated where money and state are: billing (5 suites,
~31 cases), identity (6 suites), growth academy + messaging + early access +
referrals (7 suites), signal/trading (12 spec files). `apps/web` has exactly one
vitest file and 13 Playwright specs. `packages/contracts` and `packages/ui`
have **zero** tests — the entire cross-service contract surface is covered by
typecheck plus whatever the service suites exercise transitively.

## 3. What was added in this pass

Everything in this section is new since the last snapshot and is verified
working by the lead.

### 3.1 Versioned SQL schema

`infra/sql/` now holds the authoritative, reviewable schema:

- `000_databases.sql` — creates the five service databases. Compose mounts it
  into the Postgres entrypoint, so a fresh volume comes up with the topology
  already in place. It supersedes the compose-local init script that used to
  live beside `docker-compose.yml`, which has been removed.
- `<service>/0001_init.sql` × 5 — a faithful mirror of each service's boot DDL
  with `COMMENT ON` documentation on every table, notable column and index.
- `seed/growth.sql`, `seed/trading.sql` — demo data for `pnpm db:seed`.

The per-service boot DDL in `src/db/migrate.ts` still runs on every start and
remains idempotent; the two paths are deliberately redundant. See ADR-013.

### 3.2 `scripts/db.mjs` — migration runner

`plan | apply | verify | seed | reset`, with a sha256 checksum ledger in
`schema_migrations` (`scripts/db.mjs:1-23`). `verify` asserts the load-bearing
objects exist rather than diffing the whole schema (`:45-48`). `seed` is refused
against production; `reset` is local-only and needs `--force`. Zero npm
dependencies — it works on a fresh clone before `pnpm install`, preferring a
native `psql`, falling back to `docker compose exec postgres`, falling back to a
throwaway `postgres:16-alpine` container (`:20-22`).

Verified: applies all five schemas, is idempotent on re-run, and hard-fails when
an already-applied migration file is edited.

### 3.3 `scripts/preflight.mjs` — the pre-start gate

Six check families: toolchain, files, config, secret placeholders, ports,
resources (`scripts/preflight.mjs:10-16`). Exit 0 pass, 1 blocking, 2 usage. The
config spec is derived from each service's `common/config.ts`, with `required`
and `productionOnly` tiers (`:34-43`).

Verified: passes local, and correctly **fails** staging when pointed at local
dev placeholders. That negative case is the whole point of the script and CI now
asserts it.

### 3.4 `scripts/stack.mjs` — one wrapper for all environments

`up | down | restart | build | pull | ps | logs | exec | config`
(`scripts/stack.mjs:11-21`). It picks the overlay, the env file and the
profiles, runs preflight before anything that starts containers, waits for
health, and applies migrations. Only local carries the `mocks` profile
(`:43-44`).

The overlay is resolved as `docker-compose.${env}.yml`, which is why the
environment is named **`production`** everywhere and only the npm script aliases
are shortened (`stack:prod:up` → `--env production`).

### 3.5 Three-environment Docker setup

- `infra/compose/docker-compose.yml` — fully env-driven base
  (`${VAR:-default}` throughout), healthchecks on **every** container, mocks
  behind the `mocks` profile, Postgres pinned to `--encoding=UTF8 --locale=C`.
- Overlays `docker-compose.{local,staging,production}.yml`.
- Caddy edge configs `caddy/Caddyfile.{staging,production}`, restructured into
  `handle` blocks. Both route `/v1/chat/ws` to `{$CHAT_UPSTREAM}` =
  `identity:4003` and everything else to `{$UPSTREAM}` = `web:3000`
  (`infra/compose/docker-compose.production.yml:154-157`). This fixed a real
  routing bug: Next.js has no `/v1/**` route, so sending the lounge socket to
  `web:3000` 404s and silently degrades chat to polling.
- `.env.{local,staging,production}.example`.
- Root scripts: `preflight*`, `stack:*`, `stack:staging:*`, `stack:prod:*`,
  `db:plan|apply|verify|seed|reset` (`package.json:15-41`).

### 3.6 `scripts/docs-check.mjs` — documentation integrity

Validates relative links, heading anchors, `path:line` citations (file exists
and the line is in range), mermaid block types and bracket balance, and document
structure across `docs/engineering` (`scripts/docs-check.mjs:11-20`). Exit 1 on
any error.

### 3.7 CI rework

`.github/workflows/ci.yml` is now three jobs:

- **verify** — secret-scan → brand-guard → **docs-check** → typecheck →
  **lint** → test → `pnpm audit --prod --audit-level high` → build. The audit is
  `continue-on-error` on a PR and **blocking on main** (`ci.yml:52-56`).
- **infra** — renders compose for all three environments, asserts staging and
  production start no mocks and publish no port except the Caddy edge, asserts
  preflight **rejects** local values used as staging, and runs
  `db apply/verify/seed` twice to prove idempotency (`ci.yml:68-145`).
- **images** — main only, needs both, builds via
  `node scripts/stack.mjs build --env local`.

`.github/workflows/e2e.yml` now drives the stack through
`pnpm stack:up` / `db:verify` / `db:seed` / `stack:down` instead of a bare
`docker compose up`, because the base compose file publishes no ports and hides
the doubles behind a profile (`e2e.yml:6-12`).

### 3.8 This documentation set

`docs/engineering/` — architecture, data model, flows, ten feature documents,
API reference, security, infrastructure, developer guide, operations runbook,
product specification, and this memory bank. Written against source with
`path:line` citations throughout and enforced by `docs-check`.

## 4. In flight

Not finished, actively being worked, or explicitly next.

| Item | State | Notes |
|---|---|---|
| Documentation set | **In flight during this pass.** | Multiple writers in parallel; `docs-check` is the acceptance gate. |
| Live broker execution | Not started. | Adapters store credentials and return `LIVE_PENDING_DETAIL`; the copy already says "rolls out to Founding members in waves". |
| Trade Guard expansion | Not started. | 3 of the 9 advertised guards exist, all as module constants. |
| Referral tree wiring | Blocked on a decision. | The engine is complete and tested; nothing calls `link` or `attribute`. Needs a product call on where the link is created — at redeem, at checkout, or at waitlist verify. |
| Real market data | Partially available. | `SOURCE=binance` works for crypto only; FX and metals have no live source. |

## 5. Traps a new contributor will hit first

Ordered by how quickly they bite.

1. **`pnpm build` cannot fail for a service.** The script ends in
   `|| echo build-noop`. `pnpm typecheck` is what catches a type error.
2. **Nest implicit DI does not work here.** No `design:paramtypes` under
   tsx/esbuild — use `@Inject(TOKEN)` and a module factory.
3. **Never abbreviate an environment name in a filename or `--env` value.** The
   overlay is resolved by string interpolation; `prod` silently loads nothing.
4. **Two different BFF auth models.** `/api/app/**` forwards the bearer;
   `/api/academy/**` sends no bearer and injects `user_id` into the body.
   Copying a handler from the wrong family produces a silently unauthenticated
   growth call.
5. **`GET /api/academy/progress` returns 204 for anonymous, not 401.** A caller
   checking `res.ok` sees `true` with no body.
6. **Middleware is a cookie sniff, not auth.** Real validation is
   `getSession()` in the `(member)` layout. A private route placed outside that
   segment inherits zero server validation.
7. **`NEXT_PUBLIC_*` is build-time.** Changing the launch mode or the chat WS
   URL needs a rebuild, not a restart — the WS origin is baked into the CSP.
8. **Lesson slugs are public URLs.** Renaming one breaks indexed pages and
   orphans stored `completions` keys.
9. **The seat cap is seeded once.** Changing `LTD_SEAT_CAP` after first boot
   does nothing; it needs SQL.
10. **`docs-check` runs in CI.** Rename a source file and every stale
    `path:line` citation in `docs/engineering` fails the build. That is
    deliberate.
