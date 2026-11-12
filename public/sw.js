/* Rexaura Rentals service worker — bump VERSION to force an update */
const VERSION = "v3";
const SHELL = `rexaura-shell-${VERSION}`;
const IMAGES = `rexaura-images-${VERSION}`;
const MAX_IMAGES = 60;
const BASE = self.registration.scope; // e.g. https://user.github.io/repo/
const PRECACHE = [BASE, BASE + "offline.html", BASE + "manifest.webmanifest", BASE + "icons/icon-192.png", BASE + "icons/icon-512.png"];

self.addEventListener("install", (event) => {
  // Cache each file on its own: one missing file (e.g. offline.html in the wrong folder) must not break the whole install.
  event.waitUntil(
    caches.open(SHELL)
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, IMAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) { await cache.delete(keys[0]); return trim(cacheName, max); }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never touch Firebase / Google APIs: bookings, auth and admin data must always be live.
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!isFont && /(googleapis|firebaseio|firebaseapp|google)\.com$/.test(url.hostname)) return;

  // Page navigations: network first, then cached shell, then offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(BASE, copy)); return res; })
        .catch(async () => (await caches.match(BASE)) || caches.match(BASE + "offline.html"))
    );
    return;
  }

  // Car photos & Google Fonts: stale-while-revalidate.
  const isImage = req.destination === "image" || url.hostname === "images.unsplash.com";
  if (isImage || isFontHost) {
    event.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
          if (res.ok || res.type === "opaque") { cache.put(req, res.clone()); trim(IMAGES, MAX_IMAGES); }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Same-origin build assets (hashed by Vite): cache first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
