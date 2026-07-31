"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@heropips/ui";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLockup } from "./BrandLockup";
import { NAV } from "./nav-config";

/** Hover-intent delay before the mega panel closes on mouseleave. */
const CLOSE_DELAY_MS = 150;

export function Nav() {
  const pathname = usePathname();
  /** Id of the open mega panel, or null when every panel is closed. */
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  /** Per-panel wrapper (trigger + panel): hover intent + outside-click boundary. */
  const megaRefs = useRef(new Map<string, HTMLLIElement>());
  /** Per-panel trigger buttons — Escape returns focus to the one that opened. */
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const burgerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelScheduledClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openMega = (id: string) => {
    cancelScheduledClose();
    setOpenId(id);
  };
  const closeMega = () => {
    cancelScheduledClose();
    setOpenId(null);
  };
  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimer.current = window.setTimeout(() => setOpenId(null), CLOSE_DELAY_MS);
  };

  /* Route change closes everything. */
  useEffect(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setOpenId(null);
    setMobileOpen(false);
  }, [pathname]);

  /* Clear any pending close timer on unmount. */
  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  /* Escape closes; focus returns to the control that opened. */
  useEffect(() => {
    if (openId === null && !mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openId !== null) {
        setOpenId(null);
        triggerRefs.current.get(openId)?.focus();
      }
      if (mobileOpen) {
        setMobileOpen(false);
        burgerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openId, mobileOpen]);

  /* Click outside the open trigger/panel pair closes the mega panel. */
  useEffect(() => {
    if (openId === null) return;
    const onPointerDown = (e: PointerEvent) => {
      const root = megaRefs.current.get(openId);
      if (root && e.target instanceof Node && !root.contains(e.target)) setOpenId(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openId]);

  /* Body scroll lock while the mobile menu is open. */
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  /* Crossing to desktop width dismisses the mobile menu (and its lock). */
  useEffect(() => {
    if (!mobileOpen) return;
    const mq = window.matchMedia("(min-width: 921px)");
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mobileOpen]);

  const isSection = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="hp-nav">
      <div className="container hp-nav-row">
        <BrandLockup />

        {/* ---------- desktop ---------- */}
        <nav className="hp-desktop" aria-label="Primary">
          <ul className="hp-links">
            {NAV.panels.map((panel) => {
              const isOpen = openId === panel.id;
              const panelDomId = `hp-mega-panel-${panel.id}`;
              const rail = panel.rail;
              const footRight = panel.footer.right;
              return (
                <li
                  key={panel.id}
                  ref={(el) => {
                    if (el) megaRefs.current.set(panel.id, el);
                    else megaRefs.current.delete(panel.id);
                  }}
                  className="hp-mega-li"
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") openMega(panel.id);
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "mouse") scheduleClose();
                  }}
                >
                  <button
                    ref={(el) => {
                      if (el) triggerRefs.current.set(panel.id, el);
                      else triggerRefs.current.delete(panel.id);
                    }}
                    type="button"
                    className={`hp-trigger${isOpen ? " is-open" : ""}${isSection(panel.activePrefix) ? " is-active" : ""}`}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    aria-controls={panelDomId}
                    onClick={() => (isOpen ? closeMega() : openMega(panel.id))}
                  >
                    {panel.label}
                    <svg className="hp-chev" width={12} height={12} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Rendered unconditionally and closed with `hidden`, not
                      `{isOpen && …}`: conditional rendering kept every mega
                      link out of the server HTML, so the primary nav
                      contributed zero crawlable internal links. */}
                  <div className="hp-mega-wrap" hidden={!isOpen}>
                    <div className="container">
                      <div
                        className={`hp-mega${rail ? "" : " hp-mega--slim"}`}
                        id={panelDomId}
                        aria-label={`${panel.label} menu`}
                       role="group">
                        <div className="hp-mega-grid">
                          {panel.groups.map((group) => (
                            <div key={group.title} className="hp-group">
                              <div className="hp-group-title">{group.title}</div>
                              <ul className="hp-group-items">
                                {group.items.map((item) => (
                                  <li key={item.href}>
                                    <Link href={item.href} className="hp-item" onClick={closeMega}>
                                      <span className="hp-item-ico">{item.icon}</span>
                                      <span className="hp-item-text">
                                        <span className="hp-item-label">{item.label}</span>
                                        <span className="hp-item-desc">{item.desc}</span>
                                      </span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}

                          {rail && (
                            <aside className="hp-rail">
                              <div className="hp-rail-eyebrow">{rail.eyebrow}</div>
                              <div className="hp-rail-head">{rail.headline}</div>
                              <p className="hp-rail-line">{rail.line}</p>
                              <div className="hp-rail-ctas">
                                <ButtonLink
                                  href={rail.primary.href}
                                  variant={rail.primary.variant}
                                  size="sm"
                                  onClick={closeMega}
                                  style={{ width: "100%" }}
                                >
                                  {rail.primary.label}
                                </ButtonLink>
                                <ButtonLink
                                  href={rail.secondary.href}
                                  variant={rail.secondary.variant}
                                  size="sm"
                                  onClick={closeMega}
                                  style={{ width: "100%" }}
                                >
                                  {rail.secondary.label}
                                </ButtonLink>
                              </div>
                            </aside>
                          )}
                        </div>

                        <div className="hp-mega-foot">
                          <div className="hp-foot-left">
                            {panel.footer.left.map((l) => (
                              <Link key={l.href} href={l.href} className="hp-foot-link" onClick={closeMega}>
                                {l.label}
                              </Link>
                            ))}
                          </div>
                          {footRight && (
                            <Link href={footRight.href} className="hp-foot-link" onClick={closeMega}>
                              {footRight.label}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}

            {NAV.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`hp-link${isSection(l.href) ? " is-active" : ""}`}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hp-ctas">
            <ThemeToggle />
            {NAV.ctas.map((cta) => (
              <ButtonLink key={cta.href} href={cta.href} variant={cta.variant} size="sm">
                {cta.label}
              </ButtonLink>
            ))}
          </div>
        </nav>

        {/* ---------- burger ---------- */}
        <button
          ref={burgerRef}
          type="button"
          className="hp-burger"
          aria-expanded={mobileOpen}
          aria-controls="hp-mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? (
            <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 5l14 14M19 5 5 19" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
          ) : (
            <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M3 8h18M3 16h18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* ---------- mobile ---------- */}
      <nav className="hp-mobile" id="hp-mobile-menu" aria-label="Menu" hidden={!mobileOpen}>
        <div className="container hp-mobile-inner">
          <div className="hp-m-theme">
            <span className="hp-m-theme-label">Appearance</span>
            <ThemeToggle />
          </div>
          {NAV.panels.flatMap((panel) =>
            panel.groups.map((group) => (
              <div key={`${panel.id}-${group.title}`}>
                <div className="hp-group-title">{group.title}</div>
                <ul className="hp-m-items">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="hp-m-item" onClick={() => setMobileOpen(false)}>
                        <span className="hp-item-ico">{item.icon}</span>
                        <span className="hp-item-text">
                          <span className="hp-item-label">{item.label}</span>
                          <span className="hp-item-desc">{item.desc}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )),
          )}

          <ul className="hp-m-links">
            {NAV.links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`hp-m-link${isSection(l.href) ? " is-active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hp-m-ctas">
            {NAV.ctas.map((cta) => (
              <ButtonLink
                key={cta.href}
                href={cta.href}
                variant={cta.variant}
                size="md"
                onClick={() => setMobileOpen(false)}
                style={{ flex: 1 }}
              >
                {cta.label}
              </ButtonLink>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
