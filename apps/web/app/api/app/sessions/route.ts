import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, IDENTITY_URL, sessionSubject } from "@/app/api/app/_lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await enforce(req, ...scoped("app:sessions", POLICY.authedRead, await sessionSubject()));
  if (limited) return limited;
  return forward(req, IDENTITY_URL, "/v1/sessions");
}
