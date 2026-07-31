"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, type ErrorCode } from "@heropips/contracts";
import { Button, Input, Kicker } from "@heropips/ui";
import { track } from "@/lib/analytics";

type AuthFailure = { code: ErrorCode | null; message: string; remediation?: string };

async function postAuth(path: string, body: unknown): Promise<AuthFailure | null> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const json = await res.json().catch(() => null);
    const parsed = ApiError.safeParse(json);
    if (parsed.success) {
      const { error_code, message, remediation } = parsed.data;
      return { code: error_code, message, remediation };
    }
    return { code: null, message: "Something went wrong. Try again." };
  } catch {
    return { code: null, message: "Network error. Check your connection and try again." };
  }
}

/**
 * Only ever bounce back into the member app. The `/app/` suffix matters: a bare
 * `startsWith("/app")` also admits `/apparel`, which is not the subtree the
 * middleware was guarding when it minted this param.
 */
function safeNext(next: string | undefined): string {
  if (!next || next.startsWith("//")) return "/app";
  return next === "/app" || next.startsWith("/app/") ? next : "/app";
}

/** Carry `?next` across the login ↔ redeem cross-links so the deep link survives. */
function withNext(path: string, next: string | undefined): string {
  return next ? `${path}?next=${encodeURIComponent(safeNext(next))}` : path;
}

/**
 * `action` replaces the upstream remediation rather than following it: when the
 * fix is a route (409 → sign in), the prose version of the same advice is noise.
 */
function ErrorBanner({ failure, action }: { failure: AuthFailure; action?: React.ReactNode }) {
  return (
    <p className="ap-form-error" role="alert">
      {failure.message}
      {action ?? (failure.remediation ? ` ${failure.remediation}` : null)}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [failure, setFailure] = React.useState<AuthFailure | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setFailure(null);
    const err = await postAuth("/api/app/auth/login", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!err) {
      track("login", { method: "password" });
      router.push(safeNext(next));
      router.refresh();
      return;
    }
    setFailure(err);
    setBusy(false);
  }

  // The credentials 401 is deliberately ambiguous about which half was wrong,
  // so flag both rather than guess.
  const badCredentials = failure?.code === "auth_invalid_credentials";

  return (
    <form onSubmit={onSubmit} className="ap-auth-form">
      {failure ? <ErrorBanner failure={failure} /> : null}
      <div className="ap-field">
        <label htmlFor="login-email">Email</label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          invalid={badCredentials}
          aria-invalid={badCredentials || undefined}
        />
      </div>
      <div className="ap-field">
        <label htmlFor="login-password">Password</label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={badCredentials}
          aria-invalid={badCredentials || undefined}
        />
      </div>
      <Button type="submit" disabled={busy} aria-busy={busy} busy={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <p className="ap-note">
        First time here? <Link href={withNext("/app/redeem", next)}>Redeem your Founding access code</Link>.
      </p>
    </form>
  );
}

export function RedeemForm({
  defaultCode,
  defaultEmail,
  verifiedOrder = false,
  next,
}: {
  defaultCode?: string;
  defaultEmail?: string;
  /** Both fields came from a valid order-status token, not from user typing. */
  verifiedOrder?: boolean;
  next?: string;
}) {
  const router = useRouter();
  const [failure, setFailure] = React.useState<AuthFailure | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setFailure(null);
    const err = await postAuth("/api/app/auth/redeem", {
      email: String(form.get("email") ?? ""),
      access_code: String(form.get("access_code") ?? ""),
      display_name: String(form.get("display_name") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!err) {
      track("sign_up", { method: "access_code" });
      router.push(safeNext(next));
      router.refresh();
      return;
    }
    setFailure(err);
    setBusy(false);
  }

  // billing matches the order on code *and* email, and answers with one opaque
  // 401 either way — so both fields carry the flag.
  const badPair = failure?.code === "access_code_invalid";
  // 409: the email already has an account. Only that field is wrong, and the
  // fix is a route, not a retype.
  const emailTaken = failure?.code === "forbidden";

  return (
    <form onSubmit={onSubmit} className="ap-auth-form">
      {failure ? (
        <ErrorBanner
          failure={failure}
          action={emailTaken ? <> <Link href={withNext("/app/login", next)}>Sign in instead</Link>.</> : undefined}
        />
      ) : null}

      {verifiedOrder ? (
        <div className="ap-auth-verified">
          <Kicker tone="volt">order verified</Kicker>
          <span className="ap-auth-verified-value">{defaultCode}</span>
          <span className="ap-field-hint">
            Your seat is locked to {defaultEmail}. Set a password below to finish.
          </span>
        </div>
      ) : null}

      <div className="ap-field">
        <label htmlFor="redeem-email">Email</label>
        <Input
          id="redeem-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
          invalid={badPair || emailTaken}
          aria-invalid={badPair || emailTaken || undefined}
          aria-describedby="redeem-email-hint"
        />
        <p className="ap-field-hint" id="redeem-email-hint">
          Must be the email you paid with — the seat is locked to it.
        </p>
      </div>
      <div className="ap-field">
        <label htmlFor="redeem-code">Access code</label>
        <Input
          id="redeem-code"
          name="access_code"
          mono
          required
          minLength={6}
          placeholder="hp_ltd_…"
          defaultValue={defaultCode}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          invalid={badPair}
          aria-invalid={badPair || undefined}
          aria-describedby="redeem-code-hint"
        />
        <p className="ap-field-hint" id="redeem-code-hint">
          Your access code is your Founding order id — it starts with <code>hp_ltd_</code> and is shown on your order
          status page.
        </p>
      </div>
      <div className="ap-field">
        <label htmlFor="redeem-name">Display name</label>
        <Input
          id="redeem-name"
          name="display_name"
          autoComplete="nickname"
          required
          minLength={2}
          maxLength={40}
          aria-describedby="redeem-name-hint"
        />
        <p className="ap-field-hint" id="redeem-name-hint">Shown in the Founding Lounge.</p>
      </div>
      <div className="ap-field">
        <label htmlFor="redeem-password">Password</label>
        <Input
          id="redeem-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          aria-describedby="redeem-password-hint"
        />
        <p className="ap-field-hint" id="redeem-password-hint">At least 10 characters.</p>
      </div>
      <Button type="submit" disabled={busy} aria-busy={busy} busy={busy}>
        {busy ? "Activating…" : "Activate my seat"}
      </Button>
      <p className="ap-note">
        Already activated? <Link href={withNext("/app/login", next)}>Sign in</Link>.
      </p>
    </form>
  );
}
