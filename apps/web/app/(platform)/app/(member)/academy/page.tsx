import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AcademyLeaderboardRes } from "@heropips/contracts";
import { BrandCard, ButtonLink, Disclaimer, ProgressBar } from "@heropips/ui";
import { getSession } from "@/lib/session";
import { INTERNAL_SVC_HEADERS } from "@/lib/api";
import { GROWTH_URL, loadProgress } from "@/app/api/academy/_lib";
import { LESSONS_FULL, LEVELS, TOTAL_LESSONS, TRACKS, trackProgress } from "@/lib/academy/curriculum";
import { fmtXp, rankFor, utcDay } from "@/lib/academy/xp";
import { XpHud } from "@/components/academy/XpHud";
import { SpinWheel } from "@/components/academy/interactive/SpinWheel";
import { CapstoneMissions } from "@/components/academy/member/CapstoneMissions";
import { CertClaim } from "@/components/academy/member/CertClaim";
import { ReferralCard } from "@/components/academy/member/ReferralCard";
import { ClaimRefresh } from "@/components/academy/member/ClaimRefresh";
import { LiveWorkshops } from "@/components/academy/member/LiveWorkshops";

export const metadata: Metadata = { title: "Academy" };
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

async function loadLeaderboard(): Promise<AcademyLeaderboardRes> {
  try {
    // /v1/academy/** is internal — growth 401s the hop without the shared token.
    const res = await fetch(`${GROWTH_URL}/v1/academy/leaderboard?limit=10`, {
      cache: "no-store",
      headers: INTERNAL_SVC_HEADERS,
    });
    if (!res.ok) return { entries: [] };
    return AcademyLeaderboardRes.parse(await res.json());
  } catch {
    return { entries: [] };
  }
}

type WeekDot = { day: string; label: string; hit: boolean; today: boolean };

/** Last 7 UTC days, oldest first. hit = day falls inside the live streak window. */
function weekDots(lastActive: string | null, streakDays: number): WeekDot[] {
  const today = utcDay();
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const lastMs = lastActive === null ? null : Date.parse(`${lastActive}T00:00:00Z`);
  const out: WeekDot[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayMs - i * DAY_MS);
    const day = d.toISOString().slice(0, 10);
    const back = lastMs === null ? -1 : Math.round((lastMs - d.getTime()) / DAY_MS);
    out.push({
      day,
      label: d.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" }),
      hit: back >= 0 && back < streakDays,
      today: day === today,
    });
  }
  return out;
}

export default async function AcademyDashboardPage() {
  const user = await getSession();
  if (!user) redirect("/app/login");
  const [progress, leaderboard] = await Promise.all([loadProgress(user), loadLeaderboard()]);

  const rank = rankFor(progress.xp);
  const dots = weekDots(progress.last_active_date, progress.streak_days);
  const lessonsDone = LESSONS_FULL.filter((l) => progress.completions[l.slug] !== undefined).length;
  const nextLesson = LESSONS_FULL.find((l) => progress.completions[l.slug] === undefined) ?? null;

  return (
    <>
      <ClaimRefresh />
      {/* rank ring hero — brand ink poster, like the equity hero on /app */}
      <BrandCard
        as="section"
        variant="ink"
        chip={false}
        watermark
        className="ac-hero"
        aria-label="Academy progress"
        meta={{
          left: ["@heropips", "academy · curious trader to confident trader"],
          right: rank.next ? `next: ${rank.next.name} at ${fmtXp(rank.next.at)} XP` : "top rank reached",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-7)", flexWrap: "wrap" }}>
          <div className="ac-ring-wrap">
            <div className="ac-ring" style={{ "--ac-ring-pct": rank.pct * 100 } as CSSProperties} aria-hidden="true" />
            <div className="ac-ring-center">
              <span className="ac-ring-xp num">{fmtXp(progress.xp)}</span>
              <span className="ac-ring-rank">{rank.name}</span>
            </div>
          </div>
          <div style={{ display: "grid", gap: "var(--sp-4)" }}>
            <div className="ac-week" aria-label={`Streak: ${progress.streak_days} ${progress.streak_days === 1 ? "day" : "days"}`} role="group">
              {dots.map((d) => (
                <span key={d.day} className="ac-day" data-hit={d.hit} data-today={d.today}>
                  <i aria-hidden="true" />
                  {d.label}
                </span>
              ))}
            </div>
            <div className="ac-hero-stats">
              <span className="ac-stat-chip">
                <strong className="num">{progress.streak_days}</strong> day streak
              </span>
              <span className="ac-stat-chip">
                <strong className="num">{progress.streak_best}</strong> best
              </span>
              <span className="ac-stat-chip">
                <strong className="num">
                  {lessonsDone}/{TOTAL_LESSONS}
                </strong>{" "}
                lessons
              </span>
            </div>
          </div>
        </div>
      </BrandCard>

      <XpHud />

      {/* resume strip — the single next action */}
      {nextLesson ? (
        <section className="ac-resume" aria-label="Continue learning">
          <div style={{ minWidth: 0 }}>
            <div className="ap-note">Pick up where you left off</div>
            <div
              style={{
                color: "var(--text-hi)",
                fontFamily: "var(--font-display)",
                fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
              }}
            >
              Continue: Lesson {String(nextLesson.number).padStart(2, "0")} — {nextLesson.title}
            </div>
          </div>
          <ButtonLink
            variant="volt"
            size="sm"
            style={{ marginLeft: "auto", flex: "none" }}
            href={nextLesson.access === "open" ? `/academy/${nextLesson.slug}` : `/app/academy/learn/${nextLesson.slug}`}
          >
            Continue
          </ButtonLink>
        </section>
      ) : (
        <section className="ac-resume" aria-label="Curriculum complete">
          <div style={{ color: "var(--text-hi)" }}>
            All {TOTAL_LESSONS} lessons complete — claim your certificates below.
          </div>
        </section>
      )}

      <div className="ac-grid">
        <div className="ac-span-7" style={{ display: "grid", gap: "var(--sp-4)", alignContent: "start" }}>
          <section className="ap-panel" aria-label="Levels" style={{ display: "grid", gap: "var(--sp-3)" }}>
            <div className="ap-panel-head">
              <h2 className="ap-panel-title">Levels</h2>
              <span className="ap-panel-side">
                <Link className="ap-panel-link" href="/academy">
                  Full curriculum
                </Link>
              </span>
            </div>
            {LEVELS.map((level) => {
              const done = level.lessons.filter((l) => progress.completions[l.slug] !== undefined).length;
              return (
                <div key={level.id} style={{ display: "grid", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--sp-3)", fontSize: "var(--text-sm)" }}>
                    <span style={{ color: "var(--text-hi)" }}>
                      Level {level.number} — {level.name}
                    </span>
                    <span className="ap-note num">
                      {done}/{level.lessons.length}
                    </span>
                  </div>
                  <ProgressBar value={done} max={level.lessons.length} label={`${level.name}: ${done} of ${level.lessons.length} lessons`} />
                </div>
              );
            })}
          </section>
          <LiveWorkshops completions={progress.completions} />
          <CapstoneMissions />
        </div>

        <div className="ac-span-5" style={{ display: "grid", gap: "var(--sp-4)", alignContent: "start" }}>
          <section className="ap-panel" aria-label="Daily spin" style={{ display: "grid", gap: "var(--sp-3)" }}>
            <div className="ap-panel-head">
              <h2 className="ap-panel-title">Daily spin</h2>
            </div>
            <SpinWheel />
          </section>
          <ReferralCard referralCode={progress.referral_code} referralsQualified={progress.referrals_qualified} />
          <section className="ap-panel" aria-label="Leaderboard" style={{ display: "grid", gap: "var(--sp-3)" }}>
            <div className="ap-panel-head">
              <h2 className="ap-panel-title">Leaderboard</h2>
            </div>
            {leaderboard.entries.length === 0 ? (
              <p className="ap-note">No ranks yet — earn XP to appear here.</p>
            ) : (
              <div className="ac-lb">
                {leaderboard.entries.map((e, i) => (
                  <div key={`${e.display_name}-${i}`} className="ac-lb-row" data-me={e.display_name === progress.display_name}>
                    <span className="ac-lb-pos num">{i + 1}</span>
                    <span className="ac-lb-name">{e.display_name}</span>
                    <span className="ac-lb-streak num">{e.streak_days}d</span>
                    <span className="ac-lb-xp num">{fmtXp(e.xp)} XP</span>
                  </div>
                ))}
              </div>
            )}
          </section>
          <CertClaim
            tracks={TRACKS.map((t) => ({ id: t.id, name: t.name, ...trackProgress(t, progress.completions) }))}
            certificates={progress.certificates}
          />
        </div>
      </div>

      <Disclaimer />
    </>
  );
}
