import type { Metadata } from "next";
import { socialMeta } from "@/components/seo/meta";
import { LTD } from "@heropips/contracts";
import { LegalShell } from "../LegalShell";

const TITLE = "Founding Hero Terms";
const DESCRIPTION =
  "Terms of the Founding Hero lifetime offer: 500 seats ever, one-time $499, lifetime Pro entitlement, 14-day USDT-equivalent refund and no resale after the cap.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/legal/ltd-terms" },
  ...socialMeta(TITLE, DESCRIPTION, "/legal/ltd-terms"),
};

export default function LtdTermsPage() {
  return (
    <LegalShell
      slug="ltd-terms"
      description={DESCRIPTION}
      title="Founding Hero Terms"
      intro="The Founding Hero offer in contract form. Five clauses carry all the weight: the cap, the price, the entitlement, the refund and the transfer rules."
      sections={[
        {
          h: "The offer",
          paras: [
            "Founding Hero is a one-time purchase of USD 499, paid in cryptocurrency through our payment processor, granting one lifetime entitlement to the HeroPips Pro tier for the purchasing account.",
          ],
        },
        {
          h: "The cap: 500 seats, ever",
          paras: [
            "Exactly 500 Founding Hero seats will ever exist. When 500 seats have been granted, the offer ends permanently — it will not be repeated, extended, renamed or resold in any form. Seats released by refund return to the pool only within the original 500 cap.",
            `During checkout a seat is held for you for ${LTD.HOLD_TTL_MINUTES} minutes. If payment does not confirm in that window, the hold expires and the seat returns to the pool. Payments already in flight on-chain are never expired — only holds where nothing has arrived.`,
          ],
        },
        {
          h: "The entitlement: lifetime Pro",
          paras: [
            "“Lifetime” means the operating life of the HeroPips service. Your account receives the Pro tier — including future features added to Pro — for as long as HeroPips operates, with no recurring fee. Features exclusive to tiers above Pro, and priced add-ons outside Pro, are not included.",
            "If HeroPips permanently discontinues the service within 24 months of your purchase, you are entitled to a pro-rata goodwill refund in USDT equivalent.",
          ],
        },
        {
          h: "Refund: 14 days, USDT equivalent",
          paras: [
            "You may request a full refund within 14 days of payment confirmation, returned as the USDT equivalent of the amount received, per the Refund Policy at /legal/refunds. After 14 days the purchase is final.",
          ],
        },
        {
          h: "Personal and non-transferable",
          paras: [
            "The entitlement attaches to your account. It may not be sold, transferred, rented or shared, and accounts trading Founding Hero access are subject to suspension. We may offer an official transfer mechanism in the future; until then, none exists.",
          ],
        },
        {
          h: "What Founding Hero is not",
          list: [
            "Not an investment, security or profit-sharing instrument — it is a software license purchase.",
            "Not a promise of trading performance of any kind.",
            "Not a claim on HeroPips equity, revenue or governance.",
          ],
        },
        {
          h: "General",
          paras: [
            "The Terms of Service apply to everything not covered here; where they conflict regarding this offer, these terms prevail. Contact: billing@heropips.com.",
          ],
        },
      ]}
    />
  );
}
