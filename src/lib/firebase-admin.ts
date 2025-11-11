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
        await admin.messaging().send({
            token,
            notification: {
                title,
                body,
            },
            data: url ? { url } : {},
        });

        console.log(`✅ Notificación FCM enviada a ${token.slice(0, 10)}...`);
    } catch (err) {
        console.error("❌ Error al enviar FCM:", err);
    }
}

export { admin };
