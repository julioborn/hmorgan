// sw.js – cache simple offline
const CACHE = "hmorgan-v1";
const ASSETS = ["/", "/manifest.webmanifest", "/favicon-32x32.png", "/favicon-16x16.png"];

self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.mode === "navigate") {
        e.respondWith(fetch(req).catch(() => caches.match("/")));
    } else if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?)$/.test(req.url)) {
        e.respondWith(
            caches.match(req).then((res) => res || fetch(req).then((r) => {
                const copy = r.clone();
                caches.open(CACHE).then((c) => c.put(req, copy));
                return r;
            }))
        );
    }
});
