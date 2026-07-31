import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, IDENTITY_URL, sessionSubject } from "@/app/api/app/_lib/proxy";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, ...scoped("app:sessions:revoke", POLICY.authedWrite, await sessionSubject()));
  if (limited) return limited;
  const { id } = await ctx.params;
  return forward(req, IDENTITY_URL, `/v1/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
}
