// lib/push-client.ts
export async function registerSW() {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
}

// lib/push-client.ts
export async function subscribeUser(reg: ServiceWorkerRegistration) {
    if (!("PushManager" in window)) throw new Error("PushManager no disponible");

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    const key = urlBase64ToUint8Array(vapidPublicKey); // Uint8Array

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key as unknown as BufferSource, // <- TS OK, runtime iOS OK
        });
        console.log("Nueva suscripción:", sub.endpoint);
    } else {
        console.log("Suscripción existente:", sub.endpoint);
    }

    const resp = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(sub),
    });

    if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`POST /api/push/subscribe ${resp.status}: ${txt}`);
    }
    return sub;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64Safe);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

