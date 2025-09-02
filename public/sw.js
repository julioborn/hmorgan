// public/sw.js

// ===============================
// 1) Cache simple para offline
// ===============================
const CACHE = "hmorgan-v4"; // ⬅️ subí versión cuando cambies assets
const ASSETS = [
    "/",
    "/manifest.webmanifest",
    "/favicon-32x32.png",
    "/favicon-16x16.png",
    // Agregá otros assets si querés cachearlos en install, ej: CSS crítico, logos...
];

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

    // Navegación: si falla red, devolvé home (fallback)
    if (req.mode === "navigate") {
        e.respondWith(fetch(req).catch(() => caches.match("/")));
        return;
    }

    // Archivos estáticos comunes: cache-first con actualización
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
// 2) Push notifications
// ===============================
self.addEventListener("push", (event) => {
    // payload esperado: { title, body, url }
    let data = {};
    try {
        data = event.data.json();
    } catch {
        // si viene texto plano
        data = { title: "Notificación", body: event.data?.text() || "", url: "/" };
    }

    const title = data.title || "Notificación";
    const options = {
        body: data.body || "",
        icon: "/icons/icon-192x192.png",   // asegurate de tener estos íconos
        badge: "/icons/icon-72x72.png",
        data: { url: data.url || "/" },    // a dónde abrir al tocar
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const urlToOpen = event.notification?.data?.url || "/";

    // Reusar una pestaña existente si ya está abierta
    event.waitUntil(
        (async () => {
            const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
            const hadWindow = allClients.some((w) => {
                const u = new URL(w.url);
                // si tu app usa rutas internas, podés sólo enfocarla
                if (u.origin === self.location.origin) {
                    w.focus();
                    w.postMessage({ type: "OPEN_URL", url: urlToOpen }); // opcional
                    return true;
                }
                return false;
            });

            if (!hadWindow) {
                await clients.openWindow(urlToOpen);
            }
        })()
    );
});

// ===============================
// (Opcional) Mensajes desde la app
// ===============================
// Podés escuchar mensajes desde tus páginas si lo necesitás.
// self.addEventListener("message", (event) => {
//   // ejemplo: refrescar cache, etc.
// });
