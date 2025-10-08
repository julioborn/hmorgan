import { registerSW, subscribeUser } from "@/lib/push-client";
import Swal from "sweetalert2";

/**
 * Registra el SW y la suscripción Push justo después del login.
 * Usa confirmación con SweetAlert y evita duplicar suscripciones.
 */
export async function ensurePushAfterLogin(userId?: string) {
    if (typeof window === "undefined") return;

    // ✅ Verificar soporte
    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotif = typeof Notification !== "undefined";
    if (!hasSW || !hasPush || !hasNotif) {
        console.warn("🚫 Push no soportado en este dispositivo/navegador");
        return;
    }

    // ✅ iOS: requiere modo standalone
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone) {
        console.warn("ℹ️ En iOS solo funciona si la PWA está instalada.");
        return;
    }

    // 🔒 Evitar pedir permiso varias veces al mismo usuario
    const flagKey = userId ? `hm_push_done_${userId}` : "hm_push_done_generic";
    if (localStorage.getItem(flagKey)) {
        console.log("ℹ️ Push ya activado para este usuario.");
        return;
    }

    // ✅ Mostrar alerta de invitación
    const result = await Swal.fire({
        title: "¡Bienvenido!",
        text: "¿Querés activar las notificaciones para tus pedidos y novedades?",
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

    // ✅ Pedir permiso de notificación
    let perm: NotificationPermission = Notification.permission;
    if (perm === "default") {
        try {
            perm = await Notification.requestPermission();
        } catch {
            console.warn("Error al pedir permiso de notificaciones");
            return;
        }
    }

    if (perm !== "granted") {
        Swal.fire("⚠️", "No activaste las notificaciones.", "warning");
        return;
    }

    // ✅ Registrar SW
    const reg = await registerSW();
    if (!reg) {
        Swal.fire("❌", "No se pudo registrar el Service Worker.", "error");
        return;
    }

    // ✅ Obtener o crear suscripción
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        try {
            sub = await subscribeUser(reg);
            Swal.fire("✅ Listo", "Las notificaciones fueron activadas.", "success");
        } catch (e) {
            console.error("❌ Error al suscribir Push:", e);
            Swal.fire("❌", "Falló la activación de notificaciones.", "error");
            return;
        }
    } else {
        console.log("ℹ️ Ya existía suscripción:", sub.endpoint);
    }

    // 🧠 Guardar flag local para no repetir el modal
    localStorage.setItem(flagKey, "1");
}
