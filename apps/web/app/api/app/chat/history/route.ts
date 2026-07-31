import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, IDENTITY_URL, pickSearch, sessionSubject } from "@/app/api/app/_lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await enforce(req, ...scoped("app:chat:history", POLICY.authedRead, await sessionSubject()));
  if (limited) return limited;
  return forward(req, IDENTITY_URL, "/v1/chat/history", { search: pickSearch(req, ["cursor", "limit"]) });
}
