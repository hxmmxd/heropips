import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@heropips/ui";
import { getSession } from "@/lib/session";
import { adjacentLessons, findLesson, findLevel } from "@/lib/academy/curriculum";
import { unlockCta } from "@/lib/academy/access";
import { XpHud } from "@/components/academy/XpHud";
import { LessonArticle } from "@/components/academy/LessonArticle";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lesson = findLesson(slug);
  return { title: lesson ? `${lesson.title} — Academy` : "Academy" };
}

/**
 * Full lesson player behind the session. Members earn on open + member
 * tiers by default; pro lessons stay gated behind Founding Hero.
 */
export default async function LearnLessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = findLesson(slug);
  if (!lesson) notFound();

  const user = await getSession();
  const proLocked = lesson.access === "pro" && !(user?.founding ?? false);
  const level = findLevel(lesson.level);
  const lessonNo = String(lesson.number).padStart(2, "0");

  if (proLocked) {
    const cta = unlockCta("pro");
    return (
      <>
        <XpHud />
        <header className="ac-lesson-hero">
          <p className="ac-lesson-eyebrow">
            Level {level ? level.number : "—"} · Lesson {lessonNo} · Pro
          </p>
          <h1>{lesson.title}</h1>
          <p style={{ color: "var(--text-mid)", maxWidth: "68ch", lineHeight: "var(--leading-read)" }}>{lesson.summary}</p>
        </header>
        <section className="ac-wall" aria-label="Unlock this lesson">
          <h3>This is a Pro lesson</h3>
          <p>{cta.sub}</p>
          <ButtonLink variant="volt" href={cta.href}>
            {cta.label}
          </ButtonLink>
          <Link href="/app/academy" style={{ fontSize: "var(--text-sm)" }}>
            Back to Academy
          </Link>
        </section>
      </>
    );
  }

  const { prev, next } = adjacentLessons(lesson.slug);
  return (
    <>
      <XpHud />
      <LessonArticle lesson={lesson} full appHref={undefined} />
      <nav
        aria-label="Lesson navigation"
        style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", flexWrap: "wrap", paddingBottom: "var(--sp-6)" }}
      >
        {prev ? (
          <ButtonLink variant="ghost" size="sm" href={`/app/academy/learn/${prev.slug}`}>
            ← Lesson {String(prev.number).padStart(2, "0")}
          </ButtonLink>
        ) : null}
        <Link href="/app/academy" style={{ fontSize: "var(--text-sm)" }}>
          All lessons
        </Link>
        {next ? (
          <ButtonLink variant="ghost" size="sm" style={{ marginLeft: "auto" }} href={`/app/academy/learn/${next.slug}`}>
            Lesson {String(next.number).padStart(2, "0")}: {next.title} →
          </ButtonLink>
        ) : null}
      </nav>
    </>
  );
}
