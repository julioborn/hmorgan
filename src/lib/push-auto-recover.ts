// src/lib/push-auto-recover.ts
import { registerSW, forceResubscribe } from "@/lib/push-client";

/**
 * Reintenta silenciosamente registrar el SW y reactivar las notificaciones
 * cuando el usuario inicia sesión, reinstala la PWA o borra datos.
 * No muestra alertas ni SweetAlerts.
 */
export async function silentPushRecovery(userId?: string) {
    if (typeof window === "undefined") return;

    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotif = typeof Notification !== "undefined";
    if (!hasSW || !hasPush || !hasNotif) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone) return;

    // flag local para evitar repeticiones innecesarias
    const flagKey = userId ? `hm_push_done_${userId}` : "hm_push_done_generic";

    try {
        const reg = await registerSW();
        if (!reg) return;

        const existing = await reg.pushManager.getSubscription();
        if (!existing) {
            // no hay subs activa, intentar forzar una nueva
            await forceResubscribe(reg);
            localStorage.setItem(flagKey, "1");
            console.log("🔔 Suscripción push reactivada automáticamente");
        } else {
            console.log("ℹ️ Suscripción push ya existente:", existing.endpoint);
            localStorage.setItem(flagKey, "1");
        }
    } catch (err) {
        console.warn("⚠️ silentPushRecovery falló:", err);
    }
}
