/**
 * Offline shell.
 *
 * The point is that opening the app in a waiting room with one bar of signal
 * shows the app rather than a blank page. It caches the shell only.
 *
 * It never touches Supabase. Those requests are cross-origin and fall straight
 * through, so no symptom data is ever written to the cache, and nothing on
 * screen is ever a stale copy of what is in the database.
 */

const CACHE = 'symptom-log-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest'])).catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // Supabase and anything else

  // Navigations: fresh when there is a network, cached shell when there is not.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copy))
          return res
        })
        .catch(() => caches.match('./').then((r) => r || caches.match(req))),
    )
    return
  }

  // Build output is content-hashed, so a hit is always the right file.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
