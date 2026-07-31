import { expect, test, type Page } from "@playwright/test";

/**
 * Marketing navigation behavior.
 * Desktop mega-panel tests run on the desktop project; the burger/overlay
 * tests run on the mobile project (nav switches at 920px).
 *
 * Closed panels assert `toBeHidden()`, never `toHaveCount(0)`: the panel and
 * mobile-sheet markup is rendered unconditionally and closed with the
 * `hidden` attribute, so the primary nav contributes crawlable internal links
 * to the server HTML. `toBeHidden()` is also the stronger assertion — it is
 * what the user and AT actually experience, and it still passes if the node
 * is detached.
 */

function primaryNav(page: Page) {
  return page.getByRole("navigation", { name: "Primary" });
}

test.describe("desktop mega nav", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 920, "desktop-only nav");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Product trigger opens the panel with visible links", async ({ page }) => {
    const trigger = primaryNav(page).getByRole("button", { name: "Product" });
    await trigger.hover();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator("#hp-mega-panel-product");
    await expect(panel).toBeVisible();
    const links = panel.getByRole("link");
    expect(await links.count()).toBeGreaterThan(3);
    await expect(links.first()).toBeVisible();
  });

  test("Escape closes the panel and returns focus to the trigger", async ({ page }) => {
    const trigger = primaryNav(page).getByRole("button", { name: "Product" });
    await trigger.hover();
    await expect(page.locator("#hp-mega-panel-product")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#hp-mega-panel-product")).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
  });

  test("clicking outside closes the panel", async ({ page }) => {
    const trigger = primaryNav(page).getByRole("button", { name: "Product" });
    await trigger.hover();
    await expect(page.locator("#hp-mega-panel-product")).toBeVisible();
    // Click far below the sticky header, outside the trigger/panel pair.
    await page.mouse.click(10, 860);
    await expect(page.locator("#hp-mega-panel-product")).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("Academy trigger swaps panels", async ({ page }) => {
    const product = primaryNav(page).getByRole("button", { name: "Product" });
    const academy = primaryNav(page).getByRole("button", { name: "Academy" });
    await product.hover();
    await expect(page.locator("#hp-mega-panel-product")).toBeVisible();
    await academy.hover();
    await expect(page.locator("#hp-mega-panel-academy")).toBeVisible();
    await expect(page.locator("#hp-mega-panel-product")).toBeHidden();
    await expect(academy).toHaveAttribute("aria-expanded", "true");
    await expect(product).toHaveAttribute("aria-expanded", "false");
  });

  test("a panel link navigates", async ({ page }) => {
    await primaryNav(page).getByRole("button", { name: "Product" }).hover();
    const panel = page.locator("#hp-mega-panel-product");
    await expect(panel).toBeVisible();
    await panel.locator('a[href="/product/trade-guard"]').first().click();
    await page.waitForURL(/\/product\/trade-guard$/);
    await expect(page.locator("#hp-mega-panel-product")).toBeHidden();
  });
});

test.describe("mobile nav", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1440) > 920, "mobile-only nav");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("burger opens the overlay and locks body scroll", async ({ page }) => {
    // The burger's accessible name flips Open menu → Close menu; target it structurally.
    const burger = page.locator('button[aria-controls="hp-mobile-menu"]');
    await burger.tap();
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    const menu = page.locator("#hp-mobile-menu");
    await expect(menu).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .toBe("hidden");
  });

  test("tapping a link navigates and closes the overlay", async ({ page }) => {
    await page.locator('button[aria-controls="hp-mobile-menu"]').tap();
    const menu = page.locator("#hp-mobile-menu");
    await expect(menu).toBeVisible();
    await menu.locator('a[href="/product/trade-guard"]').first().tap();
    await page.waitForURL(/\/product\/trade-guard$/);
    await expect(page.locator("#hp-mobile-menu")).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toBe("hidden");
  });
});
