import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer, Eyebrow } from "@heropips/ui";
import { BreadcrumbsJsonLd, JsonLd } from "@/components/seo/JsonLd";
import { abs, faqNode, pageGraph, siteNodes, webPageNode, type Crumb } from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import { FAQ } from "@/lib/content";
import styles from "./faq.module.css";

const TITLE = "FAQ — straight answers";
const DESCRIPTION =
  "Straight answers about HeroPips: where the intelligence comes from, which brokers work, what Founding Hero includes, and what we never promise.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  ...socialMeta(TITLE, DESCRIPTION, "/faq"),
};

const URL = abs("/faq");
const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "FAQ", path: "/faq" },
];

export default function FaqPage() {
  return (
    <>
      <BreadcrumbsJsonLd crumbs={CRUMBS} />
      <JsonLd data={pageGraph([
        ...siteNodes(),
        webPageNode({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: CRUMBS }),
        faqNode({ url: URL, items: FAQ }),
      ])} />

      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          <Eyebrow style={{ marginBottom: 16 }}>FAQ</Eyebrow>
          <h1 style={{ marginBottom: 20 }}>Questions about HeroPips, answered directly.</h1>
          <p style={{ color: "var(--text-mid)", marginBottom: 40, maxWidth: 620 }}>
            HeroPips is an AI-powered financial intelligence ecosystem — decision intelligence
            from internal quant data, executed on your own broker under Trade Guard — currently in
            early access for Founding Hero lifetime members. Below are straight answers to what
            people ask before joining; anything deeper lives in
            our <Link href="/legal/terms">terms</Link> or <Link href="/legal/risk">risk disclosure</Link>.
          </p>

          <div className={styles.list}>
            {FAQ.map((f) => (
              <details key={f.id} id={f.id} className="hp-card hp-faq-item">
                <summary>
                  {f.q}
                  <span className="hp-faq-plus" aria-hidden="true">+</span>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>

          <Disclaimer style={{ marginTop: 40 }} />
        </div>
      </section>
    </>
  );
}
