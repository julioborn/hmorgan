// 🔥 SW DE RESCATE TOTAL 🔥
// Este service worker elimina TODO, se auto-desactiva y fuerza recarga desde el servidor.

const CACHE = "hmorgan-rescate-v1"; // solo para referencia

self.addEventListener("install", () => {
    // se activa inmediatamente
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            // 🧹 eliminar todos los caches
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));

            // 🧽 eliminar SWs viejos y recargar las ventanas
            const clientsArr = await self.clients.matchAll({ type: "window" });
            for (const client of clientsArr) {
                // ✅ evitar errores con iframes o urls no válidas
                if (client.url && !client.url.startsWith("about:")) {
                    try {
                        client.navigate(client.url);
                    } catch (e) {
                        console.warn("No se pudo recargar cliente:", e);
                    }
                }
            }

            // tomar control inmediato de todas las pestañas
            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (e) => {
    // 🔧 siempre pide al servidor, sin cache
    e.respondWith(fetch(e.request));
});
