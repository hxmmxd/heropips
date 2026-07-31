# Product context

What this covers: the problem HeroPips exists to solve, who it is solving it
for, the shape of the experience it intends to deliver, and the product
principles that explain otherwise-surprising engineering choices. Read after
[project-brief.md](./project-brief.md). For the exhaustive as-built feature
list see [../10-product.md](../10-product.md).

---

## 1. The problem

Retail traders lose money in three distinct, compounding ways, and the market
serves each of them badly.

**They do not understand what they are doing.** The education market is
YouTube, Discord and paid "mentorships". It is unstructured, unverifiable, and
optimised for engagement rather than competence. There is no widely-recognised
path from "I have heard of forex" to "I can follow a written plan".

**They buy signals instead of judgement.** The signal-selling industry ships
`BUY EURUSD` with no entry logic, no invalidation level, no confidence, no
attribution and no track record. A subscriber who follows it learns nothing and
cannot tell a good call from a lucky one. When it stops working they cannot
diagnose why, because they never knew why it was supposed to work.

**They have no risk infrastructure.** The single largest cause of blown retail
accounts is not bad entries — it is unbounded position size, no stop, revenge
trading after a loss, and no daily circuit breaker. Every one of those is a
software problem that no broker solves for the trader, because the broker is
not incentivised to.

The three problems interlock. Not understanding the market makes you buy
signals; buying signals means you never learn risk; no risk control means the
first losing streak ends the account before any learning could compound.

## 2. The thesis

Solve all three in one product, in that order, and make the education free.

1. **Teach first.** A 10-level, 31-lesson curriculum that is public, indexed
   and free at the entry point. Level 0 needs no account at all. This is the
   funnel, the differentiator and the compliance shield simultaneously — an
   educated user is a user who can evaluate a brief.
2. **Explain, do not instruct.** Ship *decision intelligence*, not arrows. A
   brief carries direction, entry, stop, R-multiple target, a confidence score,
   the features behind it, the model version that produced it, and reasoning in
   plain language (`packages/contracts/src/index.ts:463-479`). The decision
   stays with the user, which is both better pedagogy and the reason the
   product is not investment advice.
3. **Enforce the rules the user wrote.** Risk guards sit between the order and
   the broker and refuse trades that violate them
   (`apps/services/trading/src/pnl/engine.ts:309-340`). The user sets the rules;
   the software is the part that does not get tilted.

The academy is not a marketing add-on to a signal product. It is the product's
first half, and the capstone lesson is verified against real trading state —
`/api/academy/capstone` derives its missions from the member's actual
connections and closed trades
(`apps/web/app/api/academy/capstone/route.ts:23-44`).

## 3. Who it is for

| Persona | State on arrival | What they need first | Where they land |
|---|---|---|---|
| **Absolute beginner** | Has heard of trading; owns no account; does not know what a pip is | Vocabulary and a reason to trust the source | `/academy` → `what-is-trading`, free, no account (`packages/contracts/src/index.ts:692,714`) |
| **Self-taught retail trader** | Has an MT5 or Binance account; has lost money; suspects the problem is discipline | Risk arithmetic and enforced guards | `/product/trade-guard`, then the paper account |
| **Signal-service refugee** | Pays someone for calls; cannot evaluate them | Attribution and transparency — confidence, model version, rationale | `/product/intelligence` |
| **Prop-firm aspirant** | Chasing a funded account; needs rule compliance | Drawdown discipline and a paper record | Level 9 `prop-firms-and-funded-accounts` (`packages/contracts/src/index.ts:743`) |
| **Educator / community lead** | Has an audience; wants a revenue share | A referral programme with real economics | `/affiliates` (application intake only today) |

The waitlist captures a four-question profile — experience band, markets,
platforms, comfort with terminology — precisely so launch cohorts can be matched
to these personas (`packages/contracts/src/index.ts:58-79`). Every field is
optional; the signup must never feel like an interrogation.

## 4. The intended experience

### 4.1 Arrive without commitment

The entire academy is readable without an account. Gated lessons publish their
first section for humans and crawlers, then show one unlock CTA
(`apps/web/lib/academy/access.ts:1-8`). Content is never the paywall; *earning*
is. An anonymous visitor can complete a lesson, take the quiz and watch XP land
— it banks in `localStorage` and claims into an account the moment one exists
(`apps/web/lib/academy/store.ts`). The claim wall appears after exactly one
lesson (`packages/contracts/src/index.ts:759`): long enough to feel the loop,
short enough to be a real ask.

### 4.2 Join a queue that is worth being in

The waitlist is email-verified before anything enters it — a 6-digit code, 15
minutes, five attempts (`packages/contracts/src/index.ts:87-93`). That is a
deliberate friction: an unverified list is a list that cannot be emailed at
launch. The code-request endpoint refuses to reveal whether an address is
already enrolled, because it would otherwise be a membership oracle
(`packages/contracts/src/index.ts:111-114`).

Position is a real number, not a vanity metric: it is derived from insert order
and referral count on every read, so it cannot drift
(`apps/services/growth/src/common/position.ts:4-11`). Three verified referrals
move you 25 places. The mechanic is legible and the arithmetic is published.

### 4.3 Buy once, own forever

The Founding Hero offer is deliberately blunt: **flat $499, 500 seats, never
again** (`packages/contracts/src/index.ts:294-295`). No tiers, no ladder, no
countdown theatre. Scarcity comes from a real integer in a real table with a
real cap. The seat meter on `/founding` reads live from
`GET /v1/founding/seats`. Checkout holds a seat for 120 minutes so a crypto
payment has time to confirm, and releases it automatically if it does not
(`apps/services/billing/src/founding/holds.job.ts`).

### 4.4 Land in a product that is already there

Redeem creates the account and the paper account in one motion: the redeem
route fires a throwaway connections read purely so the $10 000 paper balance is
seeded before first paint
(`apps/web/app/api/app/auth/redeem/route.ts:39-46`;
`packages/contracts/src/index.ts:623`). A new founding member's first screen
shows a funded account and an intelligence feed, not an empty state.

### 4.5 Keep coming back

The retention loop is the academy, not the feed. UTC-day streaks with a bonus
that grows and caps (`packages/contracts/src/index.ts:761-762`), a daily spin,
an arcade with a daily earning cap, ten ranks, eleven verifiable certificates,
and three cadences of nudge email calibrated to *why* someone lapsed — streak
save, next-lesson resume, win-back
(`packages/contracts/src/index.ts:959-965`).

### 4.6 Never be lied to

This is the experience principle that constrains the most code:

- No fabricated performance numbers, anywhere. The weekly digest publishes
  stops alongside targets (`docs/Lifecycle-Email-Playbook.md:86-89`).
- Every brief discloses its model version and its data source
  (`packages/contracts/src/index.ts:463-479`).
- Simulated results are labelled as simulated.
- XP, ranks and queue positions are explicitly non-cash and have no monetary
  value.
- Errors are honest: a client-side network failure on order submit says "the
  order was NOT confirmed. Check Positions before retrying"
  (`apps/web/components/app/OrderSheet.tsx:86`) rather than pretending.

## 5. Product principles

| Principle | Consequence you will meet in the code |
|---|---|
| **Education is the funnel, not the upsell.** | The academy is public, crawlable, and gets its own sitemap entries per lesson (`apps/web/app/sitemap.ts:14-40`). |
| **Understanding over instruction.** | The signal contract has no "follow this" field; it has `rationale`, `confidence`, `model_version`. |
| **Scarcity must be real.** | 500 is a database cap enforced in a SQL predicate, not a marketing counter. |
| **Verified beats large.** | The waitlist trades signup conversion for deliverability. |
| **Compliance is a feature.** | The disclaimer is a shipped UI component; copy rules are enforced in the template library. |
| **The user's money never touches us.** | No custody, trade-scope keys only, credentials encrypted at rest. |
| **Fail visibly on money, fail quietly on decoration.** | Checkout errors surface as typed codes; a failed leaderboard fetch degrades to an empty list (`apps/web/app/(platform)/app/(member)/academy/page.tsx`). |

## 6. Where the promise currently exceeds the product

Product context has to include this, or it is marketing. Three of the four
pillars are materially ahead of the implementation:

- **Execution is paper-only.** Live broker adapters validate key shape and
  store credentials; they never call a broker
  (`apps/services/trading/src/brokers/adapters.ts:4-6`).
- **Trade Guard is three guards, not nine, and none are configurable**
  (`apps/services/trading/src/pnl/engine.ts:39-42`).
- **The market feed defaults to a seeded simulator** named
  `institutional-composite-sim` (`apps/services/signal/src/market/sim.source.ts:5`),
  and `quant-ml-v1` is a four-weight logistic function with no training
  pipeline (`apps/services/signal/src/quant/model.ts:22-27`).
- **The multi-level commission engine has no callers**, so the affiliate
  economics described publicly cannot yet occur.

The full, cited gap list is [../10-product.md](../10-product.md) §9. Treat it
as part of the product context: anyone reasoning about roadmap, pricing or
customer promises without it will be wrong.
