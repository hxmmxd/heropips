"use client";

import * as React from "react";

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Shared behavior for .ap-sheet dialogs (More menu, OrderSheet):
 * - locks body scroll while open (no page scroll bleeding through the backdrop)
 * - Escape closes
 * - moves focus into the sheet, traps Tab, restores focus on close
 */
export function useSheet(open: boolean, onClose: () => void, ref: React.RefObject<HTMLElement | null>) {
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;

  React.useEffect(() => {
    if (!open) return;
    const sheet = ref.current;
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      sheet ? (Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)) as HTMLElement[]) : [];
    (focusables()[0] ?? sheet)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !sheet) return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !sheet.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey, true);
      prevFocus?.focus();
    };
  }, [open, ref]);
}
