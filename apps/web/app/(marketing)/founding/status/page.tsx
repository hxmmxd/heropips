import type { Metadata } from "next";
import { OrderStatusRes } from "@heropips/contracts";
import { Badge, Card, Eyebrow } from "@heropips/ui";
import { billing } from "@/lib/api";
import { OrderStatusPanel } from "@/components/convert/OrderStatusPanel";
import { Breadcrumbs } from "@/components/seo/JsonLd";
import type { Crumb } from "@/components/seo/graph";

const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Founding Hero", path: "/founding" },
  { name: "Order status", path: "/founding/status" },
];

export const metadata: Metadata = {
  title: "Order status",
  description: "Track your HeroPips Founding Hero seat and crypto payment.",
  alternates: { canonical: "/founding/status" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function ErrorCard() {
  return (
    <div className="container section" style={{ maxWidth: 560 }}>
      <Breadcrumbs items={CRUMBS} />
      <Card raised style={{ padding: "clamp(24px, 4vw, 40px)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <Badge tone="loss">Invalid link</Badge>
        <h1 style={{ fontSize: "var(--text-3xl)" }}>That order link doesn&apos;t check out.</h1>
        <p style={{ color: "var(--text-mid)" }}>
          The token is missing, expired, or was edited. Check the link from your checkout
          confirmation, or reserve a seat again.
        </p>
        <a href="/founding" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", fontWeight: "var(--weight-semibold)" }}>
          Back to Founding Hero →
        </a>
      </Card>
    </div>
  );
}

export default async function FoundingStatusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  if (!token) return <ErrorCard />;

  let order: OrderStatusRes;
  try {
    order = await billing.get(`/v1/founding/status?token=${encodeURIComponent(token)}`, OrderStatusRes);
  } catch {
    return <ErrorCard />;
  }

  return (
    <div className="container section" style={{ maxWidth: 720 }}>
      <Breadcrumbs items={CRUMBS} />
      <Eyebrow>Founding Hero · Order</Eyebrow>
      <h1 style={{ marginTop: "var(--sp-3)", marginBottom: "var(--sp-8)", fontSize: "clamp(var(--text-3xl), 4.4vw, var(--text-5xl))" }}>
        Your seat, live.
      </h1>
      <OrderStatusPanel initial={order} token={token} />
    </div>
  );
}
