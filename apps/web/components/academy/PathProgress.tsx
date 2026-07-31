"use client";

/* =========================================================================
 * Tiny client islands for the server-rendered hub path. They only translate
 * store state into data-attributes / an inline height % — every visual
 * lives in academy.css (.ac-lesson-check, .ac-rail-fill).
 * ======================================================================= */

import { useAcademy } from "./AcademyProvider";

/** Completion circle on a hub lesson card: empty ring idle, volt check when done. */
export function LessonCheck({ slug }: { slug: string }) {
  const snap = useAcademy();
  const done = snap.completions[slug] !== undefined;
  return (
    <span className="ac-lesson-check" data-state={done ? "done" : "todo"} aria-hidden="true">
      {done ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 12.5 9.5 18 20 6.5" />
        </svg>
      ) : null}
    </span>
  );
}

/** Volt progress fill on a level's rail — height % of the level's completed lessons. */
export function RailFill({ slugs }: { slugs: string[] }) {
  const snap = useAcademy();
  const done = slugs.reduce((n, s) => n + (snap.completions[s] !== undefined ? 1 : 0), 0);
  const pct = slugs.length > 0 ? Math.round((done / slugs.length) * 100) : 0;
  return <span className="ac-rail-fill" style={{ height: `${pct}%` }} aria-hidden="true" />;
}
