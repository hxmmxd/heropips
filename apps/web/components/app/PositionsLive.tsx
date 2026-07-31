"use client";

import * as React from "react";
import { PositionsRes, type PositionRes } from "@heropips/contracts";
import { Button, ButtonLink, Kicker } from "@heropips/ui";
import { fmtPrice, fmtQty, fmtUsd, pnlTone } from "@/components/app/format";
import { EmptyMark, IconPositions } from "@/components/app/icons";

const POLL_MS = 5000;

/**
 * Live positions table. SSR renders the initial rows (props), then the client
 * polls /api/app/positions every 5s — paused while the tab is hidden.
 * Close is optimistic: the row dims to "closing…" until the fill confirms.
 */
export function PositionsLive({ initial }: { initial: PositionRes[] }) {
  const [positions, setPositions] = React.useState<PositionRes[]>(initial);
  const [closing, setClosing] = React.useState<Set<string>>(new Set());
  const [confirming, setConfirming] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>("");

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/app/positions", { cache: "no-store" });
      if (!res.ok) return;
      const parsed = PositionsRes.safeParse(await res.json());
      if (parsed.success) setPositions(parsed.data.positions);
    } catch {
      /* transient — next poll retries */
    }
  }, []);

  React.useEffect(() => {
    let id: number | null = null;
    const start = () => {
      if (id === null) id = window.setInterval(refresh, POLL_MS);
    };
    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        void refresh();
        start();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  async function closePosition(p: PositionRes) {
    setConfirming(null);
    setClosing((prev) => new Set(prev).add(p.id));
    setStatus(`Closing ${p.symbol}…`);
    try {
      const res = await fetch(`/api/app/positions/${encodeURIComponent(p.id)}/close`, { method: "POST" });
      if (res.ok) {
        setStatus(`${p.symbol} closed.`);
        await refresh();
      } else {
        setStatus(`Couldn't close ${p.symbol}. Try again.`);
      }
    } catch {
      setStatus(`Network error closing ${p.symbol} — check before retrying.`);
    } finally {
      setClosing((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }
  }

  const totalUpl = positions.reduce((sum, p) => sum + p.upl_usd_minor, 0);

  if (positions.length === 0) {
    return (
      <div className="ap-panel">
        <div className="ap-empty">
          <EmptyMark />
          <span className="ap-empty-ico" aria-hidden="true"><IconPositions /></span>
          <Kicker>status · flat</Kicker>
          <h2 className="ap-empty-title">No open positions</h2>
          <p>
            You&apos;re flat. Trade an active brief — or wait for the next one — and it appears here with live
            marks within seconds.
          </p>
          <ButtonLink href="/app/intelligence" size="sm">View intelligence</ButtonLink>
        </div>
        <p aria-live="polite" className="ap-note" style={{ padding: "0 var(--sp-5) var(--sp-4)" }}>{status}</p>
      </div>
    );
  }

  return (
    <div className="ap-panel">
      <div className="ap-panel-head">
        <h2 className="ap-panel-title">Open positions</h2>
        <div className="ap-panel-side">
          <span className="ap-live ap-live--on">Live · 5s</span>
        </div>
      </div>
      <div className="ap-table-wrap">
        <table className="ap-table ap-cardable">
          <thead>
            <tr>
              <th scope="col">Symbol</th>
              <th scope="col">Side</th>
              <th scope="col" className="is-right">Qty</th>
              <th scope="col" className="is-right">Avg entry</th>
              <th scope="col" className="is-right">Mark</th>
              <th scope="col" className="is-right">UPL</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const pending = closing.has(p.id);
              return (
                <tr key={p.id} className={pending ? "ap-row-pending" : undefined}>
                  <td data-label="Symbol" style={{ color: "var(--text-hi)", fontWeight: "var(--weight-semibold)" }}>{p.symbol}</td>
                  <td data-label="Side"><span className={`ap-pill ap-pill--${p.side}`}>{p.side}</span></td>
                  <td data-label="Qty" className="is-right">{fmtQty(p.qty)}</td>
                  <td data-label="Avg entry" className="is-right">{fmtPrice(p.symbol, p.avg_entry)}</td>
                  <td data-label="Mark" className="is-right">{fmtPrice(p.symbol, p.mark)}</td>
                  <td data-label="UPL" className={`is-right tone-${pnlTone(p.upl_usd_minor)}`}>
                    {fmtUsd(p.upl_usd_minor, { sign: true })}
                  </td>
                  {/* The pending badge lives here, not in the symbol cell: this is the
                      only cell that spans the full width in the <720px card layout, so a
                      pill fits without overflowing a 117px card column. */}
                  <td data-label="" className="is-right is-span">
                    {pending ? (
                      <span className="ap-pill ap-pill--pending" style={{ marginRight: "var(--sp-2)" }}>closing</span>
                    ) : null}
                    {confirming === p.id ? (
                      <span className="ap-actions" style={{ justifyContent: "flex-end" }}>
                        <Button variant="danger" size="sm" onClick={() => void closePosition(p)}>
                          Confirm close
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                          Keep
                        </Button>
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        aria-busy={pending}
                        busy={pending}
                        onClick={() => setConfirming(p.id)}
                      >
                        {pending ? "Closing…" : "Close"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td data-label="" colSpan={5}>Total unrealized</td>
              <td data-label="Total UPL" className={`is-right tone-${pnlTone(totalUpl)}`}>
                {fmtUsd(totalUpl, { sign: true })}
              </td>
              <td data-label="" />
            </tr>
          </tfoot>
        </table>
      </div>
      <p aria-live="polite" className="ap-note" style={{ padding: "var(--sp-2) var(--sp-5) var(--sp-4)" }}>{status}</p>
    </div>
  );
}
