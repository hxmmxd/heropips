# System patterns

What this covers: the nine recurring implementation patterns that every
contributor to this repository must follow, each with a canonical example
lifted from shipped code. These are not style preferences — each one exists
because the alternative produced a class of bug we refuse to have. Read this
before your first edit.

Rationale for each pattern lives in [decisions.md](./decisions.md); the
stack it sits on is [tech-context.md](./tech-context.md).

---

## Index

| # | Pattern | One-line rule |
|---|---|---|
| 1 | [Transactional outbox](#1-transactional-outbox) | A domain write and its event commit together, or not at all. |
| 2 | [Repository + in-memory double](#2-repository--in-memory-double) | Every service defines a repo interface and a faithful memory implementation. |
| 3 | [Module factory DI](#3-module-factory-di) | Nest modules are functions returning a class; every provider is token-wired. |
| 4 | [Zod boundary validation](#4-zod-boundary-validation) | `safeParse` at the edge, typed data inward, `422 validation_failed` outward. |
| 5 | [Error envelope](#5-error-envelope) | Every error is `ApiError`; internals never leak. |
| 6 | [Minor-unit money](#6-minor-unit-money) | Money crosses boundaries only as integer USD cents. |
| 7 | [Idempotency keys](#7-idempotency-keys) | Repeats are absorbed by a unique index, not by application logic. |
| 8 | [UTC dates](#8-utc-dates) | Calendar days are `YYYY-MM-DD` strings in UTC, never `Date`. |
| 9 | [Keyset pagination](#9-keyset-pagination) | Cursor over `(created_at, id)`, never `OFFSET`. |

---

## 1. Transactional outbox

**Rule.** A service never writes a row and then publishes to Kafka. It writes
the row and an `outbox` row in one transaction; a background relay drains
`WHERE sent_at IS NULL` and stamps `sent_at`. If the transaction rolls back the
event never existed; if the process dies the event is still there.

**Canonical example** — `apps/services/identity/src/db/repo.ts:195-204`:

```ts
async insertAudit(row: AuditRow, events: OutboxInsert[] = []): Promise<void> {
  await this.db.transaction(async (tx) => {
    await tx.insert(auditLog).values(row);
    if (events.length > 0) {
      await tx.insert(outbox).values(
        events.map((e) => ({ id: e.envelope.event_id, topic: e.topic, payload: e.envelope })),
      );
    }
  });
}
```

**The drain side** — `apps/services/growth/src/outbox/relay.ts:60-94`, polling
every 2 s, batch 100, grouped by topic, idempotent producer:

```ts
const rows = await this.db.select().from(outbox)
  .where(isNull(outbox.sentAt)).orderBy(asc(outbox.createdAt)).limit(BATCH_LIMIT);
if (rows.length === 0) return;                 // never touch Kafka while idle
if (!this.producer) this.producer = this.kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
// … group by topic …
await this.producer.send({ topic, messages: batch.map((r) => ({ key: r.id, value: JSON.stringify(r.payload) })) });
await this.db.update(outbox).set({ sentAt: new Date() }).where(inArray(outbox.id, ids));
```

**Envelope.** Always `makeEnvelope(type, payload)` →
`{event_id, type, occurred_at, tenant_id: "heropips", payload}`
(`apps/services/growth/src/outbox/outbox.service.ts:8-17`). The topic is pinned
by a per-domain helper (`paymentEvent`, `auditEvent`, `identityEvent`) so a
caller cannot publish to the wrong lane.

**Properties you must design around.** Delivery is **at-least-once**: a crash
between `send` and the `sent_at` update republishes. Every consumer must dedupe
— growth's messaging ledger does it with a unique `dedupe_key`. The relay never
throws and never blocks HTTP; it warns at most once per 30 s and retries
forever, so rows simply accumulate while Kafka is down.

**Non-compliance to be aware of.** signal-svc writes outbox rows *outside* the
transaction that changes signal state — it has no transaction seam in its repo
at all. That is a known defect, not a licensed variation. See
[progress.md](./progress.md).

---

## 2. Repository + in-memory double

**Rule.** Every service defines a `*Repo` interface, a Drizzle/Postgres
implementation, and an in-memory implementation used by the tests. The memory
double must reproduce the **same state guards** as SQL — not a convenient
approximation — or the tests certify behaviour the database will not deliver.

**Canonical example** — the cap guard exists in both. Postgres puts it in the
UPDATE predicate (`apps/services/billing/src/db/repo.ts:106-113`):

```sql
UPDATE ltd_seats SET held = held + 1
 WHERE tenant_id = $1 AND granted + held < cap
 RETURNING cap                       -- 0 rows ⇒ 'sold_out'
```

and the double reproduces it exactly
(`apps/services/billing/test/mem-repo.ts:15-32`):

```ts
/** In-memory BillingRepo with the exact same state guards as the Pg implementation. */
export class MemRepo implements BillingRepo {
  async createHeldOrder(order: NewOrder, events: OutboxInsert[] = []) {
    if (this.seatsRow.granted + this.seatsRow.held >= this.seatsRow.cap) return "sold_out";
    this.seatsRow.held += 1;
    // …
  }
}
```

**Where the seam lives.** The interface is exported from `src/db/repo.ts` with a
DI symbol (`BILLING_REPO`, `EARLY_ACCESS_REPO`, `TRADING_REPO`, …). Services
that need multi-statement atomicity expose a `tx(fn)` method taking a `*TxOps`
object rather than leaking the Drizzle transaction type —
`apps/services/growth/src/referrals/referrals.repo.ts:100-198` and
`apps/services/growth/src/academy/academy.repo.ts`. The memory doubles
implement `tx` as `fn(this)`.

**Doubles that exist today:** `billing/test/mem-repo.ts`,
`identity/test/mem-repo.ts`, `growth/test/academy-mem-repo.ts`,
`growth/test/messaging-mem-repo.ts`, plus inline repos in the growth
early-access and referral suites.

**When you add a repo method**, add it to the interface, the Pg class **and**
the double in the same change. A double that silently returns `undefined` for a
new method turns a real bug into a green test.

---

## 3. Module factory DI

**Rule.** Nest modules are **functions returning a class**, and every provider
is wired with an explicit string/symbol token plus `useFactory` + `inject`.

**Why it is not optional.** Services run under `tsx`/esbuild, which does **not**
emit `design:paramtypes` decorator metadata. Nest's implicit constructor
injection therefore resolves nothing. Every constructor parameter needs an
explicit `@Inject(TOKEN)`, and every provider needs an explicit factory. The
comment appears verbatim in every controller in the repo:
`// Explicit token: tsx/esbuild does not emit decorator design:paramtypes metadata.`
(`apps/services/growth/src/early-access/early-access.controller.ts:15`).

**Canonical example** — `apps/services/billing/src/app.module.ts:40-75`:

```ts
export function createAppModule(deps: AppDeps): Type<unknown> {
  const config = deps.config ?? loadConfig();
  const invoices = deps.invoices ?? new NowPaymentsClient(config.npApiUrl, config.npApiKey);

  @Module({
    controllers: [HealthController, SeatsController, CheckoutController, StatusController, IpnController, VerifyController],
    providers: [
      { provide: BILLING_CONFIG, useValue: config },
      { provide: BILLING_REPO, useValue: deps.repo },
      { provide: INVOICE_CLIENT, useValue: invoices },
      {
        provide: FoundingService,
        useFactory: (repo: BillingRepo, inv: InvoiceClient, cfg: BillingConfig) =>
          new FoundingService(repo, inv, cfg),
        inject: [BILLING_REPO, INVOICE_CLIENT, BILLING_CONFIG],
      },
      { provide: APP_FILTER, useClass: ApiExceptionFilter },
    ],
  })
  class AppModule {}

  return AppModule;
}
```

**The payoff.** `AppDeps` is the test seam:
`createAppModule({ repo: new MemRepo(3), invoices: fake, config: testConfig() })`
boots the **real** HTTP stack over fakes, which is how
`apps/services/billing/test/ipn.controller.test.ts` and
`apps/services/identity/test/app.test.ts` exercise routing, filters and body
parsing without a database.

**Also register `APP_FILTER: ApiExceptionFilter` in every module** — see
pattern 5.

---

## 4. Zod boundary validation

**Rule.** Controllers accept `unknown`. The first statement validates with
`safeParse` against a schema from `@heropips/contracts`. Failure is
`422 validation_failed` with a compact detail string. Everything downstream
receives typed data and does not re-check.

There is **no Nest `ValidationPipe`** anywhere. Zod is the only validation
layer, in every service and in the web BFF.

**Canonical example** —
`apps/services/growth/src/early-access/early-access.controller.ts:19-38`:

```ts
@Post("code")
@HttpCode(200)
async requestCode(@Body() body: unknown): Promise<EarlyAccessCodeRes> {
  const parsed = EarlyAccessCodeReq.safeParse(body ?? {});
  if (!parsed.success) {
    throw apiError(422, "validation_failed", zodDetails(parsed.error), "Enter a valid email address.");
  }
  return this.earlyAccess.requestCode(parsed.data);
}
```

`zodDetails` collapses the first three issues into one human line
(`apps/services/growth/src/common/errors.ts:58-63`):

```ts
return error.issues.slice(0, 3)
  .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
```

**Schema conventions.** Normalise in the schema, not the handler: emails are
`z.string().trim().toLowerCase().email().max(254)`; referral codes are
`.trim().regex(/^[A-Z0-9]{4,12}$/i)`. Cross-field rules use `.refine` with a
message (`ReferralConfigRes`, `packages/contracts/src/index.ts:328-336`;
`OrderReq`'s qty/risk_pct XOR, `:533-547`). Provider payloads use
`.passthrough()` when a signature covers the full body
(`NowPaymentsIpn`, `:215-233`). Request DTOs that are genuinely local to one
service may be declared in that service — `MeService`'s
`UpdateMeReq` / `ChangePasswordReq` are the only current examples
(`apps/services/identity/src/me/me.service.ts:15-19`).

**Mirror on the BFF.** `apps/web/app/api/**` validates with the same schemas
before any upstream call, and returns the same `422` shape
(`apps/web/app/api/_lib/bff.ts:47-52`).

---

## 5. Error envelope

**Rule.** Every error response is exactly
`{ error_code, message, remediation? }` where `error_code` is one of the 31
stable codes in `packages/contracts/src/index.ts:9-41`. Provider errors, stack
traces and driver messages never reach a client.

**Canonical example** — `apps/services/growth/src/common/errors.ts:12-55`:

```ts
export class ApiHttpError extends Error {
  constructor(public readonly status: number, public readonly body: ApiError) { super(body.message); }
}

export function apiError(status: number, error_code: ErrorCode, message: string, remediation?: string) {
  return new ApiHttpError(status, { error_code, message, ...(remediation ? { remediation } : {}) });
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<ReplyLike>();
    if (exception instanceof ApiHttpError) { void reply.status(exception.status).send(exception.body); return; }
    if (exception instanceof HttpException) { /* map to a typed body */ return; }
    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    void reply.status(500).send({ error_code: "internal", message: "Unexpected error." } satisfies ApiError);
  }
}
```

The `@Catch()` with no argument is deliberate: it catches **everything**, so
there is no path by which an unhandled throw becomes an untyped 500. Register
it as `APP_FILTER` in the module factory.

**Adding an error code** means adding it to `ErrorCodes` in contracts first.
The enum is the client's exhaustive switch; a stringly-typed code that is not
in the list will fail `ApiError.parse` on the way back through the BFF.

**Remediation is for the user, message is for the developer-facing UI.** Use
both when the caller can actually do something:

```ts
apiError(409, "academy_spin_used",
  "Today's spin is already used.",
  "Come back after midnight UTC for another spin.");
// apps/services/growth/src/academy/academy.service.ts:274-279
```

---

## 6. Minor-unit money

**Rule.** Every monetary value that crosses an API boundary or lands in a
database is an **integer number of USD cents**, named `*_usd_minor`. Floats are
permitted only for *prices* of instruments, which carry a per-symbol
`precision` from `SYMBOLS`.

The invariant is stated in contracts
(`packages/contracts/src/index.ts:383-385`) and enforced structurally by
`z.number().int()` on every money field: `total_usd_minor` (`:357`),
`amount_usd_minor` (`:370`), `fee_usd_minor` (`:552`), `upl_usd_minor` (`:573`),
`rpl_usd_minor` / `fees_usd_minor` (`:587-588`), the five `PnlSummaryRes` fields
(`:599-604`), `equity_usd_minor` (`:612`).

**Canonical examples.**

```ts
// Conversion happens once, at the edge, with an explicit round.
priceUsdMinor: Math.round(config.ltdPriceUsd * 100)
// apps/services/billing/src/founding/founding.service.ts:53

// Arithmetic on minor units uses integer floor — never a float multiply.
const amount = Math.floor(totalUsdMinor * rateBps / 10_000);
// apps/services/growth/src/referrals/referrals.service.ts:111-156

// The starting paper balance is a minor-unit literal with the dollars visible.
export const PAPER_STARTING_BALANCE_USD_MINOR = 10_000_00; // $10,000.00
// packages/contracts/src/index.ts:623
```

Note the `10_000_00` spelling: underscore-separated so the reader sees dollars
and cents. Copy it.

**Presentation converts at the last possible moment.**
`OrderStatusRes.price_usd` is a float derived as `priceUsdMinor / 100` in the
response mapper
(`apps/services/billing/src/founding/founding.service.ts:176-200`), never
stored.

**Known deviation:** `orders.actually_paid` is a Postgres `numeric` written via
`String(...)` and read back with `Number(...)`
(`apps/services/billing/src/db/repo.ts:167,141`) because the provider reports a
crypto amount, not cents. Treat it as provider-reported metadata, never as a
value to compute with.

---

## 7. Idempotency keys

**Rule.** Repeat delivery is absorbed by a **unique index plus
`ON CONFLICT DO NOTHING … RETURNING`**, which yields a boolean "was this new".
Never `SELECT`-then-`INSERT`; never rely on application-level "have I seen
this".

**Canonical example** —
`apps/services/growth/src/referrals/referrals.repo.ts:166-179`:

```ts
insertCommission: async (row) => {
  const inserted = await tx
    .insert(referralCommissions)
    .values(row)
    .onConflictDoNothing({
      target: [referralCommissions.orderId, referralCommissions.beneficiaryId, referralCommissions.level],
    })
    .returning({ id: referralCommissions.id });
  return inserted.length > 0;      // false ⇒ duplicate; caller emits no event
},
```

The caller emits its Kafka event **only when a row was actually inserted**
(`apps/services/growth/src/referrals/referrals.service.ts:111-156`). That is the
whole point: the unique index decides, and the event follows the decision.

**The keys in use.**

| Domain | Key | Where |
|---|---|---|
| NOWPayments IPN | `UNIQUE (payment_id, payment_status)` | `apps/services/billing/src/db/migrate.ts:40` |
| Referral commission | `UNIQUE (order_id, beneficiary_id, level)` | `apps/services/growth/src/db/migrate.ts:95` |
| Referral closure edge | `PK (descendant_id, ancestor_id)` | `apps/services/growth/src/db/migrate.ts:81` |
| Email send | `UNIQUE dedupe_key` (`msg_sends_dedupe_uq`) | `apps/services/growth/src/db/migrate.ts:100-210` |
| Academy nudge | composite `PK (user_id, cadence, sent_on)` | `apps/services/growth/src/academy/academy.repo.ts:243-254` |
| Certificate | `UNIQUE (user_id, track)`, `UNIQUE (code)` | `apps/services/growth/src/db/migrate.ts:100-210` |
| Trading order | client-supplied `idempotency_key`, 8–80 chars, **required** | `packages/contracts/src/index.ts:544` |

**Client-supplied keys** are minted when the UI *opens* the order sheet, not on
submit (`apps/web/components/app/OrderSheet.tsx:40`), so retrying the same sheet
is safe and reopening it deliberately mints a new one.

**Complementary pattern — conditional UPDATE with a state predicate.** When the
guard is a state transition rather than a duplicate row, put the precondition in
the `WHERE` and check `RETURNING`
(`apps/services/billing/src/db/repo.ts:180-195`):

```sql
UPDATE orders SET payment_status='finished', seat_state='granted'
 WHERE order_id = $1 AND seat_state = 'held'
 RETURNING id                              -- 0 rows ⇒ someone else won; do nothing
```

---

## 8. UTC dates

**Rule.** A "day" is a `YYYY-MM-DD` string in UTC. It is never a `Date`, never
a local date, and never derived from a client timezone. Streaks, arcade caps,
daily spins and nudge windows all key on it.

**Canonical example** — `apps/services/growth/src/academy/xp.ts:11-26`:

```ts
/** UTC calendar day, "YYYY-MM-DD" — streaks, spins and caps key on this. */
export function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** `day` shifted by `days` (negative = past), still "YYYY-MM-DD". */
export function dayOffset(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
```

**The wire type enforces it.**
`AcademyDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`
(`packages/contracts/src/index.ts:829`) is used for `last_active_date`,
`spin_last_date` and `AcademyGameState.date`. A `Date` cannot be assigned to it.

**Transitions are a pure function**, so they are testable without a clock
(`apps/services/growth/src/academy/xp.ts:47-54`): same day → unchanged,
previous day → +1, any gap or first-ever → reset to 1. The web client mirrors
the identical rules in `apps/web/lib/academy/xp.ts`, importing the same
constants from contracts so the two cannot drift.

**Timestamps are separate.** Instants remain ISO-8601 strings
(`occurred_at`, `created_at`, `at`). Only *calendar* concepts use the day
string. Journey steps combine both: UTC-midnight of the start day plus an
offset, fired at 14:00 UTC
(`apps/services/growth/src/messaging/journeys.ts:11,70`).

---

## 9. Keyset pagination

**Rule.** Lists paginate by an opaque cursor over `(created_at, id)` descending.
Never `OFFSET` — it drifts under concurrent inserts and degrades linearly.
Responses carry `next_cursor: string | null`.

**Canonical cursor codec** — `apps/services/identity/src/common/cursor.ts:4-17`:

```ts
export type Cursor = { createdAt: Date; id: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.createdAt.toISOString()}|${c.id}`, "utf8").toString("base64url");
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  const text = Buffer.from(raw, "base64url").toString("utf8");
  const sep = text.indexOf("|");            // FIRST separator — ids may contain '|'
  if (sep <= 0) return null;
  const createdAt = new Date(text.slice(0, sep));
  const id = text.slice(sep + 1);
  if (Number.isNaN(createdAt.getTime()) || id.length === 0) return null;
  return { createdAt, id };
}
```

**Canonical predicate** — `apps/services/identity/src/db/repo.ts:206-218`. The
`OR` is the tie-breaker that makes the page boundary exact when two rows share a
timestamp:

```ts
const cursorCond = before
  ? or(
      lt(auditLog.createdAt, before.createdAt),
      and(eq(auditLog.createdAt, before.createdAt), lt(auditLog.id, before.id)),
    )
  : undefined;

const rows = await this.db.select().from(auditLog)
  .where(cursorCond ? and(eq(auditLog.actorId, actorId), cursorCond) : eq(auditLog.actorId, actorId))
  .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
  .limit(limit);
```

**Fetch `limit + 1`** to learn whether another page exists, slice back to
`limit`, and encode the cursor from the last row of the slice
(`apps/services/identity/src/me/me.service.ts:65-82`). A `null` `next_cursor`
means the end.

**Index to match.** Every keyset query needs an index in the same order —
`audit_log_actor_idx (actor_id, created_at DESC, id DESC)` and
`chat_messages_created_idx (created_at DESC, id DESC)`
(`apps/services/identity/src/db/migrate.ts:3-50`). Adding a keyset list without
its index is the same bug as adding `OFFSET`.

**Ordering at the edge may differ from storage order.** Chat stores and queries
newest-first but the contract specifies newest-**last**, so the service reverses
the page before responding
(`apps/services/identity/src/chat/chat.service.ts:28-44`). Do the reversal in
the service, never in SQL.

**Where cursors are used today:** `/v1/me/audit`, `/v1/chat/history`,
`/v1/trades`, and the messaging audience sweep
(`apps/services/growth/src/messaging/messaging.repo.ts:389-400`, keyed on email
rather than a timestamp).

**Known weakness:** cursors are unsigned, so a client can forge an arbitrary
`(timestamp, id)` pair. Today that only lets a caller skip around their own
rows because the query is always additionally scoped by `actor_id` / `user_id`.
Any new keyset list must keep that ownership predicate.
