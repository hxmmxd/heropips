import type { Metadata } from "next";
import { ConnectionsRes, PackageRes } from "@heropips/contracts";
import { Disclaimer } from "@heropips/ui";
import { IDENTITY_URL, serviceGet, TRADING_URL } from "@/lib/session";
import { ConnectionsManager } from "@/components/app/ConnectionsManager";

export const metadata: Metadata = { title: "Connect" };
export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const [{ connections }, pkg] = await Promise.all([
    serviceGet(TRADING_URL, "/v1/connections", ConnectionsRes),
    serviceGet(IDENTITY_URL, "/v1/me/package", PackageRes),
  ]);

  return (
    <>
      <ConnectionsManager initial={connections} limits={pkg.limits} />
      <Disclaimer>
        Your keys, your account, your trades. HeroPips never takes custody of funds — orders execute on your own
        broker under the Trade Guard rules you set.
      </Disclaimer>
    </>
  );
}
