import type { Metadata } from "next";
import { PackageRes } from "@heropips/contracts";
import { Badge, BrandCard, ButtonLink, Disclaimer, Kicker } from "@heropips/ui";
import { IDENTITY_URL, serviceGet } from "@/lib/session";
import { EmptyMark, IconPackage } from "@/components/app/icons";

export const metadata: Metadata = { title: "Packages" };
export const dynamic = "force-dynamic";

const INCLUDED_TODAY = [
  "Decision-intelligence briefs from the internal quant engine, every day the model finds edge",
  "Paper execution against live marks — full pipeline, zero risk",
  "Trade Guard rule enforcement on every order",
  "Academy, Founding Lounge, and direct line to the team",
];

const ROLLING_OUT = [
  "Live execution waves: MT5, Binance, KuCoin (keys already stored encrypted)",
  "More markets and additional Trade Guard rule types",
  "Auto-execution mode — briefs execute on your account under your rules",
];

export default async function PackagesPage() {
  const pkg = await serviceGet(IDENTITY_URL, "/v1/me/package", PackageRes);

  return (
    <>
      <BrandCard
        as="section"
        variant="ink"
        chip={false}
        watermark
        aria-label="Your package"
        badge={pkg.lifetime ? "LIFETIME" : undefined}
        meta={{ left: ["@heropips", pkg.lifetime ? "founding cohort · 500 ever" : "member entitlement"] }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-3xl)" }}>{pkg.name}</h2>
          <Badge tone={pkg.active ? "profit" : "loss"}>{pkg.active ? "Active" : "Inactive"}</Badge>
        </div>
        <table className="ap-kv" style={{ marginTop: "var(--sp-5)" }}>
          <tbody>
            <tr>
              <th scope="row">Live broker connections</th>
              <td>{pkg.limits.live_connections}</td>
            </tr>
            <tr>
              <th scope="row">Paper accounts</th>
              <td>{pkg.limits.paper_accounts}</td>
            </tr>
            <tr>
              <th scope="row">Briefs per day</th>
              <td>{pkg.limits.signals_per_day}</td>
            </tr>
            <tr>
              <th scope="row">Trade Guard rules</th>
              <td>{pkg.limits.guard_rules}</td>
            </tr>
          </tbody>
        </table>
      </BrandCard>

      <div className="ap-grid-2">
        <section className="ap-panel" aria-label="Included today">
          <div className="ap-panel-head">
            <h2 className="ap-panel-title">Included today</h2>
          </div>
          <ul style={{ margin: 0, padding: "var(--sp-4) var(--sp-5) var(--sp-5) var(--sp-8)", display: "flex", flexDirection: "column", gap: "var(--sp-2)", fontSize: "var(--text-sm)" }}>
            {INCLUDED_TODAY.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>
        <section className="ap-panel" aria-label="Rolling out">
          <div className="ap-panel-head">
            <h2 className="ap-panel-title">Rolling out</h2>
            <div className="ap-panel-side">
              <Badge tone="info">In waves</Badge>
            </div>
          </div>
          <ul style={{ margin: 0, padding: "var(--sp-4) var(--sp-5) var(--sp-5) var(--sp-8)", display: "flex", flexDirection: "column", gap: "var(--sp-2)", fontSize: "var(--text-sm)" }}>
            {ROLLING_OUT.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>
      </div>

      <section className="ap-panel" aria-label="Referrals">
        <div className="ap-empty">
          <EmptyMark />
          <span className="ap-empty-ico" aria-hidden="true"><IconPackage /></span>
          <Kicker>founding · 500 cap</Kicker>
          <h2 className="ap-empty-title">Give your code, queue-jump friends</h2>
          <p>
            Your seat is lifetime — the 500 are capped forever. Friends on the early access list jump the queue when they
            join through you.
          </p>
          <ButtonLink href="/affiliates" variant="outline" size="sm">Get your referral link</ButtonLink>
        </div>
      </section>

      <Disclaimer />
    </>
  );
}
