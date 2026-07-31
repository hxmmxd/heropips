import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { ButtonLink, Card, Disclaimer, Eyebrow, Kicker } from "@heropips/ui";
import { EarlyAccessNote } from "@/components/marketing/EarlyAccessNote";
import { Breadcrumbs, JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  faqNode,
  itemListNode,
  pageGraph,
  siteNodes,
  webPageNode,
  type Crumb,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import { GUARDS, type Guard } from "@/lib/content";
import { GuardArt } from "@/components/art/Art";
import styles from "./trade-guard.module.css";

const TITLE = "Trade Guard — nine risk controls, fail-closed";
const DESCRIPTION =
  "Nine independent risk guards sit between every trade and your broker — sizing, loss breakers, drawdown caps, news filters. If the engine is down, orders block.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/product/trade-guard" },
  ...socialMeta(TITLE, DESCRIPTION, "/product/trade-guard"),
};

/* Inline stroke icons — currentColor, 20px, viewBox 24. Same recipe as the
 * landing Trade Guard chips: one icon set, one stroke weight. */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ico = (children: ReactElement | ReactElement[]) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden="true">{children}</svg>
);
const GUARD_ICONS: Record<string, ReactElement> = {
  "Risk-% sizing": ico([
    <line key="a" x1="19" y1="5" x2="5" y2="19" />,
    <circle key="b" cx="6.5" cy="6.5" r="2.5" />,
    <circle key="c" cx="17.5" cy="17.5" r="2.5" />,
  ]),
  "Daily loss breaker": ico(<polyline points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" />),
  "Max drawdown breaker": ico([
    <polyline key="a" points="3 6 9.5 12.5 13 9 20 16" />,
    <polyline key="b" points="14.5 16 20 16 20 10.5" />,
    <line key="c" x1="3" y1="20" x2="21" y2="20" />,
  ]),
  "Exposure cap": ico([
    <path key="a" d="M12 3 2.5 8 12 13l9.5-5L12 3z" />,
    <path key="b" d="M2.5 13 12 18l9.5-5" />,
  ]),
  "Concurrent positions": ico([
    <rect key="a" x="9" y="9" width="12" height="12" rx="2" />,
    <path key="b" d="M5 15a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2" />,
  ]),
  "News filter": ico([
    <path key="a" d="M4 4h13a2 2 0 0 1 2 2v12a2 2 0 0 0 2-2V8" />,
    <path key="b" d="M4 4v14a2 2 0 0 0 2 2h13" />,
    <line key="c" x1="8" y1="9" x2="13" y2="9" />,
    <line key="d" x1="8" y1="13" x2="13" y2="13" />,
  ]),
  "Session window": ico([
    <circle key="a" cx="12" cy="12" r="9" />,
    <polyline key="b" points="12 7 12 12 15.5 14" />,
  ]),
  "Symbol allowlist": ico([
    <line key="a" x1="4" y1="6" x2="12" y2="6" />,
    <line key="b" x1="4" y1="12" x2="12" y2="12" />,
    <line key="c" x1="4" y1="18" x2="9" y2="18" />,
    <polyline key="d" points="14 16 16.5 18.5 21 13.5" />,
  ]),
  "Prop-firm presets": ico([
    <line key="a" x1="4" y1="8" x2="6.6" y2="8" />,
    <line key="b" x1="11.4" y1="8" x2="20" y2="8" />,
    <circle key="c" cx="9" cy="8" r="2.4" />,
    <line key="d" x1="4" y1="16" x2="12.6" y2="16" />,
    <line key="e" x1="17.4" y1="16" x2="20" y2="16" />,
    <circle key="f" cx="15" cy="16" r="2.4" />,
  ]),
};

/* The nine guards, grouped so the stack reads end to end: what you can lose,
 * what you can hold, what may trade at all — then the one-switch bundles. */
const GUARD_GROUPS: ReadonlyArray<{ name: string; gloss: string; guards: readonly string[] }> = [
  {
    name: "Loss limits",
    gloss: "Caps what one trade, one day, or the account as a whole can lose.",
    guards: ["Risk-% sizing", "Daily loss breaker", "Max drawdown breaker"],
  },
  {
    name: "Exposure caps",
    gloss: "Caps how much risk can be open at the same moment.",
    guards: ["Exposure cap", "Concurrent positions"],
  },
  {
    name: "Trade filters",
    gloss: "Controls when — and in what — new orders are allowed to fire.",
    guards: ["News filter", "Session window", "Symbol allowlist"],
  },
  {
    name: "One switch",
    gloss: "Whole prop-firm rule sets, armed in a single move.",
    guards: ["Prop-firm presets"],
  },
];

const GUARD_BY_NAME: Record<string, Guard & { num: number }> = Object.fromEntries(
  GUARDS.map((g, i) => [g.name, { ...g, num: i + 1 }]),
);
const pad2 = (n: number) => String(n).padStart(2, "0");
/* Static page — an unknown name throws at build time, so page and content
 * (lib/content.ts GUARDS) can never silently drift apart. */
function resolveGuard(name: string) {
  const g = GUARD_BY_NAME[name];
  const icon = GUARD_ICONS[name];
  if (!g || !icon) throw new Error(`Trade Guard page: unknown guard "${name}"`);
  return { ...g, icon };
}

/* Extractable answers, all grounded in copy already on this page or in
 * lib/content.ts GUARDS — this is a regulated product, nothing new is claimed. */
const GUARD_FAQ = [
  {
    q: "What happens if the risk engine goes down?",
    a: "Live orders are blocked, never passed. If our risk engine is unreachable — network partition, deploy, outage — a trade that cannot be checked is a trade that does not execute. Availability problems on our side can cost you an entry; they can never cost you an unguarded position.",
  },
  {
    q: "Can I bypass the guards?",
    a: "No. There is no “trusted” path around Trade Guard. Every order — the intelligence engine’s or your own — runs the full stack of nine guards top to bottom between you and your broker, and any single guard can veto. Nine yeses, or nothing reaches your broker.",
  },
  {
    q: "What does the prop-firm preset do?",
    a: "It bundles the daily-loss, total-loss and minimum-day limits of common 1-step and 2-step challenges into one switch, so a challenge-ending breach is stopped by software before it happens.",
  },
  {
    q: "Does Trade Guard eliminate risk?",
    a: "No. Trade Guard reduces and contains risk according to the parameters you configure; it does not eliminate it. Trading involves substantial risk of loss. HeroPips is self-directed software — no advice, no custody, no guarantees.",
  },
];

const URL = abs("/product/trade-guard");
const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Product", path: "/product" },
  { name: "Trade Guard", path: "/product/trade-guard" },
];

export default function TradeGuardPage() {
  return (
    <>
      <JsonLd data={pageGraph([
        ...siteNodes(),
        webPageNode({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: CRUMBS }),
        itemListNode({
          url: URL,
          fragment: "guards",
          name: "The nine Trade Guard risk controls",
          description: DESCRIPTION,
          items: GUARDS.map((g) => ({
            name: g.name,
            url: `${URL}#guards`,
            description: `${g.desc} Default: ${g.param}.`,
          })),
        }),
        faqNode({ url: URL, items: GUARD_FAQ }),
      ])} />

      {/* hero — split, with the conversion path above the fold */}
      <section className="section" style={{ background: "var(--grad-hero)" }}>
        <div className="container">
          <Breadcrumbs items={CRUMBS} />
          <div className={styles.hero}>
            <div>
              <Eyebrow style={{ marginBottom: 16 }}>Product · Trade Guard</Eyebrow>
              <h1 style={{ marginBottom: 20 }}>What does Trade Guard do?</h1>
              <p style={{ maxWidth: 560, fontSize: "var(--text-lg)", color: "var(--text-mid)" }}>
                Trade Guard is the risk infrastructure of the platform: nine independent controls
                that check every order between the intelligence engine — or your own hand — and your broker. There is no
                &ldquo;trusted&rdquo; path around them — one bad day can&apos;t blow the account.
              </p>
              <div className={styles.heroCtas}>
                <ButtonLink href="/founding" variant="volt" size="lg">Get instant access — $499 →</ButtonLink>
                <ButtonLink href="#guards" variant="outline" size="lg">See the nine guards</ButtonLink>
              </div>
              <EarlyAccessNote compact hideCta style={{ maxWidth: 620 }} />
              <div style={{ marginTop: 18 }}>
                <Link href="/#pipeline" className="hp-arrow-link">See how a decision is born →</Link>
              </div>
              <div className={styles.facts} aria-label="Trade Guard facts" role="group">
                <span>nine guards</span>
                <span>fail-closed</span>
                <span>prop-firm presets</span>
                <span>you set the limits</span>
              </div>
            </div>
            <GuardArt style={{ width: "100%", maxWidth: 620, justifySelf: "center" }} />
          </div>
        </div>
      </section>

      <section id="guards" className={`section ${styles.anchor}`} style={{ paddingTop: 0 }} aria-labelledby="guards-h">
        <div className="container">
          <div className={styles.head}>
            <Eyebrow>The guard stack</Eyebrow>
            <h2 id="guards-h">What are the nine guards?</h2>
            <p>
              Every order — the engine&rsquo;s or your own — runs the stack top to bottom.
              Any single guard can veto. Nine yeses, or nothing reaches your broker.
            </p>
          </div>

          <Card raised className={styles.panel}>
            <div className={styles.plate}>
              <span className={styles.plateFlow}>
                order in <span aria-hidden="true">→</span> <b>guards 01–09</b>{" "}
                <span aria-hidden="true">→</span> broker
              </span>
              <span className={styles.plateStatus}>
                <span className={styles.led} aria-hidden="true" />
                fail-closed · always on
              </span>
            </div>

            {GUARD_GROUPS.map((band) => {
              const guards = band.guards.map(resolveGuard);
              const nums = guards.map((g) => g.num);
              const first = Math.min(...nums);
              const last = Math.max(...nums);
              return (
                <div key={band.name} className={styles.band}>
                  <div className={styles.bandLabel}>
                    <Kicker>{first === last ? pad2(first) : `${pad2(first)}–${pad2(last)}`}</Kicker>
                    <p className={styles.bandName}>{band.name}</p>
                    <p className={styles.bandGloss}>{band.gloss}</p>
                  </div>
                  <ol className={styles.mods} role="list" start={first}>
                    {guards.map((g) => (
                      <li
                        key={g.name}
                        className={guards.length === 1 ? `${styles.mod} ${styles.modWide}` : styles.mod}
                      >
                        <span className={styles.modNum} aria-hidden="true">{pad2(g.num)}</span>
                        <div className={styles.modHead}>
                          <span className={styles.modIco} aria-hidden="true">{g.icon}</span>
                          <div>
                            <Kicker className={styles.modTag}>guard {pad2(g.num)}</Kicker>
                            <h3 className={styles.modName}>{g.name}</h3>
                          </div>
                        </div>
                        <code className={styles.modParam}>{g.param}</code>
                        <p className={styles.modDesc}>{g.desc}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </Card>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="failclosed-h">
        <div className="container">
          <Card raised tone="volt" className={styles.failCard}>
            <Kicker tone="volt" style={{ marginBottom: 12 }}>fail-closed</Kicker>
            <h2 id="failclosed-h" style={{ fontSize: "var(--text-3xl)", marginBottom: 12 }}>What happens if the engine goes down?</h2>
            <p style={{ color: "var(--text-mid)", maxWidth: 720, marginBottom: 12 }}>
              If our risk engine is unreachable — network partition, deploy, outage — live orders
              are <strong style={{ color: "var(--text-hi)" }}>blocked, never passed</strong>. A trade that
              cannot be checked is a trade that does not execute. Availability problems on our side
              can cost you an entry; they can never cost you an unguarded position.
            </p>
            <p style={{ color: "var(--text-mid)", maxWidth: 720 }}>
              Running a prop-firm account? The prop preset bundles the daily-loss, total-loss and
              minimum-day limits of common 1-step and 2-step challenges into one switch, so a
              challenge-ending breach is stopped by software before it happens.
            </p>
          </Card>
        </div>
      </section>

      {/* FAQ — extractable answers, FAQPage schema */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="guard-faq-h">
        <div className="container" style={{ maxWidth: 820 }}>
          <div className={styles.head}>
            <Eyebrow>Questions</Eyebrow>
            <h2 id="guard-faq-h">What people ask about Trade Guard</h2>
          </div>
          <div className={styles.faqList} style={{ marginTop: 32 }}>
            {GUARD_FAQ.map((f) => (
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

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className={styles.ctaRow}>
            <ButtonLink href="/founding" variant="volt" size="lg">Get instant access — $499 →</ButtonLink>
            <ButtonLink href="/product/intelligence" variant="ghost" size="lg">See the intelligence engine</ButtonLink>
          </div>
          <Disclaimer style={{ marginTop: 24 }}>
            Trade Guard reduces and contains risk according to the parameters you configure; it does
            not eliminate it. Trading involves substantial risk of loss. Self-directed software —
            no advice, no custody, no guarantees.
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
