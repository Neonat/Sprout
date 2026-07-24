/*
 * Minimal service worker: an offline app shell plus a long-lived cache for the
 * painted backgrounds and the pixel font, which are large and never change.
 *
 * Deliberately hand-written rather than generated. The caching rules here are
 * few enough to read in one sitting, and a stale precache manifest is a
 * notoriously confusing class of bug.
 */

const VERSION = "v1";
const SHELL_CACHE = `plantemon-shell-${VERSION}`;
const ASSET_CACHE = `plantemon-assets-${VERSION}`;

/** Routes worth having available offline. */
const SHELL_ROUTES = ["/", "/garden", "/battle", "/scan"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // Individually, so one failed route cannot abort the whole install.
      .then((cache) => Promise.allSettled(SHELL_ROUTES.map((route) => cache.add(route))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API traffic: identification and sprite generation must always
  // hit the network, and responses are large and single-use.
  if (url.pathname.startsWith("/api/")) return;

  // Immutable build output, images and fonts: cache first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/img/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/font/")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pages: network first, falling back to the cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = (await caches.match(request)) || (await caches.match("/"));
    if (cached) return cached;
    throw new Error("Offline and no cached page available.");
  }
}
