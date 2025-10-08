import { registerSW, subscribeUser } from "@/lib/push-client";
import Swal from "sweetalert2";

/**
 * Registra el Service Worker y la suscripción Push justo después del login/registro.
 * Incluye control por usuario, soporte iOS, y evita duplicar suscripciones.
 */
export async function ensurePushAfterLogin(userId?: string) {
    if (typeof window === "undefined") return;

    console.log("🟢 ensurePushAfterLogin() ejecutada");

    // ✅ Verificar soporte básico
    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotif = typeof Notification !== "undefined";
    if (!hasSW || !hasPush || !hasNotif) {
        console.warn("🚫 Este navegador no soporta notificaciones push.");
        return;
    }

    // ✅ iOS: requiere PWA instalada
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone) {
        console.warn("ℹ️ En iOS solo funciona si la PWA está instalada en pantalla de inicio.");
        return;
    }

    // ✅ Control local por usuario
    const flagKey = userId ? `hm_push_done_${userId}` : "hm_push_done_generic";
    const flagValue = localStorage.getItem(flagKey);
    const permission = Notification.permission;
    console.log("🔑 Flag:", flagKey, "=", flagValue, "permiso actual:", permission);

    // Solo evitamos el modal si ya se concedió permiso y tenemos flag
    if (flagValue && permission === "granted") {
        console.log("ℹ️ Notificaciones ya activadas para este usuario.");
        return;
    }

    // ✅ Mostrar alerta de invitación
    const result = await Swal.fire({
        title: "🔔 ¡Bienvenido!",
        text: "¿Querés activar las notificaciones para tus pedidos y novedades?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Activar",
        cancelButtonText: "Ahora no",
        confirmButtonColor: "#10b981", // verde Tailwind
        cancelButtonColor: "#6b7280",  // gris Tailwind
        customClass: {
            popup: "rounded-2xl bg-slate-900 text-white shadow-lg",
            title: "text-xl font-bold",
            confirmButton: "px-4 py-2 rounded-lg font-semibold",
            cancelButton: "px-4 py-2 rounded-lg font-semibold",
        },
    });

    if (!result.isConfirmed) {
        console.log("❌ Usuario canceló la activación push.");
        return;
    }

    Swal.close();

    // ✅ Pedir permiso de notificación
    let perm: NotificationPermission = Notification.permission;
    if (perm === "default") {
        try {
            perm = await Notification.requestPermission();
        } catch (err) {
            console.warn("⚠️ Error al solicitar permiso de notificaciones:", err);
            return;
        }
    }

    if (perm !== "granted") {
        console.warn("⚠️ El usuario no concedió permisos para notificaciones.");
        Swal.fire("⚠️", "No activaste las notificaciones.", "warning");
        return;
    }

    // ✅ Registrar el Service Worker
    let reg: ServiceWorkerRegistration | null = null;
    try {
        reg = await registerSW();
        if (!reg) throw new Error("Registro de SW fallido");
    } catch (err) {
        console.error("❌ Error registrando Service Worker:", err);
        Swal.fire("❌", "No se pudo registrar el Service Worker.", "error");
        return;
    }

    // ✅ Obtener o crear suscripción push
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        try {
            sub = await subscribeUser(reg);
            console.log("✅ Nueva suscripción push:", sub.endpoint);
            Swal.fire("✅ Listo", "Las notificaciones fueron activadas correctamente.", "success");
        } catch (err) {
            console.error("❌ Error al suscribir push:", err);
            Swal.fire("❌", "Falló la activación de notificaciones.", "error");
            return;
        }
    } else {
        console.log("ℹ️ Ya existía suscripción push:", sub.endpoint);
    }

    // 🧠 Guardar flag local para no repetir el modal
    try {
        localStorage.setItem(flagKey, "1");
    } catch (err) {
        console.warn("⚠️ No se pudo guardar el flag local:", err);
    }
}
