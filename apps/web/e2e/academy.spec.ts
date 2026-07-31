import { expect, test, type Page } from "@playwright/test";
import { ACADEMY_XP } from "@heropips/contracts";
import { jsonLdTypes, noHscroll, parseJsonLd } from "./helpers";
import { LESSONS_FULL, LEVELS, TRACKS } from "../lib/academy/curriculum";

/* =========================================================================
 * Academy — anonymous gamified flows. No backend stack required: the
 * progress API 401s without a session cookie and the store runs on
 * localStorage, which is exactly the anonymous product experience.
 * Fixtures derive from the curriculum, so counts and tiers never go stale.
 * ======================================================================= */

const openLessons = LESSONS_FULL.filter((l) => l.access === "open");
const lockedLesson = LESSONS_FULL.find((l) => l.access === "member")!;
const proLesson = LESSONS_FULL.find((l) => l.access === "pro")!;

/** Answer every quiz question correctly, driven by the curriculum data. */
async function aceQuiz(page: Page, slug: string): Promise<void> {
  const lesson = LESSONS_FULL.find((l) => l.slug === slug)!;
  for (let i = 0; i < lesson.quiz.length; i++) {
    const q = lesson.quiz[i];
    const correct = q.options[q.answer];
    await page.getByRole("button", { name: correct, exact: true }).click();
    const next = page.getByRole("button", { name: /next question|see result|finish/i });
    await next.click();
  }
}

test.describe("academy hub", () => {
  test("renders the full curious-to-confident path server-side", async ({ page }) => {
    await page.goto("/academy");
    await expect(page.locator("h1")).toHaveCount(1);
    // every level ("world") of the path is present — 10 per contracts
    for (const level of LEVELS) {
      await expect(page.getByText(level.name).first()).toBeAttached();
    }
    // every lesson is a link on the path — 31 per contracts
    for (const lesson of LESSONS_FULL) {
      await expect(page.locator(`a[href="/academy/${lesson.slug}"]`).first()).toBeAttached();
    }
    await noHscroll(page);
  });

  test("ships Course JSON-LD and unique meta", async ({ page }) => {
    const res = await page.goto("/academy");
    const html = (await res?.text()) ?? (await page.content());
    const types = jsonLdTypes(parseJsonLd(html));
    expect(types).toContain("Course");
    expect(types).toContain("BreadcrumbList");
    await expect(page).toHaveTitle(/academy/i);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /\/academy$/);
  });
});

test.describe("certificate gallery", () => {
  test("shows a public draft for every certificate track", async ({ page }) => {
    const res = await page.goto("/academy/certificates");
    // one draft certificate per track: level-0..level-9 + hero-trader = 11
    await expect(page.locator(".ac-cert")).toHaveCount(TRACKS.length);
    // Scoped to <main>: the nav mega-panel now renders its links unconditionally
    // (hidden, for crawlability), and one of its descriptions contains "draft".
    await expect(page.locator("main").getByText(/draft/i).first()).toBeVisible();
    await expect(page).toHaveTitle(/certificate/i);
    const html = (await res?.text()) ?? (await page.content());
    const types = jsonLdTypes(parseJsonLd(html));
    expect(types).toContain("ItemList");
    await noHscroll(page);
  });
});

test.describe("lesson player — anonymous earn loop", () => {
  test("open lesson renders full content, quiz awards XP into the HUD", async ({ page }) => {
    const lesson = openLessons[0];
    await page.goto(`/academy/${lesson.slug}`);
    await expect(page.locator("h1")).toContainText(lesson.title);
    // full content: every section heading present
    for (const s of lesson.sections) {
      await expect(page.getByRole("heading", { name: s.h })).toBeVisible();
    }
    // glossary is visible + extractable
    await expect(page.getByText(lesson.terms[0].term, { exact: false }).first()).toBeAttached();

    await aceQuiz(page, lesson.slug);
    // result panel shows the XP award
    await expect(page.getByText(/\+\d+ XP/).first()).toBeVisible();
    await noHscroll(page);
  });

  test("progress persists: completed lesson shows as done on return", async ({ page }) => {
    const lesson = openLessons[0];
    await page.goto(`/academy/${lesson.slug}`);
    await aceQuiz(page, lesson.slug);
    await page.goto(`/academy/${lesson.slug}`);
    await expect(page.getByText(/completed/i).first()).toBeVisible();
  });

  test("claim wall rises once the anonymous earn limit is hit", async ({ page }) => {
    const limit = ACADEMY_XP.ANON_LESSON_LIMIT;
    // the wall needs an open lesson left over to rise on
    expect(openLessons.length).toBeGreaterThan(limit);
    for (const lesson of openLessons.slice(0, limit)) {
      await page.goto(`/academy/${lesson.slug}`);
      await aceQuiz(page, lesson.slug);
    }
    // next open lesson: quiz replaced by the claim wall
    const walled = openLessons[limit];
    await page.goto(`/academy/${walled.slug}`);
    await expect(page.getByText(/banked on this device/i).first()).toBeVisible();
    const correct = walled.quiz[0].options[walled.quiz[0].answer];
    await expect(page.getByRole("button", { name: correct, exact: true })).toHaveCount(0);
  });

  test("lesson page surfaces the live workshop unlock note", async ({ page }) => {
    await page.goto(`/academy/${openLessons[0].slug}`);
    await expect(page.locator('a[href="/academy#live-classes"]').first()).toBeAttached();
  });

  test("member-tier lesson gates content with an unlock CTA, no quiz", async ({ page }) => {
    await page.goto(`/academy/${lockedLesson.slug}`);
    await expect(page.locator("h1")).toContainText(lockedLesson.title);
    // first section public, later sections withheld
    await expect(page.getByRole("heading", { name: lockedLesson.sections[0].h })).toBeAttached();
    const last = lockedLesson.sections[lockedLesson.sections.length - 1];
    await expect(page.getByRole("heading", { name: last.h, exact: true })).toHaveCount(0);
    const wallCta = page.getByRole("link", { name: /early access|create a free account/i }).first();
    await expect(wallCta).toBeVisible();
  });

  test("pro-tier lesson routes to founding", async ({ page }) => {
    await page.goto(`/academy/${proLesson.slug}`);
    // Scoped to <main>: the nav mega-panel renders its links unconditionally
    // (hidden, for crawlability) and already contains an /founding anchor.
    await expect(page.locator("main").locator('a[href="/founding"]').first()).toBeVisible();
  });

  test("lesson JSON-LD declares a LearningResource", async ({ page }) => {
    const res = await page.goto(`/academy/${openLessons[0].slug}`);
    const html = (await res?.text()) ?? (await page.content());
    const types = jsonLdTypes(parseJsonLd(html));
    expect(types).toContain("LearningResource");
  });
});

test.describe("arcade", () => {
  test("long-or-short round plays to a verdict", async ({ page }) => {
    await page.goto("/academy/arcade");
    await expect(page.locator("h1")).toHaveCount(1);
    await page.getByRole("button", { name: /^long$/i }).first().click();
    await expect(page.getByText(/nailed it|stopped out/i).first()).toBeVisible({ timeout: 15_000 });
    await noHscroll(page);
  });
});

test.describe("certificate verify", () => {
  test("unknown code renders the branded invalid state, not a crash", async ({ page }) => {
    await page.goto("/academy/verify/HP-INVALID-CODE1");
    await expect(page.getByText(/not found|couldn.t find|invalid/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /academy/i }).first()).toBeVisible();
  });
});

test.describe("academy a11y smoke", () => {
  for (const path of ["/academy", "/academy/arcade", "/academy/certificates"]) {
    test(`one h1, named controls, alt images on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      const missingAlt = await page
        .locator("img")
        .evaluateAll((imgs) => imgs.filter((img) => !img.hasAttribute("alt")).length);
      expect(missingAlt).toBe(0);
      const total = await page.locator("main").getByRole("link").count();
      const named = await page.locator("main").getByRole("link", { name: /\S/ }).count();
      expect(named).toBe(total);
    });
  }
});
