"use client";

/* =========================================================================
 * LessonInteractive — maps a lesson's declared interactive block onto the
 * concrete widget. The capstone renders a static mission brief here; live
 * verification happens on the member dashboard (/app/academy).
 * ======================================================================= */

import { ButtonLink } from "@heropips/ui";
import type { LessonInteractive as LessonInteractiveSpec } from "@/lib/academy/curriculum";
import { CandleAnatomy } from "./CandleAnatomy";
import { CandleReplay } from "./CandleReplay";
import { RiskSizerGame } from "./RiskSizerGame";

const CAPSTONE_MISSIONS = [
  "Create your paper trading account",
  "Close 3 paper trades with stops",
  "Claim the capstone in the app",
];

export function LessonInteractive({ interactive }: { interactive: LessonInteractiveSpec }) {
  switch (interactive.kind) {
    case "candle-anatomy":
      return <CandleAnatomy />;
    case "replay":
      return <CandleReplay scenarioId={interactive.scenario} autoPlay />;
    case "risk-sizer":
      return <RiskSizerGame />;
    case "capstone":
      return (
        <div style={{ display: "grid", gap: "var(--sp-4)", justifyItems: "start" }}>
          <div className="ac-missions" style={{ width: "100%" }}>
            {CAPSTONE_MISSIONS.map((label) => (
              <div key={label} className="ac-mission" data-done="false">
                <span className="ac-mission-check" aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <ButtonLink variant="volt" href="/app/academy">
            Open your capstone missions →
          </ButtonLink>
        </div>
      );
  }
  return null;
}
