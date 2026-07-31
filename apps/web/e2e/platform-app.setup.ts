import path from "node:path";
import { expect, test as setup } from "@playwright/test";
import { CheckoutRes, OrderStatusRes } from "@heropips/contracts";
import { E2E_PASSWORD, SAME_ORIGIN_HEADERS, uniqueEmail } from "./helpers";

/**
 * Mints a genuine Founding member for platform-app.spec:
 * checkout reserves a seat, the NOWPayments mock simulates the crypto
 * payment (signed IPNs → billing), then the paid order id is redeemed.
 * A founding member is required — live (Binance) connection slots are
 * enforced against the founding entitlement.
 */
setup("redeem a founding storage-state member", async ({ request }) => {
  const email = uniqueEmail();

  const checkoutRes = await request.post("/api/founding/checkout", { data: { email }, headers: SAME_ORIGIN_HEADERS });
  expect(checkoutRes.ok(), await checkoutRes.text()).toBe(true);
  const checkout = CheckoutRes.parse(await checkoutRes.json());

  const invoice = new URL(checkout.invoice_url);
  const pay = await request.post(`${invoice.origin}/simulate/${invoice.pathname.split("/").pop()}/pay`, {
    data: {},
  });
  expect(pay.ok(), `NOWPayments mock unreachable at ${invoice.origin}: ${await pay.text()}`).toBe(true);

  // IPNs land asynchronously (waiting → … → finished). Gate on the SEAT, not
  // the payment: billing verifies a redeem from `confirmed` onward, but the
  // seat only flips to `granted` on `finished`, so polling for `granted` is
  // the deterministic point at which the whole chain has settled.
  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/founding/status?token=${encodeURIComponent(checkout.status_token)}`);
        return OrderStatusRes.parse(await res.json()).seat_state;
      },
      { timeout: 30_000 },
    )
    .toBe("granted");

  const redeem = await request.post("/api/app/auth/redeem", {
    headers: SAME_ORIGIN_HEADERS,
    data: {
      email,
      access_code: checkout.order_id,
      display_name: "E2E Hero",
      password: E2E_PASSWORD,
    },
  });
  if (!redeem.ok()) {
    throw new Error(`redeem failed (${redeem.status()}): ${await redeem.text()}`);
  }
  await request.storageState({ path: path.join(__dirname, ".auth", "member.json") });
});
