"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@heropips/contracts";
import { Button, Input } from "@heropips/ui";
import { IconLogout } from "@/components/app/icons";

export function DisplayNameForm({ current }: { current: string }) {
  const router = useRouter();
  const [state, setState] = React.useState<{ kind: "idle" | "busy" | "done" } | { kind: "error"; message: string }>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState({ kind: "busy" });
    try {
      const res = await fetch("/api/app/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ display_name: String(form.get("display_name") ?? "") }),
      });
      if (res.ok) {
        setState({ kind: "done" });
        router.refresh();
        return;
      }
      const parsed = ApiError.safeParse(await res.json().catch(() => null));
      setState({ kind: "error", message: parsed.success ? parsed.data.message : "Couldn't save your name." });
    } catch {
      setState({ kind: "error", message: "Network error. Try again." });
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", maxWidth: 420 }}>
      <div aria-live="polite">
        {state.kind === "error" ? <p className="ap-form-error" role="alert">{state.message}</p> : null}
        {state.kind === "done" ? <p className="ap-form-ok">Saved.</p> : null}
      </div>
      <div className="ap-field">
        <label htmlFor="display-name">Display name</label>
        <Input id="display-name" name="display_name" defaultValue={current} required minLength={2} maxLength={40} aria-describedby="display-name-hint" />
        <p className="ap-field-hint" id="display-name-hint">Shown in the Founding Lounge and on your member chip.</p>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={state.kind === "busy"} aria-busy={state.kind === "busy"} busy={state.kind === "busy"}>
          {state.kind === "busy" ? "Saving…" : "Save name"}
        </Button>
      </div>
    </form>
  );
}

export function LogoutButton() {
  const [busy, setBusy] = React.useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await fetch("/api/app/auth/logout", { method: "POST" });
    } finally {
      // Hard navigation clears all client state along with the cookie.
      window.location.href = "/app/login";
    }
  }

  return (
    <Button variant="danger" size="sm" onClick={() => void onLogout()} disabled={busy} aria-busy={busy} busy={busy}>
      {busy ? null : <IconLogout size={16} />}
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  );
}
