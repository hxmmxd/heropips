"use client";

/* =========================================================================
 * RiskSizerGame — 5-round position sizing drill. Fixed formula, fresh
 * numbers every run: size (mini lots) = (equity × 1%) ÷ (stop pips × $1).
 * Win = 4/5 or better; XP flows through the shared store.
 * ======================================================================= */

import { useEffect, useRef, useState } from "react";
import { Button } from "@heropips/ui";
import { recordGame } from "@/lib/academy/store";

const EQUITIES = [5_000, 10_000, 25_000] as const;
const STOPS = [20, 25, 40, 50] as const;
const RISK_PCT = 0.01;
const PIP_VALUE = 1; // $ per pip per mini lot
const ROUNDS = 5;
const WIN_SCORE = 4;
const OPTION_KEYS = ["A", "B", "C", "D"];
const FEEDBACK_MS = 1200;

type DrillRound = {
  equity: number;
  stop: number;
  correct: number;
  options: number[];
};

function makeRound(): DrillRound {
  const equity = EQUITIES[Math.floor(Math.random() * EQUITIES.length)];
  const stop = STOPS[Math.floor(Math.random() * STOPS.length)];
  const correct = (equity * RISK_PCT) / (stop * PIP_VALUE);

  const pool = new Set<number>([correct, correct * 2, correct / 2]);
  // Off-by-stop distractor: same equity sized against a different stop.
  for (const other of STOPS) {
    if (pool.size >= 4) break;
    pool.add((equity * RISK_PCT) / (other * PIP_VALUE));
  }
  // Degenerate collisions (rare): pad with a ×4 variant.
  if (pool.size < 4) pool.add(correct * 4);

  const options = [...pool].slice(0, 4);
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { equity, stop, correct, options };
}

/** Server-and-hydration-stable round for the first paint; no Math.random. */
function deterministicRound(i: number): DrillRound {
  const equity = EQUITIES[i % EQUITIES.length];
  const stop = STOPS[i % STOPS.length];
  const correct = (equity * RISK_PCT) / (stop * PIP_VALUE);
  const pool = new Set<number>([correct, correct * 2, correct / 2]);
  for (const other of STOPS) {
    if (pool.size >= 4) break;
    pool.add((equity * RISK_PCT) / (other * PIP_VALUE));
  }
  if (pool.size < 4) pool.add(correct * 4);
  return { equity, stop, correct, options: [...pool].slice(0, 4) };
}

/** "2.5" not "2.50" — mini lots read cleanest without trailing zeros. */
function fmtLots(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}

export function RiskSizerGame() {
  const [rounds, setRounds] = useState<DrillRound[]>(() => Array.from({ length: ROUNDS }, (_, i) => deterministicRound(i)));
  const [roundIdx, setRoundIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Randomise only after mount. A `useState` initialiser runs on the server AND
  // again during hydration, and makeRound() is Math.random-driven, so the two
  // passes produced different equity/stop/option sets and React reported a
  // hydration mismatch. The first paint therefore ships a deterministic round.
  useEffect(() => {
    setRounds(Array.from({ length: ROUNDS }, makeRound));
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current ?? undefined);
    };
  }, []);

  const round = rounds[roundIdx];

  const pick = (value: number) => {
    if (picked !== null || done) return;
    setPicked(value);
    const newScore = score + (value === round.correct ? 1 : 0);
    setScore(newScore);

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (roundIdx + 1 >= ROUNDS) {
        setDone(true);
        void recordGame("risk-sizer", newScore >= WIN_SCORE, newScore);
      } else {
        setRoundIdx(roundIdx + 1);
        setPicked(null);
      }
    }, FEEDBACK_MS);
  };

  const reset = () => {
    clearTimeout(timerRef.current ?? undefined);
    timerRef.current = null;
    setRounds(Array.from({ length: ROUNDS }, makeRound));
    setRoundIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    return (
      <div className="ac-game">
        <div className="ac-quiz-result" aria-live="polite">
          <span className="ac-quiz-score">
            {score}/{ROUNDS}
          </span>
          <p className="ac-game-verdict-word" style={{ color: score >= WIN_SCORE ? "var(--profit-400)" : "var(--loss-400)" }}>
            {score >= WIN_SCORE ? "SIZING LOCKED IN" : "CLOSE — RUN IT AGAIN"}
          </p>
          <p className="ac-quiz-explain">size = (equity × 1%) ÷ (stop pips × pip value)</p>
          <Button variant="volt" onClick={reset}>
            Drill again
          </Button>
        </div>
      </div>
    );
  }

  const riskUsd = round.equity * RISK_PCT;

  return (
    <div className="ac-game">
      <div className="ac-game-meta">
        <span>
          Round {roundIdx + 1}/{ROUNDS}
        </span>
        <span>
          score {score}/{ROUNDS}
        </span>
      </div>

      <dl className="ac-terms">
        <div className="ac-term">
          <dt>Account equity</dt>
          <dd>${round.equity.toLocaleString("en-US")}</dd>
        </div>
        <div className="ac-term">
          <dt>Risk per trade</dt>
          <dd>1% = ${riskUsd.toLocaleString("en-US")}</dd>
        </div>
        <div className="ac-term">
          <dt>Stop distance</dt>
          <dd>{round.stop} pips</dd>
        </div>
        <div className="ac-term">
          <dt>Pip value</dt>
          <dd>${PIP_VALUE} per pip per mini lot</dd>
        </div>
      </dl>

      <p className="ac-quiz-q">Pick the position size that risks exactly 1%.</p>

      <div className="ac-options" aria-live="polite">
        {round.options.map((opt, i) => {
          let state: string | undefined;
          if (picked !== null) {
            if (opt === round.correct) state = "correct";
            else if (opt === picked) state = "wrong";
            else state = "dim";
          }
          return (
            <button
              key={opt}
              type="button"
              className="ac-option"
              data-state={state}
              disabled={picked !== null}
              onClick={() => pick(opt)}
            >
              <span className="ac-option-key">{OPTION_KEYS[i]}</span>
              {fmtLots(opt)} mini lots
            </button>
          );
        })}
      </div>
    </div>
  );
}
