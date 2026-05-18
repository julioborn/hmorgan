"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { swalBase } from "@/lib/swalConfig";

type PermStatus = "granted" | "denied" | "default" | "unknown";

async function checkStatus(): Promise<PermStatus> {
    if (typeof window === "undefined") return "unknown";

    if (Capacitor.isNativePlatform()) {
        try {
            const { PushNotifications } = await import("@capacitor/push-notifications");
            const r = await PushNotifications.checkPermissions();
            if (r.receive === "granted") return "granted";
            if (r.receive === "denied") return "denied";
            return "default";
        } catch {
            return "unknown";
        }
    }

    if (typeof Notification === "undefined") return "unknown";
    const p = Notification.permission;
    return (p === "granted" || p === "denied" || p === "default") ? p : "unknown";
}

export default function NotifBell() {
    const [status, setStatus] = useState<PermStatus>("unknown");
    const [busy, setBusy] = useState(false);

    async function refresh() {
        setStatus(await checkStatus());
    }

    useEffect(() => {
        refresh();
        // Re-chequea cuando el usuario vuelve de Ajustes
        const onVisibility = () => { if (!document.hidden) refresh(); };
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
    }, []);

    async function handlePress() {
        if (busy) return;
        setBusy(true);

        try {
            if (Capacitor.isNativePlatform()) {
                const { PushNotifications } = await import("@capacitor/push-notifications");
                const { initPush } = await import("@/lib/pushNotifications");
                const platform = Capacitor.getPlatform(); // "ios" | "android"

                const current = await PushNotifications.checkPermissions();

                if (current.receive === "granted") {
                    // Ya tiene permiso → re-registrar token por si se perdió
                    await initPush();
                    setStatus("granted");
                    await swalBase.fire({
                        icon: "success",
                        title: "Notificaciones activas",
                        text: "Ya estás recibiendo notificaciones.",
                        timer: 2000,
                        showConfirmButton: false,
                    });
                    return;
                }

                if (current.receive === "denied") {
                    // Permiso bloqueado → hay que ir a Ajustes
                    const res = await swalBase.fire({
                        icon: "info",
                        title: "Notificaciones bloqueadas",
                        text: platform === "ios"
                            ? "Habilitá las notificaciones desde Ajustes > H Morgan > Notificaciones."
                            : "Habilitá las notificaciones desde Ajustes > Aplicaciones > H Morgan.",
                        showCancelButton: true,
                        confirmButtonText: "Ir a Ajustes",
                        cancelButtonText: "Ahora no",
                    });

                    if (res.isConfirmed && platform === "ios") {
                        const { App } = await import("@capacitor/app");
                        await App.openUrl({ url: "app-settings:" });
                    }
                    return;
                }

                // "prompt" → pedir permiso directamente
                const req = await PushNotifications.requestPermissions();
                if (req.receive === "granted") {
                    await initPush();
                    setStatus("granted");
                    await swalBase.fire({
                        icon: "success",
                        title: "¡Notificaciones activadas!",
                        timer: 2000,
                        showConfirmButton: false,
                    });
                } else {
                    setStatus("denied");
                }
            } else {
                // ── Web / PWA ──────────────────────────────────────
                if (typeof Notification === "undefined") return;

                if (Notification.permission === "denied") {
                    await swalBase.fire({
                        icon: "info",
                        title: "Notificaciones bloqueadas",
                        text: "Habilitá las notificaciones en la configuración de tu navegador para este sitio.",
                    });
                    return;
                }

                // "default" o "granted" → intentar suscribir/renovar
                const { ensurePushAfterLogin } = await import("@/lib/push-auto");
                await ensurePushAfterLogin();
                await refresh();
            }
        } finally {
            setBusy(false);
            await refresh();
        }
    }

    if (status === "unknown") return null;

    return (
        <button
            onClick={handlePress}
            disabled={busy}
            className="relative p-2 rounded-md hover:bg-white/10 transition disabled:opacity-60"
            title={status === "granted" ? "Notificaciones activas" : "Activar notificaciones"}
        >
            <Bell size={22} className="text-white" />
            {status !== "granted" && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-black" />
            )}
        </button>
    );
}
