// lib/push-client.ts

/**
 * Registra el Service Worker y garantiza que esté actualizado.
 */
export async function registerSW() {
    if (!("serviceWorker" in navigator)) return null;

    try {
        // 👉 Registra o actualiza el SW
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // 🔄 Espera que esté activo y fuerza update (clave para PWAs reinstaladas)
        await navigator.serviceWorker.ready;
        await reg.update();

        console.log("✅ Service Worker actualizado y listo:", reg.scope);
        return reg;
    } catch (err) {
        console.error("❌ Error registrando SW:", err);
        return null;
    }
}

/**
 * Suscribe el usuario a notificaciones push, limpiando suscripciones viejas.
 */
export async function subscribeUser(reg: ServiceWorkerRegistration) {
    if (!("PushManager" in window)) throw new Error("PushManager no disponible");

    // 🧹 1️⃣ Eliminar suscripciones viejas antes de crear una nueva
    try {
        const oldSub = await reg.pushManager.getSubscription();
        if (oldSub) {
            console.log("🧹 Eliminando suscripción vieja antes de crear una nueva...");
            await oldSub.unsubscribe().catch(() => { });
            await fetch("/api/push/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ endpoint: oldSub.endpoint }),
            }).catch(() => { });
        }
    } catch (err) {
        console.warn("⚠️ Error limpiando suscripción vieja:", err);
    }

    // 🔑 2️⃣ Obtener clave pública VAPID desde el backend
    const vapidPublicKey = await fetchPublicKey();
    const key = urlBase64ToUint8Array(vapidPublicKey);

    if (key.byteLength !== 65) {
        throw new Error(`VAPID pública inválida: expected 65 bytes, got ${key.byteLength}`);
    }

    // 📬 3️⃣ Crear nueva suscripción
    const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key as unknown as BufferSource,
    });
    console.log("✅ Nueva suscripción creada:", sub.endpoint);

    // 💾 4️⃣ Guardar suscripción en el backend
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

/**
 * Fuerza la eliminación de cualquier suscripción vieja y genera una nueva.
 */
export async function forceResubscribe(reg: ServiceWorkerRegistration) {
    const existing = await reg.pushManager.getSubscription();
    try {
        if (existing) {
            console.log("🧹 Forzando re-suscripción, eliminando anterior...");
            await fetch("/api/push/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ endpoint: existing.endpoint }),
            }).catch(() => { });

            await existing.unsubscribe();
        }
    } catch (err) {
        console.warn("Error al forzar re-suscripción:", err);
    }

    return subscribeUser(reg);
}

/* ---------- helpers ---------- */

/**
 * Obtiene la clave pública VAPID del servidor y la valida.
 */
async function fetchPublicKey(): Promise<string> {
    const r = await fetch("/api/push/public-key", { cache: "no-store", credentials: "same-origin" });
    const j = await r.json().catch(() => ({}));
    let k: string = j?.key || "";
    k = k.replace(/^"+|"+$/g, "").trim().replace(/\s+/g, "");
    if (!/^[A-Za-z0-9_-]+$/.test(k)) throw new Error("VAPID pública no es base64url");
    if (k.length < 80 || k.length > 100) throw new Error(`VAPID pública longitud atípica (${k.length})`);
    return k;
}

/**
 * Convierte la clave pública VAPID de Base64 a Uint8Array.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64Safe);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

/**
 * Compara la clave del servidor con la de la suscripción existente.
 */
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

export async function clearPushData() {
    try {
        // 🔹 Eliminar flag local de activación
        Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("hm_push_done_")) localStorage.removeItem(k);
        });

        // 🔹 Cancelar suscripción activa si existe
        if ("serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    await fetch("/api/push/unsubscribe", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "same-origin",
                        body: JSON.stringify({ endpoint: sub.endpoint }),
                    }).catch(() => { });
                    await sub.unsubscribe();
                    console.log("🧹 Suscripción push eliminada correctamente.");
                }
            }
        }
    } catch (err) {
        console.warn("⚠️ Error limpiando datos push:", err);
    }
}
