import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import webpush from "web-push";
import { User, IUser } from "@/models/User";
import { enviarNotificacionFCM } from "@/lib/firebase-admin";

webpush.setVapidDetails(
    process.env.VAPID_MAIL || "mailto:admin@morgan.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

function getAllFcmTokens(user: IUser): string[] {
    const set = new Set<string>(user.fcmTokens ?? []);
    if (user.tokenFCM) set.add(user.tokenFCM);
    return [...set];
}

export async function POST(req: NextRequest) {
    try {
        const { title, body, url } = await req.json();
        await connectMongoDB();

        const msgTitle = title || "Morgan";
        const msgBody = body || "Nueva actualización disponible";
        const msgUrl = url || "/";
        let totalEnviados = 0;

        // 📱 FCM — dispositivos nativos (Play Store / App Store)
        const fcmUsers = await User.find({
            $or: [
                { "fcmTokens.0": { $exists: true } },
                { tokenFCM: { $exists: true, $ne: null } },
            ],
        });
        console.log(`📱 Usuarios con token FCM: ${fcmUsers.length}`);
        for (const u of fcmUsers) {
            const tokens = getAllFcmTokens(u);
            for (const token of tokens) {
                try {
                    await enviarNotificacionFCM(token, msgTitle, msgBody, msgUrl);
                    totalEnviados++;
                } catch (err) {
                    console.error("❌ FCM error para", u.nombre, err);
                }
            }
        }

        // 🌐 WebPush — usuarios con suscripción de navegador/PWA
        const webPushUsers: IUser[] = await User.find({ "pushSubscriptions.0": { $exists: true } });
        const subs = webPushUsers.flatMap((u) => u.pushSubscriptions ?? []);
        console.log(`📡 Suscripciones WebPush: ${subs.length}`);

        const payload = JSON.stringify({ title: msgTitle, body: msgBody, url: msgUrl });
        await Promise.all(
            subs.map(async (sub: any) => {
                try {
                    await webpush.sendNotification(sub, payload);
                    totalEnviados++;
                } catch (err: any) {
                    console.error("❌ WebPush error:", sub.endpoint, err.statusCode);
                }
            })
        );

        if (totalEnviados === 0) {
            return NextResponse.json({ ok: false, message: "No hay dispositivos registrados" });
        }

        return NextResponse.json({ ok: true, total: totalEnviados });
    } catch (error) {
        console.error("💥 Error al enviar notificaciones:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}
