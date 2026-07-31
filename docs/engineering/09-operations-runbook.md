# Operations runbook

Task-oriented procedures for running HeroPips: deploys and rollbacks, schema
migrations, secret rotation, backup and restore, incident playbooks, routine
day-2 operations, and what to monitor. Every command is copy-pasteable against
this repository. Written for whoever is on call, including at 03:00 with no
context.

Background lives elsewhere and is not repeated here: environment shapes,
compose overlays, the container images and the full environment-variable
reference are in [infrastructure](./07-infrastructure.md); tables and indexes are
in the [data model](./02-data-model.md); cross-service sequences are in
[flows](./03-flows.md); the threat model is in [security](./06-security.md).

---

## 0. Conventions

Every procedure assumes you are at the repository root on the host that runs the
stack. Paste this block first; every later command depends on it.

```bash
cd /srv/heropips                      # wherever the repo is checked out
ENV=production                        # or: staging | local
set -a; . "./.env.$ENV"; set +a       # POSTGRES_USER, IMAGE_TAG, … into the shell

hpc() {                               # raw compose, correct overlay and env file
  docker compose \
    --project-directory infra/compose \
    -f infra/compose/docker-compose.yml \
    -f "infra/compose/docker-compose.$ENV.yml" \
    --env-file ".env.$ENV" "$@"
}

hpsql() {                             # hpsql hp_billing -c "select 1"
  local db="$1"; shift
  hpc exec -T postgres psql -v ON_ERROR_STOP=1 --no-psqlrc \
    -U "${POSTGRES_USER:-hp}" -d "$db" "$@"
}

hkafka() {                            # hkafka kafka-topics.sh --list
  local bin="$1"; shift
  hpc exec -T kafka "/opt/kafka/bin/$bin" --bootstrap-server localhost:9092 "$@"
}
```

For local work prefer the wrappers — they pick the overlay, env file and
profiles for you, and they run preflight:

```bash
pnpm stack:up   pnpm stack:ps   pnpm stack:logs   pnpm stack:down
pnpm db:plan    pnpm db:apply   pnpm db:verify    pnpm db:seed
```

Facts you will need repeatedly:

| Thing | Value |
|---|---|
| Databases | `hp_identity`, `hp_billing`, `hp_growth`, `hp_signal`, `hp_trading` |
| Service ports (container-internal) | growth 4001, billing 4002, identity 4003, signal 4004, trading 4005, web 3000 |
| Health endpoint | `GET /healthz` on every service; `GET /` for web |
| Kafka topics | `hp.payment.events.v1`, `hp.growth.events.v1`, `hp.audit.log.v1`, `hp.signal.events.v1`, `hp.trade.events.v1`, `hp.identity.events.v1` (`packages/contracts/src/index.ts:245-252`) |
| The **only** consumer group | `hp-growth-messaging` (`apps/services/growth/src/messaging/consumer.ts:13`) — everything else only publishes |
| Founding Hero price | flat **$499** (`LTD.PRICE_USD_DEFAULT`, `packages/contracts/src/index.ts:292-297`). There is no seat-price ladder |
| Seat cap | 500 (`LTD.SEAT_CAP`), stored in `ltd_seats.cap` |
| Hold TTL | 120 minutes (`LTD.HOLD_TTL_MINUTES`) |

> **There is no monitoring stack.** No Prometheus, no exporters, no alerting, no
> log shipping. Every "diagnosis" step below is something a human runs by hand.
> §7 lists what to add and the exact check for each signal.

---

## 1. Deploys

### 1.1 Deploy to staging

1. Confirm the image tag exists in the registry. `IMAGE_TAG` must be an
   immutable tag, normally the commit SHA — never `latest`.

   ```bash
   git rev-parse --short=40 HEAD
   docker manifest inspect "$IMAGE_REGISTRY/web:$IMAGE_TAG" >/dev/null && echo "tag present"
   ```

   If the tag does not exist, stop: CI builds images but does not publish them
   (see [infrastructure §8.3](./07-infrastructure.md#83-gaps)). Until a publish
   step exists you must build and push manually from a clean checkout of that
   SHA.

2. Render `.env.staging` from the secret store — never hand-edit it on the host,
   and never copy `.env.local` over it.

   ```bash
   sops -d secrets/staging.env.enc > .env.staging && chmod 600 .env.staging
   grep -c '<' .env.staging   # must print 0: no unfilled <placeholders>
   ```

3. Gate on preflight. Do not skip this; it is the only thing standing between a
   dev placeholder and a real environment.

   ```bash
   pnpm preflight:staging
   ```

   A non-zero exit prints exactly what to fix and why
   (`scripts/preflight.mjs:380-385`). Fix it; do not use `--skip-preflight`.

4. Pull the pinned images.

   ```bash
   pnpm stack:staging:pull
   ```

5. Review what will actually run. This renders the merged config; it is the
   ground truth, not the files.

   ```bash
   node scripts/stack.mjs config --env staging | grep -E 'image:|published:'
   ```

   Expect exactly three `published:` entries (the Caddy edge) and no `mailpit` or
   `nowpayments-mock`.

6. Start. `up` runs preflight again, starts, waits for every healthcheck, then
   applies migrations (`scripts/stack.mjs:189-223`).

   ```bash
   pnpm stack:staging:up
   ```

7. Smoke test.

   ```bash
   ENV=staging
   for pair in growth:4001 billing:4002 identity:4003 signal:4004 trading:4005; do
     svc=${pair%:*}; port=${pair#*:}
     printf '%-9s ' "$svc"
     hpc exec -T "$svc" wget -qO- "http://127.0.0.1:$port/healthz" || echo -n FAILED
     echo
   done
   hpc exec -T web wget -qO /dev/null http://127.0.0.1:3000/ && echo "web ok"
   node scripts/db.mjs verify --env staging
   curl -sSu "$STAGING_BASICAUTH_USER" "https://$SITE_DOMAIN/" -o /dev/null -w '%{http_code}\n'
   ```

   Expect `{"ok":true}` five times, `web ok`, `All databases verified.` and `200`.

8. Record what you deployed, so a rollback is a lookup rather than an
   investigation.

   ```bash
   printf '%s  staging  %s  %s\n' "$(date -u +%FT%TZ)" "$IMAGE_TAG" "$(whoami)" \
     >> deploys.log
   ```

**Known staging behaviour, not a bug:** the founding-lounge WebSocket 401s at the
basic-auth gate and the client falls back to 10-second polling
(`infra/compose/caddy/Caddyfile.staging:12-15`). Test the real-time path locally
or in production.

### 1.2 Deploy to production

Same shape, with three differences: topics must already exist, the pull is
mandatory (production never builds), and you verify before and after.

1. **Pre-flight the release itself.** The commit must be green on `main`, and the
   image tag must be that commit.

   ```bash
   ENV=production
   set -a; . ./.env.production; set +a
   echo "$IMAGE_TAG"
   docker manifest inspect "$IMAGE_REGISTRY/web:$IMAGE_TAG" >/dev/null \
     && docker manifest inspect "$IMAGE_REGISTRY/identity-svc:$IMAGE_TAG" >/dev/null \
     && echo "images present"
   ```

2. **Render secrets and gate.**

   ```bash
   sops -d secrets/production.env.enc > .env.production && chmod 600 .env.production
   grep -c '<' .env.production            # must be 0
   pnpm preflight:production
   ```

3. **Create the Kafka topics if this is a first deploy.** Production disables
   auto-creation (`infra/compose/docker-compose.production.yml:96`), so the first
   publish fails until the six topics exist. This is idempotent-safe to attempt;
   an existing topic errors harmlessly.

   ```bash
   hpc up -d kafka
   for t in hp.payment.events.v1 hp.growth.events.v1 hp.audit.log.v1 \
            hp.signal.events.v1 hp.trade.events.v1 hp.identity.events.v1; do
     hkafka kafka-topics.sh --create --if-not-exists \
       --topic "$t" \
       --partitions "${KAFKA_NUM_PARTITIONS:-3}" \
       --replication-factor 1
   done
   hkafka kafka-topics.sh --list
   ```

4. **Back up the database before touching anything.** See §4.1. Do not skip this
   when the release contains a migration.

5. **Know what the migration will do** *before* it runs. `plan` is read-only and
   safe.

   ```bash
   node scripts/db.mjs plan --env production
   ```

6. **Pull, then start.**

   ```bash
   pnpm stack:prod:pull
   pnpm stack:prod:up
   ```

   `up` refuses to continue if preflight fails, if any container exits, or if
   migrations fail (`scripts/stack.mjs:199`, `scripts/stack.mjs:209`). A non-zero
   exit with containers running means "up but not fully healthy" — check
   `pnpm stack:ps` before assuming nothing started.

7. **Smoke test, then watch.**

   ```bash
   node scripts/db.mjs verify --env production
   curl -sS "https://$SITE_DOMAIN/" -o /dev/null -w 'root %{http_code} in %{time_total}s\n'
   curl -sS "https://$SITE_DOMAIN/api/founding/seats" | head -c 200; echo
   hpc ps
   hpc logs --since 5m --tail 200 | grep -iE 'error|unhandled|ECONN|FATAL' || echo "clean"
   ```

   Then leave logs following for at least 10 minutes:

   ```bash
   hpc logs -f --tail 50
   ```

   Watch specifically for: `outbox relay delivery failed`
   (`apps/services/growth/src/outbox/relay.ts:98`), `CRED_KEY must be 32 bytes`
   (`apps/services/trading/src/common/config.ts:25`), and repeated container
   restarts.

8. **Record the deploy** as in §1.1, step 8. This log is the rollback target
   list.

### 1.3 Roll back

Rolling back the **code** is cheap. Rolling back the **schema** is not — see the
warning at the end.

1. Find the previous known-good tag.

   ```bash
   tail -5 deploys.log
   ```

2. Point the environment at it and restart. Nothing is rebuilt; the old image is
   pulled by digest-stable tag.

   ```bash
   ENV=production
   PREV=<previous-sha>
   sed -i.bak "s/^IMAGE_TAG=.*/IMAGE_TAG=$PREV/" .env.production
   set -a; . ./.env.production; set +a
   pnpm stack:prod:pull
   pnpm stack:prod:up
   ```

3. Verify and record.

   ```bash
   node scripts/db.mjs verify --env production
   curl -sS "https://$SITE_DOMAIN/" -o /dev/null -w '%{http_code}\n'
   printf '%s  production  %s  ROLLBACK from %s\n' \
     "$(date -u +%FT%TZ)" "$PREV" "$IMAGE_TAG" >> deploys.log
   ```

**Roll back one service only** when the fault is isolated. Compose reads the tag
per service, so pin just that one:

```bash
hpc up -d --no-deps --pull always trading
```

(with `IMAGE_TAG` already set to the older value in the environment).

> **Migrations do not roll back.** `scripts/db.mjs` has no `down` command by
> design — there are no reverse migrations in this repository. If the release
> that broke production also added a column, rolling the image back leaves the
> new column in place. That is usually fine (additive DDL is
> backward-compatible), which is exactly why every migration should be additive.
> If the migration was destructive, the only recovery is a restore from backup
> (§4.2), which loses everything written since the dump.

> **`NEXT_PUBLIC_*` changes are not a restart.** They are compiled into the
> client bundle at image build time
> (`infra/compose/docker-compose.yml:293-294`). Changing one requires a rebuild
> and a new `IMAGE_TAG`; rolling back the env file alone changes nothing the
> browser sees.

---

## 2. Schema migrations

### 2.1 Apply a migration safely

1. **Read the plan.** Read-only, safe in any environment.

   ```bash
   node scripts/db.mjs plan --env production
   ```

   ```
   heropips db · env=production · postgres://heropips_app:***@postgres:5432/postgres

   identity   0 pending  up to date
   billing    1 pending  0002_add_refund_reason.sql
   growth     0 pending  up to date
   signal     0 pending  up to date
   trading    0 pending  up to date

   1 migration(s) pending.
   ```

2. **Read the file itself.** Confirm it is additive, wrapped in a transaction,
   and that any new index on a large table uses `CONCURRENTLY` (which means it
   cannot be inside the transaction — see §2.2).

3. **Back up first** (§4.1). Always, even for an "obviously safe" change.

4. **Apply.** `--yes` is mandatory outside local (`scripts/db.mjs:341-343`).

   ```bash
   node scripts/db.mjs apply --env production --yes
   ```

   To limit blast radius, apply one database at a time:

   ```bash
   node scripts/db.mjs apply --env production --service billing --yes
   ```

5. **Verify.**

   ```bash
   node scripts/db.mjs verify --env production
   ```

6. **Restart the services that read the changed tables**, so any prepared
   statements and pool connections pick up the new shape:

   ```bash
   hpc restart billing
   ```

**Ordering rule.** Deploy additive DDL *before* the code that uses it, and drop
columns *after* the code that used them is gone. One deploy should never both add
a `NOT NULL` column and depend on it — add nullable, backfill, then add the
constraint in a later migration.

### 2.2 Write a new migration

1. **Never edit an applied file.** The ledger stores `sha256` of the file
   contents (`scripts/db.mjs:281`) and any subsequent `plan`, `apply` or `verify`
   hard-fails (`scripts/db.mjs:305-311`). Create the next numbered file:

   ```bash
   ls infra/sql/billing/
   $EDITOR infra/sql/billing/0002_add_refund_reason.sql
   ```

   Zero-pad the number; files are applied in `sort()` order of filename
   (`scripts/db.mjs:271-273`).

2. **Follow the house pattern.** Copy the shape from
   `infra/sql/billing/0001_init.sql`: a header comment saying which service file
   it mirrors, `\set ON_ERROR_STOP on`, `BEGIN; … COMMIT;`, `IF NOT EXISTS`
   everywhere, and a `COMMENT ON` for every new table, notable column and index.

   ```sql
   -- ============================================================
   -- billing-svc — 0002_add_refund_reason
   -- ============================================================
   -- Mirrors apps/services/billing/src/db/migrate.ts and db/schema.ts.
   -- Additive and idempotent: safe to run against a live database.
   -- ============================================================
   \set ON_ERROR_STOP on
   BEGIN;

   ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason text;
   COMMENT ON COLUMN orders.refund_reason IS
     'Free-text reason captured when a refund IPN arrives. Null for every non-refunded order.';

   COMMIT;
   ```

3. **Mirror it in the service's boot DDL.** This is not optional. Both paths
   create the same objects, and whichever runs first wins
   (`infra/sql/identity/0001_init.sql:6-10`). If you change only the SQL file, a
   fresh container silently re-creates the old shape.

   ```bash
   $EDITOR apps/services/billing/src/db/migrate.ts   # add the same ALTER/CREATE
   ```

4. **Add it to `verify`'s critical set** if the object is load-bearing —
   `CRITICAL` in `scripts/db.mjs:49-100`. Absence of a critical object is silent
   data corruption rather than a loud crash, which is precisely what that list
   exists to catch.

5. **Prove it locally, including idempotency.** CI runs `apply`/`seed`/`verify`
   twice for exactly this reason (`.github/workflows/ci.yml:131-141`).

   ```bash
   pnpm db:plan
   pnpm db:apply
   pnpm db:verify
   pnpm db:apply      # must report "Already up to date."
   pnpm db:reset      # nuke and rebuild from scratch — local only
   pnpm db:apply
   pnpm db:verify
   ```

6. **Concurrent index creation.** `CREATE INDEX CONCURRENTLY` cannot run inside a
   transaction, so it cannot live in a `BEGIN; … COMMIT;` file. Put it in its own
   migration with no transaction wrapper and a comment saying why:

   ```sql
   \set ON_ERROR_STOP on
   -- No BEGIN/COMMIT: CREATE INDEX CONCURRENTLY cannot run in a transaction.
   -- Not atomic — if this fails, drop the INVALID index before re-running:
   --   DROP INDEX IF EXISTS orders_email_idx;
   CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_email_idx ON orders (email);
   ```

### 2.3 Recover from a failed migration

**Symptom A — `apply` failed on a file.**

```
ERROR  billing/0002_add_refund_reason.sql FAILED
ERROR:  column "refund_reason" of relation "orders" already exists
```

The file is **not** recorded in the ledger, because the record only happens after
a clean run (`scripts/db.mjs:353-368`), and its own `BEGIN/COMMIT` rolled the
statements back. So the database is unchanged.

```bash
# 1. Confirm nothing was recorded.
hpsql hp_billing -At -c \
  "SELECT version, checksum, applied_at FROM schema_migrations ORDER BY version"

# 2. Confirm the actual shape.
hpsql hp_billing -c "\d+ orders"

# 3. Fix the file, then re-plan and re-apply.
node scripts/db.mjs plan  --env production --service billing
node scripts/db.mjs apply --env production --service billing --yes
```

If the object *does* already exist — usually because the service's boot
`migrate.ts` created it first — make the migration idempotent
(`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`) rather than recording the file by
hand.

**Symptom B — `plan`/`apply`/`verify` all refuse with a checksum error.**

```
ERROR  billing/0001_init.sql changed after it was applied
(recorded 5f2c1a9b8e7d4c60, file 91ab33f0de11c4a7).
Applied migrations are immutable — add a new numbered file instead of editing this one.
```

Someone edited an applied file. In order of preference:

```bash
# Best: restore the file byte-for-byte. Even a comment change alters the hash.
git log --oneline -- infra/sql/billing/0001_init.sql
git checkout <commit-before-the-edit> -- infra/sql/billing/0001_init.sql
node scripts/db.mjs plan --env production --service billing   # must be clean now

# Then move the intended change into a new numbered file (§2.2).
```

Only if the edit is genuinely already applied to every environment, and you have
verified that by reading the live schema, re-point the ledger. This is a
last resort and must be recorded in the incident log:

```bash
NEW=$(sha256sum infra/sql/billing/0001_init.sql | cut -c1-16)
hpsql hp_billing -c \
  "UPDATE schema_migrations SET checksum = '$NEW' WHERE version = '0001_init'"
```

**Symptom C — a multi-file batch failed half way.** `apply` is not atomic across
files (each is a separate `psql` invocation), so earlier files are applied and
recorded, later ones are not. There is nothing to undo: fix the failing file and
re-run `apply`. `plan` shows exactly where it stopped.

**Symptom D — a partly-created `CONCURRENTLY` index.** A failed
`CREATE INDEX CONCURRENTLY` leaves an `INVALID` index that the planner ignores
but which still costs writes.

```bash
hpsql hp_trading -At -c \
  "SELECT c.relname FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
    WHERE NOT i.indisvalid"
hpsql hp_trading -c "DROP INDEX IF EXISTS <name-from-above>"
```

---

## 3. Secret rotation

### 3.1 Rotation matrix

| Secret | Rotate independently? | Restart needed | What breaks at the moment of rotation |
|---|---|---|---|
| `POSTGRES_PASSWORD` | yes, with a two-step change | all five services | nothing, if you `ALTER ROLE` first and restart second |
| `STATUS_TOKEN_SECRET` | yes | billing **and** growth together | every outstanding order-status link and every unsubscribe link becomes invalid |
| `ADMIN_TOKEN` | yes | growth | in-flight admin calls 401; unset means admin mutations return 503 |
| `NOWPAYMENTS_API_KEY` | yes | billing | new invoice creation until the provider dashboard and the env file agree |
| `NOWPAYMENTS_IPN_SECRET` | yes | billing | **every IPN in flight fails signature verification** — see §3.4 |
| `EARLY_ACCESS_CODES` | yes | identity | old codes stop redeeming immediately |
| `STAGING_BASICAUTH_HASH` | yes | caddy | existing browser sessions re-prompt |
| `CRED_KEY` | **no — see §3.7** | trading | **every stored broker credential becomes undecryptable** |

Generate values with the commands the templates document
(`.env.staging.example:11-14`):

```bash
openssl rand -base64 32     # STATUS_TOKEN_SECRET, ADMIN_TOKEN, passwords
openssl rand -hex 32        # CRED_KEY — exactly 64 hex chars
docker run --rm caddy:2-alpine caddy hash-password --plaintext '<password>'
```

After every rotation, re-gate and restart:

```bash
sops -e .env.production > secrets/production.env.enc   # update the store first
pnpm preflight:production
hpc up -d --no-deps <service>
```

### 3.2 `STATUS_TOKEN_SECRET`

Used by billing to sign order-status tokens
(`apps/services/billing/src/common/config.ts:31`) **and** by growth to sign
unsubscribe tokens and billing-compatible status tokens
(`apps/services/growth/src/messaging/config.ts:44`). The two **must** hold the
same value, and both services must be restarted together, or growth will mint
tokens billing rejects.

```bash
NEW=$(openssl rand -base64 32)
sed -i.bak "s|^STATUS_TOKEN_SECRET=.*|STATUS_TOKEN_SECRET=$NEW|" .env.production
pnpm preflight:production
hpc up -d --no-deps --force-recreate billing growth
```

Blast radius: order-status tokens carry no `exp` claim, so before rotation they
are valid forever and after rotation all of them are dead. Anyone holding an
emailed "check your order" link must request a new one. Rotate deliberately, not
routinely — and treat the missing expiry as the real bug
([security](./06-security.md)).

### 3.3 `ADMIN_TOKEN`

Guards admin mutations such as `PATCH /v1/referrals/config`
(`apps/services/growth/src/common/config.ts:42`). Unset means those endpoints
return 503 rather than being open, so an empty value fails closed.

```bash
NEW=$(openssl rand -base64 32)
sed -i.bak "s|^ADMIN_TOKEN=.*|ADMIN_TOKEN=$NEW|" .env.production
pnpm preflight:production
hpc up -d --no-deps --force-recreate growth
```

Rotate on every team change.

### 3.4 `NOWPAYMENTS_API_KEY` and `NOWPAYMENTS_IPN_SECRET`

Order matters. The provider signs callbacks; if the secrets disagree, callbacks
are recorded with `sig_valid = false` and **never advance an order**
(`infra/sql/billing/0001_init.sql:87`).

1. Rotate in the NOWPayments dashboard first
   (`.env.production.example:16`).
2. Update `.env.production`, preflight, restart billing:

   ```bash
   $EDITOR .env.production     # NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET
   pnpm preflight:production
   hpc up -d --no-deps --force-recreate billing
   ```

3. Check for callbacks that arrived during the window and were rejected:

   ```bash
   hpsql hp_billing -c "
     SELECT received_at, order_id, payment_id, payment_status
       FROM ipn_events
      WHERE sig_valid IS NOT TRUE
        AND received_at > now() - interval '1 hour'
      ORDER BY received_at DESC"
   ```

   Every row there is a payment event the system did not act on. Re-drive them
   from the provider dashboard (resend IPN) rather than editing orders by hand.
   The `(payment_id, payment_status)` unique constraint makes a resend safe.

Anyone holding `NOWPAYMENTS_IPN_SECRET` can forge a "paid" callback and mint free
lifetime seats (`scripts/preflight.mjs:89`). Treat it exactly like a payment
credential.

### 3.5 `POSTGRES_PASSWORD`

Two steps, so there is no window where the services hold a password the server
has already rejected.

```bash
NEW=$(openssl rand -base64 32)

# 1. Change it in the server, using the still-current credentials.
hpsql postgres -c "ALTER ROLE \"$POSTGRES_USER\" WITH PASSWORD '$NEW'"

# 2. Update every place the password appears, then restart the readers.
sed -i.bak \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$NEW|" \
  -e "s|\(postgres://[^:]*:\)[^@]*\(@\)|\1$NEW\2|g" \
  .env.production
grep -c "$NEW" .env.production      # expect 6: the password plus five DSNs
pnpm preflight:production
hpc up -d --no-deps --force-recreate identity billing growth signal trading
```

The five `DATABASE_URL_*` values embed the password
(`.env.production.example:61-65`); missing one leaves that service unable to
connect after its next restart, which may be hours later. The `grep -c` is the
check that catches it.

### 3.6 `EARLY_ACCESS_CODES`

Every code is a free lifetime account
(`apps/services/identity/src/common/config.ts:26`). Normally empty in production
(`.env.production.example:107`).

```bash
sed -i.bak "s|^EARLY_ACCESS_CODES=.*|EARLY_ACCESS_CODES=|" .env.production
pnpm preflight:production
hpc up -d --no-deps --force-recreate identity
```

Codes take effect and stop working purely on restart; there is no database state.
Audit what they created:

```bash
hpsql hp_identity -c "
  SELECT created_at, email, display_name, founding
    FROM users
   WHERE created_at > now() - interval '30 days'
   ORDER BY created_at DESC"
```

Cross-check each address against a paid order in `hp_billing.orders`; anything
with no order came from a code.

### 3.7 `CRED_KEY` — the one that cannot simply be rotated

`CRED_KEY` is the AES-256-GCM master key for broker credentials at rest
(`apps/services/trading/src/common/config.ts:23`). Ciphertext is stored in
`connections.cred_cipher` (`infra/sql/trading/0001_init.sql:35`) as
`base64(iv || tag || ciphertext)`. The key is **not** stored anywhere alongside
it and there is no key-id column, so nothing in the schema records which key
encrypted which row.

Consequences, stated plainly:

- **Changing `CRED_KEY` does not re-encrypt anything.** Every existing
  `cred_cipher` becomes permanently undecryptable. Live broker connections stop
  working; the plaintext is gone.
- **Losing `CRED_KEY` is identical to changing it.** Back it up in the secret
  manager *before* the first live connection is created
  (`.env.staging.example:90-92`).
- Trading refuses to boot if the value is not 64 hex characters
  (`apps/services/trading/src/common/config.ts:24-26`); preflight catches the
  same condition earlier with a fix hint (`scripts/preflight.mjs:275-279`).
- Two known dev values are blocking placeholders beyond local
  (`scripts/preflight.mjs:93-102`) — the compose default
  (`infra/compose/docker-compose.yml:267`) and `DEV_CRED_KEY_HEX`
  (`apps/services/trading/src/common/config.ts:8-10`).

**If you must rotate it** — suspected key compromise is the only good reason —
there is no in-place migration path today. The honest procedure is:

```bash
# 1. Scope the damage: how many live credentials exist?
hpsql hp_trading -At -c "
  SELECT mode, broker, count(*)
    FROM connections
   WHERE cred_cipher IS NOT NULL
   GROUP BY 1,2 ORDER BY 1,2"

# 2. Back up the ciphertext, so a wrong decision is not irreversible.
hpc exec -T postgres pg_dump -U "$POSTGRES_USER" -d hp_trading -t connections \
  | gzip > "connections-$(date -u +%FT%TZ).sql.gz"

# 3. Put the affected connections into an error state so the UI stops trying,
#    with a message the member can act on.
hpsql hp_trading -c "
  UPDATE connections
     SET status = 'error',
         status_detail = 'Credentials must be re-entered after a security key rotation',
         cred_cipher = NULL
   WHERE cred_cipher IS NOT NULL AND mode = 'live'"

# 4. Rotate the key and restart.
NEW=$(openssl rand -hex 32)
sed -i.bak "s|^CRED_KEY=.*|CRED_KEY=$NEW|" .env.production
pnpm preflight:production
hpc up -d --no-deps --force-recreate trading

# 5. Notify every affected member to re-enter their broker credentials.
```

Paper connections have no credentials and are unaffected. The proper fix — a
`cred_key_id` column plus a dual-read/re-encrypt job — does not exist yet; add it
before the live-broker user count makes step 5 unacceptable.

### 3.8 Staging basic-auth credentials

```bash
HASH=$(docker run --rm caddy:2-alpine caddy hash-password --plaintext 'new-password')
ENV=staging
sed -i.bak "s|^STAGING_BASICAUTH_HASH=.*|STAGING_BASICAUTH_HASH=$HASH|" .env.staging
hpc up -d --no-deps --force-recreate caddy
curl -sSu "heropips:new-password" "https://$SITE_DOMAIN/" -o /dev/null -w '%{http_code}\n'
```

---

## 4. Backup and restore

### 4.1 Back up Postgres

Production bind-mounts a host directory at `/backups`
(`infra/compose/docker-compose.production.yml:81`), which is where dumps belong.

Per-database logical dumps — this is the form you actually restore from, because
each service owns its own database and they are restored independently:

```bash
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
for db in hp_identity hp_billing hp_growth hp_signal hp_trading; do
  hpc exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$db" \
    --format=custom --compress=6 \
    --file="/backups/${db}-${STAMP}.dump"
done
hpc exec -T postgres ls -la /backups | tail -10
```

A whole-cluster dump as well, so roles and database definitions are captured:

```bash
hpc exec -T postgres pg_dumpall -U "$POSTGRES_USER" --globals-only \
  > "${PG_BACKUP_DIR:-./backups}/globals-${STAMP}.sql"
```

Verify the dump is readable before trusting it. A dump you have never restored is
a hypothesis:

```bash
hpc exec -T postgres pg_restore --list "/backups/hp_billing-${STAMP}.dump" | head -20
```

Ship it off-host immediately — a backup on the same volume as the database does
not survive the failure it exists for:

```bash
aws s3 cp "${PG_BACKUP_DIR:-./backups}/" "s3://heropips-backups/pg/$STAMP/" --recursive
```

**Retention and cadence.** Nothing schedules this today. Until it is automated,
run it before every deploy and daily by cron:

```cron
17 3 * * *  cd /srv/heropips && ENV=production ./ops/pg-backup.sh >> /var/log/hp-backup.log 2>&1
```

**Point-in-time recovery does not work yet.** `wal_level=replica` is set
(`infra/compose/docker-compose.production.yml:75`) but no `archive_command` is
configured, so WAL is not shipped anywhere — stated plainly at
`infra/compose/docker-compose.staging.yml:50-51`. Your recovery granularity is
"the last dump", not "any second". Wire `archive_command` to object storage
before treating these backups as complete.

### 4.2 Restore Postgres

Restore one database at a time. Do not restore the whole cluster unless you have
lost it.

1. **Stop the writers.** Restoring under live traffic produces a database that
   disagrees with itself.

   ```bash
   hpc stop web identity billing growth signal trading
   ```

2. **Restore into a fresh database, not over the live one.** This keeps the
   original available for comparison and makes the switch atomic.

   ```bash
   DB=hp_billing
   DUMP=/backups/hp_billing-20260730T031700Z.dump

   hpsql postgres -c "CREATE DATABASE ${DB}_restore"
   hpc exec -T postgres pg_restore -U "$POSTGRES_USER" -d "${DB}_restore" \
     --no-owner --no-privileges --exit-on-error "$DUMP"
   ```

3. **Sanity-check the restored copy** before cutting over.

   ```bash
   hpsql "${DB}_restore" -c "
     SELECT (SELECT count(*) FROM orders)        AS orders,
            (SELECT count(*) FROM ipn_events)    AS ipns,
            (SELECT granted || '/' || cap FROM ltd_seats) AS seats,
            (SELECT max(applied_at) FROM schema_migrations) AS last_migration"
   ```

4. **Swap.**

   ```bash
   hpsql postgres -c "ALTER DATABASE $DB RENAME TO ${DB}_broken"
   hpsql postgres -c "ALTER DATABASE ${DB}_restore RENAME TO $DB"
   ```

   If a rename fails on "database is being accessed by other users", find and end
   the sessions:

   ```bash
   hpsql postgres -c "
     SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname = '$DB' AND pid <> pg_backend_pid()"
   ```

5. **Bring the stack back and verify.**

   ```bash
   hpc start identity billing growth signal trading web
   node scripts/db.mjs verify --env production
   ```

6. **Keep `<db>_broken` for at least a week.** It is the only record of what was
   written between the dump and the incident.

### 4.3 What a restore does to in-flight Kafka events

This is the part that bites, so understand it before you restore.

Events are published through a transactional outbox: the domain write and its
`outbox` row commit together, and a relay drains
`outbox WHERE sent_at IS NULL` every 2 seconds, publishes to Kafka, then stamps
`sent_at` (`apps/services/growth/src/outbox/relay.ts:59-91`). Kafka keeps its own
log in the `kafkadata` volume, and consumer offsets live in Kafka, not in
Postgres. **Restoring Postgres therefore rewinds the producers but not the
broker.**

```mermaid
sequenceDiagram
  participant PG as Postgres (restored to T0)
  participant RL as outbox relay
  participant K as Kafka (still at T1)
  participant GM as hp-growth-messaging
  Note over PG,K: dump taken at T0 · incident at T1 · restore at T2
  PG->>RL: rows with sent_at IS NULL as of T0
  RL->>K: re-publish events already delivered between T0 and T1
  K->>GM: duplicate deliveries
  Note over GM: dedupe_key UNIQUE absorbs<br/>duplicate emails
  Note over PG: rows written T0..T1 are gone;<br/>their events remain in Kafka
```

Two distinct problems, in both directions:

**1. Re-publication (duplicates).** Any outbox row whose `sent_at` was stamped
after the dump comes back as `NULL`, so the relay publishes it again. Consumers
see a duplicate.

- The single consumer group `hp-growth-messaging`
  (`apps/services/growth/src/messaging/consumer.ts:13`) is protected for email by
  `msg_sends_dedupe_uq` on `dedupe_key`
  (`infra/sql/growth/0001_init.sql:345`) — a replayed step does not re-send.
- Journeys are protected by `UNIQUE (email, journey)`
  (`infra/sql/growth/0001_init.sql:309-318`) — a replayed trigger does not start
  a second sequence.
- `msg_signal_weeks` counters are **incremented**, not recomputed
  (`infra/sql/growth/0001_init.sql:356-362`), so replayed signal events inflate
  the weekly digest numbers. Expect that and correct it if it matters.

**2. Lost writes whose events already shipped.** Rows written between the dump
and the incident are gone from Postgres, but their events are still in the Kafka
log and were already consumed. The system is now in a state where a downstream
effect exists with no upstream record — for example a commission accrued in
growth for an order that no longer exists in billing. Reconcile explicitly:

```bash
# Referral commissions whose order is not in billing any more.
hpsql hp_growth -At -c "SELECT DISTINCT order_id FROM referral_commissions" \
  | sort > /tmp/growth-orders.txt
hpsql hp_billing -At -c "SELECT order_id FROM orders" \
  | sort > /tmp/billing-orders.txt
comm -23 /tmp/growth-orders.txt /tmp/billing-orders.txt
```

Anything printed is an orphan and needs a decision (reverse the commission, or
re-create the order from the `ipn_events` log if that survived).

**Do not "fix" this by wiping Kafka.** `docker volume rm` on `kafkadata` discards
every event not yet consumed by `hp-growth-messaging` and resets the group's
offsets, which loses real work. If you decide duplicates are unacceptable and
replay is worse than loss, the surgical option is to mark the pre-dump backlog as
already sent *before* restarting the services:

```bash
# Only if you have decided that re-publication is worse than event loss.
hpsql hp_billing -c \
  "UPDATE outbox SET sent_at = now() WHERE sent_at IS NULL AND created_at < now()"
```

Record that decision in the incident log; it is deliberate event loss.

---

## 5. Incident playbooks

### 5.1 A service will not start

**Symptom.** `hpc ps` shows the container `restarting`, `exited`, or `Up` but
`(unhealthy)`. `pnpm stack:up` exited non-zero. Requests through web to that
service fail.

**Diagnose.**

```bash
hpc ps -a
hpc logs --tail 200 --no-log-prefix trading      # the failing service
hpc events --since 10m | grep -i 'die\|health'
# There is no `docker compose inspect`; resolve the container id with compose,
# then inspect it with the docker CLI.
docker inspect --format \
  '{{.Name}} health={{.State.Health.Status}} exit={{.State.ExitCode}} restarts={{.RestartCount}}' \
  "$(hpc ps -q trading)"
```

Then match the log against the known boot failures:

| Log line | Cause | Fix |
|---|---|---|
| `CRED_KEY must be 32 bytes of hex (64 hex chars)` (`apps/services/trading/src/common/config.ts:25`) | malformed key | `openssl rand -hex 32`, set `CRED_KEY`, recreate trading. Read §3.7 first — a *new* key orphans existing credentials |
| `ECONNREFUSED …:5432` / `password authentication failed` | database unreachable or wrong DSN | §5.2, or check `DATABASE_URL_*` matches `POSTGRES_PASSWORD` (§3.5) |
| `relation "…" does not exist` | schema behind the code | `node scripts/db.mjs plan --env "$ENV"` then apply (§2.1) |
| `EADDRINUSE` | two stacks on one host, or a stale container | `hpc down --remove-orphans` then up; check `COMPOSE_PROJECT_NAME` |
| `SyntaxError` / `Cannot find module` in a `.ts` path | the image runs TypeScript through `tsx` at boot, so a source error surfaces here rather than at build | roll back the image tag (§1.3); the commit should never have passed `pnpm typecheck` |
| nothing at all, just `unhealthy` | the process is up but `/healthz` does not answer | probe from inside the container, below |

```bash
hpc exec -T trading wget -qO- http://127.0.0.1:4005/healthz || echo "no answer"
hpc exec -T trading ps -o pid,args
```

**Resolve.**

```bash
hpc up -d --no-deps --force-recreate trading
hpc logs -f --tail 50 trading
```

If it is a dependency-order problem rather than the service itself, note that all
five services wait on `postgres` and `kafka` being *healthy*
(`infra/compose/docker-compose.yml:175-177`) while `web` only waits for them to
have *started* (`infra/compose/docker-compose.yml:311-316`). A `web` that boots
before a service is ready is expected and self-heals on the next request.

**Local-only note.** The local overlay sets `restart: "no"`
(`infra/compose/docker-compose.local.yml:23`) deliberately: a crash stays
crashed so you can read it.

### 5.2 Database connection exhaustion

**Symptom.** `FATAL: sorry, too many clients already`; requests time out across
several services at once; `/healthz` still answers on some services because it
does not touch the database.

**Diagnose.**

```bash
# Current usage against the configured ceiling.
hpsql postgres -c "
  SELECT (SELECT setting::int FROM pg_settings WHERE name='max_connections') AS max,
         count(*) AS total,
         count(*) FILTER (WHERE state = 'active') AS active,
         count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_txn
    FROM pg_stat_activity"

# Who is holding them.
hpsql postgres -c "
  SELECT datname, usename, state, count(*)
    FROM pg_stat_activity GROUP BY 1,2,3 ORDER BY 4 DESC"

# Long-running or stuck transactions — these are usually the real cause.
hpsql postgres -c "
  SELECT pid, datname, state,
         now() - xact_start AS txn_age,
         left(query, 120) AS query
    FROM pg_stat_activity
   WHERE xact_start IS NOT NULL AND now() - xact_start > interval '1 minute'
   ORDER BY xact_start"

# Lock waits.
hpsql postgres -c "
  SELECT blocked.pid AS blocked_pid, blocking.pid AS blocking_pid,
         left(blocked.query, 80) AS blocked_query
    FROM pg_stat_activity blocked
    JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))"
```

**Expected baseline.** Five services × pool `max: 10`
(`apps/services/growth/src/db/client.ts:10` and the equivalent line in the other
four) = **50** connections steady state, plus a transient `max: 2` pool per
service during boot migration
(`apps/services/identity/src/db/migrate.ts:54`) — so roughly 60 at a
simultaneous cold start. Anything materially above that with one replica of each
service means a leak, not load.

**Resolve, in order.**

```bash
# 1. Terminate a specific stuck transaction (never a blanket kill).
hpsql postgres -c "SELECT pg_terminate_backend(<pid>)"

# 2. Recycle the service that is leaking; its pool is rebuilt from scratch.
hpc up -d --no-deps --force-recreate growth

# 3. Reclaim idle-in-transaction connections automatically (survives restart of
#    the setting, not of the container).
hpsql postgres -c "ALTER SYSTEM SET idle_in_transaction_session_timeout = '60s'"
hpsql postgres -c "SELECT pg_reload_conf()"

# 4. Raise the ceiling only if the baseline arithmetic says you need to.
$EDITOR .env.production      # PG_MAX_CONNECTIONS
hpc up -d --no-deps --force-recreate postgres    # restart required for this one
```

Do not scale services out as a fix: 50 connections per full set means the
ceiling of 300 is reached at 5 replicas of everything, and there are worse
problems at that point
([infrastructure §9.2](./07-infrastructure.md#92-named-blockers)). Put PgBouncer
in front, or lower the per-pool `max`.

### 5.3 Kafka consumer lag, or a stuck outbox

These are two different failures with overlapping symptoms. Separate them first:
**the outbox is Postgres-side (publish never happened); lag is Kafka-side
(publish happened, consumption did not).**

**Symptom.** Lifecycle emails stop. Weekly digest counters stop moving. Referral
commissions do not appear after a paid order.

**Step 1 — is anything unpublished?** One query across all five databases:

```bash
for db in hp_identity hp_billing hp_growth hp_signal hp_trading; do
  printf '%-12s ' "$db"
  hpsql "$db" -At -c "
    SELECT coalesce(count(*), 0) || ' unsent, oldest ' ||
           coalesce(age(now(), min(created_at))::text, 'n/a')
      FROM outbox WHERE sent_at IS NULL"
done
```

Healthy output is `0 unsent` everywhere, because the relay ticks every 2 seconds
with a batch of 100 (`apps/services/growth/src/outbox/relay.ts:7-9`). A backlog
whose oldest row is older than a minute means the relay is not draining.

**Step 2 — why is the relay not draining?** The relay never crashes on Kafka
being unreachable; it warns at most once per 30 s and retries forever
(`apps/services/growth/src/outbox/relay.ts:92-99`). So look for the warning:

```bash
hpc logs --since 30m growth billing identity signal trading \
  | grep -i 'outbox relay delivery failed'
hpc ps kafka
hpc logs --tail 100 kafka
hkafka kafka-topics.sh --list
```

Common causes:

| Finding | Cause | Fix |
|---|---|---|
| `kafka` container unhealthy or restarting | broker down | `hpc up -d --force-recreate kafka`, then confirm the backlog drains |
| `This server does not host this topic-partition` / `UNKNOWN_TOPIC_OR_PARTITION` in production | auto-creation is disabled in production (`infra/compose/docker-compose.production.yml:96`) and the topic was never created | create the six topics, §6.7 |
| relay warning with `ECONNREFUSED kafka:9092` | `KAFKA_BROKERS` wrong for this environment | fix the env file, recreate the service |
| no warning, backlog still growing | the service is up but the relay never started | `hpc logs <svc> \| grep -i outbox`; recreate the container |

**Step 3 — consumer lag.** There is exactly one consumer group in the system,
`hp-growth-messaging`, subscribed to five topics
(`apps/services/growth/src/messaging/consumer.ts:13-22`).

```bash
hkafka kafka-consumer-groups.sh --list
hkafka kafka-consumer-groups.sh --describe --group hp-growth-messaging
```

`LAG` should be near zero on every partition. A large, growing lag with the
group `Stable` means growth is consuming too slowly; with no members listed it
means growth is not consuming at all:

```bash
hpc logs --since 30m growth | grep -iE 'consuming|consumer|rebalanc|MESSAGING'
hpsql hp_growth -At -c "SELECT count(*) FROM msg_journeys WHERE status = 'active'"
```

Check `MESSAGING_ENABLED` has not been set to the literal `false`, which disables
both the consumer and the scheduler
(`apps/services/growth/src/messaging/config.ts:41`):

```bash
hpc exec -T growth printenv MESSAGING_ENABLED
```

**Resolve.**

```bash
hpc up -d --no-deps --force-recreate growth
sleep 20
hkafka kafka-consumer-groups.sh --describe --group hp-growth-messaging
```

**Do not reset offsets casually.** Resetting `hp-growth-messaging` to the
earliest offset replays every event the group ever saw. Email is protected by
`msg_sends_dedupe_uq` and journeys by `UNIQUE (email, journey)`, but
`msg_signal_weeks` counters are incremented and will be inflated
(`infra/sql/growth/0001_init.sql:356-362`). If you must:

```bash
hpc stop growth
hkafka kafka-consumer-groups.sh --group hp-growth-messaging \
  --topic hp.payment.events.v1 --reset-offsets --to-datetime '2026-07-30T00:00:00.000' --execute
hpc start growth
```

### 5.4 The seat ledger disagrees with orders

`ltd_seats` is a single row and the serialization point for the whole allocation
flow (`infra/sql/billing/0001_init.sql:16-17`). `orders.seat_state` is the
authoritative entitlement state; `payment_status` is only provider news
(`infra/sql/billing/0001_init.sql:38`).

**Symptom.** `/api/founding/seats` shows the wrong remaining count. A buyer who
paid cannot redeem. Sold-out is reported while seats are visibly available.

**Diagnose — the reconciliation query.**

```bash
hpsql hp_billing -c "
  WITH ledger AS (SELECT cap, granted, held FROM ltd_seats WHERE tenant_id = 'heropips'),
       actual AS (
         SELECT count(*) FILTER (WHERE seat_state = 'granted')  AS granted,
                count(*) FILTER (WHERE seat_state = 'held')     AS held,
                count(*) FILTER (WHERE seat_state = 'released') AS released
           FROM orders)
  SELECT l.cap,
         l.granted AS ledger_granted, a.granted AS orders_granted,
         l.granted - a.granted AS granted_drift,
         l.held    AS ledger_held,    a.held    AS orders_held,
         l.held    - a.held    AS held_drift,
         a.released
    FROM ledger l, actual a"
```

Both drift columns must be `0`.

**Then find the specific bad rows.**

```bash
# Paid but never granted — the actionable failure. Fix these first.
hpsql hp_billing -c "
  SELECT order_id, email, payment_status, seat_state, updated_at
    FROM orders
   WHERE payment_status = 'finished' AND seat_state <> 'granted'
   ORDER BY updated_at DESC"

# Holds that should have been released by the 60s sweeper.
hpsql hp_billing -c "
  SELECT order_id, email, hold_expires_at, age(now(), hold_expires_at) AS overdue
    FROM orders
   WHERE seat_state = 'held' AND hold_expires_at < now()
   ORDER BY hold_expires_at"

# Granted without a finished payment — the dangerous direction.
hpsql hp_billing -c "
  SELECT order_id, email, payment_status, updated_at
    FROM orders
   WHERE seat_state = 'granted' AND payment_status NOT IN ('finished','refunded')"
```

**Resolve.**

1. **Overdue holds** mean the sweeper is not running. It ticks every 60 s
   (`apps/services/billing/src/founding/holds.job.ts:3`) inside billing:

   ```bash
   hpc logs --since 30m billing | grep -iE 'hold|sweep|expire'
   hpc up -d --no-deps --force-recreate billing
   ```

   Then re-run the overdue query; it should empty within two minutes.

2. **Paid but not granted** is almost always a rejected or missing IPN — go to
   §5.5 before touching any row. Re-driving the IPN from the provider is correct;
   hand-editing `seat_state` is not, because it skips the outbox event that
   growth and identity depend on.

3. **Ledger drift with correct orders.** Recompute the counters from the orders
   table, which is the source of truth. Do this with billing stopped so nothing
   mutates underneath you.

   ```bash
   hpc stop billing
   hpsql hp_billing -c "
     BEGIN;
     UPDATE ltd_seats l
        SET granted = a.granted, held = a.held
       FROM (SELECT count(*) FILTER (WHERE seat_state = 'granted') AS granted,
                    count(*) FILTER (WHERE seat_state = 'held')    AS held
               FROM orders) a
      WHERE l.tenant_id = 'heropips';
     SELECT cap, granted, held FROM ltd_seats;
     COMMIT;"
   hpc start billing
   ```

   Note `ltd_seats.checksum` is a tamper-evidence digest recomputed by the
   service on every mutation (`infra/sql/billing/0001_init.sql:31`); a manual
   `UPDATE` leaves it stale. Record that you did this.

### 5.5 IPNs are being rejected

Every callback is written to `ipn_events` **before** validation, so the log is
complete even for hostile payloads (`infra/sql/billing/0001_init.sql:70-72`).
Rows with `sig_valid = false` are recorded and then ignored — they never advance
an order (`infra/sql/billing/0001_init.sql:87`).

**Symptom.** Buyers report a completed payment with no access. `orders` sits at
`payment_status = 'waiting'`, `seat_state = 'held'`.

**Diagnose.**

```bash
# Recent rejections.
hpsql hp_billing -c "
  SELECT received_at, order_id, payment_id, payment_status, sig_valid
    FROM ipn_events
   WHERE received_at > now() - interval '24 hours'
   ORDER BY received_at DESC LIMIT 50"

# Rejected-vs-accepted split. All-false means a secret mismatch,
# a mix means selective tampering or two providers configured.
hpsql hp_billing -c "
  SELECT sig_valid, count(*)
    FROM ipn_events
   WHERE received_at > now() - interval '24 hours'
   GROUP BY 1"

# Nothing at all arriving is a different failure — see below.
hpsql hp_billing -At -c "SELECT max(received_at) FROM ipn_events"
```

| Finding | Cause | Fix |
|---|---|---|
| every recent row `sig_valid = false` | `NOWPAYMENTS_IPN_SECRET` does not match the provider dashboard | §3.4; then have the provider resend the callbacks |
| `sig_valid = true` but the order did not advance | out-of-order or lower-ranked status; `PAYMENT_STATUS_RANK` (`packages/contracts/src/index.ts:195-198`) never regresses an order, and `finished`/`failed`/`expired` all rank 4 | inspect the full ladder for that payment, below |
| `ipn_events` is empty or stale for hours while orders are being created | callbacks are not reaching the service at all | the callback URL, below |
| duplicate rejection on retry | expected — `(payment_id, payment_status)` is the idempotency key (`infra/sql/billing/0001_init.sql:88-89`) | nothing to do |

The full ladder for one payment:

```bash
hpsql hp_billing -c "
  SELECT received_at, payment_status, sig_valid, raw->>'actually_paid' AS paid
    FROM ipn_events
   WHERE order_id = '<order_id>'
   ORDER BY received_at"
```

**If nothing is arriving at all**, check the callback URL end to end. This is a
known open gap: the staging and production templates point
`IPN_CALLBACK_URL` at `https://<domain>/api/billing/ipn`
(`.env.production.example:100`), but no such route exists in the web app and the
edge has only two handles — `/v1/chat/ws` to identity and everything else to
Next.js (`infra/compose/caddy/Caddyfile.production:69-90`). See
[infrastructure §10, gap 1](./07-infrastructure.md#10-known-gaps-and-hazards) for
the two fixes.

```bash
hpc exec -T billing printenv IPN_CALLBACK_URL
curl -sS -o /dev/null -w '%{http_code}\n' -X POST "https://$SITE_DOMAIN/api/billing/ipn" \
  -H 'content-type: application/json' -d '{}'      # 404 confirms the gap
hpc exec -T web wget -qO- --post-data='{}' \
  --header='content-type: application/json' \
  http://billing:4002/v1/billing/ipn ; echo        # the service itself answers
```

**Recovery after fixing the cause.** Resend from the provider dashboard rather
than editing orders. The unique constraint makes resends safe, and a resend goes
through the whole flow — signature check, status ladder, seat grant, outbox event
— which a manual `UPDATE` does not.

**Local reproduction.** The mock signs with the same HMAC-SHA512 scheme
(`infra/mocks/nowpayments/src/server.mjs:34-37`):

```bash
INV=$(curl -sS -X POST http://localhost:4090/v1/invoice \
  -H 'x-api-key: anything' -H 'content-type: application/json' \
  -d '{"order_id":"test-1","price_amount":499,"price_currency":"usd"}' \
  | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
curl -sS -X POST "http://localhost:4090/simulate/$INV/pay"
curl -sS "http://localhost:4090/simulate/$INV/log"
```

### 5.6 Email is not being delivered

Suppressed and capped attempts are **recorded**, not silently dropped
(`infra/sql/growth/0001_init.sql:348`), so "why did they not get the email" is
always answerable.

**Diagnose — start with the specific recipient.**

```bash
ADDR='member@example.com'
hpsql hp_growth -c "
  SELECT created_at, sent_at, template, category, status, left(error, 100) AS error
    FROM msg_sends WHERE email = '$ADDR'
   ORDER BY created_at DESC LIMIT 20"
```

Read `status` against this table:

| `status` | Meaning | Action |
|---|---|---|
| `sent` | handed to SMTP; delivery is now the provider's story | check the provider dashboard and `provider_id` |
| `queued` | never attempted — the sweeper is not running | check the scheduler, below |
| `failed` | SMTP rejected it; `error` says why | fix credentials or the address |
| `suppressed` | the recipient is in `msg_suppressions` | see below |
| `capped` | frequency cap hit; only `lifecycle` respects caps, `transactional` bypasses both (`infra/sql/growth/0001_init.sql:349`) | expected behaviour; verify the category is right |

```bash
# Is the address suppressed, and why?
hpsql hp_growth -c "SELECT * FROM msg_suppressions WHERE email = '$ADDR'"

# Is the sweeper alive at all?
hpsql hp_growth -c "
  SELECT status, count(*), min(next_run_at) AS earliest_due
    FROM msg_journeys GROUP BY 1"
hpsql hp_growth -At -c "
  SELECT count(*) FROM msg_journeys
   WHERE status = 'active' AND next_run_at < now() - interval '1 hour'"
```

A non-zero count on that last query means overdue journey steps: the sweeper is
stopped or erroring. It runs every `MESSAGING_SWEEP_INTERVAL_SEC`, default 60 s
(`apps/services/growth/src/messaging/config.ts:39-40`).

```bash
hpc exec -T growth printenv MESSAGING_ENABLED SMTP_URL EMAIL_FROM PUBLIC_ORIGIN
hpc logs --since 60m growth | grep -iE 'smtp|mail|transport|sweep|journey'
```

| Finding | Cause | Fix |
|---|---|---|
| `SMTP_URL` empty | growth logs emails instead of sending them (`apps/services/growth/src/messaging/config.ts:8-9`) | set `SMTP_URL`, recreate growth |
| `MESSAGING_ENABLED=false` | consumer *and* scheduler both disabled (`apps/services/growth/src/messaging/config.ts:41`) | unset it or set `true` |
| SMTP auth errors | credentials or provider block | fix `SMTP_URL`, recreate growth |
| `queued` rows with no log activity | scheduler not running | recreate growth |
| links in emails point at localhost | `PUBLIC_ORIGIN` wrong — preflight blocks this beyond local (`scripts/preflight.mjs:289-298`) | fix and recreate growth |
| nothing queued at all | the trigger event never arrived → §5.3 |

**Resolve.**

```bash
hpc up -d --no-deps --force-recreate growth
sleep 90     # at least one sweep interval
hpsql hp_growth -At -c \
  "SELECT count(*) FROM msg_sends WHERE created_at > now() - interval '5 minutes'"
```

**Locally**, nothing leaves the machine: Mailpit captures everything at
<http://localhost:8025> (`infra/compose/docker-compose.local.yml:40-41`).

### 5.7 The signal loop has stalled

**Symptom.** No new signals. Stale quotes in the app. Unrealized PnL frozen —
trading gets its quotes from signal-svc via `SIGNAL_URL`
(`apps/services/trading/src/common/config.ts:30`), so a stalled signal loop
freezes marks too.

**Diagnose.**

```bash
# The reliable liveness invariant: the loop resolves signals on every tick, so
# nothing may sit `active` past its own expiry for longer than one tick.
# This MUST be 0.
hpsql hp_signal -At -c "
  SELECT count(*) FROM signals WHERE status = 'active' AND expires_at < now()"

# Shape of the universe, and when the loop last resolved anything.
hpsql hp_signal -c "
  SELECT status, count(*), max(generated_at) AS newest
    FROM signals GROUP BY 1 ORDER BY 1"
hpsql hp_signal -c "
  SELECT symbol, side, status, horizon_min, generated_at, expires_at
    FROM signals WHERE status = 'active' ORDER BY generated_at DESC"
hpc exec -T signal printenv SOURCE SIM_SEED SIGNAL_INTERVAL_SEC
hpc logs --since 30m signal | tail -50
```

**Do not alert on "no new signal recently."** Generation is opportunistic: the
model only emits when it has a setup, and `signals_one_active_per_symbol_uq`
(`infra/sql/signal/0001_init.sql:42`) blocks a second active signal for a symbol
until the first resolves. Measured on a healthy local stack with
`SIGNAL_INTERVAL_SEC=30`, gaps between consecutive signals averaged about 4
minutes and peaked above 11 — so a "newest row is older than a few ticks"
threshold is a false-positive generator. The overdue-`active` count above is the
invariant that actually distinguishes a live loop from a dead one:

```bash
# Generation cadence, for context rather than alerting.
hpsql hp_signal -c "
  SELECT max(gap) AS worst_gap, avg(gap) AS mean_gap
    FROM (SELECT generated_at - lag(generated_at) OVER (ORDER BY generated_at) AS gap
            FROM signals WHERE generated_at > now() - interval '2 hours') g"
```

| Finding | Cause | Fix |
|---|---|---|
| `SIGNAL_INTERVAL_SEC=0` | the loop is disabled by configuration (`apps/services/signal/src/common/config.ts:21`) | set a positive value, recreate signal |
| `SOURCE=binance` plus HTTP errors in the log | the public Binance REST feed is unreachable or rate-limiting | temporarily set `SIGNAL_SOURCE=sim` to keep the platform functional, then investigate egress |
| `SOURCE` is neither `sim` nor `binance` | anything other than the exact string `binance` silently falls back to `sim` (`apps/services/signal/src/common/config.ts:15`) — a typo does not error | fix the value |
| container healthy, no log activity, no new rows | the interval timer died | recreate signal |
| duplicate-key errors on `signals_one_active_per_symbol_uq` | two signal replicas both generating (`infra/sql/signal/0001_init.sql:42`) | run exactly one replica ([infrastructure §9.2](./07-infrastructure.md#92-named-blockers)) |

**Resolve and confirm.**

```bash
hpc up -d --no-deps --force-recreate signal
sleep 90
hpsql hp_signal -At -c "
  SELECT count(*) FROM signals WHERE status = 'active' AND expires_at < now()"
hpc exec -T trading wget -qO- http://signal:4004/healthz; echo
```

Note that signal-svc writes its outbox rows *outside* the transaction that
changes signal state, unlike the other four services. A crash between the two can
leave a state change with no event, or an event with no state change. If signal
counts and downstream digests disagree after a crash, that is the cause; compare
`signals` against `outbox` for the window.

### 5.8 A member reports the wrong PnL

Work outward from the raw rows. All monetary values are integer minor units
(cents); prices are floats with per-symbol precision from `SYMBOLS`
(`packages/contracts/src/index.ts:391-399`).

```bash
UID='<identity user uuid>'

# 1. Connections. Paper accounts start at $10,000.00
#    (PAPER_STARTING_BALANCE_USD_MINOR, packages/contracts/src/index.ts:623).
hpsql hp_trading -c "
  SELECT id, broker, mode, status, left(status_detail, 60) AS detail,
         balance_usd_minor
    FROM connections WHERE user_id = '$UID'"

# 2. Open positions — these drive unrealized PnL and depend on live quotes.
hpsql hp_trading -c "
  SELECT symbol, side, qty, avg_entry, entry_fees_usd_minor, opened_at, signal_id
    FROM positions WHERE user_id = '$UID' ORDER BY opened_at"

# 3. Closed trades — realized PnL, fully determined by stored rows.
hpsql hp_trading -c "
  SELECT closed_at, symbol, side, qty, entry, exit, rpl_usd_minor, fees_usd_minor
    FROM trades WHERE user_id = '$UID' ORDER BY closed_at DESC LIMIT 25"
hpsql hp_trading -At -c "
  SELECT sum(rpl_usd_minor) AS realized, sum(fees_usd_minor) AS fees, count(*)
    FROM trades WHERE user_id = '$UID'"

# 4. Equity curve — appended by the mark sweeper every MARK_INTERVAL_SEC.
hpsql hp_trading -c "
  SELECT ts, equity_usd_minor FROM equity_snapshots
   WHERE user_id = '$UID' ORDER BY ts DESC LIMIT 20"
hpsql hp_trading -c "
  SELECT day, day_start_equity_usd_minor FROM day_anchors
   WHERE user_id = '$UID' ORDER BY day DESC LIMIT 10"
```

Then classify the complaint:

| Report | Likely cause | Check |
|---|---|---|
| unrealized PnL frozen | mark sweeper stopped, or quotes are stale | `hpc exec -T trading printenv MARK_INTERVAL_SEC` — `0` disables it (`apps/services/trading/src/common/config.ts:32`); then §5.7 |
| equity curve flat between fills | same — the sweeper is what moves it between trades (`apps/services/trading/src/pnl/marks.ts:14-16`) | gaps in `equity_snapshots.ts` larger than `MARK_INTERVAL_SEC` |
| equity curve has duplicate points at the same timestamp | two trading replicas both sweeping ([infrastructure §9.2](./07-infrastructure.md#92-named-blockers)) | `SELECT ts, count(*) FROM equity_snapshots WHERE user_id = '<uid>' GROUP BY 1 HAVING count(*) > 1` |
| realized PnL disagrees with their own arithmetic | fees, or a symbol whose quote currency is not USD — `USDJPY` has `base_is_usd: true` and `XAUUSD` a contract size of 100 (`packages/contracts/src/index.ts:391-399`) | recompute one trade by hand from `entry`, `exit`, `qty`, `contract_size` |
| `sharpe_30d` or `win_rate_30d` is null | deliberate: Sharpe needs ≥ 5 daily returns, win rate ≥ 1 closed trade (`packages/contracts/src/index.ts:598-610`) | not a bug; explain it |
| day change is wrong | missing or wrong `day_anchors` row for today (UTC) | the `day_anchors` query above; `TZ=UTC` in every container (`infra/compose/docker-compose.yml:42`) |
| a filled order they do not recognise | idempotency replay returning a cached response | `SELECT idempotency_key, created_at, response FROM orders WHERE user_id = '<uid>'` in `hp_trading` |

Gaps in `equity_snapshots` — the sweeper's downtime, visible directly:

```bash
hpsql hp_trading -c "
  SELECT ts, lead(ts) OVER (ORDER BY ts) - ts AS gap
    FROM equity_snapshots
   WHERE user_id = '$UID' AND ts > now() - interval '2 days'
   ORDER BY gap DESC NULLS LAST LIMIT 5"
```

Missing snapshots cannot be reconstructed: the sweeper marks against *current*
quotes, so a backfill would invent prices. Fix the sweeper, tell the member the
curve has a gap, and do not fabricate points.

---

## 6. Routine operations

### 6.1 Read logs

```bash
hpc logs -f --tail 200                       # everything, following
hpc logs -f --tail 200 billing               # one service
hpc logs --since 30m --no-log-prefix growth  # a window, no prefix
hpc logs --since 1h | grep -iE 'error|warn|unhandled|ECONN|FATAL'
hpc logs --since 24h billing | grep -i 'ipn'
```

Locally use the wrapper (it applies the overlay and the `mocks` profile):

```bash
pnpm stack:logs
node scripts/stack.mjs logs --env local --service growth
```

Two things to know:

- `scripts/stack.mjs logs` **always follows** (`scripts/stack.mjs:252`) and
  ignores unrecognised flags such as `--no-follow`
  (`scripts/stack.mjs:60`). For a bounded dump in a script, call compose
  directly: `hpc logs --tail 200 <service>`.
- Log retention is the local `json-file` driver only: 10 MB × 3 files per
  container in local and staging (`infra/compose/docker-compose.yml:25-29`),
  20 MB × 5 in production
  (`infra/compose/docker-compose.production.yml:34-38`). Nothing is shipped
  anywhere. Anything older than roughly the last 60 MB per container is gone —
  copy logs out **before** recreating a container you are debugging:

  ```bash
  hpc logs --no-log-prefix billing > "billing-$(date -u +%FT%TZ).log"
  ```

### 6.2 Exec into a container

```bash
hpc exec postgres psql -U "$POSTGRES_USER" -d hp_billing     # interactive psql
hpc exec -T growth printenv | sort                           # effective env
hpc exec -T growth wget -qO- http://127.0.0.1:4001/healthz; echo
hpc exec trading sh                                          # a shell
```

Via the wrapper (note the mandatory `--`):

```bash
node scripts/stack.mjs exec --env local --service postgres -- psql -U hp -d hp_growth
```

Containers run as the unprivileged `node` user and drop all capabilities in
production, so there is no package manager and no `apt-get`. Alpine has `sh`,
`wget`, `ps`. If you need a tool that is not there, run a sidecar on the same
network instead of mutating a running container:

```bash
hpc run --rm --entrypoint sh postgres -c \
  'pg_isready -h postgres -U '"$POSTGRES_USER"
```

Never `docker exec` a container you have not identified through compose — the
project prefix (`heropips`, `heropips-staging`, `heropips-prod`) is the only
thing distinguishing two stacks on one host.

### 6.3 Inspect the outbox backlog

Every service has the same `outbox` shape and the same partial index on unsent
rows (`infra/sql/billing/0001_init.sql:94-101`).

```bash
# Backlog across all five databases.
for db in hp_identity hp_billing hp_growth hp_signal hp_trading; do
  printf '%-12s ' "$db"
  hpsql "$db" -At -c "
    SELECT count(*) || ' unsent / ' || count(*) FILTER (WHERE sent_at IS NOT NULL)
           || ' sent, oldest unsent ' ||
           coalesce(age(now(), min(created_at) FILTER (WHERE sent_at IS NULL))::text, 'none')
      FROM outbox"
done

# What is stuck, by topic and event type.
hpsql hp_billing -c "
  SELECT topic, payload->>'type' AS event_type, count(*),
         min(created_at) AS oldest
    FROM outbox WHERE sent_at IS NULL
   GROUP BY 1,2 ORDER BY 3 DESC"

# One specific row, in full.
hpsql hp_billing -c "
  SELECT id, topic, created_at, jsonb_pretty(payload)
    FROM outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 1"
```

Force a re-publish of an event you know was lost downstream — the relay picks it
up within 2 seconds:

```bash
hpsql hp_billing -c "UPDATE outbox SET sent_at = NULL WHERE id = '<uuid>'"
```

Prune old sent rows. Nothing does this automatically, so the table grows forever:

```bash
hpsql hp_billing -c "
  DELETE FROM outbox
   WHERE sent_at IS NOT NULL AND sent_at < now() - interval '30 days'"
```

### 6.4 Raise the seat cap

`LTD_SEAT_CAP` seeds `ltd_seats.cap` on **first boot only**
(`infra/sql/billing/0001_init.sql:112-119`), so changing the environment variable
and restarting does nothing. Changing the cap is a deliberate SQL operation —
which is the intent, per `infra/sql/billing/0001_init.sql:28`.

```bash
# 1. Where are we?
hpsql hp_billing -c "SELECT cap, granted, held, cap - granted - held AS available
                       FROM ltd_seats WHERE tenant_id = 'heropips'"

# 2. Raise it. Never lower it below granted + held.
hpsql hp_billing -c "
  UPDATE ltd_seats SET cap = 750
   WHERE tenant_id = 'heropips' AND 750 >= granted + held
   RETURNING cap, granted, held"

# 3. Keep the env file honest for the next fresh deploy.
sed -i.bak 's/^LTD_SEAT_CAP=.*/LTD_SEAT_CAP=750/' .env.production

# 4. Confirm the public surface agrees.
curl -sS "https://$SITE_DOMAIN/api/founding/seats"; echo
```

An empty `RETURNING` means the guard rejected the change: the new cap was below
`granted + held`. `checksum` is recomputed by the service on its next mutation
and will be stale until then (`infra/sql/billing/0001_init.sql:31`). Note the
price does not change with the cap — the deal is a flat $499
(`packages/contracts/src/index.ts:292-297`).

### 6.5 Query the seat ledger

```bash
# Current state and the public numbers.
hpsql hp_billing -c "SELECT * FROM ltd_seats"
curl -sS "https://$SITE_DOMAIN/api/founding/seats"; echo

# Distribution of order states.
hpsql hp_billing -c "
  SELECT seat_state, payment_status, count(*)
    FROM orders GROUP BY 1,2 ORDER BY 1,2"

# Sales over time.
hpsql hp_billing -c "
  SELECT date_trunc('day', updated_at)::date AS day,
         count(*) AS granted,
         sum(price_usd_minor)/100.0 AS usd
    FROM orders WHERE seat_state = 'granted'
   GROUP BY 1 ORDER BY 1 DESC LIMIT 30"

# Live checkouts right now, with time left on the 120-minute hold.
hpsql hp_billing -c "
  SELECT order_id, email, hold_expires_at, hold_expires_at - now() AS remaining
    FROM orders WHERE seat_state = 'held' ORDER BY hold_expires_at"

# One buyer, end to end.
hpsql hp_billing -c "
  SELECT order_id, payment_status, seat_state, price_usd_minor/100.0 AS usd,
         pay_currency, actually_paid, ref_code, created_at, updated_at
    FROM orders WHERE email = 'buyer@example.com' ORDER BY created_at"
```

The reconciliation query that proves the ledger and the orders agree is in §5.4.

### 6.6 Replay a journey

A journey is an ordered list of `(template, delayDays)` steps, started by a
trigger event and cancelled by a goal event
(`apps/services/growth/src/messaging/journeys.ts:34-67`). Steps fire at
`SEND_HOUR_UTC = 14` on start-day + `delayDays`
(`apps/services/growth/src/messaging/journeys.ts:11`,
`apps/services/growth/src/messaging/journeys.ts:70-76`). `UNIQUE (email, journey)`
means re-triggering a running journey is a no-op, not a second sequence
(`infra/sql/growth/0001_init.sql:317`).

The three journeys: `early_access_nurture` (6 steps, days 1/3/5/8/12/19),
`founding_onboarding` (2 steps, days 1/3), `member_activation` (3 steps, days
2/5/10).

**Inspect.**

```bash
ADDR='member@example.com'
hpsql hp_growth -c "
  SELECT journey, step, status, started_at, next_run_at, context
    FROM msg_journeys WHERE email = '$ADDR'"
hpsql hp_growth -c "
  SELECT created_at, template, status, dedupe_key
    FROM msg_sends WHERE email = '$ADDR' ORDER BY created_at"
```

**Re-run a single step.** The send ledger's unique `dedupe_key` is what makes
every step exactly-once (`infra/sql/growth/0001_init.sql:352`), so a replay does
nothing until that row is removed. Removing it is a deliberate act.

```bash
# 1. Identify the exact send you want to repeat.
hpsql hp_growth -c "
  SELECT id, template, status, dedupe_key, created_at
    FROM msg_sends WHERE email = '$ADDR' AND template = 'fo_d1_redeem'"

# 2. Drop the ledger row (this is what unlocks the resend).
hpsql hp_growth -c "DELETE FROM msg_sends WHERE id = '<uuid>'"

# 3. Rewind the journey one step and make it due now.
hpsql hp_growth -c "
  UPDATE msg_journeys
     SET step = step - 1, status = 'active', next_run_at = now()
   WHERE email = '$ADDR' AND journey = 'founding_onboarding'
   RETURNING journey, step, next_run_at"
```

The sweeper picks it up within `MESSAGING_SWEEP_INTERVAL_SEC` (60 s in staging
and production, 15 s locally). Confirm:

```bash
sleep 90
hpsql hp_growth -c "
  SELECT created_at, template, status FROM msg_sends
   WHERE email = '$ADDR' ORDER BY created_at DESC LIMIT 3"
```

**Restart a whole journey from the beginning.**

```bash
hpsql hp_growth -c "
  DELETE FROM msg_sends
   WHERE email = '$ADDR'
     AND template LIKE 'ea_%'"          # templates of early_access_nurture
hpsql hp_growth -c "
  UPDATE msg_journeys
     SET step = 0, status = 'active', started_at = now(), next_run_at = now()
   WHERE email = '$ADDR' AND journey = 'early_access_nurture'"
```

**Stop a journey** — the right move if a template is wrong and mail is going out:

```bash
hpsql hp_growth -c "
  UPDATE msg_journeys SET status = 'cancelled', next_run_at = NULL
   WHERE journey = 'early_access_nurture' AND status = 'active'"
```

For a full stop of all lifecycle mail, set `MESSAGING_ENABLED=false` and recreate
growth — that disables the consumer and the scheduler together
(`apps/services/growth/src/messaging/config.ts:41`). Transactional mail stops
too, so treat it as an emergency brake, not a tuning knob.

Test against Mailpit locally before doing any of this in production:

```bash
pnpm stack:up
open http://localhost:8025
```

### 6.7 Create or inspect Kafka topics

Production disables auto-creation
(`infra/compose/docker-compose.production.yml:96`); local and staging allow it.

```bash
hkafka kafka-topics.sh --list
hkafka kafka-topics.sh --describe --topic hp.payment.events.v1

for t in hp.payment.events.v1 hp.growth.events.v1 hp.audit.log.v1 \
         hp.signal.events.v1 hp.trade.events.v1 hp.identity.events.v1; do
  hkafka kafka-topics.sh --create --if-not-exists --topic "$t" \
    --partitions "${KAFKA_NUM_PARTITIONS:-3}" --replication-factor 1
done

# Read the tail of a topic without joining the real consumer group.
hkafka kafka-console-consumer.sh --topic hp.payment.events.v1 \
  --from-beginning --max-messages 5

# Retention for one topic (overrides KAFKA_LOG_RETENTION_HOURS).
hkafka kafka-configs.sh --alter --entity-type topics \
  --entity-name hp.audit.log.v1 --add-config retention.ms=2592000000
```

Never consume with `--group hp-growth-messaging`: you would commit offsets on
behalf of growth and skip events it has not processed.

---

## 7. Monitoring

**There is no monitoring stack in this repository.** No Prometheus, no
exporters, no `/metrics` endpoint, no alert manager, no log shipping, no uptime
check. Logs go to the local `json-file` driver with rotation
(`infra/compose/docker-compose.yml:25-29`,
`infra/compose/docker-compose.production.yml:34-38`) and are discarded after
roughly 60 MB per container. Every check below is currently a human running a
command.

### 7.1 What to alert on, and the exact check for each

Severity: **P1** = wake someone; **P2** = same business day; **P3** = weekly
hygiene.

| # | Signal | Sev | Threshold | Check |
|---|---|---|---|---|
| 1 | Site down | P1 | 2 consecutive failures, 30 s apart | `curl -fsS https://$SITE_DOMAIN/ -o /dev/null` |
| 2 | A service unhealthy | P1 | any container not `healthy` for 2 min | `hpc ps --format '{{.Service}} {{.Health}}' \| grep -vE ' (healthy)?$'` — prints only bad rows. Note a plain `grep -v healthy` is **wrong**: it also swallows `unhealthy` |
| 3 | Container restart loop | P1 | restart count increases twice in 10 min | `docker inspect --format '{{.Name}} {{.RestartCount}}' $(hpc ps -q)` — there is no `docker compose inspect` |
| 4 | Outbox backlog | P1 | any unsent row older than 5 min | `hpsql hp_billing -At -c "SELECT count(*) FROM outbox WHERE sent_at IS NULL AND created_at < now() - interval '5 minutes'"` (repeat per database) |
| 5 | Kafka consumer lag | P1 | `hp-growth-messaging` lag > 1000 or rising 10 min | `hkafka kafka-consumer-groups.sh --describe --group hp-growth-messaging` |
| 6 | Paid but not granted | P1 | any row | `hpsql hp_billing -At -c "SELECT count(*) FROM orders WHERE payment_status='finished' AND seat_state<>'granted'"` |
| 7 | Seat-ledger drift | P1 | non-zero drift | the reconciliation query in §5.4 |
| 8 | IPN signature failures | P1 | ≥ 3 in 10 min | `hpsql hp_billing -At -c "SELECT count(*) FROM ipn_events WHERE sig_valid IS NOT TRUE AND received_at > now() - interval '10 minutes'"` |
| 9 | No IPN traffic while checkouts exist | P2 | held orders exist and no IPN for 30 min | `hpsql hp_billing -At -c "SELECT (SELECT count(*) FROM orders WHERE seat_state='held'), age(now(), (SELECT max(received_at) FROM ipn_events))"` |
| 10 | Connection saturation | P1 | > 80 % of `max_connections` | `hpsql postgres -At -c "SELECT round(100.0*count(*)/(SELECT setting::int FROM pg_settings WHERE name='max_connections')) FROM pg_stat_activity"` |
| 11 | Idle-in-transaction | P2 | any session > 5 min | `hpsql postgres -At -c "SELECT count(*) FROM pg_stat_activity WHERE state='idle in transaction' AND now()-xact_start > interval '5 minutes'"` |
| 12 | Signal loop stalled | P1 | any `active` signal past its own `expires_at` (the loop resolves on every tick) | `hpsql hp_signal -At -c "SELECT count(*) FROM signals WHERE status='active' AND expires_at < now()"` — must be `0`. Do **not** alert on generation gaps; see §5.7 |
| 13 | Mark sweeper stalled | P2 | newest snapshot older than 5 × `MARK_INTERVAL_SEC`, with open positions | `hpsql hp_trading -At -c "SELECT age(now(), max(ts)) FROM equity_snapshots"` |
| 14 | Email failures | P2 | > 5 % `failed` in 1 h, or any `queued` older than 30 min | `hpsql hp_growth -At -c "SELECT status, count(*) FROM msg_sends WHERE created_at > now() - interval '1 hour' GROUP BY 1"` |
| 15 | Overdue journey steps | P2 | any `active` row 1 h past `next_run_at` | `hpsql hp_growth -At -c "SELECT count(*) FROM msg_journeys WHERE status='active' AND next_run_at < now() - interval '1 hour'"` |
| 16 | Overdue seat holds | P2 | any held order past expiry by 5 min | `hpsql hp_billing -At -c "SELECT count(*) FROM orders WHERE seat_state='held' AND hold_expires_at < now() - interval '5 minutes'"` |
| 17 | TLS certificate expiry | P1 | < 14 days | `echo \| openssl s_client -connect "$SITE_DOMAIN:443" -servername "$SITE_DOMAIN" 2>/dev/null \| openssl x509 -noout -enddate` |
| 18 | Disk headroom | P1 | < 15 % free, or < 5 GiB | `df -h /var/lib/docker` |
| 19 | Backup freshness | P1 | newest dump older than 26 h | `ls -t "${PG_BACKUP_DIR:-./backups}"/hp_billing-*.dump \| head -1` |
| 20 | Database growth | P3 | any database growing > 20 % week over week | `hpsql postgres -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database WHERE datname LIKE 'hp\_%'"` |
| 21 | Slow queries | P3 | any statement over the log threshold | `hpc logs --since 24h postgres \| grep -c 'duration:'` |
| 22 | Unsent-outbox growth | P3 | sent rows never pruned | §6.3, prune step |
| 23 | Error-log rate | P2 | > 50 error lines in 15 min | `hpc logs --since 15m \| grep -icE 'error\|unhandled\|FATAL'` |
| 24 | Dependency advisories | P3 | any high-severity advisory | `pnpm audit --prod --audit-level high` (blocking on `main` in CI, `.github/workflows/ci.yml:54-56`) |

A single script covering the P1 rows, suitable for cron every minute:

```bash
#!/usr/bin/env bash
# ops/healthcheck.sh — exits non-zero with a reason on the first P1 breach.
set -uo pipefail
cd /srv/heropips
ENV=production
set -a; . ./.env.production; set +a
hpc() { docker compose --project-directory infra/compose \
  -f infra/compose/docker-compose.yml \
  -f infra/compose/docker-compose.production.yml \
  --env-file .env.production "$@"; }
hpsql() { local db="$1"; shift
  hpc exec -T postgres psql -At -v ON_ERROR_STOP=1 --no-psqlrc \
    -U "$POSTGRES_USER" -d "$db" "$@"; }
fail() { echo "P1 $*" >&2; exit 1; }

curl -fsS "https://$SITE_DOMAIN/" -o /dev/null || fail "site unreachable"

# Prints only containers that are neither healthy nor healthcheck-less (caddy).
# ' (healthy)?$' is portable ERE; ' (healthy|)$' is a GNU extension that BSD
# grep rejects with "empty (sub)expression".
hpc ps --format '{{.Service}} {{.Health}}' \
  | grep -vE ' (healthy)?$' | grep . && fail "container not healthy"

for db in hp_identity hp_billing hp_growth hp_signal hp_trading; do
  n=$(hpsql "$db" -c "SELECT count(*) FROM outbox
        WHERE sent_at IS NULL AND created_at < now() - interval '5 minutes'")
  [ "${n:-0}" -eq 0 ] || fail "$db outbox backlog: $n"
done

n=$(hpsql hp_billing -c "SELECT count(*) FROM orders
      WHERE payment_status = 'finished' AND seat_state <> 'granted'")
[ "${n:-0}" -eq 0 ] || fail "paid-but-not-granted orders: $n"

n=$(hpsql hp_billing -c "SELECT count(*) FROM ipn_events
      WHERE sig_valid IS NOT TRUE AND received_at > now() - interval '10 minutes'")
[ "${n:-0}" -lt 3 ] || fail "IPN signature failures: $n"

pct=$(hpsql postgres -c "SELECT round(100.0*count(*)/
      (SELECT setting::int FROM pg_settings WHERE name='max_connections'))
      FROM pg_stat_activity")
[ "${pct:-0}" -lt 80 ] || fail "connection usage ${pct}%"

n=$(hpsql hp_signal -c "SELECT count(*) FROM signals
      WHERE status = 'active' AND expires_at < now()")
[ "${n:-0}" -eq 0 ] || fail "signal loop not resolving: $n overdue active signals"

echo "ok"
```

### 7.2 What to build, in order

1. **Uptime and certificate checks first.** Any external prober against
   `https://$SITE_DOMAIN/`. Cheapest possible win; catches rows 1 and 17.
2. **Ship the logs.** Promtail or Vector to Loki, or the hosted equivalent. Today
   the evidence for any incident older than a few hours is already deleted, which
   makes every post-mortem guesswork.
3. **Expose `/metrics`.** Add `prom-client` to each Nest app next to the existing
   `/healthz` handler (`apps/services/billing/src/app.module.ts:22` and the
   equivalent in the other four), and export: HTTP request duration and status by
   route; `outbox` unsent gauge and relay tick duration; consumer lag; scheduler
   tick counts per job; pool in-use versus idle; per-domain business gauges
   (seats granted/held/available, active signals, active journeys).
4. **Scrape Postgres and Kafka.** `postgres_exporter` and `kafka_exporter` cover
   rows 5, 10, 11, 20 and 21 without any application change.
5. **Alert on business invariants, not just liveness.** Rows 6, 7, 8 and 16 are
   the ones that cost money and would otherwise be discovered by a customer
   email. They are cheap SQL; wire them as Prometheus rules against
   `postgres_exporter` custom queries.
6. **Add a canary to the deploy.** After §1.2 step 7, hold for 15 minutes on
   error rate and p95 latency before declaring the release good, and record the
   SHA as last-known-good only after that window.

Until items 2 and 3 exist, the honest operational posture is: **detection is
manual, and the mean time to notice a silent failure — a stopped scheduler, a
rejected IPN, a stalled relay — is however long it takes a member to complain.**

---

## Related documents

- [Infrastructure](./07-infrastructure.md) — environments, compose, images, CI/CD
- [Data model](./02-data-model.md) — every table, column and index
- [Flows](./03-flows.md) — cross-service sequences
- [Security](./06-security.md) — threat model, crypto parameters, controls
- [Developer guide](./08-developer-guide.md) — local development without Docker
- [API reference](./05-api-reference.md) — every HTTP endpoint
