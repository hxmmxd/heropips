import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isRedeemable, OrderStatusRes } from "@heropips/contracts";
import { Kicker } from "@heropips/ui";
import { billing } from "@/lib/api";
import { getSession } from "@/lib/session";
import { RedeemForm } from "@/components/app/AuthForms";
import { AuthRail } from "@/components/app/AuthRail";

export const metadata: Metadata = { title: "Redeem access" };
export const dynamic = "force-dynamic";

/**
 * The order-status HMAC token is the good prefill source: it is the handle the
 * buyer already holds (checkout redirect + every order email), and resolving it
 * server-side fills BOTH fields billing matches on — order id and the email the
 * seat is locked to. Typing either one by hand is where this flow used to die,
 * because a mistyped email surfaces as "access code not recognized".
 */
async function resolveOrder(token: string | undefined): Promise<OrderStatusRes | null> {
  if (!token) return null;
  try {
    const order = await billing.get(`/v1/founding/status?token=${encodeURIComponent(token)}`, OrderStatusRes);
    return isRedeemable(order.payment_status) ? order : null;
  } catch {
    return null; // expired or edited token — fall back to a blank form
  }
}

export default async function RedeemPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; email?: string; token?: string; next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/app");
  const { code, email, token, next } = await searchParams;
  const order = await resolveOrder(token);

  return (
    <>
      <AuthRail
        title="One code. Lifetime access."
        lede="Your Founding order id is your access code. Redeem it once and the seat is permanently yours — no subscription, no renewal, no seat to lose."
        points={[
          ["Desk funded on arrival", "A $10,000 paper account is provisioned before your first screen renders."],
          ["Every Pro feature, included", "3 broker connections, 50 scored signals a day, 20 Trade Guard rules."],
          ["Founding, permanently", "Badge, lounge and every Academy level — locked to this seat, not to a plan."],
        ]}
      />
      <div className="ap-auth-card">
        <div className="ap-auth-head">
          <Kicker tone="volt">founding · lifetime</Kicker>
          <h1 className="ap-auth-title">Claim your Founding seat</h1>
          <p className="ap-auth-lede">
            One-time setup: turn your Founding order into a lifetime member account.
          </p>
        </div>
        <RedeemForm
          defaultCode={order?.order_id ?? code}
          defaultEmail={order?.email ?? email}
          verifiedOrder={order !== null}
          next={next}
        />
      </div>
    </>
  );
}
