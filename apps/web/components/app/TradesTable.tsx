"use client";

import * as React from "react";
import Link from "next/link";
import { TradesRes, type TradeRowRes } from "@heropips/contracts";
import { Button, ButtonLink, Kicker } from "@heropips/ui";
import { fmtDateTime, fmtPrice, fmtQty, fmtUsd, pnlTone } from "@/components/app/format";
import { EmptyMark, IconDownload, IconHistory } from "@/components/app/icons";

/**
 * Trade history. First page is SSR (props); "Load more" appends via the BFF.
 * CSV export builds a blob from the rows already loaded — no extra fetch.
 */
export function TradesTable({ initial, initialCursor }: { initial: TradeRowRes[]; initialCursor: string | null }) {
  const [trades, setTrades] = React.useState<TradeRowRes[]>(initial);
  const [cursor, setCursor] = React.useState<string | null>(initialCursor);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/app/trades?cursor=${encodeURIComponent(cursor)}`, { cache: "no-store" });
      const parsed = TradesRes.safeParse(await res.json());
      if (!res.ok || !parsed.success) {
        setError("Couldn't load more trades. Try again.");
        return;
      }
      setTrades((prev) => [...prev, ...parsed.data.trades]);
      setCursor(parsed.data.next_cursor);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = "id,symbol,side,qty,entry,exit,rpl_usd,fees_usd,signal_id,opened_at,closed_at";
    const lines = trades.map((t) =>
      [
        t.id,
        t.symbol,
        t.side,
        t.qty,
        t.entry,
        t.exit,
        fmtUsd(t.rpl_usd_minor).replace(/[$,]/g, ""),
        fmtUsd(t.fees_usd_minor).replace(/[$,]/g, ""),
        t.signal_id ?? "",
        t.opened_at,
        t.closed_at,
      ].join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heropips-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (trades.length === 0) {
    return (
      <div className="ap-panel">
        <div className="ap-empty">
          <EmptyMark />
          <span className="ap-empty-ico" aria-hidden="true"><IconHistory /></span>
          <Kicker>ledger · empty</Kicker>
          <h2 className="ap-empty-title">No closed trades yet</h2>
          <p>
            Your full record lands here the moment a position closes — realized PnL net of fees, plus the brief
            that triggered it. Nothing is ever edited or deleted.
          </p>
          <ButtonLink href="/app/intelligence" variant="outline" size="sm">Trade a brief</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="ap-panel">
      <div className="ap-panel-head">
        <h2 className="ap-panel-title">Closed trades</h2>
        <div className="ap-panel-side">
          <Button variant="ghost" size="sm" onClick={exportCsv}>
            <IconDownload size={16} />
            CSV ({trades.length})
          </Button>
        </div>
      </div>
      <div className="ap-table-wrap">
        <table className="ap-table">
          <thead>
            <tr>
              <th scope="col">Symbol</th>
              <th scope="col">Side</th>
              <th scope="col" className="is-right">Qty</th>
              <th scope="col" className="is-right">Entry</th>
              <th scope="col" className="is-right">Exit</th>
              <th scope="col" className="is-right">Realized</th>
              <th scope="col" className="is-right">Fees</th>
              <th scope="col">Source</th>
              <th scope="col" className="is-right">Closed</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id}>
                <td style={{ color: "var(--text-hi)", fontWeight: "var(--weight-semibold)" }}>{t.symbol}</td>
                <td><span className={`ap-pill ap-pill--${t.side}`}>{t.side}</span></td>
                <td className="is-right">{fmtQty(t.qty)}</td>
                <td className="is-right">{fmtPrice(t.symbol, t.entry)}</td>
                <td className="is-right">{fmtPrice(t.symbol, t.exit)}</td>
                <td className={`is-right tone-${pnlTone(t.rpl_usd_minor)}`}>{fmtUsd(t.rpl_usd_minor, { sign: true })}</td>
                <td className="is-right">{fmtUsd(t.fees_usd_minor)}</td>
                <td>
                  {t.signal_id ? (
                    <Link href={`/app/intelligence#${t.signal_id}`} style={{ fontSize: "var(--text-sm)" }}>
                      brief
                    </Link>
                  ) : (
                    <span className="ap-note">manual</span>
                  )}
                </td>
                <td className="is-right num">{fmtDateTime(t.closed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "var(--sp-3) var(--sp-5)", display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
        {cursor ? (
          <Button variant="outline" size="sm" onClick={() => void loadMore()} disabled={busy} aria-busy={busy} busy={busy}>
            {busy ? "Loading…" : "Load more"}
          </Button>
        ) : (
          <span className="ap-note">End of history.</span>
        )}
        <span aria-live="polite" className="ap-note">{error ?? ""}</span>
      </div>
    </div>
  );
}
