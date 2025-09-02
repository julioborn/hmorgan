// ===============================
// SW: cache básico + push
// ===============================
const CACHE = "hmorgan-v7"; // ⬅️ subí versión al cambiar assets

const ASSETS = [
    "/",
    "/manifest.webmanifest",
    "/favicon-32x32.png",
    "/favicon-16x16.png"
];

// Install: precache
self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
    self.skipWaiting();
});

// Activate: limpia caches viejos
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: navegación -> network con fallback /, assets -> cache-first
self.addEventListener("fetch", (e) => {
    const req = e.request;

    if (req.mode === "navigate") {
        e.respondWith(fetch(req).catch(() => caches.match("/")));
        return;
    }

    if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?)($|\?)/i.test(req.url)) {
        e.respondWith(
            caches.match(req).then((res) => {
                const fetchAndCache = fetch(req).then((netRes) => {
                    const copy = netRes.clone();
                    caches.open(CACHE).then((c) => c.put(req, copy));
                    return netRes;
                });
                return res || fetchAndCache;
            })
        );
    }
});

// ===============================
// Push notifications
// ===============================
self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data.json(); // esperado: { title, body, url, tag? }
    } catch {
        data = { title: "Notificación", body: event.data?.text() || "", url: "/" };
    }

    const title = data.title || "HMorgan";
    const options = {
        body: data.body || "",
        // Android:
        // - icon → ícono grande (puede ser maskable 512, Android lo reduce)
        // - badge → ícono chico monocromo (TEMP: usamos 96x96 normal hasta que tengas uno mono)
        icon: "/icon-maskable-512x512.png",
        badge: "/icon-96x96.png", // ⚠️ TEMPORAL: cuando tengas monocromo, cambiá a /icon-badge-96x96.png
        data: { url: data.url || "/" },
        vibrate: [80, 30, 80],
        timestamp: Date.now(),
        tag: data.tag || "hmorgan-points",
        renotify: true,
        actions: [
            { action: "open-qr", title: "Ver mi QR" },
            { action: "points", title: "Mis puntos" }
        ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const urlToOpen =
        event.action === "open-qr" ? "/cliente/qr" :
            event.action === "points" ? "/cliente/puntos" :
                event.notification?.data?.url || "/";

    event.waitUntil((async () => {
        const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of all) {
            const u = new URL(c.url);
            if (u.origin === self.location.origin) {
                c.focus();
                try { c.postMessage({ type: "OPEN_URL", url: urlToOpen }); } catch { }
                return;
            }
        }
        await clients.openWindow(urlToOpen);
    })());
});
