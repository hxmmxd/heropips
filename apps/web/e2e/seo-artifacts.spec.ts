import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "../lib/content";
import { jsonLdTypes, MARKETING_ROUTES, parseJsonLd } from "./helpers";

/** Pages sampled for JSON-LD validity. */
const JSONLD_SAMPLES = ["/", "/faq", "/pricing", "/product", "/product/intelligence", "/product/automation", "/product/trade-guard", "/academy/what-is-a-pip"] as const;

const PUBLIC_PATHS = PUBLIC_ROUTES.map((r) => r.path);

/**
 * Every AI crawler / answer engine robots.txt must name explicitly. Falling
 * through to `User-agent: *` is not enough — the named group IS the consent
 * signal, and it is what keeps them allowed the day `*` tightens.
 */
const AI_CRAWLERS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot",
  "ClaudeBot", "Claude-Web", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "CCBot", "Google-Extended", "Applebot", "Applebot-Extended",
  "Amazonbot", "meta-externalagent", "FacebookBot",
  "Bytespider", "cohere-ai", "Diffbot",
  "YouBot", "Timpibot", "Omgilibot", "Bingbot",
] as const;

/** The llms.txt list-item shape: `- [name](absolute-url): description`. */
const LINK_ITEM = /^- \[([^\]]+)\]\((\S+)\): (\S.*)$/;

type LlmsDoc = {
  title: string;
  summary: string;
  sections: { heading: string; links: { name: string; url: string; desc: string }[] }[];
};

/** Parses an llms.txt artifact per llmstxt.org, failing the test on any deviation. */
function parseLlmsTxt(body: string, path: string): LlmsDoc {
  const lines = body.split("\n");

  expect(lines[0], `${path}: first line must be the H1 title`).toMatch(/^# \S/);
  const title = lines[0].slice(2).trim();

  const summaryLine = lines.slice(1).find((l) => l.trim() !== "");
  expect(summaryLine, `${path}: needs a "> " blockquote summary after the H1`).toMatch(/^> \S/);
  const summary = (summaryLine ?? "").slice(2).trim();

  const sections: LlmsDoc["sections"] = [];
  for (const line of lines) {
    if (line.startsWith("## ")) {
      sections.push({ heading: line.slice(3).trim(), links: [] });
      continue;
    }
    if (!line.startsWith("- [")) continue;
    const m = LINK_ITEM.exec(line);
    expect(m, `${path}: malformed llms.txt list item: ${line}`).not.toBeNull();
    expect(sections.length, `${path}: list item before any "## " section: ${line}`).toBeGreaterThan(0);
    const [, name, url, desc] = m as RegExpExecArray;
    sections[sections.length - 1].links.push({ name, url, desc });
  }

  expect(sections.length, `${path}: no "## " sections`).toBeGreaterThan(0);
  return { title, summary, sections };
}

test.describe("sitemap.xml", () => {
  test("is valid XML listing exactly the PUBLIC_ROUTES surface", async ({ request, page }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();

    const parseError = await test.step("parses as XML", async () => {
      // Browser XML parser is the arbiter of validity.
      return page.evaluate((src) => {
        const doc = new DOMParser().parseFromString(src, "application/xml");
        return doc.querySelector("parsererror")?.textContent ?? null;
      }, xml);
    });
    expect(parseError).toBeNull();

    const locs = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((m) => m[1].trim());
    expect(locs.length).toBeGreaterThan(0);

    await test.step("every URL is absolute", async () => {
      for (const loc of locs) expect(loc, `sitemap loc ${loc}`).toMatch(/^https?:\/\//);
    });

    const paths = locs.map((loc) => {
      const p = new URL(loc).pathname;
      return p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p;
    });

    await test.step("includes every marketing route", async () => {
      for (const route of MARKETING_ROUTES) {
        expect(paths, `sitemap missing ${route}`).toContain(route);
      }
    });

    await test.step("is exactly PUBLIC_ROUTES, no duplicates", async () => {
      expect([...paths].sort()).toEqual([...PUBLIC_PATHS].sort());
    });

    await test.step("excludes /app, /api and status pages", async () => {
      for (const p of paths) {
        expect(p, `private path leaked into sitemap: ${p}`).not.toMatch(/^\/(app|api)(\/|$)/);
        expect(p, `status page leaked into sitemap: ${p}`).not.toMatch(/\/status$/);
      }
    });

    await test.step("every entry carries lastModified, changefreq and priority", async () => {
      const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
      expect(urls.length).toBe(PUBLIC_ROUTES.length);
      for (const entry of urls) {
        expect(entry).toContain("<lastmod>");
        expect(entry).toContain("<changefreq>");
        expect(entry).toContain("<priority>");
      }
    });
  });
});

test.describe("robots.txt", () => {
  test("names every AI crawler, references the sitemap and disallows /app + /api", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/sitemap:\s*https?:\/\/\S+\/sitemap\.xml/i);
    expect(body).toMatch(/disallow:\s*\/app\b/i);
    expect(body).toMatch(/disallow:\s*\/api\b/i);

    const agents = [...body.matchAll(/^user-agent:\s*(\S+)\s*$/gim)].map((m) => m[1].toLowerCase());
    for (const crawler of AI_CRAWLERS) {
      expect(agents, `robots.txt does not name ${crawler}`).toContain(crawler.toLowerCase());
    }
  });
});

test.describe("llms.txt", () => {
  for (const path of ["/llms.txt", "/llms-full.txt"]) {
    test(`${path} is spec-shaped and covers every public route`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"] ?? "").toMatch(/text\/plain/);
      const body = await res.text();

      const doc = parseLlmsTxt(body, path);
      expect(doc.title).toContain("HeroPips");
      expect(doc.summary.length, `${path}: blockquote summary is too thin`).toBeGreaterThan(80);

      // Relative links are useless to an LLM that fetched this file out of context.
      expect(body, `${path}: relative markdown link`).not.toMatch(/\]\(\/(?!\/)/);

      const links = doc.sections.flatMap((s) => s.links);
      for (const { url } of links) {
        expect(url, `${path}: non-absolute link ${url}`).toMatch(/^https?:\/\//);
      }

      const linked = new Set(links.map((l) => new URL(l.url).pathname));
      for (const route of PUBLIC_PATHS) {
        expect([...linked], `${path} is missing ${route}`).toContain(route);
      }
    });
  }

  test("every link in both artifacts resolves 200", async ({ request }) => {
    test.setTimeout(180_000);
    const urls = new Set<string>();
    for (const path of ["/llms.txt", "/llms-full.txt"]) {
      const body = await (await request.get(path)).text();
      for (const line of body.split("\n")) {
        const m = LINK_ITEM.exec(line);
        if (m) urls.add(new URL(m[2]).pathname);
      }
    }
    expect(urls.size).toBeGreaterThanOrEqual(PUBLIC_ROUTES.length);

    // Resolved against baseURL: the artifacts carry production-absolute URLs.
    for (const path of urls) {
      expect((await request.get(path)).status(), `dead llms.txt link: ${path}`).toBe(200);
    }
  });
});

test.describe("manifest", () => {
  test("is installable and ships maskable icons at 192 and 512", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = (await res.json()) as Record<string, unknown> & {
      icons: { src: string; sizes?: string; purpose?: string }[];
    };

    for (const field of ["name", "short_name", "description", "start_url", "scope", "display", "theme_color", "background_color", "orientation", "categories", "icons"]) {
      expect(manifest[field], `manifest.${field} is missing`).toBeTruthy();
    }

    const { icons } = manifest;
    for (const size of ["192x192", "512x512"]) {
      expect(
        icons.some((i) => i.sizes === size && i.purpose === "maskable"),
        `manifest has no maskable icon at ${size}`,
      ).toBe(true);
      expect(
        icons.some((i) => i.sizes === size && i.purpose === "any"),
        `manifest has no "any" icon at ${size}`,
      ).toBe(true);
    }

    for (const icon of icons) {
      expect((await request.get(icon.src)).status(), `manifest icon 404: ${icon.src}`).toBe(200);
    }
  });
});

test.describe("JSON-LD", () => {
  for (const route of JSONLD_SAMPLES) {
    test(`every ld+json block on ${route} parses and declares @context`, async ({ request }) => {
      const html = await (await request.get(route)).text();
      const blocks = parseJsonLd(html); // JSON.parse throws -> test fails
      expect(blocks.length, `no JSON-LD found on ${route}`).toBeGreaterThan(0);
      for (const block of blocks) {
        const roots = Array.isArray(block) ? block : [block];
        for (const root of roots) {
          expect(root, `non-object JSON-LD root on ${route}`).toBeInstanceOf(Object);
          expect((root as Record<string, unknown>)["@context"], `@context missing on ${route}`).toBeTruthy();
        }
      }
    });

    test(`no aggregateRating on ${route}`, async ({ request }) => {
      // Fabricated ratings are a hard product prohibition (and a Google penalty).
      const html = await (await request.get(route)).text();
      const serialized = JSON.stringify(parseJsonLd(html));
      expect(serialized).not.toContain("aggregateRating");
    });
  }

  test("/ declares SoftwareApplication + Organization + WebSite", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const types = jsonLdTypes(parseJsonLd(html));
    expect(types).toContain("SoftwareApplication");
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
  });

  test("/faq declares FAQPage", async ({ request }) => {
    const html = await (await request.get("/faq")).text();
    expect(jsonLdTypes(parseJsonLd(html))).toContain("FAQPage");
  });
});
