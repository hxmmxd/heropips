import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ButtonLink, Kicker } from "@heropips/ui";
import { getSession } from "@/lib/session";
import { loadProgress } from "@/app/api/academy/_lib";
import { SITE_URL } from "@/lib/content";
import { TRACKS } from "@/lib/academy/curriculum";
import { Certificate } from "@/components/academy/Certificate";
import { ShareRow } from "@/components/academy/ShareRow";
import { XpHud } from "@/components/academy/XpHud";
import { PrintButton } from "@/components/academy/member/MemberAcademyClient";
import { EmptyMark } from "@/components/app/icons";

export const metadata: Metadata = { title: "Certificates" };
export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const user = await getSession();
  if (!user) redirect("/app/login");
  const progress = await loadProgress(user);
  const trackNames: Record<string, string> = Object.fromEntries(TRACKS.map((t) => [t.id, t.name]));

  return (
    <>
      <XpHud />
      {progress.certificates.length === 0 ? (
        <div className="ap-panel">
          <div className="ap-empty">
            <EmptyMark />
            <Kicker>proof · verifiable</Kicker>
            <h2 className="ap-empty-title">Finish a level to mint your first certificate</h2>
            <p>
              Every level ends in a claimable certificate — plus the Hero Trader grand certificate
              for the full path. Each one carries a public code anyone can verify.
            </p>
            <ButtonLink variant="volt" size="sm" href="/app/academy">
              Back to Academy
            </ButtonLink>
          </div>
        </div>
      ) : (
        progress.certificates.map((cert) => {
          const verifyUrl = `${SITE_URL}/academy/verify/${cert.code}`;
          const trackName = trackNames[cert.track] ?? cert.track;
          return (
            <section key={cert.code} aria-label={trackName} style={{ display: "grid", gap: "var(--sp-3)" }}>
              <Certificate cert={cert} verifyUrl={verifyUrl} />
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", flexWrap: "wrap" }}>
                <ShareRow
                  url={verifyUrl}
                  text={`Verified: ${trackName} — HeroPips Academy. Check the code yourself: `}
                  label="Share"
                />
                <PrintButton />
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
