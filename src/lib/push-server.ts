// src/lib/push-server.ts
import webPush from "web-push";

type PushKeys = { p256dh?: string; auth?: string };
export type PushSubscriptionDTO = { endpoint: string; keys?: PushKeys };

export type PushPayload = {
    title: string;
    body?: string;
    url?: string;
};

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

export async function sendPushAndCollectInvalid(
    subs: Array<{ endpoint: string; keys?: { p256dh?: string; auth?: string } }>,
    payload: any
): Promise<string[]> {
    ensureWebPushConfigured();
    const body = JSON.stringify(payload);
    const invalid: string[] = [];

    for (const sub of subs) {
        try {
            await webPush.sendNotification(sub as any, body);
        } catch (err: any) {
            const sc = err?.statusCode;
            // 410 Gone o 404 Not Found => suscripción muerta
            if (sc === 410 || sc === 404) invalid.push(sub.endpoint);
            console.error("push error:", sc, err?.body);
        }
    }

    return invalid;
}

export async function sendPushToSubscriptions(
    subs: PushSubscriptionDTO[],
    payload: PushPayload
): Promise<void> {
    ensureWebPushConfigured();
    const body = JSON.stringify(payload);
    for (const sub of subs) {
        try {
            await webPush.sendNotification(sub as any, body);
        } catch (err: any) {
            const code = err?.statusCode;
            // 404/410 => endpoint muerto. Si querés podrías devolver los endpoints “rotos”
            // para limpiarlos en la capa que llama a esta función.
            console.error("push error:", code, err?.body);
        }
    }
}
