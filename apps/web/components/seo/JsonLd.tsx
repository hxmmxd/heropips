import Link from "next/link";
import {
  breadcrumbNode,
  organizationNode,
  pageGraph,
  webPageNode,
  webSiteNode,
  type Crumb,
} from "./graph";
export type { Crumb };

/**
 * Renders a JSON-LD script tag. `data` must be a plain, JSON-serializable
 * schema.org object (we stringify it verbatim).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * BreadcrumbList JSON-LD with no visible trail. For top-level pages whose
 * path is "Home › Page" — a rendered trail there is chrome, not wayfinding.
 * Deep pages use `<Breadcrumbs>` instead, which renders both from one array.
 */
export function BreadcrumbsJsonLd({ crumbs }: { crumbs: readonly Crumb[] }) {
  return <JsonLd data={pageGraph([breadcrumbNode(crumbs)])} />;
}

/**
 * The visible `<nav aria-label="Breadcrumb">` trail AND its BreadcrumbList
 * JSON-LD, from a single `items` array — markup and structured data cannot
 * drift apart. The trailing crumb is plain text (`aria-current="page"`); it
 * neither links nor carries an `item` in the graph.
 */
export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  const last = items.length - 1;
  return (
    <>
      <JsonLd data={pageGraph([breadcrumbNode(items)])} />
      <nav aria-label="Breadcrumb" className="hp-crumbs">
        <ol className="hp-crumbs-list">
          {items.map((c, i) => (
            // Positional key: a trail's identity IS its position, and two
            // crumbs can legitimately share a path (a section index that is
            // also the page you are on).
            <li key={i} className="hp-crumb">
              {i === last ? (
                <span className="hp-crumb-here" aria-current="page">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link href={c.path} className="hp-crumb-link">
                    {c.name}
                  </Link>
                  <span className="hp-crumb-sep" aria-hidden="true">
                    /
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

/**
 * The page-level `@graph` every indexable route needs: WebPage anchored to
 * the site's Organization and WebSite, so `isPartOf`/`about`/`publisher`
 * references resolve inside this document instead of dangling.
 *
 * `breadcrumb` emits a reference only — the BreadcrumbList node itself is
 * declared by `<Breadcrumbs>` or `<BreadcrumbsJsonLd>`, whichever the page
 * renders, so exactly one copy exists per document and the two can never
 * disagree. Pass the same array to both.
 *
 * Pages that also emit domain entities (Product, Course, HowTo, …) build
 * their own single graph with the `graph.ts` node builders rather than
 * stacking this component on top.
 */
export function WebPageJsonLd(props: {
  url: string;
  name: string;
  description: string;
  breadcrumb?: readonly Crumb[];
  primaryImage?: string;
}) {
  return (
    <JsonLd
      data={pageGraph([organizationNode(), webSiteNode(), webPageNode(props)])}
    />
  );
}
