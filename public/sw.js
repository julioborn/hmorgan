// ✅ H MORGAN BAR - SERVICE WORKER v31
const CACHE = "hmorgan-v33";
const ASSETS = ["/", "/favicon.ico", "/manifest.json", "/icon-192x192.png", "/icon-512x512.png"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE);
            await cache.addAll(ASSETS);
            self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            // 🧹 Limpiar caches viejos
            const keys = await caches.keys();
            await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));

            // 🔁 Reclamar control inmediatamente
            await self.clients.claim();

            // 🔄 Notificar a los clientes activos para recargar
            const clientsArr = await self.clients.matchAll({ type: "window" });
            for (const client of clientsArr) {
                try {
                    client.postMessage({ type: "RELOAD_PAGE" }); // ✅ en lugar de navigate()
                } catch (e) {
                    console.warn("No se pudo enviar mensaje de recarga:", e);
                }
            }
        })()
    );
});

// ✅ Interceptar fetch (modo cache-first)
self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    event.respondWith(
        (async () => {
            const cached = await caches.match(request);
            if (cached) return cached;
            try {
                const response = await fetch(request);
                const cache = await caches.open(CACHE);
                cache.put(request, response.clone());
                return response;
            } catch {
                return cached || Response.error();
            }
        })()
    );
});

// 🔔 WebPush: mostrar notificación
self.addEventListener("push", (event) => {
    let data = {};
    try { data = event.data?.json() ?? {}; } catch {}

    event.waitUntil(
        self.registration.showNotification(data.title || "Morgan", {
            body: data.body || "",
            icon: "/morganwhite.png",
            badge: "/icon-badge-96x96.png",
            data: { url: data.url || "/" },
        })
    );
});

// 👆 WebPush: navegar al tap
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/";
    const fullUrl = "https://hmorgan.vercel.app" + url;

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ("focus" in client) {
                    client.navigate(fullUrl);
                    return client.focus();
                }
            }
            return self.clients.openWindow(fullUrl);
        })
    );
});

// 📨 Mensajes entrantes
self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
