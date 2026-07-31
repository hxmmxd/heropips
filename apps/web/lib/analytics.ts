/* =========================================================================
 * Client-safe analytics helpers — GA4 (gtag) + Microsoft Clarity.
 *
 * Everything here no-ops on the server and when the vendor script never
 * loaded (NEXT_PUBLIC_GA4_ID unset, consent denied, blocked, offline).
 * Consent choice persists in localStorage under `hp_consent`.
 * ======================================================================= */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type ConsentChoice = "granted" | "denied";

const CONSENT_KEY = "hp_consent";

/** Fire a GA4 event. Safe to call anywhere — silently drops on server/no-gtag. */
export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}

/** Stored consent choice, or null when the visitor hasn't decided yet. */
export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    /* private mode / quota — consent simply won't persist */
  }
}

/**
 * Grant analytics consent: persist the choice, lift GA4 Consent Mode, and
 * lazy-load Clarity (which only ever loads post-consent).
 */
export function consentGranted(): void {
  writeConsent("granted");
  if (typeof window === "undefined") return;
  // gtag pushes the live `arguments` object into dataLayer; the inline
  // bootstrap normally defines it, but consent can be granted before that
  // script runs, so recreate the queue-pusher when missing.
  if (typeof window.gtag !== "function") {
    const queue = (window.dataLayer = window.dataLayer ?? []);
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      queue.push(arguments);
    };
  }
  window.gtag("consent", "update", { analytics_storage: "granted" });
  loadClarity();
}

/**
 * Inject Microsoft Clarity. No-op on server, when NEXT_PUBLIC_CLARITY_ID is
 * unset, or when already loaded. TS translation of the standard
 * `(function(c,l,a,r,i,t,y){...})(window,document,"clarity","script",ID)`.
 */
export function loadClarity(): void {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID;
  if (!id || typeof window === "undefined" || window.clarity) return;
  const stub = function clarity() {
    // eslint-disable-next-line prefer-rest-params
    (stub.q = stub.q ?? []).push(arguments);
  } as ((...args: unknown[]) => void) & { q?: unknown[] };
  window.clarity = stub;
  const t = document.createElement("script");
  t.async = true;
  t.src = `https://www.clarity.ms/tag/${encodeURIComponent(id)}`;
  const y = document.getElementsByTagName("script")[0];
  if (y?.parentNode) y.parentNode.insertBefore(t, y);
  else document.head.appendChild(t);
}
