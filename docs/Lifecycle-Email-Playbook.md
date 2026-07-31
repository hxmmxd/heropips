# HeroPips Lifecycle Email Playbook

Marketing + engineering reference for the lifecycle messaging engine
(`apps/services/growth/src/messaging/`). One engine, two lanes:

- **Transactional** — always delivers (receipts, access codes, refunds, certificates).
- **Lifecycle** — honors the suppression list, ≥20h gap between sends per contact,
  one-click unsubscribe (RFC 8058) on every message.

Every email: ink/volt brand HTML + plain-text alternate, click-wrapped links with
UTM attribution, open pixel, GA4 Measurement Protocol events.

Two ways an email is triggered, both funnelling through `MessagingService.dispatch()`:

- **Event path** — a service writes an outbox row, the relay produces it to Kafka,
  `MessagingConsumer` routes it. Asynchronous, and silent while Kafka is down.
- **Direct path** — a service calls `dispatch()` in-request. Used where the caller
  must know the mail was accepted before responding (the early-access code).

---

## 1. Trigger matrix — everything that sends email

| Trigger | Email (template) | Lane | When | Goal | KPI |
|---|---|---|---|---|---|
| `POST /v1/early-access/code` (direct dispatch) | `ea_verify_code` — 6-digit code | Tx | Instant, synchronous | Prove the address before it enters the queue | code→verify completion |
| Verified signup (direct dispatch) | `admin_ea_signup` — ops notice | Tx | Instant, to `ADMIN_NOTIFY_EMAIL` | Tell the team who joined and how they trade | — |
| `early_access.joined` | `ea_welcome` — "You're #N in line" | Tx | Instant | Confirm + teach referral loop | open, status-page visits |
| `early_access.joined` (referrer side) | `ea_referral_jump` | LC | Instant | Reward sharing, fuel the loop | shares per contact |
| `order.created` | `order_created` — seat on hold | Tx | Instant | Complete crypto payment in 120min | hold→paid conversion |
| `payment.finished` | `purchase_confirmed` + access code | Tx | Instant | Redeem account | paid→registered rate |
| `payment.failed` | `payment_issue` | Tx | Instant, once per order | Rescue the order | recovery rate |
| `payment.expired` / `order.hold_expired` | `order_expired` | Tx | Instant, once per order | Re-checkout | re-checkout rate |
| `payment.refunded` | `refund_confirmed` | Tx | Instant | Goodwill, door open | reactivation |
| `user.registered` | `platform_welcome` | Tx | Instant | First-week habit plan | D1 activation |
| `academy.certificate.issued` | `academy_certificate` | Tx | Instant | Share + continue | verify-page visits |
| `academy.nudge.daily` | `academy_nudge_daily` — streak save | LC | Streak ≥3, missed 1 day | Protect streak | streak retention |
| `academy.nudge.weekly` | `academy_nudge_weekly` — next lesson | LC | Inactive 7–27d | Resume curriculum | lesson resumes |
| `academy.nudge.monthly` | `academy_nudge_monthly` — win-back | LC | Inactive ≥28d | Reactivate | reactivation rate |
| `signal.generated/resolved` | (counted, no email) | — | — | feeds weekly digest | — |
| `trade.order.filled` | (no email; marks `first_trade_at`) | — | — | journey skip logic | — |

## 2. Journeys (drip sequences)

Steps fire at **14:00 UTC** on start-day + offset. Cancelled automatically when the
goal event arrives; per-step safety nets skip converts even if a cancel was missed.

### `early_access_nurture` — queue joiner → founding buyer / member
Cancelled by `payment.finished`, `user.registered`.

| Day | Template | Subject | Angle |
|---|---|---|---|
| D1 | `ea_d1_story` | What HeroPips actually does (no magic) | Product truth: scored decisions, guardrails, your broker |
| D3 | `ea_d3_academy` | Don't just stand in line — bank XP while you wait | Free Level 0, XP banks now |
| D5 | `ea_d5_founding` | 500 lifetime seats. Then it's subscriptions. | Own vs rent; $499 once |
| D8 | `ea_d8_referral` | Cut the line: 3 friends = 25 places | Queue mechanics |
| D12 | `ea_d12_proof` | What ran inside HeroPips this week | Real signal counts (wins AND stops) |
| D19 | `ea_d19_lastcall` | Where you stand, #N — and what's left | Two paths; cap never reopens |

### `founding_onboarding` — paid but not redeemed
Cancelled by `user.registered`, `payment.refunded`.

| Day | Template | Subject |
|---|---|---|
| D1 | `fo_d1_redeem` | Your lifetime seat is paid — and still empty |
| D3 | `fo_d3_redeem2` | Founders who start in week one keep the edge |

### `member_activation` — registered → activated
Skips: academy step if a lesson is done; paper step if a trade is filled.

| Day | Template | Subject |
|---|---|---|
| D2 | `ma_d2_academy` | Your first lesson is 8 minutes. Streaks start at one. |
| D5 | `ma_d5_paper` | Your $10,000 paper account is still untouched |
| D10 | `ma_d10_broker` | Put your real rules on real rails |

### Weekly digest — `weekly_digest`
Mondays ≥14:00 UTC to every non-suppressed contact, when last ISO week had ≥1
signal. Honest counters only (generated / target hit / stopped). CTA branches:
members → intelligence feed; prospects → founding page.

## 3. Copy rules (enforced in `templates/library.ts`)

1. Subjects ≤ ~55 chars, concrete, zero emoji, zero clickbait.
2. One primary CTA per email.
3. FOMO from **real mechanics only**: seat cap, queue position, streaks, XP,
   signal cadence. **Never fabricate performance numbers** — the digest and
   D12 proof email publish stops alongside targets, with a
   "not a performance promise" note. Compliance is a feature.
4. Every rendered fact comes from an event payload or the database.
5. Footer always: why-you-got-this line + risk disclaimer (+ unsubscribe on lifecycle).

## 4. Infrastructure

```
event sources ──Kafka──▶ MessagingConsumer ─▶ MessagingService ─▶ dispatch()
  identity/billing/growth   (5 topics)          │  suppression → 20h cap →
  signal/trading                                │  render → SMTP → ledger → GA4
                         MessagingScheduler ────┘  (journeys + digest sweeps)
```

- **Ledger**: `msg_sends` — one row per attempt; UNIQUE `dedupe_key` makes Kafka
  redelivery and sweeper restarts exactly-once. Statuses:
  `sent | failed | suppressed | capped`.
- **Contacts**: `msg_contacts` — projection built from events (never erases facts).
- **Suppression**: `msg_suppressions` — lifecycle lane only.
- **Config** (growth-svc env): `SMTP_URL`, `EMAIL_FROM`, `EMAIL_REPLY_TO`,
  `PUBLIC_ORIGIN`, `GA4_MEASUREMENT_ID`, `GA4_API_SECRET`,
  `MESSAGING_SWEEP_INTERVAL_SEC`, `MESSAGING_ENABLED`.
- No `SMTP_URL` ⇒ log-only transport (safe default).

### Free-tier providers (all SMTP — pure env swap)
| Provider | Free tier | Notes |
|---|---|---|
| **Mailpit** (dev) | unlimited, local | in docker-compose; UI at `:8025` |
| **Brevo** | 300/day | easiest start |
| **Resend** | 3k/mo | great DX |
| **Amazon SES** | 3k/mo (with EC2) then $0.10/1k | best at scale |

DNS before production sending: **SPF + DKIM + DMARC** on the sending domain,
subdomain `mail.heropips.com` recommended so marketing reputation never touches
the root domain.

## 5. Analytics (all free)

- **Web**: GA4 (`NEXT_PUBLIC_GA4_ID`) behind Consent Mode v2 (default denied,
  banner opt-in) + Microsoft Clarity (`NEXT_PUBLIC_CLARITY_ID`) heatmaps/replays.
  Conversion events wired: `early_access_join`, `begin_checkout`, `purchase`,
  `sign_up`, `login`, `academy_lesson_complete`.
- **Email server-side** (GA4 Measurement Protocol): `email_sent`, `email_open`
  (pixel `/api/mail/o/:id`), `email_click` (redirect `/api/mail/c/:id?u=`),
  `email_unsubscribe`. Client id = sha256(email) — no raw PII to Google.
- **UTM convention**: `utm_source=email`, `utm_medium=<lane>`,
  `utm_campaign=<template_key>`, `utm_content=<cta>`. Funnel = campaign →
  session → conversion, joinable in GA4 explorations.

### Funnel targets (industry-calibrated starting points)
| Stage | Metric | Target |
|---|---|---|
| ea_welcome | open rate | ≥55% (transactional) |
| nurture D1–D19 | click-through | ≥3.5% per send |
| order_created → paid | completion | ≥60% |
| purchase → registered ≤72h | redemption | ≥85% |
| nudge_daily | streak saved | ≥25% |
| unsubscribe rate | per lifecycle send | <0.4% |

## 6. Ops runbook

- **Who got what**: `SELECT template, status, count(*) FROM msg_sends GROUP BY 1,2;`
- **One contact's history**: `SELECT * FROM msg_sends WHERE email='x@y.com' ORDER BY created_at;`
- **Journey states**: `SELECT journey, status, count(*) FROM msg_journeys GROUP BY 1,2;`
- **Manual suppression**: `INSERT INTO msg_suppressions VALUES ('x@y.com','manual',now());`
- **Failed sends**: rows stay `failed` with the SMTP error; re-trigger by deleting
  the row (frees the dedupe key) once the transport issue is fixed.
- **Kill switch**: `MESSAGING_ENABLED=false` stops consumer + scheduler; HTTP
  endpoints (unsubscribe/tracking) stay up.
- Dev inbox: `http://localhost:8025` (Mailpit) after `pnpm stack:up`.
