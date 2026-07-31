import type { Metadata } from "next";
import { ACADEMY_XP } from "@heropips/contracts";
import { Card, Disclaimer, Eyebrow, Kicker } from "@heropips/ui";
import { LongShortGame } from "@/components/academy/interactive/LongShortGame";
import { RiskSizerGame } from "@/components/academy/interactive/RiskSizerGame";
import { SpinWheel } from "@/components/academy/interactive/SpinWheel";
import { XpHud } from "@/components/academy/XpHud";
import { Breadcrumbs, WebPageJsonLd } from "@/components/seo/JsonLd";
import { abs, type Crumb } from "@/components/seo/graph";
import { socialMeta } from "@/components/seo/meta";

const TITLE = "Trading Arcade — practice games";
/* Kept inside the 160-char snippet budget every other route respects. */
const DESCRIPTION =
  `Chart-reading and risk drills that pay XP: call the next move, size positions, spin the daily wheel. ` +
  `Wins award ${ACADEMY_XP.GAME_WIN} XP, up to ${ACADEMY_XP.GAME_DAILY_CAP} scoring rounds a day.`;

const URL = abs("/academy/arcade");
const CRUMBS: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Academy", path: "/academy" },
  { name: "Arcade", path: "/academy/arcade" },
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/academy/arcade" },
  ...socialMeta(TITLE, DESCRIPTION, "/academy/arcade"),
};

export default function ArcadePage() {
  return (
    <>
      <WebPageJsonLd url={URL} name={TITLE} description={DESCRIPTION} breadcrumb={CRUMBS} />

      <section className="section ac-hero" style={{ background: "var(--grad-hero)" }}>
        <div className="container">
          <Breadcrumbs items={CRUMBS} />
          <Eyebrow style={{ marginBottom: "var(--sp-4)" }}>Arcade</Eyebrow>
          <h1 style={{ maxWidth: 640, marginBottom: "var(--sp-5)" }}>Train your eye. Earn XP.</h1>
          <p style={{ maxWidth: 620, fontSize: "var(--text-lg)", color: "var(--text-mid)" }}>
            Fast reps on real chart situations. Every winning round awards {ACADEMY_XP.GAME_WIN} XP,
            up to {ACADEMY_XP.GAME_DAILY_CAP} scoring rounds per game each day — anonymous XP lives
            on this device, so sign in to keep it.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-label="Arcade games">
        <div className="container">
          <XpHud />

          <div className="ac-grid" style={{ marginTop: "var(--sp-8)" }}>
            <section className="ac-span-7" aria-labelledby="game-ls-h">
              <Card raised style={{ padding: "var(--sp-6)", height: "100%", display: "grid", gap: "var(--sp-4)", alignContent: "start" }}>
                <div>
                  <Kicker tone="volt">Long or short?</Kicker>
                  <h2 id="game-ls-h" style={{ fontSize: "var(--text-xl)", marginTop: "var(--sp-2)" }}>Call the next move</h2>
                  <p style={{ marginTop: "var(--sp-2)", color: "var(--text-mid)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>
                    Read the setup, pick a side, see how the candles actually played out. Streaks
                    sharpen the instinct the lessons explain.
                  </p>
                </div>
                <LongShortGame />
              </Card>
            </section>

            <section className="ac-span-5" aria-labelledby="game-rs-h">
              <Card raised style={{ padding: "var(--sp-6)", height: "100%", display: "grid", gap: "var(--sp-4)", alignContent: "start" }}>
                <div>
                  <Kicker tone="volt">Risk sizer drill</Kicker>
                  <h2 id="game-rs-h" style={{ fontSize: "var(--text-xl)", marginTop: "var(--sp-2)" }}>Size it right</h2>
                  <p style={{ marginTop: "var(--sp-2)", color: "var(--text-mid)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>
                    Account, risk percent, stop distance — compute the position size before the
                    timer beats you. The one habit that keeps accounts alive.
                  </p>
                </div>
                <RiskSizerGame />
              </Card>
            </section>

            <section className="ac-span-12" aria-labelledby="game-spin-h">
              <Card raised style={{ padding: "var(--sp-6)", display: "grid", gap: "var(--sp-4)" }}>
                <div>
                  <Kicker tone="volt">Daily spin</Kicker>
                  <h2 id="game-spin-h" style={{ fontSize: "var(--text-xl)", marginTop: "var(--sp-2)" }}>One spin, once a day</h2>
                  <p style={{ marginTop: "var(--sp-2)", color: "var(--text-mid)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>
                    A bonus XP prize every day you show up — the streak habit, gamified.
                  </p>
                </div>
                <SpinWheel />
              </Card>
            </section>
          </div>

          <Disclaimer style={{ marginTop: "var(--sp-8)" }}>
            Arcade rounds use simulated teaching scenarios modeled on typical market behavior —
            education only. Game results are practice reps, not trading advice, and past patterns
            do not predict future prices. Trading involves substantial risk of loss.
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
