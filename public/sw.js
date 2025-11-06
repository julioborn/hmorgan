// 🔥 SERVICE WORKER DE LIMPIEZA TOTAL 🔥
self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    self.registration.unregister(); // 🚫 Desregistra este SW
    self.clients.claim();
    console.log("🧹 Limpieza completa de cachés y desregistro SW");
});

self.addEventListener("fetch", (e) => {
    // Fuerza que todo vaya directo al servidor
    e.respondWith(fetch(e.request));
});
