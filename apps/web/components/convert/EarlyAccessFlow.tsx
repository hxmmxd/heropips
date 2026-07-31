"use client";

import * as React from "react";
import {
  EA_CODE_LENGTH,
  JUMP_SIZE,
  REFERRALS_PER_JUMP,
  type ApiError,
  type EarlyAccessCodeRes,
  type EarlyAccessJoinRes,
  type TraderProfile,
} from "@heropips/contracts";
import { Badge, Button, ButtonLink, Card, Disclaimer, Input, Kicker } from "@heropips/ui";
import { CodeInput } from "./CodeInput";
import { FormField } from "./FormField";
import { ShareRow } from "./ShareRow";
import { CopyButton } from "./CopyButton";
import styles from "@/app/(marketing)/early-access/early-access.module.css";
import { track } from "@/lib/analytics";

/* =========================================================================
 * EarlyAccessFlow — email-first, code-verified signup.
 *
 *   0        email        → POST /api/early-access/code (sends the 6-digit code)
 *   1..4     trader profile, every question skippable
 *   5        the code     → POST /api/early-access/verify (claims the place)
 *
 * Why the questions sit BETWEEN the two calls: the code is already flying
 * while they're answered, so the wait costs nothing and the profile is
 * attached to the same write that creates the entry. A returning address
 * skips the questions entirely — it answered them the first time.
 * ======================================================================= */

type SingleKey = "experience" | "terminology";
type MultiKey = "markets" | "platforms";

type Question =
  | {
      kind: "single";
      key: SingleKey;
      title: string;
      hint: string;
      options: ReadonlyArray<{ value: NonNullable<TraderProfile[SingleKey]>; label: string }>;
    }
  | {
      kind: "multi";
      key: MultiKey;
      title: string;
      hint: string;
      options: ReadonlyArray<{ value: NonNullable<TraderProfile[MultiKey]>[number]; label: string }>;
    };

const QUESTIONS: readonly Question[] = [
  {
    kind: "single",
    key: "experience",
    title: "Have you traded before?",
    hint: "Tap one — it tunes your invite and your first lessons.",
    options: [
      { value: "first_time", label: "First time" },
      { value: "under_1y", label: "Under a year" },
      { value: "1_3y", label: "1–3 years" },
      { value: "3y_plus", label: "3+ years" },
    ],
  },
  {
    kind: "multi",
    key: "markets",
    title: "What do you trade?",
    hint: "Pick any that apply — or skip if you're brand new.",
    options: [
      { value: "forex", label: "Forex" },
      { value: "crypto", label: "Crypto" },
      { value: "stocks", label: "Stocks" },
      { value: "indices", label: "Indices" },
      { value: "commodities", label: "Commodities" },
    ],
  },
  {
    kind: "multi",
    key: "platforms",
    title: "Where do you trade?",
    hint: "We prioritize broker connections people actually use.",
    options: [
      { value: "mt4_mt5", label: "MT4 / MT5" },
      { value: "binance", label: "Binance" },
      { value: "kucoin", label: "KuCoin" },
      { value: "tradingview", label: "TradingView" },
      { value: "other", label: "Somewhere else" },
    ],
  },
  {
    kind: "single",
    key: "terminology",
    title: "Pips, lots, stop-loss?",
    hint: "How familiar is the language? No wrong answer.",
    options: [
      { value: "fluent", label: "Fluent" },
      { value: "getting_there", label: "Getting there" },
      { value: "new_to_me", label: "New to me" },
    ],
  },
] as const;

const EMAIL_STEP = 0;
const FIRST_QUESTION = 1;
const CODE_STEP = QUESTIONS.length + 1;
const STEP_COUNT = CODE_STEP + 1;

const TickIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="4 12.5 9.5 18 20 6.5" />
  </svg>
);

/** Strip empty answers; returns undefined when nothing was answered. */
function cleanProfile(profile: TraderProfile): TraderProfile | undefined {
  const out: TraderProfile = {};
  if (profile.experience) out.experience = profile.experience;
  if (profile.terminology) out.terminology = profile.terminology;
  if (profile.markets && profile.markets.length > 0) out.markets = profile.markets;
  if (profile.platforms && profile.platforms.length > 0) out.platforms = profile.platforms;
  return Object.keys(out).length > 0 ? out : undefined;
}

async function postJson<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const err = json as ApiError | null;
      return { ok: false, error: err?.message ?? "That didn't go through. Try again." };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}

export function EarlyAccessFlow({ defaultRef, nextPosition }: { defaultRef?: string; nextPosition: number }) {
  const [step, setStep] = React.useState(EMAIL_STEP);
  const [profile, setProfile] = React.useState<TraderProfile>({});
  const [email, setEmail] = React.useState("");
  const [ref, setRef] = React.useState((defaultRef ?? "").toUpperCase());
  const [refOpen, setRefOpen] = React.useState(Boolean(defaultRef));
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<EarlyAccessCodeRes | null>(null);
  const [resendIn, setResendIn] = React.useState(0);
  const [result, setResult] = React.useState<EarlyAccessJoinRes | null>(null);

  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const advanceTimer = React.useRef<number | undefined>(undefined);
  const mounted = React.useRef(false);

  // Move focus with the step so keyboard and screen-reader users travel too.
  React.useEffect(() => {
    if (mounted.current) titleRef.current?.focus();
    mounted.current = true;
  }, [step]);

  React.useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  // Resend cooldown ticker.
  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  function goTo(next: number) {
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = undefined;
    setError(null);
    setStep(Math.max(0, Math.min(STEP_COUNT - 1, next)));
  }

  function pickSingle(key: SingleKey, value: NonNullable<TraderProfile[SingleKey]>) {
    setProfile((p) => ({ ...p, [key]: p[key] === value ? undefined : value }));
    // Auto-advance: one tap should feel like one step. Brief beat so the
    // selection is visible; cancelled if the user taps again or navigates.
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = undefined;
      setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
    }, 220);
  }

  function toggleMulti(key: MultiKey, value: string) {
    setProfile((p) => {
      const current = (p[key] ?? []) as string[];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...p, [key]: next as TraderProfile[MultiKey] };
    });
  }

  /* ------------------------------------------------- step 0 → send the code */
  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setBusy(true);
    const res = await postJson<EarlyAccessCodeRes>("/api/early-access/code", { email: address });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSent(res.data);
    setResendIn(res.data.resend_in);
    track("early_access_code_sent");
    goTo(FIRST_QUESTION);
  }

  async function resend() {
    if (resendIn > 0 || busy) return;
    setBusy(true);
    setError(null);
    const res = await postJson<EarlyAccessCodeRes>("/api/early-access/code", { email: email.trim() });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSent(res.data);
    setCode("");
    setResendIn(res.data.resend_in);
  }

  /* ---------------------------------------------- step 5 → claim the place */
  const submit = React.useCallback(
    async (entered: string) => {
      if (busy) return;
      setError(null);
      setBusy(true);
      const body: Record<string, unknown> = { email: email.trim(), code: entered };
      const refCode = ref.trim().toUpperCase();
      if (/^[A-Z0-9]{4,12}$/.test(refCode)) body.ref = refCode;
      const cleaned = cleanProfile(profile);
      if (cleaned) body.profile = cleaned;

      const res = await postJson<EarlyAccessJoinRes>("/api/early-access/verify", body);
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        setCode("");
        return;
      }
      setResult(res.data);
      track("early_access_join", {
        position: res.data.position,
        referred: Boolean(body.ref),
        duplicate: res.data.duplicate,
      });
    },
    [busy, email, profile, ref],
  );

  /* ============================================================== claimed */
  if (result) {
    const profiled = cleanProfile(profile) !== undefined;
    return (
      <Card raised className={styles.flowCard} aria-live="polite">
        <div>
          <Badge tone="volt">{result.duplicate ? "Welcome back" : "Place claimed"}</Badge>
          <div className={styles.claimNum}>#{result.position}</div>
          <div style={{ color: "var(--text-mid)", marginTop: "var(--sp-2)" }}>
            of{" "}
            <span className="mono" style={{ color: "var(--text-hi)" }}>
              {result.total.toLocaleString("en-US")}
            </span>{" "}
            in the early access line. Email verified.
          </div>
        </div>

        <ol className={styles.next}>
          <li className={styles.nextRow} data-state="now">
            <span className={styles.nextMark} aria-hidden="true" />
            <span className={styles.nextLabel}>Now</span>
            <span>
              {profiled
                ? "Profile saved — your invite and first lessons are tuned to how you trade."
                : "Your numbered place is locked and can only move up."}
            </span>
          </li>
          <li className={styles.nextRow}>
            <span className={styles.nextMark} aria-hidden="true" />
            <span className={styles.nextLabel}>Next</span>
            <span>
              Share your code — every {REFERRALS_PER_JUMP} verified friends moves you up {JUMP_SIZE} places.
            </span>
          </li>
          <li className={styles.nextRow}>
            <span className={styles.nextMark} aria-hidden="true" />
            <span className={styles.nextLabel}>Then</span>
            <span>Your cohort invite lands by email. Founding Heroes skip the line today.</span>
          </li>
        </ol>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <Kicker tone="volt">Your referral code</Kicker>
          <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", flexWrap: "wrap" }}>
            <code className={styles.codeChip}>{result.code}</code>
            <CopyButton text={result.code} label="Copy code" />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <Kicker>Share your link</Kicker>
          <ShareRow code={result.code} />
        </div>

        <a
          href={`/early-access/status?token=${encodeURIComponent(result.status_token)}`}
          style={{ fontSize: "var(--text-sm)", minHeight: 44, display: "inline-flex", alignItems: "center" }}
        >
          Track your position and referral progress →
        </a>

        <div
          style={{
            borderTop: "1px solid var(--border-1)",
            paddingTop: "var(--sp-5)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--sp-3)",
          }}
        >
          <Kicker tone="volt">Or stop waiting</Kicker>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)", lineHeight: "var(--leading-body)" }}>
            The platform is live right now for 500 Founding Hero lifetime members. That is the only way
            in before the public launch — and the seats never come back.
          </div>
          <ButtonLink href="/founding" variant="volt" size="md" style={{ alignSelf: "flex-start" }}>
            See the 500 seats →
          </ButtonLink>
        </div>

        <Disclaimer />
      </Card>
    );
  }

  /* =============================================================== wizard */
  const question = step >= FIRST_QUESTION && step < CODE_STEP ? QUESTIONS[step - FIRST_QUESTION] : null;

  const summary: Array<{ label: string; jumpTo: number }> = [];
  QUESTIONS.forEach((q, i) => {
    if (q.kind === "single") {
      const picked = q.options.find((o) => o.value === profile[q.key]);
      if (picked) summary.push({ label: picked.label, jumpTo: FIRST_QUESTION + i });
    } else {
      const values = profile[q.key] ?? [];
      if (values.length > 0) {
        const labels = q.options.filter((o) => (values as string[]).includes(o.value)).map((o) => o.label);
        summary.push({ label: labels.join(" + "), jumpTo: FIRST_QUESTION + i });
      }
    }
  });

  const liveMessage = busy
    ? "Working…"
    : step === EMAIL_STEP
      ? "Step 1: your email"
      : question
        ? `Question ${step} of ${QUESTIONS.length}: ${question.title}`
        : `Last step: enter the ${EA_CODE_LENGTH}-digit code we emailed you`;

  return (
    <Card raised className={styles.flowCard}>
      <div className={styles.flowHead}>
        <Kicker tone="volt">Free · ~60 seconds</Kicker>
        <div className={styles.progress} aria-hidden="true">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <span
              key={i}
              className={styles.progressSeg}
              data-state={i < step ? "done" : i === step ? "active" : undefined}
            />
          ))}
        </div>
      </div>

      <div
        aria-live="polite"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}
      >
        {liveMessage}
      </div>

      {/* ------------------------------------------------------ step 0: email */}
      {step === EMAIL_STEP && (
        <form onSubmit={sendCode} noValidate className={styles.step} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
          <div>
            <div className={styles.stepMeta}>Step 1 of 3 · your email</div>
            <h2 ref={titleRef} tabIndex={-1} className={styles.stepTitle}>
              Claim place #{nextPosition.toLocaleString("en-US")}.
            </h2>
            <p className={styles.stepHint}>
              We send a {EA_CODE_LENGTH}-digit code to confirm the address. Your place is held the moment
              you enter it.
            </p>
          </div>

          <FormField label="Email" htmlFor="ea-email" error={error}>
            <Input
              id="ea-email"
              name="email"
              type="email"
              autoComplete="email"
              enterKeyHint="send"
              required
              autoFocus
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              invalid={Boolean(error)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "ea-email-error" : undefined}
            />
          </FormField>

          {refOpen ? (
            <FormField label="Referral code" htmlFor="ea-ref" hint="Optional — starts you further up the line.">
              <Input
                id="ea-ref"
                name="ref"
                mono
                placeholder="HERO1234"
                value={ref}
                onChange={(e) => setRef(e.target.value.toUpperCase())}
                disabled={busy}
                maxLength={12}
                style={{ textTransform: "uppercase" }}
              />
            </FormField>
          ) : (
            <button type="button" className={styles.ghostBtn} style={{ alignSelf: "flex-start" }} onClick={() => setRefOpen(true)}>
              + Add a referral code
            </button>
          )}

          <Button type="submit" variant="volt" size="lg" disabled={busy} aria-busy={busy} busy={busy}>
            {busy ? "Sending code…" : "Send my code →"}
          </Button>

          <div className={styles.footNote}>No spam. Invite emails only. Unsubscribe in one click.</div>
          <Disclaimer />
        </form>
      )}

      {/* ------------------------------------------------ steps 1–4: profile */}
      {question && (
        <div className={styles.step} key={question.key}>
          <div className={styles.stepMeta}>
            Step 2 of 3 · {step}/{QUESTIONS.length} · optional
          </div>
          <h2 ref={titleRef} tabIndex={-1} className={styles.stepTitle}>
            {question.title}
          </h2>
          <p className={styles.stepHint}>{question.hint}</p>

          <div className={styles.chipGrid} role="group" aria-label={question.title}>
            {question.kind === "single"
              ? question.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={styles.chip}
                    aria-pressed={profile[question.key] === o.value}
                    onClick={() => pickSingle(question.key, o.value)}
                  >
                    <span className={styles.chipTick} aria-hidden="true">
                      {TickIcon}
                    </span>
                    {o.label}
                  </button>
                ))
              : question.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={styles.chip}
                    aria-pressed={((profile[question.key] ?? []) as string[]).includes(o.value)}
                    onClick={() => toggleMulti(question.key, o.value)}
                  >
                    <span className={styles.chipTick} aria-hidden="true">
                      {TickIcon}
                    </span>
                    {o.label}
                  </button>
                ))}
          </div>

          <div className={styles.controls}>
            <button type="button" className={styles.ghostBtn} onClick={() => goTo(step - 1)}>
              ← Back
            </button>
            <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
              <button type="button" className={styles.ghostBtn} onClick={() => goTo(CODE_STEP)}>
                Skip to code
              </button>
              <Button type="button" variant="volt" size="md" onClick={() => goTo(step + 1)}>
                Continue →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- step 5: the code */}
      {step === CODE_STEP && (
        <div className={styles.step} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
          <div>
            <div className={styles.stepMeta}>Step 3 of 3 · verify</div>
            <h2 ref={titleRef} tabIndex={-1} className={styles.stepTitle}>
              Enter the code.
            </h2>
            <p className={styles.stepHint}>
              The last step. Your place is claimed the second the {EA_CODE_LENGTH} digits match.
            </p>
          </div>

          <div className={styles.sentTo}>
            <span>
              Sent to <strong>{sent?.email_masked ?? email}</strong>
            </span>
            <button type="button" className={styles.ghostBtn} style={{ minHeight: 32, padding: "0 6px" }} onClick={() => goTo(EMAIL_STEP)}>
              Change
            </button>
          </div>

          {sent?.dev_code && (
            <div className={styles.devHint} role="note">
              <span>Dev mode — the fixed code is</span>
              <b>{sent.dev_code}</b>
            </div>
          )}

          <FormField label={`${EA_CODE_LENGTH}-digit code`} htmlFor="ea-code" error={error}>
            <CodeInput
              id="ea-code"
              label={`${EA_CODE_LENGTH}-digit verification code`}
              length={EA_CODE_LENGTH}
              value={code}
              onChange={setCode}
              onComplete={submit}
              disabled={busy}
              invalid={Boolean(error)}
              describedBy={error ? "ea-code-error" : undefined}
              autoFocus
            />
          </FormField>

          {summary.length > 0 && (
            <div className={styles.summary} aria-label="Your answers — select one to edit" role="group">
              {summary.map((s) => (
                <button key={s.jumpTo} type="button" className={styles.summaryChip} onClick={() => goTo(s.jumpTo)}>
                  {s.label}
                  <span aria-hidden="true">✎</span>
                </button>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="volt"
            size="lg"
            disabled={busy || code.length < EA_CODE_LENGTH}
            aria-busy={busy}
            busy={busy}
            onClick={() => submit(code)}
          >
            {busy ? "Claiming…" : `Claim place #${nextPosition.toLocaleString("en-US")} →`}
          </Button>

          <div className={styles.controls} style={{ marginTop: 0 }}>
            <button type="button" className={styles.ghostBtn} onClick={resend} disabled={resendIn > 0 || busy}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
            <span className={styles.footNote}>Check spam if it&apos;s slow.</span>
          </div>

          <Disclaimer />
        </div>
      )}
    </Card>
  );
}
