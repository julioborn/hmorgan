// lib/push-client.ts

export async function registerSW() {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready; // asegura activo
    return reg;
}

export async function subscribeUser(reg: ServiceWorkerRegistration) {
    if (!("PushManager" in window)) throw new Error("PushManager no disponible");

    // 1) Obtener y validar VAPID pública desde el server
    const vapidPublicKey = await fetchPublicKey();
    const key = urlBase64ToUint8Array(vapidPublicKey);
    if (key.byteLength !== 65) {
        throw new Error(`VAPID pública inválida: expected 65 bytes, got ${key.byteLength}`);
    }

    // 2) Reusar suscripción si existe y coincide la clave; si no, re-suscribir
    let sub = await reg.pushManager.getSubscription();
    if (sub && !(await isSameAppServerKey(sub, key))) {
        try {
            await fetch("/api/push/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ endpoint: sub.endpoint }),
            }).catch(() => { });
            await sub.unsubscribe();
        } catch { }
        sub = null;
    }

    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            // iOS/Chrome aceptan Uint8Array como BufferSource
            applicationServerKey: key as unknown as BufferSource,
        });
        console.log("Nueva suscripción:", sub.endpoint);
    } else {
        console.log("Suscripción existente:", sub.endpoint);
    }

    // 3) Guardar en backend (idempotente por endpoint)
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

// lib/push-client.ts
export async function forceResubscribe(reg: ServiceWorkerRegistration) {
    const existing = await reg.pushManager.getSubscription();
    try {
        if (existing) {
            // 1) avisá al backend del usuario actual (si lo hay)
            await fetch("/api/push/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ endpoint: existing.endpoint }),
            }).catch(() => { });

            // 2) desuscribí en el navegador (cambia el endpoint)
            await existing.unsubscribe();

            // 3) OPCIONAL: purga ese endpoint en TODOS los usuarios (por si quedó en otra cuenta)
            await fetch("/api/push/unsubscribe-any", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ endpoint: existing.endpoint }),
            }).catch(() => { });
        }
    } catch { }
    return subscribeUser(reg);
}

/* ---------- helpers ---------- */

// GET server key con saneo/validación
async function fetchPublicKey(): Promise<string> {
    const r = await fetch("/api/push/public-key", { cache: "no-store", credentials: "same-origin" });
    const j = await r.json().catch(() => ({}));
    let k: string = j?.key || "";
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

// Compara la appServerKey de la suscripción con la actual
async function isSameAppServerKey(sub: PushSubscription, currentKey: Uint8Array): Promise<boolean> {
    try {
        // no todas las plataformas exponen options.applicationServerKey; probamos suave
        const opts: any = (sub as any).options || {};
        const prevBuf: ArrayBuffer | undefined = opts.applicationServerKey;
        if (!prevBuf || !(prevBuf instanceof ArrayBuffer)) {
            // si no podemos leerla, por seguridad devolvemos false para forzar re-sub
            return false;
        }
        const prev = new Uint8Array(prevBuf);
        if (prev.byteLength !== currentKey.byteLength) return false;
        for (let i = 0; i < prev.byteLength; i++) {
            if (prev[i] !== currentKey[i]) return false;
        }
        return true;
    } catch {
        return false;
    }
}
