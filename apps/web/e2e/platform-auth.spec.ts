import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, loginAs, redeem, uniqueEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

/**
 * Full auth lifecycle for one fresh member. Steps share a single page/context
 * so the session cookie carries across phases exactly like a real user.
 */
test("redeem → dashboard SSR → logout → login → bad password → duplicate redeem", async ({ page, context }) => {
  const email = uniqueEmail();

  await test.step("redeem a fresh access code lands on the dashboard", async () => {
    await redeem(page, { email, displayName: "E2E Hero" });
    // Fresh paper account: $10,000.00 equity is a product invariant.
    await expect(page.locator(".ap-hero-equity")).toHaveText("$10,000.00");
  });

  await test.step("equity is server-rendered in the initial HTML", async () => {
    // Direct document request with the session cookie — no client JS involved.
    const res = await page.request.get("/app");
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("$10,000.00");
  });

  await test.step("logout returns to the login screen", async () => {
    await page.goto("/app/settings");
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL(/\/app\/login/);
    // Session is gone: /app now bounces back to login.
    await page.goto("/app");
    await page.waitForURL(/\/app\/login/);
  });

  await test.step("login again with the same credentials works", async () => {
    await loginAs(page, email);
    await expect(page.locator(".ap-hero-equity")).toBeVisible();
  });

  await test.step("wrong password shows an error and stays on login", async () => {
    await context.clearCookies();
    await page.goto("/app/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("definitely-wrong-pass");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/app/login");
  });

  await test.step("duplicate-email redeem shows an error", async () => {
    await page.goto("/app/redeem");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Access code").fill(process.env.E2E_ACCESS_CODE ?? "hp_dev_alpha");
    await page.getByLabel("Display name").fill("E2E Hero");
    await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
    await page.getByRole("button", { name: /activate/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/app/redeem");
  });
});
