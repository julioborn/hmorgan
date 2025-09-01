export async function registerSW() {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready; // <- importante
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

    console.log("Nueva suscripción:", sub.endpoint);

    const resp = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // credentials no hace falta en same-origin, pero si querés forzar:
        credentials: "same-origin",
        body: JSON.stringify(sub),
    });

    const text = await resp.text().catch(() => "");
    let data: any = {};
    try { data = JSON.parse(text); } catch { }

    console.log("subscribe resp:", resp.status, data || text);
    if (!resp.ok) throw new Error(`subscribe failed: ${resp.status}`);
    return sub;
}

function urlBase64ToUint8Array(base64: string) {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64Safe);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
