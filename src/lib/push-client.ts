// lib/push-client.ts
export async function registerSW() {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
}

export async function subscribeUser(reg: ServiceWorkerRegistration) {
    if (!("PushManager" in window)) return null;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    // 👇 usamos ArrayBuffer para evitar el error de tipos
    const applicationServerKey = base64ToArrayBuffer(vapidPublicKey);

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey, // <- ArrayBuffer OK
        });
        console.log("Nueva suscripción creada:", sub.endpoint);
    } else {
        console.log("Suscripción existente encontrada:", sub.endpoint);
    }

    const resp = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(sub),
    });

    const text = await resp.text().catch(() => "");
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = text; }
    console.log("Respuesta de /api/push/subscribe:", resp.status, data);

    if (!resp.ok) throw new Error(`Error al suscribir: ${resp.status}`);
    return sub;
}

/** Convierte una VAPID public key (base64 URL-safe) a ArrayBuffer */
function base64ToArrayBuffer(base64Url: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
    const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes.buffer; // <- ArrayBuffer puro
}

/* Si preferís mantener tu helper original, otra salida sería:
   const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
   await reg.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: convertedKey.buffer as ArrayBuffer, // 👈 cast a ArrayBuffer
   });
*/
