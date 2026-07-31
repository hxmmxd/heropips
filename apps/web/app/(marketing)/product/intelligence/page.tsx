import type { Metadata } from "next";
import Link from "next/link";
import { Badge, BrandCard, ButtonLink, Card, Disclaimer, Eyebrow, Kicker } from "@heropips/ui";
import { EarlyAccessNote } from "@/components/marketing/EarlyAccessNote";
import { Breadcrumbs, JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  faqNode,
  pageGraph,
  siteNodes,
  webPageNode,
  type Crumb,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import { EXECUTION_MODES } from "@/lib/content";
import { SignalArt } from "@/components/art/Art";
import styles from "./intelligence.module.css";

const TITLE = "Intelligence — decisions explained, not signals sold";
const DESCRIPTION =
  "Where HeroPips decision intelligence comes from: quant data, engineered features, quant-ml-v1 scoring, a confidence gate — reasoning attached to every brief.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/product/intelligence" },
  ...socialMeta(TITLE, DESCRIPTION, "/product/intelligence"),
};

/* The deep version of the homepage pipeline — same four stages, more detail.
 * The landing owns the overview poster; here the rail charges up stage by
 * stage: neutral data/features → pulse at the model gate → volt at execution. */
const STAGES = [
  {
    step: "01",
    tag: "composite feeds",
    tone: "" as "" | "pulse" | "volt",
    title: "Quant data",
    detail:
      "Institutional-grade composite feeds across FX, metals and crypto — multiple sources merged, cleaned and time-synced in-house. The engine trades what it measures, not what a vendor labels.",
  },
  {
    step: "02",
    tag: "vol · momentum · regime",
    tone: "" as "" | "pulse" | "volt",
    title: "Feature engine",
    detail:
      "Raw ticks become model inputs on every window: volatility state (realized-vol regimes, ATR expansion, spread state), momentum (multi-horizon returns, impulse strength, volume confirmation), and regime (trend vs. range classification, session context, cross-asset correlation).",
  },
  {
    step: "03",
    tag: "confidence gate",
    tone: "pulse" as "" | "pulse" | "volt",
    title: "ML scoring",
    detail:
      "quant-ml-v1 scores every candidate setup. Below the confidence gate, nothing ships — silence is a feature. Above it, the brief is published with its confidence score, model version and reasoning attached, so you always know which brain produced it and why.",
  },
  {
    step: "04",
    tag: "trade guard · r-multiples",
    tone: "volt" as "" | "pulse" | "volt",
    title: "Guarded execution",
    detail:
      "Entry, stop and R-multiple targets are computed per brief; Trade Guard sizes the order from your equity and stop distance and checks every rule before your broker sees it.",
  },
] as const;

const DISCLOSED = [
  { label: "symbol · direction", desc: "What and which way — from the seven-symbol tradable universe." },
  { label: "entry · stop · target", desc: "Exits expressed as R-multiples of the stop distance, not vibes." },
  { label: "confidence", desc: "The model score that cleared the gate. Low-conviction setups never ship." },
  { label: "reasoning", desc: "The case in plain language — which features fired and why the setup cleared the gate." },
  { label: "model_version", desc: "Every brief names its model (quant-ml-v1 today), so results are attributable across upgrades." },
] as const;

/* The contrast that carries the positioning: an arrow vs. a case.
 * Values are illustrative and labeled simulated — same fields a real brief ships. */
const EXAMPLE_ROWS = [
  ["Direction", "Long EURUSD"],
  ["Confidence", "82% — cleared the gate"],
  ["Volatility", "Realized-vol regime expanding"],
  ["Momentum", "Aligned across horizons"],
  ["Risk", "1R defined before entry · stop attached"],
  ["Model", "quant-ml-v1 · reasoning attached"],
] as const;

/* Illustrative scored candidates — the gate as it actually behaves: most
 * setups are held, one clears. Labeled simulated on the poster meta. */
const HELD = [
  { score: 0.34, note: "below gate" },
  { score: 0.51, note: "below gate" },
  { score: 0.61, note: "below gate" },
] as const;

const PASSED = { score: 0.82, note: "brief shipped" } as const;

/* How much execution permission each mode hands over (pips lit of 3). */
const MODE_META = [
  { pips: 1, perm: "no execution permission" },
  { pips: 2, perm: "you approve every order" },
  { pips: 3, perm: "written consent + Trade Guard" },
] as const;

const INTEL_FAQ = [
  {
    q: "What is the confidence gate?",
    a: "A minimum model score a setup must clear before it becomes a brief. quant-ml-v1 scores every candidate the feature engine produces; anything below the threshold is held and never published. Above it, the brief ships with its confidence score, model version and reasoning attached. Most candidates are held — silence is a feature, not an outage.",
  },
  {
    q: "Do you resell third-party signals?",
    a: "No. Every brief comes from our internal quant engine and nowhere else — institutional-grade market data engineered into volatility, momentum and regime features, then scored by our own machine-learning model. We never resell third-party calls.",
  },
  {
    q: "Which markets does the engine cover?",
    a: "Composite feeds span FX, metals and crypto, and briefs publish against a seven-symbol tradable universe. The engine only trades instruments it measures directly, rather than relaying vendor labels for markets it does not model.",
  },
  {
    q: "Are the numbers on this page real?",
    a: "No. Every figure shown before public launch is simulated or hypothetical and is labeled as such, including the example brief and the scored candidates above. Simulated results have inherent limitations and do not represent real trading; past performance never guarantees future results.",
  },
];

const URL = abs("/product/intelligence");
const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Product", path: "/product" },
  { name: "Intelligence", path: "/product/intelligence" },
];

export default function IntelligencePage() {
  return (
    <>
      <JsonLd data={pageGraph([
        ...siteNodes(),
        webPageNode({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: CRUMBS }),
        faqNode({ url: URL, items: INTEL_FAQ }),
      ])} />

      {/* hero — split, with the conversion path above the fold */}
      <section className="section" style={{
        background: "radial-gradient(900px 480px at 20% -10%, color-mix(in srgb, var(--pulse-500) 18%, transparent), transparent 60%)",
      }}>
        <div className="container">
          <Breadcrumbs items={CRUMBS} />
          <div className={styles.hero}>
            <div>
              <Eyebrow style={{ marginBottom: 16, color: "var(--pulse-300)" }}>Product · Intelligence</Eyebrow>
              <h1 style={{ marginBottom: 20 }}>What is HeroPips decision intelligence?</h1>
              <p style={{ maxWidth: 560, fontSize: "var(--text-lg)", color: "var(--text-mid)" }}>
                Not signals — cases. Our internal quant engine turns institutional-grade market
                data into engineered features, scores every setup with a machine-learning model,
                and publishes only above a confidence gate, with the reasoning attached.
              </p>
              <div className={styles.heroCtas}>
                <ButtonLink href="/founding" variant="volt" size="lg">Get instant access — $499 →</ButtonLink>
                <ButtonLink href="#engine" variant="outline" size="lg">Inside the engine</ButtonLink>
              </div>
              <EarlyAccessNote compact hideCta style={{ maxWidth: 620 }} />
              <div className={styles.facts} aria-label="Engine facts" role="group">
                <span>7 symbols</span>
                <span>quant-ml-v1</span>
                <span>confidence-gated</span>
                <span>reasoning attached</span>
              </div>
            </div>
            <SignalArt style={{ width: "100%", maxWidth: 620, justifySelf: "center" }} />
          </div>
        </div>
      </section>

      {/* the positioning contrast — an arrow vs. a case */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="why-h">
        <div className="container">
          <div className={styles.head}>
            <div className={styles.headRow}>
              <Eyebrow>The difference</Eyebrow>
              <Badge tone="warn">Illustrative · simulated</Badge>
            </div>
            <h2 id="why-h">Arrows are cheap. Understanding compounds.</h2>
            <p>
              Hundreds of companies sell buy/sell arrows. HeroPips ships the case behind the
              trade — because a trader who knows <em>why</em> makes better decisions long after
              any single trade resolves.
            </p>
          </div>
          <div className={styles.versus} style={{ marginTop: 40 }}>
            <Card className={`${styles.vsCard} ${styles.vsQuiet}`}>
              <Kicker>a signal — the commodity</Kicker>
              <p className={styles.vsArrow}>BUY EURUSD</p>
              <p className={styles.vsBody}>
                That&apos;s the whole product. No context, no confidence, no risk framing — trust
                the arrow, learn nothing.
              </p>
              <div className={styles.vsVerdict}>1 line · no case · nothing to audit</div>
            </Card>

            <Card tone="pulse" raised className={styles.vsCard}>
              <Kicker tone="pulse">a HeroPips brief — the case</Kicker>
              <dl className={styles.vsFields}>
                {EXAMPLE_ROWS.map(([k, v]) => (
                  <div key={k} className={styles.vsField}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className={`${styles.vsVerdict} ${styles.vsVerdictOn}`}>6 fields · full case · auditable</div>
            </Card>
          </div>
        </div>
      </section>

      {/* the datasheet — 5 rows, never a ragged orphan grid */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="disclosure-h">
        <div className="container">
          <div className={styles.head}>
            <Eyebrow>Full disclosure</Eyebrow>
            <h2 id="disclosure-h">What ships with every brief?</h2>
            <p>A trade idea you can&apos;t audit is a tip, and we don&apos;t do tips.</p>
          </div>
          <Card className={styles.spec} style={{ marginTop: 40 }}>
            <div className={styles.specHead} aria-hidden="true">
              <span>Field</span>
              <span>What it means</span>
            </div>
            <dl style={{ margin: 0 }}>
              {DISCLOSED.map((d) => (
                <div key={d.label} className={styles.specRow}>
                  <dt className={styles.specLabel}>{d.label}</dt>
                  <dd className={styles.specDesc}>{d.desc}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </section>

      {/* the anchor moment — the gate, drawn */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="gate-h">
        <div className="container">
          <div className={styles.head}>
            <div className={styles.headRow}>
              <Eyebrow>The gate</Eyebrow>
              <Badge tone="warn">Illustrative · simulated</Badge>
            </div>
            <h2 id="gate-h">Most setups never reach you.</h2>
            <p>
              Every candidate the feature engine produces gets scored. Only those above the
              confidence gate become briefs — the rest are held, and you never see them.
            </p>
          </div>
          <BrandCard
            variant="ink"
            watermark
            badge="CONFIDENCE GATE"
            meta={{
              left: ["@heropips", "quant-ml-v1"],
              right: "illustrative scores — simulated\nbelow the gate nothing publishes\nthreshold is model-configured",
            }}
            style={{ marginTop: 40 }}
          >
            <div className={styles.gateGrid}>
              <div>
                <ul className={styles.gateRows}>
                  {HELD.map((r) => (
                    <li key={r.score} className={styles.gateRow} data-state="held">
                      <span className={styles.gateScore}>{r.score.toFixed(2)}</span>
                      <span className={styles.gateTrack}>
                        <span className={styles.gateFill} style={{ width: `${r.score * 100}%` }} />
                      </span>
                      <span className={styles.gateVerdict}>{r.note} · held</span>
                    </li>
                  ))}
                </ul>
                <div className={styles.gateLine}>Confidence gate</div>
                <ul className={styles.gateRows}>
                  <li className={styles.gateRow} data-state="pass">
                    <span className={styles.gateScore}>{PASSED.score.toFixed(2)}</span>
                    <span className={styles.gateTrack}>
                      <span className={styles.gateFill} style={{ width: `${PASSED.score * 100}%` }} />
                    </span>
                    <span className={styles.gateVerdict}>{PASSED.note}</span>
                  </li>
                </ul>
              </div>
              <div className={styles.gateAside}>
                <p className={styles.gateBig}>Silence is a feature.</p>
                <p className={styles.gateNote}>
                  A quiet day means the engine found nothing worth your risk. Publishing
                  low-conviction setups to look busy is how signal services burn accounts.
                </p>
              </div>
            </div>
          </BrandCard>
        </div>
      </section>

      {/* the engine — the rail, charging up to execution */}
      <section id="engine" className={`section ${styles.anchor}`} style={{ paddingTop: 0 }} aria-labelledby="engine-h">
        <div className="container">
          <div className={styles.head}>
            <Eyebrow>Inside the engine</Eyebrow>
            <h2 id="engine-h">How is a decision born?</h2>
            <p>
              Four stages, in-house end to end. Before public launch, all engine output shown
              anywhere on this site is simulated and labeled as such.
            </p>
          </div>
          <ol className={styles.rail} style={{ marginTop: 40 }}>
            {STAGES.map((s) => (
              <li key={s.step} className={styles.railItem} data-tone={s.tone || undefined}>
                <span className={styles.railNode} aria-hidden="true">{s.step}</span>
                <Card tone={s.tone || undefined} className={styles.railCard}>
                  <Kicker tone={s.tone || undefined}>{s.tag}</Kicker>
                  <h3>{s.title}</h3>
                  <p>{s.detail}</p>
                </Card>
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 24 }}>
            <Link href="/product/automation" className="hp-arrow-link">
              What happens after the gate: execution <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* permission ladder */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="modes-h">
        <div className="container">
          <div className={styles.head}>
            <Eyebrow>Execution permission</Eyebrow>
            <h2 id="modes-h">Who decides what executes?</h2>
            <p>
              Permission is never a default. You start in notify, opt into confirm, and full-auto
              requires separate written consent plus an active Trade Guard configuration.
            </p>
          </div>
          <div className={styles.modes} style={{ marginTop: 40 }}>
            {EXECUTION_MODES.map((m, i) => {
              const meta = MODE_META[i];
              return (
                <Card key={m.mode} raised={i === 1} className={styles.modeCard}>
                  <div className={styles.modeTop}>
                    <Kicker>{`mode 0${i + 1}`}</Kicker>
                    <span className={styles.modeSteps} aria-hidden="true">
                      {[0, 1, 2].map((p) => (
                        <span key={p} className={styles.modePip} data-on={p < meta.pips} />
                      ))}
                    </span>
                  </div>
                  <h3 className={styles.modeName}>{m.mode}</h3>
                  <p className={styles.modeDesc}>{m.desc}</p>
                  <div className={styles.modePerm}>{meta.perm}</div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ — extractable answers, FAQPage schema */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="intel-faq-h">
        <div className="container" style={{ maxWidth: 820 }}>
          <div className={styles.head}>
            <Eyebrow>Questions</Eyebrow>
            <h2 id="intel-faq-h">What people ask about the engine</h2>
          </div>
          <div className={styles.faqList} style={{ marginTop: 32 }}>
            {INTEL_FAQ.map((f) => (
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
          <Disclaimer style={{ marginTop: 24 }}>
            Intelligence briefs are informational output of software, not investment advice or
            recommendations. All pre-launch figures are simulated. Trading involves substantial
            risk of loss; you alone decide what executes on your account.
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
