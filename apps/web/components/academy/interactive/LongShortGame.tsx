"use client";

/* =========================================================================
 * LongShortGame — the arcade loop. Read a partial tape, call long or
 * short, watch the reveal, bank XP on wins (server/local via the store).
 * Deck is shuffled and never repeats a scenario until exhausted.
 * ======================================================================= */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ACADEMY_XP } from "@heropips/contracts";
import { Button } from "@heropips/ui";
import { useAcademy } from "@/components/academy/AcademyProvider";
import { GAME_SCENARIOS } from "@/lib/academy/scenarios";
import { recordGame } from "@/lib/academy/store";
import { utcDay } from "@/lib/academy/xp";
import { CANDLE_TICK_MS, CHART_H, CHART_W, chartGeom, prefersReducedMotion } from "./chart";

const DAILY_CAP_XP = ACADEMY_XP.GAME_WIN * ACADEMY_XP.GAME_DAILY_CAP;
const STREAK_DOTS = 5;

function shuffledOrder(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

type Verdict = { won: boolean; capped: boolean };

export function LongShortGame() {
  const snap = useAcademy();
  // Identity order for the first render, shuffled once after mount.
  // `useState(() => shuffledOrder(…))` runs on the server AND again during
  // hydration, and Math.random gives a different answer each time — so the
  // SSR'd scenario and the hydrated one disagreed and React reported a
  // mismatch (server rendered "USDJPY" where the client rendered "BTCUSDT").
  const [deck, setDeck] = useState<number[]>(() => Array.from({ length: GAME_SCENARIOS.length }, (_, i) => i));
  const [pos, setPos] = useState(0);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<"choose" | "reveal">("choose");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setDeck(shuffledOrder(GAME_SCENARIOS.length));
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current ?? undefined);
    };
  }, []);

  const scenario = GAME_SCENARIOS[deck[pos]];
  const geom = chartGeom(scenario.candles);
  const shown = phase === "choose" ? scenario.candles.slice(0, scenario.revealCount) : scenario.candles;

  const todayGame = snap.games["long-short"];
  const todayWins = todayGame && todayGame.date === utcDay() ? todayGame.wins : 0;
  const earnedToday = Math.min(todayWins, ACADEMY_XP.GAME_DAILY_CAP) * ACADEMY_XP.GAME_WIN;

  const choose = (side: "long" | "short") => {
    if (phase !== "choose") return;
    const won = side === scenario.answer;
    const newStreak = won ? streak + 1 : 0;
    setStreak(newStreak);
    setPhase("reveal");

    const revealMs = prefersReducedMotion()
      ? 0
      : (scenario.candles.length - scenario.revealCount) * CANDLE_TICK_MS + 400;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void recordGame("long-short", won, newStreak).then((res) => {
        setVerdict({ won, capped: res.capped });
      });
    }, revealMs);
  };

  const nextRound = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pos + 1 >= deck.length) {
      setDeck(shuffledOrder(GAME_SCENARIOS.length));
      setPos(0);
    } else {
      setPos(pos + 1);
    }
    setRound(round + 1);
    setPhase("choose");
    setVerdict(null);
  };

  return (
    <div className="ac-game">
      <div className="ac-game-meta">
        <span>Round {round}</span>
        <span>
          today {earnedToday}/{DAILY_CAP_XP} XP
        </span>
        <span className="ac-game-streak" role="img" aria-label={`Current win streak: ${streak}`}>
          {Array.from({ length: STREAK_DOTS }, (_, i) => (
            <i key={i} data-hit={i < Math.min(streak, STREAK_DOTS) ? "true" : "false"} />
          ))}
        </span>
      </div>

      <div className="ac-replay" data-play="true">
        <div className="ac-replay-head">
          <span className="ac-replay-pair">
            {scenario.pair}
            <span className="ac-replay-tf">{scenario.timeframe}</span>
          </span>
        </div>
        <svg
          className="ac-replay-stage"
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          role="img"
          aria-label={`Chart tape for round ${round} — ${phase === "choose" ? "partial view, make your call" : "full reveal"}`}
        >
          {shown.map((c, i) => {
            const bull = c.c >= c.o;
            const color = bull ? "var(--profit-500)" : "var(--loss-500)";
            const cx = geom.xCenter(i);
            const bodyTop = geom.y(Math.max(c.o, c.c));
            const bodyH = Math.max(Math.abs(geom.y(c.c) - geom.y(c.o)), 0.5);
            // Pre-choice candles keep a fixed quick stagger so their delay
            // never changes at reveal time (a change would restart the CSS
            // animation); revealed candles play out at replay cadence.
            const delay = i < scenario.revealCount ? i * 40 : (i - scenario.revealCount) * CANDLE_TICK_MS;
            return (
              <g key={i} className="ac-candle" style={{ "--d": `${delay}ms` } as CSSProperties}>
                <line x1={cx} x2={cx} y1={geom.y(c.h)} y2={geom.y(c.l)} stroke={color} strokeWidth={0.35} />
                <rect
                  className="ac-candle-body"
                  x={cx - geom.bodyW / 2}
                  y={bodyTop}
                  width={geom.bodyW}
                  height={bodyH}
                  rx={0.3}
                  fill={color}
                  style={{ "--d": `${delay}ms`, "--org": `${geom.y(c.o)}px` } as CSSProperties}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <p className="ac-quiz-q">Next move — long or short?</p>

      <div className="ac-game-choices">
        <button type="button" className="ac-choice" data-side="long" disabled={phase !== "choose"} onClick={() => choose("long")}>
          LONG
        </button>
        <button type="button" className="ac-choice" data-side="short" disabled={phase !== "choose"} onClick={() => choose("short")}>
          SHORT
        </button>
      </div>

      <div aria-live="polite">
        {verdict ? (
          <div className="ac-game-verdict" data-tone={verdict.won ? "win" : "lose"}>
            <span className="ac-game-verdict-word">
              {verdict.won ? `NAILED IT +${ACADEMY_XP.GAME_WIN} XP` : "STOPPED OUT"}
            </span>
            <p>{scenario.explain}</p>
            {verdict.capped ? <p>Daily XP cap reached — plays still count for practice.</p> : null}
            <Button variant="volt" onClick={nextRound}>
              Next round
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
