import admin from "firebase-admin";

/**
 * Inicializa Firebase Admin correctamente tanto en local como en producción (Vercel).
 * 
 * - Si existe la variable FIREBASE_SERVICE_ACCOUNT (string JSON), la usa.
 * - Si no existe (modo local), carga el archivo hmorganbar-d55417a72378.json.
 */

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });

        console.log("🔥 Firebase Admin inicializado correctamente");
    } catch (error) {
        console.error("❌ Error inicializando Firebase Admin:", error);
    }
}

/**
 * Enviar notificación a un token FCM
 */
const FCM_INVALID_TOKEN_CODES = new Set([
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
    "messaging/invalid-argument",
]);

export function isFCMTokenInvalid(err: any): boolean {
    return FCM_INVALID_TOKEN_CODES.has(err?.errorInfo?.code) || FCM_INVALID_TOKEN_CODES.has(err?.code);
}

export async function enviarNotificacionFCM(
    token: string,
    title: string,
    body: string,
    url?: string
) {
    const payload: admin.messaging.Message = {
        token,
        notification: { title, body },
        data: {
            url: url || "/",
            imageUrl: "https://hmorgan.vercel.app/morganwhite.png",
            icon: "https://hmorgan.vercel.app/morganwhite.png",
        },
        android: {
            notification: {
                icon: "morganwhite",
                color: "#B91C1C",
                channelId: "default",
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
    console.log(`✅ Notificación FCM enviada a ${token.slice(0, 10)}...`);
}

export { admin };
