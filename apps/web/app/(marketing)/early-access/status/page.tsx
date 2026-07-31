import type { Metadata } from "next";
import { EarlyAccessStatusRes, REFERRALS_PER_JUMP, JUMP_SIZE } from "@heropips/contracts";
import { Badge, Card, Disclaimer, Eyebrow, Kicker, ProgressBar } from "@heropips/ui";
import { growth } from "@/lib/api";
import { ShareRow } from "@/components/convert/ShareRow";
import { CopyButton } from "@/components/convert/CopyButton";
import { Breadcrumbs } from "@/components/seo/JsonLd";
import type { Crumb } from "@/components/seo/graph";
import styles from "../early-access.module.css";

export const metadata: Metadata = {
  title: "Early access status",
  description: "Track your HeroPips early access position and referral progress.",
  alternates: { canonical: "/early-access/status" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Early access", path: "/early-access" },
  { name: "Early access status", path: "/early-access/status" },
];

function ErrorCard() {
  return (
    <div className="container section" style={{ maxWidth: 560 }}>
      <Breadcrumbs items={CRUMBS} />
      <Card raised style={{ padding: "clamp(24px, 4vw, 40px)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <Badge tone="loss">Invalid link</Badge>
        <h1 style={{ fontSize: "var(--text-3xl)" }}>That status link doesn&apos;t check out.</h1>
        <p style={{ color: "var(--text-mid)" }}>
          The token is missing, expired, or was edited. Rejoin with the same email — you keep your
          place and get a fresh link.
        </p>
        <a href="/early-access" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", fontWeight: "var(--weight-semibold)" }}>
          Back to early access →
        </a>
      </Card>
    </div>
  );
}

export default async function EarlyAccessStatusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  if (!token) return <ErrorCard />;

  let status: EarlyAccessStatusRes;
  try {
    status = await growth.get(`/v1/early-access/status?token=${encodeURIComponent(token)}`, EarlyAccessStatusRes);
  } catch {
    return <ErrorCard />;
  }

  const toward = status.referrals_verified % REFERRALS_PER_JUMP;
  const remaining = REFERRALS_PER_JUMP - toward;

  return (
    <div className="container section" style={{ maxWidth: 680 }}>
      <Breadcrumbs items={CRUMBS} />
      <Eyebrow>Early access status</Eyebrow>
      <h1 style={{ marginTop: "var(--sp-3)", fontSize: "clamp(var(--text-3xl), 4.4vw, var(--text-5xl))" }}>
        Hold your spot, {status.email_masked}
      </h1>

      <Card raised style={{ marginTop: "var(--sp-8)", padding: "clamp(24px, 4vw, 40px)", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--sp-4)", flexWrap: "wrap" }}>
          <span
            className="mono"
            style={{
              fontSize: "clamp(var(--text-5xl), 9vw, var(--text-7xl))",
              fontWeight: "var(--weight-semibold)",
              lineHeight: 1,
              color: "var(--volt-400)",
              letterSpacing: "-0.02em",
            }}
          >
            #{status.position}
          </span>
          <span style={{ color: "var(--text-mid)" }}>
            of <span className="mono" style={{ color: "var(--text-hi)" }}>{status.total}</span> in line
          </span>
        </div>

        {/* where you are on the journey */}
        <ol className={styles.next} aria-label="Your early access journey">
          <li className={styles.nextRow}>
            <span className={styles.nextMark} aria-hidden="true" style={{ background: "var(--volt-400)" }} />
            <span className={styles.nextLabel}>Done</span>
            <span>Place claimed — your spot in the launch line is locked.</span>
          </li>
          <li className={styles.nextRow} data-state="now">
            <span className={styles.nextMark} aria-hidden="true" />
            <span className={styles.nextLabel}>Now</span>
            <span>Move up the line — every {REFERRALS_PER_JUMP} verified friends is {JUMP_SIZE} places.</span>
          </li>
          <li className={styles.nextRow}>
            <span className={styles.nextMark} aria-hidden="true" />
            <span className={styles.nextLabel}>Then</span>
            <span>Cohort invite by email. Or skip the line with a <a href="/founding">Founding Hero seat</a>.</span>
          </li>
        </ol>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--sp-4)" }}>
          <div>
            <Kicker>Verified referrals</Kicker>
            <div className="mono" style={{ fontSize: "var(--text-2xl)", color: "var(--text-hi)", fontWeight: "var(--weight-semibold)" }}>
              {status.referrals_verified}
            </div>
          </div>
          <div>
            <Kicker>Queue jumps earned</Kicker>
            <div className="mono" style={{ fontSize: "var(--text-2xl)", color: "var(--text-hi)", fontWeight: "var(--weight-semibold)" }}>
              {status.jumps} <span style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>× {JUMP_SIZE} places</span>
            </div>
          </div>
          <div>
            <Kicker>Progress to next jump</Kicker>
            <div className="mono" style={{ fontSize: "var(--text-2xl)", color: "var(--text-hi)", fontWeight: "var(--weight-semibold)" }}>
              {toward}/{REFERRALS_PER_JUMP}
            </div>
            <ProgressBar
              value={toward}
              max={REFERRALS_PER_JUMP}
              label={`${toward} of ${REFERRALS_PER_JUMP} verified referrals toward your next queue jump`}
              style={{ margin: "var(--sp-2) 0" }}
            />
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>
              {remaining} more verified {remaining === 1 ? "friend" : "friends"} = {JUMP_SIZE} places up
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <Kicker tone="volt">Your code</Kicker>
          <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", flexWrap: "wrap" }}>
            <code
              style={{
                fontSize: "var(--text-xl)",
                fontWeight: "var(--weight-semibold)",
                color: "var(--text-hi)",
                background: "var(--surface-3)",
                border: "1px solid var(--border-2)",
                borderRadius: "var(--r-sm)",
                padding: "8px 16px",
                letterSpacing: "0.08em",
              }}
            >
              {status.code}
            </code>
            <CopyButton text={status.code} label="Copy code" />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <Kicker>Share your link</Kicker>
          <ShareRow code={status.code} />
        </div>

        <Disclaimer />
      </Card>
    </div>
  );
}
