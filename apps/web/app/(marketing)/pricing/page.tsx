import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LTD } from "@heropips/contracts";
import { Badge, BrandCard, ButtonLink, Card, Disclaimer, Eyebrow, Kicker } from "@heropips/ui";
import { BreadcrumbsJsonLd, JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  faqNode,
  FOUNDING_OFFER_ID,
  itemListNode,
  ORG_ID,
  pageGraph,
  siteNodes,
  SITE_IMAGE,
  softwareApplicationNode,
  webPageNode,
  type Crumb,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import { EarlyAccessNote } from "@/components/marketing/EarlyAccessNote";
import { ANNUAL_DISCOUNT, annualMonthly, FAQ, PRICING_NOTE, TIERS } from "@/lib/content";

const TITLE = "Pricing — free to learn, fair to automate";
const DESCRIPTION =
  "Founding Hero is purchasable today: lifetime Pro for a one-time $499 in crypto. Starter, Pro and Elite subscriptions open at the public SaaS launch.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  ...socialMeta(TITLE, DESCRIPTION, "/pricing"),
};

const URL = abs("/pricing");
const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Pricing", path: "/pricing" },
];

/** The four questions the pricing page answers in full, sourced from the
 *  canonical FAQ so the on-page copy and the FAQPage schema cannot drift. */
const PRICING_FAQ_IDS = ["founding-hero-terms", "crypto-payments", "which-brokers", "when-launch"] as const;
const PRICING_FAQ = PRICING_FAQ_IDS.map((id) => {
  const item = FAQ.find((f) => f.id === id);
  if (!item) throw new Error(`pricing: unknown FAQ id "${id}"`);
  return item;
});

export default function PricingPage() {
  return (
    <>
      <BreadcrumbsJsonLd crumbs={CRUMBS} />
      <JsonLd data={pageGraph([
        ...siteNodes(),
        softwareApplicationNode(),
        webPageNode({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: CRUMBS }),
        {
          "@type": "Product",
          "@id": `${URL}#product`,
          name: "HeroPips",
          description:
            "Decision intelligence, guarded execution on your own broker and a built-in trading academy.",
          brand: { "@type": "Brand", name: "HeroPips" },
          url: URL,
          image: [SITE_IMAGE],
          isRelatedTo: { "@id": ORG_ID },
          offers: {
            "@type": "AggregateOffer",
            "@id": `${URL}#offers`,
            priceCurrency: "USD",
            lowPrice: "0",
            highPrice: String(LTD.PRICE_USD_DEFAULT),
            offerCount: TIERS.length + 1,
            availability: "https://schema.org/LimitedAvailability",
            offers: [
              /* Declared by softwareApplicationNode() above — referenced, not
                 duplicated, so the graph carries one Founding Hero offer. */
              { "@id": FOUNDING_OFFER_ID },
              ...TIERS.map((t) => ({
                "@type": "Offer",
                "@id": `${URL}#tier-${t.id}`,
                name: `HeroPips ${t.name}`,
                description: t.tagline,
                price: String(t.priceMonthly),
                priceCurrency: "USD",
                url: `${URL}#tier-${t.id}`,
                availability: "https://schema.org/PreOrder",
                seller: { "@id": ORG_ID },
              })),
            ],
          },
        },
        itemListNode({
          url: URL,
          fragment: "tiers",
          name: "HeroPips subscription tiers at public launch",
          description: PRICING_NOTE,
          items: TIERS.map((t) => ({
            name: `${t.name} — $${t.priceMonthly}/mo`,
            url: `${URL}#tier-${t.id}`,
            description: t.tagline,
          })),
        }),
        faqNode({ url: URL, items: PRICING_FAQ }),
      ])} />

      <section className="section" style={{ background: "var(--grad-hero)" }}>
        <div className="container">
          <Eyebrow style={{ marginBottom: 16 }}>Pricing</Eyebrow>
          <h1 style={{ maxWidth: 680, marginBottom: 20 }}>What does HeroPips cost?</h1>
          <p style={{ maxWidth: 640, fontSize: "var(--text-lg)", color: "var(--text-mid)", marginBottom: 24 }}>
            One thing is purchasable today: the Founding Hero seat — lifetime Pro for a one-time
            $499 in crypto, with the intelligence feed, broker automation and the academy all included.
            The subscription tiers below (Free, Starter, Pro, Elite) open at the public SaaS
            launch, and the academy and paper trading will cost nothing, forever.
          </p>
          <EarlyAccessNote style={{ maxWidth: 640, marginBottom: 16 }} />
          <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)" }}>
            Prices shown monthly. Pay annually and save {ANNUAL_DISCOUNT * 100}% — annual prices shown beneath each tier.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="tiers-h">
        <div className="container">
          <h2 id="tiers-h" style={{ position: "absolute", left: -9999, top: "auto" }}>Plans at public launch</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, alignItems: "stretch" }}>
            {TIERS.map((t) => (
              <Card key={t.id} id={`tier-${t.id}`} raised={t.id === "pro"} tone={t.id === "pro" ? "volt" : undefined} style={{
                padding: 28, display: "flex", flexDirection: "column", gap: 14,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 24 }}>
                  <h3 style={{ fontSize: "var(--text-xl)" }}>{t.name}</h3>
                  {t.badge && <Badge tone={t.badge.tone}>{t.badge.label}</Badge>}
                </div>
                <div>
                  <span className="mono" style={{ fontSize: "var(--text-4xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-hi)" }}>
                    ${t.priceMonthly}
                  </span>
                  <span style={{ color: "var(--text-low)", fontSize: "var(--text-sm)" }}> /mo</span>
                  <Kicker style={{ display: "flex", marginTop: 6 }}>
                    {t.priceMonthly === 0 ? "free forever" : `$${annualMonthly(t.priceMonthly)}/mo billed annually`}
                  </Kicker>
                </div>
                <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)" }}>{t.tagline}</p>
                <ul style={{ listStyle: "none", display: "grid", gap: 8, flex: 1 }}>
                  {t.features.map((f) => (
                    <li key={f} style={{ display: "flex", gap: 8, fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>
                      <span aria-hidden="true" style={{ color: "var(--volt-400)" }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href="/early-access"
                  variant={t.id === "pro" ? "volt" : "ghost"}
                  size="md"
                  style={{ width: "100%", whiteSpace: "normal", textAlign: "center" }}
                >
                  Join the free launch list
                </ButtonLink>
              </Card>
            ))}
          </div>
          <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", marginTop: 16 }}>{PRICING_NOTE}</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="compare-h">
        <div className="container">
          <h2 id="compare-h" style={{ marginBottom: 24 }}>Compare the limits</h2>
          <Card style={{ padding: 24 }}>
            <div className="hp-scroll-x">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr>
                  <th scope="col" style={thStyle}>Limit</th>
                  {TIERS.map((t) => (
                    <th key={t.id} scope="col" style={{ ...thStyle, textAlign: "right" }}>{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row" style={rowHeadStyle}>Price / month</th>
                  {TIERS.map((t) => <td key={t.id} className="mono" style={numStyle}>${t.priceMonthly}</td>)}
                </tr>
                <tr>
                  <th scope="row" style={rowHeadStyle}>Live broker connections</th>
                  {TIERS.map((t) => <td key={t.id} className="mono" style={numStyle}>{t.connections === 0 ? "—" : t.connections.toLocaleString("en-US")}</td>)}
                </tr>
                <tr>
                  <th scope="row" style={rowHeadStyle}>Guarded auto-executions / month</th>
                  {TIERS.map((t) => <td key={t.id} className="mono" style={numStyle}>{t.alertsPerMonth === 0 ? "—" : t.alertsPerMonth.toLocaleString("en-US")}</td>)}
                </tr>
                <tr>
                  <th scope="row" style={rowHeadStyle}>Strategy backtests</th>
                  {TIERS.map((t) => <td key={t.id} className="mono" style={numStyle}>{t.backtests ? "✓" : "—"}</td>)}
                </tr>
                <tr>
                  <th scope="row" style={rowHeadStyle}>Prop-firm presets</th>
                  {TIERS.map((t) => <td key={t.id} className="mono" style={numStyle}>{t.propPresets ? "✓" : "—"}</td>)}
                </tr>
              </tbody>
            </table>
            </div>
          </Card>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <BrandCard
            variant="ink"
            watermark
            badge="500 SEATS · EVER"
            meta={{
              left: ["heropips.com/founding", "lifetime pro · one-time"],
              right: "one allocation — no subscription\n14-day refund — crypto payout\nnot investment advice",
            }}
          >
            <h2 className="hp-bc-display" style={{ fontSize: "clamp(var(--text-3xl), 4vw, var(--text-5xl))" }}>Founding Hero</h2>
            <p className="hp-bc-lede">
              The one seat you can buy today. Lifetime Pro for a one-time <span className="mono" style={{ color: "var(--volt-500)" }}>$499</span> in
              crypto — intelligence, execution and the academy, forever, including everything Pro
              grows into. When the 500 seats are gone, they are gone.
            </p>
            <div style={{ marginTop: 24 }}>
              <ButtonLink href="/founding" variant="volt" size="lg">Get instant access — $499 →</ButtonLink>
            </div>
          </BrandCard>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="pricing-faq-h">
        <div className="container">
          <h2 id="pricing-faq-h" style={{ fontSize: "var(--text-2xl)", marginBottom: 16 }}>Common questions</h2>
          {/* Answers live here, not just links: an FAQPage node may only claim
              Q&A the page actually shows. The copy is the canonical FAQ entry. */}
          <ul style={{ listStyle: "none", display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {PRICING_FAQ.map((f) => (
              <li key={f.id}>
                <Card style={{ padding: "var(--sp-5)", height: "100%", display: "grid", gap: "var(--sp-3)", alignContent: "start" }}>
                  <h3 style={{ fontSize: "var(--text-md)" }}>{f.q}</h3>
                  <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>
                    {f.a}
                  </p>
                  <Link href={`/faq#${f.id}`} style={{ fontSize: "var(--text-sm)" }}>
                    All questions →
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
          <Disclaimer style={{ marginTop: 24 }} />
        </div>
      </section>
    </>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)",
  fontWeight: "var(--weight-medium)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-low)",
  padding: "8px 12px 10px 0", borderBottom: "1px solid var(--border-2)",
};
const rowHeadStyle: CSSProperties = {
  textAlign: "left", fontFamily: "var(--font-mono)", fontWeight: "var(--weight-medium)", fontSize: "var(--text-2xs)",
  textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-low)",
  padding: "14px 12px 14px 0", borderBottom: "1px solid var(--border-1)",
};
const numStyle: CSSProperties = {
  textAlign: "right", fontSize: "var(--text-sm)", color: "var(--text-hi)",
  padding: "12px 0 12px 12px", borderBottom: "1px solid var(--border-1)",
};
