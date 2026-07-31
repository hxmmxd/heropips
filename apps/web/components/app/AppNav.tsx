"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUserRes } from "@heropips/contracts";
import { Badge, LevelUpMark } from "@heropips/ui";
import {
  IconAcademy,
  IconChat,
  IconClose,
  IconConnect,
  IconDashboard,
  IconHistory,
  IconMore,
  IconPackage,
  IconPositions,
  IconSettings,
  IconShield,
  IconSignal,
} from "@/components/app/icons";
import { useSheet } from "@/components/app/useSheet";

type NavItem = { href: string; label: string; icon: (p: { size?: number }) => React.ReactNode };

const TRADE: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: (p) => <IconDashboard {...p} /> },
  { href: "/app/intelligence", label: "Intelligence", icon: (p) => <IconSignal {...p} /> },
  { href: "/app/positions", label: "Positions", icon: (p) => <IconPositions {...p} /> },
  { href: "/app/history", label: "History", icon: (p) => <IconHistory {...p} /> },
];
const PLATFORM: NavItem[] = [
  { href: "/app/academy", label: "Academy", icon: (p) => <IconAcademy {...p} /> },
  { href: "/app/connect", label: "Connect", icon: (p) => <IconConnect {...p} /> },
  { href: "/app/chat", label: "Chat", icon: (p) => <IconChat {...p} /> },
  { href: "/app/packages", label: "Packages", icon: (p) => <IconPackage {...p} /> },
];
const ACCOUNT: NavItem[] = [
  { href: "/app/security", label: "Security", icon: (p) => <IconShield {...p} /> },
  { href: "/app/settings", label: "Settings", icon: (p) => <IconSettings {...p} /> },
];

const TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/intelligence": "Intelligence",
  "/app/positions": "Positions",
  "/app/history": "History",
  "/app/academy": "Academy",
  "/app/academy/certificates": "Certificates",
  "/app/connect": "Connect",
  "/app/chat": "Founding Lounge",
  "/app/packages": "Packages",
  "/app/security": "Security",
  "/app/settings": "Settings",
};

/**
 * Routes whose page renders the real `<h1>` — a lesson title, say. There the
 * bar shows its section label as plain text, so the document keeps exactly
 * one `<h1>` and it is not the word "HeroPips". Prefix match: these are
 * dynamic segments, which is precisely why TITLES cannot cover them.
 */
const PAGE_OWNS_HEADING: readonly { prefix: string; label: string }[] = [
  { prefix: "/app/academy/learn/", label: "Academy" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  return (
    <Link
      className="ap-nav-link"
      href={item.href}
      data-active={isActive(pathname, item.href)}
      aria-current={isActive(pathname, item.href) ? "page" : undefined}
      onClick={onNavigate}
    >
      {item.icon({ size: 18 })}
      {item.label}
    </Link>
  );
}

/* ---------- desktop sidebar ---------- */
export function Sidebar({ user }: { user: SessionUserRes }) {
  const pathname = usePathname();
  const initial = (user.display_name || "?").slice(0, 1).toUpperCase();
  return (
    <aside className="ap-sidebar">
      <Link href="/app" className="ap-logo" aria-label="HeroPips dashboard">
        <LevelUpMark size={26} />
        HeroPips
      </Link>
      <nav className="ap-nav" aria-label="App">
        <div className="ap-nav-label">Trade</div>
        {TRADE.map((it) => <NavLink key={it.href} item={it} pathname={pathname} />)}
        <div className="ap-nav-label">Platform</div>
        {PLATFORM.map((it) => <NavLink key={it.href} item={it} pathname={pathname} />)}
        <div className="ap-nav-label">Account</div>
        {ACCOUNT.map((it) => <NavLink key={it.href} item={it} pathname={pathname} />)}
      </nav>
      <div className="ap-member">
        <span className="ap-avatar" aria-hidden>{initial}</span>
        <div style={{ minWidth: 0 }}>
          <div className="ap-member-name">{user.display_name}</div>
          {user.founding ? <Badge tone="volt" style={{ padding: "2px 8px" }}>Founding</Badge> : null}
        </div>
      </div>
    </aside>
  );
}

/* ---------- sticky top bar ---------- */
export function TopBar() {
  const pathname = usePathname();
  const owned = PAGE_OWNS_HEADING.find((s) => pathname.startsWith(s.prefix));
  return (
    <header className="ap-topbar">
      {owned ? (
        <p className="ap-topbar-title">{owned.label}</p>
      ) : (
        <h1 className="ap-topbar-title">{TITLES[pathname] ?? "HeroPips"}</h1>
      )}
      <div className="ap-topbar-side" id="ap-topbar-side" />
    </header>
  );
}

/* ---------- mobile bottom tabs + More sheet ---------- */
const TABS: NavItem[] = [TRADE[0], TRADE[1], TRADE[2], PLATFORM[0]];
const MORE: NavItem[] = [TRADE[3], PLATFORM[1], PLATFORM[2], PLATFORM[3], ...ACCOUNT];

export function TabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreActive = MORE.some((it) => isActive(pathname, it.href));
  const sheetRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMoreOpen(false), [pathname]);
  useSheet(moreOpen, () => setMoreOpen(false), sheetRef);

  return (
    <>
      <nav className="ap-tabbar" aria-label="App tabs">
        {TABS.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="ap-tab"
            data-active={isActive(pathname, it.href)}
            aria-current={isActive(pathname, it.href) ? "page" : undefined}
          >
            {it.icon({ size: 20 })}
            {it.label === "Founding Lounge" ? "Chat" : it.label}
          </Link>
        ))}
        <button
          type="button"
          className="ap-tab"
          data-active={moreActive || moreOpen}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          onClick={() => setMoreOpen((v) => !v)}
        >
          <IconMore size={20} />
          More
        </button>
      </nav>
      {moreOpen ? (
        <>
          <div className="ap-sheet-backdrop" onClick={() => setMoreOpen(false)} aria-hidden />
          <div className="ap-sheet" role="dialog" aria-modal="true" aria-label="More" ref={sheetRef} tabIndex={-1}>
            <div className="ap-sheet-head">
              <h2 className="ap-sheet-title">More</h2>
              <button
                type="button"
                className="ap-tab"
                style={{ marginLeft: "auto", minHeight: 44, minWidth: 44 }}
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
              >
                <IconClose size={20} />
              </button>
            </div>
            <nav aria-label="More pages" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {MORE.map((it) => (
                <NavLink key={it.href} item={it} pathname={pathname} onNavigate={() => setMoreOpen(false)} />
              ))}
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}
