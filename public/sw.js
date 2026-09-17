// ✅ H MORGAN BAR - SERVICE WORKER v34
const CACHE = "hmorgan-v34";
const STATIC_ASSETS = ["/favicon.ico", "/manifest.json", "/icon-192x192.png", "/icon-512x512.png"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            // Limpiar caches viejos
            const keys = await caches.keys();
            await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
            await self.clients.claim();

            // Notificar a los clientes activos para recargar
            const clientsArr = await self.clients.matchAll({ type: "window" });
            for (const client of clientsArr) {
                try { client.postMessage({ type: "RELOAD_PAGE" }); } catch { }
            }
        })()
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // 🚫 API: nunca cachear
    if (url.pathname.startsWith("/api/")) return;

    // ✅ Bundles de Next.js (/_next/static/): cache-first
    // Tienen hash único por deploy → nuevos bundles = nueva URL → siempre frescos
    if (url.pathname.startsWith("/_next/static/")) {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request).then(response => {
                    caches.open(CACHE).then(cache => cache.put(request, response.clone()));
                    return response;
                }).catch(() => Response.error());
            })
        );
        return;
    }

    // ✅ Todo lo demás (HTML, páginas, imágenes públicas): network-first
    // Así siempre se sirve el código más reciente; la caché es solo fallback offline
    event.respondWith(
        fetch(request).then(response => {
            // Cachear copia fresca para uso offline
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, clone));
            return response;
        }).catch(() => caches.match(request).then(cached => cached || Response.error()))
    );
});

// 🔔 WebPush: mostrar notificación o pasar al cliente si está en primer plano
self.addEventListener("push", (event) => {
    let data = {};
    try { data = event.data?.json() ?? {}; } catch {}

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            const focused = clients.find((c) => c.visibilityState === "visible");
            if (focused) {
                focused.postMessage({ type: "PUSH_NOTIFICATION", title: data.title || "", body: data.body || "" });
                return;
            }
            return self.registration.showNotification(data.title || "Morgan", {
                body: data.body || "",
                icon: "/morganwhite.png",
                badge: "/icon-badge-96x96.png",
                data: { url: data.url || "/" },
            });
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
