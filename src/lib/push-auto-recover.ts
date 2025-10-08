import { registerSW, subscribeUser } from "@/lib/push-client";

/**
 * Verifica silenciosamente el estado de las notificaciones Push
 * al iniciar sesión, sin mostrar modales. Si algo falta, repara todo.
 */
export async function silentPushRecovery(userId?: string) {
    if (typeof window === "undefined") return;

    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotif = typeof Notification !== "undefined";
    if (!hasSW || !hasPush || !hasNotif) return;

    if (Notification.permission !== "granted") {
        // No intentamos nada si no hay permiso.
        return;
    }

    try {
        // 1️⃣ Aseguramos que el SW esté instalado y activo
        let reg = await navigator.serviceWorker.ready.catch(() => null);
        if (!reg) {
            console.log("🧱 No hay SW activo, registrando nuevamente...");
            reg = await registerSW();
        }

        if (!reg) return;

        // 2️⃣ Verificar si hay suscripción válida
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            console.log("⚙️ No había suscripción push, recreando...");
            sub = await subscribeUser(reg);
            console.log("✅ Suscripción recreada:", sub.endpoint);
            if (userId) localStorage.setItem(`hm_push_done_${userId}`, "1");
        } else {
            // 3️⃣ Validar endpoint (algunos browsers lo invalidan tras reinstalar)
            const endpointOk = sub.endpoint && sub.endpoint.startsWith("https");
            if (!endpointOk) {
                console.log("⚠️ Endpoint inválido, resuscribiendo...");
                await sub.unsubscribe().catch(() => { });
                const newSub = await subscribeUser(reg);
                console.log("✅ Suscripción renovada:", newSub.endpoint);
                if (userId) localStorage.setItem(`hm_push_done_${userId}`, "1");
            } else {
                console.log("🟢 Suscripción push vigente:", sub.endpoint);
            }
        }
    } catch (err) {
        console.warn("⚠️ Error en silentPushRecovery:", err);
    }
}
