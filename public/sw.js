// ===============================
// SW: CACHE + PUSH NOTIFICATIONS
// ===============================
const CACHE = "hmorgan-v30"; // ⬅️ 🔥 Subí la versión en cada deploy

const ASSETS = [
    "/",
    "/manifest.webmanifest",
    "/favicon-32x32.png",
    "/favicon-16x16.png",
    "/icon-192.png",
    "/icon-badge-96x96.png",
];

// ===============================
// INSTALACIÓN
// ===============================
self.addEventListener("install", (event) => {
    console.log("💾 [SW] Instalando nueva versión:", CACHE);
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
    self.skipWaiting(); // 🔥 fuerza activación inmediata
});

// ===============================
// ACTIVACIÓN (limpieza automática + recarga)
// ===============================
self.addEventListener("activate", (event) => {
    console.log("🚀 [SW] Activando y limpiando cachés viejos...");
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
            self.clients.claim();

            // 🔁 Recargar todas las pestañas activas para aplicar nueva versión
            const clientsArr = await self.clients.matchAll({ type: "window" });
            for (const client of clientsArr) {
                client.navigate(client.url);
            }
        })()
    );
});

// ===============================
// FETCH (manejo de caché selectivo)
// ===============================
self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // ❌ Nunca cachear APIs o autenticación
    if (
        url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/auth") ||
        url.pathname.includes("login") ||
        url.pathname.includes("logout") ||
        url.pathname.includes("register")
    ) {
        return; // dejar pasar al servidor directamente
    }

    // ✅ Páginas principales
    if (req.mode === "navigate") {
        event.respondWith(fetch(req).catch(() => caches.match("/")));
        return;
    }

    // ✅ Archivos estáticos
    if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?)($|\?)/i.test(req.url)) {
        event.respondWith(
            caches.match(req).then((res) => {
                const fetchAndCache = fetch(req)
                    .then((netRes) => {
                        const copy = netRes.clone();
                        caches.open(CACHE).then((cache) => cache.put(req, copy));
                        return netRes;
                    })
                    .catch(() => res);
                return res || fetchAndCache;
            })
        );
    }
});

// ===============================
// PUSH NOTIFICATIONS 🇦🇷
// ===============================
self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data.json();
    } catch {
        data = { title: "", body: event.data?.text() || "", url: "/" };
    }

    const title = (data.title || "").trim();
    const body =
        data.body || "Tienes una nueva actualización en tu cuenta de puntos.";
    const url = data.url || "/";
    const tag = data.tag || "hmorgan-push";

    const options = {
        body,
        icon: "/icon-192.png",
        badge: "/icon-badge-96x96.png",
        data: { url },
        lang: "es-AR",
        dir: "ltr",
        vibrate: [80, 30, 80],
        timestamp: Date.now(),
        tag,
        renotify: false,
        silent: false,
        actions: [
            { action: "open-qr", title: "Ver mi código QR" },
            { action: "puntos", title: "Ver mis puntos" },
        ],
    };

    event.waitUntil(
        (async () => {
            // ✅ Notificación limpia (sin "from HMorgan")
            const displayTitle = ""; // 👈 vacío evita mostrar "from HMorgan"
            const displayBody = title ? `${title}\n${body}` : body;

            await self.registration.showNotification(displayTitle, {
                ...options,
                body: displayBody,
                requireInteraction: false,
            });
        })()
    );
});

// ===============================
// CLICK EN NOTIFICACIÓN
// ===============================
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const urlToOpen =
        event.action === "open-qr"
            ? "/cliente/qr"
            : event.action === "puntos"
                ? "/cliente/puntos"
                : event.notification?.data?.url || "/";

    event.waitUntil(
        (async () => {
            const allClients = await clients.matchAll({
                type: "window",
                includeUncontrolled: true,
            });

            for (const client of allClients) {
                const u = new URL(client.url);
                if (u.origin === self.location.origin) {
                    client.focus();
                    try {
                        client.postMessage({ type: "OPEN_URL", url: urlToOpen });
                    } catch { }
                    return;
                }
            }
            await clients.openWindow(urlToOpen);
        })()
    );
});
