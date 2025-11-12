import { registerSW, subscribeUser, forceResubscribe } from "@/lib/push-client"
import { swalBase } from "./swalConfig"

/**
 * Registra el SW y la suscripción Push justo después del login.
 * Limpia estados antiguos y evita quedar bugueado tras reinstalar la PWA.
 */
export async function ensurePushAfterLogin(userId?: string) {
    if (typeof window === "undefined") return
    console.log("🟢 ensurePushAfterLogin ejecutada")

    // Verificar compatibilidad
    const hasSW = "serviceWorker" in navigator
    const hasPush = "PushManager" in window
    const hasNotif = typeof Notification !== "undefined"

    if (!hasSW || !hasPush || !hasNotif) {
        console.warn("🚫 Este navegador no soporta notificaciones push.")
        return
    }

    // iOS: requiere estar instalada como PWA
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as any).standalone === true
    if (isIOS && !isStandalone) {
        console.warn("ℹ️ En iOS solo funciona si la PWA está instalada en pantalla de inicio.")
        return
    }

    // Flag local para no repetir la alerta innecesariamente
    const flagKey = userId ? `hm_push_done_${userId}` : "hm_push_done_generic"
    const flagValue = localStorage.getItem(flagKey)
    const permission = Notification.permission
    console.log("🔑 Flag:", flagKey, "=", flagValue, "permiso:", permission)

    // Solo preguntar si nunca se activó correctamente
    if (flagValue && permission === "granted") {
        console.log("ℹ️ Push ya activo; no se pregunta de nuevo.")
        return
    }

    // Pedir permiso de notificación
    let perm: NotificationPermission = Notification.permission
    if (perm === "default") {
        try {
            perm = await Notification.requestPermission()
        } catch {
            await swalBase.fire("⚠️", "No se pudo solicitar permiso de notificaciones.", "warning")
            return
        }
    }

    if (perm !== "granted") {
        await swalBase.fire("⚠️", "No activaste las notificaciones.", "warning")
        return
    }

    // Registrar SW (fuerza actualización)
    let reg: ServiceWorkerRegistration | null = null
    try {
        reg = await registerSW()
        if (!reg) throw new Error("Registro SW fallido")
        await reg.update()
    } catch (err) {
        console.error("❌ Error registrando Service Worker:", err)
        localStorage.removeItem(flagKey)
        await swalBase.fire("❌", "No se pudo registrar el Service Worker.", "error")
        return
    }

    // Crear suscripción limpia
    try {
        let sub = await reg.pushManager.getSubscription()

        // Si no hay suscripción o se reinstaló la app, forzamos re-suscripción
        if (!sub) {
            console.log("🆕 No hay suscripción previa; creando una nueva...")
            sub = await subscribeUser(reg)
            await swalBase.fire("✅ Listo", "Las notificaciones fueron activadas correctamente.", "success")
        } else {
            console.log("♻️ Suscripción previa encontrada. Reemplazando...")
            sub = await forceResubscribe(reg)
            await swalBase.fire("✅ Renovado", "Las notificaciones se reactivaron correctamente.", "success")
        }

        localStorage.setItem(flagKey, "1")

        // 🔄 Recargar para aplicar SW nuevo (en PWA es importante)
        setTimeout(() => {
            window.location.href = "/"
        }, 500)
    } catch (err) {
        console.error("❌ Error al suscribir Push:", err)
        localStorage.removeItem(flagKey)
        await swalBase.fire("❌", "Falló la activación de notificaciones.", "error")
    }
}
