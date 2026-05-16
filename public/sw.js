/**
 * Minimale service worker voor TijdRegistratie PWA.
 *
 * Doel: de app installeerbaar maken op iOS/Android home screen. We cachen
 * BEWUST geen HTML-pagina's: die zijn auth-gebonden en server-rendered,
 * dus een verkeerde cache zou bv. dashboard-data van een vorige gebruiker
 * kunnen tonen. We cachen alleen iconen, manifest en /_next/static
 * artefacten die immutable hashed filenames hebben.
 */

const CACHE = "tw-static-v1";
const PRECACHE = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
  "/apple-touch-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Cache-first voor immutable Next.js assets en de pre-cached static files.
  const isImmutable =
    url.pathname.startsWith("/_next/static/") ||
    PRECACHE.includes(url.pathname);

  if (isImmutable) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch (e) {
          if (hit) return hit;
          throw e;
        }
      })
    );
  }
});

// Boodschap vanuit de app om direct te activeren na een update
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/* ─── Web push reminders ─────────────────────────────────────────────────── */

self.addEventListener("push", (event) => {
  let payload = {
    title: "TijdRegistratie",
    body: "Je hebt een nieuwe melding.",
    url: "/uren",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch (e) {
    // payload was geen JSON; gebruik defaults
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: payload.tag || undefined,
      data: { url: payload.url },
      vibrate: [120, 60, 120],
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/uren";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Focus een bestaand venster dat al op de juiste origin staat, en stuur 'm naar de target.
      for (const c of clientsList) {
        if (c.url.startsWith(self.location.origin)) {
          await c.focus();
          if ("navigate" in c) {
            try {
              return await c.navigate(targetUrl);
            } catch (e) {
              // sommige browsers staan navigate niet toe; openen we dan een nieuw venster
            }
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
