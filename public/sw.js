const CACHE_NAME = "noor-v1"

const STATIC_ASSETS = [
  "/",
  "/quran",
  "/hadith",
  "/videos",
  "/search",
  "/manifest.json",
]

const DATA_CACHE = "noor-data-v1"

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        console.log("Some static assets could not be cached")
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.pathname.startsWith("/data/quran/") || url.pathname.startsWith("/data/hadith/")) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone())
            }
            return response
          }).catch(() => cached || new Response("Offline", { status: 503 }))
          return cached || fetchPromise
        })
      })
    )
    return
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone())
            }
            return response
          })
          return cached || fetchPromise
        })
      })
    )
    return
  }

  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cached) => {
        return cached || caches.match("/")
      })
    })
  )
})

export {}
