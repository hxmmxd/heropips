import type { Metadata } from "next";
import Link from "next/link";
import { ACADEMY_LIVE } from "@heropips/contracts";
import { ButtonLink, Card, Disclaimer, Eyebrow, Kicker, OutlineWord } from "@heropips/ui";
import { ClaimWall } from "@/components/academy/ClaimWall";
import { LessonCheck, RailFill } from "@/components/academy/PathProgress";
import { XpHud } from "@/components/academy/XpHud";
import { EarlyAccessNote } from "@/components/marketing/EarlyAccessNote";
import { BreadcrumbsJsonLd, JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  ORG_ID,
  pageGraph,
  siteNodes,
  SITE_IMAGE,
  webPageNode,
  type Crumb,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import { tierLabel } from "@/lib/academy/access";
import {
  curriculumMaxLessonXp,
  LESSONS_FULL,
  LEVELS,
  TOTAL_LESSONS,
  TOTAL_MINUTES,
  TRACKS,
} from "@/lib/academy/curriculum";
import { fmtXp } from "@/lib/academy/xp";
import { SITE_URL } from "@/lib/content";

const TITLE = "Academy — learn trading from zero, free to start";
const DESCRIPTION =
  `HeroPips Academy: ${TOTAL_LESSONS} short lessons across ${LEVELS.length} levels — quizzes, XP, ` +
  `streaks, ${TRACKS.length} verifiable certificates and live classes. Free to start, no account needed.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/academy" },
  ...socialMeta(TITLE, DESCRIPTION, "/academy", { ownOgImage: true }),
};

const FIRST_LESSON = LESSONS_FULL[0];

const URL = abs("/academy");
const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Academy", path: "/academy" },
];

export default function AcademyHubPage() {
  return (
    <>
      <BreadcrumbsJsonLd crumbs={CRUMBS} />
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
          "@type": "Course",
          "@id": `${URL}#course`,
          name: "HeroPips Academy: Curious Trader to Confident Trader",
          description: DESCRIPTION,
          url: URL,
          image: SITE_IMAGE,
          inLanguage: "en",
          educationalLevel: "Beginner to advanced",
          provider: { "@id": ORG_ID },
          isAccessibleForFree: true,
          /* Google's Course Info requires `offers`; Level 0 genuinely costs
             nothing, so this is a real zero-price offer, not a placeholder. */
          offers: {
            "@type": "Offer",
            name: "HeroPips Academy — free to start",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            category: "Free",
            url: URL,
            seller: { "@id": ORG_ID },
          },
          teaches: LEVELS.map((level) => `Level ${level.number} — ${level.name}: ${level.tagline}`),
          hasCourseInstance: {
            "@type": "CourseInstance",
            "@id": `${URL}#course-instance`,
            courseMode: "Online",
            courseWorkload: `PT${TOTAL_MINUTES}M`,
            inLanguage: "en",
          },
          hasPart: LEVELS.map((level) => ({
            "@type": "Course",
            "@id": `${URL}#level-${level.id}`,
            name: `Level ${level.number} — ${level.name}`,
            description: level.tagline,
            url: URL,
            inLanguage: "en",
            provider: { "@id": ORG_ID },
            isAccessibleForFree: level.access === "open",
            hasPart: level.lessons.map((l) => ({
              "@type": "LearningResource",
              "@id": `${abs(`/academy/${l.slug}`)}#lesson`,
              name: l.title,
              description: l.summary,
              url: abs(`/academy/${l.slug}`),
              educationalLevel: `Level ${level.number} — ${level.name}`,
              learningResourceType: "Lesson",
              inLanguage: "en",
              timeRequired: `PT${l.minutes}M`,
            })),
          })),
        },
      ])} />

      <section className="section ac-hero" style={{ background: "var(--grad-hero)" }}>
        <div className="container">
          <Eyebrow style={{ marginBottom: "var(--sp-4)" }}>HeroPips Academy</Eyebrow>
          <h1 style={{ maxWidth: 720, marginBottom: "var(--sp-5)" }}>
            Curious trader to <OutlineWord>confident trader</OutlineWord>, one level at a time
          </h1>
          <p style={{ maxWidth: 640, fontSize: "var(--text-lg)", color: "var(--text-mid)", marginBottom: "var(--sp-6)" }}>
            Short, animated lessons take you from &ldquo;what is a market?&rdquo; to going live with
            rules that survive. Earn XP, keep streaks, pass quizzes, claim a verifiable certificate
            at every level — and unlock that level&rsquo;s monthly live workshop as you go. Free to
            start: your first lesson needs no account at all.
          </p>
          <div className="ac-hero-stats" style={{ marginBottom: "var(--sp-6)" }}>
            <span className="ac-stat-chip"><strong>{LEVELS.length}</strong> levels</span>
            <span className="ac-stat-chip"><strong>{TOTAL_LESSONS}</strong> lessons</span>
            <span className="ac-stat-chip"><strong>{TOTAL_MINUTES}</strong> min total</span>
            <span className="ac-stat-chip"><strong>{fmtXp(curriculumMaxLessonXp())}</strong> XP on the table</span>
            <span className="ac-stat-chip"><strong>{TRACKS.length}</strong> certificates</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-3)" }}>
            <ButtonLink variant="volt" href={`/academy/${FIRST_LESSON.slug}`}>Start Level 0 — free</ButtonLink>
            <ButtonLink variant="ghost" href="/academy/arcade">Play the arcade</ButtonLink>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="path-h">
        <div className="container">
          <XpHud />
          <ClaimWall variant="banner" />

          <h2 id="path-h" style={{ margin: "var(--sp-8) 0 var(--sp-8)" }}>
            The path: {LEVELS.length} levels, {TOTAL_LESSONS} lessons
          </h2>

          <ol className="ac-path" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {LEVELS.map((level) => (
              <li key={level.id} className="ac-level">
                <span className="ac-level-num" aria-hidden="true">{level.number}</span>
                <div className="ac-rail" aria-hidden="true">
                  <RailFill slugs={level.lessons.map((l) => l.slug)} />
                </div>
                <header className="ac-level-head">
                  <span className="ac-node" aria-hidden="true">{level.number}</span>
                  <h3 className="ac-level-name">{level.name}</h3>
                  <span className="ac-level-tag">{level.tagline}</span>
                  <span className="ac-lock" data-tier={level.access === "open" ? "free" : level.access}>
                    {tierLabel(level.access)}
                  </span>
                </header>
                <ol className="ac-lessons" style={{ listStyle: "none", margin: 0 }}>
                  {level.lessons.map((l) => (
                    <li key={l.slug}>
                      <Link href={`/academy/${l.slug}`} className="hp-card ac-lesson-card">
                        <LessonCheck slug={l.slug} />
                        <span className="ac-lesson-body">
                          <span className="ac-lesson-title">{l.title}</span>
                          <span className="ac-lesson-hook">{l.hook}</span>
                        </span>
                        <span className="ac-lesson-meta">
                          <span>{l.minutes} min · {l.quiz.length} Qs</span>
                          <span className="ac-lesson-xp">+{l.xp} XP</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="live-classes" className="section" style={{ paddingTop: 0 }} aria-labelledby="live-h">
        <div className="container">
          <h2 id="live-h" style={{ marginBottom: "var(--sp-3)" }}>Lessons unlock live classes</h2>
          <p style={{ maxWidth: 640, color: "var(--text-mid)", marginBottom: "var(--sp-6)", lineHeight: "var(--leading-body)" }}>
            Live classes are earned, not sold. Every level you finish unlocks a seat in that
            level&rsquo;s monthly live workshop — and finishing the whole path seats you at the
            Hero Council table.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--sp-4)" }}>
            <Card style={{ padding: "var(--sp-6)", display: "grid", gap: "var(--sp-2)", alignContent: "start" }}>
              <Kicker tone="volt">Per level</Kicker>
              <h3 style={{ fontSize: "var(--text-xl)" }}>Level workshops</h3>
              <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>
                Complete every lesson in a level and that level&rsquo;s monthly live workshop
                unlocks — a working session on exactly what the level taught, from reading candles
                to automation guardrails.
              </p>
            </Card>
            <Card style={{ padding: "var(--sp-6)", display: "grid", gap: "var(--sp-2)", alignContent: "start" }}>
              <Kicker tone="volt">Graduate</Kicker>
              <h3 style={{ fontSize: "var(--text-xl)" }}>Hero Council</h3>
              <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>
                Finish all {LEVELS.length} levels and the Hero Council unlocks: the monthly live
                masterclass on current markets, free for
                your first {ACADEMY_LIVE.GRAD_FREE_MONTHS} months as a graduate.
              </p>
            </Card>
            <Card style={{ padding: "var(--sp-6)", display: "grid", gap: "var(--sp-2)", alignContent: "start" }}>
              <Kicker tone="volt">Extend it</Kicker>
              <h3 style={{ fontSize: "var(--text-xl)" }}>The referral ladder</h3>
              <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>
                A referral qualifies when someone you invite completes
                Level {ACADEMY_LIVE.QUALIFIED_REFERRAL_LEVEL}. Qualified referrals extend your free
                Hero Council access: {ACADEMY_LIVE.REFERRAL_TIERS.map((t) =>
                  t.months === null ? `${t.at} referrals — lifetime` : `${t.at} referrals — +${t.months} months`,
                ).join(" · ")}.
              </p>
            </Card>
          </div>
          <p style={{ marginTop: "var(--sp-4)", maxWidth: 640, color: "var(--text-mid)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>
            We are in early access, so workshop and Hero Council schedules are announced to
            early-access members first — the unlocks you earn now are waiting when your cohort
            opens.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="certs-h">
        <div className="container">
          <h2 id="certs-h" style={{ marginBottom: "var(--sp-2)" }}>
            A certificate for every level — plus the Hero Trader grand certificate
          </h2>
          <p style={{ color: "var(--text-mid)", marginBottom: "var(--sp-6)", maxWidth: 640, lineHeight: "var(--leading-body)" }}>
            {TRACKS.length} certificates, all publicly verifiable. Finish a level to earn its
            certificate; finish all {LEVELS.length} levels to earn the grand one. The draft designs
            are public, so you can see exactly what you are working toward.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--sp-3)" }}>
            {TRACKS.map((t) => (
              <Link key={t.id} href="/academy/certificates" className="hp-card" style={{ padding: "var(--sp-4)", display: "grid", gap: "var(--sp-1)", alignContent: "start" }}>
                <Kicker tone="volt">{t.slugs.length} lessons</Kicker>
                <h3 style={{ fontSize: "var(--text-xl)" }}>{t.name}</h3>
              </Link>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-3)", alignItems: "center", marginTop: "var(--sp-6)" }}>
            <ButtonLink variant="volt" href="/academy/certificates">Preview every certificate (drafts) →</ButtonLink>
            <a className="hp-arrow-link" href="#verify-how">How verification works →</a>
          </div>
          <p id="verify-how" style={{ marginTop: "var(--sp-4)", maxWidth: 640, color: "var(--text-mid)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>
            Every certificate is issued against your actual lesson record and carries a unique code.
            Anyone can confirm it — no account needed — at {SITE_URL.replace("https://", "")}/academy/verify/&lt;code&gt;,
            which shows the holder, track and issue date straight from our records. No screenshots to trust.
          </p>

          <EarlyAccessNote style={{ marginTop: "var(--sp-8)" }} />
          <Disclaimer style={{ marginTop: "var(--sp-6)" }}>
            The academy teaches mechanics and risk concepts for educational purposes only. It is not
            investment advice, XP and certificates measure learning progress — not trading skill with
            real money — and completing lessons does not guarantee trading results. Trading involves
            substantial risk of loss.
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
