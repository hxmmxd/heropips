import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Kicker } from "@heropips/ui";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/app/AuthForms";
import { AuthRail } from "@/components/app/AuthRail";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/app");
  const { next } = await searchParams;

  return (
    <>
      <AuthRail
        title="Your desk, exactly as you left it."
        lede="Overnight scoring is already done. Sign in and the workspace is on screen with the numbers resolved — no loading shell, no re-syncing."
        points={[
          ["Positions, reconciled", "Broker balances and open risk pulled server-side before the page paints."],
          ["Signals, scored", "Today's setups ranked, each one carrying the reasoning that produced it."],
          ["Trade Guard, enforced", "Your risk rules keep holding whether or not you were watching."],
        ]}
      />
      <div className="ap-auth-card">
        <div className="ap-auth-head">
          <Kicker>member access</Kicker>
          <h1 className="ap-auth-title">Welcome back, Hero</h1>
          <p className="ap-auth-lede">Sign in to your member workspace.</p>
        </div>
        <LoginForm next={next} />
      </div>
    </>
  );
}
