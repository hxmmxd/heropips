# Developer guide

Everything you need to go from `git clone` to shipping a reviewed change: how to
stand the stack up, how to log in locally, where things live, the conventions
this codebase actually follows (not the ones it aspires to), copy-paste recipes
for the six changes you are most likely to make, how to test and debug, and the
traps that have already cost someone a morning. Written for an engineer who
joined today. Runtime topology, container internals and env-var meanings live in
[infrastructure](./07-infrastructure.md); day-2 operations live in the
[operations runbook](./09-operations-runbook.md).

---

## 1. Day one — clone to a logged-in member

### 1.0 Prerequisites

| Tool | Required | Checked by |
|---|---|---|
| Node | `>= 22` | `package.json:5-7`, `scripts/preflight.mjs:197-198` |
| pnpm | `10.26.1` (pinned via `packageManager`) | `package.json:4`, `scripts/preflight.mjs:214-216` |
| Docker Engine + Compose **v2** | any recent | `scripts/preflight.mjs:200-212` |
| Free disk | ≥ 15 GiB comfortable, < 5 GiB is a hard fail | `scripts/preflight.mjs:352-359` |

`corepack enable` is enough to get the pinned pnpm; nothing else is global.
`psql` is optional — `scripts/db.mjs` borrows one from a container when it is
absent (`scripts/db.mjs:20-22`, `:198-210`).

### 1.1 The five commands

```bash
git clone <repo> heropips.com && cd heropips.com
cp .env.local.example .env.local     # 1
corepack enable && pnpm install      # 2
pnpm preflight                       # 3
pnpm stack:up                        # 4
pnpm db:verify                       # 5
```

| # | What it actually does | How you know it worked |
|---|---|---|
| 1 | Copies the local env file. Every value in it is a deliberate development placeholder and none of them are secrets (`.env.local.example:5-6`). It is the single env source for compose (`--env-file`), `scripts/db.mjs` and `scripts/preflight.mjs` (`.env.local.example:8-10`). | `.env.local` exists. `scripts/stack.mjs:80-93` will otherwise die with the exact `cp` command. |
| 2 | Installs the workspace: `apps/*`, `apps/services/*`, `packages/*`, `infra/mocks/*` (`pnpm-workspace.yaml`). Postinstall scripts are allowlisted to `@swc/core`, `esbuild`, `sharp`, `unrs-resolver`, `protobufjs` (`package.json:48-55`). | `node_modules/` present — preflight warns if absent (`scripts/preflight.mjs:361-366`). |
| 3 | The pre-start gate. Six sections, in order: toolchain, files, config, secrets, host ports, resources (`scripts/preflight.mjs:413-418`). For `local` a missing required var is a **warning**, because code defaults cover it; for staging/production it is a failure (`scripts/preflight.mjs:265-267`). | `Preflight passed for "local".` (`scripts/preflight.mjs:386`). Exit code 0. |
| 4 | Runs preflight again, then (local only) `docker compose build`, then `up -d --remove-orphans`, then polls `compose ps` until nothing is `starting`, then runs `node scripts/db.mjs apply --env local --yes` (`scripts/stack.mjs:190-209`). Local implies the `mocks` profile, so mailpit and the NOWPayments mock start too (`scripts/stack.mjs:44`). | The banner at `scripts/stack.mjs:211-221` prints app/mailpit/payments/postgres URLs. Exit code is non-zero if anything failed its healthcheck (`scripts/stack.mjs:222`). |
| 5 | Asserts the live schema against the load-bearing tables and indexes per service, and that no migration is pending (`scripts/db.mjs:373-411`). | `All databases verified.` plus one `ok` line per service. |

Independent verification:

```bash
curl -s localhost:3000/                | head -c 80
for p in 4001 4002 4003 4004 4005; do curl -s localhost:$p/healthz; echo " :$p"; done
curl -s localhost:4090/healthz         # NOWPayments mock
open http://localhost:8025             # Mailpit
```

Every service answers `GET /healthz` with `{"ok":true}` — e.g.
`apps/services/identity/src/app.module.ts:20-26`.

### 1.2 Getting a logged-in member account

There are **two unrelated code systems** with confusingly similar names. Learn
the difference now; it saves an hour later.

| | `EARLY_ACCESS_CODES` | `EARLY_ACCESS_DEV_CODE` |
|---|---|---|
| Owned by | identity-svc | growth-svc |
| Purpose | Bypass codes that let `POST /v1/auth/redeem` create a **founding member account** without a real purchase | Pins the 6-digit **email-verification** code for the public early-access queue |
| Shape | CSV of opaque strings | one fixed code |
| Local value | `hp_dev_alpha,hp_dev_beta` (`infra/compose/docker-compose.local.yml:62`, `.env.local.example:66`) | `123456` (`infra/compose/docker-compose.local.yml:49`, `.env.local.example:90`) |
| Read at | `apps/services/identity/src/common/config.ts:26-29`, used as the fallback at `apps/services/identity/src/auth/auth.service.ts:78` | `apps/services/growth/src/common/config.ts:33`, echoed as `dev_code` at `apps/services/growth/src/early-access/early-access.service.ts:150` |
| Gets you into `/app` | **yes** | **no** |

#### Log in (the fast path)

1. Open <http://localhost:3000/app/redeem>.
2. Fill in: **Email** (anything), **Access code** `hp_dev_alpha`, **Display
   name**, **Password** — minimum 10 characters, enforced by `RedeemAccessReq`
   (`packages/contracts/src/index.ts:431-437`). The exact labels are the ones
   the E2E helper drives (`apps/web/e2e/helpers.ts:43-49`).
3. Click **Activate**. You land on `/app`; the BFF has set the httpOnly
   `__Host-hp_session` cookie (`apps/web/lib/session.ts:14`, `:20-26`).
4. Later sessions: <http://localhost:3000/app/login>.

Same thing without a browser:

```bash
curl -s -X POST localhost:4003/v1/auth/redeem \
  -H 'content-type: application/json' \
  -d '{"email":"dev@heropips.local","access_code":"hp_dev_alpha",
       "display_name":"Dev Hero","password":"dev-password-1234"}'
```

The response is an `AuthSessionRes` — an opaque bearer plus the user
(`packages/contracts/src/index.ts:455-460`). Use it as
`Authorization: Bearer <token>` against any service.

Note `/app/**` is cookie-gated in middleware on **presence only**; real
validation is the server-side introspection in the platform layout
(`apps/web/middleware.ts:3-19`).

#### The early-access queue (no inbox needed)

```bash
curl -s -X POST localhost:4001/v1/early-access/code \
  -H 'content-type: application/json' -d '{"email":"queue@heropips.local"}'
# → { "email_masked": "...", "expires_in": 900, "resend_in": 30, "dev_code": "123456" }

curl -s -X POST localhost:4001/v1/early-access/verify \
  -H 'content-type: application/json' \
  -d '{"email":"queue@heropips.local","code":"123456"}'
```

`dev_code` is present in the response *only* because `EARLY_ACCESS_DEV_CODE` is
set; preflight hard-fails if it is set for staging or production
(`scripts/preflight.mjs:281-287`). The equivalent UI is `/early-access`.

#### Reading captured email

Nothing leaves your machine: growth-svc points at mailpit
(`SMTP_URL=smtp://mailpit:1025`, `.env.local.example:82`) which publishes SMTP
on `:1025` and a web UI on **<http://localhost:8025>**
(`infra/compose/docker-compose.local.yml:39-41`). With no `SMTP_URL` at all the
transport degrades to logging instead of sending
(`apps/services/growth/src/messaging/config.ts:2-3`, `:36`).

#### Simulating a payment

The NOWPayments mock on **:4090** replaces the provider
(`infra/mocks/nowpayments/src/server.mjs`). It signs IPNs with HMAC-SHA512 over
the sorted-key canonical body, exactly like the real provider (`:34-37`), and
posts them to `IPN_TARGET`, pinned in compose to
`http://billing:4002/v1/billing/ipn` (`infra/compose/docker-compose.yml:126`).

```bash
# 1. reserve a seat and get an invoice
curl -s -X POST localhost:3000/api/founding/checkout \
  -H 'content-type: application/json' -d '{"email":"buyer@heropips.local"}'
# → { order_id, invoice_url: "http://localhost:4090/invoice/mockinv_N", status_token, ... }

# 2. drive the payment sequence (waiting → confirming → confirmed → sending → finished)
curl -s -X POST localhost:4090/simulate/mockinv_N/pay -d '{}'
curl -s localhost:4090/simulate/mockinv_N/log        # timestamped step log

# 3. watch the order flip
curl -s "localhost:3000/api/founding/status?token=<status_token>"
```

Sequences and endpoints: `infra/mocks/nowpayments/src/server.mjs:119-140`,
`:314-330`. Or just open `invoice_url` in a browser for a checkout page that
polls the log every 300 ms.

**Gate on the seat, not the payment.** At `confirmed` the seat is still only
`held` and identity rejects the order id with `access_code_invalid`; it flips to
`granted` on `finished`, which is when the order id becomes redeemable. This is
spelled out in the canonical worked example — the Playwright setup project at
`apps/web/e2e/platform-app.setup.ts:26-38`. Read that file; it is the shortest
complete description of the real purchase-to-member path.

The Founding Hero deal is a **flat $499** (`LTD.PRICE_USD_DEFAULT`,
`packages/contracts/src/index.ts:292-297`, `LTD_PRICE_USD=499` in
`.env.local.example:60`). There is no seat-price ladder anywhere. The only
ladder in billing is `PAYMENT_STATUS_RANK`, which exists to make out-of-order
IPNs safe (`packages/contracts/src/index.ts:195-198`).

---

## 2. Two development modes

### Mode A — full containerised stack

Everything in Docker, closest to production, zero host configuration.

```bash
pnpm stack:up            # preflight → build → up -d → wait health → db apply
pnpm stack:ps            # docker compose ps -a
pnpm stack:logs          # follow all, tail 200
pnpm stack:down          # stop AND drop volumes (local only)
pnpm stack:build         # rebuild images without starting
pnpm stack:config        # render the fully merged compose file
```

Restart one container after a source change:

```bash
node scripts/stack.mjs build --env local --service identity
node scripts/stack.mjs restart --env local --service identity
```

Every `stack:*` script is `node scripts/stack.mjs <cmd> --env <name>`
(`package.json:19-34`). The environment name selects the overlay by string
substitution — `docker-compose.${envName}.yml`
(`scripts/stack.mjs:96`) — and the env file `.env.${envName}`
(`scripts/stack.mjs:81`). The three environments are therefore **`local`,
`staging`, `production`**, with overlays `infra/compose/docker-compose.local.yml`,
`docker-compose.staging.yml` and `docker-compose.production.yml`, and edge
configs `infra/compose/caddy/Caddyfile.staging` /
`Caddyfile.production`. Only the npm script *aliases* are abbreviated
(`stack:prod:up` → `--env production`); never abbreviate a filename or an
`--env` value or the overlay silently fails to load.

Use Mode A when: you are touching compose, Dockerfiles, cross-service flows,
Kafka wiring, the payment path, or anything you want to behave like staging.
Also the only mode where the NOWPayments mock's IPN callback reaches billing
without extra work.

Costs: no hot reload — every service change is a rebuild + restart. Containers
run `NODE_ENV=production` (`.env.local.example:13`,
`infra/compose/docker-compose.yml:40`), which changes behaviour (see
[traps](#9-traps-for-new-developers)).

### Mode B — `pnpm dev` on the host, infrastructure in Docker

Turbo runs the six app processes on the host with watch mode; only Postgres,
Kafka and the two mocks stay containerised.

```bash
# 1. infrastructure only (stack.mjs takes a single --service, so use compose directly)
docker compose --project-directory infra/compose \
  -f infra/compose/docker-compose.yml \
  -f infra/compose/docker-compose.local.yml \
  --env-file .env.local --profile mocks \
  up -d postgres kafka mailpit nowpayments-mock

# 2. schema
pnpm db:apply

# 3. the apps, with host-visible Kafka
KAFKA_BROKERS=localhost:9094 pnpm dev
```

`pnpm dev` is `turbo dev` (`package.json:9`), which fans out to
`next dev -p 3000` for web (`apps/web/package.json:6`) and `tsx watch src/main.ts`
for each service (all five identical). The `dev` task is `cache:false,
persistent:true` (`turbo.json:5`).

Three things you must know about Mode B:

1. **`KAFKA_BROKERS` must be overridden.** Every service defaults to
   `localhost:9092` (e.g. `apps/services/identity/src/common/config.ts:21`) but
   compose only publishes `9094:9094` (`infra/compose/docker-compose.local.yml:31`)
   and advertises the external listener as
   `${KAFKA_EXTERNAL_HOST:-localhost}:9094` (`infra/compose/docker-compose.yml:92`).
   Without the override the outbox relays warn every 30 s and never drain.
2. **Do NOT `source .env.local`.** `DATABASE_URL_*` point at the compose DNS name
   `postgres:5432` (`.env.local.example:28-32`), which does not resolve from the
   host. The service defaults are already correct
   (`postgres://hp:hp@localhost:5432/hp_<svc>`, e.g.
   `apps/services/growth/src/db/client.ts:5-8`). Worse, growth and signal read
   the bare `PORT` with no service-specific override
   (`apps/services/growth/src/main.ts:22`,
   `apps/services/signal/src/main.ts:22`), so one exported `PORT` collides
   across processes. identity, billing and trading do accept
   `IDENTITY_PORT` / `BILLING_PORT` / `TRADING_PORT`.
3. **Payment simulation does not fully work.** The mock's `IPN_TARGET` is pinned
   to `http://billing:4002/...` inside the compose network
   (`infra/compose/docker-compose.yml:126`), where a host-run billing does not
   exist. Either run billing in the container too, or start the mock with
   `IPN_TARGET=http://host.docker.internal:4002/v1/billing/ipn`.

Use Mode B when: iterating on web UI, a single service's logic, or tests. Free
hot reload, real stack traces, attachable debugger.

| | Mode A | Mode B |
|---|---|---|
| Hot reload | no | yes |
| `NODE_ENV` | `production` | unset → dev defaults |
| Payment IPN loop | works | needs `IPN_TARGET` override |
| Rebuild cost per change | image build + restart | none |
| Fidelity to staging | high | medium |

---

## 3. Repository tour

```
heropips.com/
├── apps/
│   ├── web/                        Next.js 15 App Router — the ONLY internet-facing app
│   │   ├── app/
│   │   │   ├── (marketing)/        public pages: /, /product/**, /pricing, /academy/**, /legal/**
│   │   │   ├── (platform)/app/     member area; (auth)/ = login+redeem, (member)/ = everything else
│   │   │   ├── api/                the BFF — one route.ts per upstream call, ~45 routes
│   │   │   ├── layout.tsx          root shell, fonts, token CSS imports
│   │   │   ├── globals.css         app-level CSS incl. .hp-skeleton (:111)
│   │   │   ├── sitemap.ts robots.ts manifest.ts
│   │   ├── components/             marketing/, app/, academy/, chrome/, seo/, analytics/, pwa/, art/
│   │   ├── lib/
│   │   │   ├── api.ts              server-only fetch to growth/billing + zod parse
│   │   │   ├── session.ts          __Host-hp_session cookie, introspection, serviceGet()
│   │   │   ├── content.ts          marketing copy as data
│   │   │   └── academy/            curriculum projection
│   │   ├── e2e/                    Playwright specs + platform-app.setup.ts + helpers.ts
│   │   ├── middleware.ts           cookie-presence gate on /app/**
│   │   ├── next.config.ts          CSP, security headers, redirects, distDir
│   │   └── eslint.config.mjs       the only real lint config in the repo
│   └── services/                   NestJS 11 on Fastify, TypeScript run through tsx
│       ├── identity/               :4003 hp_identity — accounts, sessions, audit, chat WS
│       ├── billing/                :4002 hp_billing  — LTD orders, seats, NOWPayments IPN
│       ├── growth/                 :4001 hp_growth   — early access, referrals, academy, email
│       ├── signal/                 :4004 hp_signal   — market feed, quant model, signals
│       └── trading/                :4005 hp_trading  — broker connections, execution, PnL
├── packages/
│   ├── contracts/                  zod schemas, Kafka topics, business constants. RAW TS, no build
│   └── ui/                         tokens.css + brand.css + loaders.css + ui.css + src/index.tsx
├── infra/
│   ├── compose/                    docker-compose.yml + .{local,staging,production}.yml + caddy/
│   ├── sql/                        000_databases.sql + <service>/0001_init.sql ×5 + seed/
│   └── mocks/nowpayments/          zero-dependency payment provider double
├── scripts/                        preflight stack db secret-scan brand-guard docs-check (.mjs)
├── docs/engineering/               this documentation set
├── turbo.json pnpm-workspace.yaml tsconfig.base.json
└── .env.local.example .env.staging.example .env.production.example
```

Inside every service the layout is the same:

```
apps/services/<svc>/
├── src/
│   ├── main.ts                 bootstrap: loadConfig → migrate → Nest+Fastify → relay → listen
│   ├── app.module.ts           the module (factory or static) + HealthController + DI tokens
│   ├── common/
│   │   ├── config.ts           env → typed config object, one loadConfig(env)
│   │   └── errors.ts           ApiException + ApiExceptionFilter
│   ├── db/
│   │   ├── schema.ts           Drizzle table definitions
│   │   ├── migrate.ts          idempotent boot-time DDL string
│   │   ├── client.ts           pg Pool + drizzle instance
│   │   └── repo.ts             repository interface + Drizzle implementation
│   ├── outbox/
│   │   ├── outbox.service.ts   makeEnvelope() + relay lifecycle
│   │   └── relay.ts            2 s timer: unsent rows → Kafka → mark sent_at
│   └── <feature>/              controller + service (+ repo for growth's features)
├── test/                       vitest specs + mem-repo.ts + fakes/helpers
├── vitest.config.ts
├── tsconfig.json  tsconfig.build.json
└── Dockerfile
```

### What to touch for a given change

| Change | Files |
|---|---|
| Marketing copy | `apps/web/lib/content.ts`, the page under `apps/web/app/(marketing)/` |
| New public page | `app/(marketing)/<path>/page.tsx` + `app/sitemap.ts` + `e2e/helpers.ts` `MARKETING_ROUTES` |
| Member page | `app/(platform)/app/(member)/<path>/page.tsx` |
| Anything crossing a service boundary | `packages/contracts/src/index.ts` **first** |
| Colour, spacing, type, radius | `packages/ui/tokens.css` — never a literal in a component |
| New React primitive | `packages/ui/src/index.tsx` (+ `ui.css`/`brand.css`/`loaders.css` if it needs classes) |
| Service business logic | `apps/services/<svc>/src/<feature>/<feature>.service.ts` |
| New table or column | contract → `src/db/schema.ts` → `src/db/migrate.ts` → `infra/sql/<svc>/000N_*.sql` |
| New event | `packages/contracts/src/index.ts` event map → producer's outbox insert → consumer |
| Container topology, ports, env plumbing | `infra/compose/docker-compose.yml` + the relevant overlay |
| A new environment variable | `config.ts` → compose → all three `.env.*.example` → `scripts/preflight.mjs` |

Do not touch: `docs/` root (business PDFs and legacy markdown),
`docs/engineering/README.md` unless you own the doc set.

---

## 4. Code conventions as actually practised

These are read out of the code, not aspirational.

### 4.1 NestJS modules with explicit DI tokens

**Every provider is wired with an explicit token. Never rely on constructor type
inference.** The reason is concrete: services run through `tsx`/esbuild, which
does not emit `design:paramtypes` decorator metadata, so Nest cannot resolve a
class from its constructor parameter type. This is stated in the code at
`apps/services/identity/src/app.module.ts:36-40` and again at
`apps/services/growth/src/messaging/consumer.ts:38`.

Consequences you will hit:

- Injected dependencies carry `@Inject(TOKEN)` even when the token *is* the class:
  `constructor(@Inject(AuthService) private readonly auth: AuthService)`
  (`apps/services/identity/src/auth/auth.controller.ts:8`).
- Providers are `useValue` or `useFactory` + `inject: [...]`, not bare classes,
  wherever a non-class dependency is involved
  (`apps/services/identity/src/app.module.ts:54-77`).
- Token style is inconsistent across services and that is fine — match the file
  you are in. identity uses exported string constants (`IDENTITY_REPO`,
  `IDENTITY_CONFIG`, `FOUNDING_VERIFIER`, `CLOCK`;
  `apps/services/identity/src/app.module.ts:15-18`); growth, signal and trading
  use `Symbol(...)` (`ACADEMY_REPO`,
  `apps/services/growth/src/academy/academy.repo.ts:107`; `GROWTH_CONFIG`,
  `apps/services/growth/src/common/config.ts:50`).

Two module shapes exist:

| Shape | Where | Why |
|---|---|---|
| **Module factory** — `createAppModule(deps)` returning a class | `apps/services/identity/src/app.module.ts:41-82` | Tests inject a `MemRepo`, a fake verifier and a fake clock without `@nestjs/testing` (`apps/services/identity/test/app.test.ts:18-23`) |
| **Static `@Module`** with `useValue` providers built from the module-level `db` | `apps/services/growth/src/app.module.ts:35-63` | Simpler; growth's tests exercise services directly rather than over HTTP |

Prefer the factory for anything new: it makes the HTTP surface testable.

### 4.2 The repository seam: interface + Drizzle + in-memory double

Three parts, always:

1. **The interface** — the only thing services depend on. Documented per method.
   `export interface IdentityRepo { ... }`
   (`apps/services/identity/src/db/repo.ts:58-91`);
   `export interface AcademyRepo`
   (`apps/services/growth/src/academy/academy.repo.ts:91-106`, labelled
   "DI seam ... tests inject an in-memory impl").
2. **The Drizzle implementation** — `PgIdentityRepo`
   (`apps/services/identity/src/db/repo.ts`), `DrizzleAcademyRepo`
   (`apps/services/growth/src/academy/academy.repo.ts:182`).
3. **The in-memory double** in `test/` — `implements` the same interface, so
   forgetting to update it is a **compile error, not a silent gap**:
   `MemRepo implements IdentityRepo`
   (`apps/services/identity/test/mem-repo.ts:30`), `MemRepo implements
   BillingRepo` (`apps/services/billing/test/mem-repo.ts:16`), `MemRepo
   implements TradingRepo` (`apps/services/trading/test/mem-repo.ts:17`),
   `MemSignalRepo implements SignalRepo`
   (`apps/services/signal/test/mem-repo.ts:10`), `MemAcademyRepo implements
   AcademyRepo, AcademyTxOps` (`apps/services/growth/test/academy-mem-repo.ts:15`).

The doubles reimplement the *guards*, not just the storage — keyset pagination
ordering, revocation predicates, partial-unique-index behaviour
(`apps/services/identity/test/mem-repo.ts:16-27`;
`apps/services/signal/test/mem-repo.ts:9`).

### 4.3 zod validation at every boundary

Nothing typed crosses a boundary without being parsed.

- **Service inbound**: controllers accept `@Body() body: unknown` and delegate
  (`apps/services/identity/src/auth/auth.controller.ts:12`). The service
  `safeParse`s and converts failure into a 422 `validation_failed`
  (`apps/services/identity/src/auth/auth.service.ts:66-69`).
- **BFF inbound**: the route re-validates the browser's body before forwarding
  (`apps/web/app/api/app/auth/login/route.ts:13-14`).
- **BFF outbound**: upstream responses are parsed, not trusted —
  `return schema.parse(json)` (`apps/web/lib/api.ts:25`), and errors are parsed
  as `ApiError` with a fallback (`apps/web/lib/api.ts:21-24`).
- **Server components**: `serviceGet` parses too, and a 401 redirects to login
  (`apps/web/lib/session.ts:69-86`).
- Even the E2E setup parses (`CheckoutRes.parse`,
  `apps/web/e2e/platform-app.setup.ts:18`).

Schemas live in `packages/contracts/src/index.ts` and nowhere else. If a shape
crosses a process boundary, it belongs there.

### 4.4 The error contract: `ApiExceptionFilter` and its two throwables

Every service has an `src/common/errors.ts` exporting a `@Catch()`
`ApiExceptionFilter`, registered as `APP_FILTER`
(`apps/services/identity/src/app.module.ts:76`). Its job is absolute: whatever
is thrown, the client receives the contracts `ApiError` shape
(`{error_code, message, remediation?}`) and never a raw internal error.

**There are two throwable styles. Match the service you are editing.**

| Style | Services | Construct | Filter behaviour |
|---|---|---|---|
| `ApiException extends HttpException` | identity, billing | `throw new ApiException(422, "validation_failed", msg, remediation?)` (`apps/services/identity/src/common/errors.ts:5-14`) | Passes through any `HttpException` body that already has `error_code`, otherwise rewrites to `{error_code:"internal"}`; an unknown throwable is `console.error`-logged and becomes a bare 500 (`apps/services/identity/src/common/errors.ts:25-38`) |
| `ApiHttpError` + an `apiError()` factory | growth, signal, trading | `throw apiError(422, "validation_failed", msg, remediation?)` (`apps/services/growth/src/common/errors.ts:12-28`) | `ApiHttpError` → its own status and body; a plain Nest `HttpException` 404 becomes `early_access_not_found`, anything else `internal`; unknown throwables go through Nest's `Logger` then a 500 (`apps/services/growth/src/common/errors.ts:30-54`) |

growth, signal and trading also export `zodDetails(error)` — a compact summary
of up to three zod issues, suitable as the `message` of a validation failure
(`apps/services/growth/src/common/errors.ts:58-63`).

`error_code` values come from the fixed set of 31 codes at
`packages/contracts/src/index.ts:9-41`. Never invent an ad-hoc string. Add a
`remediation` when the caller can act on it
(`apps/services/identity/src/auth/auth.service.ts:82-90`).

Tests assert on this contract directly, not on messages
(`apps/services/identity/test/auth.test.ts:28-37`).

### 4.5 All events go through the outbox

No service publishes to Kafka from a request handler. The pattern:

1. The domain write and the `outbox` row commit in **one transaction**:
   `await this.db.transaction(async (tx) => { tx.insert(auditLog)...; tx.insert(outbox)... })`
   (`apps/services/identity/src/db/repo.ts:195-204`).
2. A relay on a 2 s timer fetches `sent_at IS NULL`, publishes, marks sent
   (`apps/services/identity/src/outbox/relay.ts:4`, `:39-70`). Kafka being down
   warns once per 30 s and keeps retrying; it never crashes and never blocks the
   HTTP path (`:7-11`, `:71-80`).
3. Envelopes are built by `makeEnvelope(type, payload)` →
   `{event_id, type, occurred_at, tenant_id, payload}`
   (`apps/services/identity/src/outbox/outbox.service.ts:8-16`;
   `packages/contracts/src/index.ts:236-243`).
4. Topic strings are only ever `TOPICS.*`
   (`packages/contracts/src/index.ts:245-252`); helper wrappers exist per topic
   (`auditEvent`, `identityEvent`,
   `apps/services/identity/src/outbox/outbox.service.ts:19-26`).

Consumers are at-least-once and idempotent by design — see the comment at
`apps/services/growth/src/messaging/consumer.ts:25-29`.

Known exception, do not copy it: signal-svc's outbox writes are **not** in a
transaction with its state changes.

### 4.6 Money is integer minor units

Every monetary value that crosses an API boundary is an integer count of USD
cents, named `*_usd_minor`, and typed `z.number().int()` — `total_usd_minor`
(`packages/contracts/src/index.ts:357`), `amount_usd_minor` (`:370`),
`fee_usd_minor` (`:552`), `rpl_usd_minor`/`fees_usd_minor` (`:587-588`),
`equity_usd_minor` (`:612`). The invariant is stated at
`packages/contracts/src/index.ts:383-385`. `PAPER_STARTING_BALANCE_USD_MINOR =
10_000_00` (`:623`).

Instrument **prices** are the exception: floats, rounded to the per-symbol
`precision` from `SYMBOLS` (`packages/contracts/src/index.ts:391-399`). Never
mix the two in one expression without an explicit conversion. The property test
in trading exists to police exactly this
(`apps/services/trading/test/reconciliation.property.spec.ts`).

### 4.7 UTC everywhere

- Containers set `TZ: UTC` (`infra/compose/docker-compose.yml:42`).
- Timestamps are `timestamptz` in DDL
  (`apps/services/identity/src/db/migrate.ts:12`) and
  `timestamp(..., { withTimezone: true })` in Drizzle
  (`apps/services/identity/src/db/schema.ts:21`).
- Wire format is ISO-8601 strings, produced by `.toISOString()`
  (`apps/services/identity/src/outbox/outbox.service.ts:12`).
- Calendar days are `"YYYY-MM-DD"` **strings**, never `Date` — the `AcademyDate`
  regex (`packages/contracts/src/index.ts:829`) and rows like `lastActiveDate`
  (`apps/services/growth/src/academy/academy.repo.ts:28`).
- Postgres is initialised with `--locale=C` so index ordering never depends on
  host locale (`infra/compose/docker-compose.yml:59-60`).

### 4.8 Injectable clocks

`new Date()` in business logic is a bug. The clock is a constructor parameter
(`apps/services/identity/src/auth/auth.service.ts:50`), provided as the `CLOCK`
token (`apps/services/identity/src/app.module.ts:44`, `:58`), and replaced with
`FakeClock` in tests (`apps/services/identity/test/helpers.ts:18-30`).

---

## 5. How to add things

### 5.1 A new HTTP endpoint on an existing service

Worked shape: `GET /v1/me/foo` on identity.

| # | File | Change |
|---|---|---|
| 1 | `packages/contracts/src/index.ts` | Add the request/response zod schemas next to the existing group, plus `export type Foo = z.infer<typeof FooRes>`. Reuse an existing `ErrorCodes` entry or add one to `:9-41`. |
| 2 | `apps/services/<svc>/src/db/repo.ts` (growth: `src/<feature>/<feature>.repo.ts`) | Add the method to the **interface** with a one-line comment on the guard it enforces, then implement it on the Drizzle class. |
| 3 | `apps/services/<svc>/test/mem-repo.ts` | Implement the same method. Skipping this is a type error, which is the point. |
| 4 | `apps/services/<svc>/src/<feature>/<feature>.service.ts` | `safeParse` the input and convert failure into a 422 `validation_failed`. identity/billing: `throw new ApiException(422, "validation_failed", parsed.error.issues[0]?.message ?? "Invalid input.")` — copy `apps/services/identity/src/auth/auth.service.ts:66-69`. growth/signal/trading: `throw apiError(422, "validation_failed", zodDetails(parsed.error))` — see §4.4. |
| 5 | `apps/services/<svc>/src/<feature>/<feature>.controller.ts` | `@Body() body: unknown` / `@Req() req: HttpRequest`, delegate to the service, no logic. Use `@HttpCode(200)` on POSTs that are not creations (`apps/services/identity/src/auth/auth.controller.ts:11`). |
| 6 | `apps/services/<svc>/src/app.module.ts` | Only if the controller is new: add it to `controllers[]`, and register any new dependency with an explicit token. |
| 7 | `apps/web/app/api/<path>/route.ts` | The BFF hop. Re-validate the body, forward, map errors. Public/growth/billing calls use `apps/web/lib/api.ts`; member calls use `serviceGet` or the proxy helpers in `apps/web/app/api/app/_lib/proxy.ts`. Set `export const dynamic = "force-dynamic"` for anything session-dependent (`apps/web/app/api/app/auth/login/route.ts:7`). |
| 8 | `apps/services/<svc>/test/<feature>.{spec,test}.ts` | Unit test through the service with the mem repo; add a fastify-inject case to `test/app.test.ts` if the route shape matters. |
| 9 | `docs/engineering/05-api-reference.md` | Add the row. |

### 5.2 A new database table

Order matters; each step has a distinct consumer.

1. **Contract** — `packages/contracts/src/index.ts`: the API shape that exposes
   the table, if any. Money → `*_usd_minor` integers; days → date strings.
2. **`src/db/schema.ts`** — the Drizzle model. Indexes go in the third
   `pgTable` argument: `(t) => [index("foo_bar_idx").on(t.bar, t.createdAt)]`
   (`apps/services/identity/src/db/schema.ts:24-38`). Note Drizzle maps
   `citext` as `text` — the comment at `:11-12` explains why that is safe here.
3. **`src/db/migrate.ts`** — append idempotent DDL to the `DDL` template string:
   `CREATE TABLE IF NOT EXISTS ...`, `CREATE INDEX IF NOT EXISTS ...`. This runs
   on every boot (`apps/services/identity/src/db/migrate.ts:52-61`), before Nest
   starts (`apps/services/identity/src/main.ts:17`). For a column on an existing
   table use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, as growth does
   (`apps/services/growth/src/db/migrate.ts:22`, `:24`).
4. **`infra/sql/<svc>/000N_<name>.sql`** — a **new** numbered file. Never edit an
   applied one: `scripts/db.mjs` stores a sha256 prefix in `schema_migrations`
   and hard-fails with *"Applied migrations are immutable"*
   (`scripts/db.mjs:298-313`). Follow the house style of `0001_init.sql`:
   `\set ON_ERROR_STOP on`, `BEGIN; ... COMMIT;`, and a `COMMENT ON` for the
   table and every non-obvious column
   (`infra/sql/identity/0001_init.sql:13-33`). The header must repeat the
   lockstep warning: this file and `migrate.ts` create identical objects and
   both must change together (`infra/sql/identity/0001_init.sql:4-10`).
5. **`scripts/db.mjs` `CRITICAL`** — if absence would be silent corruption
   rather than a loud crash, add the table and its load-bearing indexes to the
   service's entry (`scripts/db.mjs:49-100`). That is what `pnpm db:verify`
   checks.
6. **Repo + mem repo + tests** — as in §5.1.
7. **`docs/engineering/02-data-model.md`** — the table, columns, indexes and why.

Verify: `pnpm db:plan` (shows it pending) → `pnpm db:apply` → `pnpm db:verify`.
Then `pnpm db:apply` again and confirm `Already up to date.`

### 5.3 A new Kafka event

1. **`packages/contracts/src/index.ts`** — add the `type` string to the relevant
   event-name map (`IDENTITY_EVENTS` `:255-258`, `PAYMENT_EVENTS` `:261-270`,
   `EARLY_ACCESS_EVENTS` `:273-276`, `REFERRAL_EVENTS` `:313-316`,
   `SIGNAL_EVENTS` `:493-496`, `TRADE_EVENTS` `:617-621`, `ACADEMY_EVENTS`
   `:948-956`). Document the payload fields in the same comment style as the
   neighbours. Reuse one of the six existing topics
   (`packages/contracts/src/index.ts:245-252`) — a new topic needs an
   infrastructure decision, not a code change.
2. **Producer** — build the row with the service's topic helper
   (`identityEvent(...)`,
   `apps/services/identity/src/outbox/outbox.service.ts:24-26`) and pass it into
   the same repo call that performs the domain write, so both land in one
   transaction (`apps/services/identity/src/db/repo.ts:195-204`). Never call the
   Kafka producer from a handler.
3. **Consumer** — add the topic to `SUBSCRIBED` if it is not already there
   (`apps/services/growth/src/messaging/consumer.ts:17-23`) and handle the new
   `type` in the service the consumer bridges to. Handlers must be idempotent:
   delivery is at-least-once (`:25-29`).
4. **Test** — assert the outbox row, not Kafka. The mem repos expose
   `outboxRows` / `outbox` for exactly this
   (`apps/services/identity/test/mem-repo.ts:35`).
5. **Docs** — the event table in [architecture](./01-architecture.md) and the
   sequence in [flows](./03-flows.md).

Topics are auto-created on first publish locally
(`KAFKA_AUTO_CREATE_TOPICS_ENABLE`,
`infra/compose/docker-compose.yml:96-98`) — nothing to provision.

### 5.4 A new page in the web app

| # | File | Change |
|---|---|---|
| 1 | `apps/web/app/(marketing)/<path>/page.tsx` or `app/(platform)/app/(member)/<path>/page.tsx` | Server component by default. Export `metadata`; every route's metadata is a static object with no I/O, which is what makes `htmlLimitedBots: /.*/` free (`apps/web/next.config.ts:54-62`). |
| 2 | `apps/web/lib/content.ts` | Copy as data, not JSX strings, if the page is marketing. |
| 3 | Data | Public data → `growth`/`billing` helpers in `apps/web/lib/api.ts`. Member data → `serviceGet(IDENTITY_URL \| SIGNAL_URL \| TRADING_URL, path, Schema)` (`apps/web/lib/session.ts:69-86`). Never `fetch` a service without parsing the response. |
| 4 | `apps/web/app/sitemap.ts` | Add to `ROUTES` **only if indexable**. Status pages, `/offline`, `/app/**` and `/api/**` are deliberately absent (`apps/web/app/sitemap.ts:7-10`). |
| 5 | `apps/web/e2e/helpers.ts` | Add to `MARKETING_ROUTES` (`:10-31`) so the nav, a11y, responsive and SEO suites pick it up automatically. |
| 6 | `apps/web/next.config.ts` | Add a redirect if you are replacing an existing URL — see the existing block for the 308-vs-307 reasoning (`:66-93`). |

Member routes are gated by `apps/web/middleware.ts` automatically; only
`/app/login` and `/app/redeem` are public (`:8`).

### 5.5 A new UI primitive

1. **Tokens first.** If it needs a colour, space, radius, shadow or duration
   that does not exist, add the custom property to `packages/ui/tokens.css`
   (`:root` block, and the `[data-theme="light"]` remap at `:71-99` if it must
   differ per theme). **Never put a literal in a component.**
2. **Component** — append to `packages/ui/src/index.tsx`. House style: inline
   style objects driven by `var(--token)`, plus a `hp-*` class as a hook only;
   variant maps as module-level consts (`btnBase :10`, `btnSizes :17`,
   `btnVariants :22`); `cx()` for class joining (`:3`). Keep it server-safe — no
   hooks unless genuinely interactive; `BrandCard` (`:218`) is the reference for
   a polymorphic, hook-free primitive.
3. **Class-based styling** goes in the right sheet: `ui.css` for utility
   surfaces, `brand.css` for the theme-invariant poster language,
   `loaders.css` for animated states. All three must include a
   `prefers-reduced-motion` branch if they animate (`packages/ui/loaders.css:121`).
4. **Export** — `packages/ui/package.json` `exports` already maps `.` to
   `src/index.tsx` (`:5`); a new CSS file needs a new export entry there.
5. **Consume** — import from `@heropips/ui` in `apps/web`. There is no build
   step; Next transpiles the workspace source.
6. **Test** — the package has no unit tests (`packages/ui/package.json:7` is
   `echo ok`). Cover it in `apps/web/e2e/loaders.spec.ts` or
   `theme.spec.ts` instead.

Trap: `Skeleton` emits `.hp-skeleton`, whose shimmer is defined in
`apps/web/app/globals.css:111`, not in the package. If your primitive needs a
keyframe, put it in the package's CSS, not the app's.

### 5.6 A new environment variable

Six places. Miss one and it fails in a different environment than the one you
tested.

1. **`apps/services/<svc>/src/common/config.ts`** — add the field to the config
   type with a doc comment saying what happens when it is unset, and read it in
   `loadConfig(env)` with an explicit default. Follow the local convention:
   `optional()` returning `string | null` for "feature off when unset"
   (`apps/services/growth/src/common/config.ts:27-30`), a plain `??` default for
   "always has a value" (`apps/services/identity/src/common/config.ts:16-30`).
   Validate shape eagerly if a bad value is unrecoverable — trading throws on a
   malformed `CRED_KEY` (`apps/services/trading/src/common/config.ts:24-27`).
   Web-side vars go in `apps/web/lib/api.ts` / `lib/session.ts` /
   `next.config.ts` as appropriate.
2. **`infra/compose/docker-compose.yml`** — add to the service's `environment`
   as `VAR: ${VAR:-default}`. Never hardcode. If it is a dev-only switch, give
   it an empty default here and set the dev value in
   `infra/compose/docker-compose.local.yml` with a comment
   (`EARLY_ACCESS_DEV_CODE` is the model: `docker-compose.yml:167-168` +
   `docker-compose.local.yml:47-49`).
3. **`.env.local.example`** — under the right `# ---- <area>` heading, with a
   comment explaining the local value.
4. **`.env.staging.example`** and **`.env.production.example`** — same key, with
   a placeholder that preflight will reject if left as-is.
5. **`scripts/preflight.mjs`** — add the key to `CONFIG_SPEC[<service>]`, under
   `required` (service cannot function without it) or `productionOnly` (works
   locally on a default, must be explicit beyond) (`:39-82`). If a dev value
   would be dangerous elsewhere, add an entry to `FORBIDDEN_BEYOND_LOCAL` with a
   `why` that states the blast radius (`:88-103`) — the `why` exists because
   "insecure value" with no reason gets overridden.
6. **`docs/engineering/07-infrastructure.md`** — the env-var table.

Only then: does it need a `NEXT_PUBLIC_` prefix? If yes, read
[trap 1](#9-traps-for-new-developers) first — it is baked at build time.

---

## 6. Testing

### 6.1 Layout and runner

| Package | Runner | Include glob | Command |
|---|---|---|---|
| identity | vitest 2 + `unplugin-swc` | `test/**/*.test.ts` (`apps/services/identity/vitest.config.ts:17`) | `pnpm --filter @heropips/identity-svc test` |
| billing | same | `test/**/*.test.ts` | `pnpm --filter @heropips/billing-svc test` |
| growth | same | `test/**/*.spec.ts` (`apps/services/growth/vitest.config.ts:7`) | `pnpm --filter @heropips/growth-svc test` |
| signal | same | `test/**/*.spec.ts` | `pnpm --filter @heropips/signal-svc test` |
| trading | same | `test/**/*.spec.ts` | `pnpm --filter @heropips/trading-svc test` |
| web (unit) | vitest, no swc | default, minus `e2e/**` and `.next/**` (`apps/web/vitest.config.ts:6`) | `pnpm --filter @heropips/web test` |
| web (E2E) | Playwright | `apps/web/e2e/**` | `pnpm --filter @heropips/web e2e` |
| contracts, ui, mock | none | — | `test` is `echo ok` |

**The `.test.ts` vs `.spec.ts` split is load-bearing.** identity and billing
only collect `*.test.ts`; growth, signal and trading only collect `*.spec.ts`.
Name a new file with the wrong suffix and it is silently never run. Check the
service's `vitest.config.ts` before creating a file.

The swc plugin is mandatory for services: it emits the decorator metadata that
NestJS classes pulled into a test need
(`apps/services/identity/vitest.config.ts:5-14`, and the comment at
`apps/services/growth/vitest.config.ts:10`).

`turbo.json:6` makes `test` depend on `^build`. Since nothing in the repo emits
(see [trap 2](#9-traps-for-new-developers)), that dependency is currently inert.

### 6.2 The in-memory repo pattern, worked

The default unit test constructs the service by hand with fakes. No
`@nestjs/testing`, no database, no container.

```ts
// apps/services/identity/test/auth.test.ts:13-19
function makeAuth(): AuthHarness {
  const repo = new MemRepo();                                    // test/mem-repo.ts:30
  const clock = new FakeClock();                                 // test/helpers.ts:18
  const verifier = new FakeVerifier();                           // test/helpers.ts:33
  const auth = new AuthService(repo, testConfig(), verifier, clock.now);
  return { auth, repo, clock, verifier };
}
```

The four collaborators map one-to-one onto the DI tokens in
`apps/services/identity/src/app.module.ts:54-64`, which is why the seam works:

- `MemRepo implements IdentityRepo` — real ordering and guard semantics, no SQL
  (`apps/services/identity/test/mem-repo.ts:16-27`), and public arrays
  (`users`, `sessions`, `auditRows`, `outboxRows`, `:31-35`) so a test asserts
  persisted state directly. Helper `auditActions()` returns audit actions in
  insertion order (`:163-166`).
- `testConfig(overrides)` returns a complete `IdentityConfig` with a sentinel
  `earlyAccessCodes: ["HERO-EARLY-1"]` (`apps/services/identity/test/helpers.ts:5-15`).
- `FakeClock` is a mutable injectable clock: `now()` plus `advance(ms)`
  (`:18-30`) — that is how session sliding-expiry and TTL expiry are tested
  without waiting.
- `FakeVerifier implements FoundingVerifier`, seeded with `addPaidOrder`, with a
  `fail` flag to simulate billing being down, and a `calls` log
  (`:33-50`).
- Error assertions go through the contract, not the message
  (`apps/services/identity/test/auth.test.ts:28-37`).

For HTTP-surface coverage, build the real app over Fastify's `inject` — no
listening socket:

```ts
// apps/services/identity/test/app.test.ts:18-24
app = await NestFactory.create<NestFastifyApplication>(
  createAppModule({ repo, config: testConfig(), verifier }),
  new FastifyAdapter(), { logger: false },
);
await app.init();
await app.getHttpAdapter().getInstance().ready();
// then: app.getHttpAdapter().getInstance().inject({ method, url, payload })
```

trading uses the same shape with domain-specific fakes: `FakeQuotes implements
QuoteProvider` with scripted prices you mutate between orders to move the market,
and `FakeIntrospector implements Introspector` as a token→user map
(`apps/services/trading/test/fakes.ts:6-26`, `makeUser` factory at `:28-38`).

### 6.3 The trading property test

`apps/services/trading/test/reconciliation.property.spec.ts` is the only
property-based test in the repo, and it defends the money invariant.

It runs **500 seeded iterations** (`:35`). Each one uses a `mulberry32` PRNG
seeded from the iteration index, so a failure is exactly reproducible
(`:6-14`, `:36`). Each iteration walks 5–30 random market fills across all seven
instruments at prices randomised ±10 % around a base and rounded to each
symbol's `precision` (`:17-31`, `:78`), then flattens every position at fresh
random prices (`:87-89`).

Three invariants, **tolerance zero cents** (`:92-99`):

1. `balance === PAPER_STARTING_BALANCE_USD_MINOR + Σ realized PnL` — no cents
   invented or lost.
2. `feesRealized === feesCharged` — every fee cent charged at fill time is
   realized exactly once across close and entry shares.
3. `equity === balance` once no positions remain — the unrealized term is empty.

If you change `applyFill` or `feeUsdMinor` in
`apps/services/trading/src/pnl/engine.ts`, this is the test that will catch a
rounding drift, and the seed in the failure output reproduces it exactly.

### 6.4 Playwright E2E

Config: `apps/web/playwright.config.ts`. `testDir ./e2e`, artifacts to
`./e2e/.artifacts`, `fullyParallel`, `retries: 1`, `expect.timeout` 10 s,
`trace: "on-first-retry"` (`:12-22`). The stack is **externally managed** —
there is no `webServer` block, so you must have one running (`:6-9`).

Three projects (`:23-51`):

| Project | Matches | Notes |
|---|---|---|
| `setup` | `platform-app.setup.ts` | Mints a real founding member and saves `storageState` |
| `chromium` | everything except the setup file | 1440×900, `dependencies: ["setup"]` |
| `mobile` | `responsive.spec.ts`, `nav.spec.ts` only | 390×844, `isMobile`, `hasTouch`, DPR 3 |

**The auth setup project** (`apps/web/e2e/platform-app.setup.ts`) is worth
reading in full — it is the executable specification of the purchase flow:
`POST /api/founding/checkout` → parse `CheckoutRes` → `POST
/simulate/<id>/pay` on the mock → poll `/api/founding/status` until
`seat_state === "granted"` (30 s budget) → `POST /api/app/auth/redeem` with the
order id as the access code → `request.storageState()` to
`e2e/.auth/member.json` (`:16-51`). A **founding** member specifically, because
live connection slots are enforced against the founding entitlement (`:10-11`).

Shared helpers in `apps/web/e2e/helpers.ts`: `E2E_PASSWORD` (10+ chars per
`RedeemAccessReq`, `:4`), `ACCESS_CODE` defaulting to `hp_dev_alpha` and
overridable via `E2E_ACCESS_CODE` (`:7`), `MARKETING_ROUTES` (`:10-31`),
`uniqueEmail()` (`:34-36`), `redeem()`/`loginAs()` form drivers (`:39-59`),
`noHscroll()` (`:62-68`), and JSON-LD extraction (`:71-98`).

Running locally:

```bash
BASE_URL=http://localhost:3000 pnpm --filter @heropips/web e2e
BASE_URL=http://localhost:3000 pnpm --filter @heropips/web e2e:ui
BASE_URL=http://localhost:3000 pnpm --filter @heropips/web e2e -- --project=mobile
BASE_URL=http://localhost:3000 pnpm --filter @heropips/web e2e -- e2e/nav.spec.ts
```

**Always pass `BASE_URL`.** The default is `http://localhost:3100`
(`apps/web/playwright.config.ts:10`), which matches neither the container (3000)
nor `next dev` (`-p 3000`, `apps/web/package.json:6`). CI sets it to 3000
(`.github/workflows/e2e.yml:27-28`).

E2E in CI is opt-in: `workflow_dispatch` or the literal `e2e` label on a PR
(`.github/workflows/e2e.yml:17-24`). Merges to main never run it, and because the
trigger is `pull_request: types: [labeled]`, re-pushing to an already-labelled PR
does not re-run it — you must remove and re-add the label.

The workflow deliberately does **not** run a bare `docker compose up`. It uses
the same wrapper you do — `pnpm stack:up` → `pnpm db:verify` → `pnpm db:seed` →
`pnpm --filter @heropips/web e2e` → `pnpm stack:down`
(`.github/workflows/e2e.yml:50-78`) — because the base compose file publishes no
ports and keeps the payment and mail doubles behind the `mocks` profile, so a raw
compose invocation yields a stack the browser cannot reach and a checkout flow
with no payment provider (`.github/workflows/e2e.yml:6-12`). On failure it uploads
`apps/web/e2e/.artifacts` for 7 days and dumps a terminating log snapshot via
`node scripts/stack.mjs logs --env local --no-follow` (`:62-74`).

---

## 7. Verification before pushing

Run all six from the repo root:

```bash
pnpm typecheck      # turbo typecheck  → tsc --noEmit in every package
pnpm test           # turbo test       → vitest per service, vitest per app
pnpm lint           # turbo lint       → real only for apps/web
pnpm security:scan  # secret-scan && brand-guard && pnpm audit --prod --audit-level high
pnpm db:verify      # live schema matches the migrations
pnpm docs:check     # links, anchors, path:line citations, mermaid, structure
```

What each one really covers:

- **`pnpm typecheck`** is the gate that catches what nothing else can: because
  service `build` swallows type errors ([trap 3](#9-traps-for-new-developers)),
  this is the only check standing between a service type error and main. Every
  package runs `tsc --noEmit` against `tsconfig.base.json` (strict, ES2022,
  NodeNext, `experimentalDecorators` + `emitDecoratorMetadata`). Note
  `turbo.json:7` gives `typecheck` no `dependsOn`, so it resolves source, not
  build artifacts.
- **`pnpm test`** runs the five vitest suites plus `apps/web`'s
  `vitest run --passWithNoTests` — which passes with zero tests
  (`apps/web/package.json:11`), so a deleted web unit test is invisible.
- **`pnpm lint`** is `eslint .` for `apps/web` only
  (`apps/web/package.json:10`, config at `apps/web/eslint.config.mjs`:
  `next/core-web-vitals` + `next/typescript`, with `no-explicit-any: error` and
  `no-unused-vars` allowing `_`-prefixed names, `:14-20`). All five services
  define `lint: echo ok` — there is no service linting at all.
- **`pnpm security:scan`** (`package.json:44`) is three things:
  - `scripts/secret-scan.mjs` — walks the whole repo, six patterns (PEM key,
    `AKIA…`, `sk_live_…`, Slack `xox…`, `ghp_…`, and a bare 64-hex heuristic
    that is the one that actually fires). Skips `node_modules`, `.git`, `docs`,
    `coverage`, `dist`, `.turbo`, artifacts and **any** directory starting with
    `.next`. Escape hatch is a per-line `secret-scan:allow` pragma on the
    matching line or the one above — see
    `infra/compose/docker-compose.yml:266` and
    `apps/services/trading/src/common/config.ts` for live uses. Keep it
    line-scoped; do not convert it to a file-level marker.
  - `scripts/brand-guard.mjs` — one rule, `/xyro/i`, over eight roots
    (`apps/web/{app,components,lib,public,e2e}`, `apps/services`, `packages`,
    `scripts`). **There is no pragma**; the only escape is a path regex, and
    files directly under `apps/web/` (`next.config.ts`, `playwright.config.ts`)
    plus `infra/` and `.github/` are never scanned.
  - `pnpm audit --prod --audit-level high` — **blocking here**.
- **`pnpm db:verify`** compares the live schema against `scripts/db.mjs:49-100`
  and refuses if any migration is pending.
- **`pnpm docs:check`** (`scripts/docs-check.mjs`, defaults to
  `docs/engineering`) is the guard against documentation rot. It **errors** on: a
  file with no H1, a relative markdown link that does not resolve, a
  `path/to/file.ts` citation pointing at a missing file, and a ```mermaid block
  that is unterminated, empty or declares an unknown diagram type
  (`scripts/docs-check.mjs:120-198`). It **warns** on a `#fragment` that matches
  no heading in the target, a `path:line` citation whose line exceeds the file
  length, duplicate H1s, and unbalanced brackets inside a diagram. Warnings never
  fail the run (`:20`, `:223-234`). Fenced code blocks are skipped for links but
  **not** for citations, on purpose (`:150-151`). Run it after any refactor that
  moves code: it is the only thing that catches a citation which has drifted to
  the wrong line, and it is a **blocking** CI step
  (`.github/workflows/ci.yml:40-41`), so a rename that orphans a link fails the
  build.

### What CI additionally does

`.github/workflows/ci.yml` runs **three** jobs on every push to main and every
PR, concurrency-cancelled per ref (`:3-10`).

**`verify`** (`:16-61`) — static gates, no containers, designed to fail a bad PR
in under three minutes:

```
checkout → pnpm/action-setup@v4 → node 22 (pnpm cache) → pnpm install --frozen-lockfile
→ secret-scan → brand-guard → docs-check → pnpm typecheck → pnpm lint → pnpm test
→ pnpm audit --prod --audit-level high   (advisory on a PR, blocking on main)
→ pnpm build (NEXT_TELEMETRY_DISABLED=1)
```

Everything in your local checklist above is in this job, in the same order, so a
clean local run is a good predictor. Two subtleties: the audit uses
`continue-on-error: ${{ github.event_name == 'pull_request' }}`
(`.github/workflows/ci.yml:52-56`), so a fresh upstream advisory cannot block an
unrelated fix but still has to be dealt with before it lands on main; and
`pnpm build` cannot fail on a service type error (see
[trap 3](#9-traps-for-new-developers)).

**`infra`** (`:68-145`) — the job that catches breakage only visible when
compose, the env templates and the scripts are read together. It materialises
`.env.local` from the example and renders staging/production by substituting the
`<angle>` placeholders (`:78-85`), then asserts:

| Assertion | Step | Why it exists |
|---|---|---|
| preflight passes for `local` | `:87-88` | the happy path stays green |
| compose merges in all three environments | `:90-95` | a dropped overlay or bad `${VAR}` breaks rendering, not startup |
| staging/production start **no** mock | `:100-105` | greps the rendered file for `mailpit\|nowpayments-mock` |
| staging/production publish **no** port but the edge | `:106-112` | counts `published:` keys; more than 3 (Caddy's 80, 443, 443/udp) fails |
| preflight **rejects** local values used as staging | `:118-129` | a zero exit here would mean dev credentials can reach a real environment |
| migrations + seed are idempotent | `:131-141` | runs `db apply/verify/seed` then `apply/seed/verify` again; catches a non-idempotent migration and a seed that duplicates rows |

That last one is worth internalising: **CI runs your migration twice and your
seed twice.** Write both accordingly — `IF NOT EXISTS` / `ADD COLUMN IF NOT
EXISTS` in DDL, `ON CONFLICT DO NOTHING` in seeds.

**`images`** (`:151-163`) — needs both `verify` and `infra`, main only. Builds via
`node scripts/stack.mjs build --env local`, not raw compose, so it exercises the
same overlay and env-file resolution a developer gets.

Differences from your local run:

| | Locally | CI |
|---|---|---|
| `pnpm audit` | always blocking (`package.json:44`) | advisory on a PR, blocking on main (`ci.yml:52-56`) |
| `pnpm build` | you probably skip it | runs, but see trap 3 — services cannot fail it |
| Compose/preflight/idempotency assertions | you can run the pieces by hand | the whole `infra` job, every push |
| Images | `pnpm stack:build` when you feel like it | all seven, main only |
| E2E | you run it against a live stack | separate workflow, opt-in via the `e2e` label or dispatch |
| Install | `pnpm install` | `--frozen-lockfile` — commit the lockfile |

There is no longer a gate you have to remember to run yourself: `typecheck`,
`lint`, `test`, `docs-check`, both guard scripts and `build` are all in `verify`.

---

## 8. Debugging

### One service's logs

```bash
pnpm stack:logs                                          # everything, tail 200, follow
node scripts/stack.mjs logs --env local --service identity
node scripts/stack.mjs logs --env local --no-follow      # terminating snapshot, tail 500
docker compose --project-directory infra/compose \
  -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.local.yml \
  --env-file .env.local logs -f --tail 200 identity
```

`stack.mjs logs` follows by default with `--tail 200`; add `--no-follow` for a
terminating snapshot with `--tail 500`, which is what CI uses
(`scripts/stack.mjs:251-259`). Container log rotation is 10 MB × 3
(`infra/compose/docker-compose.yml:25-29`). identity logs through Nest's built-in
logger at `["log","warn","error"]`
(`apps/services/identity/src/main.ts:25`); the other four use pino.

### Attach to Postgres

```bash
node scripts/stack.mjs exec --env local --service postgres -- psql -U hp -d hp_identity
psql postgres://hp:hp@localhost:5432/hp_identity      # host client, port published locally
```

`exec` is documented at `scripts/stack.mjs:19`, `:261-265`. Databases:
`hp_identity`, `hp_billing`, `hp_growth`, `hp_signal`, `hp_trading`
(`scripts/db.mjs:37-43`). Postgres is host-reachable only because the local
overlay publishes 5432 (`infra/compose/docker-compose.local.yml:24`) — staging
and production do not. Statements slower than 500 ms are logged by default
(`infra/compose/docker-compose.yml:72-74`).

### Inspect Kafka topics

The broker is a single-node KRaft `apache/kafka:3.7.2` with the internal
listener on `kafka:9092` and the external on `localhost:9094`
(`infra/compose/docker-compose.yml:82-102`, `docker-compose.local.yml:31`).

```bash
S="node scripts/stack.mjs exec --env local --service kafka --"
$S /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
$S /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
     --topic hp.payment.events.v1 --from-beginning --max-messages 20
$S /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
     --describe --group hp-growth-messaging
```

The six topics are `hp.payment.events.v1`, `hp.growth.events.v1`,
`hp.audit.log.v1`, `hp.signal.events.v1`, `hp.trade.events.v1`,
`hp.identity.events.v1` (`packages/contracts/src/index.ts:245-252`). The only
consumer group is `hp-growth-messaging`
(`apps/services/growth/src/messaging/consumer.ts:13`). Topics are auto-created
on first publish (`infra/compose/docker-compose.yml:96-98`), so an empty
`--list` just means nothing has published yet.

### Watch the outbox drain

```sql
-- in any service database
SELECT topic, count(*) FILTER (WHERE sent_at IS NULL) AS unsent,
       count(*) FILTER (WHERE sent_at IS NOT NULL) AS sent
FROM outbox GROUP BY topic;

SELECT id, topic, payload->>'type' AS type, created_at
FROM outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 20;
```

The relay ticks every 2 s and publishes up to 100 rows per tick
(`apps/services/identity/src/outbox/relay.ts:4`, `:43`), so a steady non-zero
`unsent` means Kafka is unreachable. That surfaces as one warning per 30 s in
the service log: `outbox relay: Kafka unavailable, will keep retrying`
(`:74-80`). In Mode B the usual cause is a missing
`KAFKA_BROKERS=localhost:9094`.

The partial index `outbox_unsent_idx ... WHERE sent_at IS NULL`
(`apps/services/identity/src/db/migrate.ts:49`) is what keeps that poll cheap;
`pnpm db:verify` asserts it exists.

### Reset local state

```bash
pnpm db:reset      # DROP ... WITH (FORCE) + CREATE for all five databases
pnpm db:apply      # re-apply every migration
pnpm db:seed       # demo data — infra/sql/seed/{growth,trading}.sql
```

`reset` is local-only and requires `--force`, already baked into the script
(`package.json:40`, guards at `scripts/db.mjs:428-430`). It refuses any other
environment. `seed` refuses production (`scripts/db.mjs:414`) and silently skips
services with no seed file (`:419`) — today only growth and trading have one.
Both seeds are `BEGIN`/`COMMIT` wrapped and idempotent via
`ON CONFLICT DO NOTHING`, so re-seeding is a no-op, and every row they create is
prefixed `demo-` / `demo+` so it is trivially identifiable; the cleanup
`DELETE` statements are in each file's header comment
(`infra/sql/seed/growth.sql`, `infra/sql/seed/trading.sql`). `trading.sql` uses
the literal `user_id = 'demo-user'`, deliberately not a UUID, so seeded rows can
never collide with a real account.

Full teardown including volumes:

```bash
pnpm stack:down                                     # local: implies -v
node scripts/stack.mjs down --env local --keep-data # keep pgdata + kafkadata
```

Volume removal is opt-out locally and unavailable elsewhere, because `down -v`
against production loses the database (`scripts/stack.mjs:226-233`).

### Other useful things

- `pnpm stack:config` renders the fully merged compose file — the fastest way to
  see which overlay won a value.
- `pnpm preflight` on its own is a cheap "what is wrong with my machine" check.
- `pnpm db:plan` is read-only and safe anywhere (`scripts/db.mjs:8`).
- Attach a Node debugger in Mode B: `node --inspect node_modules/.bin/tsx
  src/main.ts` from the service directory.

---

## 9. Traps for new developers

Each of these is a real property of this codebase, with the evidence.

1. **`NEXT_PUBLIC_*` is inlined at build time. Restarting will not pick up a
   change.** Stated in `.env.local.example:35` and again in
   `infra/compose/docker-compose.yml:293-294`. Changing
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CHAT_WS_URL`, `NEXT_PUBLIC_LAUNCH_MODE`,
   `NEXT_PUBLIC_GA4_ID` or `NEXT_PUBLIC_CLARITY_ID` requires
   `node scripts/stack.mjs build --env local --service web` and a restart, not
   just a restart. Two things make this worse: the CSP is assembled from these
   at build time (`apps/web/next.config.ts:16-22`, `:39`), so a stale value
   silently blocks the chat WebSocket; and `NEXT_PUBLIC_LAUNCH_MODE` gates CTAs,
   so the site can render the wrong launch phase.

2. **No service runs compiled output — but only two of the five actually emit
   nothing.** The `build` script is `tsc -p tsconfig.build.json` everywhere, and
   `tsconfig.build.json` extends the service `tsconfig.json`, which sets
   `"noEmit": true` (`apps/services/identity/tsconfig.json:1`). **identity and
   billing inherit that and write zero files**
   (`apps/services/identity/tsconfig.build.json`). **growth, signal and trading
   override it with `"compilerOptions": { "noEmit": false }`**
   (`apps/services/growth/tsconfig.build.json`,
   `apps/services/signal/tsconfig.build.json`,
   `apps/services/trading/tsconfig.build.json`) and do produce a `dist/` tree —
   28, 19 and 24 `.js` files respectively on disk today.

   **Nothing consumes any of it.** `dist/` is gitignored (`.gitignore:3`),
   excluded from every image build (`.dockerignore:11`), and every service
   container's `CMD` is `["node_modules/.bin/tsx","src/main.ts"]`, with `start`
   likewise `tsx src/main.ts`. So the operational conclusion holds — services run
   TypeScript through `tsx` at runtime, there is no compiled artifact in any
   image, and a syntax error surfaces at container boot rather than at build — but
   do not claim all five inherit `noEmit`, and do not be surprised by a stale
   `dist/` in a service directory. It is dead weight, not a build product.

3. **Service `build` scripts swallow failures.** The script is
   `tsc -p tsconfig.build.json || echo build-noop` in all five services. A type
   error prints `build-noop` and exits 0, so it **cannot** fail `pnpm build`, nor
   CI's `Build all` step (`.github/workflows/ci.yml:58-61`). `pnpm typecheck`
   (`ci.yml:43-44`) is the only thing standing between a service type error and
   main. Never treat a green `pnpm build` as evidence a service compiles.

4. **`packages/contracts` is consumed as raw TypeScript.** `main`/`exports` point
   at `./src/index.ts` and `build` is `echo ok`
   (`packages/contracts/package.json:5-8`); `packages/ui` is the same with
   `./src/index.tsx` (`packages/ui/package.json:5`, `:7`). This works because
   Next transpiles workspace source and services run under `tsx`. It also means
   every service Dockerfile must copy `packages/contracts` into the **runtime**
   image, and any consumer that is neither Next nor `tsx` will fail to import
   it. Editing a contract needs no build step — but it does immediately affect
   all six apps' typecheck.

5. **growth's `waitlist_entries` is the early-access table under its old name.**
   The Drizzle export is `earlyAccessEntries` but the physical table is
   `waitlist_entries`, with the comment "physical name kept from the original
   waitlist implementation — renaming requires a data migration"
   (`apps/services/growth/src/db/schema.ts:20-21`; DDL at
   `apps/services/growth/src/db/migrate.ts:7-24`; `scripts/db.mjs:60` and `:78`
   verify it under the physical name). When you grep for early access, grep both
   names. The public URLs were renamed and the old ones 308-redirect
   (`apps/web/next.config.ts:75-77`).

6. **Two referral systems exist and are not connected.**
   - *Waitlist referrals*: `waitlist_entries.referred_by`
     (`apps/services/growth/src/db/migrate.ts:12`), single level, keyed by
     entry id, and its only effect is moving a queue position —
     `position = max(1, base - floor(referrals / REFERRALS_PER_JUMP) * JUMP_SIZE)`
     with `REFERRALS_PER_JUMP = 3`, `JUMP_SIZE = 25`
     (`packages/contracts/src/index.ts:298-299`).
   - *The MLM closure tree*: `referral_edges` / `referral_ancestors` /
     `referral_commissions` (`scripts/db.mjs:64-66`), up to 10 levels
     (`REFERRAL.MAX_LEVELS`, `packages/contracts/src/index.ts:302-311`), keyed by
     **identity user ids**, paying `[2000,1000,500,300,200]` bps.
   No code links a waitlist entry to a referral edge. A change to one does
   nothing to the other; wiring them is a product decision, not a refactor.

7. **Local containers run `NODE_ENV=production`.** `.env.local.example:13` and
   `infra/compose/docker-compose.yml:40`. Consequences: the session cookie is
   `Secure` (`apps/web/lib/session.ts:23`) — over plain `http://localhost:3000`
   Chrome still accepts it, but a non-localhost host will not; the CSP drops
   `'unsafe-eval'` (`apps/web/lib/security-headers.ts`); and growth's dev
   verification-code default flips off, so the env var — not `NODE_ENV` — is the
   real switch, and setting both logs a loud warning
   (`apps/services/growth/src/common/config.ts:20-40`). Conversely `pnpm dev`
   leaves `NODE_ENV` unset, so growth hands out `123456` even with no env var
   set (`:46`). Never infer environment from `NODE_ENV` in this repo; read the
   specific variable.

8. **The `.test.ts` / `.spec.ts` suffix split is silent.** identity and billing
   collect `test/**/*.test.ts`; growth, signal and trading collect
   `test/**/*.spec.ts`. A misnamed file is never executed and nothing complains.

9. **Playwright's default `BASE_URL` points at a port nothing listens on.** It
   is `http://localhost:3100` (`apps/web/playwright.config.ts:10`) and the
   comment at `:7` claims that is the `pnpm dev` port, but `apps/web`'s dev
   script is `next dev -p 3000` (`apps/web/package.json:6`) and the container
   publishes 3000. Always pass `BASE_URL` explicitly.

10. **Both `.env` and `.env.local` are honoured locally, with layering.**
    `scripts/stack.mjs:80-93` accepts a bare `.env` as a fallback for local
    only, and both `scripts/preflight.mjs:407-411` and `scripts/db.mjs:149-162`
    layer `.env` under `.env.<env>` with the real process env winning over both.
    Staging and production have no fallback, by design. There is also a legacy
    44-line `.env.example` at the root, distinct from `.env.local.example` —
    `.env.local.example` is the one to copy.

11. **`pnpm audit` is blocking locally, and on main, but advisory on a PR.**
    Locally it is the third leg of `security:scan` (`package.json:44`). In CI it
    carries `continue-on-error: ${{ github.event_name == 'pull_request' }}`
    (`.github/workflows/ci.yml:52-56`), so a fresh upstream advisory cannot block
    an unrelated fix — but the same commit will fail the job once it is pushed to
    main. Fix it before you merge, not after. Fixes go in the root
    `pnpm.overrides`, which already carries four entries with a comment
    explaining the drop-when-patched rule (`package.json:57-64`).

12. **`brand-guard.mjs` has no pragma and a narrow scan scope.** Unlike
    `secret-scan.mjs`, there is no per-line escape — the only way to permit a
    legitimate mention of the retired brand is to add a path regex. And it walks
    only eight roots, so `apps/web/*.ts` root files, `infra/` and `.github/` are
    never scanned.

13. **No container image declares a `HEALTHCHECK`.** Readiness is asserted at the
    compose layer instead (`infra/compose/docker-compose.yml:169-174` and the
    per-service blocks), which is what `scripts/stack.mjs:137-176` polls and why
    `pnpm stack:up` can fail the job when something never becomes healthy. The
    consequence: an orchestrator that reads image metadata rather than the compose
    file gets no liveness signal at all. Never start this stack with a raw
    `docker compose up` and assume `--wait` means ready — and note the E2E
    workflow does not do that either, precisely because the base compose file
    publishes no ports and hides the mocks behind a profile
    (`.github/workflows/e2e.yml:6-12`).

14. **Service images are development images labelled production.** `pnpm install`
    runs without `--prod` because `tsx` — the entrypoint — is a devDependency,
    so vitest, typescript, drizzle-kit, `@swc/core` and every `@types/*` ship in
    the runtime image, along with `*.spec.ts` and the tsconfigs. Also no
    `dumb-init`/`tini`: PID 1 is the `tsx` shim, so signal handling depends on
    tsx forwarding. Do not treat image contents as a production baseline.

15. **The alternate Next build directories are not gitignored.** `.next/` is
    ignored but `.next-build/`, `.next-audit/`, `.next-founder/` and
    `.next-verify/` — all present under `apps/web/` — are not; only
    `.dockerignore` and `secret-scan.mjs` know about them. Related:
    `apps/web/tsconfig.json` lists generated-type globs for several of these and
    carries an explicit warning — leaving a retired `distDir` in that list makes
    typecheck validate **stale** route types, so a moved route fails every
    future build. Prune the list when you retire a build dir. `NEXT_DIST_DIR`
    exists so a production build can run beside a live `next dev`
    (`apps/web/next.config.ts:49-51`).

16. **Rate limiting is in-process, per replica.** Token buckets constructed in
    the service instance (`apps/services/identity/src/auth/auth.service.ts:36-57`)
    reset on every deploy and are not shared between instances. A limit you see
    locally is not the limit a multi-replica deployment enforces.

17. **The NOWPayments mock's `invoice_url` is hardcoded to `localhost:4090`.** It
    is not derived from the request Host, so the URL works from your machine and
    from nowhere else. Inside the compose network billing reaches the mock at
    `nowpayments-mock:4090`. Also, the mock's `x-api-key` is checked for
    presence, not value — any non-blank string authenticates.

18. **The chat WebSocket is the one browser request that does not go through
    Next.js.** `apps/web` has no `/v1/**` route and `next.config.ts` declares no
    `rewrites()`, so nothing in the web app can proxy it. The founding-lounge
    socket is served directly by identity-svc: the gateway is attached to the raw
    Fastify HTTP server (`apps/services/identity/src/main.ts:36`) and its upgrade
    handler destroys anything whose path is not exactly `/v1/chat/ws`
    (`apps/services/identity/src/chat/gateway.ts:45-47`). Three consequences:
    - The browser needs the origin in the CSP, which is why `next.config.ts`
      derives `chatWsOrigin` from `NEXT_PUBLIC_CHAT_WS_URL` and adds it to
      `connect-src` (`apps/web/next.config.ts:3-11`, `:39`) — and why a stale
      build-time value breaks the lounge silently ([trap 1](#9-traps-for-new-developers)).
    - Locally the browser connects straight to `ws://localhost:4003/v1/chat/ws`
      (`.env.local.example:37`); the edge proxy is not in the picture at all, so
      local success tells you nothing about the deployed path.
    - Deployed, the edge must route that one path separately. Both Caddy configs
      use mutually exclusive `handle` blocks sending `/v1/chat/ws` to
      `{$CHAT_UPSTREAM}` (identity:4003) and everything else to `{$UPSTREAM}`
      (web:3000) — `infra/compose/caddy/Caddyfile.production:69`,
      `Caddyfile.staging:47-48`, with `CHAT_UPSTREAM` set at
      `infra/compose/docker-compose.production.yml:157` and
      `docker-compose.staging.yml:113`. If you add another non-Next path, it needs
      its own `handle` block; it will not fall through to a service.

    Staging-specific: `basic_auth` (`Caddyfile.staging:27`) applies to the
    WebSocket handle too, and browsers do not attach basic-auth credentials to a
    JS-initiated WebSocket handshake, so the lounge falls back to polling on
    staging **by design** (`Caddyfile.staging:12`). Production has no basic auth.
    Do not debug that as a bug.

---

## Where to go next

| Question | Document |
|---|---|
| How do the pieces fit together? | [01-architecture.md](./01-architecture.md) |
| What tables and indexes exist, and why? | [02-data-model.md](./02-data-model.md) |
| What happens end-to-end when someone buys / joins / trades? | [03-flows.md](./03-flows.md) |
| How does one service work internally? | [04-features/](./04-features/README.md) |
| What is the exact request/response for an endpoint? | [05-api-reference.md](./05-api-reference.md) |
| What is the threat model, and which controls exist? | [06-security.md](./06-security.md) |
| Containers, environments, env vars, deployment | [07-infrastructure.md](./07-infrastructure.md) |
| Something is broken in a running environment | [09-operations-runbook.md](./09-operations-runbook.md) |
| What is this product and who is it for? | [10-product.md](./10-product.md) |
