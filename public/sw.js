/* Noor service worker — offline support for the Quran reader.
 *
 * Plain browser JS (this file is served from public/ verbatim — NO TypeScript
 * syntax, or the browser throws on registration). Hand-rolled rather than
 * next-pwa/Serwist because the site is a static export on a subpath and those
 * plugins need webpack config. Scope/paths are derived from this file's own
 * location so it works under any base path (local "/" or Pages "/<repo>/").
 */
const VERSION = "noor-v2"
const SHELL_CACHE = VERSION + "-shell"
const DATA_CACHE = VERSION + "-data"

// This file is served at `<base>/sw.js`; strip the filename to get the base.
const BASE = self.location.pathname.replace(/sw\.js$/, "")

// Minimal app shell. Individual surah pages/data are cached on first visit.
const SHELL_URLS = [BASE, BASE + "quran/", BASE + "manifest.json"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Don't fail the whole install if one URL 404s.
      Promise.allSettled(SHELL_URLS.map((u) => cache.add(u))),
    ),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.indexOf(VERSION) !== 0).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  // Only handle same-origin GETs; let CDN audio/tafsir hit the network freely.
  if (url.origin !== self.location.origin) return

  // Quran & Hadith data JSON → cache-first (immutable content).
  if (url.pathname.indexOf("/data/quran/") !== -1 || url.pathname.indexOf("/data/hadith/") !== -1) {
    event.respondWith(cacheFirst(request, DATA_CACHE))
    return
  }

  // Next.js build assets → cache-first (hashed filenames, safe to keep).
  if (url.pathname.indexOf("/_next/static/") !== -1) {
    event.respondWith(cacheFirst(request, SHELL_CACHE))
    return
  }

  // Page navigations → network-first, cached shell fallback when offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request))
    return
  }
})

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone())
          return res
        })
        .catch(() => cached || Response.error())
    }),
  )
}

function networkFirst(request) {
  return caches.open(SHELL_CACHE).then((cache) =>
    fetch(request)
      .then((res) => {
        if (res.ok) cache.put(request, res.clone())
        return res
      })
      .catch(() =>
        cache.match(request).then((cached) => {
          if (cached) return cached
          // Fall back to the cached Quran index if this exact page isn't cached.
          return cache.match(BASE + "quran/").then((fallback) => fallback || Response.error())
        }),
      ),
  )
}
