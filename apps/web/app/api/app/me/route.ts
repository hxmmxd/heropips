import { z } from "zod";
import { bodyLimit, validationFailed } from "@/app/api/_lib/bff";
import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, IDENTITY_URL, sessionSubject } from "@/app/api/app/_lib/proxy";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

const MePatchReq = z.object({ display_name: z.string().trim().min(2).max(40) });

export async function GET(req: Request) {
  const limited = await enforce(req, ...scoped("app:me", POLICY.authedRead, await sessionSubject()));
  if (limited) return limited;
  return forward(req, IDENTITY_URL, "/v1/me");
}

export async function PATCH(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  const limited = await enforce(req, ...scoped("app:me:patch", POLICY.authedWrite, await sessionSubject()));
  if (limited) return limited;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = MePatchReq.safeParse(body);
  if (!parsed.success) return validationFailed("Display name must be 2–40 characters.");
  return forward(req, IDENTITY_URL, "/v1/me", { method: "PATCH", body: parsed.data });
}
