import { z } from "zod";
import { bodyLimit, validationFailed } from "@/app/api/_lib/bff";
import { enforce, POLICY, scoped } from "@/app/api/_lib/rate-limit";
import { forward, IDENTITY_URL, sessionSubject } from "@/app/api/app/_lib/proxy";
import { requireSameOrigin } from "@/app/api/_lib/origin";

export const dynamic = "force-dynamic";

const PasswordChangeReq = z.object({
  current_password: z.string().min(1).max(200),
  new_password: z.string().min(10).max(200),
});

export async function POST(req: Request) {
  const forbidden = requireSameOrigin(req);
  if (forbidden) return forbidden;
  // Identity runs scrypt N=2^15 TWICE per call (verify + rehash) — ~32 MiB and
  // ~100 ms of the identity container each. This is the tightest limit in the BFF.
  const limited = await enforce(req, ...scoped("app:me:password", POLICY.passwordChange, await sessionSubject()));
  if (limited) return limited;
  const oversized = bodyLimit(req);
  if (oversized) return oversized;
  const body = await req.json().catch(() => null);
  const parsed = PasswordChangeReq.safeParse(body);
  if (!parsed.success) return validationFailed("New password must be at least 10 characters.");
  return forward(req, IDENTITY_URL, "/v1/me/password", { method: "POST", body: parsed.data });
}
