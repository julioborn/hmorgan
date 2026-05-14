// src/lib/pushNotifications.ts

import { PushNotifications } from "@capacitor/push-notifications";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { handleNotification } from "./handleNotification";

const PRODUCTION_URL = "https://hmorgan.vercel.app";

function getBackendUrl(path: string): string {
    const isNative = Capacitor.isNativePlatform();
    const isLocalBrowser = !isNative && (
        location.hostname === "localhost" ||
        location.hostname.startsWith("192.168.")
    );

    if (isLocalBrowser) {
        return `http://192.168.1.3:3000${path}`;
    }
    return `${PRODUCTION_URL}${path}`;
}

async function registrarToken(token: string) {
    try {
        await fetch(getBackendUrl("/api/usuarios/token"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            credentials: "include",
        });
        console.log("✅ Token FCM enviado al backend");
    } catch (err) {
        console.error("❌ Error enviando token FCM:", err);
    }
}

export async function removePushToken() {
    try {
        if (!Capacitor.isNativePlatform()) return;
        const fcmToken = await FirebaseMessaging.getToken();
        if (!fcmToken?.token) return;

        await fetch(getBackendUrl("/api/usuarios/token"), {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: fcmToken.token }),
            credentials: "include",
        });
        console.log("✅ Token FCM eliminado del backend");
    } catch (err) {
        console.error("❌ Error eliminando token FCM:", err);
    }
}

export async function initPush() {
    try {
        const permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === "prompt") {
            await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== "granted") {
            return;
        }

        await PushNotifications.register();
        const fcmToken = await FirebaseMessaging.getToken();

        if (fcmToken?.token) {
            await registrarToken(fcmToken.token);
        }

        // Escucha renovaciones de token (cambio de cuenta Google, reinstalación, etc.)
        FirebaseMessaging.addListener("tokenReceived", async (event) => {
            if (event.token) {
                console.log("🔄 Token FCM renovado, actualizando backend...");
                await registrarToken(event.token);
            }
        });

        PushNotifications.addListener("pushNotificationReceived", handleNotification);

        // Navegar a la ruta cuando el usuario toca la notificación (app en background/cerrada)
        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
            const url = action.notification?.data?.url;
            if (url) {
                window.location.href = url;
            }
        });

    } catch (err) {
        console.error("💥 Error en initPush:", err);
    }
}
