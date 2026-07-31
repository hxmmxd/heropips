"use client";

/* =========================================================================
 * QuickCheck — one-question comprehension card rendered mid-lesson.
 * No XP, no persistence, no gating: instant feedback on a single pick,
 * with retry left open until the reader lands the right answer. Kept
 * visually quieter than the graded quiz (see .ac-check in academy.css).
 * ======================================================================= */

import * as React from "react";
import type { QuizQuestion } from "@/lib/academy/curriculum";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export function QuickCheck({ check }: { check: QuizQuestion }) {
  const [chosen, setChosen] = React.useState<number | null>(null);
  const answered = chosen !== null;
  const correct = answered && chosen === check.answer;

  return (
    <div className="ac-check">
      <div className="ac-check-tag">Quick check</div>
      <p className="ac-check-q">{check.q}</p>
      <div className="ac-check-options" role="group" aria-label="Quick check answers">
        {check.options.map((opt, i) => {
          const state = !answered
            ? "idle"
            : chosen === i
              ? correct
                ? "correct"
                : "wrong"
              : "dim";
          return (
            <button
              key={opt}
              type="button"
              className="ac-check-option"
              data-state={state}
              aria-pressed={chosen === i}
              disabled={correct}
              onClick={() => setChosen(i)}
            >
              <span className="ac-check-key" aria-hidden="true">{OPTION_KEYS[i] ?? "?"}</span>
              {opt}
            </button>
          );
        })}
      </div>
      {answered ? (
        <p className="ac-check-explain" data-tone={correct ? "right" : "wrong"} role="status">
          <strong>{correct ? "Right." : "Not quite — try another answer."}</strong> {check.explain}
        </p>
      ) : null}
    </div>
  );
}
