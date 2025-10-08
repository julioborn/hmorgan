import { registerSW, subscribeUser, forceResubscribe } from "@/lib/push-client";
import Swal from "sweetalert2";

/**
 * Registro completo de notificaciones push.
 * Maneja bloqueos de Samsung Internet y evita cuelgues en el login.
 */
export async function ensurePushAfterLogin(userId?: string) {
    if (typeof window === "undefined") return;

    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotif = typeof Notification !== "undefined";
    if (!hasSW || !hasPush || !hasNotif) {
        console.warn("🚫 Push no soportado en este navegador/dispositivo.");
        return;
    }

    // iOS: requiere PWA instalada
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone) return;

    const flagKey = userId ? `hm_push_done_${userId}` : "hm_push_done_generic";
    if (localStorage.getItem(flagKey)) return;

    // Mostrar invitación
    const result = await Swal.fire({
        title: "🔔 Activar notificaciones",
        text: "¿Querés recibir avisos de pedidos y novedades?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Activar",
        cancelButtonText: "Ahora no",
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#6b7280",
        customClass: {
            popup: "rounded-2xl bg-slate-900 text-white shadow-lg",
            title: "text-xl font-bold",
            confirmButton: "px-4 py-2 rounded-lg font-semibold",
            cancelButton: "px-4 py-2 rounded-lg font-semibold",
        },
    });

    if (!result.isConfirmed) return;
    Swal.close();

    // ⚠️ Intentar pedir permiso con timeout (Samsung fix)
    let perm: NotificationPermission = Notification.permission;
    if (perm === "default") {
        try {
            const ask = Notification.requestPermission();
            const timeout = new Promise<NotificationPermission>((resolve) =>
                setTimeout(() => resolve("denied"), 3000) // ⏱️ 3s máximo
            );
            perm = await Promise.race([ask, timeout]);
        } catch {
            perm = "denied";
        }
    }

    if (perm !== "granted") {
        console.warn("⚠️ Usuario no otorgó permisos o navegador bloqueó prompt.");
        Swal.fire("⚠️", "No se pudieron activar las notificaciones.", "warning");
        return;
    }

    // Registrar SW y suscribirse
    try {
        const reg = await registerSW();
        if (!reg) throw new Error("SW no disponible");
        const sub = await forceResubscribe(reg);
        console.log("🟢 Nueva suscripción creada:", sub.endpoint);
        localStorage.setItem(flagKey, "1");
        Swal.fire("✅ Listo", "Notificaciones activadas correctamente.", "success");
    } catch (err) {
        console.error("❌ Error en suscripción push:", err);
        localStorage.removeItem(flagKey);
        Swal.fire("❌", "Falló la activación de notificaciones.", "error");
    }
}
