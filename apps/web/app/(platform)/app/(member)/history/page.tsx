import type { Metadata } from "next";
import { TradesRes } from "@heropips/contracts";
import { Disclaimer } from "@heropips/ui";
import { serviceGet, TRADING_URL } from "@/lib/session";
import { TradesTable } from "@/components/app/TradesTable";

export const metadata: Metadata = { title: "History" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const { trades, next_cursor } = await serviceGet(TRADING_URL, "/v1/trades", TradesRes);

  return (
    <>
      <TradesTable initial={trades} initialCursor={next_cursor} />
      <Disclaimer>
        Realized PnL is net of fees, in USD. Paper trades run against live marks and are always labeled Paper.
      </Disclaimer>
    </>
  );
}
