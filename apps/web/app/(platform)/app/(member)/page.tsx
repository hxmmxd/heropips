import type { Metadata } from "next";
import Link from "next/link";
import {
  ConnectionsRes,
  EquityCurveRes,
  PnlSummaryRes,
  PositionsRes,
  SignalListRes,
} from "@heropips/contracts";
import { Badge, BrandCard, ButtonLink, Disclaimer, Kicker } from "@heropips/ui";
import { serviceGet, SIGNAL_URL, TRADING_URL } from "@/lib/session";
import { fmtBps, fmtPrice, fmtQty, fmtRatio, fmtTime, fmtUsd, pnlTone } from "@/components/app/format";
import { EquitySpark } from "@/components/app/EquitySpark";
import { EmptyMark, IconPositions, IconSignal } from "@/components/app/icons";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // First-touch provisioning lives in /v1/connections (ensurePaper seeds the
  // $10k paper account). Resolve it BEFORE the balance reads, or a brand-new
  // member's first server render can race the seed and paint $0 equity.
  const connections = await serviceGet(TRADING_URL, "/v1/connections", ConnectionsRes);
  const [summary, curve, positions, signals] = await Promise.all([
    serviceGet(TRADING_URL, "/v1/pnl/summary", PnlSummaryRes),
    serviceGet(TRADING_URL, "/v1/pnl/equity?points=200", EquityCurveRes),
    serviceGet(TRADING_URL, "/v1/positions", PositionsRes),
    serviceGet(SIGNAL_URL, "/v1/signals?status=active&limit=3", SignalListRes),
  ]);

  const paperOnly = connections.connections.every((c) => c.mode === "paper");
  const hasConnection = connections.connections.length > 0;
  const todayTone = pnlTone(summary.rpl_today_usd_minor);

  return (
    <>
      {/* PnL hero — the number IS the page. Brand ink poster: theme-invariant. */}
      <BrandCard
        as="section"
        variant="ink"
        chip={false}
        watermark
        className="ap-hero"
        aria-label="Account equity"
        badge={paperOnly ? "Paper" : undefined}
        meta={{ left: [`balance ${fmtUsd(summary.balance_usd_minor)}`, `as of ${fmtTime(summary.as_of)}`] }}
      >
        <span className="ap-hero-label">Equity</span>
        <p className="ap-hero-equity">{fmtUsd(summary.equity_usd_minor)}</p>
        <div className="ap-actions">
          <span className={`ap-delta ap-delta--${todayTone}`}>
            {fmtUsd(summary.rpl_today_usd_minor, { sign: true })} today
          </span>
        </div>
        <EquitySpark points={curve.points} title="Equity curve" />
      </BrandCard>

      {/* stat tiles */}
      <section className="ap-stats" aria-label="Performance stats">
        <div className="ap-stat">
          <div className="ap-stat-label">Realized today{paperOnly ? <Badge tone="neutral">Paper</Badge> : null}</div>
          <div className={`ap-stat-value tone-${todayTone}`}>{fmtUsd(summary.rpl_today_usd_minor, { sign: true })}</div>
        </div>
        <div className="ap-stat">
          <div className="ap-stat-label">Unrealized{paperOnly ? <Badge tone="neutral">Paper</Badge> : null}</div>
          <div className={`ap-stat-value tone-${pnlTone(summary.upl_usd_minor)}`}>{fmtUsd(summary.upl_usd_minor, { sign: true })}</div>
        </div>
        <div className="ap-stat">
          <div className="ap-stat-label">Max drawdown</div>
          <div className="ap-stat-value">{fmtBps(summary.max_drawdown_bps)}</div>
        </div>
        <div className="ap-stat">
          <div className="ap-stat-label">Win rate 30d{paperOnly ? <Badge tone="neutral">Paper</Badge> : null}</div>
          <div className="ap-stat-value">{fmtRatio(summary.win_rate_30d)}</div>
        </div>
      </section>

      <div className="ap-grid-2">
        {/* open positions */}
        <section className="ap-panel" aria-label="Open positions">
          <div className="ap-panel-head">
            <h2 className="ap-panel-title">Open positions</h2>
            <div className="ap-panel-side">
              <Link href="/app/positions" className="ap-panel-link">Manage</Link>
            </div>
          </div>
          {positions.positions.length === 0 ? (
            <div className="ap-empty">
              <EmptyMark />
              <span className="ap-empty-ico" aria-hidden="true"><IconPositions /></span>
              <Kicker>{hasConnection ? "status · flat" : "status · no broker"}</Kicker>
              <h3 className="ap-empty-title">{hasConnection ? "Flat right now" : "No broker connected yet"}</h3>
              <p>
                {hasConnection
                  ? "No open positions. When a brief fires, trade it from the Intelligence page and it shows up here live."
                  : "Connect a broker — start with a paper account against live marks — and your positions appear here."}
              </p>
              {hasConnection ? (
                <ButtonLink href="/app/intelligence" variant="outline" size="sm">View intelligence</ButtonLink>
              ) : (
                <ButtonLink href="/app/connect" size="sm">Connect a broker</ButtonLink>
              )}
            </div>
          ) : (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th scope="col">Symbol</th>
                    <th scope="col">Side</th>
                    <th scope="col" className="is-right">Qty</th>
                    <th scope="col" className="is-right">Entry</th>
                    <th scope="col" className="is-right">Mark</th>
                    <th scope="col" className="is-right">UPL</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.positions.map((p) => (
                    <tr key={p.id}>
                      <td style={{ color: "var(--text-hi)", fontWeight: 600 }}>{p.symbol}</td>
                      <td><span className={`ap-pill ap-pill--${p.side}`}>{p.side}</span></td>
                      <td className="is-right">{fmtQty(p.qty)}</td>
                      <td className="is-right">{fmtPrice(p.symbol, p.avg_entry)}</td>
                      <td className="is-right">{fmtPrice(p.symbol, p.mark)}</td>
                      <td className={`is-right tone-${pnlTone(p.upl_usd_minor)}`}>{fmtUsd(p.upl_usd_minor, { sign: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* latest intelligence rail */}
        <section className="ap-panel" aria-label="Latest intelligence">
          <div className="ap-panel-head">
            <h2 className="ap-panel-title">Latest intelligence</h2>
            <div className="ap-panel-side">
              <Link href="/app/intelligence" className="ap-panel-link">All briefs</Link>
            </div>
          </div>
          {signals.signals.length === 0 ? (
            <div className="ap-empty">
              <EmptyMark />
              <span className="ap-empty-ico" aria-hidden="true"><IconSignal /></span>
              <Kicker>feed · listening</Kicker>
              <h3 className="ap-empty-title">Scanning the tape</h3>
              <p>
                No active briefs right now — the model only fires when its edge clears the confidence bar.
                Wait for the next brief; it lands here first.
              </p>
              <ButtonLink href="/app/history" variant="outline" size="sm">Review resolved briefs</ButtonLink>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {signals.signals.map((s) => (
                <Link key={s.id} href="/app/intelligence" className="ap-siglink">
                  <span className="ap-siglink-symbol">{s.symbol}</span>
                  <span className={`ap-pill ap-pill--${s.side}`}>{s.side}</span>
                  <span className="ap-note num" style={{ marginLeft: "auto" }}>
                    {Math.round(s.confidence * 100)}% conf · {fmtTime(s.generated_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <Disclaimer>
        {paperOnly ? "Simulated — paper execution against live marks. " : null}
        Self-directed software. HeroPips does not provide investment advice, does not hold client funds and does not
        guarantee results. Trading involves substantial risk of loss.
      </Disclaimer>
    </>
  );
}
