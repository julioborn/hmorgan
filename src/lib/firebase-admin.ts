import admin from "firebase-admin";

/**
 * Inicializa Firebase Admin correctamente tanto en local como en producción (Vercel).
 * 
 * - Si existe la variable FIREBASE_SERVICE_ACCOUNT (string JSON), la usa.
 * - Si no existe (modo local), carga el archivo hmorganbar-d55417a72378.json.
 */

if (!admin.apps.length) {
    let serviceAccount: any;

    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            // ✅ En producción (Vercel)
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } else {
            // ✅ En desarrollo (local)
            serviceAccount = require("../../hmorganbar-d55417a72378.json");
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        console.log("🔥 Firebase Admin inicializado correctamente");
    } catch (error) {
        console.error("❌ Error inicializando Firebase Admin:", error);
    }
}

/**
 * Enviar notificación a un token FCM
 */
export async function enviarNotificacionFCM(
    token: string,
    title: string,
    body: string,
    url?: string
) {
    try {
        const payload: admin.messaging.Message = {
            token,
            notification: {
                title,
                body,
            },
            data: {
                url: url || "/",
                imageUrl: "https://hmorgan.vercel.app/morganwhite.png",
                icon: "https://hmorgan.vercel.app/morganwhite.png",
            },
            android: {
                notification: {
                    icon: "morganwhite", // 👈 este es el ícono local en /res/mipmap/
                    color: "#B91C1C", // rojo institucional
                    channelId: "default", // para Android 8+
                    sound: "default",
                    imageUrl: "https://hmorgan.vercel.app/morganwhite.png",
                },
            },
            webpush: {
                fcmOptions: { link: url || "/" },
                notification: {
                    icon: "https://hmorgan.vercel.app/morganwhite.png",
                    badge: "https://hmorgan.vercel.app/icon-badge-96x96.png",
                    image: "https://hmorgan.vercel.app/morganwhite.png",
                },
            },
        };

        await admin.messaging().send(payload);

        console.log(`✅ Notificación FCM enviada con logo a ${token.slice(0, 10)}...`);
    } catch (err) {
        console.error("❌ Error al enviar FCM:", err);
    }
}

export { admin };
