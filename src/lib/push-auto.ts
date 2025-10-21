import { registerSW, subscribeUser, forceResubscribe } from "@/lib/push-client";
import Swal from "sweetalert2";
import { swalBase } from "./swalConfig";

/**
 * Registra el SW y la suscripción Push justo después del login.
 * Limpia estados antiguos y evita quedarse “bugueado” tras reinstalar la app.
 */
export async function ensurePushAfterLogin(userId?: string) {
    if (typeof window === "undefined") return;
    console.log("🟢 ensurePushAfterLogin ejecutada");

    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotif = typeof Notification !== "undefined";
    if (!hasSW || !hasPush || !hasNotif) {
        console.warn("🚫 Este navegador no soporta notificaciones push.");
        return;
    }

    // iOS necesita PWA instalada
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone) {
        console.warn("ℹ️ En iOS solo funciona si la PWA está instalada en pantalla de inicio.");
        return;
    }

    const flagKey = userId ? `hm_push_done_${userId}` : "hm_push_done_generic";
    const flagValue = localStorage.getItem(flagKey);
    const permission = Notification.permission;
    console.log("🔑 Flag:", flagKey, "=", flagValue, "permiso:", permission);

    // Evitar duplicados solo si realmente está todo activo
    if (flagValue && permission === "granted") {
        console.log("ℹ️ Push ya activo; no se muestra alerta.");
        return;
    }

    // Preguntar al usuario
    const result = await swalBase.fire({
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

    // Pedir permiso
    let perm: NotificationPermission = Notification.permission;
    if (perm === "default") {
        try {
            perm = await Notification.requestPermission();
        } catch {
            swalBase.fire("⚠️", "No se pudo solicitar permiso de notificaciones.", "warning");
            return;
        }
    }
    if (perm !== "granted") {
        swalBase.fire("⚠️", "No activaste las notificaciones.", "warning");
        return;
    }

    // Registrar Service Worker
    let reg: ServiceWorkerRegistration | null = null;
    try {
        reg = await registerSW();
        if (!reg) throw new Error("Registro SW fallido");
    } catch (err) {
        console.error("❌ Error registrando Service Worker:", err);
        localStorage.removeItem(flagKey); // limpia flag por si quedó mal
        swalBase.fire("❌", "No se pudo registrar el Service Worker.", "error");
        return;
    }

    // Crear o renovar suscripción
    try {
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
            sub = await subscribeUser(reg);
            swalBase.fire("✅ Listo", "Las notificaciones fueron activadas correctamente.", "success");
        } else {
            // Probamos que el endpoint sirva. Si no, forzamos resuscripción
            console.log("ℹ️ Suscripción existente:", sub.endpoint);
            const test = await fetch("/api/push/public-key").catch(() => null);
            if (!test?.ok) throw new Error("No se pudo validar suscripción anterior");
            // Opcional: resuscribir siempre tras reinstalar
            sub = await forceResubscribe(reg);
            swalBase.fire("✅ Renovado", "Las notificaciones se reactivaron correctamente.", "success");
        }

        localStorage.setItem(flagKey, "1");
    } catch (err) {
        console.error("❌ Error al suscribir Push:", err);
        localStorage.removeItem(flagKey); // limpiar flag corrupto
        swalBase.fire("❌", "Falló la activación de notificaciones.", "error");
    }
}
