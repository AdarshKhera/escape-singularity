/* Escape Singularity service worker: lets the game start offline after one
   online visit. Pages are network-first (a new deploy is always picked up
   when online); hashed assets, sprites and fonts are cache-first with a
   background refresh. Scope is the directory this file is served from, so it
   works under the GitHub Pages subpath. */

// __BUILD_ID__ is replaced at build time (build/precacheManifest.ts), so every
// deploy is a new worker with a new cache; activate drops the old ones.
const CACHE = 'escape-singularity-__BUILD_ID__'
const SCOPE = self.registration.scope
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

// The page's own bundles were fetched before this worker existed, so install
// precaches the full build list rather than relying on runtime caching.
async function precache() {
  const cache = await caches.open(CACHE)
  const urls = [SCOPE]
  try {
    const response = await fetch(`${SCOPE}precache.json`, { cache: 'no-store' })
    if (response.ok) {
      const { files } = await response.json()
      if (Array.isArray(files)) urls.push(...files.map((file) => `${SCOPE}${file}`))
    }
  } catch {
    // offline during install: the runtime cache still fills as the game loads
  }
  // one missing file must not abort the whole install
  await Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)))
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

function isCacheable(url) {
  if (url.href.startsWith(SCOPE)) return true
  return FONT_HOSTS.includes(url.hostname)
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = (await cache.match(request)) || (await cache.match(SCOPE))
    if (cached) return cached
    throw error
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)
  if (cached) return cached
  const fresh = await refresh
  return fresh || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (!isCacheable(url)) return
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }
  event.respondWith(cacheFirst(request))
})
