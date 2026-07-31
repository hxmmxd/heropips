import type { Metadata } from "next";
import { socialMeta } from "@/components/seo/meta";
import { LegalShell } from "../LegalShell";

const TITLE = "Refund Policy";
const DESCRIPTION =
  "HeroPips refunds: 14-day refund window on Founding Hero paid in USDT equivalent, subscription cancellation rules, and how to request a refund.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/legal/refunds" },
  ...socialMeta(TITLE, DESCRIPTION, "/legal/refunds"),
};

export default function RefundsPage() {
  return (
    <LegalShell
      slug="refunds"
      description={DESCRIPTION}
      title="Refund Policy"
      intro="Crypto payments are irreversible on-chain, so our refund rules are explicit up front. Here is exactly what is refundable, when, and in what currency."
      sections={[
        {
          h: "Founding Hero (lifetime) purchases",
          paras: [
            "Founding Hero purchases carry a 14-day refund window from the moment your payment is confirmed. Request a refund within that window and we return the USDT equivalent of the amount we actually received, to a wallet you designate. Network fees for the refund transfer are deducted from the refunded amount.",
            "Because crypto prices move, refunds are calculated in USD value received at confirmation time, paid in USDT — not in the original coin at its original price. After 14 days, Founding Hero purchases are final. A refunded seat returns to the available pool.",
          ],
        },
        {
          h: "Underpaid and partially paid invoices",
          paras: [
            "If an invoice is partially paid and the order does not complete, we refund the USDT equivalent of what was received, minus network fees, upon request. We cannot credit partial payments toward a seat.",
          ],
        },
        {
          h: "Subscriptions (at launch)",
          paras: [
            "Monthly subscriptions can be cancelled any time and end at the close of the paid period; we do not refund partial months. Annual subscriptions cancelled within 14 days of first purchase are refunded pro-rata for unused full months; after 14 days they run to the end of the paid year.",
          ],
        },
        {
          h: "What is not refundable",
          list: [
            "Usage-based charges already incurred.",
            "Purchases refunded once before — a returned Founding Hero seat cannot be re-bought and re-refunded.",
            "Losses of any kind arising from trading activity — refunds concern software fees only.",
          ],
        },
        {
          h: "How to request a refund",
          paras: [
            "Email billing@heropips.com from the address on the order, with the order ID (hp_ltd_…) and, for crypto refunds, a USDT wallet address and network. We acknowledge within 72 hours and process approved refunds within 10 business days.",
          ],
        },
      ]}
    />
  );
}
