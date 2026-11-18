/*
 * Knowledge Archive service worker — the PWA install/offline layer.
 *
 * Installability: Chrome requires a registered service worker with a
 * fetch handler before it will offer "Install app"; this file is that
 * handler, and it doubles as the offline cache.
 *
 * Strategy: stale-while-revalidate for every same-origin GET — the
 * archive paints instantly from cache while a fresh copy refreshes
 * behind it, so a pushed site update appears on the next load without
 * ever blocking a first render. Everything same-origin is cached on
 * demand (hash-named _next chunks, fonts, sounds, ROMs, the game
 * runtime), so the whole archive — Games room included — works offline
 * after one visit.
 *
 * Deliberately bypassed:
 *   - cross-origin requests (the link rows' Google Drive / onion targets)
 *   - video/audio: the background boulder loop issues Range requests,
 *     which a full-response cache would break — it streams untouched
 *   - /knowledge-archive.apk (the 36 MB signed binary the visitor
 *     explicitly downloads from the poster card — not an asset to cache)
 *   - /app-update.json (the Android shell's own update manifest)
 */
const CACHE = 'knowledge-archive-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.destination === 'video' || req.destination === 'audio') return;
  if (/\.apk$/.test(url.pathname)) return;
  if (url.pathname === '/app-update.json') return;

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        const refresh = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => hit);
        return hit || refresh;
      })
    )
  );
});
