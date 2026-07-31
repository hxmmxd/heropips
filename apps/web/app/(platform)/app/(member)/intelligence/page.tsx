import type { Metadata } from "next";
import {
  ConnectionsRes,
  SignalListRes,
  type SignalRes,
} from "@heropips/contracts";
import { Badge, ButtonLink, Disclaimer, Kicker } from "@heropips/ui";
import { serviceGet, SIGNAL_URL, TRADING_URL } from "@/lib/session";
import { fmtDateTime, fmtPrice } from "@/components/app/format";
import { Countdown } from "@/components/app/Countdown";
import { TradeThisButton } from "@/components/app/OrderSheet";
import { EmptyMark, IconHistory, IconSignal } from "@/components/app/icons";

export const metadata: Metadata = { title: "Intelligence" };
export const dynamic = "force-dynamic";

const OUTCOME: Record<SignalRes["status"], { label: string; tone: "profit" | "loss" | "neutral" }> = {
  active: { label: "Active", tone: "neutral" },
  target_hit: { label: "Target hit", tone: "profit" },
  stopped: { label: "Stopped", tone: "loss" },
  expired: { label: "Expired", tone: "neutral" },
};

function Levels({ s }: { s: SignalRes }) {
  return (
    <div className="ap-signal-levels">
      <div>
        <div className="ap-signal-level-label">Entry</div>
        <div className="ap-signal-level-value">{fmtPrice(s.symbol, s.entry)}</div>
      </div>
      <div>
        <div className="ap-signal-level-label">Stop</div>
        <div className="ap-signal-level-value">{fmtPrice(s.symbol, s.stop)}</div>
      </div>
      <div>
        <div className="ap-signal-level-label">Target</div>
        <div className="ap-signal-level-value">{fmtPrice(s.symbol, s.target)}</div>
      </div>
    </div>
  );
}

export default async function IntelligencePage() {
  const [active, resolved, connections] = await Promise.all([
    serviceGet(SIGNAL_URL, "/v1/signals?status=active", SignalListRes),
    serviceGet(SIGNAL_URL, "/v1/signals?status=resolved&limit=20", SignalListRes),
    serviceGet(TRADING_URL, "/v1/connections", ConnectionsRes),
  ]);

  return (
    <>
      <section aria-label="Active intelligence" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        {active.signals.length === 0 ? (
          <div className="ap-panel">
            <div className="ap-empty">
              <EmptyMark />
              <span className="ap-empty-ico" aria-hidden="true"><IconSignal /></span>
              <Kicker>feed · listening</Kicker>
              <h2 className="ap-empty-title">No active briefs</h2>
              <p>
                The model publishes a brief only when its edge clears the confidence bar — silence is a
                position too. The next one lands here the moment it fires.
              </p>
              <ButtonLink href="/app/positions" variant="outline" size="sm">Check open positions</ButtonLink>
            </div>
          </div>
        ) : (
          active.signals.map((s) => (
            <article key={s.id} className="ap-signal" id={s.id}>
              <div className="ap-signal-head">
                <span className="ap-signal-symbol">{s.symbol}</span>
                <span className={`ap-pill ap-pill--${s.side}`}>{s.side}</span>
                <div
                  className="ap-confbar"
                  role="meter"
                  aria-label="Model confidence"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(s.confidence * 100)}
                >
                  <span style={{ width: `${Math.round(s.confidence * 100)}%` }} />
                </div>
                <span className="ap-note num">{Math.round(s.confidence * 100)}%</span>
                <span style={{ marginLeft: "auto" }}>
                  <Countdown expiresAt={s.expires_at} />
                </span>
              </div>
              <Levels s={s} />
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>{s.rationale}</p>
              <div className="ap-actions">
                <TradeThisButton signal={s} connections={connections.connections} />
                <span className="ap-footnote" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "var(--sp-2)" }}>
                  {s.data_source}
                  {/* model attribution — pulse = AI only */}
                  <span className="hp-kicker" data-tone="pulse">{s.model_version}</span>
                </span>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="ap-panel" aria-label="Brief history">
        <div className="ap-panel-head">
          <h2 className="ap-panel-title">History</h2>
        </div>
        {resolved.signals.length === 0 ? (
          <div className="ap-empty">
            <EmptyMark />
            <span className="ap-empty-ico" aria-hidden="true"><IconHistory /></span>
            <Kicker>outcomes · none yet</Kicker>
            <h3 className="ap-empty-title">Nothing resolved yet</h3>
            <p>Once briefs hit target, stop out or expire, their outcomes are recorded here — wins and losses alike.</p>
            <ButtonLink href="/product/intelligence" variant="outline" size="sm">How briefs resolve</ButtonLink>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th scope="col">Symbol</th>
                  <th scope="col">Side</th>
                  <th scope="col" className="is-right">Entry</th>
                  <th scope="col" className="is-right">Target</th>
                  <th scope="col" className="is-right">Stop</th>
                  <th scope="col">Outcome</th>
                  <th scope="col" className="is-right">Generated</th>
                </tr>
              </thead>
              <tbody>
                {resolved.signals.map((s) => (
                  <tr key={s.id} id={s.id}>
                    <td style={{ color: "var(--text-hi)", fontWeight: 600 }}>{s.symbol}</td>
                    <td><span className={`ap-pill ap-pill--${s.side}`}>{s.side}</span></td>
                    <td className="is-right">{fmtPrice(s.symbol, s.entry)}</td>
                    <td className="is-right">{fmtPrice(s.symbol, s.target)}</td>
                    <td className="is-right">{fmtPrice(s.symbol, s.stop)}</td>
                    <td><Badge tone={OUTCOME[s.status].tone === "profit" ? "profit" : OUTCOME[s.status].tone === "loss" ? "loss" : "neutral"}>{OUTCOME[s.status].label}</Badge></td>
                    <td className="is-right num">{fmtDateTime(s.generated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Disclaimer>
        Intelligence briefs are model output from disclosed data sources, not investment advice. You decide
        what to trade; execution happens on your own broker account under your Trade Guard rules.
      </Disclaimer>
    </>
  );
}
