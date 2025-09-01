// lib/push-client.ts

export async function registerSW() {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
}

export async function subscribeUser(reg: ServiceWorkerRegistration) {
    if (!("PushManager" in window)) throw new Error("PushManager no disponible");

    // 🔑 Pedimos la clave al server y la validamos
    const vapidPublicKey = await fetchPublicKey();
    const key = urlBase64ToUint8Array(vapidPublicKey);

    // 💡 diagnóstico: debería ser 65 bytes exactos
    if (key.byteLength !== 65) {
        throw new Error(`VAPID pública inválida: expected 65 bytes, got ${key.byteLength}`);
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key as unknown as BufferSource,
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

export async function forceResubscribe(reg: ServiceWorkerRegistration) {
    const existing = await reg.pushManager.getSubscription();
    try {
        if (existing) {
            await fetch("/api/push/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ endpoint: existing.endpoint }),
            }).catch(() => { });
            await existing.unsubscribe();
        }
    } catch { }
    return subscribeUser(reg);
}

// -------- helpers --------
async function fetchPublicKey(): Promise<string> {
    const r = await fetch("/api/push/public-key", { cache: "no-store" });
    const j = await r.json();
    let k: string = j?.key || "";
    // sanitiza por si acaso
    k = k.replace(/^"+|"+$/g, "").trim().replace(/\s+/g, "");
    if (!/^[A-Za-z0-9_-]+$/.test(k)) throw new Error("VAPID pública no es base64url");
    if (k.length < 80 || k.length > 100) throw new Error(`VAPID pública longitud atípica (${k.length})`);
    return k;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64Safe);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}
