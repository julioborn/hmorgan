// ===============================
// ✅ H MORGAN BAR - SERVICE WORKER FINAL
// ===============================

const CACHE = "hmorgan-v31"; // 🔁 subí la versión para forzar actualización
const ASSETS = [
    "/", // Home
    "/manifest.webmanifest",
    "/favicon-32x32.png",
    "/favicon-16x16.png",
    "/icon-192x192.png",
    "/icon-512x512.png",
];

// ===============================
// 🧩 INSTALL
// ===============================
self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
    self.skipWaiting();
});

// ===============================
// 🚀 ACTIVATE (limpia SW viejos y reclama control)
// ===============================
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));

            try {
                // Desregistrar SW viejos si existieran
                const regs = await self.registration.scope
                    ? [self.registration]
                    : await self.registration.unregister();
            } catch { }

            // Reclamar control inmediato
            await self.clients.claim();

            // ✅ Intentar refrescar ventanas activas solo si es seguro
            const clientsArr = await self.clients.matchAll({ type: "window" });
            for (const client of clientsArr) {
                try {
                    // En Safari / PWA root puede tirar error → usamos reload por mensaje
                    client.postMessage({ type: "RELOAD_PAGE" });
                } catch (e) {
                    console.warn("No se pudo notificar reload:", e);
                }
            }
        })()
    );
});


// ===============================
// ⚡ FETCH (manejo inteligente de cache)
// ===============================
self.addEventListener("fetch", (e) => {
    const req = e.request;
    const url = new URL(req.url);

    // ❌ No cachear autenticación ni API
    if (
        url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/login") ||
        url.pathname.startsWith("/register") ||
        url.pathname.startsWith("/auth") ||
        url.pathname.includes("_next") // evitar bundles SSR de Next
    ) {
        return;
    }

    // ✅ Navegaciones: fallback offline
    if (req.mode === "navigate") {
        e.respondWith(
            fetch(req).catch(() => caches.match("/"))
        );
        return;
    }

    // ✅ Archivos estáticos
    if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ico|json)$/i.test(url.pathname)) {
        e.respondWith(
            caches.match(req).then((res) => {
                const fetchAndCache = fetch(req)
                    .then((netRes) => {
                        const copy = netRes.clone();
                        caches.open(CACHE).then((c) => c.put(req, copy));
                        return netRes;
                    })
                    .catch(() => res);
                return res || fetchAndCache;
            })
        );
    }
});

// ===============================
// 🔔 PUSH NOTIFICATIONS
// ===============================
self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data.json();
    } catch {
        data = { title: "H Morgan", body: event.data?.text() || "" };
    }

    const title = data.title || "H Morgan";
    const options = {
        body: data.body || "Tienes una nueva notificación 🍹",
        icon: "/icon-192x192.png",
        badge: "/icon-badge-96x96.png",
        data: { url: data.url || "/" },
        tag: data.tag || "hmorgan-push",
        renotify: false,
        vibrate: [80, 30, 80],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// ===============================
// 👆 CLICK EN NOTIFICACIÓN
// ===============================
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || "/";
    event.waitUntil(
        (async () => {
            const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
            for (const c of allClients) {
                if (c.url === targetUrl) {
                    c.focus();
                    return;
                }
            }
            await clients.openWindow(targetUrl);
        })()
    );
});

// ===============================
// 🔄 Escucha de mensajes desde el SW
// ===============================
self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

