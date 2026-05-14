import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import webpush from "web-push";
import { User, IUser } from "@/models/User";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";

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
            const expiredTokens: string[] = [];

            for (const token of tokens) {
                try {
                    await enviarNotificacionFCM(token, msgTitle, msgBody, msgUrl);
                    totalEnviados++;
                } catch (err) {
                    if (isFCMTokenInvalid(err)) {
                        expiredTokens.push(token);
                    } else {
                        console.error("❌ FCM error para", u.nombre, err);
                    }
                }
            }

            if (expiredTokens.length > 0) {
                await User.updateOne(
                    { _id: u._id },
                    {
                        $pull: { fcmTokens: { $in: expiredTokens } },
                        ...(expiredTokens.includes(u.tokenFCM ?? "") ? { $unset: { tokenFCM: "" } } : {}),
                    }
                );
                console.log(`🗑️ Eliminados ${expiredTokens.length} tokens FCM expirados de ${u.nombre}`);
            }
        }

        // 🌐 WebPush — usuarios con suscripción de navegador/PWA
        const webPushUsers: IUser[] = await User.find({ "pushSubscriptions.0": { $exists: true } });
        console.log(`📡 Suscripciones WebPush: ${webPushUsers.flatMap((u) => u.pushSubscriptions ?? []).length}`);

        const payload = JSON.stringify({ title: msgTitle, body: msgBody, url: msgUrl });
        await Promise.all(
            webPushUsers.map(async (user) => {
                const subs: any[] = user.pushSubscriptions ?? [];
                const expiredEndpoints: string[] = [];

                await Promise.all(
                    subs.map(async (sub: any) => {
                        try {
                            await webpush.sendNotification(sub, payload);
                            totalEnviados++;
                        } catch (err: any) {
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                expiredEndpoints.push(sub.endpoint);
                            } else {
                                console.error("❌ WebPush error:", sub.endpoint, err.statusCode);
                            }
                        }
                    })
                );

                if (expiredEndpoints.length > 0) {
                    await User.updateOne(
                        { _id: user._id },
                        { $pull: { pushSubscriptions: { endpoint: { $in: expiredEndpoints } } } }
                    );
                    console.log(`🗑️ Eliminadas ${expiredEndpoints.length} suscripciones expiradas de ${user.nombre}`);
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
