"use client";

import * as React from "react";
import Link from "next/link";
import { ACADEMY_LIVE, ACADEMY_XP } from "@heropips/contracts";
import { ProgressBar } from "@heropips/ui";
import { ShareRow } from "@/components/academy/ShareRow";
import { CopyButton } from "@/components/academy/member/MemberAcademyClient";

const ORIGIN_FALLBACK = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heropips.com";

/** Reward wording for a ladder tier — lifetime when months is null. */
function tierReward(months: number | null): string {
  return months === null ? "Hero Council for life" : `+${months} months of Hero Council`;
}

/**
 * Referral card — link sharing (both sides earn REFERRAL_BONUS) plus the
 * qualified-referral ladder from ACADEMY_LIVE: an invitee qualifies when
 * they complete Level QUALIFIED_REFERRAL_LEVEL.
 */
export function ReferralCard({
  referralCode,
  referralsQualified,
}: {
  referralCode: string;
  referralsQualified: number;
}) {
  const [origin, setOrigin] = React.useState(ORIGIN_FALLBACK);
  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const url = `${origin}/academy?ref=${referralCode}`;
  const tiers = ACADEMY_LIVE.REFERRAL_TIERS;
  const nextTier = tiers.find((t) => referralsQualified < t.at) ?? null;

  return (
    <section className="ap-panel" aria-label="Invite a friend" style={{ display: "grid", gap: "var(--sp-3)" }}>
      <div className="ap-panel-head">
        <h2 className="ap-panel-title">Invite a friend</h2>
      </div>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)", lineHeight: "var(--leading-body)" }}>
        +{ACADEMY_XP.REFERRAL_BONUS} XP for you and every friend who joins.
      </p>
      <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", flexWrap: "wrap" }}>
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            color: "var(--text-mid)",
            background: "var(--surface-2)",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-sm)",
            padding: "var(--sp-2) var(--sp-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {url}
        </code>
        <CopyButton text={url} />
      </div>
      <ShareRow
        url={url}
        text={`Learning to trade properly on HeroPips Academy — join me, we both earn ${ACADEMY_XP.REFERRAL_BONUS} XP: `}
        label="Share your link"
      />
      <div
        style={{
          borderTop: "1px solid var(--border-1)",
          paddingTop: "var(--sp-3)",
          display: "grid",
          gap: "var(--sp-2)",
        }}
      >
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-hi)" }}>
          <strong className="num">{referralsQualified}</strong> qualified{" "}
          {referralsQualified === 1 ? "referral" : "referrals"} — invitees who reached Level{" "}
          {ACADEMY_LIVE.QUALIFIED_REFERRAL_LEVEL}
        </p>
        {nextTier ? (
          <>
            <ProgressBar
              value={referralsQualified}
              max={nextTier.at}
              label={`${referralsQualified} of ${nextTier.at} qualified referrals to the next tier`}
            />
            <p className="ap-note num">
              {nextTier.at - referralsQualified} more to unlock {tierReward(nextTier.months)}
            </p>
          </>
        ) : (
          <p className="ap-note">Top tier reached — Hero Council is yours for life.</p>
        )}
        <div style={{ display: "grid", gap: "var(--sp-1)" }}>
          {tiers.map((tier) => {
            const hit = referralsQualified >= tier.at;
            return (
              <div
                key={tier.at}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "var(--sp-3)",
                  fontSize: "var(--text-sm)",
                  color: hit ? "var(--volt-400)" : "var(--text-mid)",
                }}
              >
                <span className="num">{tier.at} qualified</span>
                <span>{tierReward(tier.months)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="ap-note">
        Earning real commissions? <Link href="/affiliates">Apply to affiliates →</Link>
      </p>
    </section>
  );
}
