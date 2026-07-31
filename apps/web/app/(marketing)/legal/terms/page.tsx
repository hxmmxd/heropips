import type { Metadata } from "next";
import { socialMeta } from "@/components/seo/meta";
import { LegalShell } from "../LegalShell";

const TITLE = "Terms of Service";
const DESCRIPTION =
  "HeroPips Terms of Service: self-directed software with no advice and no custody, account rules, gamification points, referral limits and acceptable use.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/legal/terms" },
  ...socialMeta(TITLE, DESCRIPTION, "/legal/terms"),
};

export default function TermsPage() {
  return (
    <LegalShell
      slug="terms"
      description={DESCRIPTION}
      title="Terms of Service"
      intro="These terms govern your use of heropips.com and the HeroPips software. Plain-language summaries head each clause; the plain language is the intent."
      sections={[
        {
          h: "What HeroPips is — and is not",
          paras: [
            "HeroPips is self-directed trading software: educational content, paper trading, and tools that execute rules you configure on brokerage accounts you own. HeroPips is not a broker, not an investment adviser, and not a fund.",
            "We do not provide investment advice, recommendations or portfolio management. Nothing in the product — including intelligence briefs, scores, lessons and templates — is a recommendation to buy or sell any instrument. All trading decisions, configurations and their outcomes are yours alone.",
            "We never take custody of your funds. Your money stays at your broker or exchange. HeroPips connects only with trade-scope API credentials and cannot withdraw funds under any circumstances.",
          ],
        },
        {
          h: "Eligibility and accounts",
          paras: [
            "You must be at least 18 years old and legally permitted to use trading software in your jurisdiction. You are responsible for the accuracy of your account information and the security of your credentials. One account per person.",
          ],
        },
        {
          h: "No performance promises",
          paras: [
            "We make no promise of profit, income or trading performance of any kind. Any figures shown pre-launch are simulated or hypothetical, are labeled as such, and are subject to inherent limitations. Past performance, simulated or real, does not indicate future results.",
          ],
        },
        {
          h: "XP, points and gamification",
          paras: [
            "XP, points, streaks, badges and early-access queue positions are non-cash features with no monetary value. They cannot be redeemed for money, transferred, sold or exchanged, and we may adjust or reset them to preserve program integrity.",
          ],
        },
        {
          h: "Referrals",
          paras: [
            "Referral rewards apply at most two levels deep: the person you directly refer, and the people they directly refer. No reward accrues beyond the second level. Self-referrals, fake accounts and incentivized spam void rewards. The partner/IB program is governed by a separate agreement.",
          ],
        },
        {
          h: "Acceptable use",
          list: [
            "No reverse engineering, scraping at abusive rates, or reselling access.",
            "No use of withdrawal-enabled API keys — such keys are rejected and must be rotated.",
            "No use of the service to manage third-party funds without the licenses your jurisdiction requires.",
            "No circumvention of Trade Guard or platform limits.",
          ],
        },
        {
          h: "Subscriptions and the Founding Hero offer",
          paras: [
            "Paid tiers are billed as described at /pricing at the time of purchase. The Founding Hero lifetime offer is governed by its own terms at /legal/ltd-terms, which prevail for that offer where they differ from these terms.",
          ],
        },
        {
          h: "Limitation of liability",
          paras: [
            "To the maximum extent permitted by law, HeroPips is provided “as is,” and our aggregate liability is limited to the amounts you paid us in the twelve months preceding the claim. We are not liable for trading losses, broker failures, market data errors or events outside our reasonable control. Nothing here limits liability that cannot lawfully be limited.",
          ],
        },
        {
          h: "Termination and changes",
          paras: [
            "You may close your account at any time. We may suspend accounts that breach these terms. We may amend these terms with notice; continued use after the effective date of a change constitutes acceptance.",
          ],
        },
        {
          h: "Contact",
          paras: ["Questions about these terms: legal@heropips.com."],
        },
      ]}
    />
  );
}
