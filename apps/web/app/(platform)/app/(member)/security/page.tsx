import type { Metadata } from "next";
import { AuditListRes, SessionsRes } from "@heropips/contracts";
import { IDENTITY_URL, serviceGet } from "@/lib/session";
import { AuditTable, PasswordForm, SessionsList } from "@/components/app/SecurityPanels";

export const metadata: Metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const [sessions, audit] = await Promise.all([
    serviceGet(IDENTITY_URL, "/v1/sessions", SessionsRes),
    serviceGet(IDENTITY_URL, "/v1/me/audit", AuditListRes),
  ]);

  return (
    <>
      <SessionsList initial={sessions.sessions} />
      <PasswordForm />
      <AuditTable initial={audit.entries} initialCursor={audit.next_cursor} />
    </>
  );
}
