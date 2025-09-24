import { registerSW, subscribeUser } from "@/lib/push-client";
import Swal from "sweetalert2";

export async function ensurePushAfterLogin(userId?: string) {
    if (typeof window === "undefined") return;

    // ✅ Verificar soporte
    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotif = typeof Notification !== "undefined";
    if (!hasSW || !hasPush || !hasNotif) return;

    // ✅ Reglas iOS: requiere PWA instalada (standalone)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone) return;

    // ✅ Mostrar alerta customizada
    const result = await Swal.fire({
        title: "¡Bienvenido!",
        text: "No te pierdas de nada activando las notificaciones 🔔",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Activar",
        cancelButtonText: "Ahora no",
        confirmButtonColor: "#10b981", // verde Tailwind
        cancelButtonColor: "#6b7280", // gris Tailwind
        customClass: {
            popup: "rounded-2xl bg-slate-900 text-white shadow-lg",
            title: "text-xl font-bold",
            confirmButton: "px-4 py-2 rounded-lg font-semibold",
            cancelButton: "px-4 py-2 rounded-lg font-semibold",
        },
    });

    if (!result.isConfirmed) return;

    // 👉 Cerrar Swal antes de pedir permisos
    Swal.close();

    // ✅ Pedir permiso
    let perm: NotificationPermission = Notification.permission;
    if (perm === "default") {
        try {
            perm = await Notification.requestPermission();
        } catch {
            return;
        }
    }
    if (perm !== "granted") {
        Swal.fire("⚠️", "No activaste las notificaciones.", "warning");
        return;
    }

    // ✅ Registrar SW
    const reg = await registerSW();
    if (!reg) return;

    // ✅ Obtener o crear suscripción
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        try {
            sub = await subscribeUser(reg);
            Swal.fire("✅ Listo", "Las notificaciones fueron activadas.", "success");
        } catch (e) {
            console.error("❌ auto-push subscribe error:", e);
            Swal.fire("❌", "Falló la activación", "error");
        }
    } else {
        console.log("ℹ️ Ya existía suscripción:", sub.endpoint);
    }
}
