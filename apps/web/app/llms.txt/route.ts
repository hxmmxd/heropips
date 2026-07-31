import { ACADEMY_XP, JUMP_SIZE, LTD, REFERRAL, REFERRALS_PER_JUMP } from "@heropips/contracts";
import { LEVELS, TOTAL_LESSONS, TOTAL_MINUTES, TRACKS } from "@/lib/academy/curriculum";
import { ANNUAL_DISCOUNT, EXECUTION_MODES, GUARDS, TIERS } from "@/lib/content";
import { abs } from "@/components/seo/graph";
import { linkSections, TAGLINE } from "@/lib/llms";

/** Rendered once at build; the underlying data is all compile-time typed. */
export const dynamic = "force-static";

const HOURS = (TOTAL_MINUTES / 60).toFixed(1);
const RATES = REFERRAL.DEFAULT_LEVEL_RATES_BPS.map((bps, i) => `L${i + 1} ${bps / 100}%`).join(", ");
const SUBSCRIPTIONS = TIERS.map((t) => `${t.name} $${t.priceMonthly}`).join(" / ");
const OPEN_LEVELS = LEVELS.filter((l) => l.access === "open")
  .map((l) => `Level ${l.number}`)
  .join(" and ");
const PRO_LEVELS = LEVELS.filter((l) => l.access === "pro").length;

const BODY = `# HeroPips

> ${TAGLINE}

Who it is for: self-directed retail traders who want the reasoning behind a trade, and enforced risk rules around it, without handing anyone their money. Beginners start in the free academy; funded traders use the same guards for prop-firm challenges.

Status: early access. The platform is built and live today for Founding Hero lifetime members — exactly ${LTD.SEAT_CAP} seats will ever exist, at a one-time $${LTD.PRICE_USD_DEFAULT} paid in crypto (processed by NOWPayments), seat held ${LTD.HOLD_TTL_MINUTES} minutes during checkout. It is real, gated access, not a demo. A public SaaS launch with open sign-ups and monthly tiers follows the founding phase.

What a brief contains: symbol, direction, entry, stop, R-multiple targets, a confidence score, the engineered volatility/momentum/regime features behind it, its model_version (currently quant-ml-v1) and plain-language reasoning. Briefs come from the internal quant engine only — never resold third-party calls, never bare buy/sell arrows.

Execution modes (${EXECUTION_MODES.map((m) => m.mode).join(" / ")}) are all consent-gated; full-auto additionally requires explicit written consent and an active Trade Guard configuration, revocable instantly.

Trade Guard — ${GUARDS.length} independent, fail-closed controls checked on every order: ${GUARDS.map((g) => g.name.toLowerCase()).join(", ")}. If the risk engine is unreachable, live orders are blocked, never passed.

Brokers and exchanges: MT5 (any MT5 broker), Binance and KuCoin at early access, with 30+ further crypto exchanges arriving through a unified API. Connections use trade-scope API keys only — encrypted at rest, withdrawal-enabled keys rejected, never custodial.

Academy: ${LEVELS.length} levels, ${TOTAL_LESSONS} lessons, ~${HOURS} hours of core content, ${TRACKS.length} verifiable certificates. ${OPEN_LEVELS} is free for everyone including anonymous visitors (${ACADEMY_XP.ANON_LESSON_LIMIT} lesson before an account is required); member levels open with a free account; the final ${PRO_LEVELS} levels are the Pro track, included with Founding Hero. Education only — no advice, no profit promises, no real money anywhere in the curriculum.

Pricing: Founding Hero $${LTD.PRICE_USD_DEFAULT} one-time for lifetime Pro is the only thing purchasable today. At the public SaaS launch: ${SUBSCRIPTIONS} per month, annual billing −${Math.round(ANNUAL_DISCOUNT * 100)}%.

Referrals: every ${REFERRALS_PER_JUMP} verified sign-ups jump a member ${JUMP_SIZE} places in the launch queue, and referrals award ${ACADEMY_XP.REFERRAL_BONUS} XP to both sides. A separate marketer/affiliate platform pays commissions up to ${REFERRAL.MAX_LEVELS} levels deep (${REFERRAL.DEFAULT_LEVELS} active by default: ${RATES}), tracked on a double-entry ledger with crypto payouts and a 14-day refund clawback.

Compliance stance: self-directed software, built compliance-first. No investment advice, no recommendations, no portfolio management, no custody — funds stay at the user's broker. Not a broker, not a fund, not an adviser. Capital-markets products are a future pillar gated on the appropriate licences per jurisdiction. All pre-launch performance figures are simulated (a $10,000 paper account) and labeled as such; past performance never guarantees future results. XP, streaks and queue positions are non-cash and have no monetary value.

Contact: legal@heropips.com · privacy@heropips.com · billing@heropips.com · X/Twitter @heropips

${linkSections()}

## Optional

- [Full reference](${abs("/llms-full.txt")}): the expanded HeroPips reference — intelligence pipeline, guard-by-guard detail, every academy level and lesson, the XP economy, certificates, the full pricing table, the referral schedule, compliance posture and an FAQ digest.
- [Sitemap](${abs("/sitemap.xml")}): machine-readable index of every public URL.
`;

export function GET(): Response {
  return new Response(BODY, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
