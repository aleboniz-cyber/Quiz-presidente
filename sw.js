// Service Worker — Monitor Pressione Arteriosa
const CACHE = 'bp-v2';
const CDN   = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.add(CDN).catch(() => {})));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    if (e.request.destination === 'document') {
        // HTML: network-first (sempre versione aggiornata se online)
        e.respondWith(
            fetch(e.request).catch(() => caches.match(e.request))
        );
    } else {
        // Asset CDN: cache-first (funziona offline)
        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(res => {
                    if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
                    return res;
                });
            })
        );
    }
});
