import type { Metadata } from "next";
import Link from "next/link";
import { BrandCard, ButtonLink, Card, Disclaimer, Eyebrow, Kicker } from "@heropips/ui";
import { EarlyAccessNote } from "@/components/marketing/EarlyAccessNote";
import { Breadcrumbs, JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  faqNode,
  howToNode,
  pageGraph,
  siteNodes,
  webPageNode,
  type Crumb,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import { RailArt } from "@/components/art/Art";
import styles from "./automation.module.css";

const TITLE = "Automation — execution on your own broker";
const DESCRIPTION =
  "HeroPips carries every decision to the broker you already use — MT5, Binance or KuCoin — after every Trade Guard check. Trade-scope keys only, never custody.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/product/automation" },
  ...socialMeta(TITLE, DESCRIPTION, "/product/automation"),
};

/* Venue coverage is tabular — name, scope, status, one line of detail.
 * Rendered as a real table, not a card grid: four tiles orphan the last one
 * at tablet widths, and a table keeps the columns comparable. */
const BROKER_ROWS = [
  {
    name: "MT5",
    scope: "FX · metals · indices",
    desc: "MetaTrader 5 — connect virtually any MT5 broker account you already hold.",
    live: true,
  },
  {
    name: "Binance",
    scope: "crypto spot",
    desc: "Direct exchange connection with trade-scope API keys.",
    live: true,
  },
  {
    name: "KuCoin",
    scope: "crypto spot",
    desc: "Direct exchange connection with trade-scope API keys.",
    live: true,
  },
  {
    name: "Unified API",
    scope: "30+ crypto exchanges",
    desc: "One integration layer covering 30+ additional exchanges — rolling out through early access.",
    live: false,
  },
] as const;

/* The second half of the pipeline the intelligence page draws: the rail
 * charges neutral → volt at step 3, the moment an order actually leaves
 * the platform for your connection. */
const EXEC_STEPS = [
  { step: "1", tone: "" as "" | "volt", title: "Brief published", desc: "The quant engine publishes an intelligence brief — symbol, direction, stop, R-multiple targets, confidence, model version and reasoning. Nothing about it is sized yet." },
  { step: "2", tone: "" as "" | "volt", title: "Sized and guarded", desc: "The order is sized from your equity and stop distance, then checked against every Trade Guard rule: daily loss, drawdown, exposure, news, session, symbol." },
  { step: "3", tone: "volt" as "" | "volt", title: "Routed to your broker", desc: "Only a fully-guarded order reaches your connection. Idempotent, exactly once — a re-processed brief can never double an order." },
  { step: "4", tone: "" as "" | "volt", title: "Journaled", desc: "Fills, positions and P&L stream back into your dashboard, so every model decision stays auditable." },
] as const;

/* The trust anchor — four facts that all say the same thing, so they get one
 * poster instead of four look-alike cards. */
const KEY_FACTS = [
  { title: "Trade-scope only", desc: "Keys carry trade permission only. Withdrawal-enabled keys are rejected at setup — the software could not move funds even if compromised." },
  { title: "Encrypted at rest", desc: "Credentials are encrypted before they touch a disk and never leave the execution service." },
  { title: "Never custodial", desc: "Your money stays at your broker or exchange. HeroPips holds no client funds — there is no deposit to make." },
  { title: "Revocable in seconds", desc: "Delete the connection here or revoke the key at your broker; either kills execution instantly." },
] as const;

const AUTOMATION_FAQ = [
  {
    q: "Which brokers and exchanges work today?",
    a: "MT5, Binance and KuCoin are live at early access. MetaTrader 5 connects virtually any MT5 broker account you already hold; Binance and KuCoin connect directly with trade-scope API keys. A unified exchange API covering 30+ additional crypto exchanges is rolling out through early access, and founding-member demand sets the order.",
  },
  {
    q: "Can HeroPips withdraw my funds?",
    a: "No. Keys carry trade permission only, and withdrawal-enabled keys are rejected at setup — the software could not move funds even if compromised. Your money stays at your broker or exchange: HeroPips holds no client funds and there is no deposit to make.",
  },
  {
    q: "What happens if the same brief is processed twice?",
    a: "Nothing extra reaches your account. Only a fully-guarded order reaches your connection, and routing is idempotent, exactly once — a re-processed brief can never double an order.",
  },
  {
    q: "How do I stop execution?",
    a: "Delete the connection here or revoke the key at your broker; either kills execution instantly. Credentials are encrypted before they touch a disk and never leave the execution service.",
  },
];

const URL = abs("/product/automation");
const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Product", path: "/product" },
  { name: "Automation", path: "/product/automation" },
];

export default function AutomationPage() {
  return (
    <>
      <JsonLd data={pageGraph([
        ...siteNodes(),
        webPageNode({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: CRUMBS }),
        howToNode({
          url: URL,
          name: "How a HeroPips brief becomes a guarded order on your broker",
          description:
            "The four stages every intelligence brief passes through before your broker sees an order: published, sized and guarded, routed, journaled.",
          steps: EXEC_STEPS.map((s) => ({ name: s.title, text: s.desc })),
        }),
        faqNode({ url: URL, items: AUTOMATION_FAQ }),
      ])} />

      {/* hero — split, with the conversion path above the fold */}
      <section className="section" style={{ background: "var(--grad-hero)" }}>
        <div className="container">
          <Breadcrumbs items={CRUMBS} />
          <div className={styles.hero}>
            <div>
              <Eyebrow style={{ marginBottom: 16 }}>Product · Automation</Eyebrow>
              <h1>What does HeroPips automation do?</h1>
              <p style={{ maxWidth: 560, marginTop: 20, fontSize: "var(--text-lg)", color: "var(--text-mid)" }}>
                It carries each decision from the intelligence engine to your own broker account —
                sized, guarded and journaled. You connect the account you already trade on; we never
                hold your funds.
              </p>
              <div className={styles.heroCtas}>
                <ButtonLink href="/founding" variant="volt" size="lg">Get instant access — $499 →</ButtonLink>
                <ButtonLink href="#execution" variant="outline" size="lg">Execution path</ButtonLink>
              </div>
              <EarlyAccessNote compact hideCta style={{ maxWidth: 620 }} />
              <div className={styles.facts} aria-label="Execution facts" role="group">
                <span>MT5 · Binance · KuCoin</span>
                <span>30+ exchanges rolling out</span>
                <span>trade-scope keys only</span>
                <span>never custodial</span>
              </div>
            </div>
            <RailArt style={{ width: "100%", maxWidth: 620, justifySelf: "center" }} />
          </div>
        </div>
      </section>

      {/* venue datasheet — a table, so nothing orphans and columns compare */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="brokers-h">
        <div className="container">
          <div className={styles.head}>
            <Eyebrow>Coverage</Eyebrow>
            <h2 id="brokers-h">Which brokers and exchanges work?</h2>
            <p>
              MT5, Binance and KuCoin are live at early access. The unified exchange API extends
              coverage to 30+ more crypto venues as it rolls out — founding-member demand sets the
              order.
            </p>
          </div>
          <Card className={styles.sheet} style={{ marginTop: 40 }}>
            <div className={`hp-scroll-x ${styles.tableScroll}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col" className={styles.colVenue}>Venue</th>
                    <th scope="col" className={styles.colScope}>Coverage</th>
                    <th scope="col" className={styles.colStatus}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {BROKER_ROWS.map((b) => (
                    <tr key={b.name}>
                      <th scope="row">
                        <span className={styles.venue}>{b.name}</span>
                        <p className={styles.venueDesc}>{b.desc}</p>
                      </th>
                      <td className={styles.scope}>{b.scope}</td>
                      <td>
                        <Kicker tone={b.live ? "volt" : undefined}>
                          {b.live ? "live" : "rolling out"}
                        </Kicker>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* the execution rail — brief to broker, guards in the middle */}
      <section id="execution" className={`section ${styles.anchor}`} style={{ paddingTop: 0 }} aria-labelledby="exec-h">
        <div className="container">
          <div className={styles.head}>
            <Eyebrow>Brief to broker</Eyebrow>
            <h2 id="exec-h">How do execution and Trade Guard interact?</h2>
            <p>
              There is no path from brief to broker that skips the guards — and if the risk engine
              is ever unreachable, orders are blocked, never passed.
            </p>
          </div>
          <ol className={styles.rail} style={{ marginTop: 40 }}>
            {EXEC_STEPS.map((s, i) => (
              <li key={s.step} className={styles.railItem} data-tone={s.tone || undefined}>
                <span className={styles.railNode} aria-hidden="true">{`0${i + 1}`}</span>
                <Card tone={s.tone || undefined} className={styles.railCard}>
                  <Kicker tone={s.tone || undefined}>{`step 0${i + 1}`}</Kicker>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* the anchor moment — credentials, as one poster instead of four cards */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="keys-h">
        <div className="container">
          <div className={styles.head}>
            <Eyebrow>Credentials</Eyebrow>
            <h2 id="keys-h">How are my credentials handled?</h2>
            <p>
              The connection is the most sensitive thing you give us, so it gets the least power we
              can make it work with.
            </p>
          </div>
          <BrandCard
            variant="ink"
            watermark
            badge="TRADE-SCOPE ONLY"
            meta={{
              left: ["@heropips", "execution service"],
              right: "withdrawal-enabled keys rejected\nencrypted before disk\nrevocable in seconds",
            }}
            style={{ marginTop: 40 }}
          >
            <div className={styles.poster}>
              <p className={styles.posterBig}>Your keys can&apos;t move your money.</p>
              <dl className={styles.posterRows}>
                {KEY_FACTS.map((k) => (
                  <div key={k.title} className={styles.posterRow}>
                    <dt>{k.title}</dt>
                    <dd>{k.desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </BrandCard>
        </div>
      </section>

      {/* FAQ — extractable answers, FAQPage schema */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="automation-faq-h">
        <div className="container" style={{ maxWidth: 820 }}>
          <div className={styles.head}>
            <Eyebrow>Questions</Eyebrow>
            <h2 id="automation-faq-h">What people ask about execution</h2>
          </div>
          <div className={styles.faqList} style={{ marginTop: 32 }}>
            {AUTOMATION_FAQ.map((f) => (
              <details key={f.q} className="hp-card hp-faq-item">
                <summary>
                  {f.q}
                  <span className="hp-faq-plus" aria-hidden="true">+</span>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p style={{ marginTop: 20, fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>
            More in the full <Link href="/faq">FAQ</Link>.
          </p>
        </div>
      </section>

      {/* close */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className={styles.ctaRow}>
            <ButtonLink href="/founding" variant="volt" size="lg">Get instant access — $499 →</ButtonLink>
            <ButtonLink href="/product/trade-guard" variant="ghost" size="lg">Meet Trade Guard</ButtonLink>
          </div>
          <Disclaimer style={{ marginTop: 24 }} />
        </div>
      </section>
    </>
  );
}
