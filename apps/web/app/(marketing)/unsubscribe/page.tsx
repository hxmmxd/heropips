import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Eyebrow } from "@heropips/ui";
import { UnsubscribeRes } from "@heropips/contracts";
import { growth } from "@/lib/api";

export const metadata: Metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cardStyle: React.CSSProperties = {
  padding: "clamp(24px, 4vw, 40px)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-4)",
};

function InvalidCard() {
  return (
    <Card raised style={cardStyle}>
      <Badge tone="loss">Invalid link</Badge>
      <h1 style={{ fontSize: "var(--text-3xl)" }}>That unsubscribe link doesn&apos;t check out.</h1>
      <p style={{ color: "var(--text-mid)" }}>
        The link is missing its token, expired, or was edited in transit. Open the latest
        HeroPips email and use its unsubscribe link — or just reply to any HeroPips email
        and we&apos;ll sort it out.
      </p>
      <Link href="/" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", fontWeight: "var(--weight-semibold)" }}>
        Back to HeroPips →
      </Link>
    </Card>
  );
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  let result: UnsubscribeRes | null = null;
  if (token) {
    try {
      result = await growth.get(`/v1/messaging/unsubscribe?token=${encodeURIComponent(token)}`, UnsubscribeRes);
    } catch {
      result = null;
    }
  }

  return (
    <div className="container section" style={{ maxWidth: 560 }}>
      <Eyebrow style={{ marginBottom: 16 }}>Email preferences</Eyebrow>
      {result ? (
        <Card raised style={cardStyle} aria-live="polite">
          <Badge tone="volt">Done</Badge>
          <h1 style={{ fontSize: "var(--text-3xl)" }}>You&apos;re unsubscribed.</h1>
          <p style={{ color: "var(--text-mid)" }}>
            <span className="mono" style={{ color: "var(--text-hi)" }}>{result.email_masked}</span> will
            no longer receive lifecycle emails from HeroPips. Receipts and account security
            emails still arrive. Changed your mind? Just reply to any HeroPips email.
          </p>
          <Link href="/" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", fontWeight: "var(--weight-semibold)" }}>
            Back to HeroPips →
          </Link>
        </Card>
      ) : (
        <InvalidCard />
      )}
    </div>
  );
}
