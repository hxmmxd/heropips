import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Kicker } from "@heropips/ui";
import { LessonArticle } from "@/components/academy/LessonArticle";
import { XpHud } from "@/components/academy/XpHud";
import { Breadcrumbs, JsonLd } from "@/components/seo/JsonLd";
import {
  abs,
  articleNode,
  ORG_ID,
  pageGraph,
  siteNodes,
  webPageId,
  webPageNode,
  type Crumb,
} from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";
import { tierLabel } from "@/lib/academy/access";
import { adjacentLessons, findLesson, findLevel, LESSONS_FULL } from "@/lib/academy/curriculum";

export function generateStaticParams() {
  return LESSONS_FULL.map((l) => ({ slug: l.slug }));
}

export const dynamicParams = false;

/** Meta description, clamped to 160 chars at a word boundary (SEO budget). */
function metaDescription(summary: string, minutes: number, xp: number): string {
  const tail = ` A ${minutes}-min lesson, +${xp} XP.`;
  const budget = 160 - tail.length;
  const trimmed =
    summary.length <= budget
      ? summary
      : `${summary.slice(0, budget - 1).replace(/\s+\S*$/, "")}…`;
  return trimmed + tail;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lesson = findLesson(slug);
  if (!lesson) return {};
  const nn = String(lesson.number).padStart(2, "0");
  const title = `${lesson.title} — Lesson ${nn}`;
  const description = metaDescription(lesson.summary, lesson.minutes, lesson.xp);
  return {
    title,
    description,
    alternates: { canonical: `/academy/${lesson.slug}` },
    ...socialMeta(title, description, `/academy/${lesson.slug}`, { ownOgImage: true }),
  };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = findLesson(slug);
  if (!lesson) notFound();
  const { prev, next } = adjacentLessons(lesson.slug);
  const open = lesson.access === "open";
  const level = findLevel(lesson.level);
  const url = abs(`/academy/${lesson.slug}`);
  const nn = String(lesson.number).padStart(2, "0");
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Academy", path: "/academy" },
    { name: lesson.title, path: `/academy/${lesson.slug}` },
  ];
  const wordCount = lesson.sections.reduce(
    (sum, s) => sum + s.paras.reduce((n, p) => n + p.split(/\s+/).length, 0),
    0,
  );

  return (
    <>
      <JsonLd data={pageGraph([
        ...siteNodes(),
        webPageNode({
          url,
          name: `${lesson.title} — Lesson ${nn}`,
          description: lesson.summary,
          breadcrumb: crumbs,
        }),
        articleNode({
          url,
          headline: `${lesson.title} — Lesson ${nn}`,
          description: lesson.summary,
          articleSection: level ? `Level ${level.number} — ${level.name}` : "HeroPips Academy",
          timeRequired: `PT${lesson.minutes}M`,
          wordCount,
        }),
        {
          "@type": "LearningResource",
          "@id": `${url}#lesson`,
          name: lesson.title,
          description: lesson.summary,
          url,
          inLanguage: "en",
          educationalLevel: level ? `Level ${level.number} — ${level.name}` : "Beginner",
          learningResourceType: "Lesson",
          teaches: lesson.terms.map((t) => t.term),
          timeRequired: `PT${lesson.minutes}M`,
          isAccessibleForFree: open,
          provider: { "@id": ORG_ID },
          author: { "@id": ORG_ID },
          mainEntityOfPage: { "@id": webPageId(url) },
          hasPart: {
            "@type": "Quiz",
            "@id": `${url}#quiz`,
            name: `${lesson.title} — ${lesson.quiz.length}-question quiz`,
            educationalLevel: level ? `Level ${level.number} — ${level.name}` : "Beginner",
            about: { "@id": `${url}#lesson` },
            numberOfQuestions: lesson.quiz.length,
            isAccessibleForFree: open,
            provider: { "@id": ORG_ID },
          },
        },
      ])} />

      <article className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <Breadcrumbs items={crumbs} />
          <div style={{ paddingTop: "var(--sp-6)" }}>
            <XpHud />
          </div>

          <LessonArticle
            lesson={lesson}
            full={open}
            appHref={open ? undefined : `/app/academy/learn/${lesson.slug}`}
          />

          <nav
            aria-label="Lesson navigation"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--sp-3)", marginTop: "var(--sp-8)" }}
          >
            {prev ? (
              <Link href={`/academy/${prev.slug}`} className="hp-card-link">
                <Card raised style={{ padding: "var(--sp-5)", height: "100%", display: "grid", gap: "var(--sp-2)", alignContent: "start" }}>
                  <Kicker>← Lesson {String(prev.number).padStart(2, "0")}</Kicker>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-semibold)", color: "var(--text-hi)" }}>{prev.title}</span>
                </Card>
              </Link>
            ) : null}
            {next ? (
              <Link href={`/academy/${next.slug}`} className="hp-card-link">
                <Card raised style={{ padding: "var(--sp-5)", height: "100%", display: "grid", gap: "var(--sp-2)", alignContent: "start", justifyItems: "end", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--sp-2)" }}>
                    {next.access !== "open" ? (
                      <span className="ac-lock" data-tier={next.access}>{tierLabel(next.access)}</span>
                    ) : null}
                    <Kicker>Lesson {String(next.number).padStart(2, "0")} →</Kicker>
                  </div>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-semibold)", color: "var(--text-hi)" }}>{next.title}</span>
                </Card>
              </Link>
            ) : null}
          </nav>
        </div>
      </article>
    </>
  );
}
