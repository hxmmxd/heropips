"use client";

import { useEffect } from "react";

/**
 * Registers the service worker and keeps it fresh:
 * - `updateViaCache: "none"` → the browser always revalidates sw.js itself
 * - re-checks for a new worker when the tab regains focus
 * - a waiting worker is activated immediately (SKIP_WAITING); pages keep
 *   running on their old cached chunks, so no forced reload is needed.
 * Silent on failure by design — offline support is progressive enhancement.
 *
 * NOT registered in development, and any worker already installed on the
 * machine is torn down. Two reasons, both cost real debugging time:
 *   - `next dev` serves unhashed chunk URLs, so a cache-first store hands back
 *     a previous compile's JS for a URL the current HTML still references.
 *     React attaches (fibers are present) but nothing responds to input, and
 *     CSS reads as if the file on disk never changed.
 *   - the CSP nonce is per request, so any HTML the worker replays is stamped
 *     with a nonce the current policy no longer allows.
 * `Network.setCacheDisabled` does not bypass a service worker, so neither
 * symptom looks like a caching problem while you are chasing it.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
        if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k);
      })().catch(() => {});
      return;
    }

    let reg: ServiceWorkerRegistration | undefined;

    const onVisible = () => {
      if (document.visibilityState === "visible") reg?.update().catch(() => {});
    };

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((r) => {
        reg = r;
        r.waiting?.postMessage("SKIP_WAITING");
        r.addEventListener("updatefound", () => {
          const next = r.installing;
          next?.addEventListener("statechange", () => {
            if (next.state === "installed") r.waiting?.postMessage("SKIP_WAITING");
          });
        });
      })
      .catch(() => {
        /* ignore */
      });

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return null;
}
