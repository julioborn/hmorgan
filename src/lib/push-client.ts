// lib/push-client.ts

export async function registerSW() {
    if (!("serviceWorker" in navigator)) return null;

    try {
        // 👉 Aumentá la versión del SW (sw.js) cuando cambies lógica
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // 🔄 Esperar a que esté activo (importante en PWA instaladas)
        await navigator.serviceWorker.ready;
        console.log("✅ Service Worker listo:", reg.scope);
        return reg;
    } catch (err) {
        console.error("❌ Error registrando SW:", err);
        return null;
    }
}

export async function subscribeUser(reg: ServiceWorkerRegistration) {
    if (!("PushManager" in window)) throw new Error("PushManager no disponible");

    // 1️⃣ Obtener clave pública VAPID desde el backend
    const vapidPublicKey = await fetchPublicKey();
    const key = urlBase64ToUint8Array(vapidPublicKey);

    if (key.byteLength !== 65) {
        throw new Error(`VAPID pública inválida: expected 65 bytes, got ${key.byteLength}`);
    }

    // 2️⃣ Si existe una suscripción pero no coincide la clave, forzar nueva
    let sub = await reg.pushManager.getSubscription();
    if (sub && !(await isSameAppServerKey(sub, key))) {
        console.log("🔁 Reemplazando suscripción vieja...");
        try {
            await fetch("/api/push/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ endpoint: sub.endpoint }),
            }).catch(() => { });
            await sub.unsubscribe();
        } catch (err) {
            console.warn("Error desuscribiendo previa:", err);
        }
        sub = null;
    }

    // 3️⃣ Crear nueva suscripción si no existe
    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key as unknown as BufferSource,
        });
        console.log("✅ Nueva suscripción:", sub.endpoint);
    } else {
        console.log("ℹ️ Suscripción existente:", sub.endpoint);
    }

    // 4️⃣ Guardar suscripción en el backend (idempotente)
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
            console.log("🧹 Eliminando suscripción anterior antes de reactivar...");
            await fetch("/api/push/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ endpoint: existing.endpoint }),
            }).catch(() => { });

            await existing.unsubscribe();

            await fetch("/api/push/unsubscribe-any", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ endpoint: existing.endpoint }),
            }).catch(() => { });
        }
    } catch (err) {
        console.warn("Error al forzar re-suscripción:", err);
    }
    return subscribeUser(reg);
}

/* ---------- helpers ---------- */

// ✅ GET server key con saneo/validación
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

// ✅ Comparar claves sin romper en Safari/iOS
async function isSameAppServerKey(sub: PushSubscription, currentKey: Uint8Array): Promise<boolean> {
    try {
        const opts: any = (sub as any).options || {};
        const prevBuf: ArrayBuffer | undefined = opts.applicationServerKey;
        if (!prevBuf || !(prevBuf instanceof ArrayBuffer)) return false;

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
