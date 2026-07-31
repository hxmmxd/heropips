import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { MARKETING_ROUTES, settleReveals } from "./helpers";

/**
 * WCAG 2.1 A + AA, every route, both themes, zero violations.
 *
 * `a11y-smoke.spec.ts` asserts a handful of hand-written invariants (one h1,
 * skip-link focus order, named controls). This is the automated sweep, and it
 * covers the rule families no hand-written assertion practically can —
 * colour-contrast, ARIA validity, landmark structure, form labelling, heading
 * order, region coverage.
 *
 * Both themes are exercised because `[data-theme="light"]` remaps every text
 * token, and a theme-invariant surface that pins its own background (the brand
 * poster in `brand.css`, the certificate in `academy.css`) can pass in one theme
 * and invert to near-invisible in the other — which is exactly what happened to
 * `.ac-cert`, at 1.11:1.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;

/** Platform routes worth scanning; the rest are variations on these shells. */
const MEMBER_ROUTES = ["/app", "/app/positions", "/app/history", "/app/intelligence", "/app/connect", "/app/settings", "/app/security", "/app/academy", "/app/chat", "/app/packages"] as const;

const report = (violations: Array<{ impact?: string | null; id: string; help: string; nodes: Array<{ target: unknown[] }> }>) =>
  violations
    .map((v) => `  [${v.impact}] ${v.id}: ${v.help}\n${v.nodes.map((n) => `      ${n.target.join(" ")}`).join("\n")}`)
    .join("\n");

for (const route of [...MARKETING_ROUTES, "/app/login", "/app/redeem"] as const) {
  test(`axe: ${route}`, async ({ page }) => {
    for (const theme of ["dark", "light"] as const) {
      await page.goto(route);
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
      // Reveal sections start at opacity 0; axe's color-contrast rule composites
      // that to 1:1 and flags every string inside them. Settle first.
      await settleReveals(page);
      const { violations } = await new AxeBuilder({ page }).withTags([...TAGS]).analyze();
      expect(violations, `${route} (${theme}) has ${violations.length} violation(s):\n${report(violations)}`).toEqual([]);
    }
  });
}

test.describe("member shell", () => {
  test.use({ storageState: path.join(__dirname, ".auth", "member.json") });

  for (const route of MEMBER_ROUTES) {
    test(`axe: ${route}`, async ({ page }) => {
      for (const theme of ["dark", "light"] as const) {
        await page.goto(route);
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await settleReveals(page);
        const { violations } = await new AxeBuilder({ page }).withTags([...TAGS]).analyze();
        expect(violations, `${route} (${theme}) has ${violations.length} violation(s):\n${report(violations)}`).toEqual([]);
      }
    });
  }
});

test("the open nav panel is accessible and Escape closes it", async ({ page }) => {
  await page.goto("/");
  await settleReveals(page);
  const trigger = page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Product" });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const { violations } = await new AxeBuilder({ page }).withTags([...TAGS]).analyze();
  expect(violations, `open nav panel:\n${report(violations)}`).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});
