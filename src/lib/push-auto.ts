// lib/push-auto.ts
import { registerSW, subscribeUser } from "@/lib/push-client";
import Swal from "sweetalert2";

/**
 * Corre automáticamente tras login.
 * Siempre muestra un Swal para pedir activar notificaciones.
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

    // ❌ quitamos el localStorage "done", porque queremos preguntar SIEMPRE
    // (ya no evitamos repreguntar)

    // Mostrar alerta para activar notificaciones
    const result = await Swal.fire({
        title: "🔔 Notificaciones",
        text: "No te pierdas de nada, activá las notificaciones en este dispositivo.",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Activar",
        cancelButtonText: "Más tarde",
        confirmButtonColor: "#10b981", // verde
        cancelButtonColor: "#6b7280", // gris
    });

    if (!result.isConfirmed) return;

    // Registrar SW
    const reg = await registerSW();
    if (!reg) return;

    // ¿Ya hay suscripción?
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
        // Pedimos permiso
        let perm: NotificationPermission = Notification.permission;
        if (perm === "default") {
            try {
                perm = await Notification.requestPermission();
            } catch {
                return;
            }
        }
        if (perm !== "granted") return;

        // Crear suscripción
        try {
            sub = await subscribeUser(reg);
            console.log("✅ Suscripción creada:", sub.endpoint);
        } catch (e) {
            console.error("❌ auto-push subscribe error:", e);
        }
    } else {
        console.log("ℹ️ Ya existía suscripción:", sub.endpoint);
    }
}
