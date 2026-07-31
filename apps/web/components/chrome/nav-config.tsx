import type { ReactNode } from "react";
import { ACADEMY_LESSONS, ACADEMY_LEVELS } from "@heropips/contracts";

/* ------------------------------------------------------------------ */
/* Types — one NAV structure consumed by both desktop and mobile.      */
/* ------------------------------------------------------------------ */

export type MegaItem = {
  href: string;
  label: string;
  /** One-line supporting description. */
  desc: string;
  /** Small inline stroke SVG, sized 16-18px, inherits currentColor. */
  icon: ReactNode;
};

export type MegaGroup = {
  title: string;
  items: readonly MegaItem[];
};

export type FlatLink = {
  href: string;
  label: string;
};

export type NavCta = FlatLink & { variant: "volt" | "ghost" };

/** Highlighted right rail — the early-access card. */
export type MegaRail = {
  eyebrow: string;
  headline: string;
  line: string;
  primary: NavCta;
  secondary: NavCta;
};

export type MegaPanelConfig = {
  /** Stable id — drives DOM ids (`hp-mega-panel-<id>`) and open state. */
  id: string;
  /** Mega-menu trigger button label. */
  label: string;
  /** Route prefix that marks this trigger as the active section. */
  activePrefix: string;
  /** Grouped columns inside the panel. */
  groups: readonly MegaGroup[];
  /** Right rail card; omitted on slim panels (panel renders narrower). */
  rail?: MegaRail;
  /** Quick-link row along the bottom of the panel. */
  footer: {
    left: readonly FlatLink[];
    right?: FlatLink;
  };
};

export type NavConfig = {
  /** Mega-menu triggers with their panels, in render order. */
  panels: readonly MegaPanelConfig[];
  /** Flat top-level links rendered after the triggers. */
  links: readonly FlatLink[];
  /** Right-side CTA pair, in render order (ghost, volt). */
  ctas: readonly [NavCta, NavCta];
};

/* ------------------------------------------------------------------ */
/* Icon set — consistent 24-grid stroke glyphs rendered at 17px.       */
/* ------------------------------------------------------------------ */

function NavGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const icons = {
  book: (
    <NavGlyph>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h6z" />
    </NavGlyph>
  ),
  target: (
    <NavGlyph>
      <circle cx="12" cy="12" r="9.2" />
      <circle cx="12" cy="12" r="5.4" />
      <circle cx="12" cy="12" r="1.6" />
    </NavGlyph>
  ),
  candle: (
    <NavGlyph>
      <path d="M7 3v3M7 15v4" />
      <rect x="4.6" y="6" width="4.8" height="9" rx="1.2" />
      <path d="M17 5v3M17 17v3" />
      <rect x="14.6" y="8" width="4.8" height="9" rx="1.2" />
    </NavGlyph>
  ),
  route: (
    <NavGlyph>
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="5" r="2.2" />
      <path d="M8.2 19h5.3a3.5 3.5 0 0 0 0-7h-3a3.5 3.5 0 0 1 0-7h5.3" />
    </NavGlyph>
  ),
  chart: (
    <NavGlyph>
      <path d="M3.5 3.5v17h17" />
      <path d="m7.5 15.5 3.5-4.5 3 3 5-6.5" />
    </NavGlyph>
  ),
  bolt: (
    <NavGlyph>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </NavGlyph>
  ),
  shield: (
    <NavGlyph>
      <path d="M12 3l7 3.2v5.3c0 4.4-2.9 7.6-7 9.5-4.1-1.9-7-5.1-7-9.5V6.2z" />
      <path d="m9.2 11.9 2 2 3.8-4.3" />
    </NavGlyph>
  ),
  app: (
    <NavGlyph>
      <rect x="3" y="4" width="18" height="16" rx="2.4" />
      <path d="M3 9h18" />
      <path d="m9 13.5 2.2 2.2 3.8-4.2" />
    </NavGlyph>
  ),
  tag: (
    <NavGlyph>
      <path d="M3.5 3.5h8.2l8.6 8.6a2.2 2.2 0 0 1 0 3.1l-5.1 5.1a2.2 2.2 0 0 1-3.1 0L3.5 11.7z" />
      <circle cx="8" cy="8" r="1.4" />
    </NavGlyph>
  ),
  paper: (
    <NavGlyph>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="m9 15.5 2-2.6 1.8 1.6 2.4-3.2" />
    </NavGlyph>
  ),
  gamepad: (
    <NavGlyph>
      <path d="M7 6.8h10a4.8 4.8 0 0 1 4.7 5.8l-.9 4.4a2.5 2.5 0 0 1-4.4 1.1l-1.5-1.8H9.1l-1.5 1.8a2.5 2.5 0 0 1-4.4-1.1l-.9-4.4A4.8 4.8 0 0 1 7 6.8z" />
      <path d="M8.2 10.2v3M6.7 11.7h3" />
      <path d="M15.4 10.5h.01M17.6 12.5h.01" />
    </NavGlyph>
  ),
  seal: (
    <NavGlyph>
      <circle cx="12" cy="9.3" r="5.6" />
      <path d="m8.9 13.9-1.4 6.6 4.5-2.6 4.5 2.6-1.4-6.6" />
      <path d="m9.9 9.4 1.5 1.5 2.8-3" />
    </NavGlyph>
  ),
} satisfies Record<string, ReactNode>;

/* ------------------------------------------------------------------ */
/* The nav — product-first: Product panel, Academy panel, flat links.  */
/* ------------------------------------------------------------------ */

export const NAV: NavConfig = {
  panels: [
    {
      id: "product",
      label: "Product",
      activePrefix: "/product",
      groups: [
        {
          title: "Intelligence",
          items: [
            {
              href: "/product/intelligence",
              label: "Intelligence",
              desc: "Scored, explained decision intelligence",
              icon: icons.chart,
            },
            {
              href: "/product",
              label: "Platform overview",
              desc: "The intelligence stack, end to end",
              icon: icons.route,
            },
          ],
        },
        {
          title: "Automation",
          items: [
            {
              href: "/product/automation",
              label: "Automation",
              desc: "Execution on your own broker",
              icon: icons.bolt,
            },
            {
              href: "/product/trade-guard",
              label: "Trade Guard",
              desc: "Your rules, enforced",
              icon: icons.shield,
            },
          ],
        },
        {
          title: "Platform",
          items: [
            {
              href: "/app",
              label: "Member app",
              desc: "Sign in to the live platform",
              icon: icons.app,
            },
            {
              href: "/pricing",
              label: "Pricing",
              desc: "Packages & founding seat",
              icon: icons.tag,
            },
          ],
        },
      ],
      rail: {
        eyebrow: "Skip the line",
        headline: "Founding Hero",
        line: "Platform live for 500 lifetime members. $499 once.",
        primary: { href: "/founding", label: "Become a Founding Hero →", variant: "volt" },
        secondary: { href: "/app/login", label: "Member sign in", variant: "ghost" },
      },
      footer: {
        left: [
          { href: "/product", label: "Product overview →" },
          { href: "/pricing", label: "Pricing →" },
          { href: "/faq", label: "FAQ →" },
        ],
        right: { href: "/affiliates", label: "Affiliates →" },
      },
    },
    {
      id: "academy",
      label: "Academy",
      activePrefix: "/academy",
      groups: [
        {
          title: "Start free",
          items: [
            {
              href: "/academy/what-is-trading",
              label: "Level 0 — First Steps",
              desc: "Absolute zero: what trading is",
              icon: icons.book,
            },
            {
              href: "/academy",
              label: "The whole path",
              desc: `All ${ACADEMY_LEVELS.length} levels, ${ACADEMY_LESSONS.length} lessons`,
              icon: icons.route,
            },
            {
              href: "/academy/arcade",
              label: "Trading Arcade",
              desc: "Practice games that pay XP",
              icon: icons.gamepad,
            },
          ],
        },
        {
          title: "Go deeper",
          items: [
            {
              href: "/academy/risk-1-percent",
              label: "Risk & sizing",
              desc: "Why pros risk 1% per trade",
              icon: icons.shield,
            },
            {
              href: "/academy/paper-trading-capstone",
              label: "Paper capstone",
              desc: "Prove it on a $10k paper account",
              icon: icons.paper,
            },
            {
              href: "/academy/certificates",
              label: "The certificates",
              desc: "Preview every level's certificate draft",
              icon: icons.seal,
            },
          ],
        },
      ],
      footer: {
        left: [
          { href: "/faq", label: "FAQ →" },
          { href: "/pricing", label: "Pricing →" },
        ],
      },
    },
  ],
  links: [
    { href: "/pricing", label: "Pricing" },
    { href: "/affiliates", label: "Affiliates" },
    { href: "/faq", label: "FAQ" },
  ],
  ctas: [
    { href: "/app/login", label: "Sign in", variant: "ghost" },
    { href: "/early-access", label: "Join free list →", variant: "volt" },
  ],
};
