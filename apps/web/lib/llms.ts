/* =========================================================================
 * llms.txt generation — shared pieces for app/llms.txt and app/llms-full.txt.
 * Every fact here is derived from a typed source (PUBLIC_ROUTES, TIERS, the
 * academy curriculum, contracts constants) so the artifacts cannot go stale.
 * ======================================================================= */

import { abs } from "@/components/seo/graph";
import { PUBLIC_ROUTES, type PublicRoute } from "@/lib/content";

/** The `>` blockquote summary both files open with (llmstxt.org requires it). */
export const TAGLINE =
  "HeroPips (heropips.com) is an AI-powered financial intelligence platform for retail traders — " +
  "a decision-intelligence product, not a signal seller. An internal quant engine turns institutional-grade " +
  "market data into intelligence briefs that carry entry, stop, R-multiple targets, a confidence score, the " +
  "model version that produced them and plain-language reasoning; briefs execute on the trader's own broker " +
  "account (MT5, Binance, KuCoin) behind Trade Guard, a nine-control fail-closed risk suite. HeroPips is " +
  "self-directed software: not a broker, not a fund, not an adviser — no investment advice, no custody of " +
  "funds, no profit guarantees. Status: early access, live today for Founding Hero lifetime members.";

/** Section order for the `## Group` link lists. Must cover every group. */
const GROUP_ORDER = ["Product", "Learn", "Access", "Company", "Legal"] as const;

const GROUP_INTRO: Record<PublicRoute["group"], string> = {
  Product: "What the platform is and how each layer works.",
  Learn: "HeroPips Academy — the full public curriculum. Education only; no advice, no real money.",
  Access: "How to get in today, what it costs, and how referrals work.",
  Company: "Direct answers about the product, the launch and the limits.",
  Legal: "The binding documents. Read the risk disclosure before trading anything, anywhere.",
};

/**
 * `## Group` blocks of `- [name](absolute-url): description` — the spec-shaped
 * link lists. Throws if a route escapes GROUP_ORDER, so a new group is a
 * build-time failure rather than a silently omitted section.
 */
export function linkSections(): string {
  let covered = 0;
  const blocks = GROUP_ORDER.map((group) => {
    const routes = PUBLIC_ROUTES.filter((r) => r.group === group);
    covered += routes.length;
    const rows = routes.map((r) => `- [${r.title}](${abs(r.path)}): ${r.summary}`);
    return `## ${group}\n\n${GROUP_INTRO[group]}\n\n${rows.join("\n")}`;
  });
  if (covered !== PUBLIC_ROUTES.length) {
    throw new Error(`llms.txt: ${PUBLIC_ROUTES.length - covered} public route(s) outside GROUP_ORDER`);
  }
  return blocks.join("\n\n");
}
