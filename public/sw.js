// 🔥 SW DE RESCATE TOTAL 🔥
// Este service worker elimina TODO, se auto-desactiva y fuerza recarga desde el servidor.

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", async () => {
    try {
        // 🧹 Borra todos los cachés existentes
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));

        // 🚫 Desregistra este service worker
        const regs = await self.registration.unregister();
        console.log("🧹 SW y cachés eliminados:", regs);

        // 🔁 Reclama control y recarga todas las pestañas abiertas
        const clientsArr = await self.clients.matchAll({ type: "window" });
        for (const client of clientsArr) {
            client.navigate(client.url);
        }
    } catch (err) {
        console.error("Error limpiando SW:", err);
    }
});

self.addEventListener("fetch", (e) => {
    // 🔧 Pide todo directamente al servidor (sin cache)
    e.respondWith(fetch(e.request));
});
