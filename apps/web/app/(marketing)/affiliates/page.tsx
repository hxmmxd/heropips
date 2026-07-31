import type { Metadata } from "next";
import Link from "next/link";
import { BrandCard, ButtonLink, Card, Disclaimer, Eyebrow, Kicker } from "@heropips/ui";
import { BreadcrumbsJsonLd, JsonLd } from "@/components/seo/JsonLd";
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
import { ApplyForm } from "./ApplyForm";
import { NetworkArt } from "@/components/art/Art";
import styles from "./affiliates.module.css";

const TITLE = "Affiliates & referrals — two ways to earn";
const DESCRIPTION =
  "Two ways to earn with HeroPips: share your referral code and earn on paid conversions, or join the marketer platform — multi-level commissions up to 10 levels.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/affiliates" },
  ...socialMeta(TITLE, DESCRIPTION, "/affiliates"),
};

const MEMBER_CHECKS = [
  { lead: "Share your code anywhere", rest: "every member gets a referral code and link automatically. No application, no approval." },
  { lead: "Jump the early access queue", rest: "every 3 verified friends who join with your code move you up 25 places before public launch." },
  { lead: "Earn on paid conversions", rest: "rewards attribute to you when a referred user converts to a paid seat — never on sign-ups alone." },
];

const PARTNER_CHECKS = [
  { lead: "Multi-level commissions", rest: "earn on your own referrals and on the referrals of partners you recruit — up to 10 levels deep." },
  { lead: "Auditable double-entry ledger", rest: "every commission is an entry you can trace: earned, pending, paid, clawed back. No opaque points." },
  { lead: "Crypto payouts", rest: "paid out once your balance clears the threshold, after the 14-day refund window." },
  { lead: "Partner portal at launch", rest: "live clicks, conversions and earnings. Until then, applications are reviewed manually." },
];

const STEPS = [
  {
    n: "01",
    tag: "5 fields · 72h review",
    title: "Apply",
    body: "Tell us who you are and where your audience lives. A human reads every application and replies within 72 hours.",
  },
  {
    n: "02",
    tag: "tracked link · portal at launch",
    title: "Share your link",
    body: "Approved partners get a tracked referral link to share. The portal — live clicks, conversions, earnings — arrives with the public launch.",
  },
  {
    n: "03",
    tag: "ledger · crypto",
    title: "Get paid",
    body: "Commissions hit the ledger when a referred purchase confirms, clear after the 14-day refund window, and pay out in crypto at the threshold.",
  },
];

const MECHANICS = [
  { label: "Ledger", body: "Double-entry and auditable: earned, pending, paid, clawed back. Your balance always reconciles — no shifting rates mid-month." },
  { label: "Clawback", body: "Refunds inside the 14-day window claw back the commission at every level, recorded against the original entry." },
  { label: "Payouts", body: "Crypto, once your cleared balance passes the payout threshold." },
];

const LEVELS = [
  { level: "L1", who: "People you refer directly", rate: "20%" },
  { level: "L2", who: "Their referrals", rate: "10%" },
  { level: "L3", who: "Level-3 referrals", rate: "5%" },
  { level: "L4", who: "Level-4 referrals", rate: "3%" },
  { level: "L5", who: "Level-5 referrals", rate: "2%" },
];

const AFFILIATE_FAQ = [
  {
    q: "When do payouts happen?",
    a: "Commissions accrue on the ledger the moment a referred purchase is confirmed and become payable after the 14-day refund window closes. Payouts are made in crypto once your balance clears the payout threshold.",
  },
  {
    q: "How deep do the levels go?",
    a: "Up to 10 levels deep. The active level count and the rate paid at each level are configured by HeroPips admins; the default schedule is 20% / 10% / 5% / 3% / 2% for levels 1–5.",
  },
  {
    q: "What happens if a purchase is refunded?",
    a: "Refunds inside the 14-day window claw back the associated commissions at every level. The double-entry ledger records the clawback against the original entry, so your balance always reconciles.",
  },
  {
    q: "Who can join?",
    a: "Anyone can share their personal referral code — no application needed. The marketer platform is for educators, community leaders, IBs and creators with a real audience; apply below and we reply within 72 hours.",
  },
];

/* volt tick in a tinted disc — checklist bullet */
function CheckIcon() {
  return (
    <span className={styles.checkIcon} aria-hidden="true">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 12.5 9.5 18 20 6.5" />
      </svg>
    </span>
  );
}

const URL = abs("/affiliates");
const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Affiliates", path: "/affiliates" },
];

export default function AffiliatesPage() {
  return (
    <>
      <BreadcrumbsJsonLd crumbs={CRUMBS} />
      <JsonLd data={pageGraph([
        ...siteNodes(),
        webPageNode({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: CRUMBS }),
        howToNode({
          url: URL,
          name: "How to become a HeroPips partner",
          description:
            "Apply, share your tracked referral link, and get paid in crypto from an auditable double-entry ledger.",
          steps: STEPS.map((s) => ({ name: s.title, text: s.body })),
        }),
        faqNode({ url: URL, items: AFFILIATE_FAQ }),
      ])} />

      {/* hero — question headline, two clear doors, mono facts */}
      <section className="section" style={{ background: "var(--grad-hero)" }}>
        <div className="container">
          <div className={styles.hero}>
            <div>
              <Eyebrow style={{ marginBottom: 16 }}>Partners</Eyebrow>
              <h1 style={{ marginBottom: 20 }}>How do I earn with HeroPips?</h1>
              <p style={{ maxWidth: 560, fontSize: "var(--text-lg)", color: "var(--text-mid)" }}>
                Two ways. Every member shares a referral code that jumps the early access queue
                and earns on paid conversions. Marketers join the partner platform — multi-level
                commissions up to 10 levels deep, paid in crypto from an auditable ledger.
              </p>
              <div className={styles.heroCtas}>
                <ButtonLink href="#apply" variant="volt" size="lg">Apply as a partner →</ButtonLink>
                <ButtonLink href="/early-access" variant="outline" size="lg">Get a referral code</ButtonLink>
              </div>
              <div className={styles.factRow} aria-label="Program facts" role="group">
                <span>20% top rate</span>
                <span>Up to 10 levels</span>
                <span>Crypto payouts</span>
                <span>72h review</span>
              </div>
            </div>
            <NetworkArt style={{ width: "100%", maxWidth: 560, justifySelf: "center" }} />
          </div>
        </div>
      </section>

      {/* path chooser — the decision aid: one door per audience */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="paths-h">
        <div className="container">
          <h2 id="paths-h" style={{ marginBottom: 8 }}>Which one is for me?</h2>
          <p style={{ color: "var(--text-mid)", marginBottom: 32, maxWidth: 640 }}>
            Same engine, two doors. Members share a personal code with zero paperwork;
            partners with an audience apply for the multi-level program.
          </p>
          <div className={styles.chooser}>
            <Card className={styles.chooserCard}>
              <Kicker>For every member · no application</Kicker>
              <h3>Share your referral code</h3>
              <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)" }}>
                Built into every account from the moment you join
                the <Link href="/early-access">early access list</Link>.
              </p>
              <ul className={styles.check}>
                {MEMBER_CHECKS.map((c) => (
                  <li key={c.lead}>
                    <CheckIcon />
                    <span><strong>{c.lead}</strong> — {c.rest}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.chooserFoot}>
                <Link href="/early-access" className="hp-arrow-link">Get your code — it&apos;s free <span aria-hidden="true">→</span></Link>
              </div>
            </Card>

            <Card tone="volt" raised className={styles.chooserCard}>
              <Kicker tone="volt">For marketers &amp; creators · apply below</Kicker>
              <h3>Join the marketer platform</h3>
              <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)" }}>
                For educators, community leaders and IBs with a real audience. Separate from
                user referrals, with its own portal, ledger and payout rails.
              </p>
              <ul className={styles.check}>
                {PARTNER_CHECKS.map((c) => (
                  <li key={c.lead}>
                    <CheckIcon />
                    <span><strong>{c.lead}</strong> — {c.rest}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.chooserFoot}>
                <a href="#apply" className="hp-arrow-link">Apply below — 2 minutes <span aria-hidden="true">↓</span></a>
              </div>
            </Card>
          </div>
          <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", marginTop: 20, maxWidth: 640 }}>
            Separate from both programs on this page: the <Link href="/academy#live-classes">Academy
            referral ladder</Link> extends your free Hero Council live-class access when people you
            invite finish Level 5 — it pays in learning access, never in commissions.
          </p>
        </div>
      </section>

      {/* partner mechanics — 3 steps, then rates + spec-sheet rows */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="how-h">
        <div className="container">
          <h2 id="how-h" style={{ marginBottom: 32 }}>How the partner program works</h2>
          <div className={styles.steps}>
            {STEPS.map((s) => (
              <Card key={s.n} style={{ padding: "var(--sp-6)" }}>
                <span className={styles.stepNode} aria-hidden="true">{s.n}</span>
                <Kicker style={{ display: "flex", margin: "var(--sp-4) 0 var(--sp-2)" }}>{s.tag}</Kicker>
                <h3 style={{ marginBottom: "var(--sp-2)" }}>{s.title}</h3>
                <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)" }}>{s.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="levels-h">
        <div className="container">
          <div className={styles.levels}>
            <div>
              <h2 id="levels-h" style={{ marginBottom: 8 }}>The commission schedule</h2>
              <p style={{ color: "var(--text-mid)", maxWidth: 560 }}>
                When someone in your network converts, a commission is written to the ledger at
                every level above them. Defaults below — admins can configure the level count and
                per-level rates up to 10 levels.
              </p>
              <dl className={styles.mech}>
                {MECHANICS.map((m) => (
                  <div key={m.label} className={styles.mechRow}>
                    <dt className={styles.mechLabel}>{m.label}</dt>
                    <dd className={styles.mechBody}>{m.body}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <BrandCard
              variant="ink"
              watermark
              badge="UP TO 10 LEVELS"
              meta={{
                left: ["@heropips", "multi-level ledger"],
                right: "admin-configurable to 10 levels\nrates are launch defaults\npaid conversions only",
              }}
            >
              <div className={`hp-scroll-x ${styles.levelsScroll}`}>
                <table className={styles.levelsTable}>
                  <thead>
                    <tr>
                      <th scope="col">Level</th>
                      <th scope="col">Who it covers</th>
                      <th scope="col" style={{ textAlign: "right", paddingRight: 0 }}>Default rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LEVELS.map((l) => (
                      <tr key={l.level}>
                        <th scope="row" className="mono">{l.level}</th>
                        <td>{l.who}</td>
                        <td className={`mono ${styles.rate}`}>{l.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </BrandCard>
          </div>
        </div>
      </section>

      {/* FAQ — shared accordion pattern, mirrors /faq */}
      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="affiliate-faq-h">
        <div className="container" style={{ maxWidth: 820 }}>
          <h2 id="affiliate-faq-h" style={{ marginBottom: 24 }}>Affiliate questions, answered</h2>
          <div className={styles.faqList}>
            {AFFILIATE_FAQ.map((f) => (
              <details key={f.q} className="hp-card hp-faq-item">
                <summary>
                  {f.q}
                  <span className="hp-faq-plus" aria-hidden="true">+</span>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* apply — form + what-happens-next aside */}
      <section id="apply" className={`section ${styles.applySection}`} style={{ paddingTop: 0 }} aria-labelledby="apply-h">
        <div className="container">
          <h2 id="apply-h" style={{ marginBottom: 8 }}>Apply to the marketer platform</h2>
          <p style={{ color: "var(--text-mid)", marginBottom: 28, maxWidth: 640 }}>
            Five fields, about two minutes. A human reads every application and replies within 72 hours.
          </p>
          <div className={styles.applyGrid}>
            <ApplyForm />
            <div className={styles.applyAside}>
              <Card style={{ padding: "var(--sp-6)" }}>
                <Kicker tone="volt">After you apply</Kicker>
                <ol className={styles.nextList}>
                  <li className={styles.nextRow} data-state="now">
                    <span className={styles.nextMark} aria-hidden="true" />
                    <span className={styles.nextLabel}>Now</span>
                    <span>Your application lands in the review queue — a human reads every one.</span>
                  </li>
                  <li className={styles.nextRow}>
                    <span className={styles.nextMark} aria-hidden="true" />
                    <span className={styles.nextLabel}>72h</span>
                    <span>You get a reply by email: approved, a follow-up question, or an honest no.</span>
                  </li>
                  <li className={styles.nextRow}>
                    <span className={styles.nextMark} aria-hidden="true" />
                    <span className={styles.nextLabel}>Launch</span>
                    <span>Approved partners get portal access — tracked links, live stats, ledger and payouts.</span>
                  </li>
                </ol>
                <hr className={styles.asideDivider} />
                <Kicker>Who we approve</Kicker>
                <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", marginTop: "var(--sp-3)", lineHeight: "var(--leading-body)" }}>
                  Educators, community leaders, IBs and creators with a reachable audience.
                  Engagement beats headcount — 800 people who trust you beat 80,000 who scrolled past.
                </p>
                <hr className={styles.asideDivider} />
                <Kicker>Not a marketer?</Kicker>
                <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", margin: "var(--sp-3) 0 var(--sp-2)", lineHeight: "var(--leading-body)" }}>
                  You don&apos;t need this form to earn — every member gets a referral code.
                </p>
                <Link href="/early-access" className="hp-arrow-link">Get your code instead <span aria-hidden="true">→</span></Link>
              </Card>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 28 }}>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>
              Compensation disclosure: HeroPips may receive volume-based broker compensation.
              Affiliate earnings depend on referred purchases; nothing here is a promise of income.
            </p>
            <Disclaimer />
          </div>
        </div>
      </section>
    </>
  );
}
