"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  BROKERS,
  ConnectionRes,
  ConnectionsRes,
  type BrokerKind,
  type PackageLimits,
} from "@heropips/contracts";
import { Button, Input, Kicker } from "@heropips/ui";
import { fmtDateTime } from "@/components/app/format";
import { EmptyMark, IconClose, IconConnect, IconPlus } from "@/components/app/icons";

const BROKER_COPY: Record<BrokerKind, { name: string; type: string; note: string }> = {
  paper: { name: "Paper", type: "simulated", note: "Works today: paper execution against live marks." },
  mt5: { name: "MT5", type: "forex · cfd", note: "Live keys stored encrypted for the wave rollout; fills stay paper until your wave." },
  binance: { name: "Binance", type: "spot crypto", note: "Live keys stored encrypted for the wave rollout; fills stay paper until your wave." },
  kucoin: { name: "KuCoin", type: "spot crypto", note: "Live keys stored encrypted for the wave rollout; fills stay paper until your wave." },
};

const STATUS_PILL: Record<ConnectionRes["status"], string> = {
  active: "ap-pill--active",
  pending: "ap-pill--pending",
  error: "ap-pill--error",
};

export function ConnectionsManager({ initial, limits }: { initial: ConnectionRes[]; limits: PackageLimits }) {
  const router = useRouter();
  const [connections, setConnections] = React.useState<ConnectionRes[]>(initial);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [broker, setBroker] = React.useState<BrokerKind>("paper");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState("");

  const liveUsed = connections.filter((c) => c.mode === "live").length;

  async function reload() {
    try {
      const res = await fetch("/api/app/connections", { cache: "no-store" });
      const parsed = ConnectionsRes.safeParse(await res.json());
      if (res.ok && parsed.success) setConnections(parsed.data.connections);
    } catch {
      /* keep current list */
    }
  }

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const credentials: Record<string, string> = {};
    for (const key of ["api_key", "api_secret", "passphrase", "mt5_login", "mt5_password", "mt5_server"]) {
      const v = String(form.get(key) ?? "").trim();
      if (v) credentials[key] = v;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ broker, label: String(form.get("label") ?? ""), credentials }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const parsed = ApiError.safeParse(json);
        setError(parsed.success ? `${parsed.data.message}${parsed.data.remediation ? ` ${parsed.data.remediation}` : ""}` : "Couldn't add the connection.");
        return;
      }
      setSheetOpen(false);
      setStatus("Connection added.");
      await reload();
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(c: ConnectionRes) {
    setConfirming(null);
    setDeleting(c.id);
    setStatus(`Removing ${c.label}…`);
    try {
      const res = await fetch(`/api/app/connections/${encodeURIComponent(c.id)}`, { method: "DELETE" });
      if (res.ok) {
        setConnections((prev) => prev.filter((x) => x.id !== c.id));
        setStatus(`${c.label} removed.`);
        router.refresh();
      } else {
        const parsed = ApiError.safeParse(await res.json().catch(() => null));
        setStatus(parsed.success ? parsed.data.message : `Couldn't remove ${c.label}.`);
      }
    } catch {
      setStatus(`Network error removing ${c.label}.`);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="ap-panel">
      <div className="ap-panel-head">
        <h2 className="ap-panel-title">Broker connections</h2>
        <div className="ap-panel-side">
          <span className="ap-note num">{liveUsed} of {limits.live_connections} live slots</span>
          <Button size="sm" onClick={() => { setSheetOpen(true); setError(null); }}>
            <IconPlus size={16} />
            Add
          </Button>
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="ap-empty">
          <EmptyMark />
          <span className="ap-empty-ico" aria-hidden="true"><IconConnect /></span>
          <Kicker>brokers · 0 linked</Kicker>
          <h3 className="ap-empty-title">No connections yet</h3>
          <p>
            Start with a Paper account — real execution mechanics against live marks, zero risk. Add exchange or
            MT5 keys any time; they&apos;re stored encrypted for the live wave rollout.
          </p>
          <Button size="sm" onClick={() => setSheetOpen(true)}>Connect a broker</Button>
        </div>
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table ap-cardable">
            <thead>
              <tr>
                <th scope="col">Label</th>
                <th scope="col">Broker</th>
                <th scope="col">Mode</th>
                <th scope="col">Status</th>
                <th scope="col" className="is-right">Added</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {connections.map((c) => (
                <tr key={c.id}>
                  <td data-label="Label" style={{ color: "var(--text-hi)", fontWeight: "var(--weight-semibold)" }}>{c.label}</td>
                  <td data-label="Broker">{BROKER_COPY[c.broker].name}</td>
                  <td data-label="Mode"><span className={`ap-pill ${c.mode === "live" ? "ap-pill--active" : "ap-pill--neutral"}`}>{c.mode}</span></td>
                  <td data-label="Status">
                    <span className={`ap-pill ${STATUS_PILL[c.status]}`}>{c.status}</span>
                    {c.status_detail ? <span className="ap-note" style={{ marginLeft: 8 }}>{c.status_detail}</span> : null}
                  </td>
                  <td data-label="Added" className="is-right num">{fmtDateTime(c.created_at)}</td>
                  <td data-label="" className="is-right is-span">
                    {confirming === c.id ? (
                      <span className="ap-actions" style={{ justifyContent: "flex-end" }}>
                        <Button variant="danger" size="sm" onClick={() => void onDelete(c)}>Confirm remove</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>Keep</Button>
                      </span>
                    ) : (
                      <Button variant="ghost" size="sm" disabled={deleting === c.id} aria-busy={deleting === c.id} busy={deleting === c.id} onClick={() => setConfirming(c.id)}>Remove</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p aria-live="polite" className="ap-note" style={{ padding: "var(--sp-2) var(--sp-5) var(--sp-4)" }}>{status}</p>

      {sheetOpen ? (
        <>
          <div className="ap-sheet-backdrop" onClick={() => !busy && setSheetOpen(false)} aria-hidden />
          <div className="ap-sheet" role="dialog" aria-modal="true" aria-label="Add connection">
            <div className="ap-sheet-head">
              <div>
                <Kicker>connection · setup</Kicker>
                <h2 className="ap-sheet-title">Add connection</h2>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                disabled={busy}
                aria-label="Close"
                style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-mid)", cursor: "pointer", minWidth: 44, minHeight: 44 }}
              >
                <IconClose size={20} />
              </button>
            </div>
            <form onSubmit={onAdd} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              {error ? <p className="ap-form-error" role="alert">{error}</p> : null}

              <div className="ap-brokers" role="radiogroup" aria-label="Broker">
                {BROKERS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className="ap-broker"
                    data-selected={broker === b}
                    role="radio"
                    aria-checked={broker === b}
                    onClick={() => setBroker(b)}
                  >
                    {BROKER_COPY[b].name}
                    <span className="ap-broker-type">{BROKER_COPY[b].type}</span>
                    <small>{BROKER_COPY[b].note}</small>
                  </button>
                ))}
              </div>

              <div className="ap-field">
                <label htmlFor="conn-label">Label</label>
                <Input id="conn-label" name="label" required maxLength={60} placeholder={broker === "paper" ? "Paper account" : `${BROKER_COPY[broker].name} main`} />
              </div>

              {broker === "mt5" ? (
                <>
                  <div className="ap-field">
                    <label htmlFor="mt5-login">MT5 login</label>
                    <Input id="mt5-login" name="mt5_login" mono autoComplete="off" />
                  </div>
                  <div className="ap-field">
                    <label htmlFor="mt5-password">MT5 password</label>
                    <Input id="mt5-password" name="mt5_password" type="password" autoComplete="off" />
                  </div>
                  <div className="ap-field">
                    <label htmlFor="mt5-server">MT5 server</label>
                    <Input id="mt5-server" name="mt5_server" mono placeholder="Broker-Server01" autoComplete="off" />
                  </div>
                </>
              ) : broker === "binance" || broker === "kucoin" ? (
                <>
                  <div className="ap-field">
                    <label htmlFor="api-key">API key</label>
                    <Input id="api-key" name="api_key" mono autoComplete="off" />
                  </div>
                  <div className="ap-field">
                    <label htmlFor="api-secret">API secret</label>
                    <Input id="api-secret" name="api_secret" type="password" autoComplete="off" />
                  </div>
                  {broker === "kucoin" ? (
                    <div className="ap-field">
                      <label htmlFor="api-passphrase">Passphrase</label>
                      <Input id="api-passphrase" name="passphrase" type="password" autoComplete="off" />
                    </div>
                  ) : null}
                  <p className="ap-note">Use trade-only keys with withdrawals disabled. Keys are write-only: stored encrypted, never shown again.</p>
                </>
              ) : (
                <p className="ap-note">
                  Paper runs the full execution pipeline — Trade Guard, sizing, fills — against live market marks.
                  Every figure it produces is labeled Simulated.
                </p>
              )}

              <Button type="submit" disabled={busy} aria-busy={busy} busy={busy}>
                {busy ? "Adding…" : `Add ${BROKER_COPY[broker].name} connection`}
              </Button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
