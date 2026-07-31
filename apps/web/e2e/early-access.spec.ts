import { expect, test, type Page } from "@playwright/test";
import { noHscroll, uniqueEmail } from "./helpers";

/**
 * Early access — the email-first, code-verified signup.
 *
 * Signup is two hops: POST /api/early-access/code emails a 6-digit code, then
 * POST /api/early-access/verify checks it and only then writes the queue entry.
 * The dev/staging stack pins the issued code (EARLY_ACCESS_DEV_CODE, default
 * 123456) and echoes it back as `dev_code`, which is what makes this flow
 * deterministic here without reading a mailbox.
 */

const DEV_CODE = process.env.E2E_EARLY_ACCESS_CODE ?? "123456";

async function enterCode(page: Page, code: string): Promise<void> {
  await page.locator("#ea-code").click();
  for (const digit of code) await page.keyboard.type(digit);
}

/** The claimed #N inside the signup card — the hero headline shows one too. */
function claimedPosition(page: Page) {
  return page.locator("#claim").locator("text=/^#\\d+$/").first();
}

test("email-first signup: code request, verification, claimed position", async ({ page }) => {
  const email = uniqueEmail();
  // networkidle: the wizard's submit handler only exists once the bundle hydrates.
  await page.goto("/early-access", { waitUntil: "networkidle" });

  // Step 1 — the email is the first thing asked for, and nothing else is shown yet.
  await expect(page.getByText(/step 1 of 3/i)).toBeVisible();
  await expect(page.locator("#ea-code")).toHaveCount(0);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: /send my code/i }).click();

  // Step 2 — the profile questions run while the code is in flight. Skippable.
  await expect(page.getByRole("heading", { name: /have you traded before\?/i })).toBeVisible();
  await page.getByRole("button", { name: "3+ years" }).click();
  await page.getByRole("button", { name: /skip to code/i }).click();

  // Step 3 — the code. Dev stacks surface it so no inbox is needed.
  const codeBoxes = page.locator('input[inputmode="numeric"]');
  await expect(codeBoxes).toHaveCount(6);
  await expect(page.getByText(new RegExp(`fixed code is\\s*${DEV_CODE}`))).toBeVisible();

  // A wrong code is refused, counts down, and claims nothing.
  await enterCode(page, "000000");
  await expect(page.getByText(/that code doesn't match\..*tries left/i)).toBeVisible();

  // The right code claims the place; the last digit submits without a tap.
  await enterCode(page, DEV_CODE);
  await expect(page.getByText("Place claimed")).toBeVisible();

  // Scoped to the card: the hero headline also renders a #N (the next free one).
  await expect(claimedPosition(page)).toBeVisible();

  // The answer given in step 2 rode along with the verification.
  await expect(page.getByText(/profile saved/i)).toBeVisible();

  // A referral code and a status link come back with the position.
  await expect(page.getByRole("button", { name: /copy code/i })).toBeVisible();
  const statusLink = page.getByRole("link", { name: /track your position/i });
  await expect(statusLink).toHaveAttribute("href", /\/early-access\/status\?token=/);
});

test("a returning address keeps its position, and the step is identical either way", async ({ page }) => {
  const email = uniqueEmail();

  await page.goto("/early-access", { waitUntil: "networkidle" });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: /send my code/i }).click();
  await page.getByRole("button", { name: /skip to code/i }).click();
  await enterCode(page, DEV_CODE);
  await expect(page.getByText("Place claimed")).toBeVisible();
  const first = await claimedPosition(page).innerText();

  // Same address again. The UI must NOT betray that it is already on the list:
  // /api/early-access/code is open to anyone, so a "welcome back" here would be
  // a membership oracle. Recognition waits until the code is proven.
  await page.goto("/early-access", { waitUntil: "networkidle" });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: /send my code/i }).click();
  await expect(page.getByRole("heading", { name: /have you traded before\?/i })).toBeVisible();
  await expect(page.getByText(/already on the list|welcome back/i)).toHaveCount(0);

  await page.getByRole("button", { name: /skip to code/i }).click();
  await enterCode(page, DEV_CODE);
  await expect(page.getByText("Welcome back")).toBeVisible();
  await expect(claimedPosition(page)).toHaveText(first);
});

test("the queue counters and both JSON-LD blocks are server-rendered", async ({ page, request }) => {
  const res = await request.get("/early-access");
  const html = await res.text();

  // Answer engines must not need JS: the copy is in the delivered HTML.
  expect(html).toContain("Only one of them runs out");
  expect(html).toContain("Before you hand over an email");
  expect(html.match(/<h1/g) ?? []).toHaveLength(1);

  await page.goto("/early-access");
  await expect(page.getByLabel("Live early access counters")).toBeVisible();
  // The headline offers the next free position, which is also the CTA label.
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  const next = heading.match(/#(\d[\d,]*)/)?.[1];
  expect(next, "the h1 names the open position").toBeTruthy();
  await expect(page.getByRole("button", { name: `Claim place #${next} →` })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: `Claim place #${next}.` })).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test(`early access has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/early-access", { waitUntil: "networkidle" });
    await noHscroll(page);
  });
}
