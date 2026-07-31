import type { Metadata } from "next";
import { PositionsRes } from "@heropips/contracts";
import { Disclaimer } from "@heropips/ui";
import { serviceGet, TRADING_URL } from "@/lib/session";
import { PositionsLive } from "@/components/app/PositionsLive";

export const metadata: Metadata = { title: "Positions" };
export const dynamic = "force-dynamic";

export default async function PositionsPage() {
  const { positions } = await serviceGet(TRADING_URL, "/v1/positions", PositionsRes);

  return (
    <>
      <PositionsLive initial={positions} />
      <Disclaimer>
        Marks refresh every 5 seconds while this tab is visible. Paper positions run against live market marks
        and are always labeled Paper.
      </Disclaimer>
    </>
  );
}
