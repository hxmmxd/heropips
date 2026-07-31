import { expect, test } from "@playwright/test";
import { MARKETING_ROUTES, settleReveals } from "./helpers";

/**
 * Legibility contract for the whole public surface.
 *
 * This exists because the site once shipped brand-art labels that rendered at
 * 3.8–8.5 CSS px in `--text-low` at weight 400 — measured 4.05:1 against
 * `--surface-1` once their 0.85 opacity was composited, i.e. below WCAG AA and
 * unreadable at any weight. Nothing caught it: the sizes were authored in SVG
 * user units, so the source said `fontSize="8.5"` while the rendered size
 * depended on how wide the scene's grid column happened to be.
 *
 * These assertions therefore measure RENDERED CSS pixels and COMPOSITED colour
 * in a real browser, at every width in the responsive matrix. A future column
 * ratio, viewBox or clamp change that pushes text back under the floor fails
 * here rather than in review.
 */

/** Nothing legible ships below this. Matches `--text-2xs`, the scale's floor. */
const MIN_PX = 12;

/** Section-4 width matrix (AGENTS.md), plus the 561px art-label breakpoint. */
const WIDTHS = [320, 360, 375, 390, 414, 430, 560, 561, 768, 834, 1024, 1280, 1440, 1920] as const;

type Offender = { sel: string; text: string; px: number; weight: string };
type ContrastOffender = Offender & { ratio: number; fg: string; bg: string; large: boolean };

/**
 * Walks every element that owns a text node and reports its rendered size.
 * SVG text is scaled by the `viewBox`-to-viewport ratio of its owner `<svg>`,
 * which is the whole reason the original defect was invisible in source.
 */
const MEASURE = (minPx: number) => {
  const out: Offender[] = [];
  for (const el of Array.from(document.querySelectorAll("body *"))) {
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    let px = parseFloat(cs.fontSize);
    const svg = (el as SVGElement).ownerSVGElement;
    if (svg) {
      const vb = svg.getAttribute("viewBox");
      const w = svg.getBoundingClientRect().width;
      if (vb && w > 0) px *= w / parseFloat(vb.trim().split(/\s+/)[2]);
    }
    if (px >= minPx) continue;
    const cls = typeof el.className === "string" ? el.className : (el.getAttribute("class") ?? "");
    out.push({
      sel: `${el.tagName.toLowerCase()}${cls ? `.${cls.trim().split(/\s+/).join(".")}` : ""}`,
      text: (el.textContent ?? "").trim().slice(0, 40),
      px: Math.round(px * 100) / 100,
      weight: cs.fontWeight,
    });
  }
  return out;
};

/**
 * Composites every text colour against the first painted background above it
 * and returns the pairs that miss WCAG AA. Elements over a gradient or image
 * are skipped: a single sampled colour would be a guess, and `brand.css`
 * poster surfaces are covered by their own token-level assertions.
 */
const CONTRAST = () => {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = ([r, g, b]: number[]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
  /**
   * Chromium serialises a `color-mix()` result as `color(srgb r g b / a)` with
   * components in 0–1, and everything else as `rgb()/rgba()` in 0–255. Reading
   * the former as 0–255 turns #F5F6F1 into near-black and reports 1.04:1 on
   * text that actually measures ~15:1 — so the two forms are parsed apart, and
   * anything else (oklab, lab, named functions) returns null and is skipped
   * rather than guessed at.
   */
  const rgba = (v: string): [number, number, number, number] | null => {
    const m = v.match(/-?[\d.]+(?:%)?/g);
    if (!m || m.length < 3) return null;
    const unit = v.startsWith("color(srgb") ? 255 : 1;
    if (!v.startsWith("color(srgb") && !v.startsWith("rgb")) return null;
    const chan = (raw: string) => (raw.endsWith("%") ? (Number.parseFloat(raw) / 100) * 255 : Number(raw) * unit);
    const alphaRaw = m[3];
    const alpha = alphaRaw === undefined ? 1 : alphaRaw.endsWith("%") ? Number.parseFloat(alphaRaw) / 100 : Number(alphaRaw);
    return [chan(m[0]), chan(m[1]), chan(m[2]), alpha];
  };
  const over = (fg: [number, number, number, number], bg: number[]) =>
    [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));

  const out: ContrastOffender[] = [];
  for (const el of Array.from(document.querySelectorAll("body *"))) {
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    // Disabled controls are exempt from 1.4.3.
    if (el.closest("[disabled],[aria-disabled='true']")) continue;

    // Resolve the painted backdrop; bail out on gradients and images.
    let bgRgb: number[] | null = null;
    let gradient = false;
    for (let node: Element | null = el; node; node = node.parentElement) {
      const ncs = getComputedStyle(node);
      if (ncs.backgroundImage !== "none") { gradient = true; break; }
      const c = rgba(ncs.backgroundColor);
      if (c && c[3] > 0.95) { bgRgb = [c[0], c[1], c[2]]; break; }
    }
    if (gradient || !bgRgb) continue;

    const rawFg = rgba((el as SVGElement).ownerSVGElement ? cs.fill : cs.color);
    if (!rawFg) continue;
    // Inherited opacity multiplies into the effective alpha.
    let alpha = rawFg[3];
    for (let node: Element | null = el; node; node = node.parentElement) alpha *= Number(getComputedStyle(node).opacity);
    // A fully transparent fill is never body copy — it is the outline/gradient
    // technique (`color: transparent` + `-webkit-text-stroke`, or
    // `background-clip: text`), as on `.ac-level-num`. There is no foreground
    // colour to measure; the 12px floor test still covers its size, and the
    // stroke or clip that actually paints it is not expressible as a pair.
    if (alpha < 0.01) continue;
    const fgRgb = over([rawFg[0], rawFg[1], rawFg[2], alpha], bgRgb);

    const l1 = lum(fgRgb);
    const l2 = lum(bgRgb);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    let px = parseFloat(cs.fontSize);
    const svg = (el as SVGElement).ownerSVGElement;
    if (svg) {
      const vb = svg.getAttribute("viewBox");
      const w = svg.getBoundingClientRect().width;
      if (vb && w > 0) px *= w / parseFloat(vb.trim().split(/\s+/)[2]);
    }
    const bold = Number(cs.fontWeight) >= 700;
    const large = px >= 24 || (bold && px >= 18.66);
    if (ratio < (large ? 3 : 4.5)) {
      const elCls = typeof el.className === "string" ? el.className : (el.getAttribute("class") ?? "");
      out.push({
        sel: `${el.tagName.toLowerCase()}${elCls ? `.${elCls.trim().split(/\s+/).join(".")}` : ""}`,
        text: (el.textContent ?? "").trim().slice(0, 40),
        px: Math.round(px * 100) / 100,
        weight: cs.fontWeight,
        ratio: Math.round(ratio * 100) / 100,
        fg: cs.color,
        bg: `rgb(${bgRgb.join(",")})`,
        large,
      });
    }
  }
  return out;
};

for (const route of MARKETING_ROUTES) {
  test(`text never renders below ${MIN_PX}px on ${route}`, async ({ page }) => {
    await page.goto(route);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 700 ? 740 : 900 });
      // Let clamp()/media-query relayout settle before measuring.
      await page.waitForTimeout(60);
      const bad = await page.evaluate(MEASURE, MIN_PX);
      const report = bad.map((x) => `  ${x.px}px @${x.weight} — ${x.sel} :: "${x.text}"`).join("\n");
      expect(bad, `@${width}px, ${bad.length} element(s) under ${MIN_PX}px:\n${report}`).toEqual([]);
    }
  });
}

for (const route of MARKETING_ROUTES) {
  test(`text meets WCAG AA contrast on ${route}`, async ({ page }) => {
    for (const theme of ["dark", "light"] as const) {
      await page.goto(route);
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
      await settleReveals(page);
      const bad = await page.evaluate(CONTRAST);
      const report = bad
        .map((x) => `  ${x.ratio}:1 (needs ${x.large ? 3 : 4.5}) ${x.px}px @${x.weight} ${x.fg} on ${x.bg} — ${x.sel} :: "${x.text}"`)
        .join("\n");
      expect(bad, `${theme} theme, ${bad.length} pair(s) below AA:\n${report}`).toEqual([]);
    }
  });
}

test("brand-art labels are legible wherever they are shown", async ({ page }) => {
  await page.goto("/");
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 700 ? 740 : 900 });
    await page.waitForTimeout(60);
    const scenes = await page.evaluate(() =>
      Array.from(document.querySelectorAll("svg.hp-art")).map((svg) => {
        const vb = (svg.getAttribute("viewBox") ?? "0 0 0 0").trim().split(/\s+/).map(Number);
        const scale = svg.getBoundingClientRect().width / vb[2];
        const labels = Array.from(svg.querySelectorAll("text")).filter(
          (t) => !t.classList.contains("hp3-ghost") && getComputedStyle(t).display !== "none",
        );
        return {
          shown: labels.length,
          minPx: labels.length
            ? Math.min(...labels.map((t) => parseFloat(getComputedStyle(t).fontSize) * scale))
            : null,
          // A label that leaves the viewBox is clipped by the SVG viewport.
          clipped: labels
            .map((t) => ({ t: (t.textContent ?? "").trim().slice(0, 24), b: (t as SVGGraphicsElement).getBBox() }))
            .filter(({ b }) => b.x < -0.5 || b.x + b.width > vb[2] + 0.5 || b.y < -0.5 || b.y + b.height > vb[3] + 0.5)
            .map(({ t }) => t),
        };
      }),
    );
    for (const [i, s] of scenes.entries()) {
      expect(s.clipped, `@${width}px scene ${i} clips labels: ${s.clipped.join(", ")}`).toEqual([]);
      if (s.shown > 0) {
        // Labels are hidden below 561px rather than shrunk (art.css) — when
        // they ARE painted they must clear the floor.
        expect(s.minPx!, `@${width}px scene ${i} smallest label`).toBeGreaterThanOrEqual(MIN_PX);
      }
    }
  }
});

test("every art scene exposes its meaning as real HTML, not aria-hidden SVG text", async ({ page }) => {
  for (const route of ["/", "/product", "/product/intelligence", "/product/automation", "/product/trade-guard", "/founding", "/early-access", "/affiliates"] as const) {
    await page.goto(route);
    const figures = page.locator("figure.hp-artfig");
    const count = await figures.count();
    expect(count, `${route} renders no art figure`).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const fig = figures.nth(i);
      // The drawing is decoration…
      await expect(fig.locator("svg.hp-art")).toHaveAttribute("aria-hidden", "true");
      // …so the caption must carry the words, in the accessibility tree.
      const cap = fig.locator("figcaption.hp-artfig-cap");
      await expect(cap).toBeVisible();
      expect((await cap.innerText()).trim().length, `${route} figure ${i} caption is empty`).toBeGreaterThan(12);
    }
  }
});
