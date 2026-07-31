import type { Metadata } from "next";
import { socialMeta } from "@/components/seo/meta";
import { LegalShell } from "../LegalShell";

const TITLE = "Risk Disclosure";
const DESCRIPTION =
  "Trading leveraged instruments carries substantial risk of loss. The HeroPips risk disclosure, including the limits of simulated results and automation.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/legal/risk" },
  ...socialMeta(TITLE, DESCRIPTION, "/legal/risk"),
};

export default function RiskPage() {
  return (
    <LegalShell
      slug="risk"
      description={DESCRIPTION}
      title="Risk Disclosure"
      intro="Read this before you trade anything, anywhere — with or without HeroPips. It is the least marketing-shaped page on this site, on purpose."
      sections={[
        {
          h: "Trading involves substantial risk of loss",
          paras: [
            "Foreign exchange, CFDs, futures and crypto assets are volatile and frequently leveraged. Leverage amplifies both gains and losses: with 30:1 leverage, a 3.3% adverse move can eliminate the margin supporting a position. You can lose some or all of the funds you allocate to trading, and with some instruments and brokers, more than your initial deposit.",
            "You should trade only with money you can afford to lose, and only after understanding the instruments, your broker's terms and your jurisdiction's rules.",
          ],
        },
        {
          h: "Automation changes risk — it does not remove it",
          paras: [
            "Automated execution removes hesitation and enforces the rules you configure; it also executes mistakes exactly as configured. A flawed strategy runs flawlessly into losses. Connectivity failures, broker rejections, slippage, gaps and market halts can all cause fills that differ from what a rule intended.",
            "Trade Guard blocks orders that violate your configured limits, and fails closed when it cannot check them. It cannot protect against a losing strategy operating within those limits, and it cannot guarantee execution quality at your broker.",
          ],
        },
        {
          h: "Simulated and hypothetical results",
          paras: [
            "All performance figures shown by HeroPips before launch are simulated or hypothetical and are labeled as such. Simulated results are designed with the benefit of hindsight, do not include the full effect of slippage, liquidity, fees or the psychological pressure of real losses, and frequently overstate what live trading achieves. No representation is made that any account will achieve results similar to any figure shown.",
          ],
        },
        {
          h: "No advice, no custody",
          paras: [
            "HeroPips is self-directed software. We do not give investment advice, we do not manage money, and we never hold your funds. Educational content teaches mechanics, not recommendations. Intelligence briefs are informational output of rule-based software you configure — acting on them is your decision and your responsibility.",
          ],
        },
        {
          h: "Prop-firm challenges",
          paras: [
            "Prop-firm presets mirror published challenge rules as configuration defaults. Challenge providers change rules, apply discretion and may reject automated trading styles. Passing or keeping a funded account is never guaranteed by any tool, including this one.",
          ],
        },
        {
          h: "If you are unsure",
          paras: [
            "If anything on this page is unclear, do not trade live. Use the free academy and paper trading until it is clear — that is what they are for. Consider independent, licensed financial advice for decisions about your own situation.",
          ],
        },
      ]}
    />
  );
}
