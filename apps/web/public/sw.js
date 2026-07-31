/* HeroPips service worker.
 *
 * Strategy map (same-origin GET only):
 *   /_next/static/, fonts, icons   → cache-first  (content-hashed/immutable)
 *   /_next/image, /media/          → cache-first, capped
 *   ALL navigations                → network only, /offline on failure
 *   /api/                          → network only (never cache trading data)
 *
 * NO DOCUMENT IS EVER CACHED. Beyond the authenticated-data reason below, a
 * replayed document is stamped with a per-request CSP nonce the live policy no
 * longer allows and pins an asset graph the origin has already dropped — both
 * produce a page that renders and then does nothing. Only the public /offline
 * shell is precached, and it is the sole fallback.
 *
 * NOTHING AUTHENTICATED IS EVER CACHED. /app/** is server-rendered with
 * member data (equity curve, open positions, email, package), and the Cache
 * API is shared by every profile on the device and outlives the session. A
 * cached /app/dashboard is the previous user's account served to the next
 * person to open the browser, offline. Logout also returns
 * `Clear-Site-Data: "cache", "storage"`, which drops these stores and
 * unregisters this worker — belt and braces.
 *
 * Old hashed chunks stay cached across deploys, so an already-open page keeps
 * navigating even after the server has dropped its assets. Bump VERSION to
 * invalidate everything.
 */
/* BUMP THIS whenever cached bytes change — it is the ONLY way an existing
 * install drops cache-first assets. `install` re-runs only when this file
 * changes byte-wise, and `activate` deletes just the stores whose name does
 * NOT start with VERSION, so same-version stores survive forever. A stale
 * PRECACHE_STATIC entry (manifest, icons, fonts) is invisible until a bump.
 *   v5 — purged hp-v4, which could hold authenticated /app/** HTML.
 *   v6 — purges hp-v5, whose static store pinned a pre-rewrite
 *        /manifest.webmanifest.
 *   v7 — purges hp-v6-pages, which holds marketing HTML stamped with expired
 *        CSP nonces. Documents are no longer cached at all.
 *   v8 — purges hp-v7-static, which pinned the pre-redesign auth/app CSS and
 *        chunks. The (auth) shell moved into a group layout, so every hashed
 *        asset the offline shell references changed; a v7 install served the
 *        old chunks cache-first and hard-failed hydration. */
const VERSION = "hp-v8";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const MEDIA_CACHE = `${VERSION}-media`;
const OFFLINE_URL = "/offline";

const PRECACHE_STATIC = ["/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

// No PAGE_LIMIT: the page cache now holds exactly one entry, the /offline
// shell, so there is nothing to trim.
const MEDIA_LIMIT = 80;

/** Cache the offline page AND the hashed CSS/JS it references, so the
 *  fallback is fully styled and hydrated with the network gone. */
async function precacheOffline() {
  const pages = await caches.open(PAGE_CACHE);
  const res = await fetch(OFFLINE_URL, { cache: "no-cache" });
  if (!res.ok) return;
  await pages.put(OFFLINE_URL, res.clone());
  const html = await res.text();
  const assets = [...new Set([...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
  const statics = await caches.open(STATIC_CACHE);
  await Promise.all(assets.map((a) => statics.add(a).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      precacheOffline(),
      caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE_STATIC)),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/** Drop oldest entries (insertion order) once a cache exceeds `limit`. */
async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)));
}

async function cacheFirst(req, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  // status 200 only: Cache API rejects partial 206 bodies (media Range requests)
  if (res.status === 200 && (res.type === "basic" || res.type === "default")) {
    await cache.put(req, res.clone());
    if (limit) trim(cacheName, limit); // fire-and-forget
  }
  return res;
}

/**
 * Documents are NEVER written to a cache — only read back from the precached
 * /offline shell when the network is gone.
 *
 * This used to be network-first-with-write, which is wrong for this app for two
 * independent reasons:
 *   1. The CSP carries a per-request nonce (middleware.ts). A replayed document
 *      is stamped with a nonce the live policy no longer allows, so every
 *      inline script in it — including Next's own hydration and flight-data
 *      chunks — is blocked. The page renders and then does nothing.
 *   2. A document pins the exact `/_next/static/**` graph of the build that
 *      produced it. After a deploy those URLs are gone from the origin, so the
 *      replayed shell boots against assets that 404.
 * Both failures present as a page that looks right and is completely dead,
 * which is strictly worse than the offline page it now falls back to.
 */
async function pageNetworkOnly(req) {
  try {
    return await fetch(req);
  } catch {
    const cache = await caches.open(PAGE_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Ranged media fetches (video seeks) must stream from the network —
  // serving/putting partial bodies through the Cache API breaks playback.
  if (req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Trading/account data: always live, never from cache.
  if (url.pathname.startsWith("/api/")) return;

  // One strategy for every document now, authenticated or not: straight to the
  // network, never written to a cache. /app/** was already network-only
  // (nothing authenticated may be replayed to the next person on the device);
  // public pages joined it because a replayed document carries a dead CSP nonce
  // and a stale asset graph. The precached /offline shell is the only fallback.
  if (req.mode === "navigate") {
    event.respondWith(pageNetworkOnly(req));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || /^\/(icon[^/]*|favicon\.ico|manifest\.webmanifest)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (url.pathname.startsWith("/media/") || url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheFirst(req, MEDIA_CACHE, MEDIA_LIMIT));
  }
});
