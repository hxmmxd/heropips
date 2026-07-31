import { expect, test } from "@playwright/test";
import { MARKETING_ROUTES } from "./helpers";

/**
 * Internal link integrity. Crawls every anchor reachable from the public
 * surface and asserts it resolves — a 404 behind a footer or nav link is
 * invisible in review and costs crawl budget plus PageRank.
 *
 * Fetched over `request`, not driven through a page: the crawl covers ~50
 * routes, and a browser navigation per route also pulls the whole asset graph
 * and (against a dev server) waits on a first compile, which blew the default
 * timeout. The server-rendered HTML is the correct input anyway — an anchor a
 * crawler cannot see in the response body does not count as an internal link.
 *
 * Scope is deliberately internal-only: third-party availability is not this
 * suite's job and would make it flaky.
 */
test("no broken internal links across the public surface", async ({ request }) => {
  test.slow();
  // Fetched concurrently: ~50 routes serially is slow enough to blow the budget
  // on its own, and against a dev server each first hit also pays for a compile.
  const pages = await Promise.all(
    MARKETING_ROUTES.map(async (route) => {
      const res = await request.get(route);
      expect(res.status(), `${route} did not render`).toBe(200);
      return { route, html: await res.text() };
    }),
  );

  // Dynamic crawl set, keyed by path → the page that linked it, so a failure
  // names the referrer and not just the dead URL.
  const referrers = new Map<string, string>();
  for (const { route, html } of pages) {
    for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      // Same-origin paths only. Skip anchors, mail/tel and absolute externals.
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const clean = href.split("#")[0] || "/";
      if (!referrers.has(clean)) referrers.set(clean, route);
    }
  }

  // Guard against the crawl silently finding nothing.
  expect(referrers.size, "crawl found almost no internal links").toBeGreaterThan(20);

  const checked = await Promise.all(
    [...referrers].map(async ([href, from]) => {
      const res = await request.get(href, { maxRedirects: 5 });
      return res.status() >= 400 ? `  ${res.status()} ${href}  (linked from ${from})` : null;
    }),
  );
  const broken = checked.filter((x): x is string => x !== null);
  expect(broken, `${broken.length} broken internal link(s):\n${broken.join("\n")}`).toEqual([]);
});

test("every sitemap URL resolves and is not a redirect", async ({ request }) => {
  test.slow();
  const xml = await (await request.get("/sitemap.xml")).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs.length, "sitemap contains no <loc> entries").toBeGreaterThan(20);

  const results = await Promise.all(
    locs.map(async (loc) => {
      const pathname = new URL(loc).pathname;
      // A sitemap must list canonical, final URLs — never a redirect hop.
      const res = await request.get(pathname, { maxRedirects: 0 });
      return res.status() === 200 ? null : `  ${res.status()} ${pathname}`;
    }),
  );
  const bad = results.filter((x): x is string => x !== null);
  expect(bad, `${bad.length} sitemap URL(s) are not a direct 200:\n${bad.join("\n")}`).toEqual([]);
});
