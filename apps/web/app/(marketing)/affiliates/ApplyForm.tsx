"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, Card, Input, Kicker } from "@heropips/ui";
import { FormField } from "@/components/convert/FormField";
import { track } from "@/lib/analytics";
import styles from "./affiliates.module.css";

/* =========================================================================
 * ApplyForm — marketer-platform application.
 *
 * Five required fields + optional note. Client validation mirrors
 * AffiliateApplyReq in @heropips/contracts (keep bounds in sync): errors are
 * per-field, announced inline, and the first invalid control gets focus.
 * Audience size is a radio-chip group — all five brackets visible, one tap —
 * instead of a dropdown.
 * ======================================================================= */

const AUDIENCE_SIZES = ["<1k", "1k-10k", "10k-50k", "50k-250k", "250k+"] as const;

type Values = {
  name: string;
  email: string;
  channel: string;
  audience_size: string;
  geo: string;
  note: string;
};

type FieldKey = Exclude<keyof Values, "note">;

const EMPTY: Values = { name: "", email: "", channel: "", audience_size: "", geo: "", note: "" };

/** Submit-order of required fields — drives "focus the first invalid". */
const FIELD_ORDER: readonly FieldKey[] = ["name", "email", "channel", "audience_size", "geo"];

/** DOM id of the focusable control for each field. */
const FOCUS_ID: Record<FieldKey, string> = {
  name: "af-name",
  email: "af-email",
  channel: "af-channel",
  audience_size: "af-audience-0",
  geo: "af-geo",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v: Values): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  if (v.name.trim().length < 2) errors.name = "Add your name — at least 2 characters.";
  if (!EMAIL_RE.test(v.email.trim())) errors.email = "Enter a valid email — our reply goes there.";
  if (v.channel.trim().length < 2) errors.channel = "Add the link where your audience lives.";
  if (!(AUDIENCE_SIZES as readonly string[]).includes(v.audience_size)) errors.audience_size = "Pick the closest bracket.";
  if (v.geo.trim().length < 2) errors.geo = "Tell us where your audience mostly is.";
  return errors;
}

const AlertIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="7.5" x2="12" y2="13" />
    <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export function ApplyForm() {
  const [values, setValues] = React.useState<Values>(EMPTY);
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<FieldKey, string>>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const doneHeadRef = React.useRef<HTMLHeadingElement>(null);

  // The form unmounts on success — move focus so keyboard/SR users land on the confirmation.
  React.useEffect(() => {
    if (done) doneHeadRef.current?.focus();
  }, [done]);

  function setField<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    // Reward early: a field clears its error the moment it's edited.
    if (key !== "note" && fieldErrors[key as FieldKey]) {
      setFieldErrors((e) => ({ ...e, [key]: undefined }));
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const errors = validate(values);
    setFieldErrors(errors);
    const firstInvalid = FIELD_ORDER.find((k) => errors[k]);
    if (firstInvalid) {
      document.getElementById(FOCUS_ID[firstInvalid])?.focus();
      return;
    }

    setPending(true);
    const note = values.note.trim();
    const body = {
      name: values.name.trim(),
      email: values.email.trim(),
      channel: values.channel.trim(),
      audience_size: values.audience_size,
      geo: values.geo.trim(),
      ...(note ? { note } : {}),
    };
    try {
      const res = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        track("affiliate_apply", { audience_size: values.audience_size });
        setDone(true);
        return;
      }
      const data = await res.json().catch(() => null);
      setServerError(
        data?.error_code === "rate_limited"
          ? "Too many requests — wait a minute and try again."
          : data?.message ?? "Something went wrong. Check the fields and try again.",
      );
    } catch {
      setServerError("Network error — check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  /* --------------------------------------------------------- confirmation */
  if (done) {
    return (
      <Card raised className={styles.formCard} role="status">
        <div>
          <Badge tone="profit" style={{ marginBottom: 16 }}>Application received</Badge>
          <h3 ref={doneHeadRef} tabIndex={-1} style={{ fontSize: "var(--text-2xl)", marginBottom: 10, outline: "none" }}>
            You&apos;re in the review queue.
          </h3>
          <p style={{ color: "var(--text-mid)", lineHeight: "var(--leading-body)" }}>
            We reply to <strong style={{ color: "var(--text-hi)", fontWeight: "var(--weight-semibold)" }}>{values.email.trim()}</strong> within
            72 hours — worth a peek at spam the first time.
          </p>
        </div>
        <hr className={styles.asideDivider} style={{ margin: 0 }} />
        <div>
          <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", marginBottom: "var(--sp-2)" }}>
            While you wait: your personal referral code works today, no approval needed.
          </p>
          <Link href="/early-access" className="hp-arrow-link">Get your referral code <span aria-hidden="true">→</span></Link>
        </div>
      </Card>
    );
  }

  /* ----------------------------------------------------------------- form */
  return (
    <Card raised className={styles.formCard}>
      <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: "var(--sp-5)" }}>
        <Kicker>Marketer platform · application</Kicker>

        <div className={styles.formRow}>
          <FormField label="Name" htmlFor="af-name" error={fieldErrors.name}>
            <Input
              id="af-name"
              name="name"
              autoComplete="name"
              maxLength={80}
              placeholder="Ada Trader"
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
              disabled={pending}
              invalid={Boolean(fieldErrors.name)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "af-name-error" : undefined}
            />
          </FormField>
          <FormField label="Email" htmlFor="af-email" hint="Our reply and payout notices go here." error={fieldErrors.email}>
            <Input
              id="af-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              placeholder="you@channel.com"
              value={values.email}
              onChange={(e) => setField("email", e.target.value)}
              disabled={pending}
              invalid={Boolean(fieldErrors.email)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "af-email-error" : undefined}
            />
          </FormField>
        </div>

        <FormField
          label="Channel URL"
          htmlFor="af-channel"
          hint="Telegram, YouTube, Instagram, X, Discord or your site — wherever your audience is."
          error={fieldErrors.channel}
        >
          <Input
            id="af-channel"
            name="channel"
            inputMode="url"
            maxLength={200}
            placeholder="https://t.me/yourchannel"
            value={values.channel}
            onChange={(e) => setField("channel", e.target.value)}
            disabled={pending}
            invalid={Boolean(fieldErrors.channel)}
            aria-invalid={Boolean(fieldErrors.channel)}
            aria-describedby={fieldErrors.channel ? "af-channel-error" : undefined}
          />
        </FormField>

        <fieldset
          className={styles.fieldset}
          disabled={pending}
          aria-describedby={fieldErrors.audience_size ? "af-audience-error" : undefined}
        >
          <legend className={styles.legend}>Audience size</legend>
          <div className={styles.chipGroup}>
            {AUDIENCE_SIZES.map((s, i) => (
              <label key={s} className={styles.chipLabel}>
                <input
                  id={`af-audience-${i}`}
                  className={styles.chipInput}
                  type="radio"
                  name="audience_size"
                  value={s}
                  checked={values.audience_size === s}
                  onChange={() => setField("audience_size", s)}
                />
                {s}
              </label>
            ))}
          </div>
          {fieldErrors.audience_size ? (
            <div id="af-audience-error" role="alert" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--loss-400)", marginTop: "var(--sp-2)" }}>
              {fieldErrors.audience_size}
            </div>
          ) : (
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)", marginTop: "var(--sp-2)" }}>
              Rough total across your channels — honest beats big.
            </div>
          )}
        </fieldset>

        <FormField
          label="Main geography"
          htmlFor="af-geo"
          hint="Where most of your audience is — e.g. MENA, SEA, LatAm, Global."
          error={fieldErrors.geo}
        >
          <Input
            id="af-geo"
            name="geo"
            maxLength={80}
            placeholder="e.g. MENA"
            value={values.geo}
            onChange={(e) => setField("geo", e.target.value)}
            disabled={pending}
            invalid={Boolean(fieldErrors.geo)}
            aria-invalid={Boolean(fieldErrors.geo)}
            aria-describedby={fieldErrors.geo ? "af-geo-error" : undefined}
          />
        </FormField>

        <FormField
          label="Anything we should know (optional)"
          htmlFor="af-note"
          hint="Audience focus, past partnerships, content style — anything that helps the review."
        >
          <textarea
            id="af-note"
            name="note"
            className={styles.textarea}
            maxLength={1000}
            rows={4}
            placeholder="We run a 12k-member futures community focused on risk management…"
            value={values.note}
            onChange={(e) => setField("note", e.target.value)}
            disabled={pending}
          />
        </FormField>

        {serverError && (
          <div role="alert" className={styles.formError}>
            {AlertIcon}
            <span>{serverError}</span>
          </div>
        )}

        <div className={styles.formFoot}>
          <Button type="submit" variant="volt" size="lg" disabled={pending} aria-busy={pending} busy={pending}>
            {pending ? "Sending…" : "Apply to partner"}
          </Button>
          <span className={styles.formFootNote}>72-hour human review · no spam, ever</span>
        </div>
      </form>
    </Card>
  );
}
