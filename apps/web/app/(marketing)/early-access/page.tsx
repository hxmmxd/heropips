import type { Metadata } from "next";
import Link from "next/link";
import {
  EarlyAccessStatsRes,
  JUMP_SIZE,
  LTD,
  REFERRALS_PER_JUMP,
  SeatsRes,
} from "@heropips/contracts";
import { BrandCard, ButtonLink, Card, Disclaimer, Eyebrow, Kicker, OutlineWord } from "@heropips/ui";
import { billing, growth } from "@/lib/api";
import { EarlyAccessFlow } from "@/components/convert/EarlyAccessFlow";
import { SeatsMeter } from "@/components/convert/SeatsMeter";
import { GateArt } from "@/components/art/Art";
import { BreadcrumbsJsonLd, JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  faqNode,
  howToNode,
  pageGraph,
  siteNodes,
  webPageNode,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import styles from "./early-access.module.css";

const TITLE = "Early access — claim your place in the launch line";
const DESCRIPTION =
  "Join the HeroPips early access list for the public launch: verify your email, take a numbered place, and jump 25 places for every 3 friends who join.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/early-access" },
  ...socialMeta(TITLE, DESCRIPTION, "/early-access"),
};

/** Live counters and seat state are the whole point — never serve them stale. */
export const dynamic = "force-dynamic";

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Early access", path: "/early-access" },
];

const JOURNEY = [
  {
    num: "01",
    title: "Your place is locked",
    body: "The moment the code matches, a numbered place is written against your verified email. It never drifts backwards — the only direction it moves is up.",
  },
  {
    num: "02",
    title: "You move up, or you don't",
    body: `Share your referral code. Every ${REFERRALS_PER_JUMP} verified friends who join behind you moves you up ${JUMP_SIZE} places. No cap, no cooldown, no cost.`,
  },
  {
    num: "03",
    title: "Invites go out in order",
    body: "At the public launch we open the platform in cohorts, front of the line first. Where you stand that day is where you stand — so it pays to stand early.",
  },
];

const VALUE = [
  {
    title: "Decision intelligence",
    body: "Trade ideas scored for confidence and explained in plain reasoning — entry, stop, targets, and the features behind them. Not arrows.",
    href: "/product/intelligence",
  },
  {
    title: "Execution on your broker",
    body: "MT5, Binance, KuCoin and more. Your funds stay at your broker; HeroPips only sends the orders you authorised.",
    href: "/product/automation",
  },
  {
    title: "Trade Guard",
    body: "Risk per trade, daily loss cap, max drawdown, news and session filters — enforced by software, not willpower.",
    href: "/product/trade-guard",
  },
  {
    title: "The Academy",
    body: "Level 0 is free right now, no account needed. Bank XP while you wait and arrive knowing the language.",
    href: "/academy",
  },
];

const FAQS = [
  {
    q: "What does early access actually get me?",
    a: "A numbered place in the queue for the public launch, a referral code that moves you up, and an email when your cohort opens. It is free and it is not the live platform — the live platform today is gated to the 500 Founding Hero lifetime seats.",
  },
  {
    q: "Why do I have to verify my email?",
    a: "Because the invite is an email. A verified list means every place in line belongs to somebody who can actually be reached at launch, and it keeps the queue honest — no bots, no typo addresses holding positions ahead of real people.",
  },
  {
    q: "How fast does the code arrive?",
    a: "Seconds. It is a 6-digit code and it stays valid for 15 minutes. If it is slow, check spam — and you can request a new one after 30 seconds.",
  },
  {
    q: "How do referrals move me up?",
    a: `Every ${REFERRALS_PER_JUMP} verified friends who join with your code moves you up ${JUMP_SIZE} places. There is no cap. Your code and share links appear the second you verify, and your live position is on your status page.`,
  },
  {
    q: "What is the difference between this and Founding Hero?",
    a: `Early access is free and gets you in line for the public launch. Founding Hero is $${LTD.PRICE_USD_DEFAULT} once — lifetime Pro access, the academy included, and you are inside the live platform today. Only ${LTD.SEAT_CAP} Founding Hero seats will ever exist; when they are gone the lifetime deal is gone permanently.`,
  },
  {
    q: "Can I leave the list?",
    a: "Any time. Every email has a one-click unsubscribe, and we only send invite and queue emails — no spam, no third parties, no selling your address.",
  },
];

const CheckIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="4 12.5 9.5 18 20 6.5" />
  </svg>
);

const DashIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const URL = abs("/early-access");

const jsonLd = pageGraph([
  ...siteNodes(),
  webPageNode({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: CRUMBS }),
  howToNode({
    url: URL,
    name: "How the HeroPips early access queue works",
    description:
      "Claim a numbered place with a verified email, move up by referring friends, and receive your invite in cohort order at the public launch.",
    steps: JOURNEY.map((s) => ({ name: s.title, text: s.body })),
  }),
  faqNode({ url: URL, items: FAQS }),
]);

export default async function EarlyAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const defaultRef = raw && /^[A-Z0-9]{4,12}$/i.test(raw) ? raw.toUpperCase() : undefined;

  // Real counters or none — the page never invents social proof.
  const [stats, seats] = await Promise.all([
    growth.get("/v1/early-access/stats", EarlyAccessStatsRes).catch(() => null),
    billing.get("/v1/founding/seats", SeatsRes).catch(() => null),
  ]);
  const nextPosition = (stats?.total ?? 0) + 1;

  return (
    <>
      <JsonLd data={jsonLd} />
      <BreadcrumbsJsonLd crumbs={CRUMBS} />

      {/* ══════════════════════════════════════════════════ a — hero + claim */}
      <section className={styles.hero} aria-labelledby="ea-h1">
        <div className={`container ${styles.heroGrid}`}>
          <div>
            <Eyebrow>Early access · public launch</Eyebrow>
            <h1 id="ea-h1" className={styles.h1}>
              Place <span className={styles.h1Num}>#{nextPosition.toLocaleString("en-US")}</span> is open.
            </h1>
            <p className={styles.lede}>
              The platform is already built and running — today it is gated to {LTD.SEAT_CAP} Founding
              Hero lifetime seats. Early access is the list for the public launch, and invites go out in
              position order. You get the number that is free when you arrive.
            </p>

            {stats && (
              <ul className={styles.stats} aria-label="Live early access counters">
                <li className={styles.stat}>
                  <span className={styles.statNum}>{stats.total.toLocaleString("en-US")}</span>
                  <span className={styles.statLabel}>In line now</span>
                </li>
                <li className={styles.stat}>
                  <span className={styles.statNum}>{stats.joined_week.toLocaleString("en-US")}</span>
                  <span className={styles.statLabel}>Joined this week</span>
                </li>
                {seats && (
                  <li className={styles.stat} data-tone="volt">
                    <span className={styles.statNum}>{seats.remaining.toLocaleString("en-US")}</span>
                    <span className={styles.statLabel}>Founding seats left</span>
                  </li>
                )}
              </ul>
            )}

            <ul className={styles.trustRow}>
              <li>Free, forever</li>
              <li>Verified email only</li>
              <li>No spam, one-click unsubscribe</li>
            </ul>

            <GateArt style={{ maxWidth: 520, marginTop: "var(--sp-8)", width: "100%" }} />
          </div>

          <div className={styles.heroCardCol} id="claim">
            <EarlyAccessFlow defaultRef={defaultRef} nextPosition={nextPosition} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ b — the fork */}
      <section className="section" aria-labelledby="ea-fork">
        <div className="container">
          <div className="hp-section-head" style={{ maxWidth: 640 }}>
            <Eyebrow>Two ways in</Eyebrow>
            <h2 id="ea-fork">Only one of them runs out.</h2>
            <p style={{ marginTop: "var(--sp-4)", fontSize: "var(--text-lg)", color: "var(--text-mid)" }}>
              The queue is free and infinite. The lifetime seats are neither.
            </p>
          </div>

          <div className={styles.fork}>
            <Card className={styles.forkCard}>
              <div className={styles.forkHead}>
                <div>
                  <Kicker>Early access</Kicker>
                  <div className={styles.forkPrice}>Free</div>
                </div>
                <span className={styles.forkMeta}>one email · one code</span>
              </div>
              <ul className={styles.check}>
                <li>{CheckIcon}<span>A numbered place in the launch line, held against a verified email</span></li>
                <li>{CheckIcon}<span>Cohort invite by email when the public launch opens</span></li>
                <li>{CheckIcon}<span>A referral code — {REFERRALS_PER_JUMP} friends moves you up {JUMP_SIZE} places</span></li>
                <li>{CheckIcon}<span>Academy Level 0, free, right now, no account</span></li>
                <li data-off="true">{DashIcon}<span>No access to the live platform until launch</span></li>
              </ul>
              <Link href="#claim" className="hp-arrow-link">
                Claim place #{nextPosition.toLocaleString("en-US")} <span aria-hidden="true">↑</span>
              </Link>
            </Card>

            <Card raised tone="volt" className={styles.forkCard} data-accent="volt">
              <div className={styles.forkHead}>
                <div>
                  <Kicker tone="volt">Founding Hero · {LTD.SEAT_CAP} ever</Kicker>
                  <div className={styles.forkPrice}>${LTD.PRICE_USD_DEFAULT}</div>
                </div>
                <span className={styles.forkMeta}>once · lifetime · in crypto</span>
              </div>
              <ul className={styles.check}>
                <li>{CheckIcon}<span>Inside the live platform today — not at launch</span></li>
                <li>{CheckIcon}<span>Lifetime Pro entitlement. Never a subscription</span></li>
                <li>{CheckIcon}<span>The full academy included — a $249 value</span></li>
                <li>{CheckIcon}<span>Founding badge, verifiably 1 of {LTD.SEAT_CAP}</span></li>
                <li>{CheckIcon}<span>14-day refund, paid back in crypto</span></li>
              </ul>
              <SeatsMeter initial={seats} />
              <ButtonLink href="/founding" variant="volt" size="md" style={{ alignSelf: "flex-start" }}>
                Get instant access — ${LTD.PRICE_USD_DEFAULT} →
              </ButtonLink>
            </Card>
          </div>

          <Disclaimer style={{ marginTop: "var(--sp-6)" }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ c — what happens */}
      <section
        className="section"
        aria-labelledby="ea-next"
        style={{ background: "var(--surface-1)", borderTop: "1px solid var(--border-1)", borderBottom: "1px solid var(--border-1)" }}
      >
        <div className="container">
          <div className="hp-section-head" style={{ maxWidth: 640 }}>
            <Eyebrow>After the code</Eyebrow>
            <h2 id="ea-next">Three things happen, in this order.</h2>
          </div>
          <ol className={styles.journey}>
            {JOURNEY.map((s) => (
              <li key={s.num} className={styles.jStep}>
                <span className={styles.jNum} aria-hidden="true">{s.num}</span>
                <div className={styles.jTitle}>{s.title}</div>
                <div className={styles.jBody}>{s.body}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ d — referral math */}
      <section className="section" aria-labelledby="ea-refer">
        <div className="container">
          <div className="hp-section-head" style={{ maxWidth: 640 }}>
            <Eyebrow>Cut the line</Eyebrow>
            <h2 id="ea-refer">The queue moves one way. You don&apos;t have to.</h2>
            <p style={{ marginTop: "var(--sp-4)", fontSize: "var(--text-lg)", color: "var(--text-mid)" }}>
              Your referral code appears the second your email is verified. The arithmetic is fixed and
              public — no tiers, no mystery, no cap.
            </p>
          </div>
          <div className={styles.mathRow}>
            <div className={styles.mathTile}>
              <span className={styles.mathNum}>{REFERRALS_PER_JUMP}</span>
              <span className={styles.mathLabel}>verified friends</span>
            </div>
            <div className={styles.mathTile}>
              <span className={styles.mathNum}>+{JUMP_SIZE}</span>
              <span className={styles.mathLabel}>places up the line</span>
            </div>
            <div className={styles.mathTile}>
              <span className={styles.mathNum}>∞</span>
              <span className={styles.mathLabel}>times you can repeat it</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ e — the product */}
      <section
        className="section"
        aria-labelledby="ea-value"
        style={{ background: "var(--surface-1)", borderTop: "1px solid var(--border-1)", borderBottom: "1px solid var(--border-1)" }}
      >
        <div className="container">
          <div className="hp-section-head" style={{ maxWidth: 640 }}>
            <Eyebrow>What the line is for</Eyebrow>
            <h2 id="ea-value">You&apos;re queueing for four things.</h2>
          </div>
          <div className={styles.valueGrid}>
            {VALUE.map((v) => (
              <Link key={v.href} href={v.href} className="hp-card-link">
                <Card data-interactive className={styles.valueCard}>
                  <div className={styles.valueTitle}>{v.title}</div>
                  <div className={styles.valueBody}>{v.body}</div>
                  <span className="hp-arrow-link" style={{ marginTop: "auto", paddingTop: "var(--sp-3)" }}>
                    Read more <span aria-hidden="true">→</span>
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ f — faq */}
      <section className="section" aria-labelledby="ea-faq">
        <div className="container">
          <div className="hp-section-head" style={{ maxWidth: 640 }}>
            <Eyebrow>Straight answers</Eyebrow>
            <h2 id="ea-faq">Before you hand over an email.</h2>
          </div>
          <div className={styles.faq}>
            {FAQS.map((f) => (
              <div key={f.q} className={styles.faqItem}>
                <h3 className={styles.faqQ}>{f.q}</h3>
                <p className={styles.faqA}>{f.a}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: "var(--sp-6)" }}>
            <Link href="/faq" className="hp-arrow-link">
              Read the full FAQ <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ g — final CTA */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="ea-cta">
        <div className="container">
          <BrandCard
            variant="volt"
            badge={`PLACE #${nextPosition.toLocaleString("en-US")} · OPEN`}
            meta={{
              left: ["@heropips", "early access · free · verified email"],
              right: "self-directed software\nnot investment advice\ntrading involves risk of loss",
            }}
            watermark
          >
            <h2 id="ea-cta" className="hp-bc-display">
              take your place, <OutlineWord>then move up.</OutlineWord>
            </h2>
            <p className="hp-bc-lede">
              One email, one code, sixty seconds. The number you take today is the number you keep —
              and the line only gets longer.
            </p>
            <div className="hp-cta-row" style={{ marginTop: "var(--sp-6)" }}>
              <ButtonLink
                href="#claim"
                variant="volt"
                size="lg"
                style={{ background: "var(--on-volt)", color: "var(--volt-500)", boxShadow: "none" }}
              >
                Claim place #{nextPosition.toLocaleString("en-US")} →
              </ButtonLink>
              <ButtonLink
                href="/founding"
                variant="ghost"
                size="lg"
                style={{ color: "var(--on-volt)", borderColor: "var(--on-volt)" }}
              >
                Or skip the line for ${LTD.PRICE_USD_DEFAULT}
              </ButtonLink>
            </div>
          </BrandCard>
        </div>
      </section>
    </>
  );
}
