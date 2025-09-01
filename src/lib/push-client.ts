export async function registerSW() {
    if (!("serviceWorker" in navigator)) return null;

    const reg = await navigator.serviceWorker.register("/sw.js");
    console.log("Service Worker registrado:", reg);

    return reg;
}

export async function subscribeUser(reg: ServiceWorkerRegistration) {
    if (!("PushManager" in window)) return null;

    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

    const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
    });

    console.log("Nueva suscripción:", sub);

    // 🔹 Enviamos la suscripción al backend para guardarla
    await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
    });

    return sub;
}

function urlBase64ToUint8Array(base64: string) {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64Safe);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
