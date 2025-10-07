// ===============================
// SW: cache + push notifications
// ===============================
const CACHE = "hmorgan-v13"; // ⬅️ nueva versión para refrescar

const ASSETS = [
    "/",
    "/manifest.webmanifest",
    "/favicon-32x32.png",
    "/favicon-16x16.png",
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
// Notificaciones Push (en español 🇦🇷)
// ===============================
self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data.json(); // esperado: { title, body, url, tag? }
    } catch {
        data = { title: "", body: event.data?.text() || "", url: "/" };
    }

    // 🧩 Usamos los datos recibidos, sin forzar "Morgan"
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

    // ✅ En iOS, si no hay título, usamos solo el body como título visible
    if (!title) {
        event.waitUntil(
            self.registration.showNotification(body, options)
        );
    } else {
        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }
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
F