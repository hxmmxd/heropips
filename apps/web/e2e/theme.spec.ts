import path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Dark/light theming end to end: nav toggle, cookie persistence, the
 * settings segmented control, system-preference fallback, and clean
 * console output in light mode.
 */

test.describe("nav toggle", () => {
  // Deterministic start: OS prefers dark, no hp_theme cookie → dark.
  test.use({ colorScheme: "dark" });

  test("flips html[data-theme], changes body bg, persists across reload", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    const toggle = page.locator(".hp-desktop .hp-theme-toggle");
    await expect(toggle).toHaveAttribute("aria-label", "Switch to light theme");
    await toggle.click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(lightBg).not.toBe(darkBg);

    const cookie = (await page.context().cookies()).find((c) => c.name === "hp_theme");
    expect(cookie?.value).toBe("light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // theme-color meta tracks the applied theme — every remaining meta
    // (setTheme collapses media-gated pairs) must carry the dark color.
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect
      .poll(() =>
        page
          .locator('meta[name="theme-color"]')
          .evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("content")))]),
      )
      .toEqual(["#07080C"]);
  });
});

test.describe("system preference", () => {
  test.use({ colorScheme: "light" });

  test("without a cookie, first paint follows prefers-color-scheme", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(245, 246, 241)");
  });
});

test.describe("settings segmented control", () => {
  test.use({ storageState: path.join(__dirname, ".auth", "member.json"), colorScheme: "dark" });

  test("sets Light explicitly and persists", async ({ page }) => {
    await page.goto("/app/settings");
    const group = page.getByRole("radiogroup", { name: "Theme" });
    await expect(group.getByRole("radio")).toHaveCount(3);

    await group.getByRole("radio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const cookie = (await page.context().cookies()).find((c) => c.name === "hp_theme");
    expect(cookie?.value).toBe("light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(group.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");

    // Back to System: OS prefers dark in this fixture, so dark applies.
    await group.getByRole("radio", { name: "System" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("light mode console hygiene", () => {
  test.use({ colorScheme: "light" });

  for (const route of ["/", "/app/login"]) {
    test(`no console errors on ${route}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      expect(errors).toEqual([]);
    });
  }
});
