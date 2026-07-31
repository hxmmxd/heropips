import { expect, test } from "@playwright/test";
import { SAME_ORIGIN_HEADERS, uniqueEmail } from "./helpers";

/**
 * Brand loader family — deterministic pending-state checks.
 *
 * (a) login submit  → Button busy: aria-busy + inline svg spinner while the
 *     delayed POST /api/app/auth/login is in flight.
 * (b) early access → same pattern against POST /api/early-access/code, the
 *     first async hop of the signup wizard.
 * (c) LevelLoader   → a real founding order in payment_status "waiting":
 *     OrderStatusPanel renders the branded level-up loader unconditionally
 *     until the payment confirms, so a fresh checkout gives a deterministic,
 *     interception-free mount.
 *
 * Choice notes for (c) — candidates considered and rejected:
 *   - login → redeem client transition + delayed RSC fetch: Next only streams
 *     a loading.tsx boundary when the destination suspends server-side; the
 *     redeem page renders in a single flight chunk, so the (auth) loader never
 *     paints no matter how long the fetch is held (verified empirically).
 *   - delay GET /api/founding/seats on /founding: the first seats snapshot is
 *     fetched server-side (billing.get in the page), so page.route never sees
 *     it; the SeatsMeter skeleton→bar swap is data-level, not the LevelLoader.
 *   - /early-access/status?token=bogus: the status API call is also server-side
 *     (growth.get) — uninterceptable from the browser.
 * A real "waiting" order is the only variant with zero timing dependence:
 * the loader is part of the server-rendered page until the payment settles.
 */

/** Holds a request open long enough for the pending UI to be asserted. */
function delayed(ms: number) {
  return async (route: import("@playwright/test").Route) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  };
}

test("login submit shows a busy button with spinner", async ({ page }) => {
  await page.goto("/app/login");
  await page.route("**/api/app/auth/login", delayed(1500));

  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: /sign in/i }).click();

  const busyButton = page.locator('button[aria-busy="true"]');
  await expect(busyButton).toBeVisible();
  await expect(busyButton).toContainText("Signing in…");
  await expect(busyButton.locator("svg.hp-spinner")).toBeVisible();
});

test("early access code request shows a busy button with spinner", async ({ page }) => {
  // networkidle, not load: the wizard's submit handler only exists once the
  // client bundle hydrates. Clicking earlier performs a native form submit
  // (same-URL navigation, no fetch) and the busy state never paints.
  await page.goto("/early-access", { waitUntil: "networkidle" });
  await page.route("**/api/early-access/code", delayed(1500));

  // Exact: the page also has an FAQ section whose name contains "email".
  await page.getByLabel("Email", { exact: true }).fill(uniqueEmail());

  // Step 1 of 3 is the email; requesting the code is the first async hop.
  const codeRequest = page.waitForRequest("**/api/early-access/code");
  await page.getByRole("button", { name: /send my code/i }).click();
  await codeRequest; // fails loudly if the click ever regresses to a native submit

  const busyButton = page.locator('button[aria-busy="true"]');
  await expect(busyButton).toBeVisible();
  await expect(busyButton).toContainText("Sending code…");
  await expect(busyButton.locator("svg.hp-spinner")).toBeVisible();
});

test("pending founding order shows the LevelLoader", async ({ page, request }) => {
  // Fresh checkout → order starts in payment_status "waiting" (mock invoice).
  const res = await request.post("/api/founding/checkout", {
    headers: SAME_ORIGIN_HEADERS,
    data: { email: uniqueEmail() },
  });
  expect(res.ok(), "checkout must succeed (seats available in dev stack)").toBeTruthy();
  const { status_token } = (await res.json()) as { status_token: string };

  await page.goto(`/founding/status?token=${encodeURIComponent(status_token)}`);

  const loader = page.getByRole("status", { name: "Waiting for network confirmation…" });
  await expect(loader).toBeVisible();
  await expect(loader.locator("path.hp-level-chev")).toHaveCount(3);
  await expect(loader.locator(".hp-level-label")).toHaveText("Waiting for network confirmation…");
});
