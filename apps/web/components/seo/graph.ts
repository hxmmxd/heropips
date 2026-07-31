/* =========================================================================
 * schema.org entity builders — one `@graph` per page.
 *
 * JSON-LD resolves per DOCUMENT: a bare `{"@id": ".../#organization"}` on a
 * page whose markup never declares that node is a dangling reference, not a
 * link. So every page emits the site-wide entities it points at
 * (Organization, WebSite, and SoftwareApplication where relevant) inside its
 * own graph, and page-scoped nodes hang off stable `#webpage` / `#breadcrumb`
 * / `#faq` ids derived from the canonical URL.
 *
 * Server-only: pulls SITE_URL from lib/content, which transitively imports the
 * whole lesson corpus. Never import this from a "use client" module.
 * ======================================================================= */

import { LTD } from "@heropips/contracts";
import { SITE_URL } from "@/lib/content";

export type SchemaNode = Record<string, unknown>;

/** A breadcrumb step. Paths are site-relative ("/product/trade-guard"). */
export type Crumb = { name: string; path: string };

/* ---------- stable @ids ---------- */

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const APP_ID = `${SITE_URL}/#app`;
export const LOGO_ID = `${SITE_URL}/#logo`;
export const FOUNDING_OFFER_ID = `${SITE_URL}/founding#offer`;

/** Shared social/primary image. Mirrors the OG card in components/seo/meta.ts. */
export const SITE_IMAGE = `${SITE_URL}/media/hero-poster.jpg`;

export const abs = (path: string): string => `${SITE_URL}${path}`;
export const webPageId = (url: string): string => `${url}#webpage`;
export const breadcrumbId = (url: string): string => `${url}#breadcrumb`;
export const faqId = (url: string): string => `${url}#faq`;

/* ---------- freshness stamps ----------
 * Constants, never `new Date()`: a stamp that rolls on every render teaches
 * crawlers the freshness signal is noise. CI sets NEXT_PUBLIC_BUILD_TIME on
 * deploy; bump CONTENT_PUBLISHED when the corpus is re-authored. */

export const CONTENT_PUBLISHED = process.env.NEXT_PUBLIC_CONTENT_PUBLISHED ?? "2026-07-30";
export const CONTENT_MODIFIED = process.env.NEXT_PUBLIC_BUILD_TIME ?? CONTENT_PUBLISHED;

/* Fabrication boundary — these values are UNKNOWN, not missing. There is no
 * founder name, no lesson byline and no authored publication date anywhere in
 * this repo. Do not "helpfully" fill one in: `author` is the Organization on
 * purpose (schema.org accepts it for Article and WebPage alike), and the only
 * Person we assert is a certificate holder, whose name the growth service
 * actually returns. Invented structured data is worse than an omitted
 * optional property. */

/**
 * Canonical one-shot definition — extractable, and the single string behind
 * the hero sub-headline, the homepage FAQ answer and SoftwareApplication.
 */
export const APP_DEFINITION =
  "HeroPips turns institutional-grade market data into decision intelligence — trade ideas scored for confidence and explained in plain reasoning — and executes them on your own broker (MT5, Binance, KuCoin and more) inside risk rules it enforces for you.";

const ORG_DESCRIPTION =
  "AI-powered financial intelligence ecosystem for retail traders: decision intelligence from an internal quant engine, guarded execution on the member's own broker, the HeroPips Learn academy and a member community.";

/* ---------- site-wide entities ---------- */

/** Publisher. Present in every page graph so `@id` references resolve locally. */
export function organizationNode(): SchemaNode {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "HeroPips",
    legalName: "HeroPips",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      "@id": LOGO_ID,
      url: `${SITE_URL}/icon-512.png`,
      width: 512,
      height: 512,
      caption: "HeroPips",
    },
    image: { "@id": LOGO_ID },
    description: ORG_DESCRIPTION,
    sameAs: ["https://x.com/heropips"],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "legal",
        email: "legal@heropips.com",
        url: `${SITE_URL}/legal/terms`,
        availableLanguage: "en",
      },
      {
        "@type": "ContactPoint",
        contactType: "privacy",
        email: "privacy@heropips.com",
        url: `${SITE_URL}/legal/privacy`,
        availableLanguage: "en",
      },
      {
        "@type": "ContactPoint",
        contactType: "billing support",
        email: "billing@heropips.com",
        url: `${SITE_URL}/pricing`,
        availableLanguage: "en",
      },
    ],
  };
}

export function webSiteNode(): SchemaNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: "HeroPips",
    url: SITE_URL,
    description: APP_DEFINITION,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** The product itself. Referenced as `itemOffered` wherever a seat is sold. */
export function softwareApplicationNode(): SchemaNode {
  return {
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: "HeroPips",
    url: SITE_URL,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description: APP_DEFINITION,
    image: SITE_IMAGE,
    featureList: [
      "Decision intelligence briefs with confidence score, model version and plain-language reasoning",
      "Guarded execution on your own broker — MT5, Binance, KuCoin",
      "Trade Guard: nine fail-closed risk controls checked on every order",
      "HeroPips Learn academy with a $10,000 simulated paper account",
    ],
    publisher: { "@id": ORG_ID },
    offers: foundingOfferNode(),
  };
}

/** The one thing purchasable today. Complete: price, currency, availability. */
export function foundingOfferNode(): SchemaNode {
  return {
    "@type": "Offer",
    "@id": FOUNDING_OFFER_ID,
    name: "HeroPips Founding Hero — lifetime Pro license",
    description:
      `One-time lifetime Pro entitlement to HeroPips: the decision-intelligence feed, guarded execution on your own broker and the full HeroPips Learn academy. ${LTD.SEAT_CAP} seats total, paid in crypto.`,
    price: String(LTD.PRICE_USD_DEFAULT),
    availability: "https://schema.org/LimitedAvailability",
    url: `${SITE_URL}/founding`,
    itemOffered: { "@id": APP_ID },
    seller: { "@id": ORG_ID },
  };
}

/** Organization + WebSite — the pair every page graph opens with. */
export function siteNodes(): SchemaNode[] {
  return [organizationNode(), webSiteNode()];
}

/* ---------- page-scoped entities ---------- */

export type WebPageInput = {
  /** Absolute canonical URL. */
  url: string;
  name: string;
  description: string;
  /** Emits a `breadcrumb` reference; `<Breadcrumbs>` declares the node itself. */
  breadcrumb?: readonly Crumb[];
  primaryImage?: string;
  datePublished?: string;
  dateModified?: string;
  /**
   * WebPage subtype — "CollectionPage", "ProfilePage", … Emitted ALONGSIDE
   * "WebPage" rather than instead of it: subclassing is implicit in
   * schema.org but not to every consumer, and a page-level WebPage node is
   * what BreadcrumbList and Article attach to.
   */
  type?: string;
};

export function webPageNode(p: WebPageInput): SchemaNode {
  return {
    "@type": p.type ? ["WebPage", p.type] : "WebPage",
    "@id": webPageId(p.url),
    url: p.url,
    name: p.name,
    description: p.description,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    primaryImageOfPage: { "@type": "ImageObject", url: p.primaryImage ?? SITE_IMAGE },
    datePublished: p.datePublished ?? CONTENT_PUBLISHED,
    dateModified: p.dateModified ?? CONTENT_MODIFIED,
    ...(p.breadcrumb && p.breadcrumb.length > 0
      ? { breadcrumb: { "@id": breadcrumbId(p.url) } }
      : {}),
  };
}

/**
 * BreadcrumbList. The trailing crumb carries no `item` — Google's guidance is
 * that the current page must not link to itself.
 */
export function breadcrumbNode(crumbs: readonly Crumb[]): SchemaNode {
  const last = crumbs.length - 1;
  return {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId(abs(crumbs[last].path)),
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(i === last ? {} : { item: abs(c.path) }),
    })),
  };
}

export function faqNode(p: {
  url: string;
  items: readonly { q: string; a: string }[];
}): SchemaNode {
  return {
    "@type": "FAQPage",
    "@id": faqId(p.url),
    isPartOf: { "@id": webPageId(p.url) },
    mainEntity: p.items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function howToNode(p: {
  url: string;
  name: string;
  description: string;
  steps: readonly { name: string; text: string }[];
  totalTime?: string;
}): SchemaNode {
  return {
    "@type": "HowTo",
    "@id": `${p.url}#howto`,
    name: p.name,
    description: p.description,
    ...(p.totalTime ? { totalTime: p.totalTime } : {}),
    step: p.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${p.url}#step-${i + 1}`,
    })),
  };
}

export type ListEntry = { name: string; url?: string; description?: string };

export function itemListNode(p: {
  url: string;
  fragment: string;
  name: string;
  description?: string;
  items: readonly ListEntry[];
}): SchemaNode {
  return {
    "@type": "ItemList",
    "@id": `${p.url}#${p.fragment}`,
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: p.items.length,
    itemListElement: p.items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.url ? { url: it.url } : {}),
      ...(it.description ? { description: it.description } : {}),
    })),
  };
}

/**
 * Long-form editorial node for the academy corpus. `author` is the
 * Organization — see the fabrication boundary above.
 */
export function articleNode(p: {
  url: string;
  headline: string;
  description: string;
  image?: string;
  articleSection?: string;
  timeRequired?: string;
  wordCount?: number;
  datePublished?: string;
  dateModified?: string;
}): SchemaNode {
  return {
    "@type": "Article",
    "@id": `${p.url}#article`,
    headline: p.headline,
    description: p.description,
    image: [p.image ?? SITE_IMAGE],
    inLanguage: "en",
    url: p.url,
    mainEntityOfPage: { "@id": webPageId(p.url) },
    datePublished: p.datePublished ?? CONTENT_PUBLISHED,
    dateModified: p.dateModified ?? CONTENT_MODIFIED,
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
    ...(p.articleSection ? { articleSection: p.articleSection } : {}),
    ...(p.timeRequired ? { timeRequired: p.timeRequired } : {}),
    ...(p.wordCount ? { wordCount: p.wordCount } : {}),
  };
}

/** Only ever built from a name the platform actually holds. */
export function personNode(p: { id: string; name: string }): SchemaNode {
  return { "@type": "Person", "@id": p.id, name: p.name };
}

/** Wraps page nodes into the single `@graph` document a page emits. */
export function pageGraph(nodes: readonly SchemaNode[]): Record<string, unknown> {
  return { "@context": "https://schema.org", "@graph": nodes };
}
