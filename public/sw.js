/* Service worker kriterium : l'app s'ouvre même sans réseau. */
const CACHE = 'kriterium-v1'
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Jamais de cache pour l'API PocketBase ni pour les API de données (la synchro doit être fraîche)
  if (url.pathname.startsWith('/api/') || url.hostname === 'collectionapi.metmuseum.org') return
  if (/open-meteo\.com$|calendrier\.api\.gouv\.fr$/.test(url.hostname)) return

  // Navigation : réseau d'abord, repli sur l'app en cache
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/')))
    return
  }

  // Fichiers de l'app et images des œuvres : cache d'abord, mis à jour en arrière-plan
  const cacheable = url.origin === location.origin || /images\.metmuseum\.org$/.test(url.hostname)
  if (!cacheable) return
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => hit)
      return hit || net
    }),
  )
})
