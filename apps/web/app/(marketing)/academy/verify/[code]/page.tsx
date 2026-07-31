/* =========================================================================
 * Public certificate verification — /academy/verify/[code].
 * Always 200: an invalid or expired share link still markets the academy
 * (deliberate — dead links get "not found" framing + robots noindex).
 * Network failure to growth degrades to the invalid framing, never a crash.
 * ======================================================================= */

import type { Metadata } from "next";
import { cache } from "react";
import { AcademyVerifyRes } from "@heropips/contracts";
import { Badge, ButtonLink, Card } from "@heropips/ui";
import { Certificate } from "@/components/academy/Certificate";
import { ShareRow } from "@/components/academy/ShareRow";
import { Breadcrumbs, JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  ORG_ID,
  pageGraph,
  personNode,
  siteNodes,
  webPageId,
  webPageNode,
  type Crumb,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import { growth } from "@/lib/api";
import { TRACKS } from "@/lib/academy/curriculum";

export const dynamic = "force-dynamic";

/** Growth verify is 200-always; anything else (down, malformed) → invalid. */
const getVerification = cache(async (code: string): Promise<AcademyVerifyRes> => {
  try {
    return await growth.get(`/v1/academy/certificates/verify/${encodeURIComponent(code)}`, AcademyVerifyRes);
  } catch {
    return { valid: false, certificate: null };
  }
});

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const { valid, certificate } = await getVerification(code);
  if (!valid || !certificate) {
    return {
      title: "Certificate not found",
      description:
        "This certificate code did not match our records. HeroPips Academy certificates are minted only by completed tracks.",
      robots: { index: false },
    };
  }
  const name = TRACKS.find((t) => t.id === certificate.track)?.name ?? "Academy";
  /* The academy layout owns the "· HeroPips Academy" suffix, so the title
     brands exactly once. Own OG copy too: without it every shared
     certificate previewed with the generic homepage card. */
  const title = `${certificate.recipient} — verified ${name}`;
  const issued = new Date(certificate.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const path = `/academy/verify/${certificate.code}`;
  const description = `Authentic HeroPips Academy credential ${certificate.code}, issued ${issued} to ${certificate.recipient}. Anyone can verify a certificate by its public code.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    ...socialMeta(title, description, path, { ownOgImage: true }),
  };
}

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { valid, certificate } = await getVerification(code);

  if (!valid || !certificate) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <h1 style={{ marginBottom: "var(--sp-3)" }}>Certificate not found</h1>
          <p
            className="mono"
            style={{ color: "var(--text-low)", fontSize: "var(--text-sm)", letterSpacing: "0.08em", marginBottom: "var(--sp-6)" }}
          >
            {code.slice(0, 40)}
          </p>
          <Card raised style={{ padding: "var(--sp-6)", display: "grid", gap: "var(--sp-3)", justifyItems: "start" }}>
            <p style={{ color: "var(--text-mid)", lineHeight: "var(--leading-body)", maxWidth: "52ch" }}>
              This code doesn&apos;t match any certificate in our records. Codes are minted only by
              completed tracks — every lesson finished, every quiz passed — so a mistyped or
              truncated link is the usual culprit. Check the code with whoever shared it.
            </p>
            <p style={{ color: "var(--text-mid)", lineHeight: "var(--leading-body)", maxWidth: "52ch" }}>
              Want one with your name on it? The academy starts from absolute zero, and Level 0 is
              free.
            </p>
            <ButtonLink href="/academy">Start Level 0 free</ButtonLink>
          </Card>
        </div>
      </section>
    );
  }

  const name = TRACKS.find((t) => t.id === certificate.track)?.name ?? "Academy";
  const verifyUrl = abs(`/academy/verify/${certificate.code}`);
  const issued = new Date(certificate.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Academy", path: "/academy" },
    { name: "Verified certificate", path: `/academy/verify/${certificate.code}` },
  ];
  const holderId = `${verifyUrl}#holder`;

  return (
    <>
      <JsonLd data={pageGraph([
        ...siteNodes(),
        webPageNode({
          url: verifyUrl,
          name: `${certificate.recipient} — ${name}`,
          description: `Authentic HeroPips Academy credential ${certificate.code}, issued ${issued} to ${certificate.recipient}.`,
          breadcrumb: crumbs,
          type: "ProfilePage",
        }),
        /* The whole point of the page is asserting WHO holds the credential —
           the only Person on the site whose name the platform actually holds. */
        personNode({ id: holderId, name: certificate.recipient }),
        {
          "@type": "EducationalOccupationalCredential",
          "@id": `${verifyUrl}#credential`,
          credentialCategory: "certificate",
          name,
          description: `HeroPips Academy ${name} credential, earned by completing every lesson and quiz in the track.`,
          recognizedBy: { "@id": ORG_ID },
          about: { "@id": holderId },
          credentialHolder: { "@id": holderId },
          dateCreated: certificate.issued_at,
          validFrom: certificate.issued_at,
          identifier: certificate.code,
          url: verifyUrl,
          mainEntityOfPage: { "@id": webPageId(verifyUrl) },
        },
      ])} />

      <section className="section">
        <div className="container" style={{ maxWidth: 920 }}>
          <Breadcrumbs items={crumbs} />
          <header style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", flexWrap: "wrap", marginBottom: "var(--sp-6)" }}>
            <h1 style={{ margin: 0 }}>Verified certificate</h1>
            <Badge tone="profit">VALID — issued {issued}</Badge>
          </header>

          <Certificate cert={certificate} verifyUrl={verifyUrl} />

          <div className="ac-no-print" style={{ display: "grid", gap: "var(--sp-6)", marginTop: "var(--sp-6)" }}>
            <ShareRow
              url={verifyUrl}
              text={`${certificate.recipient} earned the ${name} at HeroPips Academy — verify it yourself: `}
              label="Share this certificate"
            />

            <Card raised style={{ padding: "var(--sp-6)", display: "grid", gap: "var(--sp-3)", justifyItems: "start" }}>
              <h2 style={{ margin: 0, fontSize: "var(--text-xl)" }}>Earn yours — start free at Level 0</h2>
              <p style={{ color: "var(--text-mid)", lineHeight: "var(--leading-body)", maxWidth: "52ch" }}>
                Every certificate on this page was earned the same way: lesson by lesson, quiz by
                quiz, from absolute zero. No shortcuts to sell — just the curriculum.
              </p>
              <ButtonLink href="/academy">Start Level 0 free</ButtonLink>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
