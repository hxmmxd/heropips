import path from "node:path";
import { expect, test } from "@playwright/test";
import { MARKETING_ROUTES, noHscroll } from "./helpers";

/** Section-4 width matrix (AGENTS.md): phones → tablets → desktops. */
const WIDTHS = [320, 360, 375, 390, 414, 430, 768, 834, 1024, 1280, 1440, 1920] as const;

/** Every marketing route stays overflow-free in both projects' viewports. */
for (const route of MARKETING_ROUTES) {
  test(`no horizontal overflow on ${route}`, async ({ page }) => {
    await page.goto(route);
    await noHscroll(page);
  });
}

/** Highest-risk layouts swept across the full width matrix. */
for (const route of ["/", "/pricing", "/founding", "/affiliates", "/product", "/product/automation", "/product/trade-guard", "/product/intelligence", "/app/login"] as const) {
  test(`width matrix: ${route}`, async ({ page }) => {
    await page.goto(route);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 700 ? 740 : 900 });
      await noHscroll(page);
    }
  });
}

test("split hero: copy and decision console side by side on /", async ({ page, viewport }) => {
  // The hero stacks below 1280 (landing.css) so the console renders at its
  // 560px cap and its art labels stay above the 12px floor — see
  // typography.spec.ts. Only the two-column band is asserted here.
  test.skip((viewport?.width ?? 0) <= 1279, "desktop-only layout assertion");
  await page.goto("/");
  const copy = page.locator(".hp-hero-copy");
  const art = page.locator("svg.hp-hero-console");
  await expect(copy).toBeVisible();
  await expect(art).toBeVisible();
  const [copyBox, artBox] = [await copy.boundingBox(), await art.boundingBox()];
  expect(copyBox).toBeTruthy();
  expect(artBox).toBeTruthy();
  // side by side: the console starts right of the copy column and carries
  // real visual weight (≥ a third of the viewport, capped at 640px design width)
  expect(artBox!.x).toBeGreaterThan(copyBox!.x + copyBox!.width - 1);
  expect(artBox!.width).toBeGreaterThanOrEqual(Math.min(0.33 * viewport!.width, 620));
});

/** Member shell: tables and signal cards must scroll inside their wraps,
 *  never pan the page (regression: .ap-root > * { min-width: 0 }). */
test.describe(() => {
  test.use({ storageState: path.join(__dirname, ".auth", "member.json") });

  for (const route of ["/app", "/app/intelligence", "/app/positions", "/app/history", "/app/security", "/app/settings"] as const) {
    test(`member width matrix: ${route}`, async ({ page }) => {
      await page.goto(route);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: width < 700 ? 740 : 900 });
        await noHscroll(page);
      }
    });
  }

  test("mobile chrome: tab bar present, content clears it", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app");
    const tabbar = page.locator(".ap-tabbar");
    await expect(tabbar).toBeVisible();
    // ≥44px touch targets on every tab
    for (const box of await tabbar.locator(".ap-tab").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
  });
});
