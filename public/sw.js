// ===============================
// SW: cache + push notifications
// ===============================
const CACHE = "hmorgan-v23"; // ⬅️ subí la versión para forzar actualización

const ASSETS = [
    "/",
    "/manifest.webmanifest",
    "/favicon-32x32.png",
    "/favicon-16x16.png",
];

// ===============================
// INSTALACIÓN
// ===============================
self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
    self.skipWaiting();
});

// ===============================
// ACTIVACIÓN (recarga automática)
// ===============================
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            // 🔥 Eliminamos versiones anteriores
            await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));

            // 🔄 Recargamos todas las pestañas activas para aplicar el nuevo SW
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
self.addEventListener("fetch", (e) => {
    const req = e.request;
    const url = new URL(req.url);

    // ❌ Nunca cachear autenticación ni APIs dinámicas
    if (
        url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/login") ||
        url.pathname.startsWith("/logout") ||
        url.pathname.startsWith("/register") ||
        url.pathname.startsWith("/auth")
    ) {
        return; // Deja pasar al servidor sin interceptar
    }

    // ✅ Páginas de navegación
    if (req.mode === "navigate") {
        e.respondWith(fetch(req).catch(() => caches.match("/")));
        return;
    }

    // ✅ Archivos estáticos (imágenes, estilos, fuentes, scripts)
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
// Notificaciones Push (en español 🇦🇷)
// ===============================
self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data.json(); // esperado: { title, body, url, tag? }
    } catch {
        data = { title: "", body: event.data?.text() || "", url: "/" };
    }

    const title = (data.title || "").trim();
    const body =
        data.body ||
        "Tienes una nueva actualización en tu cuenta de puntos.";
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
        renotify: false, // 👈 evita mostrar "from HMorgan"
        silent: false,
        actions: [
            { action: "open-qr", title: "Ver mi código QR" },
            { action: "puntos", title: "Ver mis puntos" },
        ],
    };

    // ✅ Mostrar notificación sin "from HMorgan"
    event.waitUntil(
        (async () => {
            // 🔇 Si querés eliminar totalmente el título visible (solo texto)
            const notifTitle = title || "";
            const notifOptions = {
                ...options,
                requireInteraction: false, // no mostrar origen
            };

            // 🔧 Truco: si querés evitar "from HMorgan", no uses 'title' como nombre visible,
            // sino todo dentro de 'body', simulando un mensaje completo
            const displayTitle = ""; // <- vacío elimina el "from"
            const displayBody = notifTitle
                ? `${notifTitle}\n${body}`
                : body;

            await self.registration.showNotification(displayTitle, {
                ...notifOptions,
                body: displayBody,
            });
        })()
    );
});

// ===============================
// Click en notificación
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
            const all = await clients.matchAll({
                type: "window",
                includeUncontrolled: true,
            });
            for (const c of all) {
                const u = new URL(c.url);
                if (u.origin === self.location.origin) {
                    c.focus();
                    try {
                        c.postMessage({ type: "OPEN_URL", url: urlToOpen });
                    } catch { }
                    return;
                }
            }
            await clients.openWindow(urlToOpen);
        })()
    );
});
