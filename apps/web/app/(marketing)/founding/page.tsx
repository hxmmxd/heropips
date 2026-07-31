import type { Metadata } from "next";
import { LTD, SeatsRes } from "@heropips/contracts";
import { BrandCard, Card, Disclaimer, Eyebrow, Kicker } from "@heropips/ui";
import { billing } from "@/lib/api";
import { SeatsMeter } from "@/components/convert/SeatsMeter";
import { CheckoutCard } from "@/components/convert/CheckoutCard";
import styles from "./founding.module.css";
import { BreadcrumbsJsonLd, JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  howToNode,
  pageGraph,
  siteNodes,
  softwareApplicationNode,
  webPageNode,
  type Crumb,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import { SeatsArt } from "@/components/art/Art";

const URL = abs("/founding");
const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Founding Hero", path: "/founding" },
];

const TITLE = "Founding Hero — lifetime access, 500 seats ever";
const DESCRIPTION =
  "Own HeroPips for life: $499 once, paid in crypto, for lifetime Pro access with the academy included. Only 500 Founding Hero seats will ever exist.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/founding" },
  ...socialMeta(TITLE, DESCRIPTION, "/founding"),
};

export const dynamic = "force-dynamic";

const PERKS = [
  { title: "Lifetime Pro limits", body: "Full Pro entitlement forever, including 3 live broker connections. No subscription, ever." },
  { title: "HeroPips Learn Academy included", body: "The complete academy — a $249 value — bundled into your seat at no extra cost." },
  { title: "Founding badge + flair", body: "Permanent Founding Hero badge and profile flair. One of 500, verifiable." },
  { title: "Inside today, not at launch", body: "The platform is built and live for founding members. Your seat activates as soon as payment confirms — and your feedback shapes what ships next." },
  { title: "Locked pricing forever", body: "Whatever we charge later never touches you. Your entitlement is grandfathered for life." },
  { title: "14-day refund", body: "Change your mind within 14 days and we refund via crypto payout. Seat returns to the pool." },
];

/* The hold window is interpolated, never written out: billing enforces
   LTD_HOLD_TTL_MINUTES and this copy is a promise about it. It read "2 hours"
   while the service held for 20 minutes. */
const STEPS = [
  {
    n: "01",
    tag: `email · ${LTD.HOLD_TTL_MINUTES}-minute hold`,
    title: "Reserve seat",
    body: `Enter your email — we hold a seat for you for ${LTD.HOLD_TTL_MINUTES} minutes while you pay.`,
  },
  { n: "02", tag: "crypto · 300+ coins", title: "Pay in crypto", body: "NOWPayments invoice. USDT by default, 300+ coins supported." },
  { n: "03", tag: "on-chain · permanent", title: "Seat locked", body: "Payment confirms on-chain, your seat is granted permanently. You're inside the live platform immediately." },
];

/* The Offer, SoftwareApplication and Organization all live in THIS page's
   graph. The previous top-level Offer referenced `#app` and `#organization`
   by @id, but those nodes were declared only in the homepage document — so
   on /founding both refs dangled and a bare Offer stood alone, which is not
   a valid rich-result entity. */
const jsonLd = pageGraph([
  ...siteNodes(),
  softwareApplicationNode(),
  webPageNode({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: CRUMBS }),
  howToNode({
    url: URL,
    name: "How to claim a HeroPips Founding Hero seat",
    description:
      "Reserve one of the 500 lifetime Founding Hero seats, pay the one-time $499 in crypto, and the seat is granted permanently.",
    steps: STEPS.map((s) => ({ name: s.title, text: s.body })),
  }),
]);

export default async function FoundingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const defaultRef = raw && /^[A-Z0-9]{4,12}$/i.test(raw) ? raw.toUpperCase() : undefined;

  let seats: SeatsRes | null = null;
  try {
    seats = await billing.get("/v1/founding/seats", SeatsRes);
  } catch {
    seats = null; // meter falls back to client polling
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <BreadcrumbsJsonLd crumbs={CRUMBS} />

      {/* hero-lite */}
      <div className="container section" style={{ paddingBottom: "clamp(32px, 5vw, 64px)" }}>
        <div className={styles.hero}>
          <div>
            <Eyebrow>Founding Hero · 500 ever</Eyebrow>
            <h1 style={{ marginTop: "var(--sp-4)" }}>Own HeroPips for life.</h1>
            <p style={{ marginTop: "var(--sp-5)", color: "var(--text-mid)", fontSize: "var(--text-lg)", maxWidth: 500 }}>
              The platform is built and live — your seat activates the moment payment confirms.
              Five hundred seats. When they are gone, the lifetime deal is gone — permanently.
            </p>
            <SeatsArt style={{ maxWidth: 480, marginTop: "var(--sp-6)" }} />
          </div>
          <BrandCard
            variant="ink"
            watermark
            badge="FOUNDING HERO · LIFETIME"
            meta={{
              left: ["heropips.com/founding", "learn → paper → automate"],
              right: `held seats release after ${LTD.HOLD_TTL_MINUTES} minutes\n14-day refund — crypto payout\nnot investment advice`,
            }}
          >
            <div className={styles.cardPrice}>$499</div>
            <div className={styles.cardPriceMeta}>one-time · lifetime Pro entitlement</div>
            <div className={styles.cardMeterLabel}>Live seat count</div>
            <SeatsMeter initial={seats} />
          </BrandCard>
        </div>
      </div>

      {/* perks */}
      <div className="container" style={{ paddingBottom: "clamp(56px, 9vw, 112px)" }}>
        <h2 style={{ marginBottom: "var(--sp-8)" }}>What a seat buys, forever</h2>
        <div className={styles.perks}>
          {PERKS.map((p) => (
            <Card key={p.title} style={{ padding: "var(--sp-6)" }}>
              <h3 style={{ marginBottom: "var(--sp-2)" }}>{p.title}</h3>
              <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)" }}>{p.body}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* how it works */}
      <div className="container" style={{ paddingBottom: "clamp(56px, 9vw, 112px)" }}>
        <h2 style={{ marginBottom: "var(--sp-8)" }}>How it works</h2>
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

      {/* checkout */}
      <div className="container" style={{ paddingBottom: "clamp(56px, 9vw, 112px)" }}>
        <div className={styles.checkout}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
            <h2>Claim your seat</h2>
            <div>
              <span className="mono" style={{ fontSize: "var(--text-4xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-hi)" }}>$499</span>
              <span style={{ color: "var(--text-mid)", marginLeft: "var(--sp-3)" }}>one-time, in crypto</span>
            </div>
            <div className={styles.trustRow}>
              <span>Non-custodial</span>
              <span>NOWPayments</span>
              <span>14-day refund</span>
            </div>
            <a href="/legal/ltd-terms" style={{ fontSize: "var(--text-sm)", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
              Founding Hero lifetime terms →
            </a>
            <Disclaimer />
          </div>
          <CheckoutCard defaultRef={defaultRef} />
        </div>
      </div>
    </>
  );
}
