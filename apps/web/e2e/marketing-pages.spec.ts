import { expect, test } from "@playwright/test";
import { MARKETING_ROUTES, noHscroll } from "./helpers";

/**
 * Structural invariants for every indexable marketing route:
 * 200, exactly one h1, canonical, meta description length, clean console,
 * no horizontal overflow. Copy is never asserted — marketing owns the words.
 */

for (const route of MARKETING_ROUTES) {
  test(`marketing page ${route}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      // Favicon probes 404 in dev and are not a product bug.
      if (msg.type() === "error" && !/favicon/i.test(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await test.step("responds 200", async () => {
      const response = await page.goto(route);
      expect(response, `no response for ${route}`).toBeTruthy();
      expect(response!.status()).toBe(200);
    });

    await test.step("exactly one h1", async () => {
      await expect(page.locator("h1")).toHaveCount(1);
    });

    await test.step("non-empty title", async () => {
      const title = await page.title();
      expect(title.trim().length).toBeGreaterThan(0);
    });

    await test.step("absolute canonical", async () => {
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);
      const href = await canonical.getAttribute("href");
      expect(href, `canonical on ${route}`).toMatch(/^https?:\/\//);
    });

    await test.step("meta description 50-160 chars", async () => {
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description, `meta description missing on ${route}`).toBeTruthy();
      expect(description!.length, `description length on ${route}: ${description!.length}`).toBeGreaterThanOrEqual(50);
      expect(description!.length, `description length on ${route}: ${description!.length}`).toBeLessThanOrEqual(160);
    });

    await test.step("no horizontal overflow", async () => {
      await noHscroll(page);
    });

    await test.step("zero console errors", async () => {
      expect(consoleErrors).toEqual([]);
    });
  });
}

test("titles are unique across all marketing routes", async ({ request }) => {
  test.slow();
  // Fetched concurrently: serially this is ~50 round trips, and against a dev
  // server each first hit also pays for its route compile.
  const pages = await Promise.all(
    MARKETING_ROUTES.map(async (route) => {
      const res = await request.get(route);
      expect(res.status(), `GET ${route}`).toBe(200);
      return { route, html: await res.text() };
    }),
  );

  const titles = new Map<string, string>();
  for (const { route, html } of pages) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    expect(match, `<title> missing on ${route}`).toBeTruthy();
    const title = match![1].trim();
    expect(title.length, `empty title on ${route}`).toBeGreaterThan(0);
    const dupe = titles.get(title);
    expect(dupe, `duplicate title "${title}" on ${route} and ${dupe}`).toBeUndefined();
    titles.set(title, route);
  }
  expect(titles.size).toBe(MARKETING_ROUTES.length);
});
