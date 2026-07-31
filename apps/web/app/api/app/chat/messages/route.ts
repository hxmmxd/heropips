import { ChatPostReq } from "@heropips/contracts";
import { BODY_LIMIT, bodyLimit, validationFailed } from "@/app/api/_lib/bff";
import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, IDENTITY_URL, sessionSubject } from "@/app/api/app/_lib/proxy";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, ...scoped("app:chat:post", POLICY.chatPost, await sessionSubject()));
  if (limited) return limited;
  const oversized = bodyLimit(req, BODY_LIMIT.chat);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = ChatPostReq.safeParse(body);
  if (!parsed.success) return validationFailed("Message must be 1–2000 characters.");
  return forward(req, IDENTITY_URL, "/v1/chat/messages", { method: "POST", body: parsed.data });
}
