"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  AuditListRes,
  type AuditRowRes,
  type SessionRowRes,
} from "@heropips/contracts";
import { Badge, Button, Input, Kicker } from "@heropips/ui";
import { fmtDateTime } from "@/components/app/format";
import { EmptyMark, IconShield } from "@/components/app/icons";

/* ---------- sessions ---------- */
export function SessionsList({ initial }: { initial: SessionRowRes[] }) {
  const [sessions, setSessions] = React.useState<SessionRowRes[]>(initial);
  const [status, setStatus] = React.useState("");
  const [revoking, setRevoking] = React.useState<string | null>(null);

  async function revoke(s: SessionRowRes) {
    setRevoking(s.id);
    setStatus("Revoking session…");
    try {
      const res = await fetch(`/api/app/sessions/${encodeURIComponent(s.id)}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((x) => x.id !== s.id));
        setStatus("Session revoked.");
      } else {
        setStatus("Couldn't revoke that session. Try again.");
      }
    } catch {
      setStatus("Network error. Try again.");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <section className="ap-panel" aria-label="Active sessions">
      <div className="ap-panel-head">
        <h2 className="ap-panel-title">Active sessions</h2>
      </div>
      <div className="ap-table-wrap">
        <table className="ap-table">
          <thead>
            <tr>
              <th scope="col">Device</th>
              <th scope="col">IP</th>
              <th scope="col" className="is-right">Last seen</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.current ? <Badge tone="volt" style={{ marginRight: 8 }}>This device</Badge> : null}
                  {s.user_agent ?? "Unknown device"}
                </td>
                <td className="num">{s.ip ?? "—"}</td>
                <td className="is-right num">{fmtDateTime(s.last_seen_at)}</td>
                <td className="is-right">
                  <Button variant="ghost" size="sm" disabled={s.current || revoking === s.id} aria-busy={revoking === s.id} busy={revoking === s.id} onClick={() => void revoke(s)}>
                    {s.current ? "Current" : "Revoke"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p aria-live="polite" className="ap-note" style={{ padding: "var(--sp-2) var(--sp-5) var(--sp-4)" }}>{status}</p>
    </section>
  );
}

/* ---------- audit log ---------- */
export function AuditTable({ initial, initialCursor }: { initial: AuditRowRes[]; initialCursor: string | null }) {
  const [entries, setEntries] = React.useState<AuditRowRes[]>(initial);
  const [cursor, setCursor] = React.useState<string | null>(initialCursor);
  const [busy, setBusy] = React.useState(false);

  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/app/me/audit?cursor=${encodeURIComponent(cursor)}`, { cache: "no-store" });
      const parsed = AuditListRes.safeParse(await res.json());
      if (res.ok && parsed.success) {
        setEntries((prev) => [...prev, ...parsed.data.entries]);
        setCursor(parsed.data.next_cursor);
      }
    } catch {
      /* button stays; user retries */
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ap-panel" aria-label="Audit log">
      <div className="ap-panel-head">
        <h2 className="ap-panel-title">Audit log</h2>
      </div>
      {entries.length === 0 ? (
        <div className="ap-empty">
          <EmptyMark />
          <span className="ap-empty-ico" aria-hidden="true"><IconShield /></span>
          <Kicker>audit · append-only</Kicker>
          <h3 className="ap-empty-title">Nothing logged yet</h3>
          <p>Every security-relevant action — logins, connections, orders — is recorded here permanently.</p>
        </div>
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Target</th>
                <th scope="col" className="is-right">When</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-hi)" }}>{e.action}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{e.target ?? "—"}</td>
                  <td className="is-right num">{fmtDateTime(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cursor ? (
        <div style={{ padding: "var(--sp-3) var(--sp-5)" }}>
          <Button variant="outline" size="sm" onClick={() => void loadMore()} disabled={busy} aria-busy={busy} busy={busy}>
            {busy ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/* ---------- password change ---------- */
export function PasswordForm() {
  const router = useRouter();
  const [state, setState] = React.useState<{ kind: "idle" | "busy" } | { kind: "error"; message: string } | { kind: "done" }>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = String(form.get("new_password") ?? "");
    if (next !== String(form.get("confirm_password") ?? "")) {
      setState({ kind: "error", message: "New passwords don't match." });
      return;
    }
    setState({ kind: "busy" });
    try {
      const res = await fetch("/api/app/me/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          current_password: String(form.get("current_password") ?? ""),
          new_password: next,
        }),
      });
      if (res.ok) {
        setState({ kind: "done" });
        router.refresh(); // other sessions were revoked server-side
        return;
      }
      const parsed = ApiError.safeParse(await res.json().catch(() => null));
      setState({ kind: "error", message: parsed.success ? parsed.data.message : "Password change failed." });
    } catch {
      setState({ kind: "error", message: "Network error. Try again." });
    }
  }

  return (
    <section className="ap-panel" aria-label="Change password">
      <div className="ap-panel-head">
        <h2 className="ap-panel-title">Change password</h2>
      </div>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", padding: "var(--sp-4) var(--sp-5) var(--sp-5)", maxWidth: 420 }}>
        <div aria-live="polite">
          {state.kind === "error" ? <p className="ap-form-error" role="alert">{state.message}</p> : null}
          {state.kind === "done" ? <p className="ap-form-ok">Password changed. All other sessions were signed out.</p> : null}
        </div>
        <div className="ap-field">
          <label htmlFor="pw-current">Current password</label>
          <Input id="pw-current" name="current_password" type="password" autoComplete="current-password" required />
        </div>
        <div className="ap-field">
          <label htmlFor="pw-new">New password</label>
          <Input id="pw-new" name="new_password" type="password" autoComplete="new-password" required minLength={10} aria-describedby="pw-new-hint" />
          <p className="ap-field-hint" id="pw-new-hint">At least 10 characters.</p>
        </div>
        <div className="ap-field">
          <label htmlFor="pw-confirm">Confirm new password</label>
          <Input id="pw-confirm" name="confirm_password" type="password" autoComplete="new-password" required minLength={10} />
        </div>
        <div>
          <Button type="submit" size="sm" disabled={state.kind === "busy"} aria-busy={state.kind === "busy"} busy={state.kind === "busy"}>
            {state.kind === "busy" ? "Saving…" : "Change password"}
          </Button>
        </div>
        <p className="ap-note">Changing your password signs out every other session.</p>
      </form>
    </section>
  );
}
