// lib/push-auto.ts
import { registerSW, subscribeUser } from "@/lib/push-client";

/**
 * Intenta registrar SW, pedir permiso (si hace falta) y suscribir al usuario.
 * Corre automáticamente tras login. Usa un flag por-usuario para no repreguntar.
 */
export async function ensurePushAfterLogin(userId?: string) {
    if (typeof window === "undefined") return;

    // Soporte mínimo
    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotif = typeof Notification !== "undefined";
    if (!hasSW || !hasPush || !hasNotif) return;

    // iOS: requiere PWA instalada (standalone)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone) return;

    // Evitar repedir permiso en cada login
    const key = userId ? `push-setup:${userId}` : "push-setup";
    const alreadyDone = localStorage.getItem(key) === "done";

    // Registrar SW
    const reg = await registerSW();
    if (!reg) return;

    // ¿Ya hay suscripción?
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
        localStorage.setItem(key, "done");
        return;
    }

    // Si el permiso ya fue otorgado, suscribimos; si está en "default", pedimos 1 vez
    let perm: NotificationPermission = Notification.permission;
    if (perm === "default" && !alreadyDone) {
        try {
            perm = await Notification.requestPermission();
        } catch {
            // Safari puede tirar; si pasa, abortamos silenciosamente
            return;
        }
    }

    if (perm !== "granted") {
        // Marcamos como done para no re-preguntar hasta que el usuario cambie permisos manualmente
        if (!alreadyDone) localStorage.setItem(key, "done");
        return;
    }

    // Crear suscripción y enviarla al backend
    try {
        await subscribeUser(reg);
        localStorage.setItem(key, "done");
    } catch (e) {
        // Si falla, no marcamos done para reintentar en un próximo login
        console.error("auto-push subscribe error:", e);
    }
}
