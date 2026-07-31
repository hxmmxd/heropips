import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, Disclaimer, Eyebrow, Kicker } from "@heropips/ui";
import { EarlyAccessNote } from "@/components/marketing/EarlyAccessNote";
import { BreadcrumbsJsonLd, JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  faqNode,
  itemListNode,
  pageGraph,
  siteNodes,
  softwareApplicationNode,
  webPageNode,
  type Crumb,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import { JOURNEY, PILLARS } from "@/lib/content";
import { StackArt } from "@/components/art/Art";
import styles from "./product.module.css";

const TITLE = "Product — the trading intelligence platform";
const DESCRIPTION =
  "How the HeroPips platform works: institutional-grade data becomes scored, explained decision intelligence that executes on your broker behind Trade Guard.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/product" },
  ...socialMeta(TITLE, DESCRIPTION, "/product"),
};

/* Pillar micro-tags: pulse strictly for the model card; volt for the one
 * brand/learning moment; execution and risk stay neutral mono. */
const PILLAR_META: Record<string, { kicker: string; tone?: "volt" | "pulse" }> = {
  "/product/intelligence": { kicker: "quant-ml-v1 · confidence gate", tone: "pulse" },
  "/product/automation": { kicker: "MT5 · Binance · KuCoin" },
  "/product/trade-guard": { kicker: "nine guards · fail-closed" },
  "/academy": { kicker: "heropips learn · $10k paper", tone: "volt" },
};

/* Hub-level answers: what the platform is, who holds the money, what you
 * bring, and how the four pillars connect. Every answer is a restatement of
 * copy already published in lib/content.ts — nothing new is claimed here. */
const PRODUCT_FAQ = [
  {
    q: "What is the HeroPips platform?",
    a: "A trading intelligence platform, not a signal seller. Institutional-grade market data is engineered into features, scored by our machine-learning model, and published as decision intelligence — trade ideas scored for confidence and explained in plain reasoning — that executes on your own broker inside Trade Guard, the risk rules the platform enforces for you. The HeroPips Learn academy and a $10,000 paper account complete the ecosystem. It is self-directed software: no advice, no custody.",
  },
  {
    q: "Does HeroPips hold my funds?",
    a: "No — your funds never leave your broker, and HeroPips has no custody, ever. Broker connections use trade-scope API keys only; withdrawal-enabled keys are rejected at setup. Keys are encrypted at rest, and you can revoke access at your broker at any time.",
  },
  {
    q: "What do I need to start?",
    a: "Your own broker or exchange account. MT5, Binance and KuCoin are live at early access, and a unified exchange API adds 30+ more crypto exchanges as it rolls out. You connect with trade-scope API keys on your existing account — no migration, no deposit with us. The academy and the $10,000 paper account run on the same pipeline, so you can prove it before your broker sees an order.",
  },
  {
    q: "How do the four parts fit together?",
    a: "One pipeline, end to end. The quant engine scores a setup and publishes a brief only above the confidence gate; the brief is sized from your equity and stop distance and checked against every Trade Guard rule; only then is the order routed to your own broker connection, exactly once; then fills, R-multiples and P&L are journaled. If any guard fails, the order is blocked, not passed — there is no trusted path around the guards, whether the model proposed the trade or you did.",
  },
];

const URL = abs("/product");
const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Product", path: "/product" },
];

export default function ProductPage() {
  return (
    <>
      <BreadcrumbsJsonLd crumbs={CRUMBS} />
      <JsonLd data={pageGraph([
        ...siteNodes(),
        softwareApplicationNode(),
        webPageNode({
          url: URL,
          name: TITLE,
          description: DESCRIPTION,
          breadcrumb: CRUMBS,
          type: "CollectionPage",
        }),
        itemListNode({
          url: URL,
          fragment: "pillars",
          name: "The four pillars of the HeroPips platform",
          description: DESCRIPTION,
          items: PILLARS.map((p) => ({
            name: p.title,
            url: abs(p.href),
            description: p.desc,
          })),
        }),
        faqNode({ url: URL, items: PRODUCT_FAQ }),
      ])} />

      {/* hero — split, with the conversion path above the fold */}
      <section className="section" style={{ background: "var(--grad-hero)" }} aria-labelledby="product-h">
        <div className="container">
          <div className={styles.hero}>
            <div>
              <Eyebrow style={{ marginBottom: 16 }}>Product</Eyebrow>
              <h1 id="product-h" style={{ marginBottom: 20 }}>What is the HeroPips platform?</h1>
              <p style={{ maxWidth: 560, fontSize: "var(--text-lg)", color: "var(--text-mid)" }}>
                A trading intelligence platform: institutional-grade market data is engineered into
                features, scored by our machine-learning model, and published as decision
                intelligence that executes on your own broker — inside Trade Guard, the risk rules
                it enforces for you. The academy and paper account teach you why before anything
                trades.
              </p>
              <div className={styles.heroCtas}>
                <ButtonLink href="/founding" variant="volt" size="lg">Get instant access — $499 →</ButtonLink>
                <ButtonLink href="#journey" variant="outline" size="lg">How it works</ButtonLink>
              </div>
              <EarlyAccessNote compact hideCta style={{ maxWidth: 620 }} />
              <div className={styles.facts} aria-label="Platform facts" role="group">
                <span>MT5 · Binance · KuCoin</span>
                <span>nine guards</span>
                <span>never custodial</span>
                <span>$10k paper account</span>
              </div>
            </div>
            <StackArt style={{ width: "100%", maxWidth: 620, justifySelf: "center" }} />
          </div>
        </div>
      </section>

      {/* the four pillars — always a clean 2x2, never a 3 + 1 orphan row */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="capabilities-h">
        <div className="container">
          <div className={styles.head}>
            <Eyebrow>Capabilities</Eyebrow>
            <h2 id="capabilities-h">What can it do?</h2>
            <p>
              Four parts of one platform: the engine that decides, the execution that carries it
              out, the guards every order has to clear, and the academy that teaches you why.
            </p>
          </div>
          <div className={styles.pillars} style={{ marginTop: 40 }}>
            {PILLARS.map((p) => {
              const meta = PILLAR_META[p.href];
              return (
                <Link key={p.title} href={p.href} className={`hp-card-link ${styles.pillarLink}`}>
                  <Card tone={meta?.tone} className={styles.pillarCard}>
                    <Kicker tone={meta?.tone}>{meta?.kicker}</Kicker>
                    <h3>{p.title}</h3>
                    <p>{p.desc}</p>
                    <span className={`hp-arrow-link ${styles.pillarArrow}`}>
                      Explore {p.title.toLowerCase()} <span aria-hidden="true">→</span>
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* the journey — one pipeline drawn as a rail, charging into execution */}
      <section id="journey" className={`section ${styles.anchor}`} style={{ paddingTop: 0 }} aria-labelledby="journey-h">
        <div className="container">
          <div className={styles.head}>
            <Eyebrow>The pipeline</Eyebrow>
            <h2 id="journey-h">How does a trade happen?</h2>
            <p>
              One pipeline, end to end. No trusted path around the guards — every order passes the
              same checks whether the model proposed it or you did.
            </p>
          </div>
          <ol className={styles.rail} style={{ marginTop: 40 }}>
            {JOURNEY.map((s, i) => {
              const last = i === JOURNEY.length - 1;
              return (
                <li key={s.step} className={styles.railItem} data-tone={last ? "volt" : undefined}>
                  <span className={styles.railNode} aria-hidden="true">{s.step}</span>
                  <Card tone={last ? "volt" : undefined} className={styles.railCard}>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </Card>
                </li>
              );
            })}
          </ol>
          <div style={{ marginTop: 24 }}>
            <Link href="/#pipeline" className="hp-arrow-link" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>
              See how a decision is born <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ — extractable answers, FAQPage schema */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="product-faq-h">
        <div className="container" style={{ maxWidth: 820 }}>
          <div className={styles.head}>
            <Eyebrow>Questions</Eyebrow>
            <h2 id="product-faq-h">What people ask about the platform</h2>
          </div>
          <div className={styles.faqList} style={{ marginTop: 32 }}>
            {PRODUCT_FAQ.map((f) => (
              <details key={f.q} className="hp-card hp-faq-item">
                <summary>
                  {f.q}
                  <span className="hp-faq-plus" aria-hidden="true">+</span>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p className={styles.faqMore}>
            More in the full <Link href="/faq">FAQ</Link>.
          </p>
        </div>
      </section>

      {/* close */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="product-cta-h">
        <div className="container">
          <Card raised className={styles.ctaCard}>
            <div className={styles.ctaCopy}>
              <h2 id="product-cta-h">Get in before public launch</h2>
              <p>
                Founding Heroes run the live platform today; the early access list gets first invites when
                the public SaaS launch opens.
              </p>
            </div>
            <div className={styles.ctaButtons}>
              <ButtonLink href="/founding" variant="volt" size="lg">Get instant access — $499 →</ButtonLink>
              <ButtonLink href="/early-access" variant="ghost" size="lg">Join the free launch list</ButtonLink>
            </div>
          </Card>
          <Disclaimer style={{ marginTop: 24 }} />
        </div>
      </section>
    </>
  );
}
