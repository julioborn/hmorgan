import { registerSW, subscribeUser } from "@/lib/push-client";
import { Alert } from "@/lib/alert"; // 👈 en vez de importar sweetalert2 directo

export async function ensurePushAfterLogin(userId?: string) {
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

    // ✅ usar Alert.fire
    const result = await Alert.fire({
        title: "🔔 Activar notificaciones",
        text: "No te pierdas de las novedades",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Activar",
        cancelButtonText: "Más tarde",
    });

    if (!result.isConfirmed) return;

    Alert.close();

    let perm: NotificationPermission = Notification.permission;
    if (perm === "default") {
        try {
            perm = await Notification.requestPermission();
        } catch {
            return;
        }
    }
    if (perm !== "granted") {
        Alert.fire("⚠️", "No activaste las notificaciones.", "warning");
        return;
    }

    const reg = await registerSW();
    if (!reg) return;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        try {
            sub = await subscribeUser(reg);
            Alert.fire("✅ Listo", "Las notificaciones fueron activadas.", "success");
        } catch (e) {
            console.error("❌ auto-push subscribe error:", e);
            Alert.fire("❌", "Falló la activación", "error");
        }
    } else {
        console.log("ℹ️ Ya existía suscripción:", sub.endpoint);
    }
}
