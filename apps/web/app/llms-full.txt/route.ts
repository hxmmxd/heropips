import { ACADEMY_RANKS, ACADEMY_XP, JUMP_SIZE, LTD, REFERRAL, REFERRALS_PER_JUMP } from "@heropips/contracts";
import { LEVELS, TOTAL_LESSONS, TOTAL_MINUTES, TRACKS } from "@/lib/academy/curriculum";
import {
  annualMonthly,
  ANNUAL_DISCOUNT,
  EXECUTION_MODES,
  FAQ,
  GUARDS,
  JOURNEY,
  PILLARS,
  TIERS,
} from "@/lib/content";
import { abs } from "@/components/seo/graph";
import { linkSections, TAGLINE } from "@/lib/llms";

/** Rendered once at build; the underlying data is all compile-time typed. */
export const dynamic = "force-static";

const HOURS = (TOTAL_MINUTES / 60).toFixed(1);
const SPIN_MIN = Math.min(...ACADEMY_XP.SPIN_PRIZES);
const SPIN_MAX = Math.max(...ACADEMY_XP.SPIN_PRIZES);
const LESSON_XP = LEVELS.flatMap((l) => l.lessons).map((l) => l.xp);

const curriculum = LEVELS.map((level) => {
  const lessons = level.lessons
    .map(
      (l) =>
        `- [${l.title}](${abs(`/academy/${l.slug}`)}): ${l.summary} ` +
        `(${l.minutes} min · ${l.xp} XP · ${l.quiz.length} quiz questions · ${level.access} access)`,
    )
    .join("\n");
  return `### Level ${level.number} — ${level.name} (${level.access}) — "${level.tagline}"\n\n${lessons}`;
}).join("\n\n");

const tiers = TIERS.map((t) => {
  const price = t.priceMonthly === 0 ? "$0" : `$${t.priceMonthly}/month ($${annualMonthly(t.priceMonthly)}/month billed annually)`;
  return `- ${t.name} — ${price}. ${t.tagline} ${t.features.join("; ")}.`;
}).join("\n");

const BODY = `# HeroPips — full reference

> ${TAGLINE}

## Positioning: decision intelligence, not signals

HeroPips does not sell buy/sell arrows. A bare signal says "BUY EURUSD"; a HeroPips intelligence brief shows the case — direction, entry, stop and R-multiple targets, a confidence score, the volatility/momentum/regime features behind it, the model version that produced it, and the reasoning in plain language. The product is understanding: traders see why a setup is attractive before anything trades, so the decision stays theirs. Mission: democratise institutional-quality financial tools and education through machine learning, community-driven learning and transparent technology.

Who it is for: self-directed retail traders — beginners who start in the free academy, experienced discretionary traders who want enforced risk rules, and funded/prop traders who need challenge-safe guardrails. HeroPips is not for anyone looking to hand over money to be managed; it never takes custody and never manages a portfolio.

## Status: early access

The platform is built and live today, gated to Founding Hero lifetime members: exactly ${LTD.SEAT_CAP} seats will ever exist, at a one-time $${LTD.PRICE_USD_DEFAULT} paid in crypto (processed by NOWPayments), with the seat held ${LTD.HOLD_TTL_MINUTES} minutes during checkout. Founding members use the live platform now — the decision-intelligence feed, broker auto-execution, Trade Guard configuration, paper trading and the academy — and their feedback shapes what ships next. HeroPips is not fully launched: the public SaaS launch, with open sign-ups and monthly subscription tiers, comes after the founding phase. It is real, gated access, not a demo. The public early access list determines invite order at launch.

## The ecosystem — four pillars

1. HeroPips Learn (learn) — the education pillar, headlined by the HeroPips Academy: ${LEVELS.length} levels, ${TOTAL_LESSONS} lessons, ${TRACKS.length} verifiable certificates, quizzes, XP, streaks, ranks, arcade drills and live classes that unlock as levels complete. Detailed below.
2. Intelligence platform (decide and trade) — the trader's daily operating system: decision intelligence from the internal quant engine plus guarded execution on the member's own broker.
3. Capital (invest — future) — investment products for advanced and institutional users. This pillar expands only where legally permitted and only after the appropriate licences; nothing in it is live or offered today.
4. Community (grow) — the Founding Lounge today; ambassadors, competitions, leaderboards and mentorship as the ecosystem opens.

## Platform pillars

${PILLARS.map((p) => `- [${p.title}](${abs(p.href)}): ${p.desc}`).join("\n")}

## How a trade happens, end to end

${JOURNEY.map((j) => `${Number(j.step)}. ${j.title} — ${j.desc}`).join("\n")}

## Execution modes — all consent-gated

${EXECUTION_MODES.map((m) => `- ${m.mode} — ${m.desc}`).join("\n")}

## Trade Guard — the risk infrastructure

${GUARDS.length} independent risk controls checked on every order, fail-closed: if the risk engine is unreachable, live orders are blocked, never passed. Example parameters shown; every value is member-configured.

${GUARDS.map((g, i) => `${i + 1}. ${g.name} (${g.param}) — ${g.desc}`).join("\n")}

## Brokers and exchanges

- MT5 — live at early access; connects virtually any MT5 broker account (FX, metals, indices).
- Binance — live at early access (crypto spot), trade-scope API keys.
- KuCoin — live at early access (crypto spot), trade-scope API keys.
- Unified exchange API — one integration layer adding 30+ further crypto exchanges, rolling out through early access.

Credentials are trade-scope only: encrypted at rest, withdrawal-enabled keys rejected, revocable instantly, never custodial. Funds never leave the member's own broker.

## Academy — Zero to Hero

A gamified curriculum: ${LEVELS.length} levels, ${TOTAL_LESSONS} lessons, ~${HOURS} hours of core content, from absolute zero to going live. Anonymous visitors may complete ${ACADEMY_XP.ANON_LESSON_LIMIT} lesson and bank XP on the device before a free account is required (XP syncs on sign-up). Access tier per level is listed below. Education only: no advice, no profit promises, and no real money anywhere in the curriculum. Every lesson URL is public and indexable.

${curriculum}

### XP economy (non-cash; no monetary value, non-transferable)

- Lessons: ${Math.min(...LESSON_XP)}–${Math.max(...LESSON_XP)} XP each, plus ${ACADEMY_XP.QUIZ_CORRECT} XP per correct quiz answer and +${ACADEMY_XP.QUIZ_PERFECT_BONUS} for a perfect quiz.
- Trading Arcade (${abs("/academy/arcade")}): practice games pay ${ACADEMY_XP.GAME_WIN} XP per win, capped at ${ACADEMY_XP.GAME_DAILY_CAP} XP-earning rounds per game per UTC day.
- Daily spin: once per UTC day, ${SPIN_MIN}–${SPIN_MAX} XP.
- Streaks: the first activity of each UTC day pays ${ACADEMY_XP.STREAK_BONUS_PER_DAY} XP × streak length, capped at ${ACADEMY_XP.STREAK_BONUS_CAP}.
- Referrals: a referred sign-up awards ${ACADEMY_XP.REFERRAL_BONUS} XP to both sides, once per referred user.
- Ranks (${ACADEMY_RANKS.length}, by lifetime XP): ${ACADEMY_RANKS.map((r) => `${r.name} ${r.at.toLocaleString("en-US")}`).join(" → ")}.

### Certificates

${TRACKS.length} certificates — one per level plus the Hero Trader grand credential:

${TRACKS.map((t) => `- ${t.name}: ${t.desc}`).join("\n")}

Draft designs are publicly viewable at ${abs("/academy/certificates")}. Every issued certificate carries a unique code and verifies publicly at ${abs("/academy/verify/{code}")} — the verify page confirms holder, track and issue date. Certificates are educational credentials, not licences or qualifications to give advice.

### Live classes

Completing every lesson in a level unlocks that level's monthly live workshop. Completing all ${LEVELS.length} levels graduates the member into the Hero Council monthly masterclass, free for 12 months; qualified referrals extend it (5 → +3 months, 25 → +12 months, 100 → lifetime). A referral qualifies when the invited member completes Level 5.

## Pricing

Available today: Founding Hero — one-time $${LTD.PRICE_USD_DEFAULT} in crypto for a lifetime Pro entitlement (decision-intelligence feed, guarded execution and the academy, forever). Exactly ${LTD.SEAT_CAP} seats ever; seats held ${LTD.HOLD_TTL_MINUTES} minutes during checkout; 14-day refund window paid in USDT equivalent; non-transferable; never resold after the cap. Terms: ${abs("/legal/ltd-terms")}

Opening at the public SaaS launch (monthly USD, annual −${Math.round(ANNUAL_DISCOUNT * 100)}%):

${tiers}

## Referrals and the affiliate program

Two distinct tracks:

1. User referrals — every member gets a referral code. Every ${REFERRALS_PER_JUMP} verified sign-ups move the referrer ${JUMP_SIZE} places up the public-launch queue, both sides earn ${ACADEMY_XP.REFERRAL_BONUS} XP, and rewards attribute when a referred user converts to a paid seat. Nothing is paid on sign-ups alone.
2. Marketer/affiliate platform — a separate program for educators, community leaders and IBs. Commissions run up to ${REFERRAL.MAX_LEVELS} levels deep; the active level count and per-level rates are admin-configured, defaulting to ${REFERRAL.DEFAULT_LEVELS} levels at ${REFERRAL.DEFAULT_LEVEL_RATES_BPS.map((bps, i) => `L${i + 1} ${bps / 100}%`).join(", ")}. Every commission is recorded on a double-entry ledger, payouts are made in crypto, and refunds inside the 14-day window claw back the associated commissions at every level.

## Compliance posture

- Self-directed software, built compliance-first: no investment advice, no recommendations, no portfolio management.
- Not a broker, not a fund, not an adviser. Capital-markets products are a future pillar that launches only where legally permitted and only after the appropriate licences.
- No custody: user funds stay at the user's broker; trade-scope API keys only, encrypted at rest.
- No profit promises or guarantees anywhere; pre-launch output is a simulated $10,000 paper account and is always labeled. Past performance never guarantees future results.
- Fail-closed execution: unverifiable orders are blocked, never passed.
- XP, points, streaks and early-access queue positions are non-cash and have no monetary value.
- Affiliate earnings depend on referred purchases; no income promises.
- Risk disclosure: ${abs("/legal/risk")} · Privacy, GDPR rights and processors: ${abs("/legal/privacy")}

## FAQ digest

${FAQ.map((f) => `- ${f.q} ${f.a}`).join("\n")}

## Contact

Brand: HeroPips · heropips.com · X/Twitter @heropips
legal@heropips.com · privacy@heropips.com · billing@heropips.com

${linkSections()}

## Optional

- [Concise version](${abs("/llms.txt")}): the short llms.txt index of this document.
- [Sitemap](${abs("/sitemap.xml")}): machine-readable index of every public URL.
`;

export function GET(): Response {
  return new Response(BODY, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
