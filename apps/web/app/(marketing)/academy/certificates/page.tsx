/* =========================================================================
 * Public certificate gallery — /academy/certificates.
 * Every one of the 11 credentials (Level 0-9 + Hero Trader) rendered as a
 * full-size draft-watermarked sample: see exactly what you earn before you
 * earn it. Server component; samples are static data, no growth calls.
 * ======================================================================= */

import type { Metadata } from "next";
import {
  ACADEMY_LESSONS,
  ACADEMY_LIVE,
  type AcademyCertRes,
} from "@heropips/contracts";
import { ButtonLink, Eyebrow, Kicker } from "@heropips/ui";
import { Certificate } from "@/components/academy/Certificate";
import { Breadcrumbs, JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  ORG_ID,
  pageGraph,
  siteNodes,
  webPageNode,
  type Crumb,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import { LEVELS, TRACKS, type TrackInfo } from "@/lib/academy/curriculum";
import { SITE_URL } from "@/lib/content";

const TITLE = "Certificates — see them before you earn them";
const DESCRIPTION =
  "All 11 HeroPips Academy certificates as draft samples — one per level plus the Hero Trader " +
  "grand credential, each with a public verification code.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/academy/certificates" },
  ...socialMeta(TITLE, DESCRIPTION, "/academy/certificates"),
};

/**
 * Sensible XP at issue for a sample: the maximum lesson + quiz + first-try
 * XP accumulated through the last lesson of the track (lessons are ordered
 * by level, so the slice is contiguous). Mirrors curriculumMaxLessonXp.
 */
function sampleXpAt(track: TrackInfo): number {
  const lastSlug = track.slugs[track.slugs.length - 1];
  const end = ACADEMY_LESSONS.findIndex((l) => l.slug === lastSlug);
  return ACADEMY_LESSONS.slice(0, end + 1).reduce((sum, l) => sum + l.xp + l.quiz * 10 + 20, 0);
}

const URL = abs("/academy/certificates");
const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Academy", path: "/academy" },
  { name: "Certificates", path: "/academy/certificates" },
];

export default function CertificatesGalleryPage() {
  const issuedAt = new Date().toISOString();

  return (
    <>
      <JsonLd data={pageGraph([
        ...siteNodes(),
        webPageNode({
          url: URL,
          name: TITLE,
          description: DESCRIPTION,
          breadcrumb: CRUMBS,
          type: "CollectionPage",
        }),
        {
          "@type": "ItemList",
          "@id": `${URL}#certificates`,
          name: "HeroPips Academy certificates",
          description: DESCRIPTION,
          numberOfItems: TRACKS.length,
          itemListElement: TRACKS.map((track, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "EducationalOccupationalCredential",
              "@id": `${URL}#track-${track.id}`,
              name: track.name,
              description: track.desc,
              credentialCategory: "certificate",
              recognizedBy: { "@id": ORG_ID },
              url: URL,
            },
          })),
        },
      ])} />

      <section className="section" style={{ background: "var(--grad-hero)" }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <Breadcrumbs items={CRUMBS} />
          <Eyebrow style={{ marginBottom: "var(--sp-4)" }}>HeroPips Academy</Eyebrow>
          <h1 style={{ maxWidth: 680, marginBottom: "var(--sp-4)" }}>
            See every certificate before you earn it
          </h1>
          <p
            style={{
              maxWidth: 620,
              fontSize: "var(--text-lg)",
              color: "var(--text-mid)",
              lineHeight: "var(--leading-body)",
            }}
          >
            Every level ends in a certificate with a public verification code. Here is exactly
            what you&apos;ll earn — draft-watermarked until it has your name on it.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 960, display: "grid", gap: "var(--sp-12)" }}>
          {TRACKS.map((track, i) => {
            const isGrand = track.id === "hero-trader";
            const cert: AcademyCertRes = {
              code: `HP-SAMPLE-000${i}`,
              track: track.id,
              recipient: "Your Name Here",
              issued_at: issuedAt,
              xp_at_issue: sampleXpAt(track),
            };
            const headingId = `cert-${track.id}`;

            return (
              <section
                key={track.id}
                aria-labelledby={headingId}
                style={{ display: "grid", gap: "var(--sp-4)" }}
              >
                <header style={{ display: "grid", gap: "var(--sp-2)" }}>
                  <Kicker>
                    {isGrand ? "The full path · Levels 0-9" : `Level ${i} · ${LEVELS[i].name}`}
                  </Kicker>
                  <h2 id={headingId} style={{ margin: 0 }}>
                    {track.name}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      maxWidth: "60ch",
                      color: "var(--text-mid)",
                      lineHeight: "var(--leading-body)",
                    }}
                  >
                    {track.desc}
                  </p>
                </header>

                <Certificate
                  cert={cert}
                  verifyUrl={`${SITE_URL}/academy/verify/${cert.code}`}
                  draft
                />

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "var(--sp-4)",
                    justifyContent: "space-between",
                  }}
                >
                  <p style={{ margin: 0, color: "var(--text-mid)", fontSize: "var(--text-sm)" }}>
                    {isGrand
                      ? `Takes all ${track.slugs.length} lessons — every level, every quiz, plus the paper-trading capstone.`
                      : `Takes ${track.slugs.length} lesson${track.slugs.length === 1 ? "" : "s"} — finish each one and pass its quiz.`}
                  </p>
                  {isGrand ? (
                    <ButtonLink href="/academy">Earn it — start the path at Level 0</ButtonLink>
                  ) : (
                    <ButtonLink href={`/academy/${track.slugs[0]}`}>
                      Earn it — start Level {i}
                    </ButtonLink>
                  )}
                </div>

                {isGrand ? (
                  <p
                    style={{
                      margin: 0,
                      maxWidth: "60ch",
                      color: "var(--text-mid)",
                      fontSize: "var(--text-sm)",
                      lineHeight: "var(--leading-body)",
                      borderLeft: "2px solid var(--volt-500)",
                      paddingLeft: "var(--sp-4)",
                    }}
                  >
                    Completing all 10 levels also unlocks Hero Council — the monthly live
                    masterclass — free for {ACADEMY_LIVE.GRAD_FREE_MONTHS} months.
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      </section>
    </>
  );
}
