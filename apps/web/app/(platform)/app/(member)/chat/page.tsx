import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatHistoryRes } from "@heropips/contracts";
import { Disclaimer } from "@heropips/ui";
import { getSession, IDENTITY_URL, serviceGet } from "@/lib/session";
import { ChatRoom } from "@/components/app/ChatRoom";

export const metadata: Metadata = { title: "Founding Lounge" };
export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await getSession();
  if (!user) redirect("/app/login");
  const history = await serviceGet(IDENTITY_URL, "/v1/chat/history?limit=50", ChatHistoryRes);

  return (
    <>
      <ChatRoom initial={history.messages} ownUserId={user.id} />
      <Disclaimer>
        Member chat is not investment advice — from HeroPips or anyone in the room. Trade your own plan.
      </Disclaimer>
    </>
  );
}
