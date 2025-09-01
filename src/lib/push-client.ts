// lib/push-client.ts

// Registra el Service Worker y espera a que esté listo
export async function registerSW() {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
}

// Suscribe al usuario (crea o reutiliza) y SIEMPRE envía la suscripción al backend
export async function subscribeUser(reg: ServiceWorkerRegistration) {
    if (!("PushManager" in window)) throw new Error("PushManager no disponible");

    const vapidPublicKey = getPublicKeyOrThrow();                // 🔹 saneada/validada
    const key = urlBase64ToUint8Array(vapidPublicKey);           // Uint8Array válido

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            // TS a veces se queja; en runtime iOS/Chrome aceptan Uint8Array como BufferSource
            applicationServerKey: key as unknown as BufferSource,
        });
        console.log("Nueva suscripción:", sub.endpoint);
    } else {
        console.log("Suscripción existente:", sub.endpoint);
    }

    // ✅ Idempotente por endpoint: el server ignora duplicados
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

// (Opcional) Forzar re-suscripción: desuscribe y vuelve a suscribir + POST
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

/* ----------------- Helpers ----------------- */

// Sanea y valida la VAPID pública (base64url, sin espacios/quotes, longitud esperable)
function getPublicKeyOrThrow(): string {
    let k = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!k) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY vacía/no definida");

    // quitar comillas accidentales y espacios/saltos
    k = k.replace(/^"+|"+$/g, "").trim().replace(/\s+/g, "");

    // debe ser base64url (A-Za-z0-9_-)
    if (!/^[A-Za-z0-9_-]+$/.test(k)) {
        throw new Error("VAPID pública inválida (no base64url)");
    }
    // longitud típica ~ 86–88 caracteres
    if (k.length < 80 || k.length > 100) {
        throw new Error("VAPID pública con longitud atípica");
    }
    return k;
}

// Convierte base64url → Uint8Array (lo que esperan los navegadores)
function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64Safe);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}
