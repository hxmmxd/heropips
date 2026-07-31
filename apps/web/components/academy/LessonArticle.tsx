/* =========================================================================
 * LessonArticle — server-rendered lesson body shared by the marketing lesson
 * pages and the member player (/app/academy/learn/[slug]).
 *   full=true  → every section, interactive, glossary, quiz, share row.
 *   full=false → hero + first section inside the .ac-gate fade + unlock
 *                panel with the lesson outline (SEO + honesty).
 * ======================================================================= */

import Link from "next/link";
import { Badge, ButtonLink, Disclaimer, Eyebrow, Kicker } from "@heropips/ui";
import { ACADEMY_XP } from "@heropips/contracts";
import { tierLabel, unlockCta } from "@/lib/academy/access";
import { adjacentLessons, findLevel, type Lesson, type LessonSection } from "@/lib/academy/curriculum";
import { SITE_URL } from "@/lib/content";
import { Figure } from "./diagrams";
import { QuickCheck } from "./QuickCheck";
import { QuizBlock } from "./QuizBlock";
import { ShareRow } from "./ShareRow";
import { LessonInteractive } from "./interactive/LessonInteractive";

function SectionBlock({ s }: { s: LessonSection }) {
  return (
    <section>
      <h2>{s.h}</h2>
      {s.paras.map((p) => (
        <p key={p.slice(0, 32)} style={{ marginTop: "var(--sp-3)" }}>{p}</p>
      ))}
      {s.figure ? <Figure kind={s.figure.kind} caption={s.figure.caption} /> : null}
      {s.table ? (
        <div className="ac-table-wrap" style={{ marginTop: "var(--sp-4)" }}>
          <table className="ac-table">
            <caption>{s.table.caption}</caption>
            <thead>
              <tr>
                {s.table.head.map((h) => (
                  <th key={h} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.table.rows.map((row) => (
                <tr key={row.join("|")}>
                  {row.map((cell, ci) => (
                    <td key={`${ci}-${cell}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {s.callout ? (
        <aside className="ac-callout" data-tone={s.callout.tone} style={{ marginTop: "var(--sp-4)" }}>
          <div className="ac-callout-title">{s.callout.title}</div>
          <p>{s.callout.body}</p>
        </aside>
      ) : null}
      {s.check ? <QuickCheck check={s.check} /> : null}
    </section>
  );
}

export function LessonArticle({ lesson, full, appHref }: { lesson: Lesson; full: boolean; appHref?: string }) {
  const level = findLevel(lesson.level);
  const tier = tierLabel(lesson.access);
  const cta = unlockCta(lesson.access);
  const { next } = adjacentLessons(lesson.slug);
  const nn = String(lesson.number).padStart(2, "0");

  return (
    <>
      <header className="ac-lesson-hero">
        {level ? (
          <div className="ac-lesson-eyebrow">
            <Eyebrow>Level {level.number} — {level.name}</Eyebrow>
          </div>
        ) : null}
        <h1 style={{ maxWidth: 720 }}>{lesson.title}</h1>
        <div className="ac-lesson-eyebrow" style={{ marginTop: "var(--sp-4)", marginBottom: 0 }}>
          <Badge tone="volt">Lesson {nn}</Badge>
          <span className="ac-lock" data-tier={lesson.access === "open" ? "free" : lesson.access}>{tier}</span>
          <span className="mono" style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>
            {lesson.minutes} min · +{lesson.xp} XP · {lesson.quiz.length}-question quiz
          </span>
        </div>
      </header>

      {full ? (
        <div className="ac-prose">
          {lesson.sections.map((s) => (
            <SectionBlock key={s.h} s={s} />
          ))}

          {lesson.interactive ? (
            <section aria-labelledby="ac-try-h">
              <h2 id="ac-try-h">Try it</h2>
              <div style={{ marginTop: "var(--sp-4)" }}>
                <LessonInteractive interactive={lesson.interactive} />
              </div>
            </section>
          ) : null}

          <section aria-labelledby="ac-terms-h">
            <h2 id="ac-terms-h">Terms you now own</h2>
            <dl className="ac-terms" style={{ marginTop: "var(--sp-4)" }}>
              {lesson.terms.map((t) => (
                <div key={t.term} className="ac-term">
                  <dt>{t.term}</dt>
                  <dd>{t.def}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="ac-quiz-h">
            <h2 id="ac-quiz-h">Prove it</h2>
            <div style={{ marginTop: "var(--sp-4)" }}>
              <QuizBlock
                lesson={{ slug: lesson.slug, title: lesson.title, quiz: lesson.quiz, xp: lesson.xp, access: lesson.access }}
                nextHref={next ? `/academy/${next.slug}` : undefined}
                nextTitle={next ? next.title : undefined}
              />
            </div>
          </section>

          {level ? (
            <aside className="ac-live-note">
              <p>
                {`Every lesson you finish counts toward Level ${level.number}\u2019s live workshop — complete the level to unlock your seat. Finish all 10 levels and you graduate into the Hero Council: a monthly live market-update masterclass, free for your first 12 months.`}
              </p>
              <Link href="/academy#live-classes">How live classes work →</Link>
            </aside>
          ) : null}

          <ShareRow
            url={`${SITE_URL}/academy/${lesson.slug}`}
            text={`I just finished \u201C${lesson.title}\u201D on HeroPips Academy — ${lesson.xp} XP. Free from zero: `}
            label="Share it"
          />
        </div>
      ) : (
        <>
          <div className="ac-gate">
            <div className="ac-prose">
              <SectionBlock s={lesson.sections[0]} />
            </div>
          </div>

          <div className="ac-wall" style={{ marginTop: "var(--sp-6)" }}>
            <h3>This lesson is part of the {tier} tier</h3>
            <p>{cta.sub}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-3)", justifyContent: "center" }}>
              <ButtonLink variant={lesson.access === "pro" ? "pulse" : "volt"} href={cta.href}>{cta.label}</ButtonLink>
              {appHref ? (
                <ButtonLink variant="ghost" href={appHref}>Open in the app →</ButtonLink>
              ) : null}
            </div>
            <div style={{ textAlign: "left", justifySelf: "stretch", maxWidth: 480, margin: "0 auto" }}>
              <Kicker tone="volt" style={{ marginBottom: "var(--sp-2)" }}>Inside this lesson</Kicker>
              <ul style={{ margin: 0, paddingLeft: "var(--sp-5)", display: "grid", gap: "var(--sp-1)", color: "var(--text-mid)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>
                {lesson.sections.map((s) => (
                  <li key={s.h}>{s.h}</li>
                ))}
                <li>{lesson.terms.length} glossary terms · a {lesson.quiz.length}-question quiz worth up to +{lesson.quiz.length * ACADEMY_XP.QUIZ_CORRECT + ACADEMY_XP.QUIZ_PERFECT_BONUS} XP</li>
              </ul>
            </div>
          </div>
        </>
      )}

      <Disclaimer style={{ marginTop: "var(--sp-8)" }}>
        Education, not investment advice. Examples use simulated or historical prices; past
        performance does not predict future results. Trading involves substantial risk of loss.
      </Disclaimer>
    </>
  );
}
