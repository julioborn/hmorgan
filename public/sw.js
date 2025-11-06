// 🔥 SW DE RESCATE TOTAL 🔥
// Elimina TODO el caché, desactiva versiones viejas y recarga la app limpia

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      const clientsArr = await self.clients.matchAll({ type: "window" });
      for (const client of clientsArr) {
        if (client.url && !client.url.startsWith("about:")) {
          try {
            client.navigate(client.url);
          } catch (e) {
            console.warn("No se pudo recargar cliente:", e);
          }
        }
      }

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request));
});
