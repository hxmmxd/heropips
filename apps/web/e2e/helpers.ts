import { expect, type Page } from "@playwright/test";
import { PUBLIC_ROUTES } from "../lib/content";

/** One password for every e2e-created account (min 10 chars per RedeemAccessReq). */
export const E2E_PASSWORD = "e2e-hero-pass-1234";

/** Dev access code — valid against the identity service seed data. */
export const ACCESS_CODE = process.env.E2E_ACCESS_CODE ?? "hp_dev_alpha";

/**
 * Playwright's APIRequestContext is not a browser: it sends no `Origin` and
 * no `Sec-Fetch-Site`, so the BFF's CSRF guard (app/api/_lib/origin.ts) 403s
 * every mutating call. Spread this into any `request.post/patch/delete`
 * aimed at /api/** to make it look like the same-origin fetch it stands in
 * for. Page-driven flows need nothing — Chromium sets the header itself.
 */
export const SAME_ORIGIN_HEADERS = { "sec-fetch-site": "same-origin" } as const;

/**
 * Every indexable public route, derived from the one inventory that also
 * drives app/sitemap.ts, /llms.txt and /llms-full.txt. Hand-maintaining a
 * second list here meant the suite silently stopped covering new routes — it
 * listed 20 of 49, including only 3 of the 31 academy lessons.
 */
export const MARKETING_ROUTES: readonly string[] = PUBLIC_ROUTES.map((r) => r.path);

/** Fresh, collision-free e2e mailbox. */
export function uniqueEmail(): string {
  return `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@heropips.dev`;
}

/** Drive the /app/redeem form end to end; resolves once the dashboard is up. */
export async function redeem(
  page: Page,
  opts: { email: string; displayName?: string; password?: string; accessCode?: string },
): Promise<void> {
  await page.goto("/app/redeem");
  await page.getByLabel("Email").fill(opts.email);
  await page.getByLabel("Access code").fill(opts.accessCode ?? ACCESS_CODE);
  await page.getByLabel("Display name").fill(opts.displayName ?? "E2E Hero");
  await page.getByLabel("Password", { exact: true }).fill(opts.password ?? E2E_PASSWORD);
  await page.getByRole("button", { name: /activate/i }).click();
  await page.waitForURL(/\/app$/);
}

/** Drive the /app/login form; resolves on the dashboard. */
export async function loginAs(page: Page, email: string, password: string = E2E_PASSWORD): Promise<void> {
  await page.goto("/app/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/app(\?|$)/);
}

/** Asserts the document does not scroll horizontally at the current viewport. */
export async function noHscroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.scrollingElement ?? document.documentElement;
    return doc.scrollWidth - window.innerWidth;
  });
  expect(overflow, `horizontal overflow of ${overflow}px at ${page.url()}`).toBeLessThanOrEqual(1);
}

/** Extracts and parses every JSON-LD block in raw HTML (fails the test on invalid JSON). */
export function parseJsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    blocks.push(JSON.parse(match[1]));
  }
  return blocks;
}

/** Flattens JSON-LD blocks (incl. @graph) and returns every declared @type. */
export function jsonLdTypes(blocks: unknown[]): string[] {
  const types: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node && typeof node === "object") {
      const t = (node as Record<string, unknown>)["@type"];
      if (typeof t === "string") types.push(t);
      if (Array.isArray(t)) for (const x of t) if (typeof x === "string") types.push(x);
      const graph = (node as Record<string, unknown>)["@graph"];
      if (graph) visit(graph);
    }
  };
  blocks.forEach(visit);
  return types;
}

/**
 * Drives every scroll-reveal to its final state.
 *
 * Sections that fade in on scroll (landing.css `.hp-pipe-flow[data-anim]`, the
 * academy entry states) sit at `opacity: 0` until an IntersectionObserver
 * fires. Anything that measures colour before then — axe's color-contrast rule
 * included — reports those strings at 1:1, which is a visibility state and not
 * a contrast defect. Walk the page so every observer has fired, then let the
 * reveal transitions finish.
 */
export async function settleReveals(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const frame = () => {
      const { promise, resolve } = Promise.withResolvers<void>();
      requestAnimationFrame(() => setTimeout(resolve, 40));
      return promise;
    };
    const step = Math.max(1, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await frame();
    }
    window.scrollTo(0, 0);
    // Only FINITE animations. The brand art runs ambient loops with
    // `iteration-count: infinite` (hp3-float, hp3-breathe, hp3-flow, hp3-spin),
    // whose `finished` promise never settles — awaiting those hangs the page.
    const settling = document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
      .map((a) => a.finished.catch(() => {}));
    await Promise.all(settling);
  });
  await page.waitForTimeout(400);
}
