import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import webpush from "web-push";
import { User, IUser } from "@/models/User";

webpush.setVapidDetails(
    process.env.VAPID_MAIL || "mailto:admin@morgan.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { title, body, url } = await req.json();
        await connectMongoDB();

        // 🔍 Buscar usuarios con al menos una suscripción
        const users: IUser[] = await User.find({ "pushSubscriptions.0": { $exists: true } });
        const subs = users.flatMap((u) => u.pushSubscriptions ?? []);

        console.log(`📡 Usuarios con suscripción: ${users.length}`);
        if (!subs.length) {
            console.warn("⚠️ No hay suscripciones activas");
            return NextResponse.json({ message: "No hay suscripciones" }, { status: 200 });
        }

        // 📦 Payload de la notificación
        const payload = JSON.stringify({
            title: title || "Morgan",
            body: body || "Nueva actualización disponible",
            url: url || "/",
        });

        // 🚀 Enviar notificación a cada endpoint
        const sendPromises = subs.map(async (sub: any) => {
            try {
                await webpush.sendNotification(sub, payload);
                console.log("✅ Enviada a:", sub.endpoint);
            } catch (err: any) {
                console.error("❌ Error enviando a:", sub.endpoint, err.statusCode);
            }
        });

        await Promise.all(sendPromises);

        return NextResponse.json({ ok: true, total: subs.length });
    } catch (error) {
        console.error("💥 Error al enviar notificaciones:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}
