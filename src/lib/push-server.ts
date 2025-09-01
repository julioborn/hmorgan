import webPush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_MAIL = process.env.VAPID_MAIL || "mailto:admin@example.com";

let configured = false;
function ensureWebPushConfigured() {
    if (!configured) {
        webPush.setVapidDetails(VAPID_MAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        configured = true;
    }
}

export async function sendPushToSubscriptions(subs: Array<{ endpoint: string; keys?: { p256dh?: string; auth?: string } }>, payload: any) {
    ensureWebPushConfigured();
    const body = JSON.stringify(payload);
    for (const sub of subs) {
        try {
            await webPush.sendNotification(sub as any, body);
        } catch (err: any) {
            // errores típicos: 410 Gone -> eliminar suscripción inválida en otro lugar si querés
            console.error("push error:", err?.statusCode, err?.body);
        }
    }
}
