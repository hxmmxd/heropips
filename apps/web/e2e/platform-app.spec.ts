import path from "node:path";
import { expect, test } from "@playwright/test";
import { ConnectionsRes, PnlSummaryRes } from "@heropips/contracts";
import { SAME_ORIGIN_HEADERS } from "./helpers";

/**
 * Member platform tour on a dedicated account (redeemed once by
 * platform-app.setup.ts). Serial: later tests depend on earlier state
 * (the closed trade feeds history + pnl assertions).
 */
test.describe.configure({ mode: "serial" });
test.use({ storageState: path.join(__dirname, ".auth", "member.json") });

test("dashboard: sidebar sections and Paper-badged tiles", async ({ page }) => {
  await page.goto("/app");

  await test.step("sidebar lists all 10 sections", async () => {
    const links = page.locator(".ap-sidebar .ap-nav-link");
    await expect(links).toHaveCount(10);
    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(hrefs).toEqual([
      "/app",
      "/app/intelligence",
      "/app/positions",
      "/app/history",
      "/app/academy",
      "/app/connect",
      "/app/chat",
      "/app/packages",
      "/app/security",
      "/app/settings",
    ]);
  });

  await test.step("equity hero and stat tiles are Paper-badged", async () => {
    await expect(page.locator(".ap-hero").getByText("Paper", { exact: true })).toBeVisible();
    await expect(page.locator(".ap-stats .ap-stat")).toHaveCount(4);
    expect(await page.locator(".ap-stats").getByText("Paper", { exact: true }).count()).toBeGreaterThanOrEqual(1);
  });
});

test("positions: order lifecycle down to flat", async ({ page }) => {
  await test.step("positions page renders empty state or table", async () => {
    await page.goto("/app/positions");
    await expect(page.locator(".ap-empty, .ap-table").first()).toBeVisible();
  });

  await test.step("place a deterministic EURUSD paper order via the BFF", async () => {
    const connectionsRes = await page.request.get("/api/app/connections");
    expect(connectionsRes.ok()).toBe(true);
    const { connections } = ConnectionsRes.parse(await connectionsRes.json());
    const paper = connections.find((c) => c.broker === "paper");
    expect(paper, "fresh member should have a seeded paper connection").toBeTruthy();

    const orderRes = await page.request.post("/api/app/orders", {
      headers: SAME_ORIGIN_HEADERS,
      data: {
        connection_id: paper!.id,
        symbol: "EURUSD",
        side: "buy",
        type: "market",
        qty: 0.01,
        idempotency_key: `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      },
    });
    expect(orderRes.ok(), await orderRes.text()).toBe(true);
  });

  await test.step("positions table shows the EURUSD row", async () => {
    await page.goto("/app/positions");
    const row = page.locator(".ap-table tbody tr", { hasText: "EURUSD" });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole("button", { name: "Close" })).toBeVisible();
  });

  await test.step("close via UI with confirm", async () => {
    const row = page.locator(".ap-table tbody tr", { hasText: "EURUSD" });
    await row.getByRole("button", { name: "Close" }).click();
    await row.getByRole("button", { name: "Confirm close" }).click();
    await expect(page.getByText("No open positions")).toBeVisible();
  });

  await test.step("pnl summary is coherent when flat: equity === balance", async () => {
    await expect
      .poll(async () => {
        const res = await page.request.get("/api/app/pnl/summary");
        const summary = PnlSummaryRes.parse(await res.json());
        return summary.equity_usd_minor - summary.balance_usd_minor;
      })
      .toBe(0);
  });
});

test("history: closed trade row with fees", async ({ page }) => {
  await page.goto("/app/history");
  await expect(page.getByRole("columnheader", { name: "Fees" })).toBeVisible();
  const row = page.locator(".ap-table tbody tr", { hasText: "EURUSD" }).first();
  await expect(row).toBeVisible();
  // Fees cell renders a formatted USD amount.
  await expect(row.locator("td").nth(6)).toHaveText(/\$\d/);
});

test("connect: add a Binance connection", async ({ page }) => {
  await page.goto("/app/connect");

  await test.step("add Binance with dummy keys", async () => {
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Add connection" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("radio", { name: /Binance/ }).click();
    await sheet.getByLabel("Label").fill("E2E Binance");
    await sheet.getByLabel("API key").fill("e2e_dummy_key_0123456789ABCDEF");
    await sheet.getByLabel("API secret").fill("e2e_dummy_secret_0123456789ABCDEF");
    await sheet.getByRole("button", { name: /Add Binance connection/ }).click();
    await expect(sheet).toHaveCount(0);
  });

  await test.step("row shows a pending status pill with detail", async () => {
    const row = page.locator(".ap-table tbody tr", { hasText: "E2E Binance" });
    await expect(row).toBeVisible();
    await expect(row.locator(".ap-pill--pending")).toHaveText("pending");
    const statusCell = row.locator("td[data-label='Status']");
    await expect(statusCell.locator(".ap-note")).not.toHaveText("");
  });
});

test("connect: remove the Binance connection", async ({ page }) => {
  await page.goto("/app/connect");
  const row = page.locator(".ap-table tbody tr", { hasText: "E2E Binance" });
  await row.getByRole("button", { name: "Remove" }).click();
  await row.getByRole("button", { name: "Confirm remove" }).click();
  await expect(page.locator(".ap-table tbody tr", { hasText: "E2E Binance" })).toHaveCount(0);
});

test("chat: posted message renders", async ({ page }) => {
  await page.goto("/app/chat");
  const body = `e2e ping ${Date.now()}`;
  await page.getByLabel("Message").fill(body);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".ap-chat-scroll").getByText(body)).toBeVisible();
});

test("security: current session and non-empty audit log", async ({ page }) => {
  await page.goto("/app/security");

  const sessions = page.locator('section[aria-label="Active sessions"]');
  await expect(sessions.locator("tbody tr")).not.toHaveCount(0);
  await expect(sessions.getByRole("button", { name: "Current" })).toBeVisible();

  const audit = page.locator('section[aria-label="Audit log"]');
  await expect(audit.locator("tbody tr")).not.toHaveCount(0);
});

test("packages: Founding Hero package with limits", async ({ page }) => {
  await page.goto("/app/packages");
  await expect(page.locator('section[aria-label="Your package"]')).toContainText("Founding Hero");
  const limitRows = page.locator(".ap-kv tbody tr");
  await expect(limitRows).toHaveCount(4);
  for (const cell of await limitRows.locator("td").all()) {
    await expect(cell).toHaveText(/^\d+$/);
  }
});

test("settings: display name change reflects on the member chip", async ({ page }) => {
  const newName = `E2E Hero ${Date.now() % 100_000}`;
  await page.goto("/app/settings");
  await page.getByLabel("Display name").fill(newName);
  await page.getByRole("button", { name: /Save name/ }).click();
  await expect(page.locator(".ap-form-ok")).toBeVisible();

  await page.goto("/app");
  await expect(page.locator(".ap-member-name")).toHaveText(newName);
});
