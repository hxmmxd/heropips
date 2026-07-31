import type { Metadata } from "next";
import Link from "next/link";
import { BrandCard, ButtonLink, Card, Disclaimer, Eyebrow, Kicker, OutlineWord } from "@heropips/ui";
import { SeatsRes, LTD } from "@heropips/contracts";
import { HeroConsoleArt } from "@/components/art/HeroArt";
import { Pipeline } from "@/components/landing/Pipeline";
import { TradeGuard } from "@/components/landing/TradeGuard";
import { EarlyAccessNote } from "@/components/marketing/EarlyAccessNote";
import { PathArt } from "@/components/art/Art";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  APP_DEFINITION,
  faqNode,
  pageGraph,
  siteNodes,
  softwareApplicationNode,
  webPageNode,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import "@/components/landing/landing.css";

const URL = abs("/");

const TITLE = "HeroPips — Decision intelligence. Your broker. On rails.";
const DESCRIPTION =
  "HeroPips is a trading intelligence platform: scored, explained decision intelligence, executed on your broker — MT5, Binance, KuCoin — under enforced rules.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  ...socialMeta(TITLE, DESCRIPTION, "/"),
};

/** Canonical one-shot definition — extractable, reused in the hero, FAQ and JSON-LD. */
const DEFINITION = APP_DEFINITION;

async function getSeats(): Promise<SeatsRes | null> {
  try {
    const base = process.env.BILLING_URL ?? "http://localhost:4002";
    const res = await fetch(`${base}/v1/founding/seats`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const parsed = SeatsRes.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };

/* Paper-proof anchor numbers — one simulated $10,000 paper account, 90 days.
   Keep internally consistent: +18.3% on $10,000 → $11,830. Always labeled. */
const PROOF = {
  pnlPct: "+18.3%",
  equityLine: "$10,000 → $11,830 paper equity · last 90 days",
  winRate: "61%",
  maxDrawdown: "−4.8%",
  guardBlocks: "14",
} as const;

/* Poster micro-copy — the mono meta footer on brand cards ("\n" = hard breaks). */
const PAPER_MICRO =
  "simulated $10,000 paper account\nnot real trading · not advice\npast ≠ future results";
const COMPLIANCE_MICRO =
  "self-directed · not advice\nno custody · keys stay yours\nsubstantial risk of loss";

const FAQS = [
  {
    q: "What is HeroPips?",
    a: `${DEFINITION} Self-directed software: no advice, no custody — your funds stay at your broker.`,
  },
  {
    q: "How is this different from signal sellers?",
    a: "We don't sell arrows. Every intelligence brief ships the case — confidence score, the features behind it, model version and plain-language reasoning — from our internal quant engine only. Understanding is the product; never resold calls, never financial advice.",
  },
  {
    q: "What do Founding Heroes get?",
    a: "The live platform today — decision-intelligence feed, broker auto-execution, Trade Guard, paper account and academy — as a one-time lifetime Pro license. 500 seats, ever, with a 14-day refund window.",
  },
] as const;

const CheckIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="4 12.5 9.5 18 20 6.5" />
  </svg>
);

export default async function LandingPage() {
  const seats = await getSeats();
  const seatNumber = seats ? Math.min(seats.cap, seats.cap - seats.remaining + 1) : null;

  return (
    <>
      <JsonLd data={pageGraph([
        ...siteNodes(),
        softwareApplicationNode(),
        webPageNode({ url: URL, name: TITLE, description: DESCRIPTION }),
        faqNode({ url: URL, items: FAQS }),
      ])} />

      {/* a ── HERO — split: copy + CTAs left, live decision-console poster right */}
      <section className="hp-hero" aria-labelledby="hero-h">
        <div className="container hp-hero-grid">
          <div className="hp-hero-copy">
            <Eyebrow>The trading intelligence platform</Eyebrow>
            <h1 id="hero-h">Decision intelligence. Your broker. On rails.</h1>
            <p className="hp-hero-sub">{DEFINITION}</p>
            <div className="hp-cta-row" style={{ marginTop: 34 }}>
              <ButtonLink href="/early-access" variant="volt" size="lg">
                Join the free list →
              </ButtonLink>
              <ButtonLink href="#pipeline" variant="ghost" size="lg">
                See how a decision is made
              </ButtonLink>
            </div>
            {/* Two ways in, stated plainly. The queue is free and grants nothing
                today; the seat is paid and grants access immediately. Naming one
                "early access" and pricing the other only on its own page is how
                a first-timer ends up on a $499 checkout expecting a signup. */}
            <p className="hp-seatline">Free · a numbered place in the launch queue · no card.</p>
            <p className="hp-seatline">
              Want in today?{" "}
              <Link href="/founding" className="hp-arrow-link">
                {`${seats ? `${seats.remaining} of ${seats.cap} founding seats left` : `${LTD.SEAT_CAP} founding seats`} · $${LTD.PRICE_USD_DEFAULT} once · lifetime →`}
              </Link>
            </p>
            <Disclaimer className="hp-hero-disclaimer" />
          </div>
          <div className="hp-hero-visual">
            <HeroConsoleArt />
          </div>
        </div>
      </section>

      {/* c ── #pipeline — how a decision is born (the differentiator) */}
      <Pipeline />

      {/* d ── BROKERS — where the decisions execute */}
      <section className="section" aria-labelledby="brokers-h" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="hp-section-head">
            <Eyebrow>Brokers</Eyebrow>
            <h2 id="brokers-h">Trades where you already trade.</h2>
          </div>
          <div className="hp-broker-row">
            <span className="hp-broker-tile">MT5</span>
            <span className="hp-broker-tile">Binance</span>
            <span className="hp-broker-tile">KuCoin</span>
            <span className="hp-broker-tile hp-broker-more">
              30+ exchanges via unified API <em>rolling out</em>
            </span>
          </div>
          <p className="hp-broker-line">
            You connect trade-scope API keys on your existing account. The keys stay yours,
            encrypted — no custody, no migration, no deposit with us.
          </p>
          <div style={{ marginTop: 18 }}>
            <Link href="/product/automation" className="hp-arrow-link">How execution works →</Link>
          </div>
        </div>
      </section>

      {/* e ── LIVE PROOF — paper P&L on the record, always labeled */}
      <section className="section" aria-labelledby="proof-h" style={{ background: "var(--surface-1)", borderTop: "1px solid var(--border-1)", borderBottom: "1px solid var(--border-1)" }}>
        <div className="container">
          <div className="hp-section-head">
            <Eyebrow>On the record</Eyebrow>
            <h2 id="proof-h">The engine keeps a paper ledger.</h2>
            <p>
              Before public launch, the pipeline runs a simulated $10,000 paper account end to end —
              same briefs, same guards, no real money.
            </p>
          </div>
          <div className="hp-proof-grid">
            <BrandCard
              variant="ink"
              watermark
              badge="PAPER · SIMULATED"
              meta={{ left: ["@heropips", "quant-ml-v1 · 90 days"], right: PAPER_MICRO }}
            >
              <div className="hp-proof-big">{PROOF.pnlPct}</div>
              <div className="hp-proof-sub">{PROOF.equityLine}</div>
            </BrandCard>
            <dl className="hp-proof-tiles" style={{ margin: 0 }}>
              <div className="hp-proof-tile">
                <dt>Win rate</dt>
                <dd>{PROOF.winRate}</dd>
              </div>
              <div className="hp-proof-tile">
                <dt>Max drawdown</dt>
                <dd className="is-loss">{PROOF.maxDrawdown}</dd>
              </div>
              <div className="hp-proof-tile">
                <dt>Orders blocked by Trade Guard</dt>
                <dd className="is-volt">{PROOF.guardBlocks}</dd>
              </div>
            </dl>
          </div>
          <p className="hp-proof-foot">
            Simulated paper results on a $10,000 account. Simulated performance has inherent
            limitations and does not represent real trading; past or hypothetical figures never
            guarantee future results.
          </p>
        </div>
      </section>

      {/* f ── EARLY ACCESS — built, live, gated to 500 founding members */}
      <section className="section" aria-labelledby="access-h">
        <div className="container">
          <BrandCard
            variant="ink"
            watermark
            badge="BETA · DEC 2026"
            meta={{ left: ["@heropips", "founding cohort · 500 members"] }}
          >
            <h2 id="access-h" className="hp-bc-display">Built. Live. 500 members, ever.</h2>
            <p className="hp-bc-lede">
              The platform is enabled today for Founding Hero lifetime members. Their feedback
              drives the roadmap, and a modern SaaS public version is coming.
            </p>
          </BrandCard>
          <EarlyAccessNote style={{ marginTop: 24, maxWidth: 640 }} />
          <div className="hp-access-grid">
            <Card raised style={{ padding: 26 }}>
              <Kicker tone="volt" style={{ marginBottom: 10 }}>Live today</Kicker>
              <h3 style={{ margin: 0, fontSize: "var(--text-lg)" }}>What you get today</h3>
              <ul className="hp-perks" style={{ marginTop: 18 }}>
                <li>{CheckIcon}<span>Live decision-intelligence feed from the internal quant engine</span></li>
                <li>{CheckIcon}<span>Auto-execution on your own broker — MT5, Binance, KuCoin</span></li>
                <li>{CheckIcon}<span>Trade Guard — position-size, daily-loss and session rules</span></li>
                <li>{CheckIcon}<span>$10,000 paper account running the same pipeline</span></li>
                <li>{CheckIcon}<span>Full academy — learn while it trades</span></li>
                <li>{CheckIcon}<span>Founding badge + day-0 access to every release</span></li>
              </ul>
            </Card>
            <Card style={{ padding: 26 }}>
              <Kicker style={{ marginBottom: 10 }}>On the roadmap</Kicker>
              <h3 style={{ margin: 0, fontSize: "var(--text-lg)" }}>Shaped by member feedback</h3>
              <ul className="hp-perks hp-perks-muted" style={{ marginTop: 18 }}>
                <li>{CheckIcon}<span>Multi-factor scores — macro, liquidity and institutional flow on every brief</span></li>
                <li>{CheckIcon}<span>AI trade journal — entry, exit, risk and psychology scores per trade</span></li>
                <li>{CheckIcon}<span>Trading reputation score — consistency and win quality, not just profit</span></li>
                <li>{CheckIcon}<span>30+ exchanges via the unified API</span></li>
                <li>{CheckIcon}<span>Next model generations after quant-ml-v1</span></li>
                <li>{CheckIcon}<span>Mobile apps + public SaaS launch</span></li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* g ── ACADEMY — the HeroPips Learn pillar, one compact band */}
      <section className="section" aria-labelledby="learn-h" style={{ background: "var(--surface-1)", borderTop: "1px solid var(--border-1)", borderBottom: "1px solid var(--border-1)" }}>
        <div className="container">
          <div className="hp-section-head">
            <Eyebrow>HeroPips Learn</Eyebrow>
            <h2 id="learn-h">Learn while it trades.</h2>
          </div>
          <div className="hp-learn-grid">
            <div className="hp-learn-col">
              <Kicker>Module · 01</Kicker>
              <h3>The academy explains every move</h3>
              <p>
                Structured lessons from pips to risk math, in plain language — so the intelligence
                on your screen stops being magic and starts being legible. Ten levels, a verifiable
                certificate for every one of them, and live classes that unlock as you finish.
              </p>
              <Link href="/academy" className="hp-arrow-link">Start Level 0 free →</Link>
            </div>
            <div className="hp-learn-col">
              <Kicker>Module · 02</Kicker>
              <h3>Paper practice, same pipeline</h3>
              <p>
                A $10,000 simulated account runs the exact decision-to-execution path with zero real
                money — prove the rules to yourself before your broker ever sees an order.
              </p>
              <Link href="/academy" className="hp-arrow-link">How the track works →</Link>
            </div>
          </div>
          <PathArt style={{ maxWidth: 560, margin: "28px auto 0" }} />
        </div>
      </section>

      {/* h ── TRADE GUARD */}
      <TradeGuard />

      {/* i ── FOUNDING HERO BAND */}
      <section className="section" aria-labelledby="founding-h" style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border-1)" }}>
        <div className="container hp-founding-grid">
          <div className="hp-section-head">
            <Eyebrow>Founding Hero</Eyebrow>
            <h2 id="founding-h">Founding Hero. 500 seats. Ever.</h2>
            <p style={{ ...mono, fontSize: "var(--text-xl)", color: "var(--text-hi)", marginTop: 18 }}>
              ${LTD.PRICE_USD_DEFAULT} · one-time · lifetime Pro
            </p>
            <ul className="hp-perks" style={{ marginTop: 26 }}>
              <li>{CheckIcon}<span>Intelligence + execution + academy, for life</span></li>
              <li>{CheckIcon}<span>Lifetime Pro limits — 3 live connections</span></li>
              <li>{CheckIcon}<span>Founding badge + day-0 access</span></li>
              <li>{CheckIcon}<span>14-day refund</span></li>
            </ul>
          </div>
          <Card raised tone="volt" className="hp-founding-card" style={{ padding: 32, textAlign: "center" }}>
            <div style={{ ...mono, fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>
              {seats ? (
                <>
                  <span style={{ color: "var(--volt-400)", fontWeight: "var(--weight-semibold)" }}>{seats.remaining}</span> of {seats.cap} seats remaining
                </>
              ) : (
                <>{LTD.SEAT_CAP} seats total — one allocation, ever</>
              )}
            </div>
            <div style={{ ...mono, fontSize: "var(--text-5xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-hi)", marginTop: 14, letterSpacing: "var(--track-tight)" }}>
              ${LTD.PRICE_USD_DEFAULT}
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)", marginTop: 4 }}>
              paid once, in crypto · never a subscription
            </div>
            <div style={{ marginTop: 26 }}>
              <ButtonLink href="/founding" variant="volt" size="lg" style={{ width: "100%" }}>
                {seatNumber ? `Secure seat #${seatNumber}` : "Secure your seat"}
              </ButtonLink>
            </div>
            <Disclaimer style={{ marginTop: 18, textAlign: "left" }} />
          </Card>
        </div>
      </section>

      {/* j ── FAQ TEASER */}
      <section className="section" aria-labelledby="faq-h">
        <div className="container">
          <div className="hp-section-head">
            <Eyebrow>FAQ</Eyebrow>
            <h2 id="faq-h">Straight answers.</h2>
          </div>
          <div className="hp-faq-grid" style={{ marginTop: 36 }}>
            {FAQS.map((f) => (
              <Card key={f.q} style={{ padding: 24 }}>
                <h3 style={{ margin: 0, fontSize: "var(--text-lg)" }}>{f.q}</h3>
                <p style={{ margin: "10px 0 0", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>{f.a}</p>
              </Card>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <Link href="/faq" className="hp-arrow-link">Read the full FAQ →</Link>
          </div>
        </div>
      </section>

      {/* k ── FINAL CTA BAND */}
      <section className="section hp-final" aria-labelledby="final-h" style={{ background: "var(--surface-1)", borderTop: "1px solid var(--border-1)" }}>
        <div className="container">
          <BrandCard
            variant="volt"
            watermark
            badge="EARLY ACCESS · 500 SEATS"
            meta={{ left: ["heropips.com", "learn → paper → automate"], right: COMPLIANCE_MICRO }}
          >
            <h2 id="final-h" className="hp-bc-display">
              your trades, <OutlineWord>on rails.</OutlineWord>
            </h2>
            <p className="hp-bc-lede">
              Two ways in: buy one of the 500 founding seats and start today, or join the free
              launch list and get invited in position order when the public launch opens.
            </p>
            <div className="hp-cta-row" style={{ marginTop: 28 }}>
              <ButtonLink href="/founding" variant="volt" size="lg" style={{ background: "var(--on-volt)", color: "var(--volt-500)", boxShadow: "none" }}>
                Get instant access — $499 →
              </ButtonLink>
              <ButtonLink href="/early-access" variant="ghost" size="lg" style={{ color: "var(--on-volt)", borderColor: "var(--on-volt)" }}>
                Join the free launch list
              </ButtonLink>
            </div>
          </BrandCard>
        </div>
      </section>
    </>
  );
}
