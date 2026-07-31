import { expect, test } from "@playwright/test";

/** Pre-launch alias → canonical destination (final URL after all hops). */
const ALIASES: ReadonlyArray<[source: string, destinationPath: string]> = [
  ["/platform", "/product"],
  ["/home", "/"],
  ["/login", "/app/login"],
  ["/signup", "/founding"],
  ["/docs", "/faq"],
  ["/refer", "/affiliates"],
  // Repositioning: signals → decision intelligence; waitlist → early access.
  ["/product/signals", "/product/intelligence"],
  ["/waitlist", "/early-access"],
  ["/waitlist/status", "/early-access/status"],
];

for (const [source, destination] of ALIASES) {
  test(`${source} redirects to ${destination}`, async ({ page }) => {
    const response = await page.goto(source);
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(destination);
  });
}

test("/app without a session lands on /app/login?next=%2Fapp", async ({ page }) => {
  await page.goto("/app");
  const url = new URL(page.url());
  expect(url.pathname).toBe("/app/login");
  expect(url.searchParams.get("next")).toBe("/app");
});
