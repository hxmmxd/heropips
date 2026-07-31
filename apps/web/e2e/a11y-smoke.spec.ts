import { expect, test, type Locator } from "@playwright/test";

/** Every element of `role` in scope must expose a non-empty accessible name. */
async function expectAllNamed(scope: Locator, role: "link" | "button"): Promise<void> {
  const total = await scope.getByRole(role).count();
  const named = await scope.getByRole(role, { name: /\S/ }).count();
  expect(named, `${total - named} unnamed ${role}(s)`).toBe(total);
}

test("a11y smoke on /", async ({ page }) => {
  await page.goto("/");

  await test.step("exactly one h1", async () => {
    await expect(page.locator("h1")).toHaveCount(1);
  });

  await test.step("skip link is the first focusable element", async () => {
    await page.keyboard.press("Tab");
    await expect(page.locator('a[href="#main"]').first()).toBeFocused();
  });

  await test.step("all images carry an alt attribute", async () => {
    const missing = await page.locator("img").evaluateAll((imgs) => imgs.filter((img) => !img.hasAttribute("alt")).length);
    expect(missing).toBe(0);
  });

  await test.step("primary nav links and CTAs have accessible names", async () => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expectAllNamed(nav, "link");
    await expectAllNamed(nav, "button");
    await expectAllNamed(page.locator("header").first(), "link");
  });
});

test("a11y smoke on /app/login", async ({ page }) => {
  await page.goto("/app/login");

  await test.step("exactly one h1", async () => {
    await expect(page.locator("h1")).toHaveCount(1);
  });

  await test.step("all images carry an alt attribute", async () => {
    const missing = await page.locator("img").evaluateAll((imgs) => imgs.filter((img) => !img.hasAttribute("alt")).length);
    expect(missing).toBe(0);
  });

  await test.step("buttons and links have accessible names", async () => {
    await expectAllNamed(page.locator("body"), "button");
    await expectAllNamed(page.locator("body"), "link");
  });
});
