# Infrastructure

How HeroPips is built, configured, wired and shipped: the three environments and
why they differ, the Compose base/overlay pattern, the operator scripts, the
seven container images, database provisioning, the complete environment-variable
reference, the Caddy edge, CI/CD, and what can and cannot be scaled horizontally
today. Written for an engineer who has to boot the stack, change a configuration
value, or push a release. Day-2 procedures live in the
[operations runbook](./09-operations-runbook.md); the schema itself is in the
[data model](./02-data-model.md); the threat model is in
[security](./06-security.md).

Naming note: the environment is called **`production`** everywhere that matters —
`--env production`, `.env.production`, `infra/compose/docker-compose.production.yml`,
`infra/compose/caddy/Caddyfile.production`. Only the npm script aliases are
shortened (`stack:prod:up`). `scripts/stack.mjs` resolves the overlay as
`docker-compose.${env}.yml`, so a shortened filename would never load.

---

## 1. Environment model

Three environments, one topology. Everything is containers; nothing runs on a
host directly.

| Concern | local | staging | production |
|---|---|---|---|
| Overlay | `infra/compose/docker-compose.local.yml` | `infra/compose/docker-compose.staging.yml` | `infra/compose/docker-compose.production.yml` |
| Env file | `.env.local`, falls back to `.env` (`scripts/stack.mjs:83-86`) | `.env.staging`, no fallback (`scripts/stack.mjs:88-92`) | `.env.production`, no fallback |
| Images | built on the host from source (`scripts/stack.mjs:191-195`) | pulled, `IMAGE_TAG` from CI | pulled only, `pull_policy: always` (`infra/compose/docker-compose.production.yml:102`), never built |
| Mocks (`mailpit`, `nowpayments-mock`) | started via the `mocks` profile (`scripts/stack.mjs:44`) | never | never |
| Published host ports | all of them (`infra/compose/docker-compose.local.yml:24-77`) | `caddy` 80/443 only (`infra/compose/docker-compose.staging.yml:106-108`) | `caddy` 80/443 + 443/udp only (`infra/compose/docker-compose.production.yml:143-146`) |
| Ingress | direct to `web:3000` and each service port | Caddy + TLS + HTTP basic auth | Caddy + TLS + HSTS preload + HTTP/3 |
| Restart policy | `no` (`infra/compose/docker-compose.local.yml:23`) — a crash stays crashed and visible | `unless-stopped` via `RESTART_POLICY` | `always`, hardcoded (`infra/compose/docker-compose.production.yml:30`) |
| Resource limits | none | 1 CPU / 768 MB per service (`infra/compose/docker-compose.staging.yml:21-28`) | every knob env-driven (`infra/compose/docker-compose.production.yml:40-47`) |
| Kernel hardening | none | none | `no-new-privileges`, `cap_drop: [ALL]` (`infra/compose/docker-compose.production.yml:29-33`) |
| Mail | Mailpit swallows everything, UI on `:8025` | real SMTP, real inboxes | real SMTP |
| Payments | in-stack NOWPayments mock on `:4090` | `https://api-sandbox.nowpayments.io` | `https://api.nowpayments.io`, live money |
| Signal source | `sim`, `SIM_SEED=42`, 30 s cadence | `sim`, 60 s (`infra/compose/docker-compose.staging.yml:82-83`) | `binance`, 60 s (`.env.production.example:117-118`) |
| Robots | n/a | `X-Robots-Tag: noindex, nofollow, noarchive` plus basic auth (`infra/compose/caddy/Caddyfile.staging:33`) | indexable |
| Founding-lounge WebSocket | connects directly to `identity:4003` | 401s at the basic-auth gate; client degrades to 10 s polling, by design | connects through the edge to `identity:4003` |
| Secret placeholders | expected; the scan is skipped (`scripts/preflight.mjs:304-307`) | blocked | blocked |
| Kafka auto-topic-create | `true` | `true` (`infra/compose/docker-compose.staging.yml:63`) | **`false`** (`infra/compose/docker-compose.production.yml:96`) — topics must be pre-created |
| Kafka retention | 168 h | 72 h | 336 h |
| Postgres slow-query log | > 500 ms | > 200 ms | > 1000 ms |
| Seed data | `pnpm db:seed` | `db:seed` allowed | refused (`scripts/db.mjs:414`) |

### Why they differ

- **Local optimises for inspectability, not fidelity.** Every port is published
  so you can attach `psql`, a Kafka client or `curl` at any layer
  (`infra/compose/docker-compose.local.yml:8-10`). That is exactly why the local
  overlay must never be applied to a shared host.
- **Staging is production's shape with production's constraints.** Same
  hardening posture, same ingress and routing, no mocks, real SMTP. The
  deliberate differences are seeded demo data, sandbox payment credentials,
  verbose logging, and a robots-hostile posture so staging is never indexed
  (`infra/compose/docker-compose.staging.yml:6-14`).
- **Production never builds.** Images are built once in CI, tagged with the
  commit SHA and pulled. `IMAGE_TAG` must be immutable — `latest` makes a
  rollback unreproducible (`infra/compose/docker-compose.production.yml:7-10`).

---

## 2. Compose architecture

### 2.1 Base plus overlay

`infra/compose/docker-compose.yml` describes **what** runs and how the pieces
are wired. It never decides **where**: every value is `${VAR:-default}`, with
defaults chosen so a bare `docker compose up` on a laptop works with no
configuration at all (`infra/compose/docker-compose.yml:4-6`). An overlay always
sits on top and supplies environment shape.

That is the whole point of the `${VAR:-default}` discipline: the base file is
committed and readable, contains no secret and no site-specific value, and
`docker compose config` renders a complete runnable topology from an empty
environment. An overlay then narrows it. The alternative — a base file with
required variables — makes the file unusable on its own and pushes every default
into documentation, where it rots.

Merge order, as produced by `scripts/stack.mjs:99-102`:

```
docker compose \
  --project-directory infra/compose \
  -f infra/compose/docker-compose.yml \
  -f infra/compose/docker-compose.<env>.yml \
  --env-file .env.<env> \
  [--profile mocks]        # local only
  <command>
```

Later `-f` wins. The Compose merge semantics that matter here:

| Key kind | Behaviour | Example |
|---|---|---|
| Scalar (`restart`, `image`, `pull_policy`) | overlay replaces | `infra/compose/docker-compose.local.yml:23` forces `restart: "no"` over the base `${RESTART_POLICY:-unless-stopped}` |
| Mapping (`environment`, `deploy.resources`) | merged key by key | `infra/compose/docker-compose.local.yml:49` overrides only `EARLY_ACCESS_DEV_CODE`, leaving the other growth variables intact |
| Sequence (`command`, `ports`, `volumes`) | overlay **replaces** the whole list | `infra/compose/docker-compose.staging.yml:42-53` must restate the entire `postgres` command, not just add `wal_level` |
| YAML anchors (`&limits`, `*hardening`) | resolved **within one file**, before merging | an anchor in the base is invisible to an overlay, which is why each overlay defines its own |

Render the fully merged result at any time — this, not the files, is the ground
truth:

```bash
pnpm stack:config                                    # local
node scripts/stack.mjs config --env production       # production
```

### 2.2 The `mocks` profile

`nowpayments-mock` and `mailpit` both declare `profiles: ["mocks"]`
(`infra/compose/docker-compose.yml:116`, `infra/compose/docker-compose.yml:129`).
Compose does not merely skip starting a profiled service: it excludes it from the
rendered configuration entirely unless the profile is activated.
`scripts/stack.mjs:44` is the only place the profile is enabled:

```js
const PROFILES = { local: ["mocks"], staging: [], production: [] };
```

So in staging and production the payment double and the mail catcher are
*structurally* unreachable — not "configured off", not "guarded by a flag", but
absent from the container graph. `docker compose ps` cannot list them,
`depends_on` cannot reach them, and a typo in an env file cannot resurrect them.
This matters because the mock authenticates any non-blank `x-api-key`
(`infra/mocks/nowpayments/src/server.mjs:254-257`) and signs IPNs with
`dev-ipn-secret` by default.

CI asserts this rather than trusting it: the `infra` job greps the rendered
staging and production configs for `mailpit|nowpayments-mock` and fails the build
on a hit (`.github/workflows/ci.yml:100-105`).

### 2.3 Container topology

Local — everything published, doubles present:

```mermaid
flowchart LR
  dev([developer]) -->|:3000| web[web · Next.js 3000]
  dev -->|:8025| mp[mailpit UI]
  dev -->|:4090| npm[nowpayments-mock 4090]
  dev -->|:5432| pg[(postgres 16)]
  dev -->|:9094| kf[[kafka KRaft]]
  dev -->|:4001-4005| svcs[growth 4001 · billing 4002 · identity 4003 · signal 4004 · trading 4005]
  web --> svcs
  svcs --> pg
  svcs --> kf
  billing2[billing] -->|create invoice| npm
  npm -->|signed IPN| billing2
  growth2[growth] -->|smtp 1025| mp
```

Staging and production — one ingress, two upstreams, no published service port:

```mermaid
flowchart LR
  net([internet]) -->|443 tcp/udp| caddy[caddy:2-alpine · TLS/ACME]
  caddy -->|"everything else -> web:3000"| web[web · Next.js]
  caddy -->|"/v1/chat/ws -> identity:4003"| i[identity 4003]
  web --> g[growth 4001]
  web --> b[billing 4002]
  web --> i
  web --> s[signal 4004]
  web --> t[trading 4005]
  i --> b
  t --> i
  t --> s
  g --> pg[(postgres)]
  b --> pg
  i --> pg
  s --> pg
  t --> pg
  g <--> kf[[kafka]]
  b <--> kf
  i <--> kf
  s <--> kf
  t <--> kf
  g -->|smtp 587| smtp([external SMTP])
  b -->|https| np([api.nowpayments.io])
```

Startup ordering is enforced by health, not by sleeps: all five services
`depends_on` `postgres` and `kafka` with `condition: service_healthy`
(`infra/compose/docker-compose.yml:175-177`), `web` depends on all five with
`condition: service_started` (`infra/compose/docker-compose.yml:311-316`), and
`caddy` depends on `web: service_healthy`
(`infra/compose/docker-compose.production.yml:165-166`). Every container has a
healthcheck except `nowpayments-mock` — see
[gaps](#10-known-gaps-and-hazards).

---

## 3. The operator scripts

All are zero-dependency ESM Node scripts: they must run on a fresh clone
*before* `pnpm install` (`scripts/preflight.mjs:18`, `scripts/db.mjs:21-22`).

### 3.1 `scripts/preflight.mjs` — the pre-start gate

```
node scripts/preflight.mjs --env local|staging|production [--quiet]
```

| Flag | Effect |
|---|---|
| `--env <name>` | target environment; defaults to `$HEROPIPS_ENV`, else `local` (`scripts/preflight.mjs:392`) |
| `--quiet` | suppress the `✓` lines; warnings, failures and the summary still print (`scripts/preflight.mjs:132`) |

Six check groups, in order (`scripts/preflight.mjs:413-418`):

| # | Group | What it asserts | Blocking? |
|---|---|---|---|
| 1 | Toolchain (`scripts/preflight.mjs:193`) | Node ≥ 22, `docker`, `docker compose` v2, daemon reachable, `pnpm` | yes, except `pnpm`, a warning in local (`scripts/preflight.mjs:216`) |
| 2 | Files (`scripts/preflight.mjs:219`) | `.env.<env>`, base compose, the matching overlay, `infra/sql/000_databases.sql`, all five `0001_init.sql` | yes; local may fall back to `.env` with a warning (`scripts/preflight.mjs:225-226`) |
| 3 | Configuration (`scripts/preflight.mjs:247`) | every variable in `CONFIG_SPEC` is set; `CRED_KEY` is 64 hex chars; `EARLY_ACCESS_DEV_CODE` unset; `PUBLIC_ORIGIN` https and not localhost | blocking beyond local, a warning in local (`scripts/preflight.mjs:267`) |
| 4 | Secrets (`scripts/preflight.mjs:301`) | none of the six known dev placeholders survived; four secrets are ≥ 24 chars | placeholders block; short secrets warn |
| 5 | Host ports (`scripts/preflight.mjs:331`) | the ten ports the local overlay publishes are free (`scripts/preflight.mjs:106-117`) | warning only — an already-running HeroPips stack is legitimate |
| 6 | Resources (`scripts/preflight.mjs:349`) | ≥ 5 GiB free on the repo filesystem (fail), ≥ 15 GiB (warn); `node_modules` present | disk < 5 GiB blocks |

Exit codes: `0` pass (warnings allowed), `1` blocking failure, `2` unknown
environment (`scripts/preflight.mjs:397-400`).

Configuration precedence is deliberately asymmetric
(`scripts/preflight.mjs:404-411`): `.env` is layered under `.env.local`
**only**. Layering it under staging or production would let a laptop value
satisfy a check for a variable the real environment file is missing.

Real output, local:

```
$ pnpm preflight
HeroPips preflight · environment: local

Toolchain
  ✓ node v22.14.0
  ✓ docker 29.6.1
  ✓ docker compose v5.3.0
  ✓ docker daemon reachable, server 29.6.1
  ✓ pnpm v10.26.1

Files
  ✓ .env.local present
  ✓ infra/compose/docker-compose.yml present
  ✓ infra/compose/docker-compose.local.yml present
  ✓ infra/sql/000_databases.sql present
  ✓ sql migrations all five service schemas present

Configuration
  ✓ required variables all set
  ✓ CRED_KEY well-formed (32 bytes hex)

Secrets
  ✓ placeholder scan skipped — dev placeholders are expected locally

Host ports
  ✓ port availability 10 ports free

Resources
  ✓ disk space 185.8 GiB free
  ✓ node_modules installed

Summary  16 passed · 0 warnings · 0 failures

Preflight passed for "local".
```

Real output when local values are pointed at staging — the exact case
`.github/workflows/ci.yml:118-127` asserts must fail (abridged; the full run
reports 8 failures):

```
$ pnpm preflight:staging
HeroPips preflight · environment: staging
...
Files
  ✗ .env.staging missing

Configuration
  ✗ required variables 19 missing
  ! explicit-in-production variables 11 unset
  ✓ CRED_KEY well-formed (32 bytes hex)
  ✗ EARLY_ACCESS_DEV_CODE set to "123456"
  ✗ PUBLIC_ORIGIN http://localhost:3000

Secrets
  ✗ NOWPAYMENTS_IPN_SECRET development placeholder
  ✗ STATUS_TOKEN_SECRET development placeholder
  ✗ POSTGRES_PASSWORD development placeholder
  ✗ CRED_KEY development placeholder
  ✓ STATUS_TOKEN_SECRET 27 chars
  ! NOWPAYMENTS_IPN_SECRET 14 chars
  ! POSTGRES_PASSWORD 2 chars

Summary  13 passed · 3 warnings · 8 failures

Blocking
  NOWPAYMENTS_IPN_SECRET: development placeholder
      anyone could forge a paid-order IPN and mint free lifetime seats
  ...
Preflight failed for "staging". Fix the items above and re-run.
```

Every `FORBIDDEN_BEYOND_LOCAL` entry carries a blast-radius sentence
(`scripts/preflight.mjs:88-103`), because "insecure value" without a reason is
the kind of message people override.

**Failure modes.** `--fix-hints` is documented in the header
(`scripts/preflight.mjs:5`) but never parsed by `main()`
(`scripts/preflight.mjs:393-396`) — passing it is silently ignored. The secret
scan is exact-value matching, not entropy analysis: a *new* weak secret such as
`Password123!` passes the placeholder scan and only trips the ≥ 24-char warning.
Port checks bind on `127.0.0.1` only (`scripts/preflight.mjs:185`), so a process
bound to a specific non-loopback interface is not detected.

### 3.2 `scripts/stack.mjs` — the environment driver

```
node scripts/stack.mjs <command> --env local|staging|production [flags] [-- extra compose args]
```

| Command | Behaviour |
|---|---|
| `up` | preflight → build (local only, unless `--no-build`) → `up -d --remove-orphans` → poll health → `ps` → `db.mjs apply --yes` (`scripts/stack.mjs:189-223`) |
| `down` | `down --remove-orphans`; local additionally passes `-v` unless `--keep-data` (`scripts/stack.mjs:226-233`) |
| `restart` | `compose restart [service]` (`scripts/stack.mjs:235-237`) |
| `build` | build images without starting (`scripts/stack.mjs:239-241`) |
| `pull` | pull pinned images (`scripts/stack.mjs:243-245`) |
| `ps` | `compose ps -a` (`scripts/stack.mjs:247-249`) |
| `logs` | `logs -f --tail 200`, streamed, optionally one service (`scripts/stack.mjs:251-253`) |
| `exec` | requires `--service` and a command after `--` (`scripts/stack.mjs:255-259`) |
| `config` | render the fully merged compose file (`scripts/stack.mjs:261-263`) |

| Flag | Effect |
|---|---|
| `--env <name>` | target environment; default `$HEROPIPS_ENV` or `local` (`scripts/stack.mjs:53`) |
| `--service <name>` | restrict the command to one service (`scripts/stack.mjs:59`) |
| `--skip-preflight` | escape hatch; prints a yellow warning, never silent (`scripts/stack.mjs:124-126`) |
| `--keep-data` | `down` without `-v` (`scripts/stack.mjs:230`) |
| `--no-build` | `up` without building; implicit for staging and production (`scripts/stack.mjs:191`) |
| `-- <args>` | everything after a bare `--` is passed through to compose (`scripts/stack.mjs:47-49`) |

`up` is the interesting one: a five-phase pipeline where every phase can abort
the run.

```mermaid
stateDiagram-v2
  [*] --> Preflight
  Preflight --> Build: exit 0
  Preflight --> Aborted: blocking failure
  Build --> Start: images ok
  Build --> Aborted: build failed
  Start --> Health: containers created
  Start --> Aborted: compose up non-zero
  Health --> Migrate: nothing starting or unhealthy
  Health --> Migrate: timeout 240s, warns and continues
  Migrate --> Ready: db apply exit 0
  Migrate --> Aborted: migrations failed
  Ready --> [*]
  Aborted --> [*]
```

`waitForHealth` (`scripts/stack.mjs:137-176`) polls
`compose ps --format "{{.Service}} {{.State}} {{.Health}}"` every 5 s for up to
240 s. It returns `false` immediately if any container is `exited` or `dead`
(`scripts/stack.mjs:157-160`), and `true` when nothing is `starting` and nothing
is `unhealthy` (`scripts/stack.mjs:161-165`). A container with **no** healthcheck
reports health `none` and therefore satisfies the loop — which is how
`nowpayments-mock` passes without ever being probed.

**Failure modes.**
- An unhealthy stack still runs migrations, then exits `1`
  (`scripts/stack.mjs:222`). A non-zero exit from `pnpm stack:up` therefore
  means "up but not fully healthy", not "nothing started". Always follow with
  `pnpm stack:ps`.
- `waitForHealth` sleeps via `spawnSync("sleep", ["5"])`
  (`scripts/stack.mjs:171`), so the loop needs a POSIX `sleep` on `PATH`.
- `down` never passes `-v` outside local (`scripts/stack.mjs:230`) — by design,
  so `stack:prod:down` cannot delete the database volume.
- `logs` always passes `-f` (`scripts/stack.mjs:252`) and there is no
  non-following mode: any unrecognised flag is merely collected into
  `opts.flags` (`scripts/stack.mjs:60`) and ignored. A non-interactive caller
  that expects `logs` to terminate will block until its own timeout.
- `--skip-preflight` bypasses every gate in §3.1, including the placeholder
  scan. There is no environment in which that is correct for a real deploy.

### 3.3 `scripts/db.mjs` — migrations and schema verification

```
node scripts/db.mjs <plan|apply|verify|seed|reset> [--env <name>] [--service <name>] [--yes] [--force]
```

| Command | Behaviour | Guard |
|---|---|---|
| `plan` | list pending migrations per service; read-only, safe anywhere (`scripts/db.mjs:328-338`) | none |
| `apply` | run `000_databases.sql`, create the ledger, apply pending files in filename order, record each (`scripts/db.mjs:340-371`) | `--yes` required outside local (`scripts/db.mjs:341-343`) |
| `verify` | assert the live schema contains every `CRITICAL` table and index and that nothing is pending (`scripts/db.mjs:373-411`) | none |
| `seed` | load `infra/sql/seed/<service>.sql` where present (`scripts/db.mjs:413-426`) | refuses `production` (`scripts/db.mjs:414`) |
| `reset` | `DROP DATABASE … WITH (FORCE); CREATE DATABASE …` per service (`scripts/db.mjs:428-442`) | local only **and** `--force` (`scripts/db.mjs:429-430`) |

Transport is chosen once, in this order (`scripts/db.mjs:198-210`): a native
`psql` on `PATH`; else `docker compose exec postgres psql` when the local stack
is up; else a throwaway `postgres:16-alpine` container with
`--add-host host.docker.internal:host-gateway`, with `localhost` in the URL
rewritten to `host.docker.internal` (`scripts/db.mjs:217-219`). That is why the
same command works from a laptop with no Postgres client installed and from
inside CI.

Real output:

```
$ pnpm db:plan
heropips db · env=local · postgres://hp:***@postgres:5432/postgres

identity   0 pending  up to date
billing    0 pending  up to date
growth     0 pending  up to date
signal     0 pending  up to date
trading    0 pending  up to date

Nothing to apply.

$ pnpm db:verify
heropips db · env=local · postgres://hp:***@postgres:5432/postgres

identity  ok       5 tables, 3 critical indexes
billing   ok       4 tables, 2 critical indexes
growth    ok       16 tables, 4 critical indexes
signal    ok       2 tables, 1 critical indexes
trading   ok       7 tables, 2 critical indexes

All databases verified.

$ pnpm db:seed
heropips db · env=local · postgres://hp:***@postgres:5432/postgres

growth    seeded
trading   seeded

Seeded 2 database(s).
```

Connection strings are always redacted in output (`scripts/db.mjs:452-454`).

**Failure modes.**
- A migration file edited after it was applied is a **hard error**, not a silent
  skip (`scripts/db.mjs:305-311`). See §5.4.
- `apply` is not transactional across files: each file is a separate `psql`
  invocation, so a failure part-way through a multi-file batch leaves earlier
  files applied and recorded. Individual files are transactional because each
  wraps its body in `BEGIN; … COMMIT;` (`infra/sql/billing/0001_init.sql:13`,
  `infra/sql/billing/0001_init.sql:105`).
- The version/checksum `INSERT` is string-interpolated
  (`scripts/db.mjs:362`). Version strings come from filenames and checksums from
  `sha256`, so there is no injection vector today — but never put a quote in a
  migration filename.
- `seed` silently skips services with no seed file (`scripts/db.mjs:419`). Only
  `infra/sql/seed/growth.sql` and `infra/sql/seed/trading.sql` exist, so the
  summary reads `Seeded 2 database(s)` even with no `--service` filter.
- `verify` checks presence, not shape: a table with a wrong column type passes.

### 3.4 `scripts/docs-check.mjs` — documentation integrity

```
node scripts/docs-check.mjs [--dir docs/engineering] [--quiet]
```

Validates this documentation set itself (`scripts/docs-check.mjs:11-20`): every
relative markdown link resolves, every `#fragment` matches a heading, every
`path/to/file.ts:123` citation points at a real file with the line in range,
every fenced mermaid block declares a known diagram type with balanced brackets,
and every document has exactly one H1. Exit `0` clean, `1` on any error;
warnings never fail the run. It is a CI step
(`.github/workflows/ci.yml:40-41`), so a rename that orphans forty citations
fails the build rather than rotting quietly.

---

## 4. Container images

Seven Dockerfiles, all `node:22-alpine`, all non-root.

| Image | Dockerfile | Stages | Final content | User | Port | Entrypoint |
|---|---|---|---|---|---|---|
| `web` | `apps/web/Dockerfile` | `deps` (`apps/web/Dockerfile:5`) → `build` (`apps/web/Dockerfile:19`) → `run` (`apps/web/Dockerfile:31`) | Next.js standalone output plus `.next/static` and `public`, `--chown=node:node` | `node` (`apps/web/Dockerfile:41`) | 3000 | `node …/server.js` from the standalone tree (`apps/web/Dockerfile:43`) |
| `identity-svc` | `apps/services/identity/Dockerfile` | `deps` (`apps/services/identity/Dockerfile:5`) → `run` (`apps/services/identity/Dockerfile:22`) | whole `node_modules` tree, `packages/contracts`, service source | `node` (`apps/services/identity/Dockerfile:33`) | 4003 | `node_modules/.bin/tsx src/main.ts` (`apps/services/identity/Dockerfile:35`) |
| `billing-svc` | `apps/services/billing/Dockerfile` | `deps` → `run` (`apps/services/billing/Dockerfile:19`) | same shape | `node` (`apps/services/billing/Dockerfile:30`) | 4002 | `tsx src/main.ts` (`apps/services/billing/Dockerfile:32`) |
| `growth-svc` | `apps/services/growth/Dockerfile` | `deps` → `run` (`apps/services/growth/Dockerfile:19`) | same shape, plus `nodemailer` | `node` (`apps/services/growth/Dockerfile:30`) | 4001 | `tsx src/main.ts` (`apps/services/growth/Dockerfile:32`) |
| `signal-svc` | `apps/services/signal/Dockerfile` | `deps` → `run` (`apps/services/signal/Dockerfile:22`) | same shape | `node` (`apps/services/signal/Dockerfile:33`) | 4004 | `tsx src/main.ts` (`apps/services/signal/Dockerfile:35`) |
| `trading-svc` | `apps/services/trading/Dockerfile` | `deps` → `run` (`apps/services/trading/Dockerfile:21`) | same shape; holds `CRED_KEY` | `node` (`apps/services/trading/Dockerfile:32`) | 4005 | `tsx src/main.ts` (`apps/services/trading/Dockerfile:34`) |
| `nowpayments-mock` | `infra/mocks/nowpayments/Dockerfile` | single (`infra/mocks/nowpayments/Dockerfile:5`) | `package.json` plus `src/`, zero dependencies | `node` (`infra/mocks/nowpayments/Dockerfile:10`) | 4090 | `node src/server.mjs` (`infra/mocks/nowpayments/Dockerfile:12`) |

Size drivers:

- **`web`** is the only genuinely lean image. The `run` stage copies nothing but
  the standalone server tree, so the build toolchain and the full workspace
  `node_modules` stay behind in `deps` and `build`.
- **The five services** copy `node_modules` wholesale out of `deps` — root,
  service and `packages/contracts` — to keep pnpm's symlink layout valid at
  runtime. Because `tsx` is a `devDependency` *and* the entrypoint, the install
  cannot use `--prod`, so `vitest`, `typescript`, `@swc/core`, `unplugin-swc`,
  `drizzle-kit` and every `@types/*` package ship to production.
  `COPY apps/services/<svc> …` additionally bakes in `*.spec.ts`, `test/`,
  `tsconfig*.json` and drizzle configs.
- **`nowpayments-mock`** is `node:22-alpine` plus ~350 lines of source.

**No image runs compiled output.** Every service `CMD` is
`tsx src/main.ts`. The compiled-output situation is not uniform, though, and it
is worth knowing precisely: `identity` and `billing` inherit `noEmit: true` from
their own `tsconfig.json` and emit nothing, while `growth`, `signal` and
`trading` set `"noEmit": false` in `tsconfig.build.json` and do produce a
`dist/` tree (28, 19 and 24 `.js` files on disk today). Nothing consumes it —
`.dockerignore:11` excludes `**/dist` from every build context. And because each
service's `build` script ends in `|| echo build-noop`
(`apps/services/growth/package.json:9` and the same line in the other four), a
`tsc` failure never fails `pnpm build`; `pnpm typecheck` is the real gate.

`.dockerignore` keeps the context lean and, importantly, excludes `.env` and
`.env.*` with a single `!.env.example` negation (`.dockerignore:14-16`), so a
developer's local secrets cannot be copied into an image by the broad `COPY`
lines. It also excludes `**/.next` and `**/.next-*` (`.dockerignore:6-9`) — the
side-by-side production build dirs — and all `*.md` (`.dockerignore:17-18`).

### 4.1 Production-readiness gaps and their remediation

| Gap | Evidence | Consequence | Remediation |
|---|---|---|---|
| No `HEALTHCHECK` in any image | absent from all seven Dockerfiles | Compose supplies healthchecks (`infra/compose/docker-compose.yml:169-174`, `infra/compose/docker-compose.yml:197-202`, `infra/compose/docker-compose.yml:219-224`, `infra/compose/docker-compose.yml:243-248`, `infra/compose/docker-compose.yml:269-274`, `infra/compose/docker-compose.yml:305-310`), so Compose deployments are covered — but the image itself carries no liveness contract, so Kubernetes, ECS, Nomad or a plain `docker run` get nothing | add `HEALTHCHECK --interval=15s --timeout=5s --start-period=30s CMD wget -q -O /dev/null http://127.0.0.1:$PORT/healthz` to each service image, and `/` for `web`. Same probe as compose, so behaviour does not change |
| Dev dependencies in the runtime image | `pnpm install` without `--prod` in every service `deps` stage, e.g. `apps/services/identity/Dockerfile:19` | larger attack surface and image size; `vitest` and `typescript` are reachable from a compromised container | add a real build stage (set `noEmit: false` for identity and billing too, drop the `\|\| echo build-noop`), then `pnpm install --prod --frozen-lockfile` in `run` and copy `dist/` |
| TypeScript transpiled at runtime by `tsx` | `CMD ["node_modules/.bin/tsx","src/main.ts"]` in all five services | slower cold start, extra resident memory, and a syntax error surfaces at container boot instead of at build | same fix: compile in CI, `CMD ["node","dist/main.js"]`. This also removes the reason `--prod` is impossible |
| No init process | PID 1 is `docker-entrypoint.sh` → `node`/`tsx`; no `tini` or `dumb-init` anywhere | nothing reaps zombies, and `SIGTERM` forwarding through the `tsx` shim is not guaranteed, so `stop_grace_period: 20s` (`infra/compose/docker-compose.yml:37`) can end in `SIGKILL` mid-flush | `RUN apk add --no-cache tini` plus `ENTRYPOINT ["/sbin/tini","--"]`, or set `init: true` on the compose services |
| Test files and configs shipped | `COPY apps/services/<svc> …` plus a `.dockerignore` that does not exclude `*.spec.ts` | dead weight and information disclosure | add `**/*.spec.ts`, `**/test/`, `**/tsconfig*.json`, `**/drizzle.config.*` to `.dockerignore`, or copy only `src/` and `package.json` |
| Four of six workspace images omit manifests | `apps/web/Dockerfile:10-15`, `apps/services/billing/Dockerfile:10-15` and `apps/services/growth/Dockerfile:10-15` omit identity/signal/trading; `apps/services/trading/Dockerfile:10-17` omits identity — each contradicting its own comment on line 9 | latent: it builds today because each `--filter <pkg>...` closure never reaches the omitted packages. The first cross-service workspace dependency breaks these builds with an opaque pnpm error | copy all six app manifests plus both package manifests in every `deps` stage, as identity and signal already do |
| No image labels, SBOM or vulnerability scan | no `LABEL` in any Dockerfile; CI has no scan step | an image cannot be traced back to a commit except by tag convention | add `LABEL org.opencontainers.image.revision=$GIT_SHA` via build args, plus a `trivy image` or `docker scout cves` gate in CI |
| `web` hardcodes `.next` in `COPY` | the `run` stage copies `.next/static` | building with `NEXT_DIST_DIR=.next-build` (`apps/web/next.config.ts:51`) produces an image with no static assets | derive the path from a build arg, or normalise the dist dir before the copy |

---

## 5. Database provisioning

### 5.1 Layout

```
infra/sql/
  000_databases.sql          cluster bootstrap: one database per service
  identity/0001_init.sql     110 lines
  billing/0001_init.sql      119 lines
  growth/0001_init.sql       367 lines
  signal/0001_init.sql        67 lines
  trading/0001_init.sql      158 lines
  seed/growth.sql            demo academy leaderboard + early-access queue
  seed/trading.sql           demo closed trades, equity curve, day anchors
```

`infra/sql/000_databases.sql` creates `hp_identity`, `hp_billing`, `hp_growth`,
`hp_signal`, `hp_trading` (`infra/sql/000_databases.sql:20-24`). It runs as a
superuser against the maintenance database and is idempotent via a `\gexec`
guard, because `CREATE DATABASE` cannot run inside a transaction and has no
`IF NOT EXISTS` (`infra/sql/000_databases.sql:12-13`). Compose mounts it at
`/docker-entrypoint-initdb.d/00-databases.sql`
(`infra/compose/docker-compose.yml:65`) — which runs **once, on an empty volume
only**. `pnpm db:apply` is the idempotent path for an existing cluster
(`infra/compose/docker-compose.yml:63-64`).

Each `0001_init.sql` is wrapped in `BEGIN; … COMMIT;` with
`\set ON_ERROR_STOP on`, creates the extension it needs (`citext` for identity at
`infra/sql/identity/0001_init.sql:18`, `pgcrypto` for growth, signal and
trading), and carries `COMMENT ON` documentation on every table, notable column
and index. The tables themselves belong to the
[data model](./02-data-model.md).

Both seed files are idempotent (`ON CONFLICT DO NOTHING`) and namespace every row
they create — `demo-` user ids and `demo+` emails
(`infra/sql/seed/growth.sql:7-13`), `user_id = 'demo-user'` for trading
(`infra/sql/seed/trading.sql:8-17`) — so demo data is trivially identifiable and
removable, and deliberately not UUID-shaped so it can never collide with a real
account. CI proves the idempotency claim by running `apply`, `seed` and `verify`
twice (`.github/workflows/ci.yml:131-141`).

### 5.2 The `schema_migrations` checksum ledger

`scripts/db.mjs:102-110` creates, per service database:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    text PRIMARY KEY,
  checksum   text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text NOT NULL DEFAULT current_user
);
```

`version` is the filename without `.sql`; `checksum` is the first 16 hex chars
of `sha256(file bytes)` (`scripts/db.mjs:281`). On every `plan`, `apply` and
`verify`, `pendingFor()` (`scripts/db.mjs:298-314`) compares the recorded
checksum against the file:

- not recorded → pending, will be applied;
- recorded, checksum matches → skipped;
- recorded, checksum differs → **hard failure**:

```
ERROR  billing/0001_init.sql changed after it was applied (recorded a1b2…, file c3d4…).
Applied migrations are immutable — add a new numbered file instead of editing this one.
```

### 5.3 Relationship to each service's boot-time `migrate.ts`

Every service runs its own idempotent DDL before accepting traffic —
`apps/services/identity/src/main.ts:17`, `apps/services/billing/src/main.ts:15`,
`apps/services/growth/src/main.ts:13`, `apps/services/signal/src/main.ts:13`,
`apps/services/trading/src/main.ts:13`.
`apps/services/identity/src/db/migrate.ts:53-61` is representative: open a
2-connection pool, `CREATE EXTENSION IF NOT EXISTS citext`, run one
`CREATE TABLE IF NOT EXISTS …` blob, close the pool.

Both paths create **the same objects**, and both are idempotent, so whichever
runs first wins and the other is a no-op.
`infra/sql/identity/0001_init.sql:6-10` states the contract explicitly:

> Both this file and the service's boot-time `migrate()` are idempotent and
> create the identical objects […] Keep them in lockstep: a change here
> REQUIRES the same change in `migrate.ts`, otherwise a fresh container silently
> re-creates the old shape.

```mermaid
flowchart TD
  A["docker volume created<br/>first boot only"] --> B["entrypoint runs<br/>000_databases.sql"]
  C["pnpm db:apply"] --> D["ensureDatabases:<br/>000_databases.sql via psql"]
  D --> E["CREATE schema_migrations"]
  E --> F["apply pending numbered files<br/>record version and checksum"]
  B --> G["service container starts"]
  F --> G
  G --> H["migrate.ts: CREATE … IF NOT EXISTS"]
  H --> I["Nest listens, healthz answers"]
  I --> J["db verify: critical tables<br/>and indexes present, zero pending"]
```

`migrate.ts` is a safety net, not the source of truth: it guarantees a service
never boots against a schema-less database, which is what makes
`docker compose up` work with no operator step. But it does **not** write to
`schema_migrations`, so a table created only by `migrate.ts` is invisible to the
ledger, and `db.mjs verify` can report `0 pending` for a database where
`infra/sql/<svc>/0001_init.sql` never executed. Treat `infra/sql/` as normative
and keep the pair in lockstep.

### 5.4 The golden rule

**Never edit a migration that has been applied anywhere.** Not to fix a typo in
a comment, not to add a column, not to reorder statements. The checksum ledger
will refuse every subsequent `plan`, `apply` and `verify` against every database
that already recorded it, and the only ways out are hand-editing the ledger row
in production or reverting the file byte-for-byte.

Add `infra/sql/<service>/0002_<slug>.sql` instead. Files are applied in `sort()`
order of filename (`scripts/db.mjs:271-273`), so zero-pad the number and never
reuse one. The same change must also be made in the service's `migrate.ts`.

---

## 6. Configuration reference

Every variable the system reads. "Required" means *the value must be explicit*;
a documented default may still exist. **R** = listed in `CONFIG_SPEC.required`,
**P** = listed in `CONFIG_SPEC.productionOnly` and therefore checked in staging
and production (`scripts/preflight.mjs:39-82`).

### 6.1 Orchestration and images

| Variable | Consumed by | Required | Default | Description |
|---|---|---|---|---|
| `COMPOSE_PROJECT_NAME` | `infra/compose/docker-compose.yml:23` | no | `heropips` | prefix for container, network and volume names. `heropips-staging` / `heropips-prod` in the examples, so two stacks can share a host |
| `RESTART_POLICY` | `infra/compose/docker-compose.yml:35`, `infra/compose/docker-compose.yml:52`, `infra/compose/docker-compose.yml:84` | no | `unless-stopped` | overridden to `no` by the local overlay and ignored in production, where `infra/compose/docker-compose.production.yml:30` hardcodes `always` |
| `IMAGE_REGISTRY` | `infra/compose/docker-compose.yml:151`, `infra/compose/docker-compose.yml:184`, `infra/compose/docker-compose.yml:288` | staging, prod | `heropips` | image name prefix |
| `IMAGE_TAG` | same lines | staging, prod | `dev` | must be an immutable tag (commit SHA). `latest` makes rollback unreproducible |
| `PULL_POLICY` | `infra/compose/docker-compose.production.yml:102` and the other five services | no | `always` | set `missing` to pin a host to already-pulled layers |
| `NODE_ENV` | `infra/compose/docker-compose.yml:40`; `apps/services/growth/src/common/config.ts:34`; `apps/web/lib/security-headers.ts` | no | `production` | `production` in **all three** env files, local included — so `NODE_ENV` is not the dev/prod switch here; `EARLY_ACCESS_DEV_CODE` is. In the web app it now only controls the CSP `unsafe-eval` allowance and `upgrade-insecure-requests`; `__Host-hp_session` is `Secure` unconditionally |
| `HEROPIPS_ENV` | `scripts/preflight.mjs:392`, `scripts/stack.mjs:53`, `scripts/db.mjs:117` | no | `local` | default `--env` for all three scripts |
| `TZ` | `infra/compose/docker-compose.yml:42` | — | `UTC`, hardcoded | every container runs UTC; all date logic assumes it |

### 6.2 Postgres

| Variable | Consumed by | Required | Default | Description |
|---|---|---|---|---|
| `POSTGRES_USER` | `infra/compose/docker-compose.yml:56`, `infra/compose/docker-compose.yml:76`; `scripts/db.mjs:167` | **P** | `hp` | cluster superuser; `heropips_app` in the staging and production examples |
| `POSTGRES_PASSWORD` | `infra/compose/docker-compose.yml:57`; `scripts/db.mjs:168` | **R** | `hp` | the literal `hp` is a blocking placeholder beyond local (`scripts/preflight.mjs:92`) |
| `POSTGRES_DB` | `infra/compose/docker-compose.yml:58`, `infra/compose/docker-compose.yml:76` | no | `hp` | the maintenance database `pg_isready` probes; no service uses it |
| `POSTGRES_HOST` | `scripts/db.mjs:165` | **P** | `localhost` in the script, `postgres` in the env files | host the *scripts* connect to; services use `DATABASE_URL_*` |
| `POSTGRES_PORT` | `infra/compose/docker-compose.local.yml:24`; `scripts/db.mjs:166` | no | `5432` | published only by the local overlay |
| `POSTGRES_PORT_INTERNAL` | `infra/compose/docker-compose.yml:44` | no | `5432` | **dead**: it appears only inside the `&pg-host` anchor, which nothing references |
| `POSTGRES_ADMIN_URL` | `scripts/db.mjs:171` | no | `postgres://<user>:<pw>@<host>:<port>/postgres` | full override of the admin connection, for a managed cluster with a different maintenance database |
| `PG_MAX_CONNECTIONS` | `infra/compose/docker-compose.yml:69`; `infra/compose/docker-compose.staging.yml:45`; `infra/compose/docker-compose.production.yml:64` | no | 200 / 200 / 300 | see §9.2 for the pool arithmetic |
| `PG_SHARED_BUFFERS` | `infra/compose/docker-compose.yml:71`; `infra/compose/docker-compose.staging.yml:47`; `infra/compose/docker-compose.production.yml:66` | no | 256MB / 512MB / 1GB | |
| `PG_LOG_MIN_DURATION_MS` | `infra/compose/docker-compose.yml:74`; `infra/compose/docker-compose.staging.yml:49`; `infra/compose/docker-compose.production.yml:73` | no | 500 / 200 / 1000 | `0` logs every statement, `-1` disables (`infra/compose/docker-compose.yml:72`) |
| `PG_EFFECTIVE_CACHE_SIZE` | `infra/compose/docker-compose.production.yml:68` | no | `3GB` | planner hint only |
| `PG_MAINTENANCE_WORK_MEM` | `infra/compose/docker-compose.production.yml:70` | no | `256MB` | `VACUUM` and `CREATE INDEX` memory |
| `PG_MAX_WAL_SIZE` | `infra/compose/docker-compose.production.yml:77` | no | `4GB` | |
| `PG_CPU_LIMIT`, `PG_MEM_LIMIT` | `infra/compose/docker-compose.production.yml:57-58` | no | `4.0`, `4G` | |
| `PG_BACKUP_DIR` | `infra/compose/docker-compose.production.yml:81` | no | `./backups` | host path bind-mounted at `/backups`; the `pg_dump` target in the runbook |
| `DATABASE_URL_IDENTITY` | `infra/compose/docker-compose.yml:216`; `apps/services/identity/src/common/config.ts:18` | **R** | `postgres://hp:hp@localhost:5432/hp_identity` | |
| `DATABASE_URL_BILLING` | `infra/compose/docker-compose.yml:188`; `apps/services/billing/src/common/config.ts:21` | **R** | `…/hp_billing` | |
| `DATABASE_URL_GROWTH` | `infra/compose/docker-compose.yml:155`; `apps/services/growth/src/db/client.ts:6` | **R** | `…/hp_growth` | |
| `DATABASE_URL_SIGNAL` | `infra/compose/docker-compose.yml:238`; `apps/services/signal/src/db/client.ts:6` | **R** | `…/hp_signal` | |
| `DATABASE_URL_TRADING` | `infra/compose/docker-compose.yml:262`; `apps/services/trading/src/db/client.ts:6` | **R** | `…/hp_trading` | |
| `DATABASE_URL` | fallback in all five clients, e.g. `apps/services/growth/src/db/client.ts:7` | no | — | single-database escape hatch, never set in any env file. Setting it points *every* service at one database and is almost always a mistake |

### 6.3 Kafka

| Variable | Consumed by | Required | Default | Description |
|---|---|---|---|---|
| `KAFKA_BROKERS` | `infra/compose/docker-compose.yml:41`; every relay, e.g. `apps/services/growth/src/outbox/relay.ts:28` | **R** | `kafka:9092` in compose, `localhost:9092` in code | comma-separated, trimmed and filtered |
| `KAFKA_EXTERNAL_HOST` | `infra/compose/docker-compose.yml:92` | no | `localhost` | advertised host for the `EXTERNAL` listener on `:9094`; reachable only in local |
| `KAFKA_AUTO_CREATE_TOPICS` | `infra/compose/docker-compose.yml:98` | no | `true` | staging hardcodes `true` (`infra/compose/docker-compose.staging.yml:63`), production hardcodes **`false`** (`infra/compose/docker-compose.production.yml:96`), so production topics must be pre-created |
| `KAFKA_REPLICATION_FACTOR` | `infra/compose/docker-compose.yml:99-100` | no | `1` | single broker; RF > 1 is impossible without more brokers |
| `KAFKA_RETENTION_HOURS` | `infra/compose/docker-compose.yml:102`; `infra/compose/docker-compose.staging.yml:64`; `infra/compose/docker-compose.production.yml:97` | no | 168 / 72 / 336 | |
| `KAFKA_NUM_PARTITIONS` | `infra/compose/docker-compose.production.yml:98` | no | `3` | default partition count for explicitly created topics |
| `KAFKA_CPU_LIMIT`, `KAFKA_MEM_LIMIT` | `infra/compose/docker-compose.production.yml:89-90` | no | `2.0`, `2G` | |

Topic strings are constants, not environment variables
(`packages/contracts/src/index.ts:245-252`): `hp.payment.events.v1`,
`hp.growth.events.v1`, `hp.audit.log.v1`, `hp.signal.events.v1`,
`hp.trade.events.v1`, `hp.identity.events.v1`.

### 6.4 Service ports and internal URLs

| Variable | Consumed by | Required | Default | Description |
|---|---|---|---|---|
| `PORT` | every service `main.ts`, e.g. `apps/services/growth/src/main.ts:22`; every Dockerfile `run` stage | no | 4001/4002/4003/4004/4005, 3000 web, 4090 mock | pinned per service in compose, so it is never actually variable in a compose deployment |
| `BILLING_PORT` | `apps/services/billing/src/common/config.ts:19` | no | falls back to `PORT`, then 4002 | per-service override, ahead of `PORT` |
| `IDENTITY_PORT` | `apps/services/identity/src/common/config.ts:16` | no | `PORT`, then 4003 | |
| `TRADING_PORT` | `apps/services/trading/src/common/config.ts:28` | no | `PORT`, then 4005 | growth and signal have no equivalent override |
| `HOSTNAME` | `apps/web/Dockerfile:36`; `infra/compose/docker-compose.yml:292` | no | `0.0.0.0` | Next.js standalone bind address; `localhost` would make the container unreachable |
| `GROWTH_URL` | `apps/web/lib/api.ts:5`, `apps/web/app/api/academy/_lib.ts:13`, `apps/web/app/(marketing)/academy/verify/[code]/opengraph-image.tsx:23` | **R** | `http://localhost:4001` | |
| `BILLING_URL` | `apps/web/lib/api.ts:6`, `apps/web/app/(marketing)/page.tsx:73`; `apps/services/identity/src/common/config.ts:25` | **R** | `http://localhost:4002` | used by both web and identity (redeem verification) |
| `IDENTITY_URL` | `apps/web/lib/session.ts:16`; `apps/services/trading/src/common/config.ts:29` | **R** | `http://localhost:4003` | |
| `SIGNAL_URL` | `apps/web/lib/session.ts:17`; `apps/services/trading/src/common/config.ts:30` | **R** | `http://localhost:4004` | |
| `TRADING_URL` | `apps/web/lib/session.ts:18` | **R** | `http://localhost:4005` | |
| `GROWTH_URL_INTERNAL` … `TRADING_URL_INTERNAL` | compose only: `infra/compose/docker-compose.yml:217`, `infra/compose/docker-compose.yml:263-264`, `infra/compose/docker-compose.yml:300-304` | no | `http://<service>:<port>` | compose-side indirection: `*_INTERNAL` is what containers receive as `*_URL`. The plain `*_URL` entries in the env file exist so preflight can validate a host-side view. In staging and production the examples set both to the compose DNS name |

### 6.5 Billing

| Variable | Consumed by | Required | Default | Description |
|---|---|---|---|---|
| `NOWPAYMENTS_API_URL` | `apps/services/billing/src/common/config.ts:28`; `infra/compose/docker-compose.yml:189` | **R** | `http://localhost:4090` | trailing slashes stripped. Mock locally, sandbox in staging, `https://api.nowpayments.io` in production |
| `NOWPAYMENTS_API_KEY` | `apps/services/billing/src/common/config.ts:29`; `infra/compose/docker-compose.yml:190` | **R** | `sandbox-key` | `sandbox-key` is a blocking placeholder beyond local (`scripts/preflight.mjs:90`) |
| `NOWPAYMENTS_IPN_SECRET` | `apps/services/billing/src/common/config.ts:30`; `infra/compose/docker-compose.yml:191`; reaches the mock as `IPN_SECRET` (`infra/compose/docker-compose.yml:125`) | **R** | `dev-ipn-secret` | HMAC-SHA512 key for callback verification. Blocking placeholder beyond local (`scripts/preflight.mjs:89`): anyone holding it can forge a paid IPN and mint free lifetime seats |
| `IPN_CALLBACK_URL` | `apps/services/billing/src/common/config.ts:33`; `infra/compose/docker-compose.yml:192` | **P** | `http://billing:4002/v1/billing/ipn` | the URL handed to the provider. See gap 1 in §10 — the staging and production examples point at a path nothing serves |
| `LTD_PRICE_USD` | `apps/services/billing/src/common/config.ts:34`; `infra/compose/docker-compose.yml:194` | **P** | `LTD.PRICE_USD_DEFAULT` = 499 | the **flat** price of the Founding Hero lifetime deal. There is no seat-price ladder anywhere in the codebase; the only ladder in billing is `PAYMENT_STATUS_RANK` (`packages/contracts/src/index.ts:195-198`) |
| `LTD_SEAT_CAP` | `apps/services/billing/src/common/config.ts:35`; `infra/compose/docker-compose.yml:195`; `infra/sql/billing/0001_init.sql:112-119` | **P** | `LTD.SEAT_CAP` = 500 | seeds `ltd_seats.cap` on first boot only; later changes are an ops action (see the runbook), not a redeploy |
| `STATUS_TOKEN_SECRET` | `apps/services/billing/src/common/config.ts:31`; `apps/services/growth/src/messaging/config.ts:44`; `infra/compose/docker-compose.yml:156`, `infra/compose/docker-compose.yml:196` | **R** | `dev-status-secret-change-me` | HMAC key for order-status and unsubscribe tokens. **Must be identical in billing and growth** — growth mints billing-compatible tokens. Blocking placeholder beyond local (`scripts/preflight.mjs:91`) |
| `PUBLIC_ORIGIN` | `apps/services/billing/src/common/config.ts:32`; `apps/services/growth/src/messaging/config.ts:35`; `infra/compose/docker-compose.yml:157`, `infra/compose/docker-compose.yml:193` | **R** | `http://localhost:3000` | base for every link in every email and every redirect back from checkout. Must be `https://` and not localhost beyond local (`scripts/preflight.mjs:289-298`) |

### 6.6 Identity

| Variable | Consumed by | Required | Default | Description |
|---|---|---|---|---|
| `EARLY_ACCESS_CODES` | `apps/services/identity/src/common/config.ts:26`; `infra/compose/docker-compose.yml:218`; `infra/compose/docker-compose.local.yml:62` | no | empty | comma-separated codes that redeem a founding account **without a purchase**. Every code is a free lifetime account — keep short-lived and rotate. Empty in the production example (`.env.production.example:107`) |

### 6.7 Growth: email, referrals, academy

| Variable | Consumed by | Required | Default | Description |
|---|---|---|---|---|
| `SMTP_URL` | `apps/services/growth/src/messaging/config.ts:36`; `infra/compose/docker-compose.yml:158` | **R** | `null` → log transport | `smtp[s]://[user:pass@]host:port`. Unset means emails are logged, not sent |
| `EMAIL_FROM` | `apps/services/growth/src/messaging/config.ts:37`; `infra/compose/docker-compose.yml:159` | **R** | `HeroPips <hello@heropips.com>` | RFC 5322 From |
| `EMAIL_REPLY_TO` | `apps/services/growth/src/messaging/config.ts:38`; `infra/compose/docker-compose.yml:160` | no | `null` | |
| `ADMIN_NOTIFY_EMAIL` | `apps/services/growth/src/common/config.ts:43`; `infra/compose/docker-compose.yml:161` | no | `null` | operational signup notifications. Unset means no admin mail; the signup itself is never blocked on it |
| `ADMIN_TOKEN` | `apps/services/growth/src/common/config.ts:42`; `infra/compose/docker-compose.yml:162` | **P** | `null` | `x-admin-token` for guarded admin endpoints such as `PATCH /v1/referrals/config`. Unset means those mutations return `503` |
| `MESSAGING_ENABLED` | `apps/services/growth/src/messaging/config.ts:41`; `infra/compose/docker-compose.yml:163` | no | `true` | only the literal string `false` disables it, stopping both the consumer and the scheduler |
| `MESSAGING_SWEEP_INTERVAL_SEC` | `apps/services/growth/src/messaging/config.ts:33`, `apps/services/growth/src/messaging/config.ts:39-40`; `infra/compose/docker-compose.yml:164`; `infra/compose/docker-compose.local.yml:51`; `infra/compose/docker-compose.staging.yml:71` | no | 60, floor 1 | journey and digest sweeper cadence; 15 locally so a journey step is observable while you watch |
| `ACADEMY_NUDGE_INTERVAL_SEC` | `apps/services/growth/src/academy/nudges.ts:54-55` | no | 3600, floor 5 | academy nudge sweeper. **Absent from every env file and compose file** — settable only by editing the service environment |
| `EARLY_ACCESS_DEV_CODE` | `apps/services/growth/src/common/config.ts:33`, `apps/services/growth/src/common/config.ts:46`; `infra/compose/docker-compose.yml:168`; `infra/compose/docker-compose.local.yml:49`; `infra/compose/docker-compose.production.yml:105` | local only | `null` when `NODE_ENV=production`, else `123456` | fixes **every** verification code to this value **and echoes it in the API response**. Preflight fails staging and production if it is set (`scripts/preflight.mjs:281-287`); the production overlay additionally forces it to `""` |
| `GA4_MEASUREMENT_ID` | `apps/services/growth/src/messaging/config.ts:42`; `infra/compose/docker-compose.yml:165` | no | `null` | server-side GA4 Measurement Protocol; both this and the secret are required to emit anything |
| `GA4_API_SECRET` | `apps/services/growth/src/messaging/config.ts:43`; `infra/compose/docker-compose.yml:166` | no | `null` | |

### 6.8 Signal and trading

| Variable | Consumed by | Required | Default | Description |
|---|---|---|---|---|
| `SOURCE` | `apps/services/signal/src/common/config.ts:15`; supplied by compose as `${SIGNAL_SOURCE:-sim}` (`infra/compose/docker-compose.yml:240`) | **P** | `sim` | only the exact string `binance` selects the live feed; anything else falls back to `sim`. Note the env-file name is `SIGNAL_SOURCE`, the container variable is `SOURCE` |
| `SIM_SEED` | `apps/services/signal/src/common/config.ts:16`, `apps/services/signal/src/common/config.ts:20`; `infra/compose/docker-compose.yml:241` | no | 42 | same seed ⇒ identical candles ⇒ identical signals |
| `SIGNAL_INTERVAL_SEC` | `apps/services/signal/src/common/config.ts:17`, `apps/services/signal/src/common/config.ts:21`; `infra/compose/docker-compose.yml:242`; `infra/compose/docker-compose.local.yml:69` | **P** | 60, or 30 locally | generation and resolution tick; `0` disables the loop |
| `CRED_KEY` | `apps/services/trading/src/common/config.ts:23`; `infra/compose/docker-compose.yml:267` | **R** | `DEV_CRED_KEY_HEX` (`apps/services/trading/src/common/config.ts:8-10`) | AES-256-GCM master key for broker credentials at rest, 64 hex chars. The service **throws at boot** on a bad shape (`apps/services/trading/src/common/config.ts:24-26`); preflight catches it earlier with an actionable message (`scripts/preflight.mjs:275-279`). Two known dev values are blocking placeholders (`scripts/preflight.mjs:93-102`). **Cannot be rotated without re-encrypting every stored credential** — see the runbook |
| `MARK_INTERVAL_SEC` | `apps/services/trading/src/common/config.ts:32`; `infra/compose/docker-compose.yml:268` | **P** | 30 | mark-to-market sweep; `0` disables |

### 6.9 Web (Next.js)

`NEXT_PUBLIC_*` values are **inlined into the client bundle at build time**
(`infra/compose/docker-compose.yml:293-294`). Changing one requires a rebuild
and a new `IMAGE_TAG`; restarting the container does nothing.

| Variable | Consumed by | Required | Default | Description |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `apps/web/lib/content.ts:7`, `apps/web/app/layout.tsx:13`, `apps/web/app/(marketing)/page.tsx:13`, `apps/web/app/(marketing)/founding/page.tsx:11`, `apps/web/app/api/mail/c/[id]/route.ts:5`; `infra/compose/docker-compose.yml:295` | **R** | `https://heropips.com` | canonical origin for metadata, OG tags and sitemaps |
| `NEXT_PUBLIC_CHAT_WS_URL` | `apps/web/components/app/ChatRoom.tsx:9`; `apps/web/next.config.ts:4-11`, which feeds the CSP `connect-src`; `infra/compose/docker-compose.yml:296` | **P** | `ws://localhost:4003/v1/chat/ws` | founding-lounge WebSocket. Its origin enters the CSP automatically. Beyond local this is `wss://<domain>/v1/chat/ws`, which the edge routes to `identity:4003` — see §7.4 |
| `NEXT_PUBLIC_LAUNCH_MODE` | `apps/web/lib/academy/access.ts:13`; `infra/compose/docker-compose.yml:297` | **P** | `prelaunch` | `prelaunch`, `main` or `maintenance` (`packages/contracts/src/index.ts:51`) |
| `NEXT_PUBLIC_GA4_ID` | `apps/web/next.config.ts:16-20`; `infra/compose/docker-compose.yml:298` | no | empty | when unset, no GA origin enters the CSP at all |
| `NEXT_PUBLIC_CLARITY_ID` | `apps/web/lib/analytics.ts:74`; `apps/web/next.config.ts:21-22`; `infra/compose/docker-compose.yml:299` | no | empty | same conditional-CSP treatment |
| `NEXT_TELEMETRY_DISABLED` | `apps/web/Dockerfile:22`; `.github/workflows/ci.yml:61` | no | `1` | |
| `NEXT_DIST_DIR` | `apps/web/next.config.ts:51` | no | `.next` | lets a production build run beside a live `next dev`. Not used in images, and the `web` Dockerfile hardcodes `.next` in its `COPY`, so setting it breaks the image |

### 6.10 Edge (Caddy) and resource limits

| Variable | Consumed by | Required | Default | Description |
|---|---|---|---|---|
| `SITE_DOMAIN` | `infra/compose/docker-compose.staging.yml:110`, `infra/compose/docker-compose.production.yml:152`; both Caddyfiles | **hard-required** | — | written `${SITE_DOMAIN:?…}`, so compose refuses to start without it |
| `ACME_EMAIL` | `infra/compose/docker-compose.production.yml:153`; `infra/compose/caddy/Caddyfile.production:34` | **hard-required in production** | — | `${ACME_EMAIL:?…}`; ACME account contact for certificate issuance |
| `UPSTREAM` | `infra/compose/docker-compose.staging.yml:111`, `infra/compose/docker-compose.production.yml:154`; both Caddyfiles | — | `web:3000`, hardcoded in the overlays | catch-all reverse-proxy target |
| `CHAT_UPSTREAM` | `infra/compose/docker-compose.staging.yml:113`, `infra/compose/docker-compose.production.yml:157`; `infra/compose/caddy/Caddyfile.production:70`, `infra/compose/caddy/Caddyfile.staging:48` | — | `identity:4003`, hardcoded in the overlays | target for the `/v1/chat/ws` handle only |
| `EDGE_HTTP_PORT`, `EDGE_HTTPS_PORT` | `infra/compose/docker-compose.staging.yml:107-108` | no | 80, 443 | staging only; production hardcodes 80/443 plus 443/udp (`infra/compose/docker-compose.production.yml:144-146`) |
| `STAGING_BASICAUTH_USER` | `infra/compose/docker-compose.staging.yml:116`; `infra/compose/caddy/Caddyfile.staging:28` | no | `heropips` | staging only |
| `STAGING_BASICAUTH_HASH` | `infra/compose/docker-compose.staging.yml:117` | **hard-required in staging** | — | generate with `docker run --rm caddy:2-alpine caddy hash-password --plaintext '<pw>'` |
| `SVC_CPU_LIMIT`, `SVC_MEM_LIMIT`, `SVC_MEM_RESERVE` | `infra/compose/docker-compose.production.yml:44-47` | no | `1.0`, `768M`, `256M` | applied to all five services |
| `WEB_CPU_LIMIT`, `WEB_MEM_LIMIT` | `infra/compose/docker-compose.production.yml:130-131` | no | `2.0`, `1G` | |

### 6.11 Mock provider and test harness

| Variable | Consumed by | Required | Default | Description |
|---|---|---|---|---|
| `PORT` | `infra/mocks/nowpayments/src/server.mjs:7` | no | 4090 | |
| `IPN_SECRET` | `infra/mocks/nowpayments/src/server.mjs:8`; set from `NOWPAYMENTS_IPN_SECRET` (`infra/compose/docker-compose.yml:125`) | no | `dev-ipn-secret` | HMAC-SHA512 signing key; must match billing's |
| `IPN_TARGET` | `infra/mocks/nowpayments/src/server.mjs:9`; `infra/compose/docker-compose.yml:126` | no | empty → the per-invoice `ipn_callback_url` | when set it **overrides** whatever callback URL billing supplied. Compose pins it to `http://billing:4002/v1/billing/ipn` |
| `BASE_URL` | `apps/web/playwright.config.ts:10`; `.github/workflows/e2e.yml:28` | no | `http://localhost:3100` | Playwright target. CI sets `:3000`; the `pnpm dev` stack is on `:3100` |
| `E2E_ACCESS_CODE` | `apps/web/e2e/helpers.ts:7`, `apps/web/e2e/platform-auth.spec.ts:53` | no | `hp_dev_alpha` | must be one of `EARLY_ACCESS_CODES` |
| `E2E_EARLY_ACCESS_CODE` | `apps/web/e2e/early-access.spec.ts:14` | no | `123456` | must equal `EARLY_ACCESS_DEV_CODE` |

---

## 7. Networking and ingress

### 7.1 One network, one ingress

All containers join the single bridge network `heropips`
(`infra/compose/docker-compose.yml:318-320`) and address each other by compose
service name. Beyond local, `caddy` is the only container with published ports.
This is not belt-and-braces: it is the reason CORS is disabled on every service
by design and no service implements browser-facing authentication. The browser
reaches Next.js (and, for the lounge socket, identity-svc through the edge);
Next.js fans out server-side (`infra/compose/docker-compose.yml:280-282`).

`infra/compose/docker-compose.staging.yml:32-33` is blunt about why Postgres has
no host port:

> reach it with `docker compose exec postgres psql`, or an SSH tunnel. An
> exposed 5432 on a shared host is how databases get found.

CI enforces the rule instead of trusting it: the `infra` job counts `published:`
entries in the rendered staging and production configs and fails if there are
more than three — the Caddy 80, 443 and 443/udp
(`.github/workflows/ci.yml:106-112`).

### 7.2 TLS

Caddy issues and renews certificates automatically over ACME. Production sets
the account email globally (`infra/compose/caddy/Caddyfile.production:34`); the
`caddydata` volume holds the account key and the certificates, so **it must
survive a redeploy** — otherwise every restart re-issues and will eventually hit
Let's Encrypt rate limits.

`trusted_proxies static private_ranges`
(`infra/compose/caddy/Caddyfile.production:38`,
`infra/compose/caddy/Caddyfile.staging:20`) is set because Caddy is the first hop
an untrusted client reaches and must not believe a client-supplied
`X-Forwarded-For`. It then sets `X-Real-IP {remote_host}` itself
(`infra/compose/caddy/Caddyfile.production:71`,
`infra/compose/caddy/Caddyfile.production:82`).

Production redirects `www.{$SITE_DOMAIN}` to the apex permanently
(`infra/compose/caddy/Caddyfile.production:44-46`), matching the 308 in
`apps/web/next.config.ts:69-74`, so no page is reachable at two URLs.

### 7.3 Header ownership

Deliberately split across three places
(`infra/compose/caddy/Caddyfile.production:25-37`):

| Header | Owner | Why |
|---|---|---|
| `Content-Security-Policy` | `apps/web/middleware.ts:26-36` (policy built in `apps/web/lib/security-headers.ts`) | it carries a per-request nonce, which a build-time `headers()` entry cannot produce; only the app knows which script and connect origins it uses, and GA/Clarity origins are added *only* when the corresponding ID is configured |
| `Strict-Transport-Security` | both — Caddy (`infra/compose/caddy/Caddyfile.production:61`) and Next (`apps/web/next.config.ts`), same value | transport concern; Caddy's copy survives an app that fails to render, and the browser keeps whichever value it saw last, so they must match |
| `X-Content-Type-Options`, `Referrer-Policy` | Caddy as backstop (`infra/compose/caddy/Caddyfile.production:62-63`), Next as authority | same reasoning |
| `X-Frame-Options`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Origin-Agent-Cluster`, `X-DNS-Prefetch-Control` | Next as authority; Caddy fills them in only when the response has none, via the `?` prefix (`infra/compose/caddy/Caddyfile.production:64-68`) | one source of truth, and the edge still covers responses the app never produced |
| `Permissions-Policy` | `apps/web/next.config.ts` only (`PERMISSIONS_POLICY`) | a 21-feature string; duplicating it at the edge would guarantee drift |
| `X-Robots-Tag` | Caddy, staging only (`infra/compose/caddy/Caddyfile.staging:43`) | second line of defence behind basic auth |
| `-Server`, `-X-Powered-By` | Caddy (`infra/compose/caddy/Caddyfile.production:69-70`) | plus `poweredByHeader: false` |

Do not duplicate the CSP into a Caddyfile. Two CSP headers are enforced as an
intersection, and an edge copy has no nonce — it would block every script the
app emits. `scripts/preflight.mjs` fails a staging/production run if a CSP with
`'unsafe-inline'` appears in any of these files, if HSTS goes missing from either
layer, or if the nonce stops being forwarded to Next.

### 7.4 The WebSocket upgrade path

The edge has **two upstreams**, split by `handle` blocks:

```
handle /v1/chat/ws {
  reverse_proxy {$CHAT_UPSTREAM}   # identity:4003
}
handle {
  reverse_proxy {$UPSTREAM}        # web:3000
}
```

(`infra/compose/caddy/Caddyfile.production:69-90`,
`infra/compose/caddy/Caddyfile.staging:47-65`.) `handle` blocks are used rather
than bare matchers because they are mutually exclusive and evaluated
most-specific-first, which makes the split explicit instead of depending on
directive-ordering subtleties (`infra/compose/caddy/Caddyfile.production:21-23`).

The split is load-bearing, not cosmetic. The founding-lounge WebSocket server is
attached to identity-svc's raw HTTP server
(`apps/services/identity/src/main.ts:36`) and accepts only the exact path
`/v1/chat/ws` (`apps/services/identity/src/chat/gateway.ts:47`). Next.js serves
no `/v1/**` route and declares no `rewrites()`, so routing the socket to
`web:3000` returns 404 and the client silently degrades to 10-second polling
(`apps/web/components/app/ChatRoom.tsx:10`,
`apps/web/components/app/ChatRoom.tsx:56-64`).

The WebSocket handle deliberately omits `response_header_timeout`
(`infra/compose/caddy/Caddyfile.production:72-75`): the connection is long-lived,
so a response-header deadline would tear it down. The catch-all handle keeps
`response_header_timeout 30s`.

**Staging caveat, by design.** `basic_auth`
(`infra/compose/caddy/Caddyfile.staging:27-29`) applies to the WebSocket handle
too, and browsers do not attach basic-auth credentials to a WebSocket handshake
initiated from JavaScript. The lounge socket therefore 401s on staging and the
client falls back to polling — stated explicitly at
`infra/compose/caddy/Caddyfile.staging:12-15`. Production has no basic auth, so
the socket connects. If you are debugging "chat works locally and in production
but not on staging", this is why; it is not a regression.

### 7.5 Cache-control by asset class

| Class | Match | Header | Rationale |
|---|---|---|---|
| Build assets | `/_next/static/*`, `/fonts/*`, `/icon-*.png`, `/icon.svg` | `public, max-age=31536000, immutable` | content-hashed by the Next build, so safe to cache forever (`infra/compose/caddy/Caddyfile.production:60-61`) |
| Service worker and manifest | `/sw.js`, `/manifest.webmanifest` | `no-cache, must-revalidate` | a cached SW pins an old app shell and stops clients receiving updates (`infra/compose/caddy/Caddyfile.production:65-66`) |
| Everything else | — | whatever Next.js sends | route-level caching stays the app's decision |

Compression is `zstd gzip`, in that preference order
(`infra/compose/caddy/Caddyfile.production:49`).

### 7.6 Proxy timeouts and logs

`dial_timeout 5s` on both handles; `response_header_timeout 30s` on the Next.js
handle only (`infra/compose/caddy/Caddyfile.production:86-87`) — long enough for
a streamed server-rendered response, short enough that a wedged upstream
connection is eventually reclaimed. Staging logs at `DEBUG`
(`infra/compose/caddy/Caddyfile.staging:70`), production at `INFO`
(`infra/compose/caddy/Caddyfile.production:95`), both JSON to stdout.

---

## 8. CI/CD

### 8.1 `ci.yml` — three jobs

Triggers: every push to `main`, every pull request. Concurrency-cancelled per
ref (`.github/workflows/ci.yml:8-10`).

**Job `verify`** (`.github/workflows/ci.yml:16`, 20-minute timeout) — static
gates, no containers, designed to fail a bad PR in under three minutes. Strictly
sequential; any non-zero step ends the job:

| # | Step | Command | Blocking? |
|---|---|---|---|
| 1 | checkout | `actions/checkout@v4` | yes |
| 2 | pnpm | `pnpm/action-setup@v4` | yes |
| 3 | node | `actions/setup-node@v4`, node 22, `cache: pnpm` | yes |
| 4 | install | `pnpm install --frozen-lockfile` | yes — a stale lockfile fails here |
| 5 | secret scan | `node scripts/secret-scan.mjs` | yes |
| 6 | brand guard | `node scripts/brand-guard.mjs` | yes |
| 7 | documentation integrity | `node scripts/docs-check.mjs` (`.github/workflows/ci.yml:41`) | yes |
| 8 | typecheck | `pnpm typecheck` | yes — **the real correctness gate**, because each service's `build` ends in `\|\| echo build-noop` |
| 9 | lint | `pnpm lint` (`.github/workflows/ci.yml:47`) | yes — though only `apps/web` has a real linter; the five services define `lint: echo ok` |
| 10 | tests | `pnpm test` | yes for the five services; `apps/web` uses `--passWithNoTests` |
| 11 | audit | `pnpm audit --prod --audit-level high` with `continue-on-error: ${{ github.event_name == 'pull_request' }}` (`.github/workflows/ci.yml:54-56`) | **advisory on a PR, blocking on main** |
| 12 | build | `pnpm build` with `NEXT_TELEMETRY_DISABLED=1` | yes for `web` |

The audit policy is the interesting call: a fresh upstream advisory cannot block
an unrelated fix on a PR, but it still has to be dealt with before it reaches
`main` (`.github/workflows/ci.yml:52-53`).

**Job `infra`** (`.github/workflows/ci.yml:68`, 10-minute timeout) — catches the
class of break that only appears when compose, the env templates and the scripts
are read together:

| # | Step | What it proves |
|---|---|---|
| 1 | materialise templates (`.github/workflows/ci.yml:78-85`) | `.env.local` from the example; staging and production rendered by substituting every `<angle>` placeholder, which proves the compose files still resolve every variable those templates promise |
| 2 | `preflight --env local` (`.github/workflows/ci.yml:87-88`) | the gate itself still passes on a clean checkout |
| 3 | `stack.mjs config` for all three environments (`.github/workflows/ci.yml:90-95`) | every overlay still merges; output captured to `/tmp/compose-<env>.yml` |
| 4 | no mocks, no service ports (`.github/workflows/ci.yml:100-113`) | staging and production configs contain no `mailpit`/`nowpayments-mock`, and at most three `published:` entries — the Caddy edge |
| 5 | preflight must **reject** local values as staging (`.github/workflows/ci.yml:118-129`) | copies `.env.local.example` to `.env.staging` and fails the build if preflight exits `0`. A zero exit here means dev credentials could reach a real environment |
| 6 | SQL apply/verify/seed **twice** (`.github/workflows/ci.yml:131-141`) | migrations and seeds are genuinely idempotent — the second run must be a no-op |
| 7 | teardown, `if: always()` (`.github/workflows/ci.yml:143-145`) | no leaked containers or volumes |

**Job `images`** (`.github/workflows/ci.yml:151`), `needs: [verify, infra]`,
`if: github.ref == 'refs/heads/main'`, 30-minute timeout: copies
`.env.local.example` to `.env.local` for variable substitution, then
`node scripts/stack.mjs build --env local`
(`.github/workflows/ci.yml:163`) — via the wrapper, so the local overlay and the
`mocks` profile are applied and **all seven** images are built, the mock
included. Building images on every PR is deliberately skipped: `verify` already
catches source-level breakage (`.github/workflows/ci.yml:148-149`).

### 8.2 `e2e.yml` — opt-in

Triggers: `workflow_dispatch`, or a `pull_request` `labeled` event whose label is
literally `e2e` (`.github/workflows/e2e.yml:17-20`). Because the trigger is
`labeled`, re-pushing to an already-labelled PR does **not** re-run it, and
merges to `main` never run e2e.

The suite needs the full stack up before Playwright starts — there is
deliberately no `webServer` block in `apps/web/playwright.config.ts`. The stack
comes from `pnpm stack:up`, not a raw `docker compose up`, and the header
explains exactly why (`.github/workflows/e2e.yml:6-12`): the base compose file
publishes no ports and keeps the payment and mail doubles behind the `mocks`
profile, so a bare compose invocation produces a stack the browser cannot reach
and a checkout flow with no payment provider.

Steps: install → `playwright install --with-deps chromium` →
`cp .env.local.example .env.local` → `pnpm stack:up` → `pnpm db:verify` →
`pnpm db:seed` → `pnpm --filter @heropips/web e2e` → on failure upload
`apps/web/e2e/.artifacts` for 7 days and dump `pnpm stack:ps` plus logs → always
`pnpm stack:down`.

### 8.3 Gaps

| Gap | Evidence | Impact |
|---|---|---|
| No image push, tag, scan or signature | `images` builds and stops (`.github/workflows/ci.yml:162-163`) | `IMAGE_TAG=<git-sha>` in both env examples has no producer. Staging and production are documented to pull images that CI never publishes — **the release half of the pipeline does not exist** |
| No deploy workflow at all | only `ci.yml` and `e2e.yml` exist | deploys are manual; see the [runbook](./09-operations-runbook.md) |
| `pnpm lint` is a no-op for 5 of 6 packages | `.github/workflows/ci.yml:47` runs it, but the five services define `lint: echo ok` | the step passes without linting any service code |
| The failure-path log dump hangs | `.github/workflows/e2e.yml:74` calls `node scripts/stack.mjs logs --env local --no-follow`, but `logs` always passes `-f` and `--no-follow` is collected into `opts.flags` and ignored (`scripts/stack.mjs:60`, `scripts/stack.mjs:252`) | on a failed e2e run the step follows logs until the 30-minute job timeout instead of dumping and exiting. Fix: honour the flag in `stack.mjs`, or call `docker compose logs --tail=200` directly |
| e2e runs by label only | `.github/workflows/e2e.yml:19-20` | a PR without the `e2e` label merges with no browser coverage, and merges to `main` never run it |
| Images are built only on `main` | `.github/workflows/ci.yml:154` | a Dockerfile-only regression is caught after merge, not before |

### 8.4 Recommended pipeline

```mermaid
flowchart TD
  PR[pull request] --> V[verify: secret-scan · brand-guard · docs-check<br/>typecheck · lint · test · audit advisory · build]
  PR --> I[infra: render 3 envs · assert no mocks<br/>assert no service ports · preflight negative test<br/>migrations idempotent twice]
  V --> IB[build images · tag pr-SHA · trivy scan · no push]
  I --> IB
  IB --> E2E[e2e on every PR via stack:up]
  E2E --> RV[review and merge]
  RV --> M[push to main]
  M --> V2[verify with audit BLOCKING · infra]
  V2 --> PUSH[build · scan · sign · push registry SHA<br/>emit SBOM and OCI revision labels]
  PUSH --> ST[deploy staging: render env from secret store<br/>pull · preflight · up · db apply]
  ST --> SM[smoke: five healthz probes · GET root · db verify]
  SM --> GATE{manual approval}
  GATE --> PD[deploy production: same steps, IMAGE_TAG=SHA]
  PD --> CAN[canary: error rate and p95 for 15 minutes]
  CAN --> DONE[record SHA as last-known-good]
```

In priority order, what is actually missing:

1. **Publish images.** On `main`, `docker buildx build --push` to
   `${IMAGE_REGISTRY}/<name>:${GITHUB_SHA}`, plus
   `trivy image --exit-code 1 --severity CRITICAL,HIGH` and `cosign sign`. Until
   this exists, staging and production cannot actually be deployed as documented.
2. **Add a deploy workflow** with an environment-protection gate that runs
   `preflight`, `stack:*:pull`, `stack:*:up` and `db:apply --yes` over SSH, and
   records the deployed SHA for rollback.
3. **Give the five services a real linter**, so step 9 stops being decorative.
4. **Run e2e on every PR** rather than by label, now that it uses the wrapper and
   is reliable.
5. **Move the `images` job to PRs** with `push: false`, so Dockerfile breakage is
   caught before merge.
6. **Fix `logs --no-follow`** in `scripts/stack.mjs` so the e2e failure path
   dumps and exits.

---

## 9. Scaling

### 9.1 What scales horizontally today

| Component | Replica-safe? | Why |
|---|---|---|
| `web` (Next.js) | yes | stateless; sessions are opaque cookies validated against identity-svc per request |
| `caddy` | yes, behind an external L4 load balancer | certificate storage (`caddydata`) would have to be shared |
| HTTP request handling in all five services | yes | no in-memory request state |
| Early-access resend cooldown | yes | enforced from `early_access_verifications.last_sent_at` (`apps/services/growth/src/early-access/early-access.service.ts:104-110`) |
| Seat allocation | yes | serialized on the single `ltd_seats` row through conditional `UPDATE`s (`infra/sql/billing/0001_init.sql:16-17`) |
| IPN idempotency | yes | `UNIQUE (payment_id, payment_status)` (`infra/sql/billing/0001_init.sql:82`) |
| Email send dedupe | yes | `msg_sends_dedupe_uq` on `dedupe_key` (`infra/sql/growth/0001_init.sql:345`) |
| Trading order idempotency | yes | `orders.idempotency_key` (`infra/sql/trading/0001_init.sql:105`) |

### 9.2 Named blockers

**1. In-process rate limiters (identity-svc).** `TokenBucket` is a plain `Map`
inside the process (`apps/services/identity/src/common/rate-limit.ts:7`), used by
login (`apps/services/identity/src/auth/auth.service.ts`) and chat flood control
(`apps/services/identity/src/chat/chat.service.ts:47`). Two replicas double every
limit; a deploy resets every bucket. *Fix:* a shared store (Redis token bucket),
or enforce at the edge in Caddy.

**2. In-process schedulers that double-fire.** Each runs on a bare
`setInterval` with no lease, no advisory lock and no `SKIP LOCKED` claim:

| Scheduler | File | Interval | Effect of a second replica |
|---|---|---|---|
| Billing hold sweeper | `apps/services/billing/src/founding/holds.job.ts:13` | 60 s (`apps/services/billing/src/founding/holds.job.ts:3`) | two sweepers racing to release expired holds |
| Growth messaging sweeper | `apps/services/growth/src/messaging/scheduler.ts:33` | `MESSAGING_SWEEP_INTERVAL_SEC`, default 60 s | duplicate journey steps — mitigated, not prevented, by `msg_sends_dedupe_uq` |
| Academy nudges | `apps/services/growth/src/academy/nudges.ts:56` | `ACADEMY_NUDGE_INTERVAL_SEC`, default 3600 s | duplicate nudges per cadence |
| Signal generation and resolution | `apps/services/signal/src/signals/signals.service.ts:49` | `SIGNAL_INTERVAL_SEC` | duplicate signals; partially blocked by `signals_one_active_per_symbol_uq` |
| Trading mark-to-market | `apps/services/trading/src/pnl/marks.ts:31` | `MARK_INTERVAL_SEC` | duplicate equity snapshots, so the equity curve gains phantom points |

*Fix:* wrap each tick in a Postgres advisory lock
(`SELECT pg_try_advisory_lock(<id>)`), or split the schedulers into a
single-replica worker deployment.

**3. Outbox relays double-publish.** Every relay runs
`SELECT … WHERE sent_at IS NULL ORDER BY created_at LIMIT 100` with **no**
`FOR UPDATE SKIP LOCKED` (`apps/services/growth/src/outbox/relay.ts:61-67`;
`apps/services/identity/src/outbox/relay.ts:43`), publishes, then sets
`sent_at`. Two replicas read the same rows in the same 2-second window and both
publish. KafkaJS `idempotent: true`
(`apps/services/growth/src/outbox/relay.ts:57`) deduplicates within one producer
session, not across processes. *Fix:* add `FOR UPDATE SKIP LOCKED` to the claim
query.

**4. Single Kafka broker.** KRaft single node, `KAFKA_NODE_ID: "1"`,
`KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093`, replication factor 1
(`infra/compose/docker-compose.yml:88-100`). No redundancy: losing the broker or
its `kafkadata` volume loses undelivered events. Because publishing goes through
the outbox, unsent rows survive in Postgres — but anything already marked
`sent_at` and not yet consumed is gone. *Fix:* managed Kafka with RF ≥ 3; point
`KAFKA_BROKERS` at it and start with `--scale kafka=0`
(`infra/compose/docker-compose.production.yml:21-26`).

**5. Single Postgres.** One container, one `pgdata` volume, five logical
databases, no replica and no WAL archiving wired up.
`infra/compose/docker-compose.staging.yml:50-53` sets `wal_level=replica` and
says so explicitly:

> Point-in-time recovery needs WAL archiving; wire the `archive_command` to your
> object store before treating staging backups as real.

One host loss is total data loss
(`infra/compose/docker-compose.production.yml:21-26`). *Fix:* managed Postgres,
with the same `--scale postgres=0` escape hatch.

**6. Connection-pool arithmetic.** Each service holds a pool of `max: 10`
(`apps/services/identity/src/db/client.ts:8`,
`apps/services/billing/src/db/client.ts:8`,
`apps/services/growth/src/db/client.ts:10`,
`apps/services/signal/src/db/client.ts:10`,
`apps/services/trading/src/db/client.ts:10`) plus a transient `max: 2` pool
during boot migration (`apps/services/identity/src/db/migrate.ts:54`,
`apps/services/billing/src/db/migrate.ts:54`). Steady state is 50 connections; a
simultaneous cold start peaks near 60. With `max_connections=300` in production
and 3 superuser slots reserved, the hard ceiling is 5 replicas of every service
before Postgres starts refusing connections — and each replica multiplies the
problems above. *Fix:* PgBouncer in transaction mode, or a lower per-pool `max`,
before scaling out.

**7. `LTD_SEAT_CAP` is a boot-time seed, not live configuration.**
`ltd_seats.cap` is written once (`infra/sql/billing/0001_init.sql:117-119`), so
changing the env var and restarting does nothing. Raising the cap is a
deliberate SQL operation — see the
[runbook](./09-operations-runbook.md#64-raise-the-seat-cap).

---

## 10. Known gaps and hazards

Ordered by blast radius. Nothing here is speculative; each item carries a
citation.

1. **Real NOWPayments IPNs would 404 in staging and production.** Both examples
   set `IPN_CALLBACK_URL=https://<domain>/api/billing/ipn`
   (`.env.staging.example:79`, `.env.production.example:100`), but
   `apps/web/app/api/` contains no `billing/` directory, no route under
   `apps/web/app/api` serves that path, and the edge has only two handles —
   `/v1/chat/ws` to identity and everything else to Next.js
   (`infra/compose/caddy/Caddyfile.production:69-90`). Since no service port is
   published, the provider has no other way in. **Consequence: paid orders would
   never be granted a seat.** Fix, either of:
   - add a route at `app/api/billing/ipn/route.ts` under `apps/web` that
     forwards the **raw** body
     and every `x-nowpayments-*` header verbatim to
     `${BILLING_URL}/v1/billing/ipn` — the HMAC covers the exact bytes, so any
     re-serialisation breaks verification; or
   - add a third handle to both Caddyfiles,
     `handle /api/billing/ipn* { reverse_proxy billing:4002 }`, and point
     `IPN_CALLBACK_URL` at it.

   Local is unaffected: the mock posts straight to
   `http://billing:4002/v1/billing/ipn` (`infra/compose/docker-compose.yml:126`).

2. **No monitoring, alerting or metrics of any kind.** No Prometheus, no
   exporters, no `/metrics` endpoint, no log shipping — logs go to the local
   `json-file` driver with rotation only
   (`infra/compose/docker-compose.yml:25-29`,
   `infra/compose/docker-compose.production.yml:34-38`). Detection is entirely
   manual. §7 of the [runbook](./09-operations-runbook.md#7-monitoring)
   specifies what to add and the exact query for each signal.

3. **The release half of CI/CD does not exist.** Images are built but never
   pushed, tagged, scanned or signed, and there is no deploy workflow
   (`.github/workflows/ci.yml:162-163`). `IMAGE_TAG=<git-sha>` has no producer.
   See §8.3.

4. **`nowpayments-mock` has no healthcheck and nothing depends on it.** The
   image declares none, `infra/compose/docker-compose.yml:115-126` declares none,
   and no service lists it in `depends_on`. Confirmed live: every other container
   reports `(healthy)` in `pnpm stack:ps`, the mock reports only `Up`. Billing can
   therefore start before the mock is listening, and `waitForHealth` treats
   health `none` as satisfied (`scripts/stack.mjs:161`). Local-only impact. Fix:
   the server already implements `GET /healthz`
   (`infra/mocks/nowpayments/src/server.mjs:249-251`) — add the same
   `wget`-based healthcheck the services use.

5. **Container images ship the full dev toolchain and run `tsx` at runtime**,
   with no `HEALTHCHECK` and no init process. See §4.1. Note the nuance: three of
   the five services *do* emit a `dist/` tree (`growth`, `signal`, `trading` set
   `"noEmit": false` in `tsconfig.build.json`), but nothing consumes it —
   `.dockerignore:11` excludes `**/dist` and every `CMD` is `tsx src/main.ts`.

6. **Boot-time `migrate.ts` bypasses the migration ledger.** A service can
   create a table that `schema_migrations` never records, so `db.mjs verify` can
   report `0 pending` for a database where `infra/sql/<svc>/0001_init.sql` never
   executed. The two must be kept in lockstep by hand
   (`infra/sql/identity/0001_init.sql:6-10`).

7. **`scripts/stack.mjs logs` cannot be used non-interactively.** It always
   passes `-f` (`scripts/stack.mjs:252`) and silently ignores unknown flags
   (`scripts/stack.mjs:60`), which is why the e2e failure-path log dump hangs
   (`.github/workflows/e2e.yml:74`). See §8.3.

8. **The founding lounge falls back to polling on staging.** `basic_auth` covers
   the WebSocket handle and browsers do not send basic-auth credentials on a
   JS-initiated handshake (`infra/compose/caddy/Caddyfile.staging:12-15`). This
   is documented and accepted, not a bug — but it means staging cannot validate
   the real-time path. Test the lounge locally or in production.

9. **Dead configuration that reads as live.**
   - `&pg-host` (`infra/compose/docker-compose.yml:44`) and `&node-health`
     (`infra/compose/docker-compose.yml:169`) are defined and never referenced —
     verified by grep. Consequently `POSTGRES_PORT_INTERNAL` has no effect, and
     each service repeats its healthcheck literally instead of reusing the
     anchor.
   - `x-limits` in the staging overlay is inert for `postgres`, `kafka` and
     `web`: each merges `*limits` and then declares its own `deploy:` key, and an
     explicit key wins over a merge key
     (`infra/compose/docker-compose.staging.yml:34-41`,
     `infra/compose/docker-compose.staging.yml:56-61`,
     `infra/compose/docker-compose.staging.yml:89-96`).
   - `infra/compose/docker-compose.local.yml:25-27` overrides
     `POSTGRES_INITDB_ARGS` with a value identical to the base
     (`infra/compose/docker-compose.yml:60`), under a comment about verbose
     statement logging that the value does not implement.
   - `infra/compose/README.md:14` still refers to
     `caddy/Caddyfile.{staging,prod}`; the file on disk is
     `infra/compose/caddy/Caddyfile.production`.

10. **`cap_drop: []` on postgres and kafka in production re-adds the full
    default capability set** (`infra/compose/docker-compose.production.yml:53`,
    `infra/compose/docker-compose.production.yml:85`), not just the capabilities
    those images need. It is a valid override of the `*hardening` anchor and it
    does keep them running, but the comment ("Postgres needs these to change to
    the postgres user") understates it. Prefer `cap_drop: [ALL]` plus
    `cap_add: [CHOWN, DAC_OVERRIDE, FOWNER, SETGID, SETUID]`.

11. **`preflight --fix-hints` is documented but not implemented**
    (`scripts/preflight.mjs:5` versus `scripts/preflight.mjs:393-396`).

12. **A stale comment claims a seat-price ladder exists.**
    `infra/sql/billing/0001_init.sql:62` reads "The seat ladder may have moved on
    since — never recompute from current tier." There is no ladder: the Founding
    Hero deal is a **flat $499** (`LTD.PRICE_USD_DEFAULT`,
    `packages/contracts/src/index.ts:292-297`, and `LTD_PRICE_USD=499` in all
    three env examples). The advice — never recompute a stored price — is still
    correct; the justification is not. The only ladder in billing is
    `PAYMENT_STATUS_RANK` (`packages/contracts/src/index.ts:195-198`).

13. **Kafka topics are never created explicitly in production.** Production
    disables auto-creation (`infra/compose/docker-compose.production.yml:96`)
    while the identity relay still passes `allowAutoTopicCreation: true`
    (`apps/services/identity/src/outbox/relay.ts:52`) — a producer-side flag the
    broker overrides. First publish fails until the six topics exist; see the
    [runbook](./09-operations-runbook.md#12-deploy-to-production).

---

## Related documents

- [Architecture](./01-architecture.md) — service boundaries and why they exist
- [Data model](./02-data-model.md) — every table, column and index
- [Flows](./03-flows.md) — cross-service sequences
- [Security](./06-security.md) — threat model and controls
- [Developer guide](./08-developer-guide.md) — running the stack without Docker
- [Operations runbook](./09-operations-runbook.md) — day-2 procedures
