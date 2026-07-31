import { Badge, Disclaimer, Eyebrow, Kicker } from "@heropips/ui";
import { Breadcrumbs, JsonLd } from "@/components/seo/JsonLd";
import { abs, pageGraph, siteNodes, webPageNode, type Crumb } from "@/components/seo/graph";
import { LEGAL_EFFECTIVE_DATE, LEGAL_EFFECTIVE_ISO } from "./effective-date";

export type LegalSection = {
  h: string;
  paras?: string[];
  list?: string[];
  after?: string[];
};

export function LegalShell({ slug, title, description, intro, sections }: {
  slug: string;
  title: string;
  /** The route's meta description — also the WebPage node's description. */
  description: string;
  intro: string;
  sections: LegalSection[];
}) {
  const url = abs(`/legal/${slug}`);
  // "Home › {title}", with no intermediate "Legal" step: there is no /legal
  // index route, so the only candidate parent was /legal/terms — which on the
  // Terms page itself produced a crumb linking to the page you are on, and two
  // <li> children with the same key.
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: title, path: `/legal/${slug}` },
  ];
  return (
    <>
      <JsonLd data={pageGraph([
        ...siteNodes(),
        webPageNode({
          url,
          name: title,
          description,
          breadcrumb: crumbs,
          datePublished: LEGAL_EFFECTIVE_ISO,
          dateModified: LEGAL_EFFECTIVE_ISO,
        }),
      ])} />
      <article className="section">
        <div className="container" style={{ maxWidth: 780 }}>
          <Breadcrumbs items={crumbs} />
          <header style={{ marginBottom: 40 }}>
            <Eyebrow style={{ marginBottom: 14 }}>Legal</Eyebrow>
            <h1 style={{ fontSize: "clamp(var(--text-3xl), 5vw, var(--text-5xl))", marginBottom: 16 }}>{title}</h1>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
              <Badge tone="warn">Draft — counsel review pending</Badge>
              <Kicker>{LEGAL_EFFECTIVE_DATE}</Kicker>
            </div>
            <p style={{ color: "var(--text-mid)", fontSize: "var(--text-lg)" }}>{intro}</p>
          </header>

          {sections.map((s, i) => (
            <section key={s.h} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: "var(--text-2xl)", marginBottom: 12 }}>
                {i + 1}. {s.h}
              </h2>
              {s.paras?.map((p, pi) => (
                <p key={pi} style={{ color: "var(--text-mid)", marginBottom: 12, lineHeight: "var(--leading-read)" }}>{p}</p>
              ))}
              {s.list && (
                <ul style={{ color: "var(--text-mid)", paddingLeft: 22, display: "grid", gap: 8, lineHeight: "var(--leading-read)" }}>
                  {s.list.map((it, li) => <li key={li}>{it}</li>)}
                </ul>
              )}
              {s.after?.map((p, pi) => (
                <p key={pi} style={{ color: "var(--text-mid)", marginTop: 12, lineHeight: "var(--leading-read)" }}>{p}</p>
              ))}
            </section>
          ))}

          <Disclaimer style={{ marginTop: 8 }} />
        </div>
      </article>
    </>
  );
}
