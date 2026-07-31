"use client";

/* =========================================================================
 * QuizBlock — lesson quiz state machine.
 *   answering → answered (reveal + explain) → … → result (score + XP)
 * Gating inside the block, in order: loading skeleton → already-completed
 * card → anonymous claim wall → tier unlock panel → questions.
 * XP flows only through store.completeLesson (once per first completion);
 * retakes are practice — the store never double-awards.
 * ======================================================================= */

import * as React from "react";
import { ACADEMY_XP } from "@heropips/contracts";
import { Button, ButtonLink, Skeleton } from "@heropips/ui";
import { unlockCta } from "@/lib/academy/access";
import type { QuizQuestion } from "@/lib/academy/curriculum";
import { completeLesson, type CompleteResult } from "@/lib/academy/store";
import { fmtXp } from "@/lib/academy/xp";
import { useAcademy } from "./AcademyProvider";
import { ClaimWall } from "./ClaimWall";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

type QuizLesson = {
  slug: string;
  title: string;
  quiz: QuizQuestion[];
  xp: number;
  access: "open" | "member" | "pro";
};

export function QuizBlock({
  lesson,
  nextHref,
  nextTitle,
}: {
  lesson: QuizLesson;
  nextHref?: string;
  nextTitle?: string;
}) {
  const snap = useAcademy();
  const total = lesson.quiz.length;

  const [index, setIndex] = React.useState(0);
  const [chosen, setChosen] = React.useState<number | null>(null);
  const [results, setResults] = React.useState<boolean[]>([]);
  const [finished, setFinished] = React.useState(false);
  const [practice, setPractice] = React.useState(false);
  const [award, setAward] = React.useState<CompleteResult | null>(null);
  const submittedRef = React.useRef(false);

  const score = results.reduce((n, hit) => n + (hit ? 1 : 0), 0);

  /* Submit exactly once, on the first finish of this mount. */
  React.useEffect(() => {
    if (!finished || submittedRef.current) return;
    submittedRef.current = true;
    void completeLesson(lesson.slug, score, total).then(setAward);
  }, [finished, lesson.slug, score, total]);

  if (total === 0) return null;

  /* ---------- gating ---------- */

  if (snap.status === "loading") {
    return (
      <div className="ac-quiz" aria-busy="true" aria-label="Loading quiz" role="status">
        <Skeleton style={{ height: "1em", width: "38%" }} />
        <Skeleton style={{ height: "9em" }} />
      </div>
    );
  }

  const done = snap.completions[lesson.slug];
  if (done && !practice && !finished) {
    return (
      <div className="ac-quiz">
        <div className="ac-quiz-result" role="status">
          <div className="ac-quiz-score">{done.score}/{done.total}</div>
          <p>Completed. XP is earned once — retake any time for practice.</p>
          <Button variant="outline" size="sm" onClick={() => setPractice(true)}>
            Retake for practice
          </Button>
          {nextHref ? (
            <ButtonLink href={nextHref} variant="volt">
              {nextTitle ? `Next: ${nextTitle} →` : "Next lesson →"}
            </ButtonLink>
          ) : null}
        </div>
      </div>
    );
  }

  if (snap.status === "anon" && snap.wallActive && !done) {
    return <ClaimWall variant="wall" />;
  }

  if (lesson.access !== "open" && snap.status !== "member") {
    const cta = unlockCta(lesson.access);
    return (
      <div className="ac-wall">
        <h3>Unlock this quiz</h3>
        <p>{cta.sub}</p>
        <ButtonLink href={cta.href} variant="volt">{cta.label}</ButtonLink>
      </div>
    );
  }

  /* ---------- result ---------- */

  const resetRun = () => {
    setIndex(0);
    setChosen(null);
    setResults([]);
    setFinished(false);
  };

  if (finished) {
    const perfect = score === total;
    const gained = award ? award.awarded + award.streakBonus : 0;
    return (
      <div className="ac-quiz">
        <div className="ac-quiz-result" role="status" aria-live="polite">
          <div className="ac-quiz-score">{score}/{total}</div>
          {gained > 0 ? <span className="ac-xp-award">+{fmtXp(gained)} XP</span> : null}
          {perfect && award && award.awarded > 0 ? (
            <p>Perfect — +{ACADEMY_XP.QUIZ_PERFECT_BONUS} bonus</p>
          ) : null}
          {award?.alreadyDone ? <p>Practice run — XP is earned once.</p> : null}
          <Button variant="outline" size="sm" onClick={resetRun}>Retake quiz</Button>
          <p>XP is earned once; retakes are practice.</p>
          {nextHref ? (
            <ButtonLink href={nextHref} variant="volt">
              {nextTitle ? `Next: ${nextTitle} →` : "Next lesson →"}
            </ButtonLink>
          ) : null}
        </div>
      </div>
    );
  }

  /* ---------- answering ---------- */

  const q = lesson.quiz[index];
  const answered = chosen !== null;
  const last = index + 1 >= total;

  return (
    <section className="ac-quiz" aria-label={`Quiz — ${lesson.title}`}>
      <div className="ac-quiz-progress" role="img" aria-label={`Question ${index + 1} of ${total}`}>
        {lesson.quiz.map((_, d) => (
          <i
            key={d}
            className="ac-quiz-dot"
            data-state={
              d < results.length ? (results[d] ? "right" : "wrong") : d === index ? "current" : undefined
            }
          />
        ))}
      </div>
      <p className="ac-quiz-q">{q.q}</p>
      <div className="ac-options">
        {q.options.map((option, oi) => (
          <button
            key={oi}
            type="button"
            className="ac-option"
            disabled={answered}
            data-state={
              answered ? (oi === q.answer ? "correct" : oi === chosen ? "wrong" : "dim") : undefined
            }
            onClick={() => {
              setChosen(oi);
              setResults((prev) => [...prev, oi === q.answer]);
            }}
          >
            <span className="ac-option-key" aria-hidden="true">{OPTION_KEYS[oi]}</span>
            <span>{option}</span>
          </button>
        ))}
      </div>
      {answered ? (
        <>
          <p className="ac-quiz-explain">{q.explain}</p>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (last) {
                  setFinished(true);
                } else {
                  setIndex(index + 1);
                  setChosen(null);
                }
              }}
            >
              {last ? "See result" : "Next question"}
            </Button>
          </div>
        </>
      ) : null}
      <div className="ac-sr" aria-live="polite">
        {answered ? (chosen === q.answer ? "Correct." : "Not quite.") : ""}
      </div>
    </section>
  );
}
