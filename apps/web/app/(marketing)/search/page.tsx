/* =========================================================================
 * Site search — /search?q=…
 *
 * The WebSite node advertises a SearchAction pointing here
 * (components/seo/graph.ts). That is a promise to crawlers and to anyone
 * following it, so the endpoint is real: a server-rendered filter over the
 * public route inventory and the canonical FAQ. No index, no dependencies,
 * no client JS beyond the form's native submit.
 * ======================================================================= */

import type { Metadata } from "next";
import Link from "next/link";
import { Card, Eyebrow, Kicker } from "@heropips/ui";
import { Breadcrumbs } from "@/components/seo/JsonLd";
import type { Crumb } from "@/components/seo/graph";
import { FAQ, PUBLIC_ROUTES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the HeroPips product pages, academy lessons, legal terms and FAQ.",
  /* Results pages are thin and combinatorial — never indexable, always
     crawlable onward so the links they surface still carry weight. */
  robots: { index: false, follow: true },
};

const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Search", path: "/search" },
];

type Hit = { path: string; title: string; summary: string; group: string };

/** Case-insensitive term match across title + summary; all terms must hit. */
function search(query: string): Hit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const pool: Hit[] = [
    ...PUBLIC_ROUTES.map((r) => ({
      path: r.path,
      title: r.title,
      summary: r.summary,
      group: r.group,
    })),
    ...FAQ.map((f) => ({
      path: `/faq#${f.id}`,
      title: f.q,
      summary: f.a,
      group: "FAQ",
    })),
  ];

  return pool.filter((h) => {
    const hay = `${h.title} ${h.summary}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (raw ?? "").slice(0, 120).trim();
  const hits = query ? search(query) : [];

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <Breadcrumbs items={CRUMBS} />
        <Eyebrow style={{ marginBottom: "var(--sp-4)" }}>Search</Eyebrow>
        <h1 style={{ marginBottom: "var(--sp-5)" }}>Search HeroPips</h1>

        <form
          role="search"
          action="/search"
          method="get"
          style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", marginBottom: "var(--sp-8)" }}
        >
          <label htmlFor="q" className="sr-only">
            Search terms
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="risk sizing, brokers, refunds…"
            style={{
              flex: "1 1 320px",
              minHeight: "var(--ctl-md)",
              padding: "0 var(--sp-3)",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border-2)",
              background: "var(--surface-1)",
              color: "var(--text-hi)",
            }}
          />
          <button
            type="submit"
            style={{
              minHeight: "var(--ctl-md)",
              padding: "0 var(--sp-5)",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border-2)",
              background: "var(--surface-2)",
              color: "var(--text-hi)",
              fontWeight: "var(--weight-semibold)",
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>

        {query === "" ? (
          <p style={{ color: "var(--text-mid)" }}>
            Type a term above, or start from the{" "}
            <Link href="/product">product overview</Link>, the{" "}
            <Link href="/academy">academy</Link> or the <Link href="/faq">FAQ</Link>.
          </p>
        ) : (
          <>
            <p style={{ color: "var(--text-mid)", marginBottom: "var(--sp-6)" }}>
              {hits.length} {hits.length === 1 ? "result" : "results"} for{" "}
              <strong style={{ color: "var(--text-hi)" }}>{query}</strong>
            </p>
            <ul style={{ listStyle: "none", display: "grid", gap: "var(--sp-3)", margin: 0, padding: 0 }}>
              {hits.map((h) => (
                <li key={h.path}>
                  <Link href={h.path} className="hp-card-link">
                    <Card
                      style={{
                        padding: "var(--sp-5)",
                        display: "grid",
                        gap: "var(--sp-2)",
                        alignContent: "start",
                      }}
                    >
                      <Kicker>{h.group}</Kicker>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: "var(--weight-semibold)",
                          color: "var(--text-hi)",
                        }}
                      >
                        {h.title}
                      </span>
                      <span
                        style={{
                          color: "var(--text-mid)",
                          fontSize: "var(--text-sm)",
                          lineHeight: "var(--leading-body)",
                        }}
                      >
                        {h.summary}
                      </span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
