// src/lib/pushNotifications.ts

import { PushNotifications } from "@capacitor/push-notifications";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { handleNotification } from "./handleNotification";

export async function initPush() {
    try {
        // 1️⃣ Verificar permisos
        const permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === "prompt") {
            await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== "granted") {
            //alert("🚫 Permisos no concedidos");
            return;
        }

        // 2️⃣ Registrar y obtener token FCM
        await PushNotifications.register();
        const fcmToken = await FirebaseMessaging.getToken();

        if (fcmToken?.token) {
            //console.log("🔥 Token FCM obtenido:", fcmToken.token);
            //alert(`🔥 Token FCM: ${fcmToken.token}`);

            // Detectar si estás en Vercel o en localhost
            const isLocal = location.hostname === "localhost" || location.hostname.startsWith("192.168.");
            const backendUrl = isLocal
                ? "http://192.168.1.3:3000/api/usuarios/token"
                : "https://hmorgan.vercel.app/api/usuarios/token";

            // 3️⃣ Enviar token al backend
            await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: fcmToken.token }),
                credentials: "include", // 👈 importante si hay login por cookies
            });

            console.log("✅ Token enviado al backend");
        }

        // 4️⃣ Listeners opcionales
        PushNotifications.addListener("pushNotificationReceived", handleNotification);

    } catch (err) {
        //console.error("💥 Error en initPush:", err);
        //alert("💥 Error en initPush: " + JSON.stringify(err));
    }
}
