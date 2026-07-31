# Tech context

What this covers: the stack, the pinned versions, the tooling, and the hard
technical constraints that follow from them. Read after
[system-patterns.md](./system-patterns.md) — the patterns are the *how*, this is
the *what it runs on*. Deployment topology in detail is
[../07-infrastructure.md](../07-infrastructure.md); day-to-day commands are
[../08-developer-guide.md](../08-developer-guide.md).

---

## 1. Shape of the repository

A pnpm workspace with four globs — `apps/*`, `apps/services/*`, `packages/*`,
`infra/mocks/*` — for nine importers (`pnpm-workspace.yaml`).

```
apps/web                      Next.js 15 App Router — marketing site + platform + BFF
apps/services/growth          NestJS — early access, referrals, academy, lifecycle email
apps/services/billing         NestJS — LTD orders, seats, NOWPayments IPN
apps/services/identity        NestJS — accounts, sessions, audit, chat WebSocket
apps/services/signal          NestJS — market feed, quant model, signals
apps/services/trading         NestJS — connections, execution, PnL
packages/contracts            zod schemas + constants — the cross-service contract
packages/ui                   CSS design tokens + React primitives
infra/compose                 compose base + three overlays + Caddy edge configs
infra/sql                     versioned schema + seed data
infra/mocks/nowpayments       zero-dependency payment-provider double
scripts                       preflight, stack, db, secret-scan, brand-guard, docs-check
```

## 2. Runtime topology

| Component | Port | Database | Image |
|---|---|---|---|
| web (Next.js) | 3000 | — | `node:22-alpine`, `output: "standalone"` |
| growth-svc | 4001 | `hp_growth` | `node:22-alpine`, `tsx src/main.ts` |
| billing-svc | 4002 | `hp_billing` | idem |
| identity-svc | 4003 | `hp_identity` | idem |
| signal-svc | 4004 | `hp_signal` | idem |
| trading-svc | 4005 | `hp_trading` | idem |
| postgres | 5432 | — | `postgres:16-alpine` (`infra/compose/docker-compose.yml:51`) |
| kafka | 9092 internal / 9094 external | — | `apache/kafka:3.7.2`, KRaft single node (`:83-102`) |
| mailpit (dev) | 1025 / 8025 | — | `axllent/mailpit:v1.21`, `mocks` profile (`:130`) |
| nowpayments mock (dev) | 4090 | — | built locally, `mocks` profile |

Every service exposes `GET /healthz` → `{ok:true}`. Only `web` is ever reachable
from a browser; the five services register no CORS by design.

Postgres is initialised with `--encoding=UTF8 --locale=C`
(`infra/compose/docker-compose.yml:60`) so index ordering never depends on host
locale. Kafka has `KAFKA_AUTO_CREATE_TOPICS_ENABLE` on with replication factor 1
(`:98-100`) — no topic is ever explicitly created.

## 3. Pinned versions

### Toolchain

| Tool | Version | Source |
|---|---|---|
| Node | `>= 22` | `package.json:5-7` |
| pnpm | `10.26.1` (via corepack) | `package.json:4` |
| turbo | `^2.5.0` | `package.json:45` |
| TypeScript | `^5.6.3` | `package.json:46` |

### Web

| Dependency | Version |
|---|---|
| next | `^15.5.22` |
| react / react-dom | `^19.0.0` |
| zod | `^3.24.1` |
| @playwright/test | `^1.62.0` |
| vitest | `^2.1.8` |
| eslint / eslint-config-next | `^9.18.0` / `^15.1.6` |

### Services (identical across all five)

| Dependency | Version | Notes |
|---|---|---|
| @nestjs/common, @nestjs/core | `^11.0.6` | |
| @nestjs/platform-fastify | `^11.1.28` | Fastify, not Express |
| drizzle-orm | `^0.45.2` | query builder only — see §6 |
| pg | `^8.13.1` | `Pool` max 10 per service |
| kafkajs | `^2.2.4` | producer in every service; consumer only in growth |
| zod | `^3.24.1` | lockfile resolves `3.25.76` |
| reflect-metadata | `^0.2.2` | |
| rxjs | `^7.8.1` | |
| @heropips/contracts | `workspace:*` | |

Per-service additions: identity adds `ws ^8.18.0` (chat) and is the only service
without `pino` or `drizzle-kit`; billing / growth / signal / trading add
`pino ^9.5.0` and `uuid ^11.0.5` and `drizzle-kit ^0.31.10`; growth adds
`nodemailer ^9.0.3`.

Shared dev dependencies: `tsx ^4.19.2`, `vitest ^2.1.8`, `@swc/core ^1.10.7`,
`unplugin-swc ^1.5.1`, `typescript ^5.6.3`, `@types/node`, `@types/pg`.

### Shared packages

`@heropips/contracts` — ESM, single dependency `zod`, `main`/`exports` point at
`./src/index.ts` (raw TypeScript). `@heropips/ui` — ESM, five export entries
(four CSS files + `./src/index.tsx`), `react ^19` as a peer dependency. Neither
package has a build step.

`pino` is declared by four services but **never used** — all logging is
`console.*` with a `[service]` prefix.

## 4. TypeScript configuration

`tsconfig.base.json` is one shared base: `strict`, target `ES2022`, module and
moduleResolution `NodeNext`, `esModuleInterop`, `skipLibCheck`,
`resolveJsonModule`, `forceConsistentCasingInFileNames`, `declaration: false`,
`sourceMap: true`, plus `experimentalDecorators` + `emitDecoratorMetadata`
(needed by Nest DI, though see the caveat in §6).

`apps/web`, `packages/contracts` and `packages/ui` override module to `ESNext`
and moduleResolution to `Bundler`.

`apps/web/tsconfig.json` lists several generated-types globs for alternate
`distDir`s and carries an explicit `"//include"` warning: leaving a retired
`.next-*` directory listed makes typecheck validate *stale* route types, which
breaks every future build. Prune it when retiring a build dir.

## 5. Build, test, lint

`turbo.json` defines five tasks. `build` depends on `^build` with outputs
`.next/**`, `!.next/cache/**`, `dist/**`. `dev` is `cache: false`,
`persistent: true`. `test` depends on `^build`. **`typecheck` and `lint` have no
configuration at all** — no `dependsOn`, no outputs.

| Command | What actually happens |
|---|---|
| `pnpm typecheck` | `tsc --noEmit` in every package. The primary source-level correctness gate. |
| `pnpm build` | Real for `apps/web`. For the five services it is `tsc -p tsconfig.build.json \|\| echo build-noop` — a type error cannot fail it. For both shared packages it is `echo ok`. |
| `pnpm test` | `vitest run` in the five services; `vitest run --passWithNoTests` in web; `echo ok` in both packages. |
| `pnpm lint` | Real only for `apps/web` (`eslint .`); all five services define `lint: echo ok`. **Invoked by CI** (`.github/workflows/ci.yml:46-47`), so a web lint failure blocks a merge. |
| `pnpm security:scan` | `secret-scan` + `brand-guard` + a blocking `pnpm audit --prod --audit-level high`. CI does not call this aggregate script, but it runs all three steps individually (`ci.yml:32-36,54-56`). |

### Test frameworks

- **Unit / service** — vitest, node environment, `test/**/*.test.ts`, transformed
  by `unplugin-swc` with `legacyDecorator` + `decoratorMetadata` so Nest
  decorators resolve inside tests.
- **E2E** — Playwright, `apps/web/e2e`, three projects: `setup` (mints a real
  founding member end to end), `chromium` 1440×900, `mobile` 390×844. There is
  **no `webServer` block** — the stack must already be running on `BASE_URL`
  (default `http://localhost:3100`; CI uses `:3000`).

### CI

`.github/workflows/ci.yml` — three jobs, on every push to main and every PR,
concurrency-cancelled per ref.

| Job | Runs | Contents |
|---|---|---|
| `verify` | always, ≤20 min | install → `secret-scan` → `brand-guard` → **`docs-check`** → `typecheck` → **`lint`** → `test` → `pnpm audit --prod --audit-level high` → `build` (`ci.yml:16-61`) |
| `infra` | always, ≤10 min | materialises all three env templates, `preflight --env local`, renders compose for local/staging/production, asserts staging and production start **no mocks** and publish **no port except the Caddy edge**, asserts preflight **rejects** local values used as staging, then `db apply/verify/seed` run **twice** to prove idempotency (`ci.yml:68-145`) |
| `images` | main only, needs `verify` + `infra` | `node scripts/stack.mjs build --env local` (`ci.yml:151-163`) |

Two details worth internalising. The dependency audit is
`continue-on-error: ${{ github.event_name == 'pull_request' }}` (`ci.yml:56`) —
advisory on a PR so a fresh upstream advisory cannot block an unrelated fix,
**blocking on main**. And `docs-check` (`ci.yml:40-41`) is what catches a
renamed file that silently orphans links and `path:line` citations across
`docs/engineering`, including everything in this memory bank.

`.github/workflows/e2e.yml` — opt-in, gated on `workflow_dispatch` or the
literal `e2e` PR label; merges to main never run it. It drives the stack
through the wrapper (`pnpm stack:up` → `pnpm db:verify` → `pnpm db:seed` →
suite → `pnpm stack:down`, `e2e.yml:50-78`) rather than a bare
`docker compose up`, because the base compose file publishes no ports and keeps
the payment and mail doubles behind the `mocks` profile — a raw compose
invocation would produce a stack the browser cannot reach and a checkout flow
with no payment provider (`e2e.yml:6-12`).

## 6. Hard constraints

These are the technical facts that most often surprise a new contributor. Each
one has changed how code in this repo is written.

**C1 — No service runs compiled output; every one runs TypeScript through
`tsx` at runtime.** The container entrypoint is
`node_modules/.bin/tsx src/main.ts` in all five images, and `.dockerignore`
excludes `**/dist`, so nothing consumes a build artifact even where one exists.

Be precise about `noEmit`, because it differs per service. Only **billing** and
**identity** inherit `noEmit: true` from their base tsconfig
(`apps/services/billing/tsconfig.build.json`,
`apps/services/identity/tsconfig.build.json`). **growth, signal and trading**
each set `"noEmit": false` in `tsconfig.build.json` and *do* emit a `dist/`
tree, which is currently dead weight on disk. Either way the `build` script
ends in `|| echo build-noop` (`apps/services/growth/package.json:9`), so a type
error in any service cannot fail `pnpm build` — `pnpm typecheck` is what
catches it.

Consequences of running from source: the full dev dependency tree (tsx, vitest,
typescript, drizzle-kit, @swc/core, `@types/*`) ships in every production
image; `*.spec.ts` files are baked in; a syntax error surfaces at boot rather
than at build; cold start pays for transpilation. See ADR-005.

**C2 — esbuild emits no `design:paramtypes`, so Nest implicit DI does not
work.** Every constructor parameter needs `@Inject(TOKEN)` and every provider
needs `useFactory` + `inject`. This is why modules are factories. See
[system-patterns.md §3](./system-patterns.md#3-module-factory-di).

**C3 — Both shared packages ship raw TypeScript/TSX.** `main`/`exports` point at
`src/`. Any consumer that is not Next (which transpiles workspace source) or
`tsx` cannot import them. It is also why every service Dockerfile copies
`packages/contracts` into the *runtime* image.

**C4 — Drizzle is used as a query builder, not as a migration tool.** Nothing in
the boot path runs `drizzle-kit`. Each service executes an idempotent bootstrap
DDL string on every start (`src/db/migrate.ts`), and `infra/sql/<service>/0001_init.sql`
is the versioned mirror applied by `scripts/db.mjs`. The Drizzle table
declarations are descriptive; the raw SQL is authoritative — in a few places
they disagree (identity declares `text().unique()` for an email that is
physically `citext`, and declares no foreign keys where the DDL has them).

**C5 — Rate limiting is an in-process token bucket.** Per replica, per process,
in a `Map`, reset on every deploy, not shared across instances
(`apps/services/identity/src/common/rate-limit.ts`,
`apps/web/app/api/_lib/bff.ts:7-35`). Horizontal scaling weakens every limit
linearly.

**C6 — `apps/web` has no fetch timeouts.** There is no `AbortSignal` or
`AbortController` anywhere in the app; every upstream call inherits the undici
default. One slow service stalls a Next worker. (Two service-side clients *do*
set timeouts: the NOWPayments client at 10 s and the billing verifier at 5 s.)

**C7 — `NEXT_PUBLIC_*` is inlined at build.** `NEXT_PUBLIC_LAUNCH_MODE` and
`NEXT_PUBLIC_CHAT_WS_URL` cannot be changed by restarting a container — the WS
origin is even baked into the CSP `connect-src` by `next.config.ts`. Changing
either requires a rebuild.

**C8 — Kafka topics are auto-created with RF=1 on a single KRaft broker.** Fine
for the current deployment; a managed cluster will need explicit topic creation
with real partitioning and replication.

**C9 — Health is declared in compose, not in the images, and there is no init
process.** No Dockerfile carries a `HEALTHCHECK` instruction, but
`infra/compose/docker-compose.yml` defines one for **every** container:
`pg_isready` for postgres (`:75-79`), a `kafka-topics.sh --list` probe for
kafka (`:105-109`), `mailpit readyz` (`:137-140`), a `wget … /healthz` probe on
each of the five services (`:169-172,197-200,219-222,243-246,269-272`) and a
`wget … /` probe for web (`:305-308`). `scripts/stack.mjs` waits on those
before applying migrations. What is genuinely missing is an init process: PID 1
is `node` or the `tsx` shim, so nothing reaps zombies and signal handling
depends on tsx forwarding.

**C9a — The founding-lounge WebSocket does not go through Next.js.**
`/v1/chat/ws` is served by identity-svc
(`apps/services/identity/src/main.ts:36`,
`apps/services/identity/src/chat/gateway.ts:47`); the Next app has no `/v1/**`
route and no rewrites. Both edge configs therefore route `/v1/chat/ws` to
`{$CHAT_UPSTREAM}` = `identity:4003` and everything else to `{$UPSTREAM}` =
`web:3000` (`infra/compose/docker-compose.production.yml:154-157`,
`docker-compose.staging.yml:113`). On **staging** the edge's basic auth also
covers that handle, and browsers do not attach basic-auth credentials to a
JS-initiated WebSocket handshake — so the lounge degrades to polling on staging
**by design**. Production has no basic auth.

**C10 — Every service config variable has a default, including secrets.**
Nothing is strictly required to boot, so a missing `STATUS_TOKEN_SECRET` or
`NOWPAYMENTS_IPN_SECRET` silently falls back to a dev value. This is exactly
what `scripts/preflight.mjs` exists to catch before a staging or production
start.

## 7. Configuration surface

Environment templates: `.env.local.example`, `.env.staging.example`,
`.env.production.example`. The environment is called **`production`** everywhere
— `--env production`, `.env.production`, `docker-compose.production.yml`,
`Caddyfile.production`. Only the npm script aliases are abbreviated
(`stack:prod:up`), because `scripts/stack.mjs` resolves the overlay as
`docker-compose.${env}.yml` and a shortened filename never loads.

Secrets in play: `STATUS_TOKEN_SECRET` (HMAC for status tokens — shared between
billing and growth), `NOWPAYMENTS_API_KEY` and `NOWPAYMENTS_IPN_SECRET`,
`CRED_KEY` (32-byte hex AES key for broker credentials, held by trading-svc),
`ADMIN_TOKEN` (unset ⇒ admin mutations return 503), `SMTP_URL` (unset ⇒ log-only
email transport). Full inventory in
[../07-infrastructure.md](../07-infrastructure.md).

## 8. Supply-chain guards

Two dependency-free Node scripts gate CI:

- `scripts/secret-scan.mjs` — walks the whole repo, six regexes (PEM key, AWS
  `AKIA`, Stripe `sk_live_`, Slack `xox*`, GitHub `ghp_`, and a bare 64-hex
  heuristic). Per-**line** pragma `secret-scan:allow` on the match line or the
  one above. Skips any directory whose name starts with `.next`.
- `scripts/brand-guard.mjs` — walks eight named roots, one rule (`/xyro/i`), no
  pragma escape hatch; a legitimate mention can only be excused with a path
  regex.

Root `package.json` carries four `pnpm.overrides` for transitive advisories
(`postcss`, `sharp`, `fast-uri`, `find-my-way`) and an
`onlyBuiltDependencies` allowlist for postinstall scripts.
